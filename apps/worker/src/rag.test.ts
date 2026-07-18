import { test } from "node:test";
import assert from "node:assert/strict";
import { docsKey } from "./rag.js";
import type { DocHit } from "@call-copilot/shared";

const hit = (id: number): DocHit => ({ id, title: `t${id}`, snippet: "", score: 0.5 });

test("docsKey is order-independent (same set => same key)", () => {
  assert.equal(docsKey([hit(3), hit(1), hit(2)]), docsKey([hit(1), hit(2), hit(3)]));
});

test("docsKey differs when the id set changes", () => {
  assert.notEqual(docsKey([hit(1), hit(2)]), docsKey([hit(1), hit(3)]));
});

test("empty result set has a stable empty key", () => {
  assert.equal(docsKey([]), "");
});
