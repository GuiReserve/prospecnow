-- ProspecNow: rode este arquivo inteiro no SQL Editor do Supabase (uma vez).

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  plan text not null default 'trial',            -- essencial | pro | agencia (o teste é calculado por trial_ends_at)
  trial_ends_at timestamptz not null default (now() + interval '7 days'),
  paid_until timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_status text,
  settings jsonb not null default '{}'::jsonb,   -- nome, link do portfólio e textos das mensagens
  created_at timestamptz not null default now()
);

create table if not exists public.usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  month text not null,                           -- '2026-11'
  scans int not null default 0,
  details int not null default 0,
  ai int not null default 0,
  primary key (user_id, month)
);

-- Dados dos negócios: OpenStreetMap (licença ODbL, pode guardar com atribuição).
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  place_id text not null,                        -- osm-n123 (nó), osm-w123 (via)
  nome text,
  telefone text,
  digits text,
  site text,
  endereco text,
  instagram text,
  horario text,
  segmento text,
  cidade text,
  pais text default 'BR',
  lat double precision,
  lng double precision,
  coords_at timestamptz,
  sem_site boolean,
  status text not null default 'novo',           -- novo | auto | conv | fechou | nao | fim
  contacts date[] not null default '{}',
  note text not null default '',
  photo_url text,
  created_at timestamptz not null default now(),
  unique (user_id, place_id)
);
create index if not exists leads_user_idx on public.leads(user_id);

create table if not exists public.optout (
  place_id text primary key,                     -- negócios que pediram para sair
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.usage enable row level security;
alter table public.leads enable row level security;
alter table public.optout enable row level security;

drop policy if exists "perfil proprio" on public.profiles;
create policy "perfil proprio" on public.profiles for select using (auth.uid() = id);
drop policy if exists "perfil atualiza" on public.profiles;
create policy "perfil atualiza" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
-- o usuário só pode mudar o próprio nome e as configurações; plano e cobrança só pelo servidor
revoke update on public.profiles from authenticated;
grant update (full_name, settings) on public.profiles to authenticated;

drop policy if exists "uso proprio" on public.usage;
create policy "uso proprio" on public.usage for select using (auth.uid() = user_id);

drop policy if exists "leads proprios" on public.leads;
create policy "leads proprios" on public.leads for select using (auth.uid() = user_id);
drop policy if exists "leads atualiza" on public.leads;
create policy "leads atualiza" on public.leads for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "leads apaga" on public.leads;
create policy "leads apaga" on public.leads for delete using (auth.uid() = user_id);
revoke update on public.leads from authenticated;
grant update (status, contacts, note, photo_url) on public.leads to authenticated;

-- cria o perfil quando alguém se cadastra
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- soma uso de forma atômica (chamado só pelo servidor)
create or replace function public.bump_usage(p_user uuid, p_month text, p_field text, p_amount int, p_limit int)
returns boolean language plpgsql security definer set search_path = public as $$
declare cur int;
begin
  if p_field not in ('scans', 'details', 'ai') then raise exception 'campo inválido'; end if;
  insert into public.usage (user_id, month) values (p_user, p_month) on conflict do nothing;
  execute format('select %I from public.usage where user_id=$1 and month=$2 for update', p_field) into cur using p_user, p_month;
  if cur + p_amount > p_limit then return false; end if;
  execute format('update public.usage set %I = %I + $3 where user_id=$1 and month=$2', p_field, p_field) using p_user, p_month, p_amount;
  return true;
end; $$;
revoke execute on function public.bump_usage from public, anon, authenticated;

-- colunas do Stripe (seguro rodar de novo)
alter table public.profiles add column if not exists stripe_customer_id text;
alter table public.profiles add column if not exists stripe_subscription_id text;
alter table public.profiles add column if not exists stripe_status text;

-- travas de segurança

-- tamanho e formato dos campos que o próprio usuário consegue editar
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
alter table public.leads drop constraint if exists leads_place_id_formato;
alter table public.leads add constraint leads_place_id_formato check (place_id ~ '^[A-Za-z0-9_-]{1,300}$') not valid;

-- ninguém de fora chama as funções internas
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.bump_usage(uuid, text, text, int, int) from public, anon, authenticated;

-- usuários logados não inserem nem apagam direto nas tabelas de controle; só o servidor
revoke insert, delete, truncate on public.profiles from anon, authenticated;
revoke insert, update, delete, truncate on public.usage from anon, authenticated;
revoke insert, truncate on public.leads from anon, authenticated;
revoke all on public.optout from anon, authenticated;
revoke all on public.profiles, public.usage, public.leads from anon;

-- colunas do OpenStreetMap (seguro rodar de novo)
alter table public.leads add column if not exists nome text;
alter table public.leads add column if not exists telefone text;
alter table public.leads add column if not exists digits text;
alter table public.leads add column if not exists site text;
alter table public.leads add column if not exists endereco text;
alter table public.leads add column if not exists instagram text;
alter table public.leads add column if not exists horario text;

alter table public.leads drop constraint if exists leads_dados_tamanho;
alter table public.leads add constraint leads_dados_tamanho check (
  coalesce(length(nome),0) <= 120 and coalesce(length(telefone),0) <= 40 and coalesce(length(digits),0) <= 15
  and coalesce(length(site),0) <= 300 and coalesce(length(endereco),0) <= 200
  and coalesce(length(instagram),0) <= 120 and coalesce(length(horario),0) <= 120
) not valid;
