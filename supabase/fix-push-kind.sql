-- ============================================================
--  FlowTask — acrescentar a coluna "kind" às notificações
--
--  Esta coluna distingue:
--    'web' -> notificações do browser / PWA instalada
--    'fcm' -> notificações do APK Android (Firebase)
--
--  É seguro correr: não apaga dados e pode ser corrido várias vezes.
--
--  COMO USAR:
--    Supabase -> SQL Editor -> New query -> colar tudo -> Run
-- ============================================================

-- 1. Acrescenta a coluna (os aparelhos que já existem ficam como 'web')
alter table public.push_subscriptions
  add column if not exists kind text not null default 'web';

-- 2. Garante que só aceita os dois valores válidos
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'push_subscriptions_kind_check'
  ) then
    alter table public.push_subscriptions
      add constraint push_subscriptions_kind_check check (kind in ('web', 'fcm'));
  end if;
end $$;

-- 3. As chaves Web Push passam a ser opcionais
--    (o APK não usa p256dh nem auth — só o token)
alter table public.push_subscriptions alter column p256dh set default '';
alter table public.push_subscriptions alter column auth set default '';

-- 4. Atualiza a função para aceitar o tipo de aparelho
create or replace function public.app_save_push_subscription(
  p_code text,
  p_member_id uuid,
  p_role text,
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_kind text default 'web'
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
  if p_role not in ('chefe', 'trabalhador') then raise exception 'Papel inválido.'; end if;
  if p_kind not in ('web', 'fcm') then raise exception 'Tipo de notificação inválido.'; end if;

  -- Validação: evita guardar registos que nunca conseguiriam receber notificações.
  if p_endpoint is null or length(trim(p_endpoint)) < 40 then
    raise exception 'Subscrição inválida: endpoint demasiado curto.';
  end if;
  if p_kind = 'web' then
    if p_endpoint not like 'http%' then
      raise exception 'Subscrição web inválida: endpoint deve ser um URL.';
    end if;
    if length(coalesce(p_p256dh, '')) < 80 or length(coalesce(p_auth, '')) < 20 then
      raise exception 'Subscrição web inválida: chaves em falta.';
    end if;
  end if;

  insert into push_subscriptions (household_id, member_id, role, kind, endpoint, p256dh, auth)
  values (
    v_household, p_member_id, p_role, p_kind, p_endpoint,
    coalesce(p_p256dh, ''), coalesce(p_auth, '')
  )
  on conflict (endpoint) do update
    set household_id = excluded.household_id,
        member_id = excluded.member_id,
        role = excluded.role,
        kind = excluded.kind,
        p256dh = excluded.p256dh,
        auth = excluded.auth;
end;
$$;

-- 5. Permissões (a app usa a chave publishable)
revoke all on function public.app_save_push_subscription(text, uuid, text, text, text, text, text) from public;
grant execute on function public.app_save_push_subscription(text, uuid, text, text, text, text, text) to anon, authenticated;

-- 6. Limpeza: remove registos inválidos (endpoints falsos ou chaves más)
--    Uma subscrição web válida tem um endpoint https:// longo e chaves reais.
--    Um token FCM é longo e não tem http.
delete from public.push_subscriptions
where
  length(endpoint) < 40
  or (
    kind = 'web'
    and (
      endpoint not like 'http%'
      or length(p256dh) < 80
      or length(auth) < 20
    )
  );

-- 7. Confirmação
select
  (select count(*) from public.push_subscriptions) as aparelhos_validos,
  (select count(*) from public.push_subscriptions where kind = 'web') as browsers,
  (select count(*) from public.push_subscriptions where kind = 'fcm') as apks;

