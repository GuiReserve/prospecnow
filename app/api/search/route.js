import { session, json, fail, bump, limitMsg } from '@/lib/server';
import { textSearch } from '@/lib/places';

// Busca manual (como no Google Maps), usada no plano Essencial para adicionar negócios um a um.
export async function POST(req) {
  const s = await session(req);
  if (s.error) return s.error;
  const { q, pais } = await req.json().catch(() => ({}));
  const query = String(q || '').trim().slice(0, 120);
  if (query.length < 3) return fail('Digite o nome do negócio e a cidade.');
  if (!(await bump(s.user.id, 'details', 1, s.plan.details))) return fail(limitMsg(s.plan, 'details'), 402);
  try {
    const list = await textSearch(query, { lang: pais === 'PT' ? 'pt-PT' : 'pt-BR', region: pais === 'PT' ? 'PT' : 'BR' });
    return json({ results: list.slice(0, 10).map(p => ({ ...p, sem_site: !p.site })) });
  } catch (e) {
    await bump(s.user.id, 'details', -1, 1e9);
    return fail('O Google não respondeu. Tente de novo.', 502);
  }
}
