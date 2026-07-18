/**
 * Thin Deepgram streaming ASR client over a raw WebSocket (keeps deps thin per
 * ADR). Model nova-2, interim results on, webm/opus container passthrough
 * (no encoding/sample_rate params — Deepgram auto-detects the container).
 */
import WebSocket from "ws";
import { log } from "./logger.js";

export interface TranscriptEvent {
  text: string;
  isFinal: boolean;
  /** ms since epoch when the worker received this from Deepgram */
  receivedAt: number;
  /** Deepgram diarization speaker index (only when diarize is enabled). */
  speaker?: number;
}

export interface DeepgramHandlers {
  onTranscript: (e: TranscriptEvent) => void;
  onError: (err: Error) => void;
  onClose: () => void;
}

/**
 * Optional stream config. Defaults reproduce the live mic path exactly: no
 * diarization and no encoding params (Deepgram auto-detects the webm/opus
 * container). The two-voice sample capture opts into diarize + raw linear16.
 */
export interface DeepgramOptions {
  diarize?: boolean;
  /** e.g. "linear16" for raw PCM; omit for container passthrough. */
  encoding?: string;
  sampleRate?: number;
}

function buildUrl(opts?: DeepgramOptions): string {
  const params = new URLSearchParams({
    model: "nova-2",
    interim_results: "true",
    smart_format: "true",
    punctuate: "true",
  });
  if (opts?.diarize) params.set("diarize", "true");
  if (opts?.encoding) {
    params.set("encoding", opts.encoding);
    params.set("sample_rate", String(opts.sampleRate ?? 24000));
    params.set("channels", "1");
  }
  return "wss://api.deepgram.com/v1/listen?" + params.toString();
}

/** Dominant diarization speaker across a segment's words (or undefined). */
function segmentSpeaker(words: unknown): number | undefined {
  if (!Array.isArray(words) || words.length === 0) return undefined;
  const counts = new Map<number, number>();
  for (const w of words as Array<{ speaker?: number }>) {
    if (typeof w.speaker === "number") counts.set(w.speaker, (counts.get(w.speaker) ?? 0) + 1);
  }
  let best: number | undefined;
  let bestN = -1;
  for (const [spk, n] of counts) if (n > bestN) ((best = spk), (bestN = n));
  return best;
}

export class DeepgramStream {
  private ws: WebSocket;
  private keepAlive: NodeJS.Timeout | null = null;
  private open = false;
  private pending: Buffer[] = []; // frames buffered until the socket opens

  constructor(handlers: DeepgramHandlers, opts?: DeepgramOptions) {
    const key = process.env.DEEPGRAM_API_KEY;
    if (!key) throw new Error("DEEPGRAM_API_KEY is not set");

    this.ws = new WebSocket(buildUrl(opts), { headers: { Authorization: `Token ${key}` } });

    this.ws.on("open", () => {
      this.open = true;
      // Flush frames that arrived before the socket opened. Critical: the very
      // first frame carries the webm/ogg container header — without it Deepgram
      // receives a headerless mid-stream and can't decode anything.
      for (const f of this.pending) this.ws.send(f);
      log.info({ flushed: this.pending.length }, "deepgram: open");
      this.pending = [];
      // Deepgram closes idle sockets; keep it warm during pauses.
      this.keepAlive = setInterval(() => {
        if (this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: "KeepAlive" }));
        }
      }, 8000);
    });

    this.ws.on("message", (data: WebSocket.RawData) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type && msg.type !== "Results") {
          if (msg.type !== "Metadata" && msg.type !== "SpeechStarted") {
            log.info("deepgram non-results: " + JSON.stringify(msg).slice(0, 250));
          }
          return; // Metadata/SpeechStarted etc.
        }
        const alt = msg.channel?.alternatives?.[0];
        const text: string = alt?.transcript ?? "";
        if (!text) return;
        handlers.onTranscript({
          text,
          isFinal: Boolean(msg.is_final),
          receivedAt: Date.now(),
          speaker: segmentSpeaker(alt?.words),
        });
      } catch (err) {
        log.warn({ err }, "deepgram: failed to parse message");
      }
    });

    this.ws.on("error", (err) => {
      log.error("deepgram: error " + String(err).slice(0, 200));
      handlers.onError(err instanceof Error ? err : new Error(String(err)));
    });

    this.ws.on("close", (code: number, reason: Buffer) => {
      this.open = false;
      if (this.keepAlive) clearInterval(this.keepAlive);
      log.info(`deepgram: close code=${code} reason=${reason?.toString().slice(0, 160)}`);
      handlers.onClose();
    });
  }

  /** Forward a binary audio frame from the client to Deepgram. */
  send(frame: Buffer): void {
    if (this.open && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(frame);
    } else if (this.pending.length < 400) {
      // buffer until the socket opens (keeps the container header, cap ~memory)
      this.pending.push(frame);
    }
  }

  isOpen(): boolean {
    return this.open;
  }

  close(): void {
    if (this.keepAlive) clearInterval(this.keepAlive);
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "CloseStream" }));
      this.ws.close();
    }
  }
}
