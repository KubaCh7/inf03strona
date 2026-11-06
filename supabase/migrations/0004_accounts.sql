-- Konta uzytkownikow: nazwa (wymagana), e-mail (opcjonalny), haslo (bcrypt przez pgcrypto).
-- Tabele zamkniete przez RLS; dostep tylko przez funkcje SECURITY DEFINER z tokenem sesji.
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  email text,
  pass_hash text not null,
  progress jsonb,
  progress_updated timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists accounts_username_key on public.accounts (lower(username));
create unique index if not exists accounts_email_key on public.accounts (lower(email)) where email is not null;

create table if not exists public.account_sessions (
  token uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '365 days'
);
create index if not exists account_sessions_account_idx on public.account_sessions (account_id);

create table if not exists public.account_login_attempts (
  login text not null,
  at timestamptz not null default now()
);
create index if not exists account_login_attempts_idx on public.account_login_attempts (login, at);

alter table public.accounts enable row level security;
alter table public.account_sessions enable row level security;
alter table public.account_login_attempts enable row level security;

create or replace function public.auth_register(p_username text, p_email text, p_password text)
returns table (token uuid, username text, email text)
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
  v_email text := nullif(trim(coalesce(p_email, '')), '');
begin
  if p_username !~ '^[A-Za-z0-9_.-]{3,24}$' then
    raise exception 'Nazwa użytkownika: 3–24 znaki, litery, cyfry, _ . -' using errcode = 'P0001';
  end if;
  if length(coalesce(p_password, '')) < 6 then
    raise exception 'Hasło musi mieć co najmniej 6 znaków' using errcode = 'P0001';
  end if;
  if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Niepoprawny adres e-mail' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.accounts a where lower(a.username) = lower(p_username)) then
    raise exception 'Ta nazwa użytkownika jest już zajęta' using errcode = 'P0001';
  end if;
  if v_email is not null and exists (select 1 from public.accounts a where lower(a.email) = lower(v_email)) then
    raise exception 'Ten e-mail jest już użyty' using errcode = 'P0001';
  end if;
  insert into public.accounts (username, email, pass_hash)
  values (p_username, v_email, extensions.crypt(p_password, extensions.gen_salt('bf', 10)))
  returning id into v_id;
  return query
    insert into public.account_sessions (account_id) values (v_id)
    returning account_sessions.token, p_username, v_email;
end;
$$;

create or replace function public.auth_login(p_login text, p_password text)
returns table (token uuid, username text, email text)
language plpgsql security definer set search_path = ''
as $$
declare
  v_acc public.accounts%rowtype;
  v_key text := lower(trim(coalesce(p_login, '')));
begin
  -- prosta ochrona przed zgadywaniem hasla: max 10 nieudanych prob na 15 minut
  if (select count(*) from public.account_login_attempts l where l.login = v_key and l.at > now() - interval '15 minutes') >= 10 then
    raise exception 'Za dużo prób logowania. Spróbuj za kilka minut' using errcode = 'P0001';
  end if;
  select * into v_acc from public.accounts a where lower(a.username) = v_key or lower(a.email) = v_key limit 1;
  if v_acc.id is null or v_acc.pass_hash <> extensions.crypt(p_password, v_acc.pass_hash) then
    insert into public.account_login_attempts (login) values (v_key);
    raise exception 'Zła nazwa użytkownika albo hasło' using errcode = 'P0001';
  end if;
  delete from public.account_login_attempts l where l.login = v_key;
  return query
    insert into public.account_sessions (account_id) values (v_acc.id)
    returning account_sessions.token, v_acc.username, v_acc.email;
end;
$$;

create or replace function public.auth_logout(p_token uuid)
returns void language sql security definer set search_path = ''
as $$ delete from public.account_sessions s where s.token = p_token; $$;

create or replace function public.account_load(p_token uuid)
returns table (username text, email text, progress jsonb, updated_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
begin
  return query
    select a.username, a.email, a.progress, a.progress_updated
    from public.account_sessions s join public.accounts a on a.id = s.account_id
    where s.token = p_token and s.expires_at > now();
  if not found then
    raise exception 'Sesja wygasła. Zaloguj się ponownie' using errcode = 'P0001';
  end if;
end;
$$;

create or replace function public.account_save(p_token uuid, p_data jsonb)
returns timestamptz
language plpgsql security definer set search_path = ''
as $$
declare v_id uuid; v_ts timestamptz := now();
begin
  select s.account_id into v_id from public.account_sessions s where s.token = p_token and s.expires_at > now();
  if v_id is null then
    raise exception 'Sesja wygasła. Zaloguj się ponownie' using errcode = 'P0001';
  end if;
  if pg_column_size(p_data) > 3000000 then
    raise exception 'Postęp jest za duży do zapisania' using errcode = 'P0001';
  end if;
  update public.accounts set progress = p_data, progress_updated = v_ts where id = v_id;
  return v_ts;
end;
$$;

create or replace function public.account_change_password(p_token uuid, p_old text, p_new text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_acc public.accounts%rowtype;
begin
  select a.* into v_acc from public.account_sessions s join public.accounts a on a.id = s.account_id where s.token = p_token and s.expires_at > now();
  if v_acc.id is null then raise exception 'Sesja wygasła. Zaloguj się ponownie' using errcode = 'P0001'; end if;
  if v_acc.pass_hash <> extensions.crypt(p_old, v_acc.pass_hash) then raise exception 'Obecne hasło jest niepoprawne' using errcode = 'P0001'; end if;
  if length(coalesce(p_new, '')) < 6 then raise exception 'Hasło musi mieć co najmniej 6 znaków' using errcode = 'P0001'; end if;
  update public.accounts set pass_hash = extensions.crypt(p_new, extensions.gen_salt('bf', 10)) where id = v_acc.id;
  delete from public.account_sessions s where s.account_id = v_acc.id and s.token <> p_token;
end;
$$;

revoke all on function public.auth_register(text, text, text) from public;
revoke all on function public.auth_login(text, text) from public;
revoke all on function public.auth_logout(uuid) from public;
revoke all on function public.account_load(uuid) from public;
revoke all on function public.account_save(uuid, jsonb) from public;
revoke all on function public.account_change_password(uuid, text, text) from public;
grant execute on function public.auth_register(text, text, text) to anon, authenticated;
grant execute on function public.auth_login(text, text) to anon, authenticated;
grant execute on function public.auth_logout(uuid) to anon, authenticated;
grant execute on function public.account_load(uuid) to anon, authenticated;
grant execute on function public.account_save(uuid, jsonb) to anon, authenticated;
grant execute on function public.account_change_password(uuid, text, text) to anon, authenticated;
