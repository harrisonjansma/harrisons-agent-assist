/**
 * Per-connection session state + orchestration. Owns the client WS, the lazy
 * Deepgram stream, the transcript/notes/RAG/sentiment pipelines, and their
 * cadence guards. One instance per connected browser tab.
 */
import type { WebSocket } from "ws";
import { LIMITS, type DocHit, type ServerMessage } from "@call-copilot/shared";
import { log } from "./logger.js";
import { DeepgramStream, type TranscriptEvent } from "./deepgram.js";
import { generateNotes } from "./notes.js";
import { retrieveDocs, docsKey } from "./rag.js";
import { scoreSentiment, FrustrationDetector, type SentimentResult } from "./sentiment.js";
import { supabaseStore, type SessionStore } from "./store.js";

/** Streaming ASR seam — DeepgramStream is the production implementation. */
export interface AsrStream {
  send(frame: Buffer): void;
  isOpen(): boolean;
  close(): void;
}
export interface AsrHandlers {
  onTranscript: (e: TranscriptEvent) => void;
  onError: (err: Error) => void;
  onClose: () => void;
}

/** Everything the Session talks to the outside world through. */
export interface SessionDeps {
  createAsr: (h: AsrHandlers) => AsrStream;
  generateNotes: (previousDraft: string, newUtterances: string[]) => Promise<string>;
  retrieveDocs: (windowText: string) => Promise<DocHit[]>;
  scoreSentiment: (prior: string[], latest: string) => Promise<SentimentResult>;
  store: SessionStore;
  config?: Partial<Cadence>;
}

/** Cadence / cost guards (ADR + issue specs); overridable for tests. */
export interface Cadence {
  notesMinNewFinals: number;
  notesMinIntervalMs: number;
  notesMaxRegens: number;
  ragEveryNFinals: number;
  ragMinIntervalMs: number;
  ragWindow: number;
}

const DEFAULT_CADENCE: Cadence = {
  notesMinNewFinals: 2,
  notesMinIntervalMs: 5000,
  notesMaxRegens: 40,
  ragEveryNFinals: 3,
  ragMinIntervalMs: 5000,
  ragWindow: 6,
};

/** Production wiring: Deepgram + OpenAI + Supabase. */
export function defaultDeps(): SessionDeps {
  return {
    createAsr: (h) => new DeepgramStream(h),
    generateNotes,
    retrieveDocs,
    scoreSentiment,
    store: supabaseStore(),
  };
}

export class Session {
  readonly id: string;
  private closed = false;

  private readonly deps: SessionDeps;
  private readonly cadence: Cadence;

  private dg: AsrStream | null = null;
  private dgReconnectUsed = false;
  private hardStopTimer: NodeJS.Timeout;

  // transcript
  private finals: string[] = [];

  // notes
  private notesDraft = "";
  private notesBuffer: string[] = []; // finals not yet folded into notes
  private notesLastRunAt = 0;
  private notesInflight = false;
  private notesRegens = 0;

  // rag
  private ragFinalsSinceRun = 0;
  private ragLastRunAt = 0;
  private ragInflight = false;
  private lastDocsKey = "";

  // sentiment
  private frustration = new FrustrationDetector();

  constructor(
    id: string,
    private readonly ws: WebSocket,
    deps: SessionDeps = defaultDeps(),
  ) {
    this.id = id;
    this.deps = deps;
    this.cadence = { ...DEFAULT_CADENCE, ...deps.config };
    this.hardStopTimer = setTimeout(() => {
      this.send({ type: "error", code: "session_expired", message: "3-minute demo limit reached." });
      void this.close("hard-stop");
    }, LIMITS.MAX_SESSION_MS);
  }

  send(msg: ServerMessage): void {
    if (this.closed) return;
    if (this.ws.readyState === this.ws.OPEN) this.ws.send(JSON.stringify(msg));
  }

  /** Client sent a binary audio frame. Lazily open Deepgram on the first one. */
  onAudio(frame: Buffer): void {
    if (this.closed) return;
    if (frame.byteLength > LIMITS.MAX_FRAME_BYTES) {
      log.warn({ session: this.id, bytes: frame.byteLength }, "dropping oversized frame");
      return;
    }
    if (!this.dg) this.openDeepgram();
    this.dg?.send(frame);
  }

  private openDeepgram(): void {
    this.dg = this.deps.createAsr({
      onTranscript: (e) => this.onTranscript(e),
      onError: () => {
        /* handled on close */
      },
      onClose: () => this.onDeepgramClose(),
    });
  }

  private onDeepgramClose(): void {
    if (this.closed) return;
    // One reconnect attempt, then give up gracefully.
    if (!this.dgReconnectUsed) {
      this.dgReconnectUsed = true;
      log.warn({ session: this.id }, "deepgram dropped; reconnecting once");
      this.openDeepgram();
      return;
    }
    this.send({ type: "error", code: "asr_unavailable", message: "Speech service disconnected." });
    void this.close("asr-lost");
  }

  private onTranscript(e: TranscriptEvent): void {
    if (!e.text) return;
    if (!e.isFinal) {
      this.send({ type: "transcript.interim", text: e.text, ts: e.receivedAt });
      return;
    }
    this.send({ type: "transcript.final", text: e.text, ts: e.receivedAt });
    this.finals.push(e.text);
    this.notesBuffer.push(e.text);
    this.ragFinalsSinceRun += 1;

    void this.persistUtterance(e.text, e.receivedAt);
    this.maybeRunNotes();
    this.maybeRunRag();
  }

  private async persistUtterance(text: string, receivedAt: number): Promise<void> {
    const id = await this.deps.store.insertUtterance(this.id, text).catch((err) => {
      log.error({ err, session: this.id }, "failed to insert utterance");
      return null;
    });
    if (id == null) return;
    // sentiment runs fire-and-forget and updates the row it just inserted.
    void this.runSentiment(id, text, receivedAt);
  }

  // --- notes ---------------------------------------------------------------
  private maybeRunNotes(): void {
    if (this.notesInflight) return;
    if (this.notesRegens >= this.cadence.notesMaxRegens) return;
    if (this.notesBuffer.length < this.cadence.notesMinNewFinals) return;
    if (Date.now() - this.notesLastRunAt < this.cadence.notesMinIntervalMs) return;
    void this.runNotes();
  }

  private async runNotes(): Promise<void> {
    this.notesInflight = true;
    this.notesLastRunAt = Date.now();
    const batch = this.notesBuffer.splice(0);
    try {
      const md = await this.deps.generateNotes(this.notesDraft, batch);
      this.notesDraft = md;
      this.notesRegens += 1;
      this.send({ type: "notes.update", markdown: md });
      await this.deps.store.upsertNotes(this.id, md);
      if (this.notesRegens >= this.cadence.notesMaxRegens) {
        log.info({ session: this.id }, "notes finalized (regen cap)");
      }
    } catch (err) {
      log.error({ err, session: this.id }, "notes generation failed");
      this.notesBuffer.unshift(...batch); // retry these next time
    } finally {
      this.notesInflight = false;
      this.maybeRunNotes(); // catch up if more arrived while busy
    }
  }

  // --- rag ------------------------------------------------------------------
  private maybeRunRag(): void {
    if (this.ragInflight) return;
    if (this.ragFinalsSinceRun < this.cadence.ragEveryNFinals) return;
    if (Date.now() - this.ragLastRunAt < this.cadence.ragMinIntervalMs) return;
    void this.runRag();
  }

  private async runRag(): Promise<void> {
    this.ragInflight = true;
    this.ragLastRunAt = Date.now();
    this.ragFinalsSinceRun = 0;
    const windowText = this.finals.slice(-this.cadence.ragWindow).join(" ");
    try {
      const docs = await this.deps.retrieveDocs(windowText);
      const key = docsKey(docs);
      log.info({ session: this.id, ids: docs.map((d) => d.id), scores: docs.map((d) => d.score) }, "rag retrieval");
      if (key !== this.lastDocsKey) {
        this.lastDocsKey = key;
        this.send({ type: "docs.update", docs });
      }
    } catch (err) {
      log.error({ err, session: this.id }, "rag retrieval failed");
    } finally {
      this.ragInflight = false;
    }
  }

  // --- sentiment ------------------------------------------------------------
  private async runSentiment(utteranceId: number, text: string, receivedAt: number): Promise<void> {
    try {
      const prior = this.finals.slice(-3, -1); // two lines before the latest
      const result = await this.deps.scoreSentiment(prior, text);
      const latencyMs = Date.now() - receivedAt;
      this.send({ type: "sentiment.update", score: result.score, label: result.label, latencyMs });
      if (this.frustration.push(result)) {
        this.send({ type: "alert.frustration", latencyMs });
      }
      await this.deps.store.updateUtteranceSentiment(utteranceId, result.score);
    } catch (err) {
      log.error({ err, session: this.id }, "sentiment scoring failed");
    }
  }

  // --- lifecycle ------------------------------------------------------------
  async close(reason: string): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    clearTimeout(this.hardStopTimer);
    this.dg?.close();
    log.info({ session: this.id, reason }, "session closed");
    try {
      await this.deps.store.endSession(this.id);
    } catch (err) {
      log.error({ err, session: this.id }, "failed to set ended_at");
    }
    if (this.ws.readyState === this.ws.OPEN) this.ws.close();
  }
}
