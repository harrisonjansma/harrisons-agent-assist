---
title: "Amazon Associate Tag Setup"
---

# Amazon Associate Tag Setup

Use this procedure when a creator's Amazon links aren't carrying their associate tag, or they ask how commissions work.

## How it works
When a captured product URL is a real `amazon.com` link, Shopfolio automatically appends the creator's **associate tag** so qualifying purchases are attributed to them. Non-Amazon merchants carry **no** commission — Shopfolio does not mint or inject affiliate links for other retailers.

## Setup
1. In **Settings → Integrations → Amazon**, have the creator paste their Amazon Associates **tracking ID** (the `tag=` value).
2. Save. From then on, new Amazon captures get the tag applied at redirect time on the `/r/<code>` link.

## Troubleshooting
1. **Tag missing on a link:** confirm the tracking ID is saved and the destination is a genuine `amazon.com` URL (shortened `amzn.to` links should be expanded first).
2. **Links captured before the tag was added:** re-save the item to re-apply, or bulk **Re-apply tag** from the library.

## Notes
- Shopfolio takes no cut; the associate relationship is directly between the creator and Amazon.
