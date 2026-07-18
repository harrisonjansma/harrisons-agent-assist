# Static assets

- **`og.png`** — 1200×630 social preview card (OpenGraph tags in
  `app/layout.tsx`), so the link unfurls in Slack/LinkedIn/email. Already
  generated; regenerate from `../scripts/og.html` if the copy changes.
- **`robots.txt`** — allow all.
- **`sample-call.ogg`** — a ~70s fictional Shopfolio support call (Ogg Opus,
  mono 24 kHz), generated via OpenAI TTS. Played audibly when a visitor clicks
  "▶ Play a sample call".
- **`sample-replay.json`** — the cached pipeline output for that call. The audio
  was run through the real worker/Deepgram/LLM pipeline **once** (see
  `scripts/capture-replay.mjs`) and every event — transcript, notes, doc hits,
  sentiment, alert — was recorded with its playback timestamp. Sample mode
  (`lib/audio.ts` → `replaySample`) plays the audio and re-emits these events on
  their original cadence: no WebSocket, no Deepgram, no LLM calls, so it's
  deterministic and free. Regenerate both assets together via the temp worker
  endpoints + capture script if the script or corpus changes. The live mic path
  is unaffected — it still runs the full pipeline in real time.
