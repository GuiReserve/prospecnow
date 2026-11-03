// Supabase no servidor usando só a chave pública. Com o login de quem chamou, o banco aplica
// as mesmas regras do navegador (RLS); sem login, só funções liberadas para todos (webhook com token).
import { createClient } from '@supabase/supabase-js';

const URL_ = () => process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const opts = extra => ({ auth: { persistSession: false, autoRefreshToken: false }, ...extra });

export const json = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
export const fail = (error, status = 400) => json({ error }, status);

export async function userFromReq(req) {
  const h = req.headers.get('authorization') || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!token) return { error: fail('Faça login de novo.', 401) };
  const sb = createClient(URL_(), KEY(), opts({ global: { headers: { Authorization: 'Bearer ' + token } } }));
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data?.user) return { error: fail('Faça login de novo.', 401) };
  const { data: profile, error: e2 } = await sb.from('profiles').select('*').eq('id', data.user.id).maybeSingle();
  if (e2 || !profile) return { error: fail('Não consegui carregar sua conta. Confira se o SQL do Supabase foi rodado.', 500) };
  return { sb, user: data.user, profile };
}

export function anon() { return createClient(URL_(), KEY(), opts()); }
