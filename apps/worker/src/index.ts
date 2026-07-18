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
import { Session, defaultDeps, type SessionDeps } from "./session.js";
import { DeepgramStream } from "./deepgram.js";
import { allowSession, hashIp } from "./ratelimit.js";

const PORT = Number(process.env.PORT ?? 8080);
const START = Date.now();

// TEMPORARY (removed after reseed + re-capture): OpenAI/Deepgram are reachable
// only from prod. /reseed UPSERTS the corpus on title so existing doc IDs are
// preserved (the cached sample fixture references them); ?capture=<token> on
// /ws enables diarized linear16 capture of the two-voice WAV.
const TEMP_TOKEN = "shopfolio-reseed-2026";

async function reseedCorpus(): Promise<{ count: number }> {
  const docsDir = join(dirname(fileURLToPath(import.meta.url)), "../../../supabase/seed/docs");
  const files = readdirSync(docsDir).filter((f) => f.endsWith(".md"));
  const docs = files.map((file) => {
    const parsed = matter(readFileSync(join(docsDir, file), "utf8"));
    const title = (parsed.data.title as string) ?? file.replace(/\.md$/, "");
    return { title, body: parsed.content.trim() };
  });
  // Embed in batches to stay well under request limits, then upsert on title.
  const bodies = docs.map((d) => d.body);
  const embeddings: number[][] = [];
  for (let i = 0; i < bodies.length; i += 32) {
    const batch = await embed(bodies.slice(i, i + 32));
    embeddings.push(...batch);
  }
  const rows = docs.map((d, i) => ({ title: d.title, body: d.body, embedding: embeddings[i] as number[] }));
  const { error } = await serverDb().from("docs").upsert(rows, { onConflict: "title" });
  if (error) throw error;
  return { count: rows.length };
}

/** Deps that make a connection use diarization + raw linear16 (for capture). */
function captureDeps(): SessionDeps {
  return {
    ...defaultDeps(),
    createAsr: (h) => new DeepgramStream(h, { diarize: true, encoding: "linear16", sampleRate: 24000 }),
  };
}

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
  // TEMPORARY: reseed the corpus (upsert). Removed after asset regen.
  const u = new URL(req.url ?? "/", "http://localhost");
  if (u.pathname === "/reseed") {
    if (u.searchParams.get("key") !== TEMP_TOKEN) return void res.writeHead(403).end();
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

  // TEMPORARY: token-gated diarized capture mode (two-voice sample re-capture).
  const capture = new URL(req.url ?? "/", "http://localhost").searchParams.get("capture") === TEMP_TOKEN;

  const gate = capture ? { allowed: true, retryAfterMs: 0 } : allowSession(ipHash);
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

  const session = new Session(sessionId, ws, capture ? captureDeps() : undefined);
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
