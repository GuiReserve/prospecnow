import { session, json, fail, bump, limitMsg, db, MOCK } from '@/lib/server';
import { textSearch } from '@/lib/places';
import { MAX_SEGMENTS } from '@/lib/plans';

export const maxDuration = 60;

export async function POST(req) {
  const s = await session(req);
  if (s.error) return s.error;
  const body = await req.json().catch(() => ({}));
  const busca = String(body.busca || '').trim().slice(0, 120);
  const cidade = String(body.cidade || busca.split(',')[0]).trim().slice(0, 80);
  const pais = /^[A-Z]{2}$/.test(String(body.pais || '')) ? body.pais : 'BR';
  const segmentos = (Array.isArray(body.segmentos) ? body.segmentos : []).map(x => String(x).trim().slice(0, 40)).filter(Boolean).slice(0, MAX_SEGMENTS);
  if (!busca) return fail('Informe a cidade.');
  if (!segmentos.length) return fail('Escolha pelo menos um segmento.');
  if (s.plan.scans <= 0) return fail(limitMsg(s.plan, 'scans'), 402);
  if (!(await bump(s.user.id, 'scans', 1, s.plan.scans))) return fail(limitMsg(s.plan, 'scans'), 402);

  const lang = pais === 'PT' ? 'pt-PT' : 'pt-BR';
  const results = [];
  const seen = new Set();
  let erros = 0;
  for (const seg of segmentos) {
    try {
      const list = await textSearch(`${seg} em ${busca}`, { lang, region: pais });
      for (const p of list) {
        if (seen.has(p.place_id)) continue;
        seen.add(p.place_id);
        results.push({ ...p, segmento: seg, cidade, sem_site: !p.site });
      }
    } catch (e) { erros++; }
  }
  if (erros === segmentos.length) {
    await bump(s.user.id, 'scans', -1, 1e9); // devolve a varredura
    return fail('O Google não respondeu. A varredura não foi descontada; tente de novo.', 502);
  }

  let filtered = results;
  if (!MOCK && results.length) {
    const { data: opt } = await db().from('optout').select('place_id').in('place_id', results.map(r => r.place_id));
    const out = new Set((opt || []).map(o => o.place_id));
    filtered = results.filter(r => !out.has(r.place_id));
    const now = new Date().toISOString();
    const rows = filtered.map(r => ({ user_id: s.user.id, place_id: r.place_id, segmento: r.segmento, cidade, pais, lat: r.lat, lng: r.lng, coords_at: now, sem_site: r.sem_site }));
    const { error } = await db().from('leads').upsert(rows, { onConflict: 'user_id,place_id' });
    if (error) return fail('Não consegui salvar os contatos: ' + error.message, 500);
  }
  return json({ cidade, pais, total: filtered.length, semSite: filtered.filter(r => r.sem_site).length, results: filtered, erros });
}
