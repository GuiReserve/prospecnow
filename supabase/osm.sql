-- ProspecNow sem Google: guarda os dados do OpenStreetMap junto do contato. Pode rodar mais de uma vez.
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
