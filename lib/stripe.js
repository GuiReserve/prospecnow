// Cobrança recorrente pelo Stripe. Use chaves de teste (sk_test_…) até ir para produção.
import Stripe from 'stripe';
import { PLANS } from './plans';

let client = null;
export function stripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('Falta a chave do Stripe (STRIPE_SECRET_KEY).');
  if (!client) client = new Stripe(process.env.STRIPE_SECRET_KEY, { appInfo: { name: 'ProspecNow' } });
  return client;
}

// Cria o preço mensal do plano na primeira vez e depois reaproveita pelo lookup_key.
// Assim não é preciso cadastrar produtos à mão no painel do Stripe.
export async function priceFor(planId) {
  const plan = PLANS[planId];
  const key = `prospecnow_${plan.id}_${plan.price}_brl`;
  const found = await stripe().prices.list({ lookup_keys: [key], active: true, limit: 1 });
  if (found.data[0]) return found.data[0].id;
  const p = await stripe().prices.create({
    currency: 'brl', unit_amount: plan.price * 100, recurring: { interval: 'month' }, lookup_key: key,
    product_data: { name: `ProspecNow ${plan.name}`, metadata: { plan: plan.id } }, metadata: { plan: plan.id }
  });
  return p.id;
}

// Fim do período pago. Nas versões novas da API ele fica no item da assinatura.
export function periodEnd(sub) {
  const t = sub.items?.data?.[0]?.current_period_end || sub.current_period_end;
  return t ? new Date(t * 1000) : null;
}

export function subIdFromInvoice(inv) {
  return inv.parent?.subscription_details?.subscription || inv.subscription || null;
}
