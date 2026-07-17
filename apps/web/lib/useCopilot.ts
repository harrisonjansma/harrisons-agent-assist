"use client";
/**
 * The client brain: owns the WS connection and all live UI state (transcript,
 * notes, docs, sentiment, alerts, timers, latency). Drives both the mic and
 * sample-call audio sources through one code path.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  LIMITS,
  parseServerMessage,
  type DocHit,
  type SentimentLabel,
} from "@call-copilot/shared/protocol";
import { startMic, streamSampleFile, MicPermissionError, type AudioSource } from "./audio";

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
const SAMPLE_URL = "/sample-call.webm";

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
  const lastChunkAtRef = useRef<number>(0);
  const sentimentLatenciesRef = useRef<number[]>([]);
  const startedAtRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const notesAwaitRef = useRef(false);

  const patch = useCallback((p: Partial<CopilotState>) => setState((s) => ({ ...s, ...p })), []);

  const cleanup = useCallback(() => {
    audioRef.current?.stop();
    audioRef.current = null;
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
  }, []);

  const stop = useCallback(() => {
    cleanup();
    setState((s) => (s.conn === "error" ? s : { ...s, conn: "ended", interim: "" }));
  }, [cleanup]);

  const start = useCallback(
    async (mode: Mode) => {
      setState({ ...INITIAL, conn: "connecting", mode });
      sentimentLatenciesRef.current = [];
      notesAwaitRef.current = false;

      const ws = new WebSocket(WS_URL);
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;

      ws.onopen = async () => {
        startedAtRef.current = Date.now();
        patch({ conn: "live" });
        ws.send(JSON.stringify({ type: "start" }));

        // countdown timer + hard stop
        timerRef.current = setInterval(() => {
          const remaining = LIMITS.MAX_SESSION_MS - (Date.now() - startedAtRef.current);
          if (remaining <= 0) {
            stop();
          } else {
            patch({ remainingMs: remaining });
          }
        }, 250);

        const onChunk = (blob: Blob) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          lastChunkAtRef.current = Date.now();
          blob.arrayBuffer().then((ab) => {
            if (ws.readyState === WebSocket.OPEN) ws.send(ab);
          });
        };

        try {
          if (mode === "mic") {
            audioRef.current = await startMic(onChunk);
          } else {
            audioRef.current = await streamSampleFile(SAMPLE_URL, onChunk, () => {
              // let trailing transcripts land, then end
              setTimeout(stop, 2500);
            });
          }
        } catch (err) {
          const msg =
            err instanceof MicPermissionError
              ? "Microphone access was blocked. Allow the mic and try again, or click “Play a sample call”."
              : "Couldn't start audio. Try the sample call instead.";
          cleanup();
          patch({ conn: "error", errorMsg: msg });
        }
      };

      ws.onmessage = (ev) => {
        const msg = parseServerMessage(typeof ev.data === "string" ? ev.data : "");
        if (!msg) return;
        switch (msg.type) {
          case "transcript.interim":
            patch({ interim: msg.text, asrLatencyMs: Date.now() - lastChunkAtRef.current });
            break;
          case "transcript.final":
            setState((s) => ({
              ...s,
              interim: "",
              asrLatencyMs: Date.now() - lastChunkAtRef.current,
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
      };

      ws.onerror = () => {
        if (wsRef.current === ws) patch({ conn: "error", errorMsg: "Connection failed. The demo may be asleep — try again in ~30s." });
      };

      ws.onclose = () => {
        if (wsRef.current === ws) {
          audioRef.current?.stop();
          audioRef.current = null;
          if (timerRef.current) clearInterval(timerRef.current);
          setState((s) => (s.conn === "error" || s.conn === "ended" ? s : { ...s, conn: "ended", interim: "" }));
        }
      };
    },
    [patch, stop, cleanup],
  );

  useEffect(() => () => cleanup(), [cleanup]);

  return { state, start, stop };
}
