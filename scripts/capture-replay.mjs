// One-off: stream the two-voice sample WAV through the LIVE worker pipeline once
// (with diarization enabled via ?capture=<token>) and record every downstream
// event with its playback-relative timestamp + speaker, so the browser can
// replay the exact run without re-hitting Deepgram/OpenAI.
//
//   node scripts/capture-replay.mjs [wsUrl]
//
// Reads apps/web/public/sample-call.wav, writes apps/web/public/sample-replay.json.
// Uses Node 22's built-in WebSocket.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const WAV = join(ROOT, "apps/web/public/sample-call.wav");
const OUT = join(ROOT, "apps/web/public/sample-replay.json");
const TOKEN = "shopfolio-reseed-2026";
const WS_URL =
  process.argv[2] ?? `wss://call-copilotworker-production.up.railway.app/ws?capture=${TOKEN}`;

const CHUNK_MS = 250;
const TRAILING_MS = 6000; // keep listening after the last byte for late events
const KEEP = new Set([
  "transcript.interim",
  "transcript.final",
  "notes.update",
  "docs.update",
  "sentiment.update",
  "alert.frustration",
]);

/** Parse a PCM WAV: returns { sampleRate, bytesPerSec, dataOffset, dataLen }. */
function parseWav(buf) {
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE")
    throw new Error("not a WAV file");
  let p = 12;
  let sampleRate = 24000, channels = 1, bits = 16, dataOffset = 44, dataLen = buf.length - 44;
  while (p + 8 <= buf.length) {
    const id = buf.toString("ascii", p, p + 4);
    const size = buf.readUInt32LE(p + 4);
    if (id === "fmt ") {
      channels = buf.readUInt16LE(p + 10);
      sampleRate = buf.readUInt32LE(p + 12);
      bits = buf.readUInt16LE(p + 22);
    } else if (id === "data") {
      dataOffset = p + 8;
      dataLen = size;
      break;
    }
    p += 8 + size + (size % 2);
  }
  const bytesPerSec = sampleRate * channels * (bits / 8);
  return { sampleRate, bytesPerSec, dataOffset, dataLen };
}

const wav = readFileSync(WAV);
const { bytesPerSec, dataOffset, dataLen } = parseWav(wav);
const durationMs = Math.round((dataLen / bytesPerSec) * 1000);
const pcm = wav.subarray(dataOffset, dataOffset + dataLen);
const frameBytes = Math.round((bytesPerSec * CHUNK_MS) / 1000); // ~250ms of PCM
console.log(`wav: ${dataLen} PCM bytes, ${(durationMs / 1000).toFixed(1)}s -> ${WS_URL}`);

const events = [];
let started = 0;
let offset = 0;
let pacer = null;
let closeTimer = null;
let lastSentAt = 0;

const ws = new WebSocket(WS_URL);
ws.binaryType = "arraybuffer";

function finish() {
  try { ws.close(); } catch {}
  events.sort((a, b) => a.atMs - b.atMs);
  writeFileSync(OUT, JSON.stringify({ audioDurationMs: durationMs, events }, null, 2));
  const counts = {};
  for (const e of events) counts[e.msg.type] = (counts[e.msg.type] ?? 0) + 1;
  console.log("wrote", OUT, "\nevent counts:", counts);
  process.exit(0);
}

ws.onopen = () => {
  started = Date.now();
  ws.send(JSON.stringify({ type: "start" }));
  pacer = setInterval(() => {
    const elapsed = Date.now() - started;
    const target = Math.min(pcm.length, Math.ceil((elapsed / 1000) * bytesPerSec));
    while (offset < target) {
      const end = Math.min(offset + frameBytes, target);
      ws.send(pcm.subarray(offset, end));
      offset = end;
      lastSentAt = Date.now();
    }
    if (offset >= pcm.length) {
      clearInterval(pacer);
      pacer = null;
      closeTimer = setTimeout(() => {
        try { ws.send(JSON.stringify({ type: "stop" })); } catch {}
        setTimeout(finish, 800);
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
  if ((msg.type === "transcript.interim" || msg.type === "transcript.final") && lastSentAt) {
    rec.asrMs = Date.now() - lastSentAt;
  }
  events.push(rec);
  if (msg.type === "transcript.final")
    console.log(`  [${Date.now() - started}ms] ${msg.speaker ?? "?"}: ${msg.text}`);
  if (msg.type === "docs.update")
    console.log(`  [${Date.now() - started}ms] docs: ${msg.docs.map((d) => d.title + " " + d.score).join(", ")}`);
  if (msg.type === "sentiment.update")
    console.log(`  [${Date.now() - started}ms] sentiment ${msg.score} ${msg.label}`);
  if (msg.type === "alert.frustration") console.log(`  [${Date.now() - started}ms] ALERT ${msg.latencyMs}ms`);
};

ws.onerror = (e) => console.error("ws error", e.message ?? e);
ws.onclose = () => { if (pacer) clearInterval(pacer); if (!closeTimer) finish(); };

setTimeout(() => { console.error("timeout"); finish(); }, durationMs + TRAILING_MS + 25000);
