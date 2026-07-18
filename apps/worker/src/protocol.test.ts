import { test } from "node:test";
import assert from "node:assert/strict";
import { parseServerMessage } from "@call-copilot/shared";

test("parses a valid server message", () => {
  const msg = parseServerMessage(JSON.stringify({ type: "transcript.final", text: "hi", ts: 1 }));
  assert.equal(msg?.type, "transcript.final");
});

test("returns null on malformed JSON", () => {
  assert.equal(parseServerMessage("{not json"), null);
});

test("returns null when 'type' is missing", () => {
  assert.equal(parseServerMessage(JSON.stringify({ text: "no type" })), null);
});
