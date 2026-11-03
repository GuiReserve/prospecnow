'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, loadAccount } from '@/lib/client';
import { PLANS, PAID, ITENS, SEMANA } from '@/lib/plans';
import s from './planos.module.css';

function fmt(d) { return d ? new Date(d).toLocaleDateString('pt-BR') : ''; }

export default function Planos() {
  const router = useRouter();
  const [acc, setAcc] = useState(null);
  const [esc, setEsc] = useState(null);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setAcc(await loadAccount());
        if (new URLSearchParams(location.search).get('pagamento') === 'ok') setOk('Pagamento recebido. Seu plano libera assim que o Asaas confirmar; se ainda não aparecer, recarregue a página em alguns segundos.');
      } catch (e) { if (e.status === 401) router.replace('/entrar?criar=1'); else setErr(e.message); }
    })();
  }, [router]);

  async function assinar(e) {
    e.preventDefault(); setErr(''); setOk(''); setBusy(true);
    try { const j = await api('/api/billing/subscribe', { plan: esc }); window.location.href = j.url; }
    catch (e2) { setErr(e2.message); setBusy(false); }
  }
  async function cancelar() {
    if (!confirm('Cancelar a renovação? Você continua usando até o fim do período já pago.')) return;
    setErr(''); setOk('');
    try { const j = await api('/api/billing/cancel', {}); setOk(`Renovação cancelada. Seu plano vale até ${fmt(j.ativoAte)}.`); setAcc(await loadAccount()); } catch (e2) { setErr(e2.message); }
  }

  if (!acc) return <div className={s.wrap}>{err ? <p className="err">{err}</p> : <p className="muted">Carregando…</p>}</div>;
  const p = acc.plan, pr = acc.profile;
  const pago = PAID.includes(p.id);
  const renova = pago && pr.asaas_subscription_id && !['canceling', 'canceled'].includes(pr.asaas_status);

  return (
    <div className={s.wrap}>
      <div className="row" style={{ marginBottom: 24 }}>
        <Link href="/app" className="logo"><i /><span>Prospec<b>Now</b></span></Link><span className="spacer" />
        <Link href="/app" className="btn ghost sm">Voltar ao mapa</Link>
      </div>
      <h1>Planos</h1>
      <div className={s.status + ' card'}>
        {p.id === 'trial' && <p>Você está no <b>teste grátis</b> até {fmt(pr.trial_ends_at)}.</p>}
        {p.id === 'semana' && <p>Seu acesso de <b>7 dias</b> vale até {fmt(pr.paid_until)}. Ele não renova sozinho: escolha um plano mensal para continuar depois.</p>}
        {p.id === 'expirado' && <p>Seu acesso não está ativo. Seus contatos continuam salvos.</p>}
        {pago && <p>Plano atual: <b>{p.name}</b>, ativo até {fmt(pr.paid_until)}. {renova ? 'Renova todo mês.' : 'Renovação cancelada.'}</p>}
        {p.scans > 0 && <p className="muted">Este mês: {Math.min(acc.usado, p.scans)}/{p.scans} varreduras de cidade.</p>}
        {renova && <button className={s.cancel} onClick={cancelar}>Cancelar renovação</button>}
      </div>
      {ok && <p className="okmsg" style={{ marginTop: 12 }}>{ok}</p>}
      {err && !esc && <p className="err" style={{ marginTop: 12 }}>{err}</p>}

      {!pago && (
        <div className={s.status + ' card'} style={{ marginTop: 16 }}>
          <h2 style={{ margin: 0 }}>{SEMANA.dias} dias por R$ {SEMANA.price}</h2>
          <p className="muted" style={{ margin: '6px 0 12px' }}>{SEMANA.scans} varreduras de cidade, busca manual, mapa e mensagens. Pagamento único por PIX, boleto ou cartão. Não renova sozinho.</p>
          <button className="btn" onClick={() => { setEsc('semana'); setErr(''); }}>{p.id === 'semana' ? 'Somar mais 7 dias' : 'Ativar 7 dias'}</button>
        </div>
      )}

      <div className={s.grid}>
        {PAID.map(id => {
          const pl = PLANS[id]; const atual = p.id === id;
          return (
            <div key={id} className={s.plan + (id === 'pro' ? ' ' + s.best : '')}>
              <h2>{pl.name}</h2>
              <p className={s.price}><b>R$ {pl.price}</b>/mês</p>
              <ul>{ITENS[id].map(t => <li key={t}>{t}</li>)}</ul>
              <button className={'btn ' + (id === 'pro' ? '' : 'ghost')} disabled={atual} onClick={() => { setEsc(id); setErr(''); }}>{atual ? 'Plano atual' : pago ? 'Trocar para este' : 'Assinar'}</button>
            </div>
          );
        })}
      </div>
      <p className={s.small}>Planos mensais pelo Asaas, com cartão ou boleto. Cancele quando quiser.</p>

      {esc && (
        <div className="modal-bg" onMouseDown={e => e.target === e.currentTarget && !busy && setEsc(null)}>
          <form className="modal" onSubmit={assinar} style={{ display: 'grid', gap: 12 }}>
            {esc === 'semana' ? <>
              <h2>{SEMANA.dias} dias · R$ {SEMANA.price}</h2>
              <p className="muted">Você vai para a página do Asaas para pagar R$ {SEMANA.price} uma vez. O acesso libera quando o pagamento for confirmado (PIX e cartão na hora; boleto em até 3 dias úteis) e não renova sozinho.</p>
            </> : <>
              <h2>{PLANS[esc].name} · R$ {PLANS[esc].price}/mês</h2>
              <p className="muted">Você vai para a página do Asaas para pagar a primeira mensalidade. O plano libera quando o pagamento for confirmado e renova todo mês até você cancelar.{renova ? ' Seu plano atual é encerrado quando o novo pagamento for confirmado.' : ''}</p>
            </>}
            {err && <p className="err">{err}</p>}
            <div className="row"><button className="btn" disabled={busy}>{busy ? 'Abrindo o pagamento…' : 'Continuar para o pagamento'}</button><button type="button" className="btn ghost" onClick={() => setEsc(null)} disabled={busy}>Voltar</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
