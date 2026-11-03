import { MOCK } from './server';

const KEY = () => process.env.GOOGLE_PLACES_KEY;
const BASE = 'https://places.googleapis.com/v1';

// Campos da busca: inclui telefone e site (categoria Enterprise do Google).
const SEARCH_FIELDS = ['places.id', 'places.displayName', 'places.formattedAddress', 'places.location', 'places.internationalPhoneNumber', 'places.nationalPhoneNumber', 'places.websiteUri', 'places.rating', 'places.userRatingCount', 'places.businessStatus', 'places.googleMapsUri'].join(',');
const DETAIL_FIELDS = ['id', 'displayName', 'formattedAddress', 'location', 'internationalPhoneNumber', 'nationalPhoneNumber', 'websiteUri', 'rating', 'userRatingCount', 'googleMapsUri', 'businessStatus', 'photos'].join(',');

export function digits(s) { return String(s || '').replace(/\D/g, ''); }
export function isMobile(d) {
  if (/^55\d{2}9\d{8}$/.test(d)) return true;
  if (/^3519\d{8}$/.test(d)) return true;
  if (/^55\d{10}$/.test(d) || /^351[2]\d{8}$/.test(d)) return false;
  return null; // não sabemos
}

function shape(p) {
  const phone = p.internationalPhoneNumber || '';
  const d = digits(phone);
  return {
    place_id: p.id,
    nome: p.displayName?.text || '',
    endereco: p.formattedAddress || '',
    lat: p.location?.latitude ?? null,
    lng: p.location?.longitude ?? null,
    telefone: p.nationalPhoneNumber || phone,
    digits: d,
    celular: isMobile(d),
    site: p.websiteUri || '',
    nota: p.rating ?? null,
    aval: p.userRatingCount ?? null,
    maps: p.googleMapsUri || '',
    aberto: p.businessStatus !== 'CLOSED_PERMANENTLY'
  };
}

export async function textSearch(query, { lang = 'pt-BR', region = 'BR' } = {}) {
  if (MOCK) return mockSearch(query);
  const r = await fetch(`${BASE}/places:searchText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': KEY(), 'X-Goog-FieldMask': SEARCH_FIELDS },
    body: JSON.stringify({ textQuery: query, languageCode: lang, regionCode: region, pageSize: 20 })
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error?.message || 'Falha na busca do Google');
  return (j.places || []).map(shape).filter(p => p.aberto);
}

export async function placeDetails(placeId, { lang = 'pt-BR' } = {}) {
  if (MOCK) return mockDetails(placeId);
  const r = await fetch(`${BASE}/places/${encodeURIComponent(placeId)}?languageCode=${lang}`, {
    headers: { 'X-Goog-Api-Key': KEY(), 'X-Goog-FieldMask': DETAIL_FIELDS }
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error?.message || 'Falha ao abrir o contato');
  const out = shape(j);
  const ph = (j.photos || [])[0];
  if (ph) {
    try {
      const pr = await fetch(`${BASE}/${ph.name}/media?maxWidthPx=800&skipHttpRedirect=true`, { headers: { 'X-Goog-Api-Key': KEY() } });
      const pj = await pr.json();
      if (pr.ok && pj.photoUri) {
        out.foto = pj.photoUri;
        out.foto_autor = (ph.authorAttributions || []).map(a => ({ nome: a.displayName, uri: a.uri }));
      }
    } catch (e) { /* sem foto */ }
  }
  return out;
}

/* ---------- dados de exemplo para o modo de demonstração ---------- */
function hash(s) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); }
function mockSearch(query) {
  const seg = query.split(' em ')[0];
  const base = hash(query);
  const lat0 = -23.405, lng0 = -46.858;
  return Array.from({ length: 8 }, (_, i) => {
    const h = hash(query + i);
    return {
      place_id: 'exemplo_' + base + '_' + i,
      nome: `${seg} Exemplo ${i + 1}`,
      endereco: `Rua de Exemplo, ${100 + i * 7} - Bairro Exemplo`,
      lat: lat0 + ((h % 200) - 100) / 4000,
      lng: lng0 + (((h >> 8) % 200) - 100) / 4000,
      telefone: `(11) 9${String(h).padStart(8, '0').slice(0, 4)}-${String(h).padStart(8, '0').slice(4, 8)}`,
      digits: '55119' + String(h).padStart(8, '0').slice(0, 8),
      celular: true,
      site: i % 3 === 0 ? 'https://exemplo.com' : '',
      nota: 4 + (h % 10) / 10,
      aval: 10 + (h % 400),
      maps: '',
      aberto: true
    };
  });
}
function mockDetails(id) {
  const [, b, i] = id.split('_');
  const h = hash(id);
  return {
    place_id: id, nome: `Negócio Exemplo ${Number(i) + 1}`, endereco: 'Rua de Exemplo, 123 - Bairro Exemplo',
    lat: null, lng: null, telefone: '(11) 90000-0000', digits: '5511900000000', celular: true,
    site: '', nota: 4 + (h % 10) / 10, aval: 10 + (h % 400), maps: '', aberto: true, foto: null, exemplo: true, _b: b
  };
}
