-- 0002_match_docs.sql — cosine similarity search over the docs corpus (HAR-262)
-- score = 1 - cosine_distance, so higher is more similar (range ~0..1).

create or replace function match_docs(
  query_embedding vector(1536),
  match_count int default 4,
  min_score float default 0.3
)
returns table (id bigint, title text, body text, score float)
language sql
stable
as $$
  select
    d.id,
    d.title,
    d.body,
    1 - (d.embedding <=> query_embedding) as score
  from docs d
  where d.embedding is not null
    and 1 - (d.embedding <=> query_embedding) >= min_score
  order by d.embedding <=> query_embedding
  limit match_count;
$$;
