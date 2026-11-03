export const maxDuration = 60;
// Rota temporária de teste (só no preview). Será apagada.
const Q = '[out:json][timeout:20];area(id:3600298462)->.a;(nwr["shop"="hairdresser"]["name"](area.a);nwr["amenity"="restaurant"]["name"](area.a);nwr["amenity"="fast_food"]["name"](area.a););out center 300;';
const QJ = '[out:json][timeout:20];area(id:3600315062)->.a;(nwr["shop"="hairdresser"]["name"](area.a);nwr["amenity"="restaurant"]["name"](area.a);nwr["amenity"="fast_food"]["name"](area.a););out center 300;';
async function run(name, ep, opts) {
  const t0 = Date.now();
  try {
    const r = await fetch(ep, { ...opts, signal: AbortSignal.timeout(28000) });
    const txt = await r.text();
    let n = null, tel = 0; try { const j = JSON.parse(txt); n = j.elements.length; tel = j.elements.filter(e => e.tags && (e.tags.phone || e.tags['contact:phone'])).length; } catch (e) { }
    return { name, status: r.status, ms: Date.now() - t0, n, tel, head: n == null ? txt.slice(0, 120) : undefined };
  } catch (e) { return { name, err: String(e.message).slice(0, 80), ms: Date.now() - t0 }; }
}
export async function GET(req) {
  const u = new URL(req.url);
  if (!process.env.DIAG_TOKEN || u.searchParams.get('t') !== process.env.DIAG_TOKEN) return new Response('no', { status: 404 });
  const UA = 'ProspecNow/1.0 (+https://prospecnow.vercel.app)';
  const body = q => 'data=' + encodeURIComponent(q);
  const H = { 'content-type': 'application/x-www-form-urlencoded', 'user-agent': UA, accept: 'application/json,*/*', referer: 'https://prospecnow.vercel.app' };
  const res = await Promise.all([
    run('de-post-accept', 'https://overpass-api.de/api/interpreter', { method: 'POST', headers: H, body: body(Q) }),
    run('de-get', 'https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(Q), { headers: { 'user-agent': UA, accept: 'application/json' } }),
    run('de-post-noua', 'https://overpass-api.de/api/interpreter', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: body(Q) }),
    run('mailru-jundiai', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter', { method: 'POST', headers: H, body: body(QJ) })
  ]);
  return Response.json(res);
}
