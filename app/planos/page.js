'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, supabase, MOCK } from '@/lib/client';
import { PLANS, PAID } from '@/lib/plans';
import s from './planos.module.css';

const ITENS = {
  essencial: ['Mapa 2D e 3D', 'Busca e adiciona negócios um a um', `${PLANS.essencial.details} contatos abertos por mês`, 'Acompanhamentos e mensagens prontas'],
  pro: ['Tudo do Essencial', `Agente de IA com ${PLANS.pro.scans} varreduras de cidade`, `${PLANS.pro.details} contatos abertos por mês`, 'Mensagens reescritas pela IA'],
  agencia: ['Tudo do Pro', `${PLANS.agencia.scans} varreduras de cidade`, `${PLANS.agencia.details} contatos abertos por mês`, 'Varre regiões e países inteiros']
};

function fmt(d) { return d ? new Date(d).toLocaleDateString('pt-BR') : ''; }

export default function Planos() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [esc, setEsc] = useState(null);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      if (!MOCK) { const { data } = await supabase().auth.getSession(); if (!data.session) { router.replace('/entrar'); return; } }
      try { const j = await api('/api/me'); setMe(j); if (new URLSearchParams(location.search).get('pagamento') === 'ok') setOk('Pagamento recebido. Seu plano libera em alguns segundos; se ainda não aparecer, recarregue a página.'); } catch (e) { router.replace('/entrar'); }
    })();
  }, [router]);

  async function assinar(e) {
    e.preventDefault(); setErr(''); setOk(''); setBusy(true);
    try {
      const j = await api('/api/billing/subscribe', { plan: esc });
      if (j.url) window.location.href = j.url;
      else if (j.trocado) { setOk('Plano trocado. O novo valor vale a partir da próxima fatura.'); setMe(await api('/api/me')); setEsc(null); }
    } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  }
  async function cancelar() {
    if (!confirm('Cancelar a renovação? Você continua usando até o fim do período já pago.')) return;
    setErr(''); setOk('');
    try { const j = await api('/api/billing/cancel', {}); setOk(`Renovação cancelada. Seu plano vale até ${fmt(j.ativoAte)}.`); setMe(await api('/api/me')); } catch (e2) { setErr(e2.message); }
  }

  if (!me) return <div className={s.wrap}><p className="muted">Carregando…</p></div>;
  const pago = PAID.includes(me.plan.id);

  return (
    <div className={s.wrap}>
      <div className="row" style={{ marginBottom: 24 }}>
        <Link href="/app" className="logo"><i /><span>Prospec<b>Now</b></span></Link><span className="spacer" />
        <Link href="/app" className="btn ghost sm">Voltar ao mapa</Link>
      </div>
      <h1>Planos</h1>
      <div className={s.status + ' card'}>
        {me.plan.id === 'trial' && <p>Você está no <b>teste grátis</b> até {fmt(me.trialEndsAt)}.</p>}
        {me.plan.id === 'expirado' && <p>Seu teste acabou. Seus contatos continuam salvos; escolha um plano para continuar.</p>}
        {pago && <p>Plano atual: <b>{me.plan.name}</b>, ativo até {fmt(me.paidUntil)}. {me.assinaturaAtiva ? 'Renova todo mês.' : 'Renovação cancelada.'}</p>}
        <p className="muted">Este mês: {me.usage.scans}/{me.plan.scans} varreduras · {me.usage.details}/{me.plan.details} contatos abertos · {me.usage.ai}/{me.plan.ai} mensagens pela IA.</p>
        {pago && me.assinaturaAtiva && <button className={s.cancel} onClick={cancelar}>Cancelar renovação</button>}
      </div>
      {ok && <p className="okmsg" style={{ marginTop: 12 }}>{ok}</p>}
      {err && !esc && <p className="err" style={{ marginTop: 12 }}>{err}</p>}

      <div className={s.grid}>
        {PAID.map(id => {
          const p = PLANS[id]; const atual = me.plan.id === id;
          return (
            <div key={id} className={s.plan + (id === 'pro' ? ' ' + s.best : '')}>
              <h2>{p.name}</h2>
              <p className={s.price}><b>R$ {p.price}</b>/mês</p>
              <ul>{ITENS[id].map(t => <li key={t}>{t}</li>)}</ul>
              <button className={'btn ' + (id === 'pro' ? '' : 'ghost')} disabled={atual} onClick={() => { setEsc(id); setErr(''); }}>{atual ? 'Plano atual' : pago ? 'Trocar para este' : 'Assinar'}</button>
            </div>
          );
        })}
      </div>
      <p className={s.small}>Pagamento seguro pelo Stripe. Cancele quando quiser.</p>

      {esc && (
        <div className="modal-bg" onMouseDown={e => e.target === e.currentTarget && setEsc(null)}>
          <form className="modal" onSubmit={assinar} style={{ display: 'grid', gap: 12 }}>
            <h2>Assinar o {PLANS[esc].name} · R$ {PLANS[esc].price}/mês</h2>
            {pago && me.assinaturaAtiva
              ? <p className="muted">Seu plano muda agora. O novo valor vale a partir da próxima fatura.</p>
              : <p className="muted">Você vai para a página segura do Stripe para pagar a primeira mensalidade. O plano libera assim que o pagamento for confirmado e renova todo mês até você cancelar.</p>}
            {err && <p className="err">{err}</p>}
            <div className="row"><button className="btn" disabled={busy}>{busy ? 'Aguarde…' : pago && me.assinaturaAtiva ? 'Trocar de plano' : 'Continuar para o pagamento'}</button><button type="button" className="btn ghost" onClick={() => setEsc(null)}>Voltar</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
