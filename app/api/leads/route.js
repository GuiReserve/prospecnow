import { session, json, fail, db, MOCK, validPlaceId, leadCount, MAX_LEADS } from '@/lib/server';

// Adiciona um negócio encontrado na busca manual ao funil.
export async function POST(req) {
  const s = await session(req);
  if (s.error) return s.error;
  if (s.plan.id === 'expirado') return fail('Escolha um plano para adicionar contatos.', 402);
  const b = await req.json().catch(() => ({}));
  if (!validPlaceId(b.place_id)) return fail('Contato inválido.');
  if (MOCK) return json({ ok: true });
  if ((await leadCount(s.user.id)) >= MAX_LEADS) return fail(`Você chegou ao limite de ${MAX_LEADS} contatos. Remova alguns para adicionar novos.`, 400);
  const row = { user_id: s.user.id, place_id: String(b.place_id), segmento: String(b.segmento || '').slice(0, 40), cidade: String(b.cidade || '').slice(0, 80), pais: b.pais === 'PT' ? 'PT' : 'BR', lat: Math.abs(Number(b.lat)) <= 90 ? Number(b.lat) || null : null, lng: Math.abs(Number(b.lng)) <= 180 ? Number(b.lng) || null : null, coords_at: new Date().toISOString(), sem_site: !!b.sem_site };
  const { error } = await db().from('leads').upsert(row, { onConflict: 'user_id,place_id' });
  if (error) return fail('Não consegui salvar o contato.', 500);
  return json({ ok: true });
}
