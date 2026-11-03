# ProspecNow

Prospecção pelo mapa: o agente varre cidades, regiões ou países no OpenStreetMap, mostra os negócios (com telefone primeiro) em um mapa 2D/3D e prepara a mensagem de WhatsApp de cada etapa (primeiro contato, acompanhamento em 4 dias, último em mais 7).

Feito com Next.js, Supabase (login e banco), MapLibre + OpenFreeMap (mapa), OpenStreetMap via Nominatim e Overpass (dados, sem chave), Anthropic (IA, opcional) e Stripe (cobrança).

## Rodar sem chaves (demonstração)

```bash
npm install
NEXT_PUBLIC_MOCK=1 npm run dev
```

Abre em http://localhost:3000 com dados de exemplo. Nunca ligue `NEXT_PUBLIC_MOCK` em produção.

## Colocar no ar (passo a passo)

Todas as chaves vão nas variáveis de ambiente da Vercel (Settings > Environment Variables). A lista completa está em `.env.example`.

### 1. Supabase (login e banco)
1. Crie um projeto em supabase.com.
2. Em **SQL Editor**, cole e rode o arquivo `supabase/schema.sql`.
3. Em **Project Settings > API**, copie `URL`, `anon key` e `service_role key` para `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`.
4. Em **Authentication > URL Configuration**, coloque o endereço do site em *Site URL* e adicione `https://SEU-SITE/app` em *Redirect URLs*.
5. (Opcional) Em **Authentication > Providers > Google**, ative o login com Google.

### 2. Mapa e dados (sem chave)
O mapa é do OpenFreeMap e os negócios vêm do OpenStreetMap (Nominatim para achar a cidade, Overpass para listar os negócios). Não há chave nem custo. Esses serviços públicos têm limite de uso justo: para muito volume, dá para trocar por um servidor Overpass próprio em `lib/osm.js`.
Se o banco foi criado antes desta mudança, rode `supabase/osm.sql` no SQL Editor.

### 3. IA (Anthropic)
Crie uma chave em console.anthropic.com e coloque em `ANTHROPIC_API_KEY`. Sem ela, o app funciona: o agente separa as cidades pelo texto digitado e as mensagens ficam no texto padrão.

### 4. Stripe (cobrança)
1. No painel do Stripe, deixe ligado o **modo de teste**.
2. Em **Desenvolvedores > Chaves de API**, copie a **chave secreta** (`sk_test_…`) para `STRIPE_SECRET_KEY`. Não precisa cadastrar produtos: o ProspecNow cria os preços dos planos sozinho na primeira assinatura.
3. Em **Desenvolvedores > Webhooks**, adicione o endpoint `https://SEU-SITE/api/billing/webhook` com os eventos `invoice.paid`, `customer.subscription.updated` e `customer.subscription.deleted`. Copie o **segredo de assinatura** (`whsec_…`) para `STRIPE_WEBHOOK_SECRET`.
4. Para testar, pague com o cartão de teste `4242 4242 4242 4242`, qualquer data futura e qualquer CVC.
5. Se o banco foi criado antes desta mudança, rode `supabase/stripe.sql` no SQL Editor.
6. Para cobrar de verdade, ative a conta no Stripe e troque as chaves de teste pelas de produção.

### 5. Vercel
Importe o repositório, cadastre as variáveis e publique. O plano Hobby da Vercel é para uso não comercial; para vender, use o Pro.

## Planos e limites

Definidos em `lib/plans.js`. Uma varredura = uma cidade com até 10 segmentos (uma consulta ao OpenStreetMap). A busca manual não tem limite.

| Plano | Preço | Varreduras/mês | Mensagens pela IA/mês |
|---|---|---|---|
| Teste (7 dias, sem cartão) | grátis | 1 | 50 |
| Essencial | R$ 29 | 0 (busca manual) | 100 |
| Pro | R$ 67 | 8 | 400 |
| Agência | R$ 147 | 25 | 1000 |

## Atribuição
Os dados são © colaboradores do OpenStreetMap (ODbL). O app mostra essa atribuição no mapa, na lista e no painel; mantenha-a.

## LGPD
`optout` guarda negócios que pediram para sair (são ignorados nas varreduras). Para adicionar um: `insert into optout (place_id) values ('...');` no SQL Editor.
