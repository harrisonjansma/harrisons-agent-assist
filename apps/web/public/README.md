# Static assets

- **`og.png`** — 1200×630 social preview card (OpenGraph tags in
  `app/layout.tsx`), so the link unfurls in Slack/LinkedIn/email. Already
  generated; regenerate from `../scripts/og.html` if the copy changes.
- **`robots.txt`** — allow all.
- **`sample-call.ogg`** — a ~90s fictional "Acme Support" refund call (Ogg Opus,
  mono 24 kHz), generated via OpenAI TTS. Wired to the "▶ Play a sample call"
  button, which plays it audibly **and** streams the same bytes through the exact
  same WebSocket pipeline as the live mic (`lib/audio.ts` → `streamSampleFile`),
  paced to the audio playhead. This is the primary recruiter path and the only
  audio a no-mic visitor needs. If it's ever missing, the sample button surfaces
  a friendly "sample file not found" message rather than crashing.
