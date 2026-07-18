// One-off: stream the sample-call audio through the LIVE worker pipeline once
// and record every downstream event with its playback-relative timestamp, so
// the browser can replay the exact same run without re-hitting Deepgram/OpenAI.
//
//   node scripts/capture-replay.mjs [wsUrl]
//
// Writes apps/web/public/sample-replay.json. Uses Node 22's built-in WebSocket.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OGG = join(ROOT, "apps/web/public/sample-call.ogg");
const OUT = join(ROOT, "apps/web/public/sample-replay.json");
const WS_URL = process.argv[2] ?? "wss://call-copilotworker-production.up.railway.app/ws";

const CHUNK_MS = 250;
const MAX_FRAME = 16 * 1024; // stay under the 32KB server cap
const TRAILING_MS = 5000; // keep listening after the last byte for late events
const KEEP = new Set([
  "transcript.interim",
  "transcript.final",
  "notes.update",
  "docs.update",
  "sentiment.update",
  "alert.frustration",
]);

/** Duration of an Ogg Opus file: last page granulepos / 48000 (Opus granule is 48kHz). */
function oggDurationMs(buf) {
  const marker = Buffer.from("OggS");
  let idx = buf.lastIndexOf(marker);
  while (idx >= 0) {
    const granule = buf.readBigUInt64LE(idx + 6);
    if (granule !== 0xffffffffffffffffn && granule > 0n) {
      return Number(granule) / 48000 * 1000;
    }
    idx = buf.lastIndexOf(marker, idx - 1);
  }
  return 0;
}

const audio = readFileSync(OGG);
const durationMs = Math.round(oggDurationMs(audio));
if (!durationMs) throw new Error("could not read Ogg duration");
const bytesPerMs = audio.length / durationMs;
console.log(`audio: ${audio.length} bytes, ${(durationMs / 1000).toFixed(1)}s, ${WS_URL}`);

const events = [];
let started = 0;
let offset = 0;
let pacer = null;
let closeTimer = null;
let lastSentAt = 0; // wall time of the most recent audio frame sent (for ASR latency)

const ws = new WebSocket(WS_URL);
ws.binaryType = "arraybuffer";

function finish() {
  try { ws.close(); } catch {}
  events.sort((a, b) => a.atMs - b.atMs);
  const fixture = { audioDurationMs: durationMs, capturedAt: null, events };
  writeFileSync(OUT, JSON.stringify(fixture, null, 2));
  const counts = {};
  for (const e of events) counts[e.msg.type] = (counts[e.msg.type] ?? 0) + 1;
  console.log("wrote", OUT, "\nevent counts:", counts);
  process.exit(0);
}

ws.onopen = () => {
  started = Date.now();
  ws.send(JSON.stringify({ type: "start" }));
  // Stream bytes paced to real time so event timings map to audio playback position.
  pacer = setInterval(() => {
    const elapsed = Date.now() - started;
    const target = Math.min(audio.length, Math.ceil(elapsed * bytesPerMs));
    while (offset < target) {
      const end = Math.min(offset + MAX_FRAME, target);
      ws.send(audio.subarray(offset, end));
      offset = end;
      lastSentAt = Date.now();
    }
    if (offset >= audio.length) {
      clearInterval(pacer);
      pacer = null;
      // let the tail of the transcript + downstream jobs land, then stop
      closeTimer = setTimeout(() => {
        try { ws.send(JSON.stringify({ type: "stop" })); } catch {}
        setTimeout(finish, 500);
      }, TRAILING_MS);
    }
  }, CHUNK_MS);
};

ws.onmessage = (ev) => {
  let msg;
  try { msg = JSON.parse(typeof ev.data === "string" ? ev.data : Buffer.from(ev.data).toString()); }
  catch { return; }
  if (!msg || !KEEP.has(msg.type)) {
    if (msg?.type === "error") console.error("server error:", msg);
    return;
  }
  const rec = { atMs: Date.now() - started, msg };
  // Record the real ASR latency the same way the live client measures it
  // (time since the most recent audio frame), so replay can show it honestly.
  if ((msg.type === "transcript.interim" || msg.type === "transcript.final") && lastSentAt) {
    rec.asrMs = Date.now() - lastSentAt;
  }
  events.push(rec);
  if (msg.type === "transcript.final") console.log(`  [${Date.now() - started}ms] final: ${msg.text}`);
  if (msg.type === "docs.update") console.log(`  [${Date.now() - started}ms] docs: ${msg.docs.map((d) => d.title + " " + d.score).join(", ")}`);
  if (msg.type === "alert.frustration") console.log(`  [${Date.now() - started}ms] ALERT ${msg.latencyMs}ms`);
};

ws.onerror = (e) => { console.error("ws error", e.message ?? e); };
ws.onclose = () => { if (pacer) clearInterval(pacer); if (!closeTimer) finish(); };

// hard cap
setTimeout(() => { console.error("timeout"); finish(); }, durationMs + TRAILING_MS + 20000);
