import { session, json, fail, bump, limitMsg, db, MOCK } from '@/lib/server';
import { placeDetails } from '@/lib/places';

export async function POST(req) {
  const s = await session(req);
  if (s.error) return s.error;
  const { place_id, pais } = await req.json().catch(() => ({}));
  if (!place_id) return fail('Contato inválido.');
  if (!(await bump(s.user.id, 'details', 1, s.plan.details))) return fail(limitMsg(s.plan, 'details'), 402);
  try {
    const d = await placeDetails(String(place_id), { lang: pais === 'PT' ? 'pt-PT' : 'pt-BR' });
    if (!MOCK && d.lat != null) {
      await db().from('leads').update({ lat: d.lat, lng: d.lng, coords_at: new Date().toISOString(), sem_site: !d.site }).eq('user_id', s.user.id).eq('place_id', place_id);
    }
    return json(d);
  } catch (e) {
    await bump(s.user.id, 'details', -1, 1e9);
    return fail('Não consegui abrir esse contato agora. Tente de novo.', 502);
  }
}
