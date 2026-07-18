# Live Call Copilot — Development Spec

> Source of truth: Linear project **[Live Call Copilot (Portfolio Demo)](https://linear.app/harrison-jansma/project/live-call-copilot-portfolio-demo-323ae5534a8d)** (team `HAR`).
> This document consolidates the project goal, the binding Architecture Decision Record (ADR), the 8 development items (HAR-259 → HAR-266), their build order, and a credential-readiness check against the current environment.
> If this doc and Linear ever disagree, **Linear wins** — treat this as a working mirror.

---

## 1. Goal & framing

Turn Harrison's proprietary Capital One work (real-time agent assist, RAG over live transcripts, ~1s sentiment alerts) into a **public, clickable demo + write-up** that makes the résumé verifiable and lands in the lane of target companies (Cresta, Orum, Level AI, Deepgram, AssemblyAI, LiveKit, Tavus, Vapi).

**The demo:** a browser page where a visitor talks into their mic and sees, live:
1. streaming transcript,
2. an AI panel auto-drafting call notes,
3. procedure docs retrieved mid-conversation via RAG,
4. a sentiment meter that alerts on frustration.

**Timebox:** 3 weekends. Ship rough > polish dead. **Cut scope before cutting the deadline.**

**Deliverables:** live demo at **https://agentassistdemo.harrisonjansma.com** · public repo · 90s Loom · blog post on harrisonjansma.com · links wired into résumé/site/outreach.

**Domain:** the web app is served from the custom domain `agentassistdemo.harrisonjansma.com`; the worker's WebSocket endpoint gets its own subdomain `ws.agentassistdemo.harrisonjansma.com` (WSS). See §3.1 for DNS/domain setup.

---

## 2. Architecture Decision Record (binding for every issue)

| Area | Decision |
|---|---|
| **Repo** | public GitHub `call-copilot`, pnpm monorepo: `apps/web` + `apps/worker` + `packages/shared` (shared TS types) |
| **apps/web** | Next.js 14+ (App Router), TypeScript, Tailwind. **No component library** — keep deps thin |
| **apps/worker** | Node 20 + TypeScript, `ws` WebSocket server, own Railway service. **One WS connection per client** carries both uplink audio and downlink events |
| **ASR** | **Deepgram** streaming WS, model `nova-2`, `interim_results` ON (`smart_format`, `punctuate` ON, webm passthrough) |
| **LLM** | OpenAI `gpt-4o-mini` for notes + sentiment. All calls behind `packages/shared/llm.ts` (`complete(prompt, opts)`, provider-swappable) |
| **Embeddings** | OpenAI `text-embedding-3-small`, **1536 dims** |
| **DB** | Supabase Postgres + pgvector. Worker uses `SUPABASE_SERVICE_ROLE_KEY` (server-side only); web uses anon key read-only. **UI updates flow over the WS, not Supabase Realtime** (single pipe) |
| **Limits** | max session **3 min** (hard cut + UI notice); per-IP **5 sessions/hour** (in-memory map OK); payload cap **32 KB/frame** |

### WS protocol (`packages/shared/protocol.ts`)
- **client → server:** binary audio frames (webm/opus, 250 ms chunks) + JSON `{type:"start"|"stop", sessionId}`
- **server → client (JSON):**
  - `{type:"transcript.interim"|"transcript.final", text, ts}`
  - `{type:"notes.update", markdown}`
  - `{type:"docs.update", docs:[{id,title,snippet,score}]}`
  - `{type:"sentiment.update", score:-1..1, label, latencyMs}`
  - `{type:"alert.frustration", latencyMs}`
  - `{type:"error", code, message}`
  - (+ `{type:"session.started", sessionId}` on connect)

### DB schema (`supabase/migrations/0001_init.sql`)
```sql
sessions(id uuid pk default gen_random_uuid(), started_at timestamptz default now(),
         ended_at timestamptz, ip_hash text)
utterances(id bigint identity pk, session_id uuid fk, ts timestamptz default now(),
           speaker text default 'user', text text, sentiment real)
notes(session_id uuid pk fk, markdown text, updated_at timestamptz)
docs(id bigint identity pk, title text, body text, embedding vector(1536))  -- + ivfflat cosine index
```

---

## 3. Environment variables required by the ADR

| Var | Scope | Purpose | Present in this env? | How to obtain |
|---|---|---|---|---|
| `DEEPGRAM_API_KEY` | worker | streaming ASR | ✅ **in BWS vault** | `BWS_TOKEN` → Bitwarden Secrets Manager |
| `OPENAI_API_KEY` | worker | notes, sentiment, embeddings | ✅ **in BWS vault** | `BWS_TOKEN` → Bitwarden Secrets Manager |
| `SUPABASE_URL` | worker | Postgres/pgvector endpoint | ✅ **provisioned** | `https://ntvwaczcgvzfdvykqnwo.supabase.co` (project `call-copilot`) |
| `SUPABASE_SERVICE_ROLE_KEY` | worker | server-side DB writes | ✅ **provisioned** | Supabase → project `call-copilot` → API settings (service_role) |
| `PORT` | worker | listen port | ✅ injected by Railway | n/a |
| `NEXT_PUBLIC_WS_URL` | web | worker WS endpoint | **❌ set after worker deploy** | `wss://ws.agentassistdemo.harrisonjansma.com/ws` (worker custom domain) |
| `NEXT_PUBLIC_SUPABASE_URL` | web | read-only doc fetch (HAR-262) | ✅ **provisioned** | `https://ntvwaczcgvzfdvykqnwo.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | web | read-only doc fetch (HAR-262) | ✅ **provisioned** | Supabase → project `call-copilot` → API settings (anon) |

> **Supabase bootstrap done (2026-07-17):** project **`call-copilot`** (ref `ntvwaczcgvzfdvykqnwo`, org `Jansma`, region `us-east-1`) created via the Management API; `pgvector` enabled and `supabase/migrations/0001_init.sql` applied (tables `sessions`, `utterances`, `notes`, `docs` + ivfflat cosine index verified). Runtime credentials (URL, service_role, anon, DB password) are stored in the session scratchpad at `supabase-credentials.env` — **not committed** — pending being wired into Railway env + the BWS vault. Non-secret values are also in `.env.example`.

### Credentials already in the environment (useful for bootstrapping)

| Env var | What it unlocks for this project |
|---|---|
| `RAILWAY_PROJECT_TOKEN` | Deploy both Railway services (web + worker) non-interactively (HAR-259 step 6). |
| `SUPABASE_ACCESS_TOKEN` (`sbp_…`) | Supabase **management/CLI** token — create the project, `supabase db push` the migration, and read back the runtime `SUPABASE_URL` + `SERVICE_ROLE_KEY` + anon key. This is the bootstrap path for the four missing Supabase runtime vars. |
| `BWS_TOKEN` | Bitwarden Secrets Manager access token — the likely vault for `DEEPGRAM_API_KEY` / `OPENAI_API_KEY`. Check here **before** assuming those keys must be minted fresh. |
| `RESEND_API_KEY` | Not in the ADR, but useful for HAR-265 outreach emails ("2-minute live demo: <URL>"). |
| `CLOUDFLARE_API_KEY` + `CLOUDFLARE_ACCOUNT` | **Now in scope** — `harrisonjansma.com` DNS is on Cloudflare. Create the `agentassistdemo` + `ws.agentassistdemo` CNAME records pointing at Railway (see §3.1). |

> **Not needed for this project (present but ignore):** `STRIPE_*`, `NOTION_INTEGRATION_TOKEN`, `MEM0_API_KEY`, `FSSPEC_GCS`.

### 3.1 Custom domain setup (`agentassistdemo.harrisonjansma.com`)

The demo runs on a custom subdomain of `harrisonjansma.com` (DNS managed on Cloudflare — `CLOUDFLARE_API_KEY`/`CLOUDFLARE_ACCOUNT` are present in this env).

| Host | Points to | Serves |
|---|---|---|
| `agentassistdemo.harrisonjansma.com` | Railway **web** service | Next.js UI (the recruiter-facing page) |
| `ws.agentassistdemo.harrisonjansma.com` | Railway **worker** service | WebSocket endpoint (`/ws`) + `/healthz` |

Steps (done in HAR-259, step 6):
1. In Railway, add each custom domain to its service (web + worker). Railway returns a target host per domain.
2. In Cloudflare, create a **CNAME** for each subdomain → the Railway target. Start **DNS-only (grey cloud)** so Railway can issue TLS and WSS passes through cleanly; enabling the orange proxy later is optional and needs WebSocket support left on (Cloudflare default).
3. Set web env `NEXT_PUBLIC_WS_URL=wss://ws.agentassistdemo.harrisonjansma.com/ws`.
4. Verify: `https://ws.agentassistdemo.harrisonjansma.com/healthz` → `{ok:true}`, and the UI at the apex demo domain connects over WSS with no mixed-content warnings.

> Alternative if a second subdomain is unwanted: keep the worker on its default `*.up.railway.app` host and point only the web app at the custom domain. The two-subdomain layout above is preferred because the Loom/README read cleaner and there's no third-party host visible in the demo.

**Credential gate before Weekend 1 coding:** ✅ **cleared.** Deepgram + OpenAI keys are in the BWS vault; the Supabase project is provisioned and migrated (§3, note above). The only remaining runtime value is `NEXT_PUBLIC_WS_URL`, which is set after the worker's first Railway deploy (HAR-259).

---

## 3.2 Implementation status (2026-07-18)

The monorepo and full pipeline are **built and pushed** on branch
`claude/linear-dev-items-spec-3y97k8`. `pnpm -r build` is green and `pnpm test`
passes (14 unit tests).

| Item | Code | Verified |
|---|---|---|
| HAR-259 scaffold + deploy skeleton | ✅ | ✅ worker `/healthz` 200, WS session writes `sessions` row w/ `ended_at` against live Supabase |
| HAR-260 mic → Deepgram → transcript | ✅ | ⚠️ code + unit tests; live ASR unverified (see constraint) |
| HAR-261 live notes | ✅ | ⚠️ orchestration built; live LLM unverified |
| HAR-262 RAG pgvector | ✅ | ⚠️ schema + `match_docs` + corpus + seed built; embeddings unrun |
| HAR-263 sentiment + alert | ✅ | ✅ `FrustrationDetector` unit-tested; live LLM unverified |
| HAR-264 sample-call + hardening | ✅ | ⚠️ rate-limit unit-tested; `sample-call.webm` asset still needed |
| HAR-265 launch (Loom/blog/links) | ⛔ not started | — |
| HAR-266 LiveKit stretch | ⛔ not started | — |

**Blocking constraint — this sandbox cannot reach Deepgram/OpenAI keys.** The
keys live in BWS, but this environment's egress policy blocks the Bitwarden host
(`CONNECT tunnel failed, 403` to `identity.bitwarden.com`), so the corpus could
not be seeded and the LLM/ASR paths could not be exercised here. This is a
sandbox limitation only — on Railway the worker reaches those APIs normally.
**Remaining to go live:** (1) seed the corpus (`pnpm seed` with `OPENAI_API_KEY`),
(2) add `apps/web/public/sample-call.webm`, (3) create the two Railway services +
Cloudflare DNS (§3.1), (4) smoke-test the full flow, then HAR-265.

## 4. Development items

Ordered by dependency. IDs link to Linear. **Priority:** 🔴 High · 🟡 Medium.

### Milestone — Weekend 1: Mic → live transcript

#### HAR-259 · Scaffold repo + deploy skeleton 🔴
*Stand up the monorepo and deploy both apps to Railway on day one, so deploys are never the blocker.*
- pnpm workspace (`apps/web`, `apps/worker`, `packages/shared`); root config, `.nvmrc` (Node 20), MIT license, README stub w/ arch-diagram placeholder.
- `packages/shared`: `protocol.ts` (WS types verbatim from ADR), `llm.ts` (`complete(prompt, {json?, maxTokens?})` on `gpt-4o-mini`), `db.ts` (Supabase server client factory).
- `apps/worker`: Node 20 + TS + `ws`; `GET /healthz` → `{ok:true, uptime}`; WS at `/ws`; on connect create `sessions` row + echo `session.started`; `stop` → set `ended_at`; pino logging.
- `apps/web`: App Router + Tailwind; single `/` page, three-panel stub (Transcript · Notes · Docs) + status bar; Connect/disconnect wired to WS.
- Supabase: enable pgvector, run `0001_init.sql` (all 4 tables + ivfflat cosine index).
- Railway: two services deployed & public; attach custom domains per §3.1 (`agentassistdemo.harrisonjansma.com` → web, `ws.agentassistdemo.harrisonjansma.com` → worker) with Cloudflare CNAMEs; URLs in README.
- **Exit:** `pnpm install && pnpm -r build` clean from fresh clone; `/healthz` 200 in prod; Connect opens WS + writes a `sessions` row; migration applies with just `supabase db push`.

#### HAR-260 · Mic capture → streaming ASR → live transcript 🔴  *(depends on 259)*
- **Web:** `getUserMedia` → `MediaRecorder('audio/webm;codecs=opus').start(250)` → binary WS frames; friendly mic-denied message (no crash); Stop button + auto-stop at 3:00 with countdown from 2:30.
- **Worker:** on first audio frame open Deepgram WS (`nova-2`, `interim_results`, `smart_format`, `punctuate`, webm passthrough); pipe frames; map responses → `transcript.interim`/`transcript.final`; insert each final into `utterances`.
- One reconnect attempt on Deepgram drop; else `{error, code:"asr_unavailable"}` + graceful end.
- Transcript panel: interim = gray/italic replaced in place by black finals; bottom-pinned auto-scroll.
- Rolling "ASR latency: X ms" in status bar (method documented in code).
- **Weekend 1 exit:** a stranger with the URL sees their own words appear live.

### Milestone — Weekend 2: Copilot brain

#### HAR-261 · Live note-drafting panel 🔴  *(depends on 260)*
- **Trigger:** per-session buffer of finals; regenerate when ≥2 new finals **and** ≥5s since last run; never >1 in-flight LLM call/session.
- **Prompt** (`apps/worker/src/prompts/notes.ts`): maintain markdown with sections **Reason for call · Key details · Actions taken · Follow-ups**; update the existing draft (don't restart); terse bullets; `—` for empty sections. Inputs = previous draft + new utterances only (token discipline).
- Emit `notes.update`; upsert `notes`. Web panel renders markdown, flashes on update, shows "drafting…" spinner.
- Cost guard: ≤40 regenerations/session, then "notes finalized".
- **Exit:** a fake double-charge call yields sensible section notes within ~10s that evolve; never regress to empty; ≤1 concurrent LLM call (verify via logs).

#### HAR-262 · RAG: pgvector store + mid-call doc retrieval 🔴  *(depends on 260; parallel with 261)*
- **Corpus:** 12–15 fake "Acme Support" procedure docs (300–500 words) in `supabase/seed/docs/*.md` (refunds/double-charge, cancellation, password reset, shipping delay, damaged item, plan change, chargeback, GDPR deletion, promo-code, invoices, warranty, escalation). Front-matter `title`.
- **`pnpm seed`:** embed each body (one batch call), upsert into `docs` (idempotent on title).
- **Retrieval loop (worker):** every 3 finals & ≤ every 5s, embed rolling last ~6 utterances → cosine top-4 with score ≥ 0.30 → `docs.update` (`{id,title,snippet(200ch),score}`); dedupe when top-4 id set is unchanged.
- Web Docs panel: cards w/ title, snippet, score bar; animate changes; click expands full body via a small anon-key read-only API route.
- Log every retrieval (window hash, ids, scores) — feeds the blog post.
- **Weekend 2 exit:** notes panel **and** doc cards both updating live during one continuous spoken conversation on the deployed URL.

### Milestone — Weekend 3: Sentiment, polish, launch

#### HAR-263 · Sentiment meter + frustration alert (~1s) 🔴  *(depends on 260)*
- **Scoring:** on every final, one `gpt-4o-mini` JSON call → `{score:-1..1, label:"positive"|"neutral"|"negative"|"frustrated"}` (prompt in `sentiment.ts`, include 2 prior utterances). Fire-and-forget; write `sentiment` onto the `utterances` row.
- **Latency:** `latencyMs` = Deepgram final-receipt → sentiment ready; emit in every `sentiment.update`.
- **Alert rule:** rolling mean of last 3 < −0.4 **or** any single `frustrated` → `alert.frustration`, max once per 30s.
- Web: animated −1→1 gauge; red banner "⚠ Frustration detected — a supervisor would be pinged now" with measured latency ("detected in 840 ms"); status bar shows rolling p50 sentiment latency.
- "How this works" collapsible footer: 3 plain sentences + tiny arch diagram (recruiter-facing).
- **Exit:** calm ≈ neutral; acted-angry line moves gauge negative + fires banner in ~1–2s; latency measured (not hardcoded); ≤1 alert/30s; `utterances.sentiment` populated.

#### HAR-264 · Polish + demo hardening 🟡  *(depends on 261, 262, 263)*
- **"Play a sample call" mode (critical):** ship one good 90s fake call as `apps/web/public/sample-call.webm`; a button streams it through the exact same WS pipeline (client chunks it 250 ms; **zero server special-casing**). This is what most recruiters click.
- Rate limiting per ADR (5/hr/IP hashed, 3 min/session, polite WS limit error).
- Error/empty states (mic denied, WS down "demo is asleep — try again in 30s", ASR/LLM mid-call failure) — no raw stack traces.
- Mobile single-column; sample-call path must work on iOS Safari (avoids mic entirely).
- Light visual pass; header with project name + "built by Harrison Jansma" + GitHub + harrisonjansma.com. No dark mode.
- `robots.txt` allow; OG meta tags so the link unfurls in email/LinkedIn/Slack.
- **Exit:** incognito, no mic → "Play a sample call" gives the full experience end-to-end; works on a phone; 6th session/hr/IP gets the limit message; killing the worker mid-session leaves a recoverable, explained UI; link preview card renders.

#### HAR-265 · Launch: Loom + blog post + wire links 🔴  *(depends on 264)*
- **Loom (≤90s, scripted):** cold open on live demo running the sample call → transcript → notes → doc cards swapping → frustration alert w/ on-screen latency → one architecture sentence + "code on GitHub, write-up on my site." No slides.
- **Blog post** (harrisonjansma.github.io, match site style): "Building a real-time call copilot on Railway, Supabase and Deepgram" — why → arch diagram → 3 hard bits (streaming backpressure, debounced LLM orchestration, retrieval thresholds w/ the logged data from HAR-262) → measured latency table → honest production-scale tradeoffs mapped to the Capital One version (Kafka, 200+ TPS, regression detection). 1,200–1,800 words; embed Loom.
- **README** = technical front door: hero GIF, arch diagram (mermaid), quickstart, env table, "why I built this" → blog link.
- **Wire links:** résumé Selected Projects (Call Copilot above LinkLayer; update `_sample/resume.md` + regen PDF); site homepage card; outreach templates include the demo URL line.
- Update Linear: paste final URLs (demo/repo/Loom/post) as a comment; add demo URL to Job Hunt hotlist header.
- **Exit:** all four URLs live and cross-linked; résumé bank + PDF carry one quantified line; a stranger can go link → demo → repo → blog with no dead end; next recruiter email includes the demo link.

#### HAR-266 · Stretch: LiveKit Agents integration + upstream Issue/PR 🟡  *(do NOT start until 265 is done)*
- Branch `livekit-transport`: replace the raw browser-WS audio path with **LiveKit Agents (Python)** on LiveKit Cloud free tier — agent worker subscribes to the room audio track, runs the same Deepgram → notes/RAG/sentiment pipeline, publishes results via data channels. Keep the Node worker on `main`; this is a parallel implementation, not a rewrite.
- README on the branch: measured WS-vs-LiveKit comparison (latency, reconnection, DX) — this comparison *is* the credibility artifact.
- File ≥1 thoughtful GitHub Issue (or small PR) on `livekit/agents` from real friction — maintainer-grade, not drive-by.
- Only after it has substance, reference it in the LiveKit application (HAR-243).

---

## 5. Build order (critical path)

```
HAR-259 (scaffold + deploy)
        │
        ▼
HAR-260 (mic → ASR → transcript)        ◄── Weekend 1 exit
        │
        ├─────────────┬──────────────┐
        ▼             ▼              ▼
   HAR-261        HAR-262        HAR-263
   (notes)        (RAG)         (sentiment)   ◄── 261+262 = Weekend 2 exit
        └─────────────┴──────────────┘
                      │
                      ▼
                 HAR-264 (polish + sample-call)
                      │
                      ▼
                 HAR-265 (Loom + blog + links)   ◄── ship
                      │
                      ▼
                 HAR-266 (LiveKit stretch)       ◄── post-ship
```

HAR-261, HAR-262, and HAR-263 all depend only on HAR-260 and can be built in parallel; they share the worker's per-session final-utterance buffer, so land that buffer once (in 261 or 262) and reuse it.

---

## 6. Scope discipline

Fixed timebox, 3 weekends. When behind, cut in this order (least → most protected):
1. HAR-266 (already post-ship stretch)
2. Mobile polish / OG niceties in HAR-264 (keep the sample-call button — it's the recruiter path)
3. RAG corpus breadth (10 docs instead of 15)

**Never cut:** the deployed URL, the sample-call button, and the launch links (HAR-265). A build nobody can click doesn't count.
