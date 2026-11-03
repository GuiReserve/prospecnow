// Dados de negócios do OpenStreetMap (gratuito, licença ODbL: © colaboradores do OpenStreetMap).
// Nominatim encontra a cidade; Overpass lista os negócios dentro dela.
// A varredura roda no navegador de quem usa o app (os servidores públicos bloqueiam a nuvem da Vercel);
// o servidor do ProspecNow confere e salva o resultado.

const UA = 'ProspecNow/1.0 (+https://prospecnow.vercel.app)';
const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://lz4.overpass-api.de/api/interpreter', 'https://z.overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter'];
const BROWSER = typeof window !== 'undefined';
// no navegador, cabeçalhos extras fariam o pedido ser bloqueado; no servidor, identificamos o app
const HDR = BROWSER ? {} : { 'user-agent': UA, referer: 'https://prospecnow.vercel.app' };
const NOMINATIM = 'https://nominatim.openstreetmap.org';

const FOOD = '~^(fast_food|restaurant|cafe)$';
// Cada segmento vira um ou mais filtros de etiquetas do OpenStreetMap.
// 'valor' = igual, '~regex' = contém (sem diferenciar maiúsculas), '*' = a etiqueta existe.
const SEG = {
  'barbearia': [{ shop: 'hairdresser', name: '~barb' }, { shop: 'barber' }, { shop: 'hairdresser', hairdresser: '~barber|men|male' }],
  'salao de beleza': [{ shop: 'hairdresser' }, { shop: 'beauty' }],
  'cabeleireiro': [{ shop: 'hairdresser' }, { shop: 'beauty' }],
  'manicure': [{ shop: 'beauty', beauty: '~nail' }, { shop: 'beauty', name: '~manicure|unha|nail|esmalt' }, { shop: 'nails' }],
  'hamburgueria': [{ amenity: FOOD, cuisine: '~burger' }, { amenity: FOOD, name: '~burg|hamb' }],
  'pizzaria': [{ amenity: FOOD, cuisine: '~pizza' }, { amenity: FOOD, name: '~pizz' }],
  'confeitaria': [{ shop: '~^(confectionery|pastry|bakery)$' }, { amenity: 'cafe', name: '~doce|confeit|bolo' }],
  'pastelaria': [{ shop: '~^(pastry|bakery|confectionery)$' }, { amenity: 'cafe', name: '~pastelaria' }],
  'estetica automotiva': [{ amenity: 'car_wash' }, { shop: 'car_repair', name: '~est.tica|detail|lava|polim' }],
  'estetica automovel': [{ amenity: 'car_wash' }, { shop: 'car_repair', name: '~est.tica|detail|lava|polim' }],
  'fotografo': [{ craft: 'photographer' }, { shop: 'photo' }, { office: 'photographer' }],
  'nutricionista': [{ healthcare: 'nutrition_counselling' }, { healthcare: '*', name: '~nutri' }, { office: '*', name: '~nutri' }, { amenity: '~^(clinic|doctors)$', name: '~nutri' }],
  'pet shop': [{ shop: 'pet' }, { shop: 'pet_grooming' }],
  'tosquia e banhos': [{ shop: 'pet_grooming' }, { shop: 'pet' }],
  'academia': [{ leisure: 'fitness_centre' }, { amenity: 'gym' }],
  'ginasio': [{ leisure: 'fitness_centre' }, { amenity: 'gym' }],
  'dentista': [{ amenity: 'dentist' }, { healthcare: 'dentist' }],
  'oficina mecanica': [{ shop: 'car_repair' }, { shop: 'motorcycle_repair' }],
  'oficina': [{ shop: 'car_repair' }, { shop: 'motorcycle_repair' }],
  'restaurante': [{ amenity: 'restaurant' }],
  'floricultura': [{ shop: 'florist' }],
  'florista': [{ shop: 'florist' }]
};
const BIZ = ['shop', 'amenity', 'craft', 'office', 'healthcare', 'leisure', 'tourism'];

export function norm(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); }
function esc(s) { return String(s).replace(/[\\"]/g, ' ').replace(/[.*+?^${}()|[\]]/g, '\\$&'); }

// segmento digitado pelo usuário que não está na tabela: procura pelo nome
function filtersFor(seg) {
  const f = SEG[norm(seg)];
  if (f) return f;
  const words = norm(seg).split(/\s+/).filter(w => w.length > 2).slice(0, 3);
  if (!words.length) return [];
  const acc = w => esc(w).replace(/a/g, '[aáàâã]').replace(/e/g, '[eéê]').replace(/i/g, '[ií]').replace(/o/g, '[oóôõ]').replace(/u/g, '[uú]').replace(/c/g, '[cç]');
  return [{ name: '~' + words.map(acc).join('.*'), _biz: true }];
}

// Consulta leve: o servidor de mapas filtra só pela categoria principal (rápido);
// nome, cozinha e outros detalhes são conferidos aqui, em matches().
function qClauses(f, area) {
  if (f._biz) return BIZ.map(b => `nwr["name"~"${String(f.name).slice(1).replace(/"/g, '')}",i]["${b}"](${area});`);
  const keys = Object.keys(f).filter(k => BIZ.includes(k));
  const k = keys[0];
  if (!k) return [];
  const v = f[k];
  if (v === '*') return [`nwr["${k}"]["name"](${area});`];
  const alt = /^~\^\(([a-z_|]+)\)\$$/.exec(v);
  if (alt) return [`nwr["${k}"~"^(${alt[1]})$"]["name"](${area});`];
  if (v.startsWith('~')) return [`nwr["${k}"~"${v.slice(1).replace(/"/g, '')}"]["name"](${area});`];
  return [`nwr["${k}"="${v}"]["name"](${area});`];
}

function matches(f, t) {
  for (const [k, v] of Object.entries(f)) {
    if (k === '_biz') { if (!BIZ.some(b => t[b])) return false; continue; }
    const tv = t[k];
    if (v === '*') { if (tv == null) return false; continue; }
    if (tv == null) return false;
    if (v.startsWith('~')) { if (!new RegExp(v.slice(1), 'i').test(norm(tv)) && !new RegExp(v.slice(1), 'i').test(tv)) return false; }
    else if (tv !== v) return false;
  }
  return !!t.name;
}

export function digits(s) { return String(s || '').replace(/\D/g, ''); }
export function isMobile(d) {
  if (/^55\d{2}9\d{8}$/.test(d)) return true;
  if (/^3519\d{8}$/.test(d)) return true;
  if (/^55\d{10}$/.test(d) || /^351[2]\d{8}$/.test(d)) return false;
  return null;
}
// Converte o telefone para o formato internacional usado no wa.me
export function intl(raw, pais) {
  const first = String(raw || '').split(/[;,/]/)[0].trim();
  if (!first) return '';
  let d = digits(first);
  if (first.startsWith('+') || first.startsWith('00')) return d.replace(/^00/, '');
  if (pais === 'PT') return d.length === 9 ? '351' + d : d;
  d = d.replace(/^0+/, '');
  if (d.length === 10 || d.length === 11) return '55' + d;
  return d;
}

function shape(el, pais) {
  const t = el.tags || {};
  const fone = t.phone || t['contact:phone'] || t.mobile || t['contact:mobile'] || t['contact:whatsapp'] || '';
  const d = intl(fone, pais);
  const site = t.website || t['contact:website'] || t.url || '';
  const rua = [t['addr:street'], t['addr:housenumber']].filter(Boolean).join(', ');
  const endereco = [rua, t['addr:suburb'] || t['addr:neighbourhood'], t['addr:city']].filter(Boolean).join(' - ');
  const ig = t['contact:instagram'] || t.instagram || '';
  return {
    place_id: `osm-${el.type[0]}${el.id}`,
    nome: String(t.name || '').slice(0, 120),
    endereco: endereco.slice(0, 200),
    lat: el.lat ?? el.center?.lat ?? null,
    lng: el.lon ?? el.center?.lon ?? null,
    telefone: String(fone).split(/[;]/)[0].trim().slice(0, 40),
    digits: /^\d{8,15}$/.test(d) ? d : '',
    celular: isMobile(d),
    site: /^https?:\/\//i.test(site) ? site.slice(0, 300) : site ? 'https://' + site.replace(/^\/+/, '').slice(0, 290) : '',
    instagram: String(ig).slice(0, 120),
    horario: String(t.opening_hours || '').slice(0, 120),
    aberto: !t.disused && !t['disused:shop'] && !t['abandoned:shop']
  };
}

// Começa pelo servidor principal; se ele falhar ou demorar, chama o próximo (sem sobrecarregar todos).
async function overpass(q) {
  const nome = u => new URL(u).hostname.replace(/^(www\.)/, '');
  const ask = url => fetch(url, {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', ...HDR },
    body: 'data=' + encodeURIComponent(q), signal: AbortSignal.timeout(35000)
  }).then(async r => {
    if (!r.ok) throw new Error('erro ' + r.status);
    const j = await r.json().catch(() => null);
    if (!j || !Array.isArray(j.elements)) throw new Error('resposta inválida');
    if (/timed out|out of memory/i.test(j.remark || '') && !j.elements.length) throw new Error('servidor sobrecarregado');
    return j;
  });
  // uma rodada: tenta os servidores em sequência (o próximo entra se o atual passar de 8 s ou falhar)
  const rodada = () => new Promise((resolve, reject) => {
    const motivos = [];
    let i = 0, feito = false, ativos = 0;
    const next = () => {
      if (feito) return;
      if (i >= OVERPASS.length) { if (!ativos) reject(motivos); return; }
      const url = OVERPASS[i++]; ativos++;
      const t = setTimeout(next, 3000);
      ask(url).then(j => { if (!feito) { feito = true; clearTimeout(t); resolve(j); } })
        .catch(e => { clearTimeout(t); ativos--; motivos.push(`${nome(url)}: ${e.message === 'Failed to fetch' ? 'sem resposta' : e.message}`); next(); });
    };
    next();
  });
  try { return await rodada(); }
  catch (m1) {
    await new Promise(r => setTimeout(r, 4000)); // servidores públicos às vezes só estão ocupados: espera e tenta de novo
    try { return await rodada(); }
    catch (m2) { throw new Error('Os servidores de mapas não responderam (' + [...new Set([...m1, ...m2])].slice(0, 4).join('; ') + '). Tente de novo em alguns minutos.'); }
  }
}

// Acha a área da cidade. Devolve o filtro de área do Overpass.
export async function findArea(busca, pais) {
  const cc = /^[A-Z]{2}$/.test(pais || '') ? pais.toLowerCase() : 'br';
  const u = `${NOMINATIM}/search?format=jsonv2&limit=5&accept-language=pt&countrycodes=${cc}&q=${encodeURIComponent(busca)}`;
  const r = await fetch(u, { headers: HDR, signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error('Não encontrei a cidade agora. Tente de novo.');
  const list = await r.json();
  const rel = list.find(x => x.osm_type === 'relation' && (x.category === 'boundary' || x.category === 'place')) || list.find(x => x.osm_type === 'relation');
  if (rel) return { filtro: `area.a`, pre: `area(id:${3600000000 + Number(rel.osm_id)})->.a;`, nome: rel.name, lat: +rel.lat, lng: +rel.lon };
  const any = list[0];
  if (!any?.boundingbox) throw new Error('Não encontrei essa cidade. Confira o nome e o país.');
  const [s, n, w, e] = any.boundingbox.map(Number);
  return { filtro: `${s},${w},${n},${e}`, pre: '', nome: any.name, lat: +any.lat, lng: +any.lon };
}

// Varre os segmentos numa cidade com uma única consulta e separa por segmento.
// Monta a lista de cidades a varrer só com o OpenStreetMap (sem IA, sem custo).
// "Cajamar" → só ela. "região de Jundiaí" → ela e as cidades até ~30 km. "São Paulo" (estado) ou
// "Portugal" → as maiores cidades da área. "Cajamar, Jundiaí" → as cidades digitadas.
const REGIAO = /^(regi[aã]o( metropolitana)?( de| do| da)?|grande|arredores de|entorno de)\s+/i;
export async function planArea(texto, pais, max) {
  const cc = /^[A-Z]{2}$/.test(pais || '') ? pais : 'BR';
  const partes = String(texto).split(/,| e /).map(x => x.trim()).filter(Boolean);
  if (partes.length > 1) return { pais: cc, cidades: partes.slice(0, max).map(c => ({ cidade: c, busca: c })), nota: 'Cidades separadas pelo texto digitado.' };
  const querRegiao = REGIAO.test(texto);
  const nome = String(texto).replace(REGIAO, '').trim();
  const u = `${NOMINATIM}/search?format=jsonv2&limit=5&accept-language=pt&extratags=1&countrycodes=${cc.toLowerCase()}&q=${encodeURIComponent(nome)}`;
  const r = await fetch(u, { headers: HDR, signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error('Não encontrei a área agora. Tente de novo em instantes.');
  const list = await r.json();
  const a = list.find(x => x.osm_type === 'relation') || list[0];
  if (!a) throw new Error('Não encontrei essa área. Confira o nome e o país.');
  const lvl = Number(a.extratags?.admin_level || 8);
  const tipo = String(a.addresstype || a.type || '');
  const cidade = /^(city|town|village|municipality|suburb|hamlet)$/.test(tipo) || lvl >= 8;
  const suf = String(a.display_name || '').split(', ').slice(-2).join(', ');
  const un = c => ({ cidade: c.tags.name, busca: `${c.tags.name}, ${c.suf}` });
  const ordem = el => (el.tags.place === 'city' ? 1e9 : 0) + Number(String(el.tags.population || '0').replace(/\D/g, '') || 0);
  const pegar = els => els.filter(e => e.tags?.name).sort((x, y) => ordem(y) - ordem(x));

  if (cidade && !querRegiao) return { pais: cc, cidades: [{ cidade: a.name || nome, busca: String(a.display_name || nome).split(', ').filter((_, i, v) => i === 0 || i >= v.length - 2).join(', ') }], nota: 'Uma cidade só: ' + (a.name || nome) + '.' };

  let els;
  if (cidade) {
    // região de uma cidade: ela mesma e as vizinhas até 30 km
    const j = await overpass(`[out:json][timeout:40];node(around:30000,${a.lat},${a.lon})[place~"^(city|town)$"][name];out tags 80;`);
    els = pegar(j.elements).map(e => ({ ...e, suf }));
    const propria = { cidade: a.name || nome, busca: String(a.display_name || nome).split(', ').filter((_, i, v) => i === 0 || i >= v.length - 2).join(', ') };
    const outras = els.map(un).filter(c => c.cidade !== propria.cidade);
    return { pais: cc, cidades: [propria, ...outras].slice(0, max), nota: `Região de ${propria.cidade}: a cidade e as maiores num raio de 30 km.` };
  }
  if (a.osm_type !== 'relation') throw new Error('Essa área não tem limite no mapa. Digite as cidades separadas por vírgula.');
  const tipos = lvl <= 2 ? '^city$' : '^(city|town)$';
  const j = await overpass(`[out:json][timeout:50];area(id:${3600000000 + Number(a.osm_id)})->.a;node(area.a)[place~"${tipos}"][name];out tags 400;`);
  els = pegar(j.elements).map(e => ({ ...e, suf: a.name || nome }));
  if (!els.length) throw new Error('Não achei cidades nessa área. Digite as cidades separadas por vírgula.');
  return { pais: cc, cidades: els.map(un).slice(0, max), nota: `As maiores cidades de ${a.name || nome}, pela população registrada no OpenStreetMap.` };
}

export async function scanCity(busca, segmentos, pais = 'BR') {
  const area = await findArea(busca, pais);
  const segF = segmentos.map(seg => ({ seg, f: filtersFor(seg) })).filter(x => x.f.length);
  if (!segF.length) return [];
  const clauses = [...new Set(segF.flatMap(x => x.f.flatMap(f => qClauses(f, area.filtro))))];
  const q = `[out:json][timeout:25];${area.pre}(${clauses.join('')});out center 600;`;
  const j = await overpass(q);
  const out = [];
  const seen = new Set();
  for (const el of j.elements || []) {
    const t = el.tags || {};
    const hit = segF.find(x => x.f.some(f => matches(f, t)));
    if (!hit) continue;
    const p = shape(el, pais);
    if (!p.nome || !p.aberto || p.lat == null || seen.has(p.place_id)) continue;
    seen.add(p.place_id);
    out.push({ ...p, segmento: hit.seg });
  }
  // quem tem telefone aparece primeiro
  return out.sort((a, b) => (b.digits ? 1 : 0) - (a.digits ? 1 : 0));
}

// Busca manual por nome: "barbearia do zé, cajamar"
export async function searchPlaces(q, pais = 'BR') {
  const cc = /^[A-Z]{2}$/.test(pais || '') ? pais.toLowerCase() : 'br';
  const u = `${NOMINATIM}/search?format=jsonv2&limit=15&extratags=1&addressdetails=1&accept-language=pt&countrycodes=${cc}&q=${encodeURIComponent(q)}`;
  const r = await fetch(u, { headers: HDR, signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error('Busca indisponível agora.');
  const list = await r.json();
  return list.filter(x => BIZ.includes(x.category) && x.name).slice(0, 10).map(x => {
    const a = x.address || {};
    const p = shape({ type: x.osm_type, id: x.osm_id, lat: +x.lat, lon: +x.lon, tags: { ...(x.extratags || {}), name: x.name, 'addr:street': a.road, 'addr:housenumber': a.house_number, 'addr:suburb': a.suburb, 'addr:city': a.city || a.town || a.village } }, pais);
    return { ...p, cidade: a.city || a.town || a.village || a.municipality || '' };
  });
}
