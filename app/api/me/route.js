import { session, getUsage, json } from '@/lib/server';
import { DEFAULT_SETTINGS } from '@/lib/plans';

export async function GET(req) {
  const s = await session(req);
  if (s.error) return s.error;
  const usage = await getUsage(s.user.id);
  const p = s.profile;
  return json({
    email: p.email, nome: p.full_name, plan: s.plan, planoContratado: p.plan,
    trialEndsAt: p.trial_ends_at, paidUntil: p.paid_until, assinaturaAtiva: !!p.asaas_subscription_id,
    usage, settings: { ...DEFAULT_SETTINGS, ...(p.settings || {}) }
  });
}
