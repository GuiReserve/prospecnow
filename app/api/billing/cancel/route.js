import { userFromReq, json, fail } from '@/lib/sbserver';
import { cancelSubscription } from '@/lib/asaas';

// Cancela a renovação. O plano continua ativo até o fim do período já pago.
export async function POST(req) {
  const u = await userFromReq(req);
  if (u.error) return u.error;
  const id = u.profile.asaas_subscription_id;
  if (!id || ['canceling', 'canceled'].includes(u.profile.asaas_status)) return fail('Você não tem renovação ativa.');
  try { await cancelSubscription(id); } catch (e) { return fail('Não consegui cancelar: ' + e.message, 502); }
  await u.sb.rpc('marcar_cancelando');
  return json({ ok: true, ativoAte: u.profile.paid_until });
}
