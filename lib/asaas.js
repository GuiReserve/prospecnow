// Cobrança recorrente pelo Asaas. Sandbox (testes) por padrão; produção só com ASAAS_ENV=production.
const BASE = () => process.env.ASAAS_BASE_URL_TESTE && !process.env.VERCEL
  ? process.env.ASAAS_BASE_URL_TESTE   // só para testes locais
  : process.env.ASAAS_ENV === 'production' ? 'https://api.asaas.com/v3' : 'https://sandbox.asaas.com/api/v3';

export async function asaas(path, { method = 'GET', body } = {}) {
  const key = process.env.ASAAS_API_KEY;
  if (!key) throw new Error('Falta a chave do Asaas (ASAAS_API_KEY).');
  const r = await fetch(BASE() + path, {
    method,
    headers: { access_token: key, 'Content-Type': 'application/json', 'User-Agent': 'ProspecNow' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000)
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(data?.errors?.[0]?.description || `Asaas respondeu ${r.status}`); e.status = r.status; throw e; }
  return data;
}

// Cria um link de pagamento mensal só para este cliente. O Asaas pede CPF/CNPJ e dados do
// cartão ou PIX na página dele, então o ProspecNow não guarda nada disso.
export async function createLink(plan, origin) {
  const unico = plan.id === 'semana';   // 7 dias: pagamento único, sem renovação
  const body = {
    name: unico ? 'ProspecNow 7 dias' : `ProspecNow ${plan.name}`,
    description: unico ? 'Acesso de 7 dias ao ProspecNow (pagamento único, não renova)' : `Assinatura mensal do plano ${plan.name}`,
    billingType: 'UNDEFINED', // o cliente escolhe cartão, PIX ou boleto
    chargeType: unico ? 'DETACHED' : 'RECURRENT',
    ...(unico ? {} : { subscriptionCycle: 'MONTHLY' }),
    value: plan.price,
    dueDateLimitDays: 3,
    notificationEnabled: true,
    callback: { successUrl: `${origin}/planos?pagamento=ok`, autoRedirect: true }
  };
  try {
    return await asaas('/paymentLinks', { method: 'POST', body });
  } catch (e) {
    // o retorno automático exige o site cadastrado no Asaas (Minha Conta > Informações);
    // sem isso, cria o link sem retorno: o pagamento e o webhook funcionam igual
    if (!/dom[ií]nio|site/i.test(e.message)) throw e;
    delete body.callback;
    return asaas('/paymentLinks', { method: 'POST', body });
  }
}

export const cancelSubscription = id => asaas(`/subscriptions/${encodeURIComponent(id)}`, { method: 'DELETE' });

// Busca o pagamento/assinatura direto no Asaas: o webhook só confia no que a API confirma.
const ID = /^[A-Za-z0-9_]{3,80}$/;
export async function pagamentoConfirmado(id) {
  if (!ID.test(String(id || ''))) return null;
  let p;
  try { p = await asaas(`/payments/${id}`); } catch (e) { if (e.status === 404) return null; throw e; }
  if (!p || p.deleted || !['CONFIRMED', 'RECEIVED', 'RECEIVED_IN_CASH'].includes(p.status)) return null;
  return { id: p.id, value: p.value, subscription: p.subscription || null, paymentLink: p.paymentLink || null };
}
export async function assinaturaEncerrada(id) {
  if (!ID.test(String(id || ''))) return false;
  try {
    const s = await asaas(`/subscriptions/${id}`);
    return !!s.deleted || s.status !== 'ACTIVE';
  } catch (e) {
    if (e.status === 404) return true;
    throw e;
  }
}
