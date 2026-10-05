// ============================================================
// spor-worker.js — Cloudflare Worker
// ESPN futbol skorlarını CORS'lu ve 15 sn önbellekli sunar.
// ============================================================

const ALLOWED = [
    'tur.1',              // Süper Lig
    'uefa.champions',     // Şampiyonlar Ligi
    'uefa.europa',        // Avrupa Ligi
    'uefa.europa.conf',   // Konferans Ligi
    'eng.1',              // Premier Lig
    'esp.1',              // La Liga
    'ger.1',              // Bundesliga
    'ita.1',              // Serie A
    'fra.1'               // Ligue 1
];

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': '*'
};

export default {
    async fetch(req, env, ctx) {
        // CORS preflight
        if (req.method === 'OPTIONS') {
            return new Response(null, { headers: CORS });
        }

        const url = new URL(req.url);
        const m = url.pathname.match(/^\/soccer\/([a-z0-9.]+)\/scoreboard$/);

        if (!m || !ALLOWED.includes(m[1])) {
            return new Response(
                JSON.stringify({
                    error: 'Not found',
                    hint: 'Kullanım: /soccer/{lig}/scoreboard  —  örn. /soccer/tur.1/scoreboard',
                    allowed: ALLOWED
                }),
                { status: 404, headers: { ...CORS, 'Content-Type': 'application/json' } }
            );
        }

        const q = new URLSearchParams();
        const dates = url.searchParams.get('dates');
        if (dates && /^\d{8}(-\d{8})?$/.test(dates)) q.set('dates', dates);
        q.set('limit', '200');

        const target = 'https://site.api.espn.com/apis/site/v2/sports/soccer/' +
            m[1] + '/scoreboard?' + q.toString();

        // 15 saniyelik cache
        const cache = caches.default;
        const cacheKey = new Request(target);
        let res = await cache.match(cacheKey);

        if (!res) {
            const r = await fetch(target, {
                headers: { 'User-Agent': 'Mozilla/5.0 (CETCETY spor botu)' }
            });
            res = new Response(r.body, {
                status: r.status,
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'public, max-age=15'
                }
            });
            if (r.ok) ctx.waitUntil(cache.put(cacheKey, res.clone()));
        }

        const out = new Response(res.body, res);
        Object.entries(CORS).forEach(([k, v]) => out.headers.set(k, v));
        return out;
    }
};
