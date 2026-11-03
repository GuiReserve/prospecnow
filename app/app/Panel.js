'use client';
import { useEffect, useState } from 'react';
import { seq, stepIdx, STEP, STATUS, fillTemplate, today, updateLead, deleteLead, safeUrl } from '@/lib/client';
import s from './app.module.css';

const SEGC = ['#2F7FD1', '#1E9E5A', '#D98E0B', '#2E8C8C', '#4F79A8', '#6E9A34', '#C2703A', '#5C6BB8', '#3E8E6B', '#A06A2C'];
function hash(t) { let h = 0; for (const c of String(t)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); }
function initials(n) { return String(n).replace(/[^A-Za-zÀ-ÿ0-9 ]/g, '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase(); }
const I = {
  wa: <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm4.5 12.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" /></svg>,
  tel: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" /></svg>,
  route: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m3 11 18-8-8 18-2-8Z" /></svg>,
  maps: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2Z" /><path d="M9 4v14M15 6v14" /></svg>,
  pin: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z" /><circle cx="12" cy="10" r="2.5" /></svg>,
  web: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>
};

export default function Panel({ lead, info, settings, onClose, onChange, onRemoved, onSettings }) {
  const r = lead;
  const sq = seq(r);
  const st = STATUS[sq.k];
  const step = stepIdx(r);
  const closed = ['fechou', 'nao', 'fim', 'conv'].includes(sq.k);
  const nome = info?.nome || `${r.segmento || 'Negócio'} em ${r.cidade || ''}`;
  const base = fillTemplate(settings['m' + step], { nome: info?.nome || '', segmento: r.segmento, cidade: r.cidade, link: settings.link, meu_nome: settings.meu_nome, servico: settings.servico });
  const [msg, setMsg] = useState(base);
  const [nota, setNota] = useState(r.note || '');

  useEffect(() => { setMsg(base); setNota(r.note || ''); }, [r.id, step, info?.nome]); // eslint-disable-line

  const wa = /^\d{8,15}$/.test(info?.digits || '') ? `https://wa.me/${info.digits}?text=${encodeURIComponent(msg)}` : '';
  const rota = r.lat != null ? `https://www.google.com/maps/dir/?api=1&destination=${Number(r.lat)},${Number(r.lng)}` : '';
  const busca = `https://www.google.com/search?q=${encodeURIComponent(nome + ' ' + (r.cidade || ''))}`;
  const ig = String(info?.instagram || '').replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').replace(/[^A-Za-z0-9._]/g, '');

  async function sent() {
    const c = [...(r.contacts || [])];
    const t = today();
    if (c.length < 3 && c[c.length - 1] !== t) c.push(t);
    const patch = { contacts: c, status: r.status === 'novo' ? 'auto' : r.status };
    await updateLead(r.id, patch); onChange({ ...r, ...patch });
  }
  async function setStatus(v) {
    const patch = { status: v === 'auto' ? ((r.contacts || []).length ? 'auto' : 'novo') : v };
    await updateLead(r.id, patch); onChange({ ...r, ...patch });
  }
  async function undo() {
    const c = (r.contacts || []).slice(0, -1);
    const patch = { contacts: c, status: !c.length && r.status === 'auto' ? 'novo' : r.status };
    await updateLead(r.id, patch); onChange({ ...r, ...patch });
  }
  async function saveNote() { if (nota !== r.note) { await updateLead(r.id, { note: nota }); onChange({ ...r, note: nota }); } }
  async function remove() {
    if (!confirm('Tirar este negócio da sua lista?')) return;
    await deleteLead(r.id); onRemoved(r.id);
  }
  async function addPhoto() {
    const u = prompt('Cole o link (https://) de uma foto do lugar:', r.photo_url || '');
    if (u === null) return;
    const v = u.trim();
    if (v && !/^https:\/\//.test(v)) { alert('O link precisa começar com https://'); return; }
    await updateLead(r.id, { photo_url: v || null }); onChange({ ...r, photo_url: v || null });
  }

  let nxt = '';
  if (sq.k === 'due') nxt = `Hoje é dia do ${STEP[step].toLowerCase()}.`;
  else if (sq.k === 'aguard') nxt = `${STEP[step]} em ${sq.left} dia(s), em ${sq.next.split('-').reverse().join('/')}.`;
  else if (sq.k === 'novo') nxt = 'Ainda não recebeu mensagem.';

  const foto = safeUrl(r.photo_url);
  const h = hash(r.segmento || '');

  return (
    <aside className={s.panel} aria-label="Detalhes do negócio">
      <div className={s.cover}>
        {foto ? <img src={foto} alt={'Foto de ' + nome} referrerPolicy="no-referrer" /> :
          <div className={s.ph} style={{ background: `linear-gradient(135deg,${SEGC[h % 10]},${SEGC[(h + 3) % 10]})` }}>
            <span className={s.ini}>{initials(info?.nome || r.segmento || '?')}</span><span className={s.sg}>{r.segmento}</span>
          </div>}
        <button className={s.x} onClick={onClose} aria-label="Fechar">×</button>
        <button className={s.addph} onClick={addPhoto}>{r.photo_url ? 'Trocar foto' : 'Adicionar foto'}</button>
      </div>
      <div className={s.pb}>
        <h2>{nome}</h2>
        <div className={s.rt}>
            <span>{r.segmento}</span>
        </div>
        <span className="pill" style={{ background: st.bg, color: st.color, marginTop: 10 }}>{st.label}</span>

        {<>
          <div className={s.acts}>
            <a className={s.wa + (wa && !closed ? '' : ' ' + s.off)} href={wa || undefined} target="_blank" rel="noopener" onClick={() => wa && !closed && sent()}><span className={s.c}>{I.wa}</span>WhatsApp</a>
            <a className={info.digits ? '' : s.off} href={info.digits ? 'tel:+' + info.digits : undefined}><span className={s.c}>{I.tel}</span>Ligar</a>
            <a className={rota ? '' : s.off} href={rota || undefined} target="_blank" rel="noopener"><span className={s.c}>{I.route}</span>Rota</a>
            <a href={busca} target="_blank" rel="noopener"><span className={s.c}>{I.maps}</span>Pesquisar</a>
          </div>
          <ul className={s.info}>
            <li>{I.pin}<span>{info.endereco || r.cidade}</span></li>
            <li>{I.tel}<span>{info.telefone || 'Sem telefone cadastrado'}{info.celular === false ? ' · parece fixo' : ''}</span></li>
            <li>{I.web}<span className={info.site ? '' : s.warn}>{safeUrl(info.site) ? <a href={safeUrl(info.site)} target="_blank" rel="noopener nofollow">{info.site.replace(/^https?:\/\//, '').slice(0, 40)}</a> : 'Nenhum site cadastrado'}</span></li>
            {ig && <li>{I.web}<span><a href={`https://instagram.com/${ig}`} target="_blank" rel="noopener nofollow">@{ig}</a></span></li>}
            {info.horario && <li>{I.pin}<span>Horário: {info.horario}</span></li>}
          </ul>
        </>}

        <div className={s.sec}>
          <h3>{STEP[step]}</h3>
          <p className={s.h}>{nxt} Você pode editar antes de enviar.</p>
          {(!settings.meu_nome || !settings.servico) && <p className={s.cfg}>Coloque seu nome, o que você oferece e o link do seu trabalho em <button type="button" onClick={onSettings}>Mensagens</button> para a mensagem sair completa.</p>}
          <textarea value={msg} onChange={e => setMsg(e.target.value)} aria-label="Mensagem" />
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn ghost sm" onClick={() => setMsg(base)}>Voltar ao texto padrão</button>
          </div>
          {(info.digits
            ? <a className={'btn wa ' + s.send + (closed ? ' ' + s.off : '')} href={wa} target="_blank" rel="noopener" onClick={() => !closed && sent()}><span style={{ width: 20, height: 20, display: 'inline-flex' }}>{I.wa}</span>Enviar no WhatsApp</a>
            : <p className={s.h} style={{ marginTop: 10 }}>Esse negócio não tem telefone cadastrado. Use “Pesquisar” para achar o contato ou visite o local.</p>)}
          <div className={s.ctl}>
            <select value={['conv', 'fechou', 'nao', 'fim'].includes(r.status) ? r.status : 'auto'} onChange={e => setStatus(e.target.value)} aria-label="Situação">
              <option value="auto">Automático (pelo envio)</option>
              <option value="conv">Respondeu: em conversa</option>
              <option value="fechou">Fechou</option>
              <option value="nao">Sem interesse</option>
              <option value="fim">Encerrar</option>
            </select>
            {(r.contacts || []).length ? <button className="btn ghost sm" onClick={undo}>Desfazer último envio</button> : <span />}
            <input value={nota} onChange={e => setNota(e.target.value)} onBlur={saveNote} placeholder="Anotação (ex.: pediu orçamento)" />
          </div>
          {(r.contacts || []).length > 0 && <p className={s.hist}>Mensagens enviadas: {r.contacts.map(d => d.split('-').reverse().join('/')).join(', ')}</p>}
          <button className={s.remove} onClick={remove}>Tirar da minha lista</button>
        </div>
        <p className={s.src}>Dados do negócio: © colaboradores do OpenStreetMap. Confira antes de enviar. O envio é sempre manual: o botão abre a conversa e você confirma no WhatsApp.</p>
      </div>
    </aside>
  );
}
