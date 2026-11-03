// Integração com o Asaas (cobrança recorrente). Documentação: https://docs.asaas.com
const BASE = () => (process.env.ASAAS_ENV === 'production' ? 'https://api.asaas.com/v3' : 'https://api-sandbox.asaas.com/v3');

export async function asaas(path, { method = 'GET', body } = {}) {
  const r = await fetch(BASE() + path, {
    method,
    headers: { 'content-type': 'application/json', access_token: process.env.ASAAS_API_KEY, 'User-Agent': 'ProspecNow' },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await r.text();
  let j = {}; try { j = text ? JSON.parse(text) : {}; } catch (e) { j = { raw: text }; }
  if (!r.ok) throw new Error(j?.errors?.[0]?.description || `Asaas respondeu ${r.status}`);
  return j;
}

export function today() {
  const d = new Date(Date.now() - 3 * 3600e3); // horário de Brasília
  return d.toISOString().slice(0, 10);
}

export function addMonth(ymd, extraDays = 0) {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m, d)); // m já é o mês seguinte (0-based)
  dt.setUTCDate(dt.getUTCDate() + extraDays);
  return dt.toISOString();
}
