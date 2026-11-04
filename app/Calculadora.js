'use client';
import { useState } from 'react';
import Link from 'next/link';
import { PLANS, SEMANA } from '@/lib/plans';
import s from './landing.module.css';

const brl = n => 'R$ ' + Math.round(n).toLocaleString('pt-BR');

// Conta simples com os números de quem visita: quanto um cliente vale perto do preço do plano.
export default function Calculadora() {
  const [ticket, setTicket] = useState(800);
  const [clientes, setClientes] = useState(2);
  const [plano, setPlano] = useState('pro');
  const preco = PLANS[plano].price;
  const ganho = ticket * clientes;
  const meses = ticket / preco;
  return (
    <div className={s.calc}>
      <div className={s.calcIn}>
        <label>Quanto você cobra por um serviço
          <div className={s.money}><span>R$</span><input type="number" min="50" step="50" value={ticket} onChange={e => setTicket(Math.max(0, Number(e.target.value) || 0))} /></div>
        </label>
        <label>Clientes que você fecha por mês com o ProspecNow: <b>{clientes}</b>
          <input type="range" min="1" max="10" value={clientes} onChange={e => setClientes(Number(e.target.value))} />
        </label>
        <label>Plano
          <select value={plano} onChange={e => setPlano(e.target.value)}>
            {['essencial', 'pro', 'agencia'].map(id => <option key={id} value={id}>{PLANS[id].name} · R$ {PLANS[id].price}/mês</option>)}
          </select>
        </label>
      </div>
      <div className={s.calcOut}>
        <div><small>Você fatura a mais no mês</small><b>{brl(ganho)}</b></div>
        <div><small>O plano custa</small><b>{brl(preco)}</b></div>
        <div className={s.calcBig}><small>Cada R$ 1 no plano volta como</small><b>R$ {(ganho / preco).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</b></div>
        <p>{meses >= 1 ? <>Um único cliente de {brl(ticket)} paga <b>{Math.floor(meses)} {Math.floor(meses) === 1 ? 'mês' : 'meses'}</b> do plano {PLANS[plano].name}.</> : <>Com esse valor, você precisa de {Math.ceil(1 / meses)} clientes por mês para pagar o plano.</>}</p>
        <Link href="/entrar?criar=1" className="btn">Começar com {SEMANA.dias} dias por R$ {SEMANA.price}</Link>
        <span className={s.calcNote}>A conta usa os seus números. Quantos clientes você fecha depende do seu serviço e das suas mensagens.</span>
      </div>
    </div>
  );
}
