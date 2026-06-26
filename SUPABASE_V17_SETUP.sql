
-- A2 English Master V17 Professional Admin
-- Esegui in Supabase SQL Editor. Sicuro da rieseguire.

create extension if not exists pgcrypto;

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

alter table app_sessions add column if not exists created_at timestamp with time zone default now();
alter table app_sessions add column if not exists ip text;
alter table app_sessions add column if not exists user_agent text;

-- Admin crea utente
create or replace function public.admin_create_user(
  p_session_id uuid,
  p_username text,
  p_password text,
  p_role text,
  p_teacher_limit int default null,
  p_fillgap_limit int default null,
  p_email_limit int default null
)
returns json
language plpgsql
security definer
as $$
declare
  admin_user app_users%rowtype;
  admin_session app_sessions%rowtype;
  new_user app_users%rowtype;
begin
  select * into admin_session from app_sessions where id = p_session_id limit 1;
  if not found then return json_build_object('ok', false, 'error', 'Sessione admin non valida'); end if;

  select * into admin_user from app_users where id = admin_session.user_id limit 1;
  if not found or admin_user.role <> 'admin' then return json_build_object('ok', false, 'error', 'Non autorizzato'); end if;

  insert into app_users (username, password_hash, role, teacher_limit, fillgap_limit, email_limit)
  values (p_username, crypt(p_password, gen_salt('bf')), p_role, p_teacher_limit, p_fillgap_limit, p_email_limit)
  returning * into new_user;

  return json_build_object('ok', true, 'user_id', new_user.id);
exception when unique_violation then
  return json_build_object('ok', false, 'error', 'Username già esistente');
end;
$$;
grant execute on function public.admin_create_user(uuid,text,text,text,int,int,int) to anon, authenticated;

-- Admin aggiorna ruolo e limiti
create or replace function public.admin_update_user_plan(
  p_session_id uuid,
  p_user_id uuid,
  p_role text,
  p_teacher_limit int default null,
  p_fillgap_limit int default null,
  p_email_limit int default null
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
  if not found then return json_build_object('ok', false, 'error', 'Sessione admin non valida'); end if;

  select * into admin_user from app_users where id = admin_session.user_id limit 1;
  if not found or admin_user.role <> 'admin' then return json_build_object('ok', false, 'error', 'Non autorizzato'); end if;

  update app_users
  set role = p_role,
      teacher_limit = p_teacher_limit,
      fillgap_limit = p_fillgap_limit,
      email_limit = p_email_limit
  where id = p_user_id;

  return json_build_object('ok', true);
end;
$$;
grant execute on function public.admin_update_user_plan(uuid,uuid,text,int,int,int) to anon, authenticated;

-- Admin reset utilizzi
create or replace function public.admin_reset_usage(
  p_session_id uuid,
  p_user_id uuid
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
  if not found then return json_build_object('ok', false, 'error', 'Sessione admin non valida'); end if;

  select * into admin_user from app_users where id = admin_session.user_id limit 1;
  if not found or admin_user.role <> 'admin' then return json_build_object('ok', false, 'error', 'Non autorizzato'); end if;

  update app_users
  set teacher_used = 0, fillgap_used = 0, email_used = 0
  where id = p_user_id;

  return json_build_object('ok', true);
end;
$$;
grant execute on function public.admin_reset_usage(uuid,uuid) to anon, authenticated;

-- Salva nota/risultato utente nel cloud
create or replace function public.save_user_note(
  p_session_id uuid,
  p_kind text,
  p_title text,
  p_content jsonb
)
returns json
language plpgsql
security definer
as $$
declare
  u app_users%rowtype;
  s app_sessions%rowtype;
  n app_user_notes%rowtype;
begin
  select * into s from app_sessions where id = p_session_id limit 1;
  if not found or s.blocked = true then return json_build_object('ok', false, 'error', 'Sessione non valida'); end if;

  select * into u from app_users where id = s.user_id limit 1;
  if not found or u.enabled = false then return json_build_object('ok', false, 'error', 'Account bloccato'); end if;

  insert into app_user_notes (user_id, kind, title, content)
  values (u.id, p_kind, p_title, p_content)
  returning * into n;

  return json_build_object('ok', true, 'id', n.id);
end;
$$;
grant execute on function public.save_user_note(uuid,text,text,jsonb) to anon, authenticated;

-- Lista note utente
create or replace function public.list_user_notes(
  p_session_id uuid,
  p_kind text default null
)
returns json
language plpgsql
security definer
as $$
declare
  u app_users%rowtype;
  s app_sessions%rowtype;
  result json;
begin
  select * into s from app_sessions where id = p_session_id limit 1;
  if not found or s.blocked = true then return json_build_object('ok', false, 'error', 'Sessione non valida'); end if;

  select * into u from app_users where id = s.user_id limit 1;
  if not found or u.enabled = false then return json_build_object('ok', false, 'error', 'Account bloccato'); end if;

  select json_build_object(
    'ok', true,
    'notes', coalesce(json_agg(json_build_object(
      'id', n.id,
      'kind', n.kind,
      'title', n.title,
      'content', n.content,
      'created_at', n.created_at
    ) order by n.created_at desc), '[]'::json)
  )
  into result
  from app_user_notes n
  where n.user_id = u.id and (p_kind is null or n.kind = p_kind);

  return result;
end;
$$;
grant execute on function public.list_user_notes(uuid,text) to anon, authenticated;
