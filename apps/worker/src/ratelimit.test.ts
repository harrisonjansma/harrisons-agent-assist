import { test } from "node:test";
import assert from "node:assert/strict";
import { allowSession, hashIp } from "./ratelimit.js";
import { LIMITS } from "@call-copilot/shared";

test("hashIp is stable and non-reversible-looking", () => {
  const a = hashIp("203.0.113.7");
  const b = hashIp("203.0.113.7");
  assert.equal(a, b);
  assert.equal(a.length, 32);
  assert.notEqual(a, "203.0.113.7");
});

test("allows up to the per-hour limit then blocks", () => {
  const ip = hashIp("198.51.100.42"); // unique to this test
  for (let i = 0; i < LIMITS.MAX_SESSIONS_PER_HOUR; i++) {
    assert.equal(allowSession(ip).allowed, true, `session ${i + 1} should be allowed`);
  }
  const blocked = allowSession(ip);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterMs > 0);
});

test("different IPs have independent budgets", () => {
  const a = hashIp("198.51.100.1");
  const b = hashIp("198.51.100.2");
  for (let i = 0; i < LIMITS.MAX_SESSIONS_PER_HOUR; i++) allowSession(a);
  assert.equal(allowSession(a).allowed, false);
  assert.equal(allowSession(b).allowed, true);
});
