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
 * Streams a pre-recorded webm file (public/sample-call.webm) through the same
 * pipeline. We pipe the container bytes sequentially on a fixed cadence — no
 * decoding — which reproduces a continuous stream for Deepgram. The mic path is
 * never touched, so this works even with no microphone (iOS Safari, recruiters).
 */
export async function streamSampleFile(
  url: string,
  onChunk: (b: Blob) => void,
  onEnd: () => void,
): Promise<AudioSource> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`sample file not found (${res.status})`);
  const buf = new Uint8Array(await res.arrayBuffer());

  // ~8KB per 250ms tick keeps frames well under the 32KB cap.
  const chunkBytes = 8 * 1024;
  let offset = 0;
  let stopped = false;

  const timer = setInterval(() => {
    if (stopped) return;
    if (offset >= buf.length) {
      clearInterval(timer);
      onEnd();
      return;
    }
    const slice = buf.subarray(offset, Math.min(offset + chunkBytes, buf.length));
    offset += chunkBytes;
    onChunk(new Blob([slice], { type: "audio/webm" }));
  }, LIMITS.CHUNK_MS);

  return {
    stop: () => {
      stopped = true;
      clearInterval(timer);
    },
  };
}
