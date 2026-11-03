import { session, json, fail } from '@/lib/server';
import { searchPlaces } from '@/lib/osm';

// Busca manual por nome do negócio e cidade, para adicionar um a um.
export async function POST(req) {
  const s = await session(req);
  if (s.error) return s.error;
  if (s.plan.id === 'expirado') return fail('Escolha um plano para buscar negócios.', 402);
  const { q, pais } = await req.json().catch(() => ({}));
  const query = String(q || '').trim().slice(0, 120);
  if (query.length < 3) return fail('Digite o nome do negócio e a cidade.');
  try {
    const list = await searchPlaces(query, /^[A-Z]{2}$/.test(pais || '') ? pais : 'BR');
    return json({ results: list.map(p => ({ ...p, sem_site: !p.site })) });
  } catch (e) {
    return fail('A busca não respondeu agora. Tente de novo em instantes.', 502);
  }
}
