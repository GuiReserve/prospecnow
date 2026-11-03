import { session, json, fail, updateProfile, MOCK } from '@/lib/server';
import { stripe, priceFor } from '@/lib/stripe';
import { PLANS, PAID } from '@/lib/plans';

// Abre o checkout do Stripe para assinar, ou troca o plano de quem já assina.
export async function POST(req) {
  const s = await session(req);
  if (s.error) return s.error;
  const b = await req.json().catch(() => ({}));
  const plan = PLANS[b.plan];
  if (!plan || !PAID.includes(plan.id)) return fail('Plano inválido.');
  if (MOCK) return json({ url: '/app?pagamento=exemplo' });

  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  try {
    const price = await priceFor(plan.id);
    const subId = s.profile.stripe_subscription_id;
    const pago = s.profile.paid_until && new Date(s.profile.paid_until) > new Date();

    if (subId && pago) {
      // troca de plano: o valor novo vale a partir da próxima cobrança e o plano novo libera já
      const sub = await stripe().subscriptions.retrieve(subId);
      if (sub.status === 'active' || sub.status === 'trialing') {
        await stripe().subscriptions.update(subId, {
          items: [{ id: sub.items.data[0].id, price }], proration_behavior: 'none',
          cancel_at_period_end: false, metadata: { userId: s.user.id, plan: plan.id }
        });
        await updateProfile(s.user.id, { plan: plan.id, stripe_status: 'active' });
        return json({ url: null, trocado: true });
      }
    }

    let customer = s.profile.stripe_customer_id;
    if (!customer) {
      const c = await stripe().customers.create({ email: s.user.email, name: s.profile.full_name || undefined, metadata: { userId: s.user.id } });
      customer = c.id;
      await updateProfile(s.user.id, { stripe_customer_id: customer });
    }
    const cs = await stripe().checkout.sessions.create({
      mode: 'subscription', customer, client_reference_id: s.user.id, locale: 'pt-BR',
      line_items: [{ price, quantity: 1 }],
      subscription_data: { metadata: { userId: s.user.id, plan: plan.id } },
      metadata: { userId: s.user.id, plan: plan.id },
      success_url: `${origin}/planos?pagamento=ok`,
      cancel_url: `${origin}/planos`
    });
    return json({ url: cs.url });
  } catch (e) {
    return fail('Não consegui abrir o pagamento: ' + e.message, 502);
  }
}
