'use client';
import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { pinColor, seq } from '@/lib/client';

// Mapa gratuito: MapLibre + OpenFreeMap (dados © OpenStreetMap). Não precisa de chave.
maplibregl.setWorkerUrl('/maplibre/maplibre-gl-worker.mjs');
const STYLE = 'https://tiles.openfreemap.org/styles/liberty';

function toGeo(leads, nameOf, selectedId) {
  return {
    type: 'FeatureCollection',
    features: leads.filter(l => l.lat != null && l.lng != null).map(l => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [Number(l.lng), Number(l.lat)] },
      properties: { id: l.id, nome: nameOf(l), sub: `${l.segmento || ''} · ${l.cidade || ''}`, cor: pinColor(seq(l).k), sel: l.id === selectedId ? 1 : 0 }
    }))
  };
}

export default function MapView({ leads, nameOf, selectedId, onPick, mode, fitKey, panelOpen }) {
  const el = useRef(null);
  const map = useRef(null);
  const popup = useRef(null);
  const pickRef = useRef(onPick);
  const leadsRef = useRef(leads);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState('');
  pickRef.current = onPick; leadsRef.current = leads;

  useEffect(() => {
    const m = new maplibregl.Map({ container: el.current, style: STYLE, center: [-46.86, -23.4], zoom: 11, maxPitch: 70, attributionControl: { compact: true } });
    map.current = m;
    m.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');
    popup.current = new maplibregl.Popup({ closeButton: false, offset: 14, maxWidth: '280px' });
    m.on('error', e => { if (String(e?.error?.message || '').includes('Failed to fetch')) setErr('Não consegui carregar o mapa. Confira sua internet.'); });
    m.on('load', () => {
      m.addSource('leads', { type: 'geojson', data: toGeo([], () => ''), cluster: true, clusterMaxZoom: 14, clusterRadius: 46 });
      m.addLayer({ id: 'grupos', type: 'circle', source: 'leads', filter: ['has', 'point_count'],
        paint: { 'circle-color': '#2F7FD1', 'circle-opacity': 0.9, 'circle-stroke-color': '#fff', 'circle-stroke-width': 3, 'circle-radius': ['step', ['get', 'point_count'], 16, 20, 21, 100, 27] } });
      m.addLayer({ id: 'grupos-n', type: 'symbol', source: 'leads', filter: ['has', 'point_count'],
        layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 13, 'text-font': ['Noto Sans Bold'] }, paint: { 'text-color': '#fff' } });
      m.addLayer({ id: 'pinos', type: 'circle', source: 'leads', filter: ['!', ['has', 'point_count']],
        paint: { 'circle-color': ['get', 'cor'], 'circle-radius': ['case', ['==', ['get', 'sel'], 1], 11, 8], 'circle-stroke-color': '#fff', 'circle-stroke-width': ['case', ['==', ['get', 'sel'], 1], 4, 2.5] } });

      m.on('click', 'grupos', async e => {
        const f = e.features[0];
        const z = await m.getSource('leads').getClusterExpansionZoom(f.properties.cluster_id);
        m.easeTo({ center: f.geometry.coordinates, zoom: z });
      });
      m.on('click', 'pinos', e => {
        const f = e.features[0];
        const box = document.createElement('div');
        box.style.cssText = 'font:14px/1.4 Manrope,system-ui,sans-serif;min-width:200px';
        const b = document.createElement('b'); b.textContent = f.properties.nome; b.style.display = 'block';
        const sm = document.createElement('div'); sm.textContent = f.properties.sub; sm.style.cssText = 'color:#5F6368;font-size:12px;margin:2px 0 10px';
        const bt = document.createElement('button'); bt.textContent = 'Criar oportunidade';
        bt.style.cssText = 'width:100%;border:0;border-radius:999px;background:#2F7FD1;color:#fff;font-weight:700;padding:8px 12px;cursor:pointer';
        bt.onclick = () => { popup.current.remove(); const l = leadsRef.current.find(x => x.id === f.properties.id); if (l) pickRef.current(l); };
        box.append(b, sm, bt);
        popup.current.setLngLat(f.geometry.coordinates).setDOMContent(box).addTo(m);
      });
      for (const id of ['grupos', 'pinos']) {
        m.on('mouseenter', id, () => { m.getCanvas().style.cursor = 'pointer'; });
        m.on('mouseleave', id, () => { m.getCanvas().style.cursor = ''; });
      }
      setReady(true);
    });
    return () => { m.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    if (!ready) return;
    map.current.getSource('leads')?.setData(toGeo(leads, nameOf, selectedId));
  }, [ready, leads, nameOf, selectedId]);

  // enquadra os pinos quando a lista muda de verdade (filtro, varredura)
  useEffect(() => {
    if (!ready) return;
    const pts = leads.filter(l => l.lat != null);
    if (!pts.length) return;
    const b = new maplibregl.LngLatBounds();
    pts.forEach(l => b.extend([Number(l.lng), Number(l.lat)]));
    const w = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const pad = w < 700 ? { top: 150, bottom: 40, left: 30, right: 30 } : { top: 160, bottom: 50, left: panelOpen ? 450 : 50, right: 60 };
    map.current.fitBounds(b, { padding: pad, maxZoom: 16, duration: 600 });
  }, [ready, fitKey]); // eslint-disable-line

  // centraliza no selecionado
  useEffect(() => {
    if (!ready || !selectedId) return;
    const l = leads.find(x => x.id === selectedId);
    if (l?.lat != null) map.current.easeTo({ center: [Number(l.lng), Number(l.lat)], zoom: Math.max(map.current.getZoom(), 15) });
  }, [ready, selectedId]); // eslint-disable-line

  useEffect(() => {
    if (!ready) return;
    if (mode === '3d') map.current.easeTo({ pitch: 62, bearing: -20, zoom: Math.max(map.current.getZoom(), 16), duration: 900 });
    else map.current.easeTo({ pitch: 0, bearing: 0, duration: 700 });
  }, [ready, mode]);

  return (
    <>
      <div ref={el} style={{ position: 'fixed', inset: 0 }} aria-label="Mapa com seus contatos" />
      {err && <div style={{ position: 'fixed', top: 90, left: '50%', transform: 'translateX(-50%)', background: '#fff', padding: '10px 14px', borderRadius: 10, boxShadow: 'var(--sh)', zIndex: 5 }} className="err">{err}</div>}
    </>
  );
}
