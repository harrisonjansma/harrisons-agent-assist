/**
 * Retrieval over the seeded procedure-doc corpus (HAR-262). Embeds a rolling
 * window of recent utterances and asks Postgres/pgvector for the top matches
 * via the `match_docs` RPC (cosine). Threshold + top-k enforced in SQL.
 */
import { embed, serverDb, type DocHit } from "@call-copilot/shared";
import { log } from "./logger.js";

const TOP_K = 4;
const MIN_SCORE = 0.3;
const SNIPPET_LEN = 200;

export async function retrieveDocs(windowText: string): Promise<DocHit[]> {
  const trimmed = windowText.trim();
  if (!trimmed) return [];

  const [queryEmbedding] = await embed(trimmed);
  if (!queryEmbedding) return [];

  const { data, error } = await serverDb().rpc("match_docs", {
    query_embedding: queryEmbedding,
    match_count: TOP_K,
    min_score: MIN_SCORE,
  });
  if (error) {
    log.error({ error }, "rag: match_docs rpc failed");
    return [];
  }

  return (data ?? []).map((row: { id: number; title: string; body: string; score: number }) => ({
    id: row.id,
    title: row.title,
    snippet: row.body.slice(0, SNIPPET_LEN).trim(),
    score: Number(row.score.toFixed(3)),
  }));
}

/** Stable key for a result set, used to suppress duplicate docs.update emits. */
export function docsKey(docs: DocHit[]): string {
  return docs
    .map((d) => d.id)
    .sort((a, b) => a - b)
    .join(",");
}
