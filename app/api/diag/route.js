export const maxDuration = 60;
// Rota temporária de teste (só no preview). Será apagada.
const EPS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter'];
export async function GET(req) {
  const u = new URL(req.url);
  if (!process.env.DIAG_TOKEN || u.searchParams.get('t') !== process.env.DIAG_TOKEN) return new Response('no', { status: 404 });
  const q = u.searchParams.get('q') || '[out:json][timeout:20];area(id:3600298462)->.a;(nwr["shop"="hairdresser"]["name"](area.a);nwr["amenity"="restaurant"]["name"](area.a);nwr["amenity"="fast_food"]["name"](area.a););out center 300;';
  const res = await Promise.all(EPS.map(async ep => {
    const t0 = Date.now();
    try {
      const r = await fetch(ep, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', 'user-agent': 'ProspecNow/1.0 (+https://prospecnow.vercel.app)' }, body: 'data=' + encodeURIComponent(q), signal: AbortSignal.timeout(50000) });
      const txt = await r.text();
      let n = null, tel = 0; try { const j = JSON.parse(txt); n = j.elements.length; tel = j.elements.filter(e => e.tags && (e.tags.phone || e.tags['contact:phone'])).length; } catch (e) { }
      return { ep, status: r.status, ms: Date.now() - t0, n, tel, head: n == null ? txt.slice(0, 160) : undefined };
    } catch (e) { return { ep, err: String(e.message).slice(0, 100), ms: Date.now() - t0 }; }
  }));
  return Response.json(res);
}
