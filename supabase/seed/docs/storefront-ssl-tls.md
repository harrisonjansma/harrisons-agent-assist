---
title: "Storefront SSL / TLS Certificate Issues"
---

# Storefront SSL / TLS Certificate Issues

Use this procedure when a creator's custom-domain storefront shows a **"your connection is not secure"** warning, a certificate error, or the certificate is **stuck pending / never goes active** even though DNS is verified.

## What's happening
When a custom domain is connected, Shopfolio requests a TLS certificate automatically. Issuance needs an unobstructed HTTP validation over the domain. If validation is blocked, the domain resolves but has no valid certificate, so browsers show the "not secure" warning and the page won't load.

## Fix the most common cause: a CAA record
1. Open **Storefront → Domains** and confirm the domain reads `verifying` with the certificate marked **pending**.
2. Ask the creator to check their DNS for a **CAA** record. A CAA that only authorizes another certificate authority will silently block our issuer.
3. Have them either remove the CAA record or add one authorizing our issuing CA (shown on the domain page). Certificates usually finish provisioning within 15–30 minutes after DNS updates.

## Other causes
- **Proxied CNAME:** if the record is proxied (Cloudflare orange cloud) on the creator's side, HTTP validation never reaches us. Set the record to **DNS only**.
- **Certificate stuck over an hour with no CAA and an unproxied record:** force a re-issue from **Storefront → Domains → Retry certificate**, then re-check.

## What to tell the creator
- Confirm the storefront will show the warning until the certificate reaches `active` — this is a validation step, not a hack or breach.
- Give the 15–30 minute window after the DNS change and offer to follow up.

## Escalate when
- The certificate is still pending 2+ hours after CAA is corrected and the record is unproxied.
- The creator reports the warning only on some networks (possible captive portal / corporate MITM, not a Shopfolio issue).
