# Launch assets (HAR-265)

Copy-paste-ready text for the pieces that live in other repos/tools. Live demo:
**https://agentassistdemo.harrisonjansma.com** · Code:
**https://github.com/harrisonjansma/harrisons-agent-assist**

---

## Résumé — Selected Projects entry (place above LinkLayer)

> **Live Call Copilot** — real-time agent-assist demo. Solo build:
> Next.js + Node/WebSockets, Deepgram streaming ASR, `gpt-4o-mini`,
> Supabase/pgvector, deployed on Railway. Streams a live transcript, drafts
> call notes, retrieves procedure docs via RAG, and fires a **sub-second
> (~700 ms median) frustration alert** — a public rebuild of the Capital One
> agent-assist system. [live demo] · [code]

One-line variant for a tighter résumé:

> **Live Call Copilot** — real-time call-center copilot (streaming ASR → live
> notes + RAG + ~700 ms sentiment alerts); Next.js/Node/Deepgram/pgvector on
> Railway. [demo] · [code]

---

## Outreach — line for recruiter emails

> 2-minute live demo of a real-time call copilot I built solo — streaming
> transcript, live RAG over procedure docs, and sub-second frustration alerts:
> https://agentassistdemo.harrisonjansma.com (code + write-up linked on the page).

---

## Site homepage — project card

**Title:** Live Call Copilot
**Blurb:** A real-time agent-assist demo — talk into your mic and watch a live
transcript, self-drafting notes, RAG-retrieved procedure docs, and a
sub-second frustration alert. Built solo (Next.js, Deepgram, pgvector, Railway).
**Links:** Live demo → agentassistdemo.harrisonjansma.com · Code → GitHub · Write-up → blog post

---

## Loom script (≤90s, no slides, screen only)

- **0:00** — cold open on the live demo already running the sample call:
  "This is a real-time call copilot I built solo on Railway and Supabase."
- **0:15** — point at the transcript streaming in (a Shopfolio storefront-down call).
- **0:30** — notes drafting themselves in the middle panel.
- **0:45** — doc cards swapping as the caller changes topic (SSL/domain → stuck publish queue).
- **1:00** — the frustration alert firing, with the on-screen latency number.
- Note: the sample call is a cached replay of one real pipeline run (deterministic,
  free to re-watch); demo the microphone briefly for the fully-live path.
- **1:15** — one architecture sentence: "browser → WebSocket → Deepgram, fanned
  out to an LLM, pgvector, and a second LLM — all in about a second." Then:
  "Code's on GitHub, full write-up on my site." End.

Record it on the **Railway URL** if the custom domain is ever mid-verification:
https://call-copilotweb-production.up.railway.app

---

## Status checklist

- [x] Live demo deployed + verified end-to-end (all five panels)
- [x] Public repo
- [x] Blog draft written (`docs/blog-draft.md`, real latency numbers filled)
- [ ] Loom recorded + embedded in blog
- [ ] Blog published to harrisonjansma.github.io
- [ ] Résumé entry added (content bank + regenerated PDF)
- [ ] Site homepage card + outreach template updated
