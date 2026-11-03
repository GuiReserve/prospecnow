# ProspecNow

Prospecção de negócios locais pelo mapa. Você diz a cidade (ou região, ou país), o app busca os negócios no OpenStreetMap, mostra tudo num mapa 2D/3D e abre o WhatsApp com a mensagem pronta, uma conversa por vez.

Sem conta, sem banco de dados e sem chaves: o site é estático e tudo roda no navegador. Os contatos ficam no armazenamento local do navegador, com opção de baixar e restaurar um backup.

## Rodar

```
npm install
npm run dev
```

## Publicar

Conecte o repositório na Vercel (plano gratuito serve). Não há variáveis de ambiente obrigatórias. Opcional: `NEXT_PUBLIC_CONTATO_EMAIL` para o e-mail exibido na política de privacidade.

## Dados e mapa

- Mapa: OpenFreeMap (MapLibre). Dados: © colaboradores do OpenStreetMap (licença ODbL), via Nominatim (cidades e busca por nome) e Overpass (negócios).
- As consultas saem do navegador de quem usa, porque os servidores públicos bloqueiam a nuvem. Eles têm limite de uso justo; em caso de muito volume, dá para apontar para um servidor Overpass próprio em `lib/osm.js`.
- O envio de mensagens é sempre manual (link `wa.me`), sem disparo em massa.
