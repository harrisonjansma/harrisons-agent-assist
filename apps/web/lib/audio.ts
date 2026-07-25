/**
 * Audio sources for the copilot.
 *
 * - Mic mode (`startMic`) is fully live: it streams ~250ms webm/opus chunks to
 *   the worker, which relays them to Deepgram and runs the downstream LLMs.
 * - Sample mode (`replaySample`) is a RECORDED REPLAY: a recorded call whose
 *   speaker-labelled transcript, notes, doc hits, sentiment and alert are cached
 *   as timed events in public/sample-replay.json. Here we just play the audio and
 *   re-emit those cached events on their original cadence, so nothing is
 *   re-transcribed or re-scored. It's deterministic, instant, and free.
 */
import { LIMITS } from "@call-copilot/shared/protocol";
import type { ServerMessage } from "@call-copilot/shared/protocol";

export interface AudioSource {
  stop: () => void;
  /** Replay only: freeze/unfreeze the clock (and the audible playback). */
  pause?: () => void;
  resume?: () => void;
  /** Replay only: current playback position, so the UI clock never drifts
   *  from the events (a wall clock would keep running while paused). */
  clockMs?: () => number;
}

/** One cached pipeline event, keyed to a playback position. */
export interface ReplayEvent {
  atMs: number;
  asrMs?: number;
  msg: ServerMessage;
}
export interface ReplayFixture {
  audioDurationMs: number;
  events: ReplayEvent[];
}

export class MicPermissionError extends Error {
  constructor() {
    super("Microphone permission denied");
    this.name = "MicPermissionError";
  }
}

/** Live microphone via MediaRecorder. Throws MicPermissionError if denied. */
export async function startMic(onChunk: (b: Blob) => void): Promise<AudioSource> {
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    throw new MicPermissionError();
  }
  const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
    ? "audio/webm;codecs=opus"
    : "audio/webm";
  const rec = new MediaRecorder(stream, { mimeType: mime });
  rec.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) onChunk(e.data);
  };
  rec.start(LIMITS.CHUNK_MS);
  return {
    stop: () => {
      try {
        rec.stop();
      } catch {
        /* noop */
      }
      stream.getTracks().forEach((t) => t.stop());
    },
  };
}

/**
 * Drives a recorded replay: plays the sample audio audibly and re-emits the
 * cached pipeline events in `fixture` on their captured cadence. No WebSocket,
 * no Deepgram, no LLM calls.
 *
 * `audioEl` is created and .play()'d by the caller *inside the click gesture*
 * (autoplay policy requires that). The audio playhead is the master clock while
 * it's advancing, so the transcript/notes/docs stay in sync with what's heard;
 * if autoplay was blocked we fall back to a wall clock so the replay still runs
 * (silently). Events captured after the audio ends (a final notes redraft, the
 * closing line) fire on the wall clock once playback finishes.
 */
export function replaySample(
  audioEl: HTMLAudioElement | null,
  fixture: ReplayFixture,
  emit: (msg: ServerMessage, asrMs?: number, atMs?: number) => void,
  onEnd: () => void,
): AudioSource {
  const events = [...fixture.events].sort((a, b) => a.atMs - b.atMs);
  let i = 0;
  let stopped = false;
  let finished = false;
  let paused = false;
  let pausedAt = 0;
  let pausedTotal = 0;

  // Wall clock with paused time subtracted out — used only for the fallback
  // branches below (autoplay blocked, or audio finished before the events do).
  const now = (): number =>
    performance.now() - pausedTotal - (paused ? performance.now() - pausedAt : 0);

  const startWall = now();
  let endedWall = 0;

  const clockMs = (): number => {
    if (audioEl && audioEl.currentTime > 0 && !audioEl.ended) {
      return audioEl.currentTime * 1000; // audio is master while it advances
    }
    if (audioEl && audioEl.ended) {
      if (!endedWall) endedWall = now();
      return fixture.audioDurationMs + (now() - endedWall);
    }
    // Not started / autoplay blocked — run on the wall clock so it still plays.
    return now() - startWall;
  };

  const timer = setInterval(() => {
    if (stopped || paused) return;
    const t = clockMs();
    while (i < events.length && events[i]!.atMs <= t) {
      const ev = events[i]!;
      emit(ev.msg, ev.asrMs, ev.atMs);
      i++;
    }
    if (i >= events.length && !finished) {
      finished = true;
      clearInterval(timer);
      onEnd();
    }
  }, 100);

  return {
    stop: () => {
      stopped = true;
      clearInterval(timer);
      if (audioEl) {
        try {
          audioEl.pause();
          audioEl.currentTime = 0;
        } catch {
          /* noop */
        }
      }
    },
    pause: () => {
      if (paused || stopped) return;
      paused = true;
      pausedAt = performance.now();
      try {
        audioEl?.pause();
      } catch {
        /* noop */
      }
    },
    resume: () => {
      if (!paused || stopped) return;
      pausedTotal += performance.now() - pausedAt;
      paused = false;
      void audioEl?.play().catch(() => {
        /* autoplay blocked — the replay still runs, just silently */
      });
    },
    clockMs,
  };
}
