/**
 * Worker entrypoint: one HTTP server exposing GET /healthz and a WebSocket
 * endpoint at /ws. Each WS connection gets a Session (see session.ts).
 */
import { createServer } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { serverDb } from "@call-copilot/shared";
import { log } from "./logger.js";
import { Session } from "./session.js";
import { allowSession, hashIp } from "./ratelimit.js";

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
  // TEMPORARY: one-off generator for the sample-call audio via OpenAI TTS.
  // Removed after the asset is produced (OpenAI is only reachable from prod).
  if (req.url === "/gen-sample") {
    void (async () => {
      try {
        const { default: OpenAI } = await import("openai");
        const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const script =
          "Hi, yeah, I'm calling because I was charged twice for my order this month. " +
          "There are two identical charges on my card, same amount, same day, and I need one of them refunded. " +
          "Honestly, this is the third time I've had to call about billing and it is getting ridiculous. Nobody has fixed it and I'm really frustrated at this point. " +
          "Look, if this keeps happening, I want to know how to cancel my subscription entirely. " +
          "Can you tell me how to cancel, and whether I'll get a refund for the unused time? I just want this sorted out today.";
        const speech = await client.audio.speech.create({
          model: "tts-1",
          voice: "onyx",
          input: script,
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
  // TEMPORARY: verify the Deepgram key against their REST API.
  if (req.url === "/check-deepgram") {
    void (async () => {
      try {
        const r = await fetch("https://api.deepgram.com/v1/projects", {
          headers: { Authorization: `Token ${process.env.DEEPGRAM_API_KEY ?? ""}` },
        });
        const body = (await r.text()).slice(0, 300);
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ status: r.status, body }));
      } catch (err) {
        res.writeHead(500).end(String(err));
      }
    })();
    return;
  }
  // TEMPORARY: diagnose RAG — compare array vs stringified embedding passing.
  if (req.url === "/test-rag") {
    void (async () => {
      try {
        const { embed, serverDb } = await import("@call-copilot/shared");
        const db = serverDb();
        const fmt = (r: { data: unknown; error: unknown }) =>
          r.error
            ? { error: String((r.error as { message?: string }).message ?? r.error) }
            : (r.data as { title: string; score: number }[]).map((x) => `${x.title}:${Number(x.score).toFixed(3)}`);

        // A) known-good doc embedding through the RPC (isolates PostgREST from OpenAI)
        const docRow = await db.from("docs").select("embedding").eq("title", "Refunds and Double Charges").single();
        const rawEmb = (docRow.data as { embedding: unknown } | null)?.embedding;
        const docEmbStr = typeof rawEmb === "string" ? rawEmb : JSON.stringify(rawEmb);
        const viaDocEmb = await db.rpc("match_docs", { query_embedding: docEmbStr, match_count: 3, min_score: -2 });

        // B) live OpenAI query embedding — try several string formats
        const [emb] = await embed("I was charged twice and I want a refund");
        const fmtA = JSON.stringify(emb);
        const fmtB = "[" + emb.map((x) => x.toFixed(8)).join(",") + "]";
        const runRaw = async (s: string) => {
          const r = await db.rpc("match_docs", { query_embedding: s, match_count: 3, min_score: -2 });
          return { len: s.length, err: r.error ? String((r.error as { message?: string }).message) : null, rows: fmt(r) };
        };
        const viaJson = await runRaw(fmtA);
        const viaFixed = await runRaw(fmtB);

        res.writeHead(200, { "content-type": "application/json" });
        res.end(
          JSON.stringify(
            {
              docEmbType: typeof rawEmb,
              docEmbLen: docEmbStr?.length,
              docEmbSample: docEmbStr?.slice(0, 40),
              viaDocEmb: fmt(viaDocEmb),
              openaiEmbLen: emb?.length,
              jsonSample: fmtA.slice(0, 60),
              viaJson,
              viaFixed,
            },
            null,
            2,
          ),
        );
      } catch (err) {
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
