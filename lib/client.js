'use client';
import { createClient } from '@supabase/supabase-js';

export const MOCK = process.env.NEXT_PUBLIC_MOCK === '1';
let sb = null;
export function supabase() {
  if (MOCK) return null;
  if (!sb) sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return sb;
}

export async function currentUser() {
  if (MOCK) return { id: 'demo', email: 'demo@exemplo.com' };
  const { data } = await supabase().auth.getSession();
  return data.session?.user || null;
}

export async function api(path, body) {
  const headers = { 'content-type': 'application/json' };
  if (!MOCK) {
    const { data } = await supabase().auth.getSession();
    const t = data.session?.access_token;
    if (t) headers.authorization = 'Bearer ' + t;
  }
  const r = await fetch(path, { method: body === undefined ? 'GET' : 'POST', headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(j.error || 'Algo deu errado.'); e.status = r.status; throw e; }
  return j;
}

/* ---------- contatos (leads) ---------- */
const LK = 'pn_demo_leads';
function mockLoad() { try { return JSON.parse(localStorage.getItem(LK) || '[]'); } catch (e) { return []; } }
function mockSave(v) { try { localStorage.setItem(LK, JSON.stringify(v)); } catch (e) { } }

export async function listLeads() {
  if (MOCK) return mockLoad();
  const { data, error } = await supabase().from('leads').select('id,place_id,segmento,cidade,pais,lat,lng,coords_at,sem_site,status,contacts,note,photo_url,created_at').order('created_at', { ascending: false }).limit(5000);
  if (error) throw new Error(error.message);
  return data || [];
}

export async function mergeScanIntoMock(results) {
  if (!MOCK) return;
  const cur = mockLoad();
  const have = new Set(cur.map(l => l.place_id));
  for (const r of results) if (!have.has(r.place_id)) cur.unshift({ id: r.place_id, place_id: r.place_id, segmento: r.segmento, cidade: r.cidade, pais: r.pais || 'BR', lat: r.lat, lng: r.lng, sem_site: r.sem_site, status: 'novo', contacts: [], note: '', created_at: new Date().toISOString() });
  mockSave(cur);
}

export async function updateLead(id, patch) {
  if (MOCK) { const cur = mockLoad().map(l => (l.id === id ? { ...l, ...patch } : l)); mockSave(cur); return; }
  const { error } = await supabase().from('leads').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteLead(id) {
  if (MOCK) { mockSave(mockLoad().filter(l => l.id !== id)); return; }
  const { error } = await supabase().from('leads').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function saveSettings(settings) {
  if (MOCK) { try { localStorage.setItem('pn_demo_settings', JSON.stringify(settings)); } catch (e) { } return; }
  const u = await currentUser();
  const { error } = await supabase().from('profiles').update({ settings }).eq('id', u.id);
  if (error) throw new Error(error.message);
}
export function mockSettings() { try { return JSON.parse(localStorage.getItem('pn_demo_settings') || 'null'); } catch (e) { return null; } }

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
  novo: { label: 'Ainda não contatado', color: '#3B5BFD', bg: '#ECEFFF' },
  due: { label: 'Acompanhar hoje', color: '#B26A00', bg: '#FDF1DC', pin: '#F29D0B' },
  aguard: { label: 'Aguardando resposta', color: '#5B6270', bg: '#EFF1F4', pin: '#8A919D' },
  conv: { label: 'Em conversa', color: '#16794B', bg: '#E2F3EA', pin: '#1FA855' },
  fechou: { label: 'Fechou', color: '#FFFFFF', bg: '#0B0F14', pin: '#0B0F14' },
  nao: { label: 'Sem interesse', color: '#B3261E', bg: '#FBE7E5', pin: '#C9CDD3' },
  fim: { label: 'Encerrado', color: '#5B6270', bg: '#EFF1F4', pin: '#C9CDD3' }
};
export function pinColor(k) { return STATUS[k].pin || STATUS[k].color; }

export function fillTemplate(t, v) {
  return String(t || '').replace(/\{nome\}/g, v.nome || '').replace(/\{segmento\}/g, (v.segmento || '').toLowerCase()).replace(/\{cidade\}/g, v.cidade || '').replace(/\{link\}/g, v.link || '').replace(/\{meu_nome\}/g, v.meu_nome || '');
}
