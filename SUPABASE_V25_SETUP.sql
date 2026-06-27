
-- A2 English Master V25 AI First Archive
-- Esegui in Supabase SQL Editor.
-- Sicuro da rieseguire.

create extension if not exists pgcrypto;

create table if not exists fillgap_archive (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references app_users(id) on delete cascade,
  title text,
  topic text,
  grammar_focus text,
  exercise jsonb not null,
  answers jsonb,
  score int,
  total int,
  percentage numeric,
  time_seconds int,
  favorite boolean not null default false,
  created_at timestamp with time zone default now(),
  completed_at timestamp with time zone
);

create index if not exists idx_fillgap_archive_user_created on fillgap_archive(user_id, created_at desc);
create index if not exists idx_fillgap_archive_topic on fillgap_archive(topic);

create or replace function public.save_fillgap_archive(
  p_session_id uuid,
  p_exercise jsonb
)
returns json
language plpgsql
security definer
as $$
declare
  u app_users%rowtype;
  s app_sessions%rowtype;
  new_id uuid;
begin
  select * into s from app_sessions where id = p_session_id limit 1;
  if not found or s.blocked = true then
    return json_build_object('ok', false, 'error', 'Sessione non valida');
  end if;

  select * into u from app_users where id = s.user_id limit 1;
  if not found or u.enabled = false then
    return json_build_object('ok', false, 'error', 'Account bloccato');
  end if;

  insert into fillgap_archive(user_id,title,topic,grammar_focus,exercise)
  values(
    u.id,
    coalesce(p_exercise->>'title','Fill the Gap'),
    coalesce(p_exercise->>'topic','Mixed'),
    coalesce(p_exercise->>'grammarFocus','Mixed Grammar'),
    p_exercise
  )
  returning id into new_id;

  return json_build_object('ok', true, 'id', new_id);
end;
$$;
grant execute on function public.save_fillgap_archive(uuid,jsonb) to anon, authenticated;

create or replace function public.update_fillgap_archive_result(
  p_session_id uuid,
  p_archive_id uuid,
  p_answers jsonb,
  p_score int,
  p_total int,
  p_time_seconds int default null
)
returns json
language plpgsql
security definer
as $$
declare
  u app_users%rowtype;
  s app_sessions%rowtype;
begin
  select * into s from app_sessions where id = p_session_id limit 1;
  if not found or s.blocked = true then
    return json_build_object('ok', false, 'error', 'Sessione non valida');
  end if;

  select * into u from app_users where id = s.user_id limit 1;
  if not found or u.enabled = false then
    return json_build_object('ok', false, 'error', 'Account bloccato');
  end if;

  update fillgap_archive
  set answers = p_answers,
      score = p_score,
      total = p_total,
      percentage = case when p_total > 0 then round((p_score::numeric / p_total::numeric) * 100, 2) else null end,
      time_seconds = p_time_seconds,
      completed_at = now()
  where id = p_archive_id and user_id = u.id;

  return json_build_object('ok', true);
end;
$$;
grant execute on function public.update_fillgap_archive_result(uuid,uuid,jsonb,int,int,int) to anon, authenticated;

create or replace function public.list_fillgap_archive(
  p_session_id uuid,
  p_limit int default 50
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
  if not found or s.blocked = true then
    return json_build_object('ok', false, 'error', 'Sessione non valida');
  end if;

  select * into u from app_users where id = s.user_id limit 1;
  if not found or u.enabled = false then
    return json_build_object('ok', false, 'error', 'Account bloccato');
  end if;

  select json_build_object(
    'ok', true,
    'items', coalesce(json_agg(json_build_object(
      'id', id,
      'title', title,
      'topic', topic,
      'grammarFocus', grammar_focus,
      'score', score,
      'total', total,
      'percentage', percentage,
      'timeSeconds', time_seconds,
      'favorite', favorite,
      'exercise', exercise,
      'createdAt', created_at,
      'completedAt', completed_at
    ) order by created_at desc), '[]'::json)
  )
  into result
  from (
    select * from fillgap_archive
    where user_id = u.id
    order by created_at desc
    limit greatest(1, least(coalesce(p_limit,50), 200))
  ) x;

  return result;
end;
$$;
grant execute on function public.list_fillgap_archive(uuid,int) to anon, authenticated;

create or replace function public.toggle_fillgap_favorite(
  p_session_id uuid,
  p_archive_id uuid
)
returns json
language plpgsql
security definer
as $$
declare
  u app_users%rowtype;
  s app_sessions%rowtype;
  fav boolean;
begin
  select * into s from app_sessions where id = p_session_id limit 1;
  if not found or s.blocked = true then
    return json_build_object('ok', false, 'error', 'Sessione non valida');
  end if;

  select * into u from app_users where id = s.user_id limit 1;
  if not found or u.enabled = false then
    return json_build_object('ok', false, 'error', 'Account bloccato');
  end if;

  update fillgap_archive
  set favorite = not favorite
  where id = p_archive_id and user_id = u.id
  returning favorite into fav;

  return json_build_object('ok', true, 'favorite', fav);
end;
$$;
grant execute on function public.toggle_fillgap_favorite(uuid,uuid) to anon, authenticated;
