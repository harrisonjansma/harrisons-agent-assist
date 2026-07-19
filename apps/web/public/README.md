# Static assets

- **`favicon.svg`** — the waveform mark shown in the browser tab.
- **`harrison.png`** — headshot shown in the header.
- **`og.png`** — 1200×630 social preview card (OpenGraph tags in
  `app/layout.tsx`), so the link unfurls in Slack/LinkedIn/email.
- **`robots.txt`** — allow all.
- **`sample-call.wav`** — a ~100s fictional **two-voice** Shopfolio support call
  (agent ↔ customer), recorded and stored as PCM WAV (mono 24 kHz) so it plays in
  every browser. Played audibly when a visitor clicks "▶ Play a sample call".
- **`sample-replay.json`** — the cached, timed events for that call: a
  speaker-labelled transcript plus the drafting notes, retrieved doc cards, and
  sentiment/alert updates, each keyed to a playback timestamp. Sample mode
  (`lib/audio.ts` → `replaySample`) plays the audio and re-emits these events on
  their original cadence — no WebSocket, no Deepgram, no LLM calls — so the sample
  is deterministic, instant, and free to replay. The live mic path is unaffected;
  it runs the full pipeline in real time.
