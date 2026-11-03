import { anon, json } from '@/lib/sbserver';
import { cancelSubscription, pagamentoConfirmado, assinaturaEncerrada } from '@/lib/asaas';

// No Asaas: Integrações > Webhooks. URL https://SEU-SITE/api/billing/webhook, eventos de Cobranças e
// Assinaturas, e no "Token de autenticação" o token mostrado pelo supabase/prospecnow.sql.
//
// Validação em 3 camadas:
// 1. Token: o cabeçalho asaas-access-token precisa bater com o hash guardado no banco.
// 2. Confirmação na API: do aviso só usamos o número do pagamento/assinatura; status, valor, link e
//    assinatura vêm direto da API do Asaas (um aviso forjado não libera nada).
// 3. Valor: o banco confere se o valor pago cobre o preço do plano.
const PAGO = ['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED'];
const FIM = ['SUBSCRIPTION_DELETED', 'SUBSCRIPTION_INACTIVATED'];

export async function POST(req) {
  const token = req.headers.get('asaas-access-token') || '';
  if (!token || token.length > 200) return json({ error: 'não autorizado' }, 401);
  const ev = await req.json().catch(() => null);
  const evento = String(ev?.event || '').slice(0, 60);
  if (!evento) return json({ error: 'evento inválido' }, 400);

  const db = anon();
  const { data: tokenOk, error: e1 } = await db.rpc('asaas_token_ok', { p_token: token });
  if (e1) return json({ error: 'falhou' }, 500);            // 500: o Asaas tenta de novo
  if (!tokenOk) return json({ error: 'não autorizado' }, 401);
  if (!PAGO.includes(evento) && !FIM.includes(evento)) return json({ ok: true, ignorado: true });

  let pag = null, ass = null;
  try {
    if (PAGO.includes(evento)) {
      pag = await pagamentoConfirmado(ev?.payment?.id);
      if (!pag) return json({ ok: true, ignorado: 'pagamento não confirmado na API do Asaas' });
    } else {
      const id = ev?.subscription?.id;
      if (!(await assinaturaEncerrada(id))) return json({ ok: true, ignorado: 'assinatura ainda ativa na API do Asaas' });
      ass = { id };
    }
  } catch (e) {
    return json({ error: 'não consegui confirmar no Asaas' }, 500);
  }

  const { data, error } = await db.rpc('asaas_evento', { p_token: token, p_evento: evento, p_pag: pag, p_ass: ass });
  if (error) return /não autorizado/.test(error.message) ? json({ error: 'não autorizado' }, 401) : json({ error: 'falhou' }, 500);
  if (data?.cancelar) { try { await cancelSubscription(data.cancelar); } catch { /* já cancelada */ } }
  return json({ ok: true });
}
