'use client';
import { useEffect, useRef, useState } from 'react';

// Vídeo de apresentação no canto da landing. Começa mudo e pequeno; um toque abre grande com som.
export const VIDEO = { src: '/video/apresentacao.mp4', webm: '/video/apresentacao.webm', poster: '/video/apresentacao.jpg' };

export default function VideoCanto() {
  const [fechado, setFechado] = useState(false);
  const [grande, setGrande] = useState(false);
  const v = useRef(null);
  useEffect(() => { try { if (sessionStorage.getItem('pn_video') === 'x') setFechado(true); } catch { } }, []);
  if (!VIDEO.src || fechado) return null;

  function abrir() {
    setGrande(true);
    const el = v.current; if (!el) return;
    el.currentTime = 0; el.muted = false; el.loop = false; el.play().catch(() => { });
  }
  function fechar(e) {
    e.stopPropagation();
    if (grande) { setGrande(false); const el = v.current; if (el) { el.muted = true; el.loop = true; el.play().catch(() => { }); } return; }
    setFechado(true); try { sessionStorage.setItem('pn_video', 'x'); } catch { }
  }
  return (
    <div className={'vc' + (grande ? ' vc-g' : '')} onClick={grande ? undefined : abrir} role={grande ? 'dialog' : 'button'} aria-label="Vídeo de apresentação do ProspecNow">
      <video ref={v} poster={VIDEO.poster || undefined} muted loop autoPlay playsInline controls={grande} preload="metadata">
        <source src={VIDEO.webm} type="video/webm" />
        <source src={VIDEO.src} type="video/mp4" />
      </video>
      {!grande && <span className="vc-play">▶ Ver com som</span>}
      <button type="button" className="vc-x" onClick={fechar} aria-label={grande ? 'Diminuir vídeo' : 'Fechar vídeo'}>×</button>
    </div>
  );
}
