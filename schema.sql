-- الصق هذا الملف كاملاً في Supabase > SQL Editor > Run
create extension if not exists pgcrypto;

create table if not exists quizzes(
  id uuid primary key default gen_random_uuid(),
  creator text not null check (char_length(creator) between 1 and 30),
  kind text not null check (kind in ('friends','love')),
  questions jsonb not null,      -- بدون الإجابات الصحيحة
  correct int[] not null,        -- الإجابات الصحيحة (سرّية)
  created_at timestamptz not null default now()
);
create table if not exists results(
  id bigserial primary key,
  quiz_id uuid not null references quizzes(id) on delete cascade,
  taker text check (char_length(taker) <= 30),
  score int not null, total int not null,
  created_at timestamptz not null default now()
);
alter table quizzes enable row level security;
alter table results enable row level security;
revoke all on quizzes, results from anon, authenticated;  -- لا وصول مباشر أبداً

create or replace function create_quiz(p_creator text, p_kind text, p_questions jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare n int; i int; qs jsonb := '[]'; cor int[] := '{}'; e jsonb; nopt int; new_id uuid;
begin
  n := jsonb_array_length(p_questions);
  if n < 5 or n > 15 then raise exception 'عدد الأسئلة من 5 إلى 15'; end if;
  for i in 0..n-1 loop
    e := p_questions->i; nopt := jsonb_array_length(e->'options');
    if nopt < 2 or nopt > 6 or char_length(e->>'q') not between 1 and 200
       or (e->>'correct')::int not between 0 and nopt-1 then raise exception 'سؤال غير صالح'; end if;
    qs := qs || jsonb_build_array(jsonb_build_object('q', e->>'q', 'options', e->'options'));
    cor := cor || (e->>'correct')::int;
  end loop;
  insert into quizzes(creator, kind, questions, correct)
    values (left(trim(p_creator),30), p_kind, qs, cor) returning id into new_id;
  return new_id;
end $$;

create or replace function get_quiz(p_id uuid)
returns json language sql security definer set search_path = public as $$
  select json_build_object('creator', creator, 'kind', kind, 'questions', questions)
  from quizzes where id = p_id;
$$;

create or replace function submit_quiz(p_id uuid, p_answers int[], p_taker text)
returns json language plpgsql security definer set search_path = public as $$
declare qz quizzes; sc int := 0; i int;
begin
  select * into qz from quizzes where id = p_id;
  if not found then raise exception 'الاختبار غير موجود'; end if;
  if coalesce(array_length(p_answers,1),0) <> array_length(qz.correct,1) then raise exception 'إجابات ناقصة'; end if;
  for i in 1..array_length(qz.correct,1) loop
    if p_answers[i] = qz.correct[i] then sc := sc + 1; end if;
  end loop;
  insert into results(quiz_id, taker, score, total)
    values (p_id, nullif(left(trim(coalesce(p_taker,'')),30),''), sc, array_length(qz.correct,1));
  return json_build_object('score', sc, 'total', array_length(qz.correct,1), 'creator', qz.creator);
end $$;

grant execute on function create_quiz(text,text,jsonb), get_quiz(uuid), submit_quiz(uuid,int[],text) to anon;
