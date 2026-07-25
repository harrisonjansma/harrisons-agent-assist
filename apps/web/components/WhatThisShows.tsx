import { InfoCard } from "./InfoCard";

function MiniStat({ value, caption }: { value: string; caption: string }) {
  return (
    <div className="bg-surface px-3.5 py-3">
      <div className="font-mono text-[17px] font-bold text-ink">{value}</div>
      <div className="mt-0.5 font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink-faint">{caption}</div>
    </div>
  );
}

export function WhatThisShows() {
  return (
    <InfoCard index="05" title="What this shows">
      <p className="text-[13.5px] leading-[1.65] text-ink-muted">
        <span className="font-semibold text-ink">This isn&rsquo;t a model I trained.</span> Speech-to-text is
        Deepgram; notes, retrieval, and sentiment are OpenAI API calls — off-the-shelf services anyone can call.
      </p>
      <p className="mt-3 text-[13.5px] leading-[1.65] text-ink-muted">
        What it demonstrates is composing those commodity models into a real-time product that fills an actual
        need: helping a support agent, live and mid-conversation, before a call goes sideways.
      </p>
      <p className="mt-3 text-[13.5px] leading-[1.65] text-ink-muted">
        The engineering is in the orchestration: a single-WebSocket streaming design; cadence and debouncing so LLM
        calls stay cheap; retrieval thresholds so docs stay quiet until relevant; speaker diarization; sub-second
        transcript-to-alert latency; and a cached replay so the demo is deterministic and free to run.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line">
        <MiniStat value="3" caption="parallel jobs / utterance" />
        <MiniStat value="0.28" caption="cosine retrieval floor" />
      </div>
    </InfoCard>
  );
}
