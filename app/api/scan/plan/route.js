import { session, getUsage, json, fail, bump, limitMsg } from '@/lib/server';
import { planArea } from '@/lib/ai';

export async function POST(req) {
  const s = await session(req);
  if (s.error) return s.error;
  const { area } = await req.json().catch(() => ({}));
  if (!area || String(area).trim().length < 2) return fail('Digite uma cidade, região ou país.');
  const usage = await getUsage(s.user.id);
  const left = s.plan.scans - usage.scans;
  if (left <= 0) return fail(limitMsg(s.plan, 'scans'), 402);
  if (!(await bump(s.user.id, 'ai', 1, s.plan.ai))) return fail(limitMsg(s.plan, 'ai'), 402);
  try {
    const out = await planArea(String(area).slice(0, 120), Math.min(left, 10));
    return json({ ...out, restantes: left });
  } catch (e) {
    return fail('A IA não conseguiu montar o plano agora. Tente de novo ou digite as cidades separadas por vírgula.', 502);
  }
}
