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
