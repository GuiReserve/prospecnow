import { json, db } from '@/lib/server';
import { stripe, periodEnd, subIdFromInvoice } from '@/lib/stripe';
import { PAID } from '@/lib/plans';

// No Stripe: Desenvolvedores > Webhooks > endpoint https://SEU-SITE/api/billing/webhook
// com os eventos invoice.paid, customer.subscription.updated e customer.subscription.deleted.
// O segredo de assinatura (whsec_…) vai em STRIPE_WEBHOOK_SECRET.
export async function POST(req) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers.get('stripe-signature');
  if (!secret || !sig) return json({ error: 'não autorizado' }, 401);
  const raw = await req.text();
  let ev;
  try { ev = stripe().webhooks.constructEvent(raw, sig, secret); } catch (e) { return json({ error: 'assinatura inválida' }, 400); }

  try {
    if (ev.type === 'invoice.paid') {
      const subId = subIdFromInvoice(ev.data.object);
      if (subId) await sync(await stripe().subscriptions.retrieve(subId), true);
    }
    if (ev.type === 'customer.subscription.updated') await sync(ev.data.object, false);
    if (ev.type === 'customer.subscription.deleted') {
      const sub = ev.data.object, userId = sub.metadata?.userId;
      if (userId) await db().from('profiles').update({ stripe_subscription_id: null, stripe_status: 'canceled' }).eq('id', userId).eq('stripe_subscription_id', sub.id);
    }
  } catch (e) {
    return json({ error: e.message }, 500); // o Stripe tenta de novo
  }
  return json({ ok: true });
}

async function sync(sub, pagou) {
  const userId = sub.metadata?.userId, plan = sub.metadata?.plan;
  if (!userId || !PAID.includes(plan)) return;
  const upd = {
    plan, stripe_subscription_id: sub.id, stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : sub.customer?.id,
    stripe_status: sub.cancel_at_period_end ? 'canceling' : sub.status
  };
  if (pagou) {
    const end = periodEnd(sub);
    if (end) upd.paid_until = new Date(end.getTime() + 3 * 864e5).toISOString(); // 3 dias de folga
  }
  await db().from('profiles').update(upd).eq('id', userId);
}
