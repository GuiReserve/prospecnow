-- ProspecNow: travas extras no banco. Pode rodar mais de uma vez.

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
