// O MapLibre 6 carrega o "worker" do mapa de um arquivo à parte. Copiamos para public/ para servir do próprio site.
import { mkdirSync, copyFileSync } from 'node:fs';
const from = 'node_modules/maplibre-gl/dist/', to = 'public/maplibre/';
mkdirSync(to, { recursive: true });
for (const f of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) copyFileSync(from + f, to + f);
