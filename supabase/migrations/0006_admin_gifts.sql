-- Admin i prezenty: admin rozdaje monety / XP / przedmioty wszystkim albo jednej osobie.
alter table public.accounts add column if not exists is_admin boolean not null default false;
update public.accounts set is_admin = true where lower(username) = 'jacob';

create table if not exists public.admin_gifts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  target text,              -- null = wszyscy, inaczej nazwa uzytkownika
  coins int not null default 0,
  xp int not null default 0,
  item text,                -- id przedmiotu ze sklepu (np. frame:rainbow)
  message text,
  created_by text not null
);
alter table public.admin_gifts enable row level security;

-- konto admina po tokenie sesji (albo null)
create or replace function public._admin_from_token(p_token uuid)
returns public.accounts language sql security definer set search_path = '' stable
as $$
  select a.* from public.account_sessions s join public.accounts a on a.id = s.account_id
  where s.token = p_token and s.expires_at > now() and a.is_admin
$$;
revoke all on function public._admin_from_token(uuid) from public, anon, authenticated;

create or replace function public.account_is_admin(p_token uuid)
returns boolean language sql security definer set search_path = '' stable
as $$ select exists (select 1 from public._admin_from_token(p_token) x where x.id is not null) $$;

create or replace function public.admin_send_gift(p_token uuid, p_target text, p_coins int, p_xp int, p_item text, p_message text, p_hours int)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_admin public.accounts; v_id uuid; v_target text := nullif(trim(coalesce(p_target, '')), '');
begin
  select * into v_admin from public._admin_from_token(p_token);
  if v_admin.id is null then raise exception 'Brak uprawnień admina' using errcode = 'P0001'; end if;
  if coalesce(p_coins, 0) = 0 and coalesce(p_xp, 0) = 0 and nullif(trim(coalesce(p_item, '')), '') is null and nullif(trim(coalesce(p_message, '')), '') is null then
    raise exception 'Wpisz wiadomość albo dodaj prezent' using errcode = 'P0001';
  end if;
  if abs(coalesce(p_coins, 0)) > 1000000 or abs(coalesce(p_xp, 0)) > 1000000 then
    raise exception 'Za duża wartość' using errcode = 'P0001';
  end if;
  if v_target is not null and not exists (select 1 from public.accounts a where lower(a.username) = lower(v_target)) then
    raise exception 'Nie ma użytkownika %', v_target using errcode = 'P0001';
  end if;
  insert into public.admin_gifts (target, coins, xp, item, message, created_by, expires_at)
  values (v_target, coalesce(p_coins, 0), coalesce(p_xp, 0), nullif(trim(coalesce(p_item, '')), ''), left(nullif(trim(coalesce(p_message, '')), ''), 500), v_admin.username,
          now() + make_interval(hours => greatest(1, least(coalesce(p_hours, 168), 24 * 90))))
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.admin_list_gifts(p_token uuid)
returns setof public.admin_gifts language plpgsql security definer set search_path = '' stable
as $$
begin
  if not public.account_is_admin(p_token) then raise exception 'Brak uprawnień admina' using errcode = 'P0001'; end if;
  return query select * from public.admin_gifts order by created_at desc limit 200;
end;
$$;

create or replace function public.admin_delete_gift(p_token uuid, p_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not public.account_is_admin(p_token) then raise exception 'Brak uprawnień admina' using errcode = 'P0001'; end if;
  delete from public.admin_gifts g where g.id = p_id;
end;
$$;

-- aktywne prezenty: dla wszystkich + (z tokenem) prezenty imienne dla tego konta
create or replace function public.gifts_active(p_token uuid default null)
returns table (id uuid, created_at timestamptz, coins int, xp int, item text, message text, created_by text, personal boolean)
language sql security definer set search_path = '' stable
as $$
  select g.id, g.created_at, g.coins, g.xp, g.item, g.message, g.created_by, g.target is not null
  from public.admin_gifts g
  where g.expires_at > now()
    and (g.target is null or lower(g.target) = (
      select lower(a.username) from public.account_sessions s join public.accounts a on a.id = s.account_id
      where s.token = p_token and s.expires_at > now()))
  order by g.created_at
$$;

revoke all on function public.account_is_admin(uuid) from public;
revoke all on function public.admin_send_gift(uuid, text, int, int, text, text, int) from public;
revoke all on function public.admin_list_gifts(uuid) from public;
revoke all on function public.admin_delete_gift(uuid, uuid) from public;
revoke all on function public.gifts_active(uuid) from public;
grant execute on function public.account_is_admin(uuid) to anon, authenticated;
grant execute on function public.admin_send_gift(uuid, text, int, int, text, text, int) to anon, authenticated;
grant execute on function public.admin_list_gifts(uuid) to anon, authenticated;
grant execute on function public.admin_delete_gift(uuid, uuid) to anon, authenticated;
grant execute on function public.gifts_active(uuid) to anon, authenticated;
