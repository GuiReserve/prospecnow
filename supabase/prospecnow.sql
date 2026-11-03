-- ProspecNow: rode este arquivo inteiro no SQL Editor do Supabase. Pode rodar de novo sem problema.
-- Não usa a chave secreta (service_role): as regras ficam aqui no banco.
-- No fim, ele mostra o TOKEN para colar no webhook do Asaas (só na primeira vez).

create extension if not exists pgcrypto with schema extensions;

/* ---------------- tabelas ---------------- */
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  plan text not null default 'trial',
  trial_ends_at timestamptz not null default now(),   -- sem teste grátis: começa com 7 dias por R$ 10
  paid_until timestamptz,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.profiles add column if not exists asaas_link_id text;
alter table public.profiles add column if not exists asaas_link_plan text;
alter table public.profiles add column if not exists asaas_subscription_id text;
alter table public.profiles add column if not exists asaas_status text;
alter table public.profiles drop column if exists stripe_customer_id;
alter table public.profiles drop column if exists stripe_subscription_id;
alter table public.profiles drop column if exists stripe_status;
create unique index if not exists profiles_asaas_link_unico on public.profiles (asaas_link_id) where asaas_link_id is not null;
create index if not exists profiles_asaas_sub on public.profiles (asaas_subscription_id);

create table if not exists public.usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  month text not null,
  scans int not null default 0,
  primary key (user_id, month)
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  place_id text not null,
  segmento text,
  cidade text,
  pais text default 'BR',
  lat double precision,
  lng double precision,
  sem_site boolean,
  status text not null default 'novo',
  contacts date[] not null default '{}',
  note text not null default '',
  photo_url text,
  created_at timestamptz not null default now(),
  unique (user_id, place_id)
);
alter table public.leads add column if not exists nome text;
alter table public.leads add column if not exists telefone text;
alter table public.leads add column if not exists digits text;
alter table public.leads add column if not exists site text;
alter table public.leads add column if not exists endereco text;
alter table public.leads add column if not exists instagram text;
alter table public.leads add column if not exists horario text;
create index if not exists leads_user_idx on public.leads (user_id);

-- área privada: não aparece na API do Supabase
create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;
create table if not exists app_private.config (k text primary key, v text not null);
create table if not exists app_private.pagamentos (id text primary key, criado timestamptz not null default now());  -- cada pagamento conta uma vez só
alter table public.profiles alter column trial_ends_at set default now();

/* ---------------- quem pode ver e mudar o quê ---------------- */
alter table public.profiles enable row level security;
alter table public.usage enable row level security;
alter table public.leads enable row level security;

drop policy if exists "perfil proprio" on public.profiles;
create policy "perfil proprio" on public.profiles for select using (auth.uid() = id);
drop policy if exists "perfil atualiza" on public.profiles;
create policy "perfil atualiza" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "uso proprio" on public.usage;
create policy "uso proprio" on public.usage for select using (auth.uid() = user_id);
drop policy if exists "leads proprios" on public.leads;
create policy "leads proprios" on public.leads for select using (auth.uid() = user_id);
drop policy if exists "leads atualiza" on public.leads;
create policy "leads atualiza" on public.leads for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "leads apaga" on public.leads;
create policy "leads apaga" on public.leads for delete using (auth.uid() = user_id);

revoke all on public.profiles, public.usage, public.leads from anon;
revoke insert, update, delete, truncate on public.profiles, public.usage from authenticated;
revoke insert, update, truncate on public.leads from authenticated;
grant select on public.profiles, public.usage, public.leads to authenticated;
grant update (full_name, settings) on public.profiles to authenticated;   -- plano e cobrança nunca pelo navegador
grant update (status, contacts, note, photo_url) on public.leads to authenticated;
grant delete on public.leads to authenticated;

-- travas de tamanho e formato
alter table public.profiles drop constraint if exists profiles_settings_tamanho;
alter table public.profiles add constraint profiles_settings_tamanho check (pg_column_size(settings) < 20000) not valid;
alter table public.profiles drop constraint if exists profiles_nome_tamanho;
alter table public.profiles add constraint profiles_nome_tamanho check (full_name is null or length(full_name) <= 120) not valid;
alter table public.leads drop constraint if exists leads_status_valido;
alter table public.leads add constraint leads_status_valido check (status in ('novo','auto','conv','fechou','nao','fim')) not valid;
alter table public.leads drop constraint if exists leads_nota_tamanho;
alter table public.leads add constraint leads_nota_tamanho check (length(note) <= 2000) not valid;
alter table public.leads drop constraint if exists leads_foto_https;
alter table public.leads add constraint leads_foto_https check (photo_url is null or (photo_url ~ '^https://' and length(photo_url) <= 1000)) not valid;
alter table public.leads drop constraint if exists leads_contatos_qtd;
alter table public.leads add constraint leads_contatos_qtd check (coalesce(array_length(contacts, 1), 0) <= 20) not valid;

/* ---------------- perfil criado no cadastro ---------------- */
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, left(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''), 120))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
-- quem já tinha conta e ficou sem perfil
insert into public.profiles (id, email, full_name)
select id, email, left(coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', ''), 120) from auth.users
on conflict (id) do nothing;

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

create or replace function app_private.novo_token_webhook() returns text
language plpgsql set search_path = public, extensions as $$
declare t text := encode(extensions.gen_random_bytes(24), 'hex');
begin
  insert into app_private.config (k, v) values ('asaas_webhook_hash', encode(extensions.digest(t, 'sha256'), 'hex'))
  on conflict (k) do update set v = excluded.v;
  return t;
end $$;

/* ---------------- quem pode chamar as funções ---------------- */
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.usar_varredura(), public.salvar_contatos(jsonb), public.registrar_link(text, text), public.marcar_cancelando() from public, anon;
grant execute on function public.usar_varredura(), public.salvar_contatos(jsonb), public.registrar_link(text, text), public.marcar_cancelando() to authenticated;
revoke execute on function public.asaas_evento(text, text, jsonb, jsonb) from public;
grant execute on function public.asaas_evento(text, text, jsonb, jsonb) to anon, authenticated;
revoke execute on function app_private.novo_token_webhook() from public, anon, authenticated;
drop function if exists public.bump_usage(uuid, text, text, int, int);

/* ---------------- token do webhook do Asaas ---------------- */
-- Na primeira vez, aparece um token abaixo: copie e cole no campo "Token de autenticação" do webhook no Asaas.
-- Para gerar outro depois: select app_private.novo_token_webhook();
select case when exists (select 1 from app_private.config where k = 'asaas_webhook_hash')
            then 'já configurado (para gerar outro: select app_private.novo_token_webhook();)'
            else app_private.novo_token_webhook() end as token_para_o_asaas;
