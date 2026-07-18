/**
 * Worker entrypoint: one HTTP server exposing GET /healthz and a WebSocket
 * endpoint at /ws. Each WS connection gets a Session (see session.ts).
 */
import { createServer } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { serverDb } from "@call-copilot/shared";
import { log } from "./logger.js";
import { Session, defaultDeps, type SessionDeps } from "./session.js";
import { DeepgramStream } from "./deepgram.js";
import { allowSession, hashIp } from "./ratelimit.js";

const PORT = Number(process.env.PORT ?? 8080);
const START = Date.now();

// TEMPORARY (removed once the two-voice sample assets are produced): OpenAI /
// Deepgram are only reachable from prod, so the two-voice WAV is generated here
// and the diarized capture runs over ?capture=<token> on /ws. Token-gated.
const TEMP_TOKEN = "shopfolio-reseed-2026";
const DIALOGUE: { voices: Record<string, string>; turns: { speaker: string; text: string }[] } = {
  voices: { agent: "onyx", customer: "nova" },
  turns: [
    { speaker: "agent", text: "Thanks for calling Shopfolio support, this is Alex. How can I help today?" },
    { speaker: "customer", text: "Hi. Yeah, so my storefront's been down basically all day and I'm kind of freaking out." },
    { speaker: "agent", text: "I'm really sorry to hear that. Let's get it sorted. Can you tell me what you're seeing?" },
    { speaker: "customer", text: "So I set up my own domain, shop dot my-handle dot com, through the custom domain settings a couple days ago. And now when anyone opens it, they just get this big your connection is not secure warning, and the page won't even load." },
    { speaker: "agent", text: "Got it. And on your dashboard, what does the domain status say right now?" },
    { speaker: "customer", text: "The DNS part says it's verified. But the SSL certificate never went active. It's just stuck on pending. I've refreshed it like fifty times." },
    { speaker: "agent", text: "Okay, that points to the certificate not provisioning. Bear with me one second while I check." },
    { speaker: "customer", text: "I mean, the timing could not be worse. I've got a product drop going out to my followers tonight, and every single link in my bio points to that storefront, so right now I'm losing every sale. This is the third day I've had a ticket open and nobody has gotten back to me. Honestly, I am really frustrated at this point." },
    { speaker: "agent", text: "That is completely fair, and I'm going to stay on this with you until it's working again." },
    { speaker: "customer", text: "And on top of all that, the posts I scheduled for this morning never went out either. They're just sitting in the queue marked pending. They never published." },
    { speaker: "agent", text: "Understood, the storefront certificate and the stuck posts. Let me pull up your account and we'll take them one at a time." },
  ],
};

const SR = 24000; // OpenAI TTS pcm sample rate (16-bit mono LE)

function wavHeader(dataLen: number): Buffer {
  const b = Buffer.alloc(44);
  b.write("RIFF", 0);
  b.writeUInt32LE(36 + dataLen, 4);
  b.write("WAVE", 8);
  b.write("fmt ", 12);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); // PCM
  b.writeUInt16LE(1, 22); // mono
  b.writeUInt32LE(SR, 24);
  b.writeUInt32LE(SR * 2, 28); // byte rate
  b.writeUInt16LE(2, 32); // block align
  b.writeUInt16LE(16, 34); // bits
  b.write("data", 36);
  b.writeUInt32LE(dataLen, 40);
  return b;
}

async function genTwoVoiceWav(): Promise<Buffer> {
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const silence = Buffer.alloc(Math.round(0.4 * SR) * 2); // 400ms gap between turns
  const parts: Buffer[] = [];
  for (const turn of DIALOGUE.turns) {
    const voice = DIALOGUE.voices[turn.speaker] ?? "nova";
    const speech = await client.audio.speech.create({
      model: "tts-1",
      voice: voice as "onyx",
      input: turn.text,
      response_format: "pcm",
    });
    parts.push(Buffer.from(await speech.arrayBuffer()));
    parts.push(silence);
  }
  const pcm = Buffer.concat(parts);
  return Buffer.concat([wavHeader(pcm.length), pcm]);
}

/** Deps that make a connection use diarization + raw linear16 (for capture). */
function captureDeps(): SessionDeps {
  return {
    ...defaultDeps(),
    createAsr: (h) => new DeepgramStream(h, { diarize: true, encoding: "linear16", sampleRate: SR }),
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
  // TEMPORARY: generate the two-voice sample WAV. Removed after asset gen.
  const u = new URL(req.url ?? "/", "http://localhost");
  if (u.pathname === "/gen-wav") {
    if (u.searchParams.get("key") !== TEMP_TOKEN) return void res.writeHead(403).end();
    void genTwoVoiceWav()
      .then((wav) => {
        res.writeHead(200, { "content-type": "audio/wav" });
        res.end(wav);
      })
      .catch((err) => {
        log.error({ err }, "gen-wav failed");
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

  // TEMPORARY: token-gated diarized capture mode (two-voice sample generation).
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
