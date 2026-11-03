'use client';
import { useEffect, useRef, useState } from 'react';

// "Pega o cliente": enquanto a varredura roda, clientes (pinos) aparecem no mapa; toque neles antes que sumam.
// Pino azul = +1. Pino cinza (já fechou com outro) = -1. Fica mais rápido conforme a pontuação sobe.
const N = 9;
export default function Minigame() {
  const [pin, setPin] = useState(null);       // { cell, bad, id }
  const [pts, setPts] = useState(0);
  const [best, setBest] = useState(0);
  const [hit, setHit] = useState(null);
  const ptsRef = useRef(0);

  useEffect(() => { try { setBest(Number(localStorage.getItem('pn_jogo') || 0)); } catch { } }, []);

  useEffect(() => {
    let t, vivo = true;
    const tick = () => {
      if (!vivo) return;
      const vel = Math.max(450, 1100 - ptsRef.current * 25);
      setPin(p => {
        let cell; do { cell = Math.floor(Math.random() * N); } while (p && cell === p.cell);
        return { cell, bad: Math.random() < 0.2, id: Date.now() };
      });
      t = setTimeout(tick, vel);
    };
    t = setTimeout(tick, 400);
    return () => { vivo = false; clearTimeout(t); };
  }, []);

  function tocar(i) {
    if (!pin || pin.cell !== i) return;
    const d = pin.bad ? -1 : 1;
    const novo = Math.max(0, ptsRef.current + d);
    ptsRef.current = novo; setPts(novo);
    setHit({ cell: i, d, id: pin.id });
    setPin(null);
    if (novo > best) { setBest(novo); try { localStorage.setItem('pn_jogo', String(novo)); } catch { } }
  }

  return (
    <div className="mg" aria-label="Minigame enquanto a varredura roda">
      <div className="mg-top">
        <b>Pega o cliente</b>
        <span>Pontos <b>{pts}</b> · Recorde {best}</span>
      </div>
      <p className="mg-dica">Toque nos pinos azuis. Os cinzas já fecharam com outro: evite.</p>
      <div className="mg-grid">
        {Array.from({ length: N }, (_, i) => (
          <button key={i} type="button" className="mg-cell" onPointerDown={() => tocar(i)} aria-label={pin?.cell === i ? (pin.bad ? 'Pino cinza' : 'Pino azul') : 'Vazio'}>
            {pin?.cell === i && <i key={pin.id} className={'mg-pin' + (pin.bad ? ' bad' : '')} />}
            {hit?.cell === i && <em key={hit.id} className={'mg-pop' + (hit.d < 0 ? ' neg' : '')}>{hit.d > 0 ? '+1' : '-1'}</em>}
          </button>
        ))}
      </div>
    </div>
  );
}
