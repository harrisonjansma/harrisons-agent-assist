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

export default function Page() {
  const { state, start, stop } = useCopilot();
  const showAlert = state.alert && Date.now() - state.alert.at < 12_000;

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-9">
      <Header />

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
      </section>

      {state.conn === "error" && state.errorMsg && <ErrorBanner message={state.errorMsg} />}
      {showAlert && state.alert && <FrustrationBanner latencyMs={state.alert.latencyMs} />}

      {/* Three live panels */}
      <div className="grid grid-cols-1 gap-4 md:h-[30rem] md:grid-cols-3">
        <div className="h-[20rem] md:h-full">
          <TranscriptPanel finals={state.finals} interim={state.interim} />
        </div>
        <div className="h-[20rem] md:h-full">
          <NotesPanel notes={state.notes} drafting={state.notesDrafting} />
        </div>
        <div className="h-[20rem] md:h-full">
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
        <p className="text-ink-faint/70">A portfolio project — “Acme Support” data is fictional.</p>
      </footer>
    </main>
  );
}
