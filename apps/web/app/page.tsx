"use client";

import { useCopilot } from "../lib/useCopilot";
import { Header } from "../components/Header";
import { StatusBar } from "../components/StatusBar";
import { Controls, ErrorBanner } from "../components/Controls";
import { TranscriptPanel } from "../components/TranscriptPanel";
import { NotesPanel } from "../components/NotesPanel";
import { DocsPanel } from "../components/DocsPanel";
import { SentimentGauge, FrustrationBanner } from "../components/SentimentGauge";
import { HowItWorks } from "../components/HowItWorks";
import { Disclaimer } from "../components/Disclaimer";
import { RolePlay } from "../components/RolePlay";

export default function Page() {
  const { state, start, stop } = useCopilot();
  const showAlert = state.alert && Date.now() - state.alert.at < 12_000;

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-9">
      <Header />

      <Disclaimer />

      {/* Console: controls + gauge + live stats in one frame */}
      <section className="card animate-rise p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Controls
            conn={state.conn}
            onMic={() => void start("mic")}
            onSample={() => void start("sample")}
            onStop={stop}
          />
          <SentimentGauge score={state.sentimentScore} label={state.sentimentLabel} />
        </div>
        <div className="mt-4 border-t border-[var(--line)] pt-3">
          <StatusBar
            conn={state.conn}
            remainingMs={state.remainingMs}
            asrLatencyMs={state.asrLatencyMs}
            sentimentP50Ms={state.sentimentP50Ms}
          />
        </div>
        {state.mode === "sample" && (
          <p className="animate-rise mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-ink-faint">
            <span className="mt-[1px] inline-flex shrink-0 items-center rounded border border-[var(--line)] bg-[var(--surface)] px-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
              cached
            </span>
            <span>
              This sample call is a <span className="text-ink-muted">recorded replay</span> of one real run
              of this pipeline — the transcript, notes, docs, and sentiment were computed once and cached, so
              replaying it is deterministic and doesn&rsquo;t re-hit Deepgram or the LLMs (keeping the demo
              free and instant). <span className="text-ink-muted">Use your microphone</span> for a fully live
              session.
            </span>
          </p>
        )}
      </section>

      {state.mode === "mic" && (state.conn === "connecting" || state.conn === "live") && <RolePlay />}

      {state.conn === "error" && state.errorMsg && <ErrorBanner message={state.errorMsg} />}
      {showAlert && state.alert && <FrustrationBanner latencyMs={state.alert.latencyMs} />}

      {/* Three live panels. Each column gets an explicit height so the panels'
          internal scroll clips content — relying on h-full through an auto-sized
          grid row lets tall panels overflow and paint over the card below. */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="h-[20rem] md:h-[30rem]">
          <TranscriptPanel finals={state.finals} interim={state.interim} interimSpeaker={state.interimSpeaker} />
        </div>
        <div className="h-[20rem] md:h-[30rem]">
          <NotesPanel notes={state.notes} drafting={state.notesDrafting} />
        </div>
        <div className="h-[20rem] md:h-[30rem]">
          <DocsPanel docs={state.docs} />
        </div>
      </div>

      <HowItWorks />

      <footer className="mt-2 flex flex-col items-center gap-1 pb-6 pt-2 text-center text-xs text-ink-faint">
        <p>
          Built by{" "}
          <a className="text-ink-muted hover:text-ink" href="https://harrisonjansma.com">
            Harrison Jansma
          </a>{" "}
          ·{" "}
          <a className="hover:text-ink-muted" href="https://github.com/harrisonjansma/call-copilot">
            source on GitHub
          </a>
        </p>
        <p className="text-ink-faint/70">
          A portfolio project — the sample call is a fictional Shopfolio support session.
        </p>
      </footer>
    </main>
  );
}
