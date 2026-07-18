import { useState } from "react";

export function WhatThisShows() {
  const [open, setOpen] = useState(false);
  return (
    <div className="card text-sm">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left font-medium text-ink"
      >
        What this shows
        <span className="grid h-6 w-6 place-items-center rounded-lg border border-[var(--line)] text-ink-muted">
          {open ? "–" : "+"}
        </span>
      </button>
      {open && (
        <div className="animate-rise space-y-3 border-t border-[var(--line)] px-4 py-4 text-ink-muted">
          <p className="leading-relaxed">
            <span className="text-ink">This isn&rsquo;t a machine-learning model I trained.</span> The
            speech-to-text is Deepgram; the notes, document retrieval, and sentiment are OpenAI API calls. No
            model was built or fine-tuned here — those are off-the-shelf, general-purpose services anyone can call.
          </p>
          <p className="leading-relaxed">
            What it demonstrates is <span className="text-ink">using assistive / generative-AI technologies
            intelligently</span> — composing those commodity models into a real-time product that fills an
            actual need: helping a support agent, live and mid-conversation, before a call goes sideways.
          </p>
          <p className="leading-relaxed text-ink-muted">
            The engineering is in the orchestration, not the models: a single-WebSocket streaming design;
            cadence and debouncing so the LLM calls stay cheap; retrieval thresholds so the docs stay quiet
            until they&rsquo;re relevant; speaker diarization; sub-second transcript-to-alert latency; and a
            cached replay so this demo is deterministic and free to run. Knowing <em>which</em> model to reach
            for, and building the system around it, is the skill on display.
          </p>
        </div>
      )}
    </div>
  );
}
