"use client";

import { useCopilot } from "../lib/useCopilot";
import { TopRail } from "../components/TopRail";
import { Hero } from "../components/Hero";
import { Telemetry } from "../components/Telemetry";
import { TransportRow } from "../components/TransportRow";
import { ErrorBanner } from "../components/Controls";
import { TranscriptPanel } from "../components/TranscriptPanel";
import { NotesPanel } from "../components/NotesPanel";
import { DocsPanel } from "../components/DocsPanel";
import { FrustrationBanner } from "../components/SentimentMeter";
import { HowItWorks } from "../components/HowItWorks";
import { WhatThisShows } from "../components/WhatThisShows";
import { Disclaimer } from "../components/Disclaimer";
import { RolePlay } from "../components/RolePlay";

export default function Page() {
  const { state, start, stop, pause, resume, restart } = useCopilot();
  // The alert is a persistent notification once the first one fires (it stays
  // for the session so the timestamp remains visible); it resets on a new call.
  const showAlert = state.alert !== null;

  return (
    <main className="mx-auto flex min-h-screen max-w-[1340px] flex-col gap-[18px] px-4 pb-14 pt-[22px] sm:px-7">
      <TopRail conn={state.conn} />

      <Hero
        conn={state.conn}
        mode={state.mode}
        asrLatencyMs={state.asrLatencyMs}
        sentimentP50Ms={state.sentimentP50Ms}
        onMic={() => void start("mic")}
        onSample={() => void start("sample")}
        onStop={stop}
      />

      <Telemetry
        asrLatencyMs={state.asrLatencyMs}
        notesRev={state.notesRev}
        docHits={state.docHits}
        sentimentLatencyMs={state.sentimentLatencyMs}
      />

      {state.conn === "error" && state.errorMsg && <ErrorBanner message={state.errorMsg} />}

      {/* Console: one transport row over the three live panels. */}
      <section className="rounded-[18px] border border-line bg-white/90 p-4 shadow-[var(--shadow-console)]">
        <TransportRow
          conn={state.conn}
          mode={state.mode}
          paused={state.paused}
          elapsedMs={state.elapsedMs}
          durationMs={state.durationMs}
          remainingMs={state.remainingMs}
          sentimentScore={state.sentimentScore}
          sentimentLabel={state.sentimentLabel}
          onPause={pause}
          onResume={resume}
          onRestart={restart}
        />

        {showAlert && state.alert && (
          <FrustrationBanner
            at={state.alert.at}
            latencyMs={state.alert.latencyMs}
            additionalCount={state.alert.additionalCount}
          />
        )}

        {/* Each column gets an explicit height so the panels' internal scroll
            clips content — relying on h-full through an auto-sized grid row lets
            tall panels overflow and paint over the card below. */}
        <div className="grid grid-cols-1 gap-3.5 wide:grid-cols-[1.15fr_1fr_1fr]">
          <div className="h-[20rem] wide:h-[31rem]">
            <TranscriptPanel
              finals={state.finals}
              interim={state.interim}
              interimSpeaker={state.interimSpeaker}
              interimAtMs={state.interimAtMs}
            />
          </div>
          <div className="h-[20rem] wide:h-[31rem]">
            <NotesPanel notes={state.notes} rev={state.notesRev} drafting={state.notesDrafting} />
          </div>
          <div className="h-[20rem] wide:h-[31rem]">
            <DocsPanel docs={state.docs} />
          </div>
        </div>

        {state.mode === "sample" && (
          <p className="a-rise mt-3.5 flex items-start gap-2 px-1 text-[11.5px] leading-relaxed text-ink-faint">
            <span className="mt-px inline-flex shrink-0 items-center rounded border border-line bg-surface px-1.5 font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink-muted">
              cached
            </span>
            <span>
              This sample call is a <span className="text-ink-muted">recorded replay</span> of one real run of this
              pipeline — the transcript, notes, docs, and sentiment were computed once and cached, so replaying it
              is deterministic and doesn&rsquo;t re-hit Deepgram or the LLMs (keeping the demo free and instant).{" "}
              <span className="text-ink-muted">Use your microphone</span> for a fully live session.
            </span>
          </p>
        )}
      </section>

      {state.mode === "mic" && (state.conn === "connecting" || state.conn === "live") && <RolePlay />}

      <section className="grid grid-cols-1 gap-4 wide:grid-cols-[1.05fr_0.95fr]">
        <HowItWorks />
        <WhatThisShows />
      </section>

      <Disclaimer />

      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-4 text-xs text-ink-faint">
        <p>
          Built by{" "}
          <a className="text-ink-muted hover:text-ink" href="https://harrisonjansma.com">
            Harrison Jansma
          </a>{" "}
          ·{" "}
          <a
            className="text-ink-muted hover:text-ink"
            href="https://github.com/harrisonjansma/harrisons-agent-assist"
          >
            source on GitHub
          </a>{" "}
          · pair-programmed with{" "}
          <a className="text-ink-muted hover:text-ink" href="https://claude.com/claude-code">
            Claude Code
          </a>
        </p>
        <p className="font-mono text-[10.5px] tracking-[0.1em]">
          FICTIONAL SAMPLE DATA · agentassistdemo.harrisonjansma.com
        </p>
      </footer>
    </main>
  );
}
