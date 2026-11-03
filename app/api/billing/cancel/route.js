import { session, json, fail, updateProfile, MOCK } from '@/lib/server';
import { cancelSubscription } from '@/lib/asaas';

// Cancela a renovação. O plano continua ativo até o fim do período já pago.
export async function POST(req) {
  const s = await session(req);
  if (s.error) return s.error;
  const id = s.profile.asaas_subscription_id;
  if (!id || s.profile.asaas_status === 'canceling') return fail('Você não tem renovação ativa.');
  if (!MOCK) {
    try { await cancelSubscription(id); } catch (e) { return fail('Não consegui cancelar: ' + e.message, 502); }
  }
  await updateProfile(s.user.id, { asaas_status: 'canceling' });
  return json({ ok: true, ativoAte: s.profile.paid_until });
}
