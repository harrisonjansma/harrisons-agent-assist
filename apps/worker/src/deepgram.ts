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
}

export interface DeepgramHandlers {
  onTranscript: (e: TranscriptEvent) => void;
  onError: (err: Error) => void;
  onClose: () => void;
}

const DG_URL =
  "wss://api.deepgram.com/v1/listen?model=nova-2&interim_results=true&smart_format=true&punctuate=true";

export class DeepgramStream {
  private ws: WebSocket;
  private keepAlive: NodeJS.Timeout | null = null;
  private open = false;

  constructor(handlers: DeepgramHandlers) {
    const key = process.env.DEEPGRAM_API_KEY;
    if (!key) throw new Error("DEEPGRAM_API_KEY is not set");

    this.ws = new WebSocket(DG_URL, { headers: { Authorization: `Token ${key}` } });

    this.ws.on("open", () => {
      this.open = true;
      // Deepgram closes idle sockets; keep it warm during pauses.
      this.keepAlive = setInterval(() => {
        if (this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: "KeepAlive" }));
        }
      }, 8000);
      log.info("deepgram: open");
    });

    this.ws.on("message", (data: WebSocket.RawData) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type && msg.type !== "Results") {
          if (msg.type !== "Metadata" && msg.type !== "SpeechStarted") {
            log.info({ dg: msg.type, msg: JSON.stringify(msg).slice(0, 300) }, "deepgram non-results message");
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
        });
      } catch (err) {
        log.warn({ err }, "deepgram: failed to parse message");
      }
    });

    this.ws.on("error", (err) => {
      log.error({ err }, "deepgram: error");
      handlers.onError(err instanceof Error ? err : new Error(String(err)));
    });

    this.ws.on("close", (code: number, reason: Buffer) => {
      this.open = false;
      if (this.keepAlive) clearInterval(this.keepAlive);
      log.info({ code, reason: reason?.toString().slice(0, 200) }, "deepgram: close");
      handlers.onClose();
    });
  }

  /** Forward a binary audio frame from the client to Deepgram. */
  send(frame: Buffer): void {
    if (this.ws.readyState === WebSocket.OPEN) this.ws.send(frame);
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
