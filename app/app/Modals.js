'use client';
import { useState } from 'react';
import { saveSettings, usarVarredura } from '@/lib/client';
import { scanCity, planArea, searchPlaces } from '@/lib/osm';
import { SEGMENTOS_BR, SEGMENTOS_PT, MAX_SEGMENTS, DEFAULT_SETTINGS } from '@/lib/plans';
import s from './app.module.css';

const PAISES = [['BR', 'Brasil'], ['PT', 'Portugal'], ['US', 'Estados Unidos'], ['ES', 'Espanha'], ['AR', 'Argentina'], ['MX', 'México']];

function Modal({ title, onClose, children, wide }) {
  return (
    <div className="modal-bg" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} style={wide ? { width: 'min(760px,100%)' } : null}>
        <div className="row" style={{ marginBottom: 14 }}><h2>{title}</h2><span className="spacer" /><button className="btn ghost sm" onClick={onClose}>Fechar</button></div>
        {children}
      </div>
    </div>
  );
}

/* ---------------- Varredura com o agente ---------------- */
export function ScanModal({ acc, onClose, onResults, onUpgrade }) {
  const [pais, setPais] = useState('BR');
  const [area, setArea] = useState('');
  const base = pais === 'PT' ? SEGMENTOS_PT : SEGMENTOS_BR;
  const [segs, setSegs] = useState(SEGMENTOS_BR.slice(0, MAX_SEGMENTS));
  const [extra, setExtra] = useState('');
  const [plano, setPlano] = useState(null);
  const [marc, setMarc] = useState({});
  const [prog, setProg] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const left = Math.max(0, Math.min(10, acc.plan.scans - acc.usado)); // cidades que ainda cabem no mês (até 10 por vez)

  if (acc.plan.scans === 0 || left === 0) return (
    <Modal title="Varredura automática" onClose={onClose}>
      <p className="muted">{acc.plan.id === 'expirado' ? 'Seu acesso não está ativo. Ative 7 dias por R$ 10 ou escolha um plano para varrer cidades.'
        : acc.plan.scans === 0 ? 'A varredura automática de cidades está nos planos Pro e Agência. No seu plano, você busca e adiciona negócios um a um.'
        : `Você já usou as ${acc.plan.scans} varreduras do mês no plano ${acc.plan.name}. Elas voltam no dia 1º, ou você pode mudar de plano.`}</p>
      <div className="row" style={{ marginTop: 16 }}><button className="btn" onClick={onUpgrade}>Ver planos</button></div>
    </Modal>
  );

  function toggle(sg) { setSegs(v => v.includes(sg) ? v.filter(x => x !== sg) : v.length >= MAX_SEGMENTS ? v : [...v, sg]); }
  function changePais(p) { setPais(p); setSegs((p === 'PT' ? SEGMENTOS_PT : SEGMENTOS_BR).slice(0, MAX_SEGMENTS)); }

  async function planejar(e) {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      // as cidades da região saem do OpenStreetMap, no navegador, sem IA e sem custo
      const j = await planArea(area.trim().slice(0, 120), pais, left);
      const cidades = (j.cidades || []).slice(0, left);
      setPlano({ ...j, cidades, pais: j.pais && /^[A-Z]{2}$/.test(j.pais) ? j.pais : pais });
      const m = {}; cidades.forEach((c, i) => { m[i] = i < Math.min(left, 3); }); setMarc(m);
    } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  }

  async function varrer() {
    const lista = plano.cidades.filter((_, i) => marc[i]);
    if (!lista.length) return;
    setErr(''); setBusy(true);
    const resumo = [];
    for (let i = 0; i < lista.length; i++) {
      setProg({ i, n: lista.length, cidade: lista[i].cidade, resumo: [...resumo] });
      try {
        const busca = lista[i].busca || lista[i].cidade;
        const uso = await usarVarredura(); // o banco confere o limite do plano antes de cada cidade
        if (!uso?.ok) { resumo.push({ cidade: lista[i].cidade, erro: `Limite do mês atingido (${uso?.limite ?? 0} varreduras).` }); break; }
        const vistos = new Set();
        const results = (await scanCity(busca, segs, plano.pais))
          .filter(p => p && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng)) && p.place_id && !vistos.has(p.place_id) && vistos.add(p.place_id))
          .slice(0, 800)
          .map(p => ({ ...p, segmento: segs.includes(p.segmento) ? p.segmento : segs[0], cidade: lista[i].cidade, pais: plano.pais }));
        resumo.push({ cidade: lista[i].cidade, total: results.length, comTelefone: results.filter(r => r.digits).length, semSite: results.filter(r => !r.site).length });
        await onResults(results);
      } catch (e2) {
        resumo.push({ cidade: lista[i].cidade, erro: e2.message });
      }
    }
    setProg({ i: lista.length, n: lista.length, done: true, resumo });
    setBusy(false);
  }

  return (
    <Modal title="Nova varredura" onClose={onClose} wide>
      {!plano && (
        <form onSubmit={planejar} style={{ display: 'grid', gap: 14 }}>
          <p className="muted">Você ainda tem <b>{acc.plan.scans - acc.usado}</b> varredura(s) neste mês. Cada cidade usa 1 varredura, com até {MAX_SEGMENTS} segmentos.</p>
          <div className={s.grid2}>
            <div className="field"><label htmlFor="area">Onde procurar</label><input id="area" value={area} onChange={e => setArea(e.target.value)} placeholder="Ex.: Cajamar, região de Jundiaí, Portugal" required /></div>
            <div className="field"><label htmlFor="pais">País</label><select id="pais" value={pais} onChange={e => changePais(e.target.value)}>{PAISES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          </div>
          <div className="field">
            <label>Segmentos ({segs.length}/{MAX_SEGMENTS})</label>
            <div className={s.chipsWrap}>
              {[...new Set([...base, ...segs])].map(sg => <button type="button" key={sg} className="chip" aria-pressed={segs.includes(sg)} onClick={() => toggle(sg)}>{sg}</button>)}
            </div>
            <div className="row">
              <input className="input" style={{ flex: 1, minWidth: 160 }} value={extra} onChange={e => setExtra(e.target.value)} placeholder="Outro segmento (ex.: Lava-rápido)" />
              <button type="button" className="btn ghost sm" onClick={() => { const v = extra.trim(); if (v && !segs.includes(v) && segs.length < MAX_SEGMENTS) setSegs([...segs, v]); setExtra(''); }}>Adicionar</button>
            </div>
          </div>
          {err && <p className="err">{err}</p>}
          <div className="row"><button className="btn" disabled={busy || !segs.length}>{busy ? 'Procurando as cidades…' : 'Procurar cidades'}</button></div>
        </form>
      )}

      {plano && !prog && (
        <div style={{ display: 'grid', gap: 14 }}>
          <p className="muted">{plano.nota}</p>
          <div className={s.cityList}>
            {plano.cidades.map((c, i) => (
              <label key={i} className={s.cityRow}><input type="checkbox" checked={!!marc[i]} onChange={e => { const n = { ...marc, [i]: e.target.checked }; if (Object.values(n).filter(Boolean).length <= left) setMarc(n); }} /><span><b>{c.cidade}</b><small>{c.busca}</small></span></label>
            ))}
          </div>
          <p className={s.h}>Segmentos: {segs.join(', ')}</p>
          {err && <p className="err">{err}</p>}
          <div className="row">
            <button className="btn" onClick={varrer} disabled={busy || !Object.values(marc).some(Boolean)}>Varrer {Object.values(marc).filter(Boolean).length} cidade(s)</button>
            <button className="btn ghost" onClick={() => setPlano(null)}>Voltar</button>
          </div>
        </div>
      )}

      {prog && (
        <div style={{ display: 'grid', gap: 12 }}>
          {!prog.done && <p><b>Varrendo {prog.cidade}…</b> ({prog.i + 1} de {prog.n})</p>}
          <div className={s.prog}><i style={{ width: `${Math.round(((prog.done ? prog.n : prog.i) / prog.n) * 100)}%` }} /></div>
          <ul className={s.resumo}>
            {prog.resumo.map((r, i) => <li key={i}>{r.erro ? <span className="err">{r.cidade}: {r.erro}</span> : <><b>{r.cidade}</b>: {r.total} negócios, {r.comTelefone} com telefone, {r.semSite} sem site cadastrado</>}</li>)}
          </ul>
          {prog.done && <div className="row"><button className="btn" onClick={onClose}>Ver no mapa</button></div>}
        </div>
      )}
    </Modal>
  );
}

/* ---------------- Busca manual ---------------- */
function cityFrom(addr) {
  const a = String(addr || '');
  let m = a.match(/,\s*([^,]+?)\s*-\s*[A-Z]{2}\s*,/); if (m) return m[1];
  m = a.match(/\d{4}-\d{3}\s+([^,]+)/); if (m) return m[1];
  const p = a.split(',').map(x => x.trim()); return p.length > 2 ? p[p.length - 2] : '';
}
export function AddModal({ acc, onClose, onAdded, onUpgrade }) {
  const [q, setQ] = useState('');
  const [pais, setPais] = useState('BR');
  const [seg, setSeg] = useState('');
  const [res, setRes] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState({});
  if (acc.plan.id === 'expirado') return (
    <Modal title="Adicionar negócio" onClose={onClose}>
      <p className="muted">Seu acesso não está ativo. Ative 7 dias por R$ 10 ou escolha um plano para buscar e salvar negócios.</p>
      <div className="row" style={{ marginTop: 16 }}><button className="btn" onClick={onUpgrade}>Ver planos</button></div>
    </Modal>
  );
  async function buscar(e) {
    e.preventDefault(); setErr(''); setBusy(true);
    try { setRes(await searchPlaces(q.trim().slice(0, 120), pais)); } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  }
  async function add(p) {
    const row = { ...p, segmento: seg || 'Outros', cidade: p.cidade || cityFrom(p.endereco), pais };
    try { await onAdded(row); setAdded(a => ({ ...a, [p.place_id]: true })); } catch (e2) { setErr(e2.message); }
  }
  return (
    <Modal title="Adicionar negócio" onClose={onClose} wide>
      <form onSubmit={buscar} style={{ display: 'grid', gap: 12 }}>
        <p className="muted">Busque pelo nome do negócio e a cidade. Os resultados vêm do OpenStreetMap, então negócios muito pequenos podem não aparecer.</p>
        <div className={s.grid2}>
          <div className="field"><label htmlFor="q">Nome ou tipo de negócio e cidade</label><input id="q" value={q} onChange={e => setQ(e.target.value)} placeholder="Ex.: Barbearia do Zé, Barueri" required /></div>
          <div className="field"><label htmlFor="p2">País</label><select id="p2" value={pais} onChange={e => setPais(e.target.value)}>{PAISES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        </div>
        <div className="field"><label htmlFor="sg">Segmento para salvar</label><input id="sg" value={seg} onChange={e => setSeg(e.target.value)} placeholder="Ex.: Barbearia" /></div>
        {err && <p className="err">{err}</p>}
        <div className="row"><button className="btn" disabled={busy}>{busy ? 'Buscando…' : 'Buscar'}</button></div>
      </form>
      {res && (
        <ul className={s.results}>
          {!res.length && <li className="muted">Nada encontrado.</li>}
          {res.map(p => (
            <li key={p.place_id}>
              <div><b>{p.nome}</b><small>{p.endereco}</small><small>{p.telefone ? p.telefone : 'sem telefone'} · {p.site ? 'tem site' : 'sem site cadastrado'}</small></div>
              <button className="btn sm" disabled={added[p.place_id]} onClick={() => add(p)}>{added[p.place_id] ? 'Adicionado' : 'Adicionar'}</button>
            </li>
          ))}
        </ul>
      )}
      <p className={s.src}>Dados: © colaboradores do OpenStreetMap.</p>
    </Modal>
  );
}

/* ---------------- Configurações ---------------- */
export function SettingsModal({ settings, onClose, onSaved }) {
  const [v, setV] = useState({ ...DEFAULT_SETTINGS, ...settings });
  const [ok, setOk] = useState(''); const [err, setErr] = useState('');
  async function save(e) {
    e.preventDefault(); setErr(''); setOk('');
    if (v.link && !/^https?:\/\//.test(v.link)) { setErr('O link precisa começar com https://'); return; }
    try { await saveSettings(v); onSaved(v); setOk('Salvo.'); } catch (e2) { setErr(e2.message); }
  }
  const f = (k) => ({ value: v[k], onChange: e => setV({ ...v, [k]: e.target.value }) });
  return (
    <Modal title="Suas mensagens" onClose={onClose} wide>
      <form onSubmit={save} style={{ display: 'grid', gap: 12 }}>
        <div className={s.grid2}>
          <div className="field"><label htmlFor="mn">Seu nome</label><input id="mn" {...f('meu_nome')} placeholder="Ex.: Guilherme Torres" /></div>
          <div className="field"><label htmlFor="ml">Link do seu trabalho</label><input id="ml" {...f('link')} placeholder="https://... (portfólio, Instagram)" /></div>
        </div>
        <div className="field"><label htmlFor="sv">O que você oferece</label><input id="sv" {...f('servico')} placeholder="Ex.: criação de sites, gestão de Instagram, tráfego pago, fotografia" /></div>
        <p className={s.h}>Use {'{nome}'}, {'{segmento}'}, {'{cidade}'}, {'{link}'}, {'{meu_nome}'} e {'{servico}'}. O 1º acompanhamento sai 4 dias depois do primeiro contato, e o último, 7 dias depois do segundo.</p>
        <div className="field"><label htmlFor="m0">Primeiro contato</label><textarea id="m0" {...f('m0')} /></div>
        <div className="field"><label htmlFor="m1">1º acompanhamento</label><textarea id="m1" {...f('m1')} /></div>
        <div className="field"><label htmlFor="m2">Último acompanhamento</label><textarea id="m2" {...f('m2')} /></div>
        {err && <p className="err">{err}</p>}{ok && <p className="okmsg">{ok}</p>}
        <div className="row"><button className="btn">Salvar</button><button type="button" className="btn ghost" onClick={() => setV({ ...DEFAULT_SETTINGS, meu_nome: v.meu_nome, link: v.link, servico: v.servico })}>Voltar aos textos originais</button></div>
      </form>
    </Modal>
  );
}
