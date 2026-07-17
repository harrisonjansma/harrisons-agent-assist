---
title: "Password Reset and Login Trouble"
---

# Password Reset and Login Trouble

Use this when a customer cannot log in, forgot their password, or isn't receiving the reset email.

## Standard reset
1. Direct the customer to the **Forgot password?** link on the login page.
2. They enter their account email and receive a reset link valid for 60 minutes.
3. The link is single-use. If they click an old link, have them request a fresh one.

## Not receiving the email
- Confirm they're checking the same address that's on the account (typos and alternate emails are the usual cause).
- Ask them to check spam/junk and to allowlist `no-reply@acme.example`.
- Corporate mail filters sometimes delay delivery by several minutes.
- If nothing arrives after 15 minutes, resend from **Admin → Users → Send reset** after verifying identity.

## Verify identity before manual action
Before resetting on the customer's behalf, confirm at least two of: account email, last 4 digits of the payment card, or the approximate account creation date.

## Two-factor issues
- If the customer lost their 2FA device, verify identity as above, then disable 2FA from **Admin → Users → Security**. Advise them to re-enroll immediately.
- Never read back or accept a full 2FA backup code over chat; have them enter it themselves.

## Account locked
- Five failed attempts trigger a 15-minute lockout. This clears on its own; you can also clear it from **Admin → Users → Unlock**.

## Escalate when
- The customer suspects the account was taken over (unexpected password change, unknown logins). Treat as security — see the Escalation Policy.
