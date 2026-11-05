-- Tresci (tylko odczyt dla wszystkich)
create table if not exists public.sheets (
  code text primary key,
  qualification text not null check (qualification in ('INF.03','EE.09','E.14')),
  year int not null,
  session text not null check (session in ('styczen','czerwiec')),
  variant text not null,
  title text not null,
  language text not null,
  difficulty int not null check (difficulty between 1 and 10),
  data jsonb not null
);

create table if not exists public.questions (
  id text primary key,
  category text not null check (category in ('strony','bazy','aplikacje','podstawy','bhp','angielski','kompetencje')),
  text text not null,
  answers jsonb not null,
  correct int not null check (correct between 0 and 3),
  explanation text,
  source text not null default 'original'
);

create table if not exists public.flashcards (
  id text primary key,
  deck text not null,
  front text not null,
  back text not null,
  example text
);

alter table public.sheets enable row level security;
alter table public.questions enable row level security;
alter table public.flashcards enable row level security;

create policy "sheets_read" on public.sheets for select to anon, authenticated using (true);
create policy "questions_read" on public.questions for select to anon, authenticated using (true);
create policy "flashcards_read" on public.flashcards for select to anon, authenticated using (true);

-- Postep: bez kont. Kazdy uzytkownik ma losowy "kod synchronizacji" (uuid) trzymany w przegladarce.
-- Tabela zamknieta przez RLS, dostep tylko przez funkcje, ktore wymagaja znajomosci kodu.
create table if not exists public.progress (
  sync_code uuid primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.progress enable row level security;

create or replace function public.save_progress(p_code uuid, p_data jsonb)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare ts timestamptz := now();
begin
  if pg_column_size(p_data) > 2000000 then
    raise exception 'progress too large';
  end if;
  insert into public.progress (sync_code, data, updated_at)
  values (p_code, p_data, ts)
  on conflict (sync_code) do update set data = excluded.data, updated_at = excluded.updated_at;
  return ts;
end;
$$;

create or replace function public.load_progress(p_code uuid)
returns table (data jsonb, updated_at timestamptz)
language sql
security definer
set search_path = ''
as $$
  select p.data, p.updated_at from public.progress p where p.sync_code = p_code;
$$;

revoke all on function public.save_progress(uuid, jsonb) from public;
revoke all on function public.load_progress(uuid) from public;
grant execute on function public.save_progress(uuid, jsonb) to anon, authenticated;
grant execute on function public.load_progress(uuid) to anon, authenticated;
