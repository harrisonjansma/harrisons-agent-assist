/**
 * Provider-agnostic LLM wrapper. Everything the worker needs from an LLM goes
 * through `complete()` and `embed()` so the provider can be swapped in one file
 * (see ADR). Backed by OpenAI: gpt-4o-mini for text, text-embedding-3-small for
 * embeddings (1536 dims).
 */
import OpenAI from "openai";

let _client: OpenAI | null = null;

function client(): OpenAI {
  if (!_client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
    _client = new OpenAI({ apiKey });
  }
  return _client;
}

export const MODEL = "gpt-4o-mini";
export const EMBED_MODEL = "text-embedding-3-small";
export const EMBED_DIMS = 1536;

export interface CompleteOpts {
  /** request JSON output (response_format json_object) */
  json?: boolean;
  maxTokens?: number;
  /** 0..2; default 0.2 for terse, deterministic-ish output */
  temperature?: number;
  /** optional system prompt */
  system?: string;
}

/** Single-shot completion. Returns the assistant text (JSON string if opts.json). */
export async function complete(prompt: string, opts: CompleteOpts = {}): Promise<string> {
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
  if (opts.system) messages.push({ role: "system", content: opts.system });
  messages.push({ role: "user", content: prompt });

  const res = await client().chat.completions.create({
    model: MODEL,
    messages,
    temperature: opts.temperature ?? 0.2,
    max_tokens: opts.maxTokens ?? 512,
    ...(opts.json ? { response_format: { type: "json_object" } } : {}),
  });
  return res.choices[0]?.message?.content ?? "";
}

/** Embed one or more strings. Returns one 1536-d vector per input, order preserved. */
export async function embed(input: string | string[]): Promise<number[][]> {
  const inputs = Array.isArray(input) ? input : [input];
  if (inputs.length === 0) return [];
  const res = await client().embeddings.create({
    model: EMBED_MODEL,
    input: inputs,
    dimensions: EMBED_DIMS,
  });
  return res.data.map((d) => d.embedding);
}
