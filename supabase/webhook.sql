-- Atualização: validação do webhook (token conferido antes, valor pago x preço do plano). Pode rodar de novo.
create or replace function public.preco_plano(plano text) returns numeric language sql immutable as $$
  select case plano when 'semana' then 10 when 'essencial' then 29 when 'pro' then 67 when 'agencia' then 147 else null end
$$;

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
    -- o valor pago (vindo da API do Asaas) precisa cobrir o preço do plano
    if coalesce(nullif(p_pag->>'value', '')::numeric, 0) < public.preco_plano(pl) then
      return json_build_object('ok', true, 'achou', true, 'valor_insuficiente', true);
    end if;
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

-- o site confere o token antes de consultar a API do Asaas
create or replace function public.asaas_token_ok(p_token text) returns boolean
language sql security definer stable set search_path = public, extensions as $$
  select exists (select 1 from app_private.config where k = 'asaas_webhook_hash' and p_token is not null
                 and v = encode(extensions.digest(p_token, 'sha256'), 'hex'))
$$;

revoke execute on function public.asaas_token_ok(text) from public;
grant execute on function public.asaas_token_ok(text) to anon, authenticated;
select 'atualizado' as resultado;
