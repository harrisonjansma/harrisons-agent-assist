"use client";
/**
 * The client brain: owns all live UI state (transcript, notes, docs, sentiment,
 * alerts, timers, latency). Two audio modes feed the SAME state reducer
 * (`applyMessage`):
 *  - mic mode: fully live over a WebSocket (Deepgram + LLMs run per session).
 *  - sample mode: a recorded replay of one real run (public/sample-replay.json),
 *    played back audibly with no WS/Deepgram/LLM calls — see lib/audio.ts.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  LIMITS,
  parseServerMessage,
  type DocHit,
  type SentimentLabel,
  type ServerMessage,
} from "@call-copilot/shared/protocol";
import {
  startMic,
  replaySample,
  MicPermissionError,
  type AudioSource,
  type ReplayFixture,
} from "./audio";

export type ConnState = "idle" | "connecting" | "live" | "ended" | "error";
export type Mode = "mic" | "sample";

export interface TranscriptLine {
  text: string;
  ts: number;
}

export interface CopilotState {
  conn: ConnState;
  mode: Mode | null;
  finals: TranscriptLine[];
  interim: string;
  notes: string;
  notesDrafting: boolean;
  docs: DocHit[];
  sentimentScore: number;
  sentimentLabel: SentimentLabel;
  alert: { latencyMs: number; at: number } | null;
  asrLatencyMs: number | null;
  sentimentP50Ms: number | null;
  remainingMs: number;
  errorMsg: string | null;
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8080/ws";
const SAMPLE_AUDIO_URL = "/sample-call.ogg";
const SAMPLE_REPLAY_URL = "/sample-replay.json";

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : Math.round((s[mid - 1]! + s[mid]!) / 2);
}

const INITIAL: CopilotState = {
  conn: "idle",
  mode: null,
  finals: [],
  interim: "",
  notes: "",
  notesDrafting: false,
  docs: [],
  sentimentScore: 0,
  sentimentLabel: "neutral",
  alert: null,
  asrLatencyMs: null,
  sentimentP50Ms: null,
  remainingMs: LIMITS.MAX_SESSION_MS,
  errorMsg: null,
};

export function useCopilot() {
  const [state, setState] = useState<CopilotState>(INITIAL);
  const wsRef = useRef<WebSocket | null>(null);
  const audioRef = useRef<AudioSource | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const lastChunkAtRef = useRef<number>(0);
  const sentimentLatenciesRef = useRef<number[]>([]);
  const startedAtRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const notesAwaitRef = useRef(false);

  const patch = useCallback((p: Partial<CopilotState>) => setState((s) => ({ ...s, ...p })), []);

  const stopAudioEl = useCallback(() => {
    if (audioElRef.current) {
      try {
        audioElRef.current.pause();
      } catch {
        /* noop */
      }
      audioElRef.current = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    audioRef.current?.stop();
    audioRef.current = null;
    stopAudioEl();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ type: "stop" }));
      } catch {
        /* noop */
      }
      wsRef.current.close();
    }
    wsRef.current = null;
  }, [stopAudioEl]);

  const stop = useCallback(() => {
    cleanup();
    setState((s) => (s.conn === "error" ? s : { ...s, conn: "ended", interim: "" }));
  }, [cleanup]);

  /**
   * Single state reducer for one server event. Shared by the live WS and the
   * replay. `asrMs` lets the replay supply the captured ASR latency; live mode
   * measures it from the last audio frame.
   */
  const applyMessage = useCallback(
    (msg: ServerMessage, asrMs?: number) => {
      const asr = asrMs ?? Date.now() - lastChunkAtRef.current;
      switch (msg.type) {
        case "transcript.interim":
          patch({ interim: msg.text, asrLatencyMs: asr });
          break;
        case "transcript.final":
          setState((s) => ({
            ...s,
            interim: "",
            asrLatencyMs: asr,
            finals: [...s.finals, { text: msg.text, ts: msg.ts }],
            notesDrafting: true,
          }));
          notesAwaitRef.current = true;
          break;
        case "notes.update":
          notesAwaitRef.current = false;
          patch({ notes: msg.markdown, notesDrafting: false });
          break;
        case "docs.update":
          patch({ docs: msg.docs });
          break;
        case "sentiment.update": {
          sentimentLatenciesRef.current.push(msg.latencyMs);
          patch({
            sentimentScore: msg.score,
            sentimentLabel: msg.label,
            sentimentP50Ms: median(sentimentLatenciesRef.current),
          });
          break;
        }
        case "alert.frustration":
          patch({ alert: { latencyMs: msg.latencyMs, at: Date.now() } });
          break;
        case "error":
          cleanup();
          patch({ conn: "error", errorMsg: msg.message });
          break;
      }
    },
    [patch, cleanup],
  );

  /** Sample mode: play the audio + replay the cached pipeline events. */
  const startReplay = useCallback(async () => {
    // Begin audible playback synchronously (inside the click gesture) so the
    // browser autoplay policy lets it through; the replay clock follows it.
    const el = new Audio(SAMPLE_AUDIO_URL);
    el.preload = "auto";
    audioElRef.current = el;
    void el.play().catch(() => {
      /* autoplay blocked — the replay still runs, just silently */
    });

    let fixture: ReplayFixture;
    try {
      const res = await fetch(SAMPLE_REPLAY_URL);
      if (!res.ok) throw new Error(String(res.status));
      fixture = (await res.json()) as ReplayFixture;
    } catch {
      stopAudioEl();
      patch({ conn: "error", errorMsg: "Couldn't load the sample call. Please try again." });
      return;
    }

    startedAtRef.current = Date.now();
    patch({ conn: "live" });

    const durationMs = fixture.audioDurationMs;
    timerRef.current = setInterval(() => {
      patch({ remainingMs: Math.max(0, durationMs - (Date.now() - startedAtRef.current)) });
    }, 250);

    audioRef.current = replaySample(el, fixture, applyMessage, () => {
      // let the closing line settle, then end the session
      setTimeout(stop, 2000);
    });
  }, [patch, stop, stopAudioEl, applyMessage]);

  /** Mic mode: live audio → worker → Deepgram/LLMs over a WebSocket. */
  const startMicSession = useCallback(() => {
    const ws = new WebSocket(WS_URL);
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;

    ws.onopen = async () => {
      startedAtRef.current = Date.now();
      patch({ conn: "live" });
      ws.send(JSON.stringify({ type: "start" }));

      // countdown timer + hard stop at the session cap
      timerRef.current = setInterval(() => {
        const remaining = LIMITS.MAX_SESSION_MS - (Date.now() - startedAtRef.current);
        if (remaining <= 0) stop();
        else patch({ remainingMs: remaining });
      }, 250);

      const onChunk = (blob: Blob) => {
        if (ws.readyState !== WebSocket.OPEN) return;
        lastChunkAtRef.current = Date.now();
        blob.arrayBuffer().then((ab) => {
          if (ws.readyState === WebSocket.OPEN) ws.send(ab);
        });
      };

      try {
        audioRef.current = await startMic(onChunk);
      } catch (err) {
        const msg =
          err instanceof MicPermissionError
            ? "Microphone access was blocked. Allow the mic and try again, or click “Play a sample call”."
            : "Couldn't start the microphone. Try the sample call instead.";
        cleanup();
        patch({ conn: "error", errorMsg: msg });
      }
    };

    ws.onmessage = (ev) => {
      const msg = parseServerMessage(typeof ev.data === "string" ? ev.data : "");
      if (msg) applyMessage(msg);
    };

    ws.onerror = () => {
      if (wsRef.current === ws)
        patch({ conn: "error", errorMsg: "Connection failed. The demo may be asleep — try again in ~30s." });
    };

    ws.onclose = () => {
      if (wsRef.current === ws) {
        audioRef.current?.stop();
        audioRef.current = null;
        stopAudioEl();
        if (timerRef.current) clearInterval(timerRef.current);
        setState((s) => (s.conn === "error" || s.conn === "ended" ? s : { ...s, conn: "ended", interim: "" }));
      }
    };
  }, [patch, stop, cleanup, stopAudioEl, applyMessage]);

  const start = useCallback(
    async (mode: Mode) => {
      setState({ ...INITIAL, conn: "connecting", mode });
      sentimentLatenciesRef.current = [];
      notesAwaitRef.current = false;

      if (mode === "sample") await startReplay();
      else startMicSession();
    },
    [startReplay, startMicSession],
  );

  useEffect(() => () => cleanup(), [cleanup]);

  return { state, start, stop };
}
