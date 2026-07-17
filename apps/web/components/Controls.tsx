import type { ConnState } from "../lib/useCopilot";

export function Controls(props: {
  conn: ConnState;
  onMic: () => void;
  onSample: () => void;
  onStop: () => void;
}) {
  const { conn, onMic, onSample, onStop } = props;
  const live = conn === "live" || conn === "connecting";

  if (live) {
    return (
      <button
        onClick={onStop}
        className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900"
      >
        Stop
      </button>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={onSample}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        ▶ Play a sample call
      </button>
      <button
        onClick={onMic}
        className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        Use my microphone
      </button>
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
      {message}
    </div>
  );
}
