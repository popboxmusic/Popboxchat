// ============================================================
// spor-worker.js — Cloudflare Worker v3
// ESPN skorlarını CORS'lu ve kısa önbellekli sunar.
// ------------------------------------------------------------
// KAPSAM
//   • Futbol: dünyadaki tüm ligler. İki yol var:
//       /soccer/all/scoreboard?dates=20261006   → o günün TÜM dünya maçları
//       /soccer/{lig}/scoreboard                → tek lig (tur.1, eng.1, esp.1 ...)
//   • Basketbol: nba, wnba, nbl, fiba, nba-development, üniversite ligleri
//   • Amerikan futbolu: nfl, college-football
//   • Beyzbol: mlb      • Buz hokeyi: nhl
//
// Yeni spor/lig eklemek için aşağıdaki SPORTS listesine bir satır yeterli.
//
// Test:  https://spor-worker.kyazar07.workers.dev/soccer/all/scoreboard
//        https://spor-worker.kyazar07.workers.dev/basketball/nba/scoreboard
// Deploy: Cloudflare Dashboard → Workers & Pages → spor-worker → Edit Code
// ============================================================

// Futbol (soccer) için lig kodu serbest: ESPN'in tanıdığı tüm kodlar çalışır.
// Diğer sporlarda sadece bu listedeki ligler izinli (kötüye kullanımı önlemek için).
const SPORTS = {
    soccer:     null,   // null = herhangi bir lig kodu (all, tur.1, eng.1, bra.1 ...)
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

// Geçmiş günlerin skoru değişmez: uzun önbellek. Bugün/canlı: 15 sn.
function pickTtl(dates) {
    if (!dates) return 15;
    const last = dates.split('-').pop();             // aralıksa bitiş günü
    const d = Date.UTC(+last.slice(0, 4), +last.slice(4, 6) - 1, +last.slice(6, 8));
    const yesterday = Date.now() - 36 * 3600 * 1000; // saat dilimi payı
    return d < yesterday ? 600 : 15;
}

export default {
    async fetch(req, env, ctx) {
        if (req.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: CORS });
        }

        const url = new URL(req.url);

        // Kök: durum ve kullanım
        if (url.pathname === '/' || url.pathname === '') {
            const lists = {};
            Object.entries(SPORTS).forEach(([s, l]) => { lists[s] = l ? l : 'tüm ligler (all, tur.1, eng.1 ...)'; });
            return jsonResponse({
                ok: true,
                message: '⚽🏀 Spor Worker v3 çalışıyor',
                sports: lists,
                usage: [
                    '/soccer/all/scoreboard?dates=YYYYMMDD',
                    '/soccer/tur.1/scoreboard',
                    '/basketball/nba/scoreboard'
                ]
            });
        }

        const m = url.pathname.match(/^\/([a-z-]+)\/([a-z0-9._-]+)\/scoreboard$/);
        const sport = m && m[1];
        const league = m && m[2];
        const allowed = m && Object.prototype.hasOwnProperty.call(SPORTS, sport) &&
            (SPORTS[sport] === null ? league.length <= 40 : SPORTS[sport].includes(league));

        if (!allowed) {
            return jsonResponse({
                error: 'Not found',
                hint: 'Kullanım: /{spor}/{lig}/scoreboard — örn. /soccer/all/scoreboard, /basketball/nba/scoreboard',
                sports: Object.keys(SPORTS)
            }, 404);
        }

        const q = new URLSearchParams();
        const dates = url.searchParams.get('dates');
        const validDates = dates && /^\d{8}(-\d{8})?$/.test(dates) ? dates : null;
        if (validDates) q.set('dates', validDates);

        let limit = parseInt(url.searchParams.get('limit') || '500', 10);
        if (!Number.isFinite(limit) || limit < 1) limit = 500;
        q.set('limit', String(Math.min(limit, 1000)));

        // Üniversite ligleri için tüm Division I maçları
        const groups = url.searchParams.get('groups');
        if (groups && /^\d{1,3}$/.test(groups)) q.set('groups', groups);

        const target = 'https://site.api.espn.com/apis/site/v2/sports/' +
            sport + '/' + league + '/scoreboard?' + q.toString();

        const ttl = pickTtl(validDates);
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
};
