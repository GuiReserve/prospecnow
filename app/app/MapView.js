'use client';
import { useEffect, useRef, useState } from 'react';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import { pinColor, seq } from '@/lib/client';

const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || 'DEMO_MAP_ID';

function loadMaps() {
  if (typeof window === 'undefined') return Promise.reject();
  if (window.google?.maps?.Map) return Promise.resolve();
  if (window.__pnMaps) return window.__pnMaps;
  window.__pnMaps = new Promise((res, rej) => {
    window.__pnInit = () => res();
    const sc = document.createElement('script');
    sc.src = `https://maps.googleapis.com/maps/api/js?key=${KEY}&v=weekly&libraries=marker&loading=async&language=pt-BR&callback=__pnInit`;
    sc.async = true; sc.onerror = rej;
    document.head.appendChild(sc);
  });
  return window.__pnMaps;
}

export const hasMap = !!KEY;

export default function MapView({ leads, nameOf, selectedId, onPick, mode, satellite, fitKey, panelOpen }) {
  const el = useRef(null);
  const map = useRef(null);
  const cluster = useRef(null);
  const info = useRef(null);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!KEY) return;
    let dead = false;
    loadMaps().then(() => {
      if (dead || map.current) return;
      map.current = new google.maps.Map(el.current, {
        center: { lat: -23.4, lng: -46.86 }, zoom: 11, mapId: MAP_ID, gestureHandling: 'greedy',
        mapTypeControl: false, streetViewControl: false, fullscreenControl: false, clickableIcons: false,
        zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM }
      });
      info.current = new google.maps.InfoWindow({ headerDisabled: true });
      setReady(true);
    }).catch(() => setErr('Não consegui carregar o Google Maps. Confira a chave.'));
    return () => { dead = true; };
  }, []);

  // pins
  useEffect(() => {
    if (!ready) return;
    const { AdvancedMarkerElement, PinElement } = google.maps.marker;
    if (cluster.current) { cluster.current.clearMarkers(); cluster.current.setMap(null); }
    const markers = leads.filter(l => l.lat != null && l.lng != null).map(l => {
      const k = seq(l).k;
      const sel = l.id === selectedId;
      const pin = new PinElement({ background: pinColor(k), borderColor: '#ffffff', glyphColor: '#ffffff', scale: sel ? 1.35 : 1 });
      const m = new AdvancedMarkerElement({ position: { lat: l.lat, lng: l.lng }, content: pin.element, title: nameOf(l), zIndex: sel ? 999 : undefined });
      m.addListener('click', () => {
        const box = document.createElement('div');
        box.style.cssText = 'font:14px/1.4 Manrope,system-ui,sans-serif;min-width:210px;padding:4px 2px';
        const b = document.createElement('b'); b.textContent = nameOf(l); b.style.display = 'block';
        const sm = document.createElement('div'); sm.textContent = `${l.segmento || ''} · ${l.cidade || ''}`; sm.style.cssText = 'color:#59606E;font-size:12px;margin:2px 0 10px';
        const bt = document.createElement('button'); bt.textContent = 'Criar oportunidade';
        bt.style.cssText = 'width:100%;border:0;border-radius:999px;background:#3B5BFD;color:#fff;font-weight:700;padding:8px 12px;cursor:pointer';
        bt.onclick = () => { info.current.close(); onPick(l); };
        box.append(b, sm, bt);
        info.current.setContent(box);
        info.current.open({ map: map.current, anchor: m });
      });
      return m;
    });
    cluster.current = new MarkerClusterer({ map: map.current, markers });
  }, [ready, leads, selectedId, nameOf, onPick]);

  // enquadra os pins quando a lista muda de verdade (filtro, varredura)
  useEffect(() => {
    if (!ready) return;
    const pts = leads.filter(l => l.lat != null);
    if (!pts.length) return;
    const b = new google.maps.LatLngBounds();
    pts.forEach(l => b.extend({ lat: l.lat, lng: l.lng }));
    map.current.fitBounds(b, { top: 150, bottom: 40, left: panelOpen ? 440 : 40, right: 40 });
    if (pts.length === 1) map.current.setZoom(16);
  }, [ready, fitKey]); // eslint-disable-line

  // centraliza no selecionado
  useEffect(() => {
    if (!ready || !selectedId) return;
    const l = leads.find(x => x.id === selectedId);
    if (l?.lat != null) map.current.panTo({ lat: l.lat, lng: l.lng });
  }, [ready, selectedId]); // eslint-disable-line

  useEffect(() => {
    if (!ready) return;
    if (mode === '3d') map.current.moveCamera({ tilt: 67, heading: -20, zoom: Math.max(map.current.getZoom(), 17) });
    else map.current.moveCamera({ tilt: 0, heading: 0 });
  }, [ready, mode]);

  useEffect(() => {
    if (ready) map.current.setMapTypeId(satellite ? 'hybrid' : 'roadmap');
  }, [ready, satellite]);

  if (!KEY) return null;
  return (
    <>
      <div ref={el} style={{ position: 'fixed', inset: 0 }} aria-label="Mapa com seus contatos" />
      {err && <div style={{ position: 'fixed', top: 90, left: '50%', transform: 'translateX(-50%)', background: '#fff', padding: '10px 14px', borderRadius: 10, boxShadow: 'var(--sh)', zIndex: 5 }} className="err">{err}</div>}
    </>
  );
}
