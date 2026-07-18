---
title: "Importing from LTK and ShopMy"
---

# Importing from LTK and ShopMy

Use this procedure when a creator wants to bring an existing catalog over from LTK, ShopMy, or a similar tool.

## What's supported
These are **import-only** sources. Shopfolio can pull a creator's existing products and links in as captured items so they can rebuild their storefront here. There is **no live, two-way integration** — we don't sync back, and we don't post to those platforms.

## How to import
1. Export the catalog from the source tool (CSV or the platform's export), or paste the profile/collection URL.
2. In **Library → Import**, choose the source and upload the file or URL. Items come in as drafts through the same `captureLink()` path.
3. Review and fix any items that failed to fetch, then add them to a storefront or post.

## Notes
- Amazon links in the import get the creator's associate tag applied (see *Amazon Associate Tag Setup*); other merchants carry no commission.
- Because it's import-only, disconnecting the source later doesn't remove already-imported items.

## Escalate when
- A large import (1000+ items) stalls partway.
