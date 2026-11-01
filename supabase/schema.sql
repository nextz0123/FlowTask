-- ============================================================
--  FlowTask — esquema Supabase
--  Executa este script em: Supabase → SQL Editor → New query
--
--  Modelo de segurança:
--  A app entra com um código de família partilhado (sem contas de email).
--  Por isso as tabelas estão fechadas ao público (RLS ligado, sem políticas)
--  e todo o acesso passa por funções "security definer" que validam o código.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- Tabelas ----------

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'A minha família',
  invite_code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null,
  role text not null check (role in ('chefe', 'trabalhador')),
  created_at timestamptz not null default now()
);

-- IMPORTANTE: "payments" tem de ser criada ANTES de "tasks",
-- porque tasks.payment_id referencia payments.id.
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  amount_cents integer not null check (amount_cents >= 0),
  method text not null check (method in ('mbway', 'dinheiro', 'outro')),
  note text,
  week_start date not null,
  paid_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  title text not null,
  description text,
  price_cents integer not null check (price_cents > 0),
  status text not null default 'pendente' check (status in ('pendente', 'feita', 'recusada', 'paga')),
  created_by uuid references public.members (id) on delete set null,
  completed_by uuid references public.members (id) on delete set null,
  completed_at timestamptz,
  declined_reason text,
  declined_at timestamptz,
  due_date date,
  payment_id uuid references public.payments (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Para projetos criados antes do prazo existir
alter table public.tasks add column if not exists due_date date;

create index if not exists tasks_household_idx on public.tasks (household_id, created_at desc);
create index if not exists payments_household_idx on public.payments (household_id, paid_at desc);

-- Avisos do trabalhador ao chefe ("hora de receber")
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  week_start date not null,
  amount_cents integer not null default 0,
  message text,
  created_by uuid references public.members (id) on delete set null,
  created_at timestamptz not null default now(),
  seen_at timestamptz
);

create index if not exists reminders_household_idx on public.reminders (household_id, created_at desc);

-- ---------- Segurança (RLS): tabelas fechadas ao público ----------

alter table public.households enable row level security;
alter table public.members enable row level security;
alter table public.tasks enable row level security;
alter table public.payments enable row level security;
alter table public.reminders enable row level security;

-- ---------- Função: criar família ----------
create or replace function public.create_household(p_name text, p_code text)
returns table (household_id uuid, invite_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_code text;
begin
  if p_code is null or length(trim(p_code)) < 4 then
    raise exception 'O código deve ter pelo menos 4 caracteres.';
  end if;

  v_code := upper(trim(p_code));

  insert into households (name, invite_code)
  values (coalesce(nullif(trim(p_name), ''), 'A minha família'), v_code)
  returning id into v_id;

  return query select v_id, v_code;
end;
$$;

-- ---------- Função: entrar na família ----------
create or replace function public.join_household(p_code text, p_role text, p_name text)
returns table (household_id uuid, member_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household uuid;
  v_member uuid;
begin
  if p_role not in ('chefe', 'trabalhador') then
    raise exception 'Papel inválido.';
  end if;

  select h.id into v_household
  from households h
  where upper(h.invite_code) = upper(trim(p_code));

  if v_household is null then
    raise exception 'Código de família inválido.';
  end if;

  -- Reutiliza o membro se já existir um com o mesmo nome e papel
  select m.id into v_member
  from members m
  where m.household_id = v_household
    and lower(m.name) = lower(trim(p_name))
    and m.role = p_role
  limit 1;

  if v_member is null then
    insert into members (household_id, name, role)
    values (v_household, trim(p_name), p_role)
    returning id into v_member;
  end if;

  return query select v_household, v_member;
end;
$$;

-- ---------- Funções de dados (validadas pelo código) ----------

create or replace function public.app_load(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household uuid;
  v_result jsonb;
begin
  select h.id into v_household
  from households h
  where upper(h.invite_code) = upper(trim(p_code));

  if v_household is null then
    raise exception 'Código de família inválido.';
  end if;

  select jsonb_build_object(
    'household', (select to_jsonb(h) from households h where h.id = v_household),
    'members', coalesce((select jsonb_agg(m order by m.created_at) from members m where m.household_id = v_household), '[]'::jsonb),
    'tasks', coalesce((select jsonb_agg(t order by t.created_at desc) from tasks t where t.household_id = v_household), '[]'::jsonb),
    'payments', coalesce((select jsonb_agg(p order by p.paid_at desc) from payments p where p.household_id = v_household), '[]'::jsonb),
    'reminders', coalesce((select jsonb_agg(r order by r.created_at desc) from reminders r where r.household_id = v_household), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

create or replace function public.app_create_task(
  p_code text,
  p_member_id uuid,
  p_title text,
  p_description text,
  p_price_cents integer,
  p_due_date date default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household uuid;
begin
  select h.id into v_household from households h
  where upper(h.invite_code) = upper(trim(p_code));
  if v_household is null then raise exception 'Código de família inválido.'; end if;
  if p_price_cents is null or p_price_cents <= 0 then raise exception 'Preço inválido.'; end if;

  insert into tasks (household_id, title, description, price_cents, status, created_by, due_date)
  values (v_household, trim(p_title), nullif(trim(coalesce(p_description, '')), ''), p_price_cents, 'pendente', p_member_id, p_due_date);
end;
$$;

create or replace function public.app_set_task_status(
  p_code text,
  p_member_id uuid,
  p_task_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household uuid;
begin
  select h.id into v_household from households h
  where upper(h.invite_code) = upper(trim(p_code));
  if v_household is null then raise exception 'Código de família inválido.'; end if;

  if p_status = 'feita' then
    update tasks
    set status = 'feita', completed_by = p_member_id, completed_at = now(),
        declined_reason = null, declined_at = null
    where id = p_task_id and household_id = v_household and status in ('pendente', 'recusada');
  elsif p_status = 'pendente' then
    update tasks
    set status = 'pendente', completed_by = null, completed_at = null,
        declined_reason = null, declined_at = null
    where id = p_task_id and household_id = v_household and status in ('feita', 'recusada');
  else
    raise exception 'Estado inválido.';
  end if;
end;
$$;

-- Trabalhador recusa a tarefa, indicando o motivo (obrigatório).
create or replace function public.app_decline_task(
  p_code text,
  p_task_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household uuid;
begin
  select h.id into v_household from households h
  where upper(h.invite_code) = upper(trim(p_code));
  if v_household is null then raise exception 'Código de família inválido.'; end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'É obrigatório indicar o motivo.';
  end if;

  update tasks
  set status = 'recusada',
      declined_reason = left(trim(p_reason), 280),
      declined_at = now(),
      completed_by = null,
      completed_at = null
  where id = p_task_id and household_id = v_household and status = 'pendente';
end;
$$;

create or replace function public.app_delete_task(p_code text, p_task_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household uuid;
begin
  select h.id into v_household from households h
  where upper(h.invite_code) = upper(trim(p_code));
  if v_household is null then raise exception 'Código de família inválido.'; end if;

  delete from tasks
  where id = p_task_id and household_id = v_household and status <> 'paga';
end;
$$;

create or replace function public.app_pay_week(
  p_code text,
  p_week_start date,
  p_task_ids uuid[],
  p_amount_cents integer,
  p_method text,
  p_note text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household uuid;
  v_payment uuid;
begin
  select h.id into v_household from households h
  where upper(h.invite_code) = upper(trim(p_code));
  if v_household is null then raise exception 'Código de família inválido.'; end if;
  if p_method not in ('mbway', 'dinheiro', 'outro') then raise exception 'Método inválido.'; end if;

  insert into payments (household_id, amount_cents, method, note, week_start)
  values (v_household, p_amount_cents, p_method, nullif(trim(coalesce(p_note, '')), ''), p_week_start)
  returning id into v_payment;

  update tasks
  set status = 'paga', payment_id = v_payment
  where id = any(p_task_ids) and household_id = v_household and status = 'feita';

  return v_payment;
end;
$$;

-- Trabalhador avisa o chefe de que é hora de receber.
create or replace function public.app_send_reminder(
  p_code text,
  p_member_id uuid,
  p_week_start date,
  p_amount_cents integer,
  p_message text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household uuid;
begin
  select h.id into v_household from households h
  where upper(h.invite_code) = upper(trim(p_code));
  if v_household is null then raise exception 'Código de família inválido.'; end if;

  insert into reminders (household_id, week_start, amount_cents, message, created_by)
  values (v_household, p_week_start, greatest(coalesce(p_amount_cents, 0), 0),
          nullif(trim(coalesce(p_message, '')), ''), p_member_id);
end;
$$;

-- Chefe marca o aviso como visto.
create or replace function public.app_mark_reminder_seen(
  p_code text,
  p_reminder_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household uuid;
begin
  select h.id into v_household from households h
  where upper(h.invite_code) = upper(trim(p_code));
  if v_household is null then raise exception 'Código de família inválido.'; end if;

  update reminders
  set seen_at = now()
  where id = p_reminder_id and household_id = v_household and seen_at is null;
end;
$$;

-- ---------- Permissões ----------
revoke all on function public.create_household(text, text) from public;
revoke all on function public.join_household(text, text, text) from public;
revoke all on function public.app_load(text) from public;
revoke all on function public.app_create_task(text, uuid, text, text, integer, date) from public;
revoke all on function public.app_set_task_status(text, uuid, uuid, text) from public;
revoke all on function public.app_decline_task(text, uuid, text) from public;
revoke all on function public.app_delete_task(text, uuid) from public;
revoke all on function public.app_pay_week(text, date, uuid[], integer, text, text) from public;
revoke all on function public.app_send_reminder(text, uuid, date, integer, text) from public;
revoke all on function public.app_mark_reminder_seen(text, uuid) from public;

grant execute on function public.create_household(text, text) to anon, authenticated;
grant execute on function public.join_household(text, text, text) to anon, authenticated;
grant execute on function public.app_load(text) to anon, authenticated;
grant execute on function public.app_create_task(text, uuid, text, text, integer, date) to anon, authenticated;
grant execute on function public.app_set_task_status(text, uuid, uuid, text) to anon, authenticated;
grant execute on function public.app_decline_task(text, uuid, text) to anon, authenticated;
grant execute on function public.app_delete_task(text, uuid) to anon, authenticated;
grant execute on function public.app_pay_week(text, date, uuid[], integer, text, text) to anon, authenticated;
grant execute on function public.app_send_reminder(text, uuid, date, integer, text) to anon, authenticated;
grant execute on function public.app_mark_reminder_seen(text, uuid) to anon, authenticated;

-- ---------- Família inicial (opcional) ----------
-- Cria a família com o código FAMILIA. Podes mudar o código no painel (Table editor → households).
insert into households (name, invite_code)
values ('A minha família', 'FAMILIA')
on conflict (invite_code) do nothing;
