-- 0005_drop_ivfflat.sql
-- Drop the ivfflat index. With a tiny corpus (~12 docs) and lists=100, the
-- approximate index probes a single (usually empty) list and returns almost
-- nothing — `match_docs` was returning 0–2 rows regardless of the query.
-- At this scale an exact sequential scan is instant and correct. (If the corpus
-- ever grows to thousands of docs, add an HNSW index instead of ivfflat.)

drop index if exists docs_embedding_idx;
