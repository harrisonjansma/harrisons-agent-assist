---
title: "Connecting a Custom Domain"
---

# Connecting a Custom Domain

Use this procedure when a creator wants their storefront to serve on their own domain (for example `shop.theirhandle.com`) instead of the default `*.shopfolio.app` subdomain.

## How it works
- Shopfolio serves custom domains behind Cloudflare. The creator points a **CNAME** record at us and we issue and renew the TLS certificate automatically.
- A domain moves through three states on **Storefront → Domains**: `DNS pending` → `verifying` → `active`. Only `active` serves traffic.

## Steps to connect
1. In **Storefront → Domains**, have the creator add their domain and copy the target host we show them.
2. At their DNS provider, add a **CNAME** for the subdomain (e.g. `shop`) pointing to that target. Apex/root domains must use a provider that supports CNAME flattening or an ALIAS record.
3. Wait for propagation. `DNS pending` clears once we can resolve the CNAME — usually minutes, up to an hour depending on their TTL.

## Common issues
- **Stuck on `DNS pending`:** the CNAME is missing, points at the wrong host, or is proxied. If they use Cloudflare as their own DNS, the record must be set to **DNS only (grey cloud)**, not proxied.
- **Domain shows `verifying` for a long time:** DNS resolves but the certificate hasn't issued yet — see the *Storefront SSL / TLS Certificate Issues* procedure.

## Escalate when
- The domain is an apex the provider can't flatten.
- The creator previously hosted the domain elsewhere with HSTS preloading.
