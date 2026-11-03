-- Rode uma vez no SQL Editor se o banco foi criado com a versão antiga (Asaas).
alter table public.profiles add column if not exists stripe_customer_id text;
alter table public.profiles add column if not exists stripe_subscription_id text;
alter table public.profiles add column if not exists stripe_status text;
