# Building a real-time call copilot on Railway, Supabase and Deepgram

> Draft for harrisonjansma.com (HAR-265). Move to the site repo
> (`harrisonjansma/harrisonjansma.github.io`) and match the existing post style
> before publishing. Latency numbers + retrieval scores are real (measured on the
> deployed demo). Only remaining placeholder: `{{EMBED_LOOM}}` once the walkthrough
> is recorded.

**Live demo:** https://agentassistdemo.harrisonjansma.com ·
**Code:** https://github.com/harrisonjansma/call-copilot

{{EMBED_LOOM}}

## Why I built this

At Capital One I built a real-time agent-assist system for call-center
servicing: as a customer and agent talk, it transcribes the call, retrieves the
right procedure docs, drafts notes, and flags frustrated callers within about a
second — so a supervisor can step in before a call goes sideways.

That work is proprietary. I can describe it, but a hiring manager can't click it.
So I rebuilt the shape of it in public, solo, over a few weekends, on a hobbyist
stack: a browser page you can talk into that shows a live transcript,
self-drafting notes, RAG-retrieved procedure docs, and a sub-second frustration
alert. Everything below is the public rebuild — the fictional "Acme Support"
version — not Capital One's system.

## Architecture

One design decision drove everything: **a single WebSocket per session carries
both the uplink audio and the downlink results.** No separate audio channel, no
Supabase Realtime subscription for UI updates — one pipe.

```
browser mic ──webm/opus 250ms──▶ Node worker ──▶ Deepgram (streaming ASR)
                                      │
                    each final utterance fans out, in parallel:
                                      ├──▶ LLM ▶ running call notes
                                      ├──▶ pgvector ▶ top-k procedure docs
                                      └──▶ LLM ▶ sentiment ▶ frustration alert
                                      │
                            results ──ws──▶ three-panel UI
```

- **Web:** Next.js 14 + Tailwind. `MediaRecorder` emits 250 ms `webm/opus`
  chunks straight onto the socket.
- **Worker:** Node 20 + `ws`. Relays audio to Deepgram `nova-2` (interim results
  on) and orchestrates the three downstream jobs.
- **Data:** Supabase Postgres + `pgvector`. The worker uses the service role;
  the browser only ever reads the docs corpus through the anon key (RLS enforces
  that).
- **Deploy:** two Railway services from one pnpm monorepo.

The whole thing is ~1,500 lines. The interesting part isn't the LLM calls — it's
the plumbing around them.

## The three hard bits

### 1. Streaming backpressure and the "one pipe" trick

Audio comes in fast and continuously; results go out irregularly. Multiplexing
both on one WebSocket keeps the client trivial — binary frames up, JSON events
down — but it means the worker has to stay responsive while a Deepgram socket,
two LLM calls, and a vector query are all in flight per session. The worker
never blocks on those: transcripts are handled synchronously, and notes / RAG /
sentiment are fired as independent async jobs, each with its own guard rails
(below). If Deepgram drops mid-call, the worker reconnects once, then fails the
session cleanly rather than stranding a half-open socket.

### 2. Debounced LLM orchestration (the part that saves money)

The naive version calls an LLM on every finalized sentence. That's expensive and
produces jittery notes. Instead each job has a cadence policy:

- **Notes** regenerate only when **≥2 new final utterances** have arrived **and**
  ≥5 s have passed since the last run, with **never more than one call in
  flight** per session and a hard cap of 40 regenerations. The prompt is fed the
  *previous* draft plus only the *new* lines — never the whole transcript — so
  cost stays roughly flat as a call gets longer.
- **Retrieval** runs every 3 finals (min 5 s apart) and de-dupes: if the top-k
  doc set hasn't changed, no event is emitted, so the UI doesn't flicker.
- **Sentiment** runs per utterance (the calls are tiny) but the *alert* is rate
  limited to once per 30 s.

That cadence layer is most of the value — it's the difference between a demo that
costs cents and one that costs dollars per call.

### 3. Retrieval thresholds

RAG is only useful if it stays quiet when nothing's relevant. Retrieval embeds a
rolling window of the last ~6 utterances (`text-embedding-3-small`, 1536-d),
does a cosine top-4 against the corpus, and **drops anything below a 0.30
similarity score.** Chatter about the weather surfaces nothing; "I was charged
twice and want a refund" surfaces the refund/double-charge doc within one
retrieval cycle; changing topic to "how do I cancel?" swaps the cards.

I logged every retrieval (returned ids + scores) while building, which is how I
set the threshold. On the double-charge call, the relevant docs land where you'd
want them — *Refunds and Double Charges* at 0.42–0.57, *Chargeback Disputes* at
0.37 — while unrelated procedures sit below 0.30 and never surface. When the
caller pivots to "how do I cancel?", *Cancelling a Subscription* jumps to 0.43
and the cards swap. 0.30 turned out to be the sweet spot: high enough to keep the
panel quiet during small talk, low enough to catch a topic on the first cycle.

## Measured latency

The one that matters for the product is **transcript → sentiment ready**, because
that's what gates the frustration alert. It's measured server-side (Deepgram
final receipt → LLM score returned) and printed on screen each time the alert
fires — not asserted.

| Stage | Result | How measured |
|---|---|---|
| Transcript final → sentiment ready | **~700 ms median** (≈540–1560 ms across ~30 utterances) | server-side timestamp, `gpt-4o-mini` JSON call |
| Frustration alert (end-to-end) | fired at **636–875 ms** on the acted-angry line | same path; shown in the UI |
| Speech → interim transcript | sub-second (Deepgram `nova-2`, interim results on) | qualitative — interims render before the sentence finishes |

The sentiment call is the slow link (a network round-trip to an LLM), and it's
still comfortably sub-second at the median — fast enough that a supervisor gets
pinged while the caller is still talking. The transcript and doc retrieval are
effectively instant by comparison (streaming ASR; a cosine scan over ~12 vectors).

## What I'd do differently at production scale

The demo runs one worker instance with an in-memory rate limiter and results
pushed straight over the WebSocket. That's exactly right for a portfolio piece
and exactly wrong for a call center. At Capital One scale the honest version is:

- **A durable event backbone (Kafka) instead of a socket.** Transcripts and
  derived events become a stream other systems subscribe to — QA, analytics,
  supervisor tooling — not just one browser tab. The demo's "one pipe" is a
  feature *because* it's one tab.
- **Throughput, not latency, is the hard problem.** Sustaining 200+ concurrent
  calls means backpressure, partitioning by call, and graceful degradation when
  a model provider slows down — not just a fast happy path.
- **Regression detection on the models.** Prompts and models drift; you need
  offline eval sets and online guardrails so a "small" prompt change doesn't
  quietly wreck note quality across thousands of calls.

Those are the parts you can't see in a weekend demo — but they're the parts the
job is actually about. The demo is the shape; the scale is the work.

## Stack

Next.js · Node + `ws` · Deepgram `nova-2` · OpenAI `gpt-4o-mini` +
`text-embedding-3-small` · Supabase Postgres/`pgvector` · Railway · Cloudflare.
MIT-licensed, code linked above.
