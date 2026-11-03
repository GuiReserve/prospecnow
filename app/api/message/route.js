import { session, json, fail, bump, limitMsg } from '@/lib/server';
import { writeMessage } from '@/lib/ai';

export async function POST(req) {
  const s = await session(req);
  if (s.error) return s.error;
  const b = await req.json().catch(() => ({}));
  const base = String(b.base || '').slice(0, 2000);
  if (!base) return fail('Mensagem vazia.');
  if (!(await bump(s.user.id, 'ai', 1, s.plan.ai))) return fail(limitMsg(s.plan, 'ai'), 402);
  try {
    const texto = await writeMessage({ base, negocio: String(b.negocio || '').slice(0, 120), segmento: String(b.segmento || '').slice(0, 40), cidade: String(b.cidade || '').slice(0, 80), etapa: String(b.etapa || 'primeiro contato').slice(0, 40), pais: b.pais });
    return json({ texto });
  } catch (e) {
    await bump(s.user.id, 'ai', -1, 1e9);
    return fail('A IA não respondeu agora. Use o texto padrão ou tente de novo.', 502);
  }
}
