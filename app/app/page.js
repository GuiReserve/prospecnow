'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { listLeads, addLeads, seq, STATUS, infoOf, loadAccount, supabase, migrarContatosLocais, exportCsv } from '@/lib/client';
import dynamic from 'next/dynamic';
import { PAID as PAID_IDS } from '@/lib/plans';
const MapView = dynamic(() => import('./MapView'), { ssr: false });
const hasMap = true;
import Panel from './Panel';
import { ScanModal, AddModal, SettingsModal } from './Modals';
import s from './app.module.css';

export default function AppPage() {
  const router = useRouter();
  const [acc, setAcc] = useState(null);
  const [loadErr, setLoadErr] = useState('');
  const [leads, setLeads] = useState([]);
  const [sel, setSel] = useState(null);
  const [view, setView] = useState(hasMap ? 'mapa' : 'lista');
  const [mode, setMode] = useState('2d');
  const [seg, setSeg] = useState('Todos');
  const [city, setCity] = useState('Todas');
  const [stf, setStf] = useState('todos');
  const [site, setSite] = useState('todos');
  const [q, setQ] = useState('');
  const [modal, setModal] = useState(null);
  const [fitKey, setFitKey] = useState(0);
  const [toast, setToast] = useState('');

  const recarregarConta = useCallback(async () => setAcc(await loadAccount()), []);

  useEffect(() => {
    (async () => {
      try {
        const a = await loadAccount();
        setAcc(a);
        const n = await migrarContatosLocais().catch(() => 0);
        if (n) setToast(`${n} contato(s) salvos neste navegador foram levados para a sua conta.`);
        setLeads(await listLeads());
        setFitKey(k => k + 1);
      } catch (e) {
        if (e.status === 401) { supabase().auth.signOut().catch(() => {}); router.replace('/entrar'); }
        else setLoadErr(e.message || 'Não consegui carregar.');
      }
    })();
  }, [router]);

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 5000); return () => clearTimeout(t); }, [toast]);

  const nameOf = useCallback(l => l.nome || `${l.segmento || 'Negócio'} em ${l.cidade || ''}`, []);
  const segs = useMemo(() => [...new Set(leads.map(l => l.segmento).filter(Boolean))].sort(), [leads]);
  const cities = useMemo(() => [...new Set(leads.map(l => l.cidade).filter(Boolean))].sort(), [leads]);
  const visible = useMemo(() => leads.filter(l => {
    if (seg !== 'Todos' && l.segmento !== seg) return false;
    if (city !== 'Todas' && l.cidade !== city) return false;
    const k = seq(l).k;
    if (site === 'sem' && l.sem_site === false) return false;
    if (site === 'com' && l.sem_site !== false) return false;
    if (stf === 'hoje' && !(k === 'novo' || k === 'due')) return false;
    if (stf !== 'todos' && stf !== 'hoje' && !(k === stf || (stf === 'aguard' && k === 'due'))) return false;
    if (q) { const t = (nameOf(l) + ' ' + l.segmento + ' ' + l.cidade).toLowerCase(); if (!t.includes(q.toLowerCase())) return false; }
    return true;
  }), [leads, seg, city, stf, site, q, nameOf]);
  const counts = useMemo(() => {
    const c = { hoje: 0, aguard: 0, conv: 0, fechou: 0 };
    leads.forEach(l => { const k = seq(l).k; if (k === 'novo' || k === 'due') c.hoje++; if (k === 'aguard' || k === 'due') c.aguard++; if (k === 'conv') c.conv++; if (k === 'fechou') c.fechou++; });
    return c;
  }, [leads]);

  useEffect(() => { setFitKey(k => k + 1); }, [seg, city]);

  const selLead = leads.find(l => l.id === sel) || null;
  const pick = useCallback(l => setSel(l.id), []);

  async function onResults(results) {
    try { await addLeads(results); setLeads(await listLeads()); setFitKey(k => k + 1); }
    catch (e) { setToast(e.message); }
  }
  async function sair() { await supabase().auth.signOut().catch(() => {}); router.push('/'); }

  if (!acc) return (
    <div className={s.loading}>
      {loadErr ? (
        <div style={{ textAlign: 'center', display: 'grid', gap: 12, maxWidth: 380, padding: 16 }}>
          <p className="err">{loadErr}</p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <button className="btn sm" onClick={() => location.reload()}>Tentar de novo</button>
            <button className="btn ghost sm" onClick={sair}>Sair</button>
          </div>
        </div>
      ) : 'Carregando…'}
    </div>
  );
  const p = acc.plan, settings = acc.settings;
  const dias = Math.max(0, Math.ceil((new Date(acc.profile.trial_ends_at) - new Date()) / 864e5));

  return (
    <div className={s.app}>
      {view === 'mapa' && hasMap && <MapView leads={visible} nameOf={nameOf} selectedId={sel} onPick={pick} mode={mode} fitKey={fitKey} panelOpen={!!selLead} />}

      <header className={s.top + (selLead ? ' ' + s.shift : '')}>
        <div className={s.bar}>
          <Link href="/" className="logo" aria-label="ProspecNow"><i /></Link>
          <input className={s.search} value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar nos seus contatos" aria-label="Buscar nos seus contatos" />
          <div className={s.seg2} role="group" aria-label="Visualização">
            <button aria-pressed={view === 'mapa'} onClick={() => setView('mapa')}>Mapa</button>
            <button aria-pressed={view === 'lista'} onClick={() => setView('lista')}>Lista</button>
          </div>
        </div>
        <div className={s.chips}>
          <button className="chip" aria-pressed={seg === 'Todos'} onClick={() => setSeg('Todos')}>Todos</button>
          {segs.map(x => <button key={x} className="chip" aria-pressed={seg === x} onClick={() => setSeg(x)}>{x}</button>)}
        </div>
        <div className={s.filters}>
          <select value={city} onChange={e => setCity(e.target.value)} aria-label="Cidade"><option value="Todas">Todas as cidades</option>{cities.map(c => <option key={c}>{c}</option>)}</select>
          <select value={stf} onChange={e => setStf(e.target.value)} aria-label="Situação">
            <option value="todos">Todas as situações ({leads.length})</option>
            <option value="hoje">Para fazer hoje ({counts.hoje})</option>
            <option value="aguard">Aguardando resposta ({counts.aguard})</option>
            <option value="conv">Em conversa ({counts.conv})</option>
            <option value="fechou">Fechados ({counts.fechou})</option>
          </select>
          <select value={site} onChange={e => setSite(e.target.value)} aria-label="Site"><option value="todos">Com e sem site</option><option value="sem">Só sem site</option><option value="com">Só com site</option></select>
        </div>
      </header>

      <div className={s.right}>
        <div className={s.planBox}>
          <span className={s.planName}>{p.name}{p.id === 'trial' ? ` · ${dias} dia(s)` : ''}{p.id === 'semana' ? ` · até ${new Date(acc.profile.paid_until).toLocaleDateString('pt-BR')}` : ''}</span>
          {p.scans > 0 && <span>Varreduras {Math.min(acc.usado, p.scans)}/{p.scans}</span>}
          <span>Contatos {leads.length}</span>
          <Link href="/planos" className={s.planLink}>{p.id === 'expirado' ? 'Ativar' : PAID_IDS.includes(p.id) ? 'Plano' : 'Assinar'}</Link>
        </div>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn sm" onClick={() => setModal('scan')}>Nova varredura</button>
          <button className="btn ghost sm" onClick={() => setModal('add')}>Adicionar negócio</button>
          <button className="btn ghost sm" onClick={() => setModal('settings')}>Mensagens</button>
          <button className="btn ghost sm" onClick={() => exportCsv(leads)} disabled={!leads.length}>Planilha</button>
          <button className="btn ghost sm" onClick={sair}>Sair</button>
        </div>
        {view === 'mapa' && hasMap && (
          <div className={s.viewBtns} role="group" aria-label="Modo do mapa">
            <button aria-pressed={mode === '2d'} onClick={() => setMode('2d')}>2D</button>
            <button aria-pressed={mode === '3d'} onClick={() => setMode('3d')}>3D</button>
          </div>
        )}
      </div>

      {p.id === 'expirado' && <div className={s.banner}>Seu acesso não está ativo. Seus contatos continuam salvos. <Link href="/planos">Ative 7 dias por R$ 10</Link> ou escolha um plano para fazer varreduras e buscas.</div>}

      {view === 'lista' && <div className={s.listHead} />}
      {view === 'lista' && (
        <section className={s.list + (selLead ? ' ' + s.shiftList : '')} aria-label="Lista de contatos">
          {!visible.length && (
            <div className={s.empty}>
              <h3>{leads.length ? 'Nada neste filtro' : 'Comece pela sua primeira varredura'}</h3>
              <p className="muted">{leads.length ? 'Mude os filtros acima.' : 'Diga uma cidade, região ou país e o agente encontra os negócios para você.'}</p>
              {!leads.length && <button className="btn" onClick={() => setModal('scan')}>Nova varredura</button>}
            </div>
          )}
          {visible.slice(0, 400).map(l => {
            const k = seq(l).k, st = STATUS[k];
            return (
              <button key={l.id} className={s.item + (l.id === sel ? ' ' + s.itemSel : '')} onClick={() => setSel(l.id)}>
                <i style={{ background: st.pin || st.color }} />
                <span><b>{nameOf(l)}</b><small>{l.segmento} · {l.cidade}{l.sem_site ? ' · sem site' : ''}{l.digits ? '' : ' · sem telefone'}</small></span>
                <em style={{ background: st.bg, color: st.color }}>{st.label}</em>
              </button>
            );
          })}
          {visible.length > 400 && <p className="muted" style={{ padding: 12 }}>Mostrando 400 de {visible.length}. Use os filtros.</p>}
          <p className={s.src}>Dados dos negócios: © colaboradores do OpenStreetMap</p>
        </section>
      )}

      {view === 'mapa' && !leads.length && hasMap && (
        <div className={s.firstRun}><b>Comece pela sua primeira varredura</b><span className="muted">Diga uma cidade, região ou país.</span><button className="btn sm" onClick={() => setModal('scan')}>Nova varredura</button></div>
      )}

      {selLead && <Panel lead={selLead} info={infoOf(selLead)} settings={settings}
        onClose={() => setSel(null)} onChange={l => setLeads(v => v.map(x => x.id === l.id ? l : x))} onRemoved={id => { setLeads(v => v.filter(x => x.id !== id)); setSel(null); }} onSettings={() => setModal('settings')} />}

      {modal === 'scan' && <ScanModal acc={acc} onClose={() => { setModal(null); recarregarConta().catch(() => {}); }} onResults={onResults} onUpgrade={() => router.push('/planos')} />}
      {modal === 'add' && <AddModal acc={acc} onClose={() => setModal(null)} onAdded={r => onResults([r])} onUpgrade={() => router.push('/planos')} />}
      {modal === 'settings' && <SettingsModal settings={settings} onClose={() => setModal(null)} onSaved={v => setAcc(a => ({ ...a, settings: v }))} />}
      {toast && <div className={s.toast} role="status">{toast}</div>}
    </div>
  );
}
