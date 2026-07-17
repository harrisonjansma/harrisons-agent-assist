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
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-4 p-4 sm:p-6">
      <Header />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Controls
          conn={state.conn}
          onMic={() => void start("mic")}
          onSample={() => void start("sample")}
          onStop={stop}
        />
        <SentimentGauge score={state.sentimentScore} label={state.sentimentLabel} />
      </div>

      {state.conn === "error" && state.errorMsg && <ErrorBanner message={state.errorMsg} />}
      {showAlert && state.alert && <FrustrationBanner latencyMs={state.alert.latencyMs} />}

      <StatusBar
        conn={state.conn}
        remainingMs={state.remainingMs}
        asrLatencyMs={state.asrLatencyMs}
        sentimentP50Ms={state.sentimentP50Ms}
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 md:grid-cols-3">
        <div className="min-h-[16rem] md:min-h-[28rem]">
          <TranscriptPanel finals={state.finals} interim={state.interim} />
        </div>
        <div className="min-h-[16rem] md:min-h-[28rem]">
          <NotesPanel notes={state.notes} drafting={state.notesDrafting} />
        </div>
        <div className="min-h-[16rem] md:min-h-[28rem]">
          <DocsPanel docs={state.docs} />
        </div>
      </div>

      <HowItWorks />

      <footer className="pb-6 pt-2 text-center text-xs text-slate-400">
        Live demo · <a className="hover:underline" href="https://github.com/harrisonjansma/call-copilot">source on GitHub</a> · a portfolio project, "Acme" data is fictional
      </footer>
    </main>
  );
}
