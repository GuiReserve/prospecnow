import { session, json, fail, updateProfile, MOCK } from '@/lib/server';
import { asaas, today } from '@/lib/asaas';
import { PLANS, PAID } from '@/lib/plans';

// Cria (ou troca) a assinatura no Asaas e devolve o link da primeira fatura.
// O cliente escolhe Pix, boleto ou cartão na própria página do Asaas.
export async function POST(req) {
  const s = await session(req);
  if (s.error) return s.error;
  const b = await req.json().catch(() => ({}));
  const plan = PLANS[b.plan];
  if (!plan || !PAID.includes(plan.id)) return fail('Plano inválido.');
  const cpfCnpj = String(b.cpfCnpj || '').replace(/\D/g, '');
  const nome = String(b.nome || s.profile.full_name || '').trim().slice(0, 100);
  if (!(cpfCnpj.length === 11 || cpfCnpj.length === 14)) return fail('Informe um CPF ou CNPJ válido.');
  if (nome.length < 3) return fail('Informe seu nome completo.');
  if (MOCK) return json({ url: '/app?pagamento=exemplo' });

  try {
    let customer = s.profile.asaas_customer_id;
    if (!customer) {
      const c = await asaas('/customers', { method: 'POST', body: { name: nome, email: s.user.email, cpfCnpj, externalReference: s.user.id, notificationDisabled: false } });
      customer = c.id;
      await updateProfile(s.user.id, { asaas_customer_id: customer, full_name: nome });
    }
    const pago = s.profile.paid_until && new Date(s.profile.paid_until) > new Date();
    if (s.profile.asaas_subscription_id && pago) {
      // troca de plano com assinatura em dia: muda o valor a partir da próxima fatura e libera o plano novo já
      await asaas(`/subscriptions/${s.profile.asaas_subscription_id}`, { method: 'POST', body: { value: plan.price, description: `ProspecNow ${plan.name}`, externalReference: `${s.user.id}:${plan.id}`, updatePendingPayments: true } });
      await updateProfile(s.user.id, { plan: plan.id });
      return json({ url: null, trocado: true });
    }
    if (s.profile.asaas_subscription_id) {
      try { await asaas(`/subscriptions/${s.profile.asaas_subscription_id}`, { method: 'DELETE' }); } catch (e) { /* já cancelada */ }
    }
    const sub = await asaas('/subscriptions', {
      method: 'POST',
      body: { customer, billingType: 'UNDEFINED', value: plan.price, nextDueDate: today(), cycle: 'MONTHLY', description: `ProspecNow ${plan.name}`, externalReference: `${s.user.id}:${plan.id}` }
    });
    await updateProfile(s.user.id, { asaas_subscription_id: sub.id });
    const pays = await asaas(`/subscriptions/${sub.id}/payments`);
    const first = (pays.data || [])[0];
    return json({ url: first?.invoiceUrl || null });
  } catch (e) {
    return fail('Não consegui criar a assinatura: ' + e.message, 502);
  }
}
