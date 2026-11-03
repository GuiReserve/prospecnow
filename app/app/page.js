'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, listLeads, mergeScanIntoMock, seq, STATUS, supabase, MOCK, mockSettings } from '@/lib/client';
import MapView, { hasMap } from './MapView';
import Panel from './Panel';
import { ScanModal, AddModal, SettingsModal } from './Modals';
import s from './app.module.css';

export default function AppPage() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [leads, setLeads] = useState([]);
  const [info, setInfo] = useState({}); // dados do Google só na memória desta sessão
  const [sel, setSel] = useState(null);
  const [opening, setOpening] = useState(false);
  const [view, setView] = useState(hasMap ? 'mapa' : 'lista');
  const [mode, setMode] = useState('2d');
  const [sat, setSat] = useState(false);
  const [seg, setSeg] = useState('Todos');
  const [city, setCity] = useState('Todas');
  const [stf, setStf] = useState('todos');
  const [semSite, setSemSite] = useState(true);
  const [q, setQ] = useState('');
  const [modal, setModal] = useState(null);
  const [fitKey, setFitKey] = useState(0);
  const [toast, setToast] = useState('');

  const loadMe = useCallback(async () => {
    const j = await api('/api/me');
    if (MOCK) { const ms = mockSettings(); if (ms) j.settings = { ...j.settings, ...ms }; }
    setMe(j);
  }, []);

  useEffect(() => {
    (async () => {
      if (!MOCK) {
        const { data } = await supabase().auth.getSession();
        if (!data.session) { router.replace('/entrar'); return; }
      }
      try {
        await loadMe();
        setLeads(await listLeads());
        setFitKey(k => k + 1);
        if (!MOCK) api('/api/leads/refresh', {}).then(r => { if (r.atualizados) listLeads().then(setLeads); }).catch(() => { });
      } catch (e) { if (e.status === 401) router.replace('/entrar'); else setToast(e.message); }
    })();
  }, [router, loadMe]);

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 5000); return () => clearTimeout(t); }, [toast]);

  const nameOf = useCallback(l => info[l.place_id]?.nome || `${l.segmento || 'Negócio'} em ${l.cidade || ''}`, [info]);
  const segs = useMemo(() => [...new Set(leads.map(l => l.segmento).filter(Boolean))].sort(), [leads]);
  const cities = useMemo(() => [...new Set(leads.map(l => l.cidade).filter(Boolean))].sort(), [leads]);
  const visible = useMemo(() => leads.filter(l => {
    if (seg !== 'Todos' && l.segmento !== seg) return false;
    if (city !== 'Todas' && l.cidade !== city) return false;
    const k = seq(l).k;
    if (semSite && l.sem_site === false && k === 'novo') return false;
    if (stf === 'hoje' && !(k === 'novo' || k === 'due')) return false;
    if (stf !== 'todos' && stf !== 'hoje' && !(k === stf || (stf === 'aguard' && k === 'due'))) return false;
    if (q) { const t = (nameOf(l) + ' ' + l.segmento + ' ' + l.cidade).toLowerCase(); if (!t.includes(q.toLowerCase())) return false; }
    return true;
  }), [leads, seg, city, stf, semSite, q, nameOf]);
  const counts = useMemo(() => {
    const c = { hoje: 0, aguard: 0, conv: 0, fechou: 0 };
    leads.forEach(l => { const k = seq(l).k; if (k === 'novo' || k === 'due') c.hoje++; if (k === 'aguard' || k === 'due') c.aguard++; if (k === 'conv') c.conv++; if (k === 'fechou') c.fechou++; });
    return c;
  }, [leads]);

  useEffect(() => { setFitKey(k => k + 1); }, [seg, city]);

  const selLead = leads.find(l => l.id === sel) || null;
  const pick = useCallback(l => setSel(l.id), []);

  async function openDetails() {
    if (!selLead) return;
    setOpening(true);
    try {
      const d = await api('/api/details', { place_id: selLead.place_id, pais: selLead.pais });
      setInfo(v => ({ ...v, [selLead.place_id]: d }));
      setMe(m => m && ({ ...m, usage: { ...m.usage, details: m.usage.details + 1 } }));
    } catch (e) { setToast(e.message); if (e.status === 402) setModal('limite'); } finally { setOpening(false); }
  }

  function onResults(results) {
    setInfo(v => { const n = { ...v }; results.forEach(r => { n[r.place_id] = r; }); return n; });
    mergeScanIntoMock(results).then(() => listLeads()).then(l => { setLeads(l); setFitKey(k => k + 1); });
    loadMe().catch(() => { });
  }

  async function sair() { if (!MOCK) await supabase().auth.signOut(); router.push('/'); }

  if (!me) return <div className={s.loading}>Carregando…</div>;
  const p = me.plan;
  const dias = Math.max(0, Math.ceil((new Date(me.trialEndsAt) - new Date()) / 864e5));

  return (
    <div className={s.app}>
      {view === 'mapa' && hasMap && <MapView leads={visible} nameOf={nameOf} selectedId={sel} onPick={pick} mode={mode} satellite={sat} fitKey={fitKey} panelOpen={!!selLead} />}
      {view === 'mapa' && !hasMap && <div className={s.nomap}><p><b>O mapa do Google aparece aqui</b> quando a chave do Google Maps estiver configurada. Enquanto isso, use a lista.</p></div>}

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
          <label className={s.check}><input type="checkbox" checked={semSite} onChange={e => setSemSite(e.target.checked)} /> Só sem site</label>
        </div>
      </header>

      <div className={s.right}>
        <div className={s.planBox}>
          <span className={s.planName}>{p.name}{p.id === 'trial' ? ` · ${dias} dia(s)` : ''}</span>
          <span>Varreduras {me.usage.scans}/{p.scans}</span>
          <span>Contatos {me.usage.details}/{p.details}</span>
          <Link href="/planos" className={s.planLink}>{p.id === 'trial' || p.id === 'expirado' ? 'Assinar' : 'Plano'}</Link>
        </div>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn sm" onClick={() => setModal('scan')}>Nova varredura</button>
          <button className="btn ghost sm" onClick={() => setModal('add')}>Adicionar negócio</button>
          <button className="btn ghost sm" onClick={() => setModal('settings')}>Mensagens</button>
          <button className="btn ghost sm" onClick={sair}>Sair</button>
        </div>
        {view === 'mapa' && hasMap && (
          <div className={s.viewBtns} role="group" aria-label="Modo do mapa">
            <button aria-pressed={mode === '2d'} onClick={() => setMode('2d')}>2D</button>
            <button aria-pressed={mode === '3d'} onClick={() => setMode('3d')}>3D</button>
            <button aria-pressed={sat} onClick={() => setSat(!sat)}>Satélite</button>
          </div>
        )}
      </div>

      {p.id === 'expirado' && <div className={s.banner}>Seu teste acabou. Seus contatos continuam salvos. <Link href="/planos">Escolha um plano</Link> para abrir contatos e fazer varreduras.</div>}

      {view === 'lista' && <div className={s.listHead} />}
      {view === 'lista' && (
        <section className={s.list + (selLead ? ' ' + s.shiftList : '')} aria-label="Lista de contatos">
          {!visible.length && (
            <div className={s.empty}>
              <h3>{leads.length ? 'Nada neste filtro' : 'Comece pela sua primeira varredura'}</h3>
              <p className="muted">{leads.length ? 'Mude os filtros acima.' : 'Diga uma cidade, região ou país e o agente encontra os negócios sem site para você.'}</p>
              {!leads.length && <button className="btn" onClick={() => setModal('scan')}>Nova varredura</button>}
            </div>
          )}
          {visible.slice(0, 400).map(l => {
            const k = seq(l).k, st = STATUS[k];
            return (
              <button key={l.id} className={s.item + (l.id === sel ? ' ' + s.itemSel : '')} onClick={() => setSel(l.id)}>
                <i style={{ background: st.pin || st.color }} />
                <span><b>{nameOf(l)}</b><small>{l.segmento} · {l.cidade}{l.sem_site ? ' · sem site' : ''}</small></span>
                <em style={{ background: st.bg, color: st.color }}>{st.label}</em>
              </button>
            );
          })}
          {visible.length > 400 && <p className="muted" style={{ padding: 12 }}>Mostrando 400 de {visible.length}. Use os filtros.</p>}
          <p className={s.src}>Dados dos negócios: Google Maps</p>
        </section>
      )}

      {view === 'mapa' && !leads.length && hasMap && (
        <div className={s.firstRun}><b>Comece pela sua primeira varredura</b><span className="muted">Diga uma cidade, região ou país.</span><button className="btn sm" onClick={() => setModal('scan')}>Nova varredura</button></div>
      )}

      {selLead && <Panel lead={selLead} info={info[selLead.place_id]} settings={me.settings} plan={p} opening={opening} onDetails={openDetails}
        onClose={() => setSel(null)} onChange={l => setLeads(v => v.map(x => x.id === l.id ? l : x))} onRemoved={id => { setLeads(v => v.filter(x => x.id !== id)); setSel(null); }} onSettings={() => setModal('settings')} />}

      {modal === 'scan' && <ScanModal me={me} onClose={() => setModal(null)} onResults={onResults} onUpgrade={() => router.push('/planos')} />}
      {modal === 'add' && <AddModal me={me} onClose={() => { setModal(null); loadMe(); }} onAdded={r => onResults([r])} />}
      {modal === 'settings' && <SettingsModal settings={me.settings} onClose={() => setModal(null)} onSaved={v => setMe(m => ({ ...m, settings: v }))} />}
      {modal === 'limite' && (
        <div className="modal-bg" onMouseDown={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal"><h2>Limite do mês</h2><p className="muted" style={{ margin: '10px 0 16px' }}>{toast || 'Você chegou ao limite do seu plano.'}</p><div className="row"><Link className="btn" href="/planos">Ver planos</Link><button className="btn ghost" onClick={() => setModal(null)}>Fechar</button></div></div>
        </div>
      )}
      {toast && modal !== 'limite' && <div className={s.toast} role="status">{toast}</div>}
      {MOCK && <div className={s.demo}>Modo de demonstração: dados de exemplo</div>}
    </div>
  );
}
