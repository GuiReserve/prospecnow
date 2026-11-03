import { session, json, db, MOCK } from '@/lib/server';

// O Google permite guardar a localização por até 30 dias. Esta rota atualiza as vencidas
// pedindo só a localização (categoria mais barata), sem descontar da cota do cliente.
export async function POST(req) {
  const s = await session(req);
  if (s.error) return s.error;
  if (MOCK) return json({ atualizados: 0 });
  const limite = new Date(Date.now() - 29 * 864e5).toISOString();
  const { data } = await db().from('leads').select('id,place_id').eq('user_id', s.user.id).lt('coords_at', limite).limit(60);
  let n = 0;
  for (const l of data || []) {
    try {
      const r = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(l.place_id)}`, { headers: { 'X-Goog-Api-Key': process.env.GOOGLE_PLACES_KEY, 'X-Goog-FieldMask': 'location' } });
      const j = await r.json();
      if (r.ok && j.location) {
        await db().from('leads').update({ lat: j.location.latitude, lng: j.location.longitude, coords_at: new Date().toISOString() }).eq('id', l.id);
        n++;
      } else {
        await db().from('leads').update({ lat: null, lng: null, coords_at: null }).eq('id', l.id);
      }
    } catch (e) { /* tenta na próxima vez */ }
  }
  return json({ atualizados: n });
}
