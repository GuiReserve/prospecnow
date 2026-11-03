import { json, db } from '@/lib/server';
import { asaas, addMonth } from '@/lib/asaas';
import { PAID } from '@/lib/plans';

// Configure no Asaas: Integrações > Webhooks > URL https://SEU-SITE/api/billing/webhook
// e o mesmo token em ASAAS_WEBHOOK_TOKEN.
export async function POST(req) {
  const token = req.headers.get('asaas-access-token');
  if (!process.env.ASAAS_WEBHOOK_TOKEN || token !== process.env.ASAAS_WEBHOOK_TOKEN) return json({ error: 'não autorizado' }, 401);
  const ev = await req.json().catch(() => null);
  if (!ev) return json({ ok: true });
  try {
    if ((ev.event === 'PAYMENT_CONFIRMED' || ev.event === 'PAYMENT_RECEIVED') && ev.payment?.subscription) {
      const sub = await asaas(`/subscriptions/${ev.payment.subscription}`);
      const [userId, plan] = String(sub.externalReference || '').split(':');
      if (userId && PAID.includes(plan)) {
        // vale até um mês depois do vencimento pago, mais 3 dias de folga
        const paidUntil = addMonth(ev.payment.dueDate, 3);
        const { data: prof } = await db().from('profiles').select('paid_until').eq('id', userId).single();
        const keep = prof?.paid_until && new Date(prof.paid_until) > new Date(paidUntil) ? prof.paid_until : paidUntil;
        await db().from('profiles').update({ plan, paid_until: keep, asaas_subscription_id: sub.deleted ? null : sub.id }).eq('id', userId);
      }
    }
    if (ev.event === 'PAYMENT_REFUNDED' && ev.payment?.subscription) {
      const sub = await asaas(`/subscriptions/${ev.payment.subscription}`);
      const [userId] = String(sub.externalReference || '').split(':');
      if (userId) await db().from('profiles').update({ paid_until: new Date().toISOString() }).eq('id', userId);
    }
  } catch (e) {
    return json({ error: e.message }, 500); // o Asaas tenta de novo
  }
  return json({ ok: true });
}
