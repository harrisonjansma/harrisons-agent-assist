/**
 * Audio sources for the copilot. Both produce a stream of ~250ms webm/opus
 * chunks delivered to `onChunk`, so the worker/Deepgram pipeline is identical
 * whether the audio is a live mic or the shipped sample call (HAR-264): the
 * sample path is not special-cased server-side.
 */
import { LIMITS } from "@call-copilot/shared/protocol";

export interface AudioSource {
  stop: () => void;
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
 * Streams the pre-recorded sample call (public/sample-call.ogg) through the same
 * pipeline while ALSO playing it audibly, so a visitor with no microphone hears
 * the call they're watching get transcribed.
 *
 * The container bytes are piped sequentially — no decoding — but paced to the
 * <audio> element's playback clock so Deepgram receives the audio at real time
 * and roughly in sync with what the listener hears. If the browser blocked
 * autoplay (no gesture, muted tab), the element stays paused and we fall back to
 * a fixed cadence so the transcript still works — it just won't be audible.
 *
 * `audioEl` is created and .play()'d by the caller *inside the click gesture*
 * (autoplay policy requires that); this function only drives byte delivery.
 */
export async function streamSampleFile(
  url: string,
  audioEl: HTMLAudioElement | null,
  onChunk: (b: Blob) => void,
  onEnd: () => void,
): Promise<AudioSource> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`sample file not found (${res.status})`);
  const buf = new Uint8Array(await res.arrayBuffer());

  // ~8KB per tick keeps frames well under the 32KB cap.
  const chunkBytes = 8 * 1024;
  let offset = 0;
  let stopped = false;
  let ended = false;

  // True only while audio is genuinely playing with a known duration; that lets
  // us sync byte delivery to it. Otherwise we fall back to a fixed cadence.
  const playing = () =>
    !!audioEl && !audioEl.paused && Number.isFinite(audioEl.duration) && audioEl.duration > 0;

  if (audioEl) audioEl.addEventListener("ended", () => (ended = true), { once: true });

  const send = (to: number) => {
    while (offset < to && !stopped) {
      const end = Math.min(offset + chunkBytes, to);
      onChunk(new Blob([buf.subarray(offset, end)], { type: "audio/ogg" }));
      offset = end;
    }
  };

  const timer = setInterval(() => {
    if (stopped) return;

    if (playing()) {
      // Stay a chunk ahead of the playhead so Deepgram is never starved.
      const frac = Math.min(1, audioEl!.currentTime / audioEl!.duration);
      send(Math.min(buf.length, Math.ceil(frac * buf.length) + chunkBytes));
      if (offset >= buf.length && ended) {
        clearInterval(timer);
        onEnd();
      }
      return;
    }

    // Fallback / audio finished: drain remaining bytes at a fixed rate.
    send(Math.min(buf.length, offset + chunkBytes));
    if (offset >= buf.length) {
      clearInterval(timer);
      onEnd();
    }
  }, LIMITS.CHUNK_MS);

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
  };
}
