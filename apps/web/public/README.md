# Static assets

- **`og.png`** — 1200×630 social preview card (OpenGraph tags in
  `app/layout.tsx`), so the link unfurls in Slack/LinkedIn/email. Already
  generated; regenerate from `../scripts/og.html` if the copy changes.
- **`robots.txt`** — allow all.
- **`sample-call.webm`** — ⚠️ **must be added manually.** One good ~90s fake
  support call, recorded as `audio/webm;codecs=opus`. Wired to the "▶ Play a
  sample call" button, which streams it through the exact same WebSocket
  pipeline as the live mic (`lib/audio.ts` → `streamSampleFile`). This is the
  primary recruiter path and the only audio a no-mic visitor needs. It can't be
  generated in code — it needs a real recorded voice. Until it's added, the
  sample button surfaces a friendly "sample file not found" message rather than
  crashing.
