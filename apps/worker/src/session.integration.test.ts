import { test } from "node:test";
import assert from "node:assert/strict";
import type { WebSocket } from "ws";
import type { ServerMessage, DocHit } from "@call-copilot/shared";
import { Session, type AsrHandlers, type AsrStream, type SessionDeps } from "./session.js";
import type { SessionStore } from "./store.js";
import type { SentimentResult } from "./sentiment.js";

/** Flush queued microtasks/immediates so the async pipeline settles. */
async function settle(times = 6): Promise<void> {
  for (let i = 0; i < times; i++) await new Promise((r) => setImmediate(r));
}

interface Harness {
  session: Session;
  sent: ServerMessage[];
  feed: (text: string, isFinal?: boolean) => void;
  store: {
    utterances: { id: number; text: string }[];
    notes: string[];
    sentiments: { id: number; score: number }[];
    ended: boolean;
  };
  wsClosed: () => boolean;
}

function makeHarness(): Harness {
  const sent: ServerMessage[] = [];
  let readyState = 1;
  const ws = {
    OPEN: 1,
    get readyState() {
      return readyState;
    },
    send: (s: string) => sent.push(JSON.parse(s) as ServerMessage),
    close: () => {
      readyState = 3;
    },
  } as unknown as WebSocket;

  let asr: AsrHandlers | null = null;
  const store = {
    utterances: [] as { id: number; text: string }[],
    notes: [] as string[],
    sentiments: [] as { id: number; score: number }[],
    ended: false,
  };
  let nextId = 1;

  const fakeStore: SessionStore = {
    async insertUtterance(_sessionId, text) {
      const id = nextId++;
      store.utterances.push({ id, text });
      return id;
    },
    async upsertNotes(_sessionId, markdown) {
      store.notes.push(markdown);
    },
    async updateUtteranceSentiment(id, sentiment) {
      store.sentiments.push({ id, score: sentiment });
    },
    async endSession() {
      store.ended = true;
    },
  };

  const deps: SessionDeps = {
    createAsr: (h: AsrHandlers): AsrStream => {
      asr = h;
      return { send: () => {}, isOpen: () => true, close: () => {} };
    },
    generateNotes: async (_prev, batch) =>
      `**Reason for call**\n- ${batch.join(" | ")}\n**Follow-ups**\n—`,
    retrieveDocs: async (windowText): Promise<DocHit[]> => {
      // topic routing mirrors the real corpus behaviour
      if (/cancel/i.test(windowText)) return [{ id: 2, title: "Cancelling a Subscription", snippet: "", score: 0.61 }];
      if (/charged twice|refund/i.test(windowText)) return [{ id: 1, title: "Refunds and Double Charges", snippet: "", score: 0.55 }];
      return [];
    },
    scoreSentiment: async (_prior, latest): Promise<SentimentResult> =>
      /ridiculous|nobody helps/i.test(latest)
        ? { score: -0.9, label: "frustrated" }
        : { score: 0.1, label: "neutral" },
    // 0ms intervals so we exercise the COUNT thresholds deterministically
    config: { notesMinIntervalMs: 0, ragMinIntervalMs: 0 },
    store: fakeStore,
  };

  const session = new Session("sess-test", ws, deps);

  // Trigger lazy ASR creation the way real audio would, then drive transcripts.
  session.onAudio(Buffer.from([0]));

  return {
    session,
    sent,
    store,
    feed: (text, isFinal = true) => asr?.onTranscript({ text, isFinal, receivedAt: Date.now() }),
    wsClosed: () => (ws.readyState as number) === 3,
  };
}

const only = (sent: ServerMessage[], type: ServerMessage["type"]) => sent.filter((m) => m.type === type);

test("interim transcripts are forwarded but not persisted", async () => {
  const h = makeHarness();
  h.feed("charged tw", false);
  await settle();
  assert.equal(only(h.sent, "transcript.interim").length, 1);
  assert.equal(h.store.utterances.length, 0);
  await h.session.close("test");
});

test("full pipeline: transcript -> notes -> docs -> sentiment", async () => {
  const h = makeHarness();
  h.feed("I was charged twice this month");
  await settle();
  h.feed("and I would like a refund please");
  await settle();
  h.feed("actually how do I cancel my subscription");
  await settle();

  // transcript: 3 finals emitted + persisted
  assert.equal(only(h.sent, "transcript.final").length, 3);
  assert.equal(h.store.utterances.length, 3);

  // notes: ran once >=2 finals arrived
  const notes = only(h.sent, "notes.update");
  assert.ok(notes.length >= 1, "expected a notes.update");
  assert.match((notes[0] as { markdown: string }).markdown, /Reason for call/);
  assert.ok(h.store.notes.length >= 1, "notes persisted");

  // rag: ran once >=3 finals arrived; window mentions cancel -> doc 2
  const docs = only(h.sent, "docs.update");
  assert.ok(docs.length >= 1, "expected a docs.update");
  assert.equal((docs[0] as { docs: DocHit[] }).docs[0]?.id, 2);

  // sentiment: one per final, each with a measured latency, and persisted
  const sent = only(h.sent, "sentiment.update");
  assert.equal(sent.length, 3);
  assert.ok((sent[0] as { latencyMs: number }).latencyMs >= 0);
  assert.equal(h.store.sentiments.length, 3);

  await h.session.close("test");
});

test("a frustrated utterance raises the alert", async () => {
  const h = makeHarness();
  h.feed("this is ridiculous, nobody helps me");
  await settle();
  const alerts = only(h.sent, "alert.frustration");
  assert.equal(alerts.length, 1);
  assert.ok((alerts[0] as { latencyMs: number }).latencyMs >= 0);
  await h.session.close("test");
});

test("close sets ended_at and closes the socket", async () => {
  const h = makeHarness();
  h.feed("hello there");
  await settle();
  await h.session.close("test");
  assert.equal(h.store.ended, true);
  assert.equal(h.wsClosed(), true);
});
