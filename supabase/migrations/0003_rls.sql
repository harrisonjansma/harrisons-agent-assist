-- 0003_rls.sql — lock down anon access.
-- The worker uses the service_role key, which BYPASSES RLS, so its writes are
-- unaffected. The web app uses the anon key and must only ever read the docs
-- corpus — never sessions/utterances/notes (which hold transcripts).

alter table sessions   enable row level security;
alter table utterances enable row level security;
alter table notes      enable row level security;
alter table docs       enable row level security;

-- No anon policies on sessions/utterances/notes => anon cannot read them.

-- Public, read-only access to the (fictional) procedure-doc corpus.
drop policy if exists "docs public read" on docs;
create policy "docs public read" on docs
  for select
  to anon
  using (true);
