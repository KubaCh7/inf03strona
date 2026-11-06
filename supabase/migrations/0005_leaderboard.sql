-- Ranking: publiczne dane z postepu kont (bez hasel, e-maili i tokenow).
-- Liczone z jsonb zapisanego przez account_save: tables.xp, tables.sheets, tables.tests, tables.equipped.
create or replace function public.leaderboard(p_limit int default 100)
returns table (
  username text,
  xp int,
  sheets_done int,
  exams_passed int,
  equipped jsonb,
  updated_at timestamptz
)
language sql security definer set search_path = '' stable
as $$
  select
    a.username,
    coalesce((a.progress->'tables'->>'xp')::int, 0) as xp,
    (select count(*)::int from jsonb_each(coalesce(a.progress->'tables'->'sheets', '{}'::jsonb)) e
      where e.value->>'status' = 'done') as sheets_done,
    (select count(*)::int from jsonb_each(coalesce(a.progress->'tables'->'sheets', '{}'::jsonb)) e
      where coalesce((e.value->>'score')::numeric, 0) >= 75) as exams_passed,
    jsonb_build_object(
      'look', a.progress->'tables'->'equipped'->'look',
      'frame', a.progress->'tables'->'equipped'->>'frame',
      'title', a.progress->'tables'->'equipped'->>'title',
      'nick', a.progress->'tables'->'equipped'->>'nick',
      'effect', a.progress->'tables'->'equipped'->>'effect'
    ) as equipped,
    a.progress_updated as updated_at
  from public.accounts a
  where a.progress is not null
  order by xp desc, sheets_done desc, a.created_at asc
  limit least(greatest(coalesce(p_limit, 100), 1), 200);
$$;

revoke all on function public.leaderboard(int) from public;
grant execute on function public.leaderboard(int) to anon, authenticated;
