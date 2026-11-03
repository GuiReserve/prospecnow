import { session, json, fail, updateProfile, MOCK } from '@/lib/server';
import { createLink } from '@/lib/asaas';
import { PLANS, PAID } from '@/lib/plans';

// Gera o link de pagamento do Asaas para o plano escolhido. O plano libera quando o
// webhook confirma o pagamento; quem já assina troca de plano pagando o novo link (a assinatura antiga é encerrada quando o novo pagamento chega).
export async function POST(req) {
  const s = await session(req);
  if (s.error) return s.error;
  const b = await req.json().catch(() => ({}));
  const plan = PLANS[b.plan];
  if (!plan || !PAID.includes(plan.id)) return fail('Plano inválido.');
  if (MOCK) return json({ url: '/app?pagamento=exemplo' });

  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  try {
    const link = await createLink(plan, origin);
    if (!link?.id || !/^https:\/\//.test(link.url || '')) return fail('O Asaas não devolveu o link de pagamento.', 502);
    await updateProfile(s.user.id, { asaas_link_id: link.id, asaas_link_plan: plan.id });
    return json({ url: link.url });
  } catch (e) {
    return fail('Não consegui abrir o pagamento: ' + e.message, 502);
  }
}
