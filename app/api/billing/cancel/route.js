import { session, json, fail, updateProfile, MOCK } from '@/lib/server';
import { stripe } from '@/lib/stripe';

// Cancela a renovação. O plano continua ativo até o fim do período já pago.
export async function POST(req) {
  const s = await session(req);
  if (s.error) return s.error;
  const id = s.profile.stripe_subscription_id;
  if (!id || s.profile.stripe_status === 'canceling') return fail('Você não tem renovação ativa.');
  if (!MOCK) {
    try { await stripe().subscriptions.update(id, { cancel_at_period_end: true }); } catch (e) { return fail('Não consegui cancelar: ' + e.message, 502); }
  }
  await updateProfile(s.user.id, { stripe_status: 'canceling' });
  return json({ ok: true, ativoAte: s.profile.paid_until });
}
