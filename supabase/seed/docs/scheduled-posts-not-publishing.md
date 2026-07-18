---
title: "Scheduled Posts Not Publishing"
---

# Scheduled Posts Not Publishing

Use this procedure when a creator's scheduled posts **don't go out** — they stay marked `pending` or `queued` past their scheduled time, or flip to `failed`.

## How publishing works
Scheduled posts are written to a `publish_jobs` queue that a background worker polls. Each job moves `pending` → `processing` → `published` (or `failed` with a reason). The direct IG / Pinterest API connectors are **feature-flagged off** pending platform app review, so the v1 path is a **prepared-post hand-off**: at the scheduled time Shopfolio prepares the post and notifies the creator to confirm the publish.

## Triage
1. Open **Schedule → Queue** and check the job's status and `scheduled_for` time. Confirm it's actually in the past in the creator's timezone (a wrong workspace timezone is the most common false alarm).
2. **Stuck `pending` past its time:** the prepared-post hand-off notification was likely missed. Have the creator open the queue item and tap **Publish now** to complete the hand-off. Direct auto-publish stays disabled until the connectors clear review.
3. **`failed`:** open the job to read the failure reason (expired media URL, removed product, or a captured link that 404s). Re-capture or fix the item and requeue.

## What to tell the creator
- Explain that v1 uses a confirm-to-publish hand-off, not silent auto-posting to the network — so nothing posts to their audience without them.
- Offer to requeue the affected posts and confirm the next scheduled batch.

## Escalate when
- Many creators' jobs are stuck simultaneously (possible worker/queue outage).
- A job shows `processing` for more than 15 minutes (a stalled worker lease).
