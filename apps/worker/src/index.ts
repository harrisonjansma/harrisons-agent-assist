/**
 * Worker entrypoint: one HTTP server exposing GET /healthz and a WebSocket
 * endpoint at /ws. Each WS connection gets a Session (see session.ts).
 */
import { createServer } from "node:http";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer, type WebSocket } from "ws";
import matter from "gray-matter";
import { serverDb, embed } from "@call-copilot/shared";
import { log } from "./logger.js";
import { Session } from "./session.js";
import { allowSession, hashIp } from "./ratelimit.js";

// TEMPORARY (removed once assets are produced): OpenAI/Deepgram are only
// reachable from prod, so re-seeding the Shopfolio corpus and generating the
// sample-call audio are done through these one-off endpoints, gated by a token.
const TEMP_TOKEN = "shopfolio-reseed-2026";
const SAMPLE_SCRIPT =
  "Hi — yeah, so my storefront's been down basically all day and I'm kind of freaking out. " +
  "I set up my own domain, shop dot my-handle dot com, through the custom domain settings a couple days ago, " +
  "and now when anyone opens it they just get this big \"your connection is not secure\" warning and the page won't even load. " +
  "The DNS part says it's verified on my dashboard, but the SSL certificate never went active — it's just stuck on pending. I've refreshed it like fifty times. " +
  "And the timing could not be worse. I've got a product drop going out to my followers tonight, and every single link in my bio points to that storefront, so right now I'm losing every sale. " +
  "This is the third day I've had a ticket open and nobody has gotten back to me. Honestly I'm really frustrated at this point. " +
  "And on top of all that — the posts I scheduled for this morning never went out either. They're just sitting in the queue marked pending, they never published. " +
  "So can you please help me get the certificate to actually provision, and figure out why my scheduled posts are stuck? I really, really need my shop back up before tonight.";

async function reseedCorpus(): Promise<{ count: number }> {
  const docsDir = join(dirname(fileURLToPath(import.meta.url)), "../../../supabase/seed/docs");
  const files = readdirSync(docsDir).filter((f) => f.endsWith(".md"));
  const docs = files.map((file) => {
    const parsed = matter(readFileSync(join(docsDir, file), "utf8"));
    const title = (parsed.data.title as string) ?? file.replace(/\.md$/, "");
    return { title, body: parsed.content.trim() };
  });
  // Drop the old corpus so removed titles don't linger, then re-embed + insert.
  const del = await serverDb().from("docs").delete().gt("id", 0);
  if (del.error) throw del.error;
  const embeddings = await embed(docs.map((d) => d.body));
  const rows = docs.map((d, i) => ({ title: d.title, body: d.body, embedding: embeddings[i] as number[] }));
  const { error } = await serverDb().from("docs").insert(rows);
  if (error) throw error;
  return { count: rows.length };
}

const PORT = Number(process.env.PORT ?? 8080);
const START = Date.now();

/**
 * Fail-fast config check. Missing keys otherwise surface only on the first
 * session (Deepgram/OpenAI/DB call), so the worker would look healthy while
 * every call dies. Log loudly at boot instead of debugging it live.
 */
function checkEnv(): void {
  const required = ["DEEPGRAM_API_KEY", "OPENAI_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    log.error({ missing }, "missing required env vars — sessions will fail until these are set");
  } else {
    log.info("env check: all required vars present");
  }
}
checkEnv();

const server = createServer((req, res) => {
  if (req.url === "/healthz") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, uptime: Math.floor((Date.now() - START) / 1000) }));
    return;
  }

  // TEMPORARY endpoints (removed after asset generation). See note near top.
  const url = new URL(req.url ?? "/", "http://localhost");
  if (url.pathname === "/reseed") {
    if (url.searchParams.get("key") !== TEMP_TOKEN) return void res.writeHead(403).end();
    void reseedCorpus()
      .then(({ count }) => {
        log.info({ count }, "reseed complete");
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: true, count }));
      })
      .catch((err) => {
        log.error({ err }, "reseed failed");
        res.writeHead(500).end(String(err));
      });
    return;
  }
  if (url.pathname === "/gen-sample") {
    if (url.searchParams.get("key") !== TEMP_TOKEN) return void res.writeHead(403).end();
    void (async () => {
      try {
        const { default: OpenAI } = await import("openai");
        const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const speech = await client.audio.speech.create({
          model: "tts-1",
          voice: "shimmer",
          input: SAMPLE_SCRIPT,
          response_format: "opus",
        });
        const buf = Buffer.from(await speech.arrayBuffer());
        res.writeHead(200, { "content-type": "audio/ogg" });
        res.end(buf);
      } catch (err) {
        log.error({ err }, "gen-sample failed");
        res.writeHead(500).end(String(err));
      }
    })();
    return;
  }

  res.writeHead(404).end();
});

const wss = new WebSocketServer({ server, path: "/ws", maxPayload: 64 * 1024 });

function clientIp(req: import("node:http").IncomingMessage): string {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length) return fwd.split(",")[0]!.trim();
  return req.socket.remoteAddress ?? "unknown";
}

wss.on("connection", async (ws: WebSocket, req) => {
  const ipHash = hashIp(clientIp(req));

  const gate = allowSession(ipHash);
  if (!gate.allowed) {
    const mins = Math.ceil(gate.retryAfterMs / 60000);
    ws.send(
      JSON.stringify({
        type: "error",
        code: "rate_limited",
        message: `Demo limit reached (5 sessions/hour). Try again in ~${mins} min.`,
      }),
    );
    ws.close();
    return;
  }

  // Create the session row up front so we have the id for everything downstream.
  let sessionId: string;
  try {
    const { data, error } = await serverDb()
      .from("sessions")
      .insert({ ip_hash: ipHash })
      .select("id")
      .single();
    if (error || !data) throw error ?? new Error("no row");
    sessionId = data.id as string;
  } catch (err) {
    log.error({ err }, "failed to create session row");
    ws.send(JSON.stringify({ type: "error", code: "internal", message: "Could not start session." }));
    ws.close();
    return;
  }

  const session = new Session(sessionId, ws);
  session.send({ type: "session.started", sessionId });
  log.info({ session: sessionId }, "session started");

  ws.on("message", (data: Buffer, isBinary: boolean) => {
    if (isBinary) {
      session.onAudio(data);
      return;
    }
    try {
      const msg = JSON.parse(data.toString());
      if (msg?.type === "stop") void session.close("client-stop");
    } catch {
      /* ignore malformed control frames */
    }
  });

  ws.on("close", () => void session.close("ws-close"));
  ws.on("error", (err) => {
    log.warn({ err, session: sessionId }, "client ws error");
    void session.close("ws-error");
  });
});

server.listen(PORT, () => log.info({ port: PORT }, "worker listening"));

// A single misbehaving session must never take down the worker (it serves
// every visitor). Log and keep running.
process.on("uncaughtException", (err) => log.error({ err }, "uncaughtException"));
process.on("unhandledRejection", (err) => log.error({ err }, "unhandledRejection"));

for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, () => {
    log.info({ sig }, "shutting down");
    wss.close();
    server.close(() => process.exit(0));
  });
}
