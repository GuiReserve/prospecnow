import { scanCity, searchPlaces, findArea } from '@/lib/osm';
export const maxDuration = 60;
// Rota temporária de teste (só no preview). Será apagada.
export async function GET(req) {
  const u = new URL(req.url);
  if (!process.env.DIAG_TOKEN || u.searchParams.get('t') !== process.env.DIAG_TOKEN) return new Response('no', { status: 404 });
  const out = {};
  const t0 = Date.now();
  try { out.area = await findArea(u.searchParams.get('c') || 'Cajamar, SP, Brasil', 'BR'); } catch (e) { out.areaErr = e.message; }
  try {
    const r = await scanCity(u.searchParams.get('c') || 'Cajamar, SP, Brasil', (u.searchParams.get('s') || 'Barbearia,Pizzaria,Restaurante,Oficina mecânica,Academia').split(','), 'BR');
    const by = {}; r.forEach(x => { by[x.segmento] = (by[x.segmento] || 0) + 1; });
    out.scan = { total: r.length, comTelefone: r.filter(x => x.digits).length, comSite: r.filter(x => x.site).length, porSegmento: by, amostra: r.slice(0, 6).map(x => ({ id: x.place_id, nome: x.nome, seg: x.segmento, tel: x.telefone, d: x.digits, site: x.site, end: x.endereco })) };
  } catch (e) { out.scanErr = String(e.message); }
  out.ms1 = Date.now() - t0;
  try { const s = await searchPlaces(u.searchParams.get('q') || 'pizzaria, Jundiaí', 'BR'); out.busca = s.slice(0, 4).map(x => ({ id: x.place_id, nome: x.nome, tel: x.telefone, cidade: x.cidade })); } catch (e) { out.buscaErr = e.message; }
  out.ms = Date.now() - t0;
  return Response.json(out);
}
