-- 0004_match_docs_text.sql
-- Take the query embedding as text and cast it explicitly inside the function.
-- PostgREST does not reliably coerce a JSON array/string RPC argument into a
-- pgvector `vector` param (it arrives NULL, so every row scores NULL and the
-- function returns nothing). Passing text + casting `::vector` inside is the
-- reliable pattern. Callers pass JSON.stringify(embedding).

drop function if exists match_docs(vector, int, float);

create or replace function match_docs(
  query_embedding text,
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
    1 - (d.embedding <=> query_embedding::vector) as score
  from docs d
  where d.embedding is not null
    and 1 - (d.embedding <=> query_embedding::vector) >= min_score
  order by d.embedding <=> query_embedding::vector
  limit match_count;
$$;
