---
title: "Capturing Products with the Extension"
---

# Capturing Products with the Extension

Use this procedure when a creator can't save a product while browsing, or asks how capture works.

## How capture works
Every capture path — the Chrome extension, the PWA share sheet, manual add, CSV import, and user-initiated page snapshots — funnels through a single `captureLink()` entry point. It fetches the page, pulls the title, image, price, and canonical URL, and drops the item into the creator's library as a draft.

## Troubleshooting
1. **"Couldn't read this page":** some merchants block server-side fetches. Have the creator use the **extension** (which reads the page they're already on) or the **snapshot** option rather than pasting a bare URL.
2. **Wrong image or price:** open the item and use **Edit → Re-fetch**, or set the fields manually. Manual edits are never overwritten by a later re-fetch.
3. **Extension not capturing:** confirm it's signed into the same workspace and has permission for the current site; pin it and retry.

## Notes
- Captured items are private drafts until added to a post or storefront.
- Amazon URLs get the creator's associate tag automatically (see *Amazon Associate Tag Setup*).
