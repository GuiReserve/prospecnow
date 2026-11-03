// Cobrança recorrente pelo Asaas. Sandbox (testes) por padrão; produção só com ASAAS_ENV=production.
const BASE = () => process.env.ASAAS_ENV === 'production' ? 'https://api.asaas.com/v3' : 'https://sandbox.asaas.com/api/v3';

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
  if (!r.ok) throw new Error(data?.errors?.[0]?.description || `Asaas respondeu ${r.status}`);
  return data;
}

// Cria um link de pagamento mensal só para este cliente. O Asaas pede CPF/CNPJ e dados do
// cartão ou PIX na página dele, então o ProspecNow não guarda nada disso.
export async function createLink(plan, origin) {
  const body = {
    name: `ProspecNow ${plan.name}`,
    description: `Assinatura mensal do plano ${plan.name}`,
    billingType: 'UNDEFINED', // o cliente escolhe cartão, PIX ou boleto
    chargeType: 'RECURRENT',
    subscriptionCycle: 'MONTHLY',
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
