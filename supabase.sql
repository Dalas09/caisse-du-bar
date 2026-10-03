-- À coller une seule fois dans Supabase : SQL Editor > New query > Run.
-- Une table pour toutes les données de la caisse ; chaque bar ne voit que ses lignes (en-tête x-bar-key).
create table if not exists caisse_docs (
  bar text not null,
  coll text not null,
  id text not null,
  data jsonb,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (bar, coll, id)
);
create index if not exists caisse_docs_bar_updated on caisse_docs (bar, updated_at);

alter table caisse_docs enable row level security;
drop policy if exists bar_access on caisse_docs;
create policy bar_access on caisse_docs for all to anon
  using (bar = current_setting('request.headers', true)::json->>'x-bar-key')
  with check (bar = current_setting('request.headers', true)::json->>'x-bar-key');

create or replace function caisse_touch() returns trigger language plpgsql as $$
begin new.updated_at = clock_timestamp(); return new; end $$;
drop trigger if exists caisse_touch on caisse_docs;
create trigger caisse_touch before insert or update on caisse_docs
  for each row execute function caisse_touch();
