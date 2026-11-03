import { session, json, fail, db, MOCK, validPlaceId, leadCount, MAX_LEADS } from '@/lib/server';
import { leadRow } from '@/lib/leadrow';

// Adiciona um negócio encontrado na busca manual à lista.
export async function POST(req) {
  const s = await session(req);
  if (s.error) return s.error;
  if (s.plan.id === 'expirado') return fail('Escolha um plano para adicionar contatos.', 402);
  const b = await req.json().catch(() => ({}));
  if (!validPlaceId(b.place_id)) return fail('Contato inválido.');
  if (MOCK) return json({ ok: true });
  if ((await leadCount(s.user.id)) >= MAX_LEADS) return fail(`Você chegou ao limite de ${MAX_LEADS} contatos. Remova alguns para adicionar novos.`, 400);
  const { error } = await db().from('leads').upsert(leadRow(s.user.id, b), { onConflict: 'user_id,place_id' });
  if (error) return fail('Não consegui salvar o contato.', 500);
  return json({ ok: true });
}
