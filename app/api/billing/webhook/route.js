import { timingSafeEqual } from 'node:crypto';
import { json, db } from '@/lib/server';
import { PAID } from '@/lib/plans';
import { cancelSubscription } from '@/lib/asaas';

// No Asaas: Integrações > Webhooks > Novo webhook, URL https://SEU-SITE/api/billing/webhook,
// "Token de autenticação" igual a ASAAS_WEBHOOK_TOKEN, eventos de Cobranças e de Assinaturas.
function tokenOk(got) {
  const want = process.env.ASAAS_WEBHOOK_TOKEN || '';
  if (want.length < 16 || !got) return false;
  const a = Buffer.from(got), b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req) {
  if (!tokenOk(req.headers.get('asaas-access-token'))) return json({ error: 'não autorizado' }, 401);
  const ev = await req.json().catch(() => null);
  if (!ev?.event) return json({ error: 'evento inválido' }, 400);

  try {
    const p = ev.payment, sub = ev.subscription;
    if ((ev.event === 'PAYMENT_CONFIRMED' || ev.event === 'PAYMENT_RECEIVED') && p) {
      // acha a pessoa pela assinatura (renovações) ou pelo link de pagamento (primeira cobrança)
      let prof = null;
      if (p.subscription) prof = (await db().from('profiles').select('id, asaas_link_plan, plan, asaas_subscription_id').eq('asaas_subscription_id', p.subscription).maybeSingle()).data;
      if (!prof && p.paymentLink) prof = (await db().from('profiles').select('id, asaas_link_plan, plan, asaas_subscription_id').eq('asaas_link_id', p.paymentLink).maybeSingle()).data;
      if (prof) {
        const plan = prof.asaas_link_plan && PAID.includes(prof.asaas_link_plan) ? prof.asaas_link_plan : prof.plan;
        if (PAID.includes(plan)) {
          const upd = { plan, asaas_status: 'active', paid_until: new Date(Date.now() + 33 * 864e5).toISOString() }; // 30 dias + 3 de folga
          if (p.subscription) upd.asaas_subscription_id = p.subscription;
          await db().from('profiles').update(upd).eq('id', prof.id);
          // troca de plano: encerra a assinatura anterior para não cobrar duas vezes
          if (p.subscription && prof.asaas_subscription_id && prof.asaas_subscription_id !== p.subscription) {
            try { await cancelSubscription(prof.asaas_subscription_id); } catch { /* já cancelada */ }
          }
        }
      }
    }
    if ((ev.event === 'SUBSCRIPTION_DELETED' || ev.event === 'SUBSCRIPTION_INACTIVATED') && sub?.id) {
      // o acesso segue até paid_until; só marca que não renova mais
      await db().from('profiles').update({ asaas_status: 'canceled' }).eq('asaas_subscription_id', sub.id);
    }
  } catch (e) {
    return json({ error: e.message }, 500); // o Asaas tenta de novo
  }
  return json({ ok: true });
}
