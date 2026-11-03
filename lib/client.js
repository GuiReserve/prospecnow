'use client';
import { createClient } from '@supabase/supabase-js';
import { DEFAULT_SETTINGS, effectivePlan, monthKey } from '@/lib/plans';

// Só deixa abrir links http(s), nunca javascript: ou data:.
export function safeUrl(u) { try { const x = new URL(u); return x.protocol === 'https:' || x.protocol === 'http:' ? x.href : ''; } catch (e) { return ''; } }

/* ---------- conta (Supabase com a chave pública; as regras ficam no banco) ---------- */
let sb = null;
export function supabase() {
  if (!sb) sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return sb;
}
function boom(error, fallback) {
  const m = String(error?.message || '');
  if (/JWT|not authenticated|Faça login/i.test(m)) { const e = new Error('Faça login de novo.'); e.status = 401; return e; }
  if (/does not exist|schema cache|Could not find the function/i.test(m)) return new Error('O banco ainda não foi configurado: rode o arquivo supabase/prospecnow.sql no Supabase.');
  return new Error(m || fallback);
}
export async function session() { const { data } = await supabase().auth.getSession(); return data.session || null; }

// perfil, plano em vigor e varreduras usadas neste mês
export async function loadAccount() {
  const s = await session();
  if (!s) { const e = new Error('Faça login.'); e.status = 401; throw e; }
  const { data: profile, error } = await supabase().from('profiles').select('*').eq('id', s.user.id).maybeSingle();
  if (error) throw boom(error, 'Não consegui carregar sua conta.');
  if (!profile) throw new Error('Sua conta ainda não tem perfil. Rode o arquivo supabase/prospecnow.sql no Supabase e entre de novo.');
  const { data: u } = await supabase().from('usage').select('scans').eq('user_id', s.user.id).eq('month', monthKey()).maybeSingle();
  return { user: s.user, profile, plan: effectivePlan(profile), usado: u?.scans || 0, settings: { ...DEFAULT_SETTINGS, ...(profile.settings || {}) } };
}

// chamadas às rotas do site (cobrança), com o login de quem está usando
export async function api(path, body) {
  const s = await session();
  const r = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json', ...(s ? { authorization: 'Bearer ' + s.access_token } : {}) }, body: JSON.stringify(body || {}) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(j.error || 'Algo deu errado.'); e.status = r.status; throw e; }
  return j;
}

/* ---------- contatos ---------- */
const COLS = 'id,place_id,nome,telefone,digits,site,endereco,instagram,horario,segmento,cidade,pais,lat,lng,sem_site,status,contacts,note,photo_url,created_at';
export async function listLeads() {
  const out = [];
  for (let de = 0; de < 10000; de += 1000) {
    const { data, error } = await supabase().from('leads').select(COLS).order('created_at', { ascending: false }).range(de, de + 999);
    if (error) throw boom(error, 'Não consegui carregar seus contatos.');
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

// salva resultados de varredura ou busca, sem repetir o mesmo lugar (o banco confere tudo)
export async function addLeads(results) {
  let novos = 0;
  for (let i = 0; i < results.length; i += 500) {
    const { data, error } = await supabase().rpc('salvar_contatos', { p_rows: results.slice(i, i + 500) });
    if (error) throw boom(error, 'Não consegui salvar os contatos.');
    novos += data || 0;
  }
  return novos;
}
export async function updateLead(id, patch) {
  const { error } = await supabase().from('leads').update(patch).eq('id', id);
  if (error) throw boom(error, 'Não consegui salvar.');
}
export async function deleteLead(id) {
  const { error } = await supabase().from('leads').delete().eq('id', id);
  if (error) throw boom(error, 'Não consegui remover.');
}
export async function saveSettings(v) {
  const s = await session();
  const { error } = await supabase().from('profiles').update({ settings: v }).eq('id', s.user.id);
  if (error) throw boom(error, 'Não consegui salvar.');
}

// gasta 1 varredura do mês; o banco recusa quando o limite do plano acabou
export async function usarVarredura() {
  const { data, error } = await supabase().rpc('usar_varredura');
  if (error) throw boom(error, 'Não consegui iniciar a varredura.');
  return data;
}

// contatos salvos no navegador pela versão sem conta: levados para a conta uma vez
export async function migrarContatosLocais() {
  let local = [];
  try { local = JSON.parse(localStorage.getItem('pn_leads') || '[]'); } catch (e) { }
  if (!Array.isArray(local) || !local.length) return 0;
  const n = await addLeads(local.map(l => ({ ...l, contacts: l.contacts || [] })));
  try { localStorage.removeItem('pn_leads'); } catch (e) { }
  return n;
}

// planilha com os contatos (abre no Excel e no Google Sheets)
export function exportCsv(leads) {
  const cols = [['nome', 'Nome'], ['segmento', 'Segmento'], ['cidade', 'Cidade'], ['telefone', 'Telefone'], ['site', 'Site'], ['instagram', 'Instagram'], ['endereco', 'Endereço'], ['status', 'Situação'], ['note', 'Anotação']];
  const esc = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const linhas = [cols.map(c => esc(c[1])).join(';'), ...leads.map(l => cols.map(([k]) => esc(k === 'status' ? STATUS[seq(l).k].label : l[k])).join(';'))];
  const blob = new Blob(['﻿' + linhas.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'prospecnow-contatos-' + today() + '.csv';
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/* ---------- acompanhamentos ---------- */
export function today() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function parse(s) { const p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
function addDays(s, n) { const d = parse(s); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function diff(a, b) { return Math.round((parse(a) - parse(b)) / 864e5); }
export const STEP = ['Primeiro contato', '1º acompanhamento', 'Último acompanhamento'];
export function stepIdx(l) { const n = (l.contacts || []).length; return n === 0 ? 0 : n === 1 ? 1 : 2; }
export function seq(l) {
  if (['fechou', 'nao', 'fim', 'conv'].includes(l.status)) return { k: l.status };
  const c = l.contacts || [];
  if (!c.length) return { k: 'novo' };
  if (c.length >= 3) return { k: 'fim' };
  const nx = addDays(c[c.length - 1], c.length === 1 ? 4 : 7), d = diff(today(), nx);
  return { k: d >= 0 ? 'due' : 'aguard', next: nx, left: -d };
}
export const STATUS = {
  novo: { label: 'Ainda não contatado', color: '#1F5FA8', bg: '#E3EEFA', pin: '#2F7FD1' },
  due: { label: 'Acompanhar hoje', color: '#8A5A00', bg: '#FDF1D6', pin: '#E39B0B' },
  aguard: { label: 'Aguardando resposta', color: '#5F6368', bg: '#F1F3F4', pin: '#80868B' },
  conv: { label: 'Em conversa', color: '#146C3D', bg: '#E2F3E8', pin: '#1E9E5A' },
  fechou: { label: 'Fechou', color: '#FFFFFF', bg: '#146C3D', pin: '#146C3D' },
  nao: { label: 'Sem interesse', color: '#B3261E', bg: '#FBE7E5', pin: '#BDC1C6' },
  fim: { label: 'Encerrado', color: '#5F6368', bg: '#F1F3F4', pin: '#BDC1C6' }
};
export function isMobile(d) {
  if (/^55\d{2}9\d{8}$/.test(d)) return true;
  if (/^3519\d{8}$/.test(d)) return true;
  if (/^55\d{10}$/.test(d) || /^351[2]\d{8}$/.test(d)) return false;
  return null;
}
// dados do negócio guardados no próprio contato
export function infoOf(l) {
  return { nome: l.nome || '', telefone: l.telefone || '', digits: l.digits || '', celular: isMobile(l.digits || ''), site: l.site || '', endereco: l.endereco || '', instagram: l.instagram || '', horario: l.horario || '' };
}
export function pinColor(k) { return STATUS[k].pin || STATUS[k].color; }

export function fillTemplate(t, v) {
  return String(t || '').replace(/\{nome\}/g, v.nome || '').replace(/\{segmento\}/g, (v.segmento || '').toLowerCase()).replace(/\{cidade\}/g, v.cidade || '').replace(/\{link\}/g, v.link || '').replace(/\{meu_nome\}/g, v.meu_nome || '').replace(/\{servico\}/g, v.servico || '');
}
