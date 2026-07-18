---
title: "Publishing Pins to Pinterest"
---

# Publishing Pins to Pinterest

Use this procedure when a creator's pins don't reach Pinterest — they stay `queued`, flip to `failed`, or appear in Shopfolio but not on the Pinterest board.

## How publishing works
- When a creator publishes, we create a pin job that moves `queued` → `sending` → `published` (or `failed`).
- Each job targets one Pinterest board and includes the image, title, description, and destination link.

## Triage
1. Open **Schedule → Queue** and check the job's status and target board.
2. **Stuck `queued`:** confirm the Pinterest connection is `connected` (see *Connecting Your Pinterest Account*).
3. **`failed`:** open the job to read the reason — common causes are a missing image, a board that was deleted on Pinterest, or a link flagged as spam.

## Common issues
- **Board not found:** the creator renamed or removed the board on Pinterest; have them re-select a valid board and requeue.
- **Image rejected:** Pinterest requires a valid image URL — re-upload the media and retry.

## Escalate when
- Jobs for many creators fail at once with the same Pinterest error (possible API outage).
