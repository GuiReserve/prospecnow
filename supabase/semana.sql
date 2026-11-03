-- Atualização: 7 dias por R$ 10 e cada pagamento contado uma vez só. Pode rodar de novo sem problema.
create table if not exists app_private.pagamentos (id text primary key, criado timestamptz not null default now());
alter table app_private.pagamentos enable row level security;
alter table public.profiles alter column trial_ends_at set default now();

/* ---------------- planos (mesmos números de lib/plans.js) ---------------- */
create or replace function public.plano_atual(p public.profiles) returns text language sql stable as $$
  select case when p.paid_until > now() and p.plan in ('essencial','pro','agencia','semana') then p.plan
              when p.trial_ends_at > now() then 'trial' else 'expirado' end
$$;
create or replace function public.limite_varreduras(plano text) returns int language sql immutable as $$
  select case plano when 'trial' then 3 when 'semana' then 5 when 'pro' then 20 when 'agencia' then 60 else 0 end
$$;

-- gasta 1 varredura (1 cidade) do mês, se o plano permitir
create or replace function public.usar_varredura() returns json
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); pr public.profiles; pl text; lim int; usado int;
        mes text := to_char(now() at time zone 'UTC', 'YYYY-MM');
begin
  if uid is null then raise exception 'Faça login de novo.'; end if;
  select * into pr from public.profiles where id = uid;
  if not found then raise exception 'Perfil não encontrado.'; end if;
  pl := public.plano_atual(pr); lim := public.limite_varreduras(pl);
  insert into public.usage (user_id, month) values (uid, mes) on conflict do nothing;
  select scans into usado from public.usage where user_id = uid and month = mes for update;
  if usado >= lim then return json_build_object('ok', false, 'plano', pl, 'usado', usado, 'limite', lim); end if;
  update public.usage set scans = scans + 1 where user_id = uid and month = mes;
  return json_build_object('ok', true, 'plano', pl, 'usado', usado + 1, 'limite', lim);
end $$;

-- salva negócios achados (varredura ou busca manual), sem repetir e até 10 mil por conta
create or replace function public.salvar_contatos(p_rows jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); pr public.profiles; ja int; n int;
begin
  if uid is null then raise exception 'Faça login de novo.'; end if;
  select * into pr from public.profiles where id = uid;
  if public.plano_atual(pr) = 'expirado' then raise exception 'Seu acesso não está ativo. Ative 7 dias por R$ 10 ou escolha um plano.'; end if;
  if jsonb_typeof(p_rows) is distinct from 'array' then raise exception 'Formato inválido.'; end if;
  select count(*) into ja from public.leads where user_id = uid;
  insert into public.leads (user_id, place_id, nome, telefone, digits, site, endereco, instagram, horario, segmento, cidade, pais, lat, lng, sem_site, status, contacts, note)
  select uid, x->>'place_id', left(x->>'nome', 120), left(x->>'telefone', 40), left(regexp_replace(coalesce(x->>'digits', ''), '\D', '', 'g'), 15),
         left(x->>'site', 300), left(x->>'endereco', 200), left(x->>'instagram', 120), left(x->>'horario', 120),
         left(coalesce(x->>'segmento', 'Outros'), 40), left(x->>'cidade', 80), upper(left(coalesce(x->>'pais', 'BR'), 2)),
         (x->>'lat')::double precision, (x->>'lng')::double precision, coalesce(x->>'site', '') = '',
         case when x->>'status' in ('novo','auto','conv','fechou','nao','fim') then x->>'status' else 'novo' end,
         coalesce((select array_agg(d::date) from (select d from jsonb_array_elements_text(case when jsonb_typeof(x->'contacts') = 'array' then x->'contacts' else '[]'::jsonb end) t(d) where d ~ '^\d{4}-\d{2}-\d{2}$' limit 3) z), '{}'),
         left(coalesce(x->>'note', ''), 2000)
  from (select x from jsonb_array_elements(p_rows) x limit least(1000, greatest(0, 10000 - ja))) r
  where x->>'place_id' ~ '^[A-Za-z0-9_-]{1,200}$'
    and x->>'lat' ~ '^-?\d{1,3}(\.\d+)?$' and x->>'lng' ~ '^-?\d{1,3}(\.\d+)?$'
  on conflict (user_id, place_id) do nothing;
  get diagnostics n = row_count;
  return n;
end $$;

/* ---------------- cobrança pelo Asaas ---------------- */
-- guarda o link de pagamento que o site acabou de criar para esta pessoa
create or replace function public.registrar_link(p_link text, p_plano text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Faça login de novo.'; end if;
  if p_plano not in ('essencial','pro','agencia','semana') or p_link !~ '^[A-Za-z0-9_-]{4,100}$' then raise exception 'Dados inválidos.'; end if;
  update public.profiles set asaas_link_id = p_link, asaas_link_plan = p_plano where id = auth.uid();
end $$;

create or replace function public.marcar_cancelando() returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set asaas_status = 'canceling' where id = auth.uid() and asaas_subscription_id is not null;
end $$;

-- recebe o aviso do Asaas; só aceita com o token do webhook (guardado aqui só como hash)
create or replace function public.asaas_evento(p_token text, p_evento text, p_pag jsonb, p_ass jsonb) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare h text; pr public.profiles; pl text; antiga text;
begin
  select v into h from app_private.config where k = 'asaas_webhook_hash';
  if h is null or p_token is null or encode(extensions.digest(p_token, 'sha256'), 'hex') <> h then
    raise exception 'não autorizado' using errcode = '28000';
  end if;
  if p_evento in ('PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED') and p_pag is not null then
    -- no cartão chegam CONFIRMED e, semanas depois, RECEIVED do mesmo pagamento: só o primeiro vale
    if p_pag->>'id' is not null then
      insert into app_private.pagamentos (id) values (p_pag->>'id') on conflict do nothing;
      if not found then return json_build_object('ok', true, 'repetido', true); end if;
    end if;
    if p_pag->>'subscription' is not null then
      select * into pr from public.profiles where asaas_subscription_id = p_pag->>'subscription' limit 1;
    end if;
    if pr.id is null and p_pag->>'paymentLink' is not null then
      select * into pr from public.profiles where asaas_link_id = p_pag->>'paymentLink' limit 1;
    end if;
    if pr.id is null then return json_build_object('ok', true, 'achou', false); end if;
    pl := case when pr.asaas_link_plan in ('essencial','pro','agencia','semana') then pr.asaas_link_plan else pr.plan end;
    if pl not in ('essencial','pro','agencia','semana') then return json_build_object('ok', true, 'achou', false); end if;
    if pl = 'semana' then   -- 7 dias, pagamento único
      update public.profiles set plan = 'semana', paid_until = greatest(coalesce(paid_until, now()), now()) + interval '7 days' where id = pr.id;
      return json_build_object('ok', true, 'achou', true);
    end if;
    if p_pag->>'subscription' is not null and pr.asaas_subscription_id is not null and pr.asaas_subscription_id <> p_pag->>'subscription' then
      antiga := pr.asaas_subscription_id;   -- troca de plano: o site encerra a assinatura anterior
    end if;
    update public.profiles set plan = pl, asaas_status = 'active', paid_until = greatest(coalesce(paid_until, now()), now()) + interval '31 days',
      asaas_subscription_id = coalesce(p_pag->>'subscription', asaas_subscription_id)
    where id = pr.id;
    return json_build_object('ok', true, 'achou', true, 'cancelar', antiga);
  end if;
  if p_evento in ('SUBSCRIPTION_DELETED', 'SUBSCRIPTION_INACTIVATED') and p_ass->>'id' is not null then
    update public.profiles set asaas_status = 'canceled' where asaas_subscription_id = p_ass->>'id';
  end if;
  return json_build_object('ok', true);
end $$;

select 'atualizado' as resultado;
