import { test } from "node:test";
import assert from "node:assert/strict";
import { FrustrationDetector } from "./sentiment.js";

test("neutral conversation never alerts", () => {
  const d = new FrustrationDetector();
  for (let i = 0; i < 5; i++) {
    assert.equal(d.push({ score: 0.1, label: "neutral" }), false);
  }
});

test("a single 'frustrated' label trips the alert", () => {
  const d = new FrustrationDetector();
  assert.equal(d.push({ score: 0.2, label: "positive" }), false);
  assert.equal(d.push({ score: -0.1, label: "frustrated" }), true);
});

test("rolling mean below -0.4 trips the alert", () => {
  const d = new FrustrationDetector();
  // three clearly-negative scores -> mean < -0.4
  assert.equal(d.push({ score: -0.5, label: "negative" }), true);
});

test("alerts are rate-limited within the 30s cooldown", () => {
  const d = new FrustrationDetector();
  assert.equal(d.push({ score: -0.9, label: "frustrated" }), true); // first fires
  // immediate second trip is suppressed by the cooldown
  assert.equal(d.push({ score: -0.9, label: "frustrated" }), false);
});

test("recovery after negativity does not keep firing", () => {
  const d = new FrustrationDetector();
  d.push({ score: -0.9, label: "frustrated" }); // fires + starts cooldown
  assert.equal(d.push({ score: 0.8, label: "positive" }), false);
  assert.equal(d.push({ score: 0.9, label: "positive" }), false);
});
