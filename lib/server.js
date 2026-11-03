import { createClient } from '@supabase/supabase-js';
import { effectivePlan, monthKey, PLANS } from './plans';

// Modo de demonstração: roda sem nenhuma chave, com dados de exemplo. Nunca use em produção.
export const MOCK = process.env.NEXT_PUBLIC_MOCK === '1' && process.env.VERCEL_ENV !== 'production' && process.env.NEXT_PUBLIC_VERCEL_ENV !== 'production';

let admin = null;
export function db() {
  if (MOCK) return null;
  if (!admin) {
    admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }
  return admin;
}

const mem = globalThis.__pnMock || (globalThis.__pnMock = {
  profile: { id: 'demo', email: 'demo@exemplo.com', full_name: 'Conta de demonstração', plan: 'trial', trial_ends_at: new Date(Date.now() + 7 * 864e5).toISOString(), paid_until: null, settings: {} },
  usage: {}
});

// Identificador do lugar (ex.: osm-n123): só letras, números, _ e -.
export function validPlaceId(v) { return typeof v === 'string' && /^[A-Za-z0-9_-]{6,300}$/.test(v); }
export const MAX_LEADS = 10000;
export async function leadCount(userId) {
  if (MOCK) return 0;
  const { count } = await db().from('leads').select('id', { count: 'exact', head: true }).eq('user_id', userId);
  return count || 0;
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}
export function fail(message, status = 400) {
  return json({ error: message }, status);
}

export async function getUser(req) {
  if (MOCK) return { id: 'demo', email: 'demo@exemplo.com' };
  const h = req.headers.get('authorization') || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!token) return null;
  const { data, error } = await db().auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

export async function getProfile(userId) {
  if (MOCK) return mem.profile;
  const { data } = await db().from('profiles').select('*').eq('id', userId).single();
  return data;
}

export async function updateProfile(userId, patch) {
  if (MOCK) { Object.assign(mem.profile, patch); return; }
  const { error } = await db().from('profiles').update(patch).eq('id', userId);
  if (error) throw new Error(error.message);
}

export async function getUsage(userId) {
  const m = monthKey();
  if (MOCK) return mem.usage[m] || { scans: 0, details: 0, ai: 0 };
  const { data } = await db().from('usage').select('scans,details,ai').eq('user_id', userId).eq('month', m).maybeSingle();
  return data || { scans: 0, details: 0, ai: 0 };
}

// Soma uso respeitando o limite do plano. Retorna false se passar do limite.
export async function bump(userId, field, amount, limit) {
  const m = monthKey();
  if (MOCK) {
    const u = mem.usage[m] || (mem.usage[m] = { scans: 0, details: 0, ai: 0 });
    if (u[field] + amount > limit) return false;
    u[field] += amount; return true;
  }
  const { data, error } = await db().rpc('bump_usage', { p_user: userId, p_month: m, p_field: field, p_amount: amount, p_limit: limit });
  if (error) throw new Error(error.message);
  return data === true;
}

// Autentica, carrega perfil e plano. Use no começo de cada rota protegida.
export async function session(req) {
  const user = await getUser(req);
  if (!user) return { error: fail('Faça login de novo.', 401) };
  const profile = await getProfile(user.id);
  if (!profile) return { error: fail('Perfil não encontrado.', 404) };
  return { user, profile, plan: effectivePlan(profile) };
}

export function limitMsg(plan, what) {
  if (plan.id === 'expirado') return 'Seu teste acabou. Escolha um plano para continuar.';
  if (what === 'scans' && plan.scans === 0) return 'A varredura automática está nos planos Pro e Agência.';
  const label = { scans: 'varreduras', details: 'contatos abertos', ai: 'mensagens pela IA' }[what];
  return `Você usou todas as ${label} do mês no plano ${plan.name}.`;
}

export { PLANS };
