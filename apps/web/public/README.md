# Static assets

Two binary assets are referenced by the app but must be added manually (they
can't be generated in code review):

- **`sample-call.webm`** — one good ~90s fake support call, recorded as
  `audio/webm;codecs=opus`. Wired to the "▶ Play a sample call" button, which
  streams it through the exact same WebSocket pipeline as the live mic
  (see `lib/audio.ts` → `streamSampleFile`). This is the primary recruiter path
  and the only audio a no-mic visitor needs.
- **`og.png`** — 1200×630 social preview image referenced by the OpenGraph tags
  in `app/layout.tsx`, so the link unfurls in Slack/LinkedIn/email.

Until `sample-call.webm` is added, the sample button will surface a friendly
"sample file not found" error rather than crashing.
