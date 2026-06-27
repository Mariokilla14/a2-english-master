
create extension if not exists pgcrypto;

create table if not exists fillgap_exercises (
  id uuid primary key default gen_random_uuid(),
  title text,
  topic text,
  grammar_focus text,
  exercise jsonb not null,
  source text default 'ai-generated',
  created_by uuid references app_users(id) on delete set null,
  created_at timestamp with time zone default now()
);

create index if not exists idx_fillgap_exercises_topic on fillgap_exercises(topic);
create index if not exists idx_fillgap_exercises_created_at on fillgap_exercises(created_at desc);

create or replace function public.save_fillgap_exercise(p_session_id uuid, p_exercise jsonb)
returns json language plpgsql security definer as $$
declare u app_users%rowtype; s app_sessions%rowtype; new_id uuid;
begin
  select * into s from app_sessions where id = p_session_id limit 1;
  if not found or s.blocked = true then return json_build_object('ok', false, 'error', 'Sessione non valida'); end if;
  select * into u from app_users where id = s.user_id limit 1;
  if not found or u.enabled = false then return json_build_object('ok', false, 'error', 'Account bloccato'); end if;

  insert into fillgap_exercises (title, topic, grammar_focus, exercise, source, created_by)
  values (
    coalesce(p_exercise->>'title', 'Fill the Gap AI'),
    coalesce(p_exercise->>'topic', 'Mixed'),
    coalesce(p_exercise->>'grammarFocus', 'Mixed Grammar'),
    p_exercise,
    coalesce(p_exercise->>'source', 'ai-generated'),
    u.id
  ) returning id into new_id;

  return json_build_object('ok', true, 'id', new_id);
end;
$$;
grant execute on function public.save_fillgap_exercise(uuid,jsonb) to anon, authenticated;

create or replace function public.get_random_fillgap_exercise(p_session_id uuid, p_topic text default null, p_grammar text default null)
returns json language plpgsql security definer as $$
declare u app_users%rowtype; s app_sessions%rowtype; ex fillgap_exercises%rowtype;
begin
  select * into s from app_sessions where id = p_session_id limit 1;
  if not found or s.blocked = true then return json_build_object('ok', false, 'error', 'Sessione non valida'); end if;
  select * into u from app_users where id = s.user_id limit 1;
  if not found or u.enabled = false then return json_build_object('ok', false, 'error', 'Account bloccato'); end if;

  select * into ex from fillgap_exercises
  where (p_topic is null or p_topic = 'Random' or topic = p_topic)
    and (p_grammar is null or p_grammar = 'Mixed Grammar - Tutto il libro' or lower(grammar_focus) like '%' || lower(p_grammar) || '%')
  order by random()
  limit 1;

  if not found then return json_build_object('ok', false, 'error', 'Nessun esercizio cloud trovato'); end if;

  return json_build_object('ok', true, 'exercise', ex.exercise || jsonb_build_object('cloudId', ex.id, 'source', coalesce(ex.source,'cloud')));
end;
$$;
grant execute on function public.get_random_fillgap_exercise(uuid,text,text) to anon, authenticated;

create or replace function public.count_fillgap_exercises(p_session_id uuid)
returns json language plpgsql security definer as $$
declare u app_users%rowtype; s app_sessions%rowtype; total int;
begin
  select * into s from app_sessions where id = p_session_id limit 1;
  if not found or s.blocked = true then return json_build_object('ok', false, 'error', 'Sessione non valida'); end if;
  select * into u from app_users where id = s.user_id limit 1;
  if not found or u.enabled = false then return json_build_object('ok', false, 'error', 'Account bloccato'); end if;

  select count(*) into total from fillgap_exercises;
  return json_build_object('ok', true, 'total', total);
end;
$$;
grant execute on function public.count_fillgap_exercises(uuid) to anon, authenticated;
