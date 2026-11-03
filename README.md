# ProspecNow

Prospecção de negócios locais pelo mapa: varre cidades no OpenStreetMap, mostra tudo num mapa 2D/3D e abre o WhatsApp com a mensagem pronta, uma conversa por vez (sem disparo em massa).

Feito com Next.js (Vercel), Supabase (login e banco), Asaas (cobrança), MapLibre + OpenFreeMap (mapa) e OpenStreetMap via Nominatim/Overpass (dados, sem chave).

**Não usa a chave secreta do Supabase.** As regras (quem vê o quê, limite de varreduras, liberação do plano) ficam no banco, em `supabase/prospecnow.sql`.

## Configurar

1. **Supabase:** no SQL Editor, rode `supabase/prospecnow.sql` inteiro (bancos criados antes: rode também `supabase/semana.sql`). No fim aparece um **token**: guarde para o passo 3.
   Em Authentication > URL Configuration: Site URL `https://SEU-SITE` e Redirect URL `https://SEU-SITE/**`.
2. **Vercel (Environment Variables):** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (chave publishable), `NEXT_PUBLIC_SITE_URL`, `ASAAS_ENV` (`sandbox` ou `production`) e `ASAAS_API_KEY` (marque como Sensitive).
3. **Asaas:** em Integrações > Webhooks, URL `https://SEU-SITE/api/billing/webhook`, cole o token do passo 1 em "Token de autenticação" e marque os eventos de Cobranças e de Assinaturas.

## Planos

| Plano | Preço | Varreduras de cidade por mês |
|---|---|---|
| 7 dias (pagamento único, não renova) | R$ 10 | 5 |
| Essencial | R$ 29 | busca manual |
| Pro | R$ 67 | 20 |
| Agência | R$ 147 | 60 |

Para mudar os números, altere `lib/plans.js` e a função `limite_varreduras` no SQL.
