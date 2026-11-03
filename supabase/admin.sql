-- Conta admin ilimitada (dono). Rode no SQL Editor do Supabase DEPOIS de criar a conta no site.
-- 1) atualiza as regras para reconhecer o plano 'admin'; 2) libera o e-mail abaixo.
create or replace function public.plano_atual(p public.profiles) returns text language sql stable as $$
  select case when p.paid_until > now() and p.plan in ('essencial','pro','agencia','semana','admin') then p.plan
              when p.trial_ends_at > now() then 'trial' else 'expirado' end
$$;
create or replace function public.limite_varreduras(plano text) returns int language sql immutable as $$
  select case plano when 'trial' then 3 when 'semana' then 5 when 'pro' then 20 when 'agencia' then 60 when 'admin' then 100000 else 0 end
$$;
update public.profiles set plan = 'admin', paid_until = '2099-12-31'
where lower(email) = lower('guilhermetorres35056@gmail.com');   -- troque pelo e-mail da sua conta
select email, plan, paid_until from public.profiles where plan = 'admin';
