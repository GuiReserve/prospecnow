-- Troca do Stripe pelo Asaas. Rode uma vez no SQL Editor do Supabase (seguro rodar de novo).
alter table public.profiles add column if not exists asaas_link_id text;
alter table public.profiles add column if not exists asaas_link_plan text;
alter table public.profiles add column if not exists asaas_subscription_id text;
alter table public.profiles add column if not exists asaas_status text;
create index if not exists profiles_asaas_link on public.profiles (asaas_link_id);
create index if not exists profiles_asaas_sub on public.profiles (asaas_subscription_id);
alter table public.profiles drop column if exists stripe_customer_id;
alter table public.profiles drop column if exists stripe_subscription_id;
alter table public.profiles drop column if exists stripe_status;
