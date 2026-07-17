-- 0001_init.sql — Live Call Copilot schema (per ADR)
-- Tables: sessions, utterances, notes, docs (+ pgvector cosine index)

create extension if not exists vector;

create table if not exists sessions (
  id          uuid primary key default gen_random_uuid(),
  started_at  timestamptz not null default now(),
  ended_at    timestamptz,
  ip_hash     text
);

create table if not exists utterances (
  id          bigint generated always as identity primary key,
  session_id  uuid not null references sessions(id) on delete cascade,
  ts          timestamptz not null default now(),
  speaker     text not null default 'user',
  text        text,
  sentiment   real
);
create index if not exists utterances_session_id_idx on utterances(session_id);

create table if not exists notes (
  session_id  uuid primary key references sessions(id) on delete cascade,
  markdown    text,
  updated_at  timestamptz not null default now()
);

create table if not exists docs (
  id          bigint generated always as identity primary key,
  title       text not null,
  body        text not null,
  embedding   vector(1536)
);
create unique index if not exists docs_title_key on docs(title);

-- Approximate-nearest-neighbour index for cosine similarity over embeddings.
-- ivfflat needs data present to build well; safe to (re)build after `pnpm seed`.
create index if not exists docs_embedding_idx
  on docs using ivfflat (embedding vector_cosine_ops) with (lists = 100);
