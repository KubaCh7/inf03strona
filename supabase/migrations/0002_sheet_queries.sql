-- Zadania SQL wyciagniete z arkuszy CKE (bez rozwiazan). Zrzuty baz sa w public/dumps.
create table if not exists public.sheet_queries (
  code text primary key references public.sheets(code),
  db text,
  dump text,
  dump_name text,
  solution_path text not null,
  tasks jsonb not null
);
alter table public.sheet_queries enable row level security;
create policy "sheet_queries_read" on public.sheet_queries for select to anon, authenticated using (true);
