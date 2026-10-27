// ============================================================
// spor-worker.js — Cloudflare Worker v4
// ESPN skorları + spor haberleri (CORS'lu, önbellekli)
// ------------------------------------------------------------
// KAPSAM
//   • Futbol: dünyadaki tüm ligler (all, tur.1, eng.1, esp.1 ...)
//   • Basketbol: nba, wnba, nbl, fiba, üniversite
//   • Amerikan futbolu: nfl, college-football
//   • Beyzbol: mlb   • Buz hokeyi: nhl
// ------------------------------------------------------------
// ENDPOINTLER
//   Skorlar : /{spor}/{lig}/scoreboard?dates=YYYYMMDD
//   Haberler: /{spor}/{lig}/news
//   Örnek   : /soccer/all/scoreboard
//             /soccer/tur.1/news
//             /basketball/nba/scoreboard
// ============================================================

const SPORTS = {
    soccer:     null,   // null = herhangi bir lig kodu
    basketball: ['nba', 'wnba', 'nba-development', 'nbl', 'fiba',
                 'mens-college-basketball', 'womens-college-basketball'],
    football:   ['nfl', 'college-football'],
    baseball:   ['mlb'],
    hockey:     ['nhl']
};

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS, HEAD',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Max-Age': '86400'
};

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function jsonResponse(obj, status = 200) {
    return new Response(JSON.stringify(obj, null, 2), {
        status,
        headers: { ...CORS, 'Content-Type': 'application/json' }
    });
}

function pickTtl(dates) {
    if (!dates) return 15;
    const last = dates.split('-').pop();
    const d = Date.UTC(+last.slice(0, 4), +last.slice(4, 6) - 1, +last.slice(6, 8));
    const yesterday = Date.now() - 36 * 3600 * 1000;
    return d < yesterday ? 600 : 15;
}

async function proxyESPN(target, ttl, ctx, req) {
    const cache = caches.default;
    const cacheKey = new Request(target);
    let res = await cache.match(cacheKey);

    if (!res) {
        let r;
        try {
            r = await fetch(target, {
                headers: {
                    'User-Agent': UA,
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
                    'Referer': 'https://www.espn.com/'
                }
            });
        } catch (e) {
            return jsonResponse({ error: 'ESPN fetch failed', detail: String(e) }, 502);
        }

        if (!r.ok) {
            const body = await r.text().catch(() => '');
            return jsonResponse({ error: 'ESPN error', status: r.status, body: body.slice(0, 300) }, r.status);
        }

        res = new Response(r.body, {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=' + ttl
            }
        });
        ctx.waitUntil(cache.put(cacheKey, res.clone()));
    }

    const out = new Response(res.body, res);
    Object.entries(CORS).forEach(([k, v]) => out.headers.set(k, v));
    return out;
}

export default {
    async fetch(req, env, ctx) {
        if (req.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: CORS });
        }

        const url = new URL(req.url);

        // Kök: durum
        if (url.pathname === '/' || url.pathname === '') {
            const lists = {};
            Object.entries(SPORTS).forEach(([s, l]) => { lists[s] = l ? l : 'tüm ligler (all, tur.1, eng.1 ...)'; });
            return jsonResponse({
                ok: true,
                message: '⚽🏀 Spor Worker v4 çalışıyor',
                sports: lists,
                usage: [
                    '/soccer/all/scoreboard?dates=YYYYMMDD',
                    '/soccer/tur.1/scoreboard',
                    '/basketball/nba/scoreboard',
                    '/soccer/tur.1/news',
                    '/basketball/nba/news'
                ]
            });
        }

        // === SKOR ===
        const scoreMatch = url.pathname.match(/^\/([a-z-]+)\/([a-z0-9._-]+)\/scoreboard$/);
        // === HABER ===
        const newsMatch = url.pathname.match(/^\/([a-z-]+)\/([a-z0-9._-]+)\/news$/);

        const match = scoreMatch || newsMatch;
        if (!match) {
            return jsonResponse({
                error: 'Not found',
                hint: 'Kullanım: /{spor}/{lig}/scoreboard veya /{spor}/{lig}/news',
                sports: Object.keys(SPORTS)
            }, 404);
        }

        const sport = match[1];
        const league = match[2];
        const allowed = Object.prototype.hasOwnProperty.call(SPORTS, sport) &&
            (SPORTS[sport] === null ? league.length <= 40 : SPORTS[sport].includes(league));

        if (!allowed) {
            return jsonResponse({
                error: 'Not found',
                hint: 'Kullanım: /{spor}/{lig}/scoreboard veya /{spor}/{lig}/news',
                sports: Object.keys(SPORTS)
            }, 404);
        }

        if (scoreMatch) {
            // === SKOR İSTEĞİ ===
            const q = new URLSearchParams();
            const dates = url.searchParams.get('dates');
            const validDates = dates && /^\d{8}(-\d{8})?$/.test(dates) ? dates : null;
            if (validDates) q.set('dates', validDates);

            let limit = parseInt(url.searchParams.get('limit') || '500', 10);
            if (!Number.isFinite(limit) || limit < 1) limit = 500;
            q.set('limit', String(Math.min(limit, 1000)));

            const groups = url.searchParams.get('groups');
            if (groups && /^\d{1,3}$/.test(groups)) q.set('groups', groups);

            const target = 'https://site.api.espn.com/apis/site/v2/sports/' +
                sport + '/' + league + '/scoreboard?' + q.toString();

            return proxyESPN(target, pickTtl(validDates), ctx, req);
        }

        // === HABER İSTEĞİ ===
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 50);
        const target = 'https://site.api.espn.com/apis/site/v2/sports/' +
            sport + '/' + league + '/news?limit=' + limit;

        // Haberler daha uzun önbelleklenir (60 sn)
        return proxyESPN(target, 60, ctx, req);
    }
};
