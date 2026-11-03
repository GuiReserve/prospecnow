'use client';
import { DEFAULT_SETTINGS } from '@/lib/plans';

// Só deixa abrir links http(s), nunca javascript: ou data:.
export function safeUrl(u) { try { const x = new URL(u); return x.protocol === 'https:' || x.protocol === 'http:' ? x.href : ''; } catch (e) { return ''; } }

/* ---------- contatos e mensagens: ficam salvos neste navegador ---------- */
const LK = 'pn_leads', SK = 'pn_settings';
export const MAX_LEADS = 3000;
function read(k, vazio) { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v ?? vazio; } catch (e) { return vazio; } }
function write(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)); return true; }
  catch (e) { throw new Error('O navegador não deixou salvar (sem espaço ou em aba privada). Baixe um backup e libere espaço.'); }
}

export function listLeads() { return read(LK, []); }

// Junta os resultados de uma varredura aos contatos, sem repetir o mesmo lugar.
export function addLeads(results) {
  const cur = listLeads();
  const have = new Set(cur.map(l => l.place_id));
  let novos = 0;
  for (const r of results) {
    if (!r?.place_id || have.has(r.place_id) || cur.length >= MAX_LEADS) continue;
    have.add(r.place_id); novos++;
    cur.unshift({
      id: r.place_id, place_id: r.place_id, nome: r.nome || '', telefone: r.telefone || '', digits: r.digits || '', site: r.site || '',
      endereco: r.endereco || '', instagram: r.instagram || '', horario: r.horario || '', segmento: r.segmento || 'Outros', cidade: r.cidade || '',
      pais: r.pais || 'BR', lat: r.lat, lng: r.lng, sem_site: !r.site, status: 'novo', contacts: [], note: '', photo_url: null, created_at: new Date().toISOString()
    });
  }
  write(LK, cur);
  return { leads: cur, novos };
}

export function updateLead(id, patch) { write(LK, listLeads().map(l => (l.id === id ? { ...l, ...patch } : l))); }
export function deleteLead(id) { write(LK, listLeads().filter(l => l.id !== id)); }

export function loadSettings() { return { ...DEFAULT_SETTINGS, ...read(SK, {}) }; }
export function saveSettings(v) { write(SK, v); }

// Cópia de segurança: como não há conta, é assim que a pessoa leva os contatos para outro aparelho.
export function exportBackup() {
  const blob = new Blob([JSON.stringify({ app: 'prospecnow', v: 1, leads: listLeads(), settings: loadSettings() })], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'prospecnow-backup-' + today() + '.json';
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
export async function importBackup(file) {
  let d;
  try { d = JSON.parse(await file.text()); } catch (e) { throw new Error('Esse arquivo não é um backup do ProspecNow.'); }
  if (d?.app !== 'prospecnow' || !Array.isArray(d.leads)) throw new Error('Esse arquivo não é um backup do ProspecNow.');
  const cur = listLeads(), have = new Set(cur.map(l => l.id));
  const novos = d.leads.filter(l => l && typeof l.id === 'string' && !have.has(l.id) && Number.isFinite(Number(l.lat)) && Number.isFinite(Number(l.lng))).slice(0, MAX_LEADS - cur.length);
  write(LK, [...cur, ...novos]);
  if (d.settings && typeof d.settings === 'object') write(SK, { ...DEFAULT_SETTINGS, ...d.settings });
  return novos.length;
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
