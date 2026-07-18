---
title: "Connecting Your Pinterest Account"
---

# Connecting Your Pinterest Account

Use this procedure when a creator can't link their Pinterest account, or their connection shows `disconnected` or `expired` on **Settings → Connections**.

## How it works
- Shopfolio connects to Pinterest over OAuth. The creator authorizes us once and we store a refresh token that renews access automatically.
- A connection shows one of `connected`, `expired`, or `disconnected`. Only `connected` allows publishing.

## Steps to connect
1. In **Settings → Connections**, have the creator click **Connect Pinterest** and complete the Pinterest login and consent screen.
2. Confirm they authorize the **business** account, not a personal one — publishing requires a Pinterest business profile.
3. Back on the Connections page, the status should flip to `connected` within a few seconds.

## Common issues
- **`expired`:** the refresh token was revoked (often a Pinterest password change). Have them click **Reconnect**.
- **Consent screen loops:** usually a third-party cookie block — try a non-incognito window.

## Escalate when
- The creator authorized correctly but the status stays `disconnected` for more than 15 minutes.
