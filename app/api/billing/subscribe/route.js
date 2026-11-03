import { userFromReq, json, fail } from '@/lib/sbserver';
import { createLink } from '@/lib/asaas';
import { PLANS, PAID } from '@/lib/plans';

// Cria o link de pagamento mensal do Asaas para o plano escolhido. O plano libera quando o
// webhook confirma o pagamento; na troca de plano, a assinatura antiga é encerrada nesse momento.
export async function POST(req) {
  const u = await userFromReq(req);
  if (u.error) return u.error;
  const b = await req.json().catch(() => ({}));
  const plan = PLANS[b.plan];
  if (!plan || !PAID.includes(plan.id)) return fail('Plano inválido.');
  if (!process.env.ASAAS_API_KEY) return fail('Os pagamentos ainda não foram ativados. Tente mais tarde.', 503);
  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  try {
    const link = await createLink(plan, origin);
    if (!link?.id || !/^https:\/\//.test(link.url || '')) return fail('O Asaas não devolveu o link de pagamento.', 502);
    const { error } = await u.sb.rpc('registrar_link', { p_link: link.id, p_plano: plan.id });
    if (error) return fail('Não consegui registrar o pagamento. Tente de novo.', 500);
    return json({ url: link.url });
  } catch (e) {
    return fail('Não consegui abrir o pagamento: ' + e.message, 502);
  }
}
