/**
 * Per-connection session state + orchestration. Owns the client WS, the lazy
 * Deepgram stream, the transcript/notes/RAG/sentiment pipelines, and their
 * cadence guards. One instance per connected browser tab.
 */
import type { WebSocket } from "ws";
import { LIMITS, serverDb, type ServerMessage } from "@call-copilot/shared";
import { log } from "./logger.js";
import { DeepgramStream, type TranscriptEvent } from "./deepgram.js";
import { generateNotes } from "./notes.js";
import { retrieveDocs, docsKey } from "./rag.js";
import { scoreSentiment, FrustrationDetector } from "./sentiment.js";

// Cadence / cost guards (ADR + issue specs).
const NOTES_MIN_NEW_FINALS = 2;
const NOTES_MIN_INTERVAL_MS = 5000;
const NOTES_MAX_REGENS = 40;
const RAG_EVERY_N_FINALS = 3;
const RAG_MIN_INTERVAL_MS = 5000;
const RAG_WINDOW = 6; // last N utterances embedded as the query

export class Session {
  readonly id: string;
  private closed = false;

  private dg: DeepgramStream | null = null;
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
  ) {
    this.id = id;
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
    this.dg = new DeepgramStream({
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
    const { data, error } = await serverDb()
      .from("utterances")
      .insert({ session_id: this.id, text })
      .select("id")
      .single();
    if (error) {
      log.error({ error, session: this.id }, "failed to insert utterance");
      return;
    }
    // sentiment runs fire-and-forget and updates the row it just inserted.
    void this.runSentiment(data.id as number, text, receivedAt);
  }

  // --- notes ---------------------------------------------------------------
  private maybeRunNotes(): void {
    if (this.notesInflight) return;
    if (this.notesRegens >= NOTES_MAX_REGENS) return;
    if (this.notesBuffer.length < NOTES_MIN_NEW_FINALS) return;
    if (Date.now() - this.notesLastRunAt < NOTES_MIN_INTERVAL_MS) return;
    void this.runNotes();
  }

  private async runNotes(): Promise<void> {
    this.notesInflight = true;
    this.notesLastRunAt = Date.now();
    const batch = this.notesBuffer.splice(0);
    try {
      const md = await generateNotes(this.notesDraft, batch);
      this.notesDraft = md;
      this.notesRegens += 1;
      this.send({ type: "notes.update", markdown: md });
      await serverDb()
        .from("notes")
        .upsert({ session_id: this.id, markdown: md, updated_at: new Date().toISOString() });
      if (this.notesRegens >= NOTES_MAX_REGENS) {
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
    if (this.ragFinalsSinceRun < RAG_EVERY_N_FINALS) return;
    if (Date.now() - this.ragLastRunAt < RAG_MIN_INTERVAL_MS) return;
    void this.runRag();
  }

  private async runRag(): Promise<void> {
    this.ragInflight = true;
    this.ragLastRunAt = Date.now();
    this.ragFinalsSinceRun = 0;
    const windowText = this.finals.slice(-RAG_WINDOW).join(" ");
    try {
      const docs = await retrieveDocs(windowText);
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
      const result = await scoreSentiment(prior, text);
      const latencyMs = Date.now() - receivedAt;
      this.send({ type: "sentiment.update", score: result.score, label: result.label, latencyMs });
      if (this.frustration.push(result)) {
        this.send({ type: "alert.frustration", latencyMs });
      }
      await serverDb().from("utterances").update({ sentiment: result.score }).eq("id", utteranceId);
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
      await serverDb().from("sessions").update({ ended_at: new Date().toISOString() }).eq("id", this.id);
    } catch (err) {
      log.error({ err, session: this.id }, "failed to set ended_at");
    }
    if (this.ws.readyState === this.ws.OPEN) this.ws.close();
  }
}
