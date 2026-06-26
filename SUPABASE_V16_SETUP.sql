
-- A2 English Master V16 Enterprise Complete
-- Esegui in Supabase SQL Editor se non lo hai già fatto.
-- È sicuro rieseguirlo: usa IF NOT EXISTS / CREATE OR REPLACE.

create extension if not exists pgcrypto;

alter table app_sessions add column if not exists created_at timestamp with time zone default now();
alter table app_sessions add column if not exists ip text;
alter table app_sessions add column if not exists user_agent text;

create table if not exists app_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references app_users(id) on delete cascade,
  session_id uuid references app_sessions(id) on delete set null,
  action text not null,
  created_at timestamp with time zone default now()
);

create table if not exists app_user_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references app_users(id) on delete cascade,
  kind text not null,
  title text,
  content jsonb,
  created_at timestamp with time zone default now()
);

create or replace function public.login_user(
  p_username text,
  p_password text,
  p_device_id text,
  p_browser text,
  p_os text,
  p_user_agent text default null,
  p_ip text default null
)
returns json
language plpgsql
security definer
as $$
declare
  u app_users%rowtype;
  s app_sessions%rowtype;
begin
  select * into u
  from app_users
  where username = p_username
    and password_hash = crypt(p_password, password_hash)
  limit 1;

  if not found then
    return json_build_object('ok', false, 'error', 'Username o password errati');
  end if;

  if u.enabled = false then
    return json_build_object('ok', false, 'error', 'Account bloccato');
  end if;

  insert into app_sessions (user_id, device_id, browser, os, user_agent, ip, last_seen, blocked)
  values (u.id, p_device_id, p_browser, p_os, p_user_agent, p_ip, now(), false)
  returning * into s;

  return json_build_object(
    'ok', true,
    'session_id', s.id,
    'user', json_build_object(
      'id', u.id,
      'username', u.username,
      'role', u.role,
      'enabled', u.enabled,
      'teacher_limit', u.teacher_limit,
      'fillgap_limit', u.fillgap_limit,
      'email_limit', u.email_limit,
      'teacher_used', u.teacher_used,
      'fillgap_used', u.fillgap_used,
      'email_used', u.email_used
    )
  );
end;
$$;

grant execute on function public.login_user(text,text,text,text,text,text,text) to anon, authenticated;

create or replace function public.get_session_user(p_session_id uuid)
returns json
language plpgsql
security definer
as $$
declare
  u app_users%rowtype;
  s app_sessions%rowtype;
begin
  select * into s from app_sessions where id = p_session_id limit 1;

  if not found then
    return json_build_object('ok', false, 'error', 'Sessione non valida');
  end if;

  if s.blocked = true then
    return json_build_object('ok', false, 'error', 'Dispositivo bloccato');
  end if;

  select * into u from app_users where id = s.user_id limit 1;

  if not found or u.enabled = false then
    return json_build_object('ok', false, 'error', 'Account bloccato');
  end if;

  update app_sessions set last_seen = now() where id = p_session_id;

  return json_build_object(
    'ok', true,
    'session_id', s.id,
    'device_id', s.device_id,
    'user', json_build_object(
      'id', u.id,
      'username', u.username,
      'role', u.role,
      'enabled', u.enabled,
      'teacher_limit', u.teacher_limit,
      'fillgap_limit', u.fillgap_limit,
      'email_limit', u.email_limit,
      'teacher_used', u.teacher_used,
      'fillgap_used', u.fillgap_used,
      'email_used', u.email_used
    )
  );
end;
$$;

grant execute on function public.get_session_user(uuid) to anon, authenticated;

create or replace function public.increment_usage(
  p_session_id uuid,
  p_action text
)
returns json
language plpgsql
security definer
as $$
declare
  u app_users%rowtype;
  s app_sessions%rowtype;
  limit_value int;
  used_value int;
begin
  select * into s from app_sessions where id = p_session_id limit 1;

  if not found or s.blocked = true then
    return json_build_object('ok', false, 'error', 'Sessione non valida o dispositivo bloccato');
  end if;

  select * into u from app_users where id = s.user_id limit 1;

  if not found or u.enabled = false then
    return json_build_object('ok', false, 'error', 'Account bloccato');
  end if;

  if p_action = 'teacher' then
    limit_value := u.teacher_limit;
    used_value := u.teacher_used;
    if limit_value is not null and used_value >= limit_value then
      return json_build_object('ok', false, 'error', 'Limite Teacher AI raggiunto');
    end if;
    update app_users set teacher_used = teacher_used + 1 where id = u.id;

  elsif p_action = 'fillgap' then
    limit_value := u.fillgap_limit;
    used_value := u.fillgap_used;
    if limit_value is not null and used_value >= limit_value then
      return json_build_object('ok', false, 'error', 'Limite Fill the Gap raggiunto');
    end if;
    update app_users set fillgap_used = fillgap_used + 1 where id = u.id;

  elsif p_action = 'email' then
    limit_value := u.email_limit;
    used_value := u.email_used;
    if limit_value is not null and used_value >= limit_value then
      return json_build_object('ok', false, 'error', 'Limite Email AI raggiunto');
    end if;
    update app_users set email_used = email_used + 1 where id = u.id;

  else
    return json_build_object('ok', false, 'error', 'Azione non valida');
  end if;

  insert into app_usage_events (user_id, session_id, action)
  values (u.id, s.id, p_action);

  update app_sessions set last_seen = now() where id = p_session_id;

  return json_build_object('ok', true);
end;
$$;

grant execute on function public.increment_usage(uuid,text) to anon, authenticated;

create or replace function public.admin_overview(p_session_id uuid)
returns json
language plpgsql
security definer
as $$
declare
  admin_user app_users%rowtype;
  admin_session app_sessions%rowtype;
  result json;
begin
  select * into admin_session from app_sessions where id = p_session_id limit 1;

  if not found then
    return json_build_object('ok', false, 'error', 'Sessione admin non valida');
  end if;

  select * into admin_user from app_users where id = admin_session.user_id limit 1;

  if not found or admin_user.role <> 'admin' or admin_user.enabled = false then
    return json_build_object('ok', false, 'error', 'Non autorizzato');
  end if;

  select json_build_object(
    'ok', true,
    'users', coalesce(json_agg(
      json_build_object(
        'id', u.id,
        'username', u.username,
        'role', u.role,
        'enabled', u.enabled,
        'teacher_limit', u.teacher_limit,
        'fillgap_limit', u.fillgap_limit,
        'email_limit', u.email_limit,
        'teacher_used', u.teacher_used,
        'fillgap_used', u.fillgap_used,
        'email_used', u.email_used,
        'sessions', (
          select coalesce(json_agg(json_build_object(
            'id', s.id,
            'device_id', s.device_id,
            'browser', s.browser,
            'os', s.os,
            'last_seen', s.last_seen,
            'blocked', s.blocked,
            'online', s.last_seen > now() - interval '2 minutes'
          ) order by s.last_seen desc), '[]'::json)
          from app_sessions s
          where s.user_id = u.id
        )
      )
      order by u.created_at asc
    ), '[]'::json)
  )
  into result
  from app_users u;

  return result;
end;
$$;

grant execute on function public.admin_overview(uuid) to anon, authenticated;

create or replace function public.admin_set_user_enabled(
  p_session_id uuid,
  p_user_id uuid,
  p_enabled boolean
)
returns json
language plpgsql
security definer
as $$
declare
  admin_user app_users%rowtype;
  admin_session app_sessions%rowtype;
begin
  select * into admin_session from app_sessions where id = p_session_id limit 1;
  if not found then
    return json_build_object('ok', false, 'error', 'Sessione admin non valida');
  end if;

  select * into admin_user from app_users where id = admin_session.user_id limit 1;

  if not found or admin_user.role <> 'admin' then
    return json_build_object('ok', false, 'error', 'Non autorizzato');
  end if;

  update app_users set enabled = p_enabled where id = p_user_id;

  return json_build_object('ok', true);
end;
$$;

grant execute on function public.admin_set_user_enabled(uuid,uuid,boolean) to anon, authenticated;

create or replace function public.admin_set_session_blocked(
  p_session_id uuid,
  p_target_session_id uuid,
  p_blocked boolean
)
returns json
language plpgsql
security definer
as $$
declare
  admin_user app_users%rowtype;
  admin_session app_sessions%rowtype;
begin
  select * into admin_session from app_sessions where id = p_session_id limit 1;
  if not found then
    return json_build_object('ok', false, 'error', 'Sessione admin non valida');
  end if;

  select * into admin_user from app_users where id = admin_session.user_id limit 1;

  if not found or admin_user.role <> 'admin' then
    return json_build_object('ok', false, 'error', 'Non autorizzato');
  end if;

  update app_sessions set blocked = p_blocked where id = p_target_session_id;

  return json_build_object('ok', true);
end;
$$;

grant execute on function public.admin_set_session_blocked(uuid,uuid,boolean) to anon, authenticated;
