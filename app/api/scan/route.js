import { session, json, fail, bump, limitMsg, db, MOCK, validPlaceId, leadCount, MAX_LEADS } from '@/lib/server';
import { scanCity } from '@/lib/osm';
import { MAX_SEGMENTS } from '@/lib/plans';
import { leadRow } from '@/lib/leadrow';

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
  const jaTem = await leadCount(s.user.id);
  if (jaTem >= MAX_LEADS) return fail(`Você chegou ao limite de ${MAX_LEADS} contatos. Remova alguns antes de varrer de novo.`, 400);
  if (!(await bump(s.user.id, 'scans', 1, s.plan.scans))) return fail(limitMsg(s.plan, 'scans'), 402);

  let results;
  try {
    results = (await scanCity(busca, segmentos, pais)).filter(p => validPlaceId(p.place_id)).map(p => ({ ...p, cidade, pais, sem_site: !p.site }));
  } catch (e) {
    await bump(s.user.id, 'scans', -1, 1e9); // devolve a varredura
    return fail('O serviço de mapas não respondeu (' + String(e.message || '').slice(0, 80) + '). A varredura não foi descontada; tente de novo em instantes.', 502);
  }

  let filtered = results;
  if (!MOCK && results.length) {
    const { data: opt } = await db().from('optout').select('place_id').in('place_id', results.map(r => r.place_id));
    const out = new Set((opt || []).map(o => o.place_id));
    filtered = results.filter(r => !out.has(r.place_id)).slice(0, Math.max(0, MAX_LEADS - jaTem));
    const rows = filtered.map(r => leadRow(s.user.id, r));
    const { error } = await db().from('leads').upsert(rows, { onConflict: 'user_id,place_id', ignoreDuplicates: true });
    if (error) return fail('Não consegui salvar os contatos. Tente de novo.', 500);
  }
  return json({ cidade, pais, total: filtered.length, comTelefone: filtered.filter(r => r.digits).length, semSite: filtered.filter(r => r.sem_site).length, results: filtered });
}
