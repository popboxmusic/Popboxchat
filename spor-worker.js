// spor-worker.js — Cloudflare Worker: ESPN skor ucunu CORS'lu ve 15 sn önbellekli sunar.
// Kurulum: Cloudflare > Workers > Create > bu kodu yapıştır > Deploy.
// Sonra sayfada (spor_bot.js'den ÖNCE):  window.SPOR_CONFIG = { BASE: 'https://ADIN.workers.dev/soccer' };
// Avantaj: kaç kişi sohbette olursa olsun ESPN'e 15 saniyede en fazla 1 istek gider.
const ALLOWED = ['tur.1', 'uefa.champions', 'uefa.europa', 'uefa.europa.conf', 'eng.1', 'esp.1', 'ger.1', 'ita.1', 'fra.1'];
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': '*' };
export default {
  async fetch(req, env, ctx) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const url = new URL(req.url);
    const m = url.pathname.match(/^\/soccer\/([a-z0-9.]+)\/scoreboard$/);
    if (!m || !ALLOWED.includes(m[1])) return new Response('not found', { status: 404, headers: CORS });
    const q = new URLSearchParams();
    const dates = url.searchParams.get('dates'); if (dates && /^\d{8}(-\d{8})?$/.test(dates)) q.set('dates', dates);
    q.set('limit', '200');
    const target = 'https://site.api.espn.com/apis/site/v2/sports/soccer/' + m[1] + '/scoreboard?' + q.toString();
    const cache = caches.default, key = new Request(target);
    let res = await cache.match(key);
    if (!res) {
      const r = await fetch(target, { headers: { 'User-Agent': 'Mozilla/5.0 (CETCETY spor botu)' } });
      res = new Response(r.body, { status: r.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=15' } });
      if (r.ok) ctx.waitUntil(cache.put(key, res.clone()));
    }
    const out = new Response(res.body, res);
    Object.entries(CORS).forEach(([k, v]) => out.headers.set(k, v));
    return out;
  }
};
