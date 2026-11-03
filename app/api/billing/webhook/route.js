import { anon, json } from '@/lib/sbserver';
import { cancelSubscription } from '@/lib/asaas';

// No Asaas: Integrações > Webhooks. URL https://SEU-SITE/api/billing/webhook, eventos de Cobranças e
// Assinaturas, e no "Token de autenticação" o token mostrado pelo supabase/prospecnow.sql.
// Quem confere o token é o banco (guardado lá só como hash); o site não guarda segredo nenhum.
export async function POST(req) {
  const token = req.headers.get('asaas-access-token') || '';
  if (!token || token.length > 200) return json({ error: 'não autorizado' }, 401);
  const ev = await req.json().catch(() => null);
  if (!ev?.event) return json({ error: 'evento inválido' }, 400);
  const { data, error } = await anon().rpc('asaas_evento', {
    p_token: token, p_evento: String(ev.event).slice(0, 60), p_pag: ev.payment || null, p_ass: ev.subscription || null
  });
  if (error) return /não autorizado/.test(error.message) ? json({ error: 'não autorizado' }, 401) : json({ error: 'falhou' }, 500); // 500: o Asaas tenta de novo
  if (data?.cancelar) { try { await cancelSubscription(data.cancelar); } catch { /* já cancelada */ } }
  return json({ ok: true });
}
