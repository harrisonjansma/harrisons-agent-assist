/**
 * WebSocket wire protocol shared by apps/web (client) and apps/worker (server).
 * A single WS connection per client session carries BOTH uplink audio and
 * downlink JSON events (see ADR in the Linear project description).
 *
 * - Uplink audio: binary frames (webm/opus, ~250ms chunks). Not typed here.
 * - Uplink control: the JSON messages in `ClientMessage`.
 * - Downlink: the JSON messages in `ServerMessage`.
 */

/** A retrieved procedure-doc card surfaced mid-call. */
export interface DocHit {
  id: number;
  title: string;
  snippet: string;
  score: number;
  /**
   * Full doc body, present only in the cached sample replay so the card can
   * expand without a live `/api/docs` fetch (keeps the sample self-contained
   * and DB-independent). Live mic mode omits this and fetches by `id`.
   */
  body?: string;
}

export type SentimentLabel = "positive" | "neutral" | "negative" | "frustrated";

/** Diarized speaker role. Absent on the live mic path (single speaker). */
export type Speaker = "agent" | "customer";

/** client -> server control messages (audio is sent as raw binary frames). */
export type ClientMessage =
  | { type: "start"; sessionId?: string }
  | { type: "stop"; sessionId?: string };

/** server -> client events. */
export type ServerMessage =
  | { type: "session.started"; sessionId: string }
  | { type: "transcript.interim"; text: string; ts: number; speaker?: Speaker }
  | { type: "transcript.final"; text: string; ts: number; speaker?: Speaker }
  | { type: "notes.update"; markdown: string }
  | { type: "docs.update"; docs: DocHit[] }
  | { type: "sentiment.update"; score: number; label: SentimentLabel; latencyMs: number }
  | { type: "alert.frustration"; latencyMs: number }
  | { type: "error"; code: ErrorCode; message: string };

export type ErrorCode =
  | "asr_unavailable"
  | "rate_limited"
  | "session_expired"
  | "bad_request"
  | "internal";

/** Type guard + parser for inbound server messages on the web client. */
export function parseServerMessage(raw: string): ServerMessage | null {
  try {
    const msg = JSON.parse(raw) as ServerMessage;
    if (typeof msg?.type !== "string") return null;
    return msg;
  } catch {
    return null;
  }
}

export const LIMITS = {
  /** hard session cap */
  MAX_SESSION_MS: 3 * 60 * 1000,
  /** per-IP sessions per rolling hour */
  MAX_SESSIONS_PER_HOUR: 5,
  /** max bytes per binary audio frame */
  MAX_FRAME_BYTES: 32 * 1024,
  /** audio chunk cadence */
  CHUNK_MS: 250,
} as const;
