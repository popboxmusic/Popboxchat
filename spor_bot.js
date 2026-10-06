/* ============================================================
   spor_bot.js — CETCETY Spor Botu v6.0
   • SADECE #spor kanalında yazar.
   • Cloudflare Worker üzerinden ESPN skorları + haberleri çeker.
   • Futbol: tüm dünya ligleri. + Basketbol, NFL, MLB, NHL.
   Komutlar: /canli /bugun /skor /haber /spor
   ============================================================ */
(function () {
    'use strict';
    if (window.__sporBot) return;
    window.__sporBot = true;

    var WORKER_URL = 'https://spor-worker.kyazar07.workers.dev';
    var VERSION = '6.0';
    var HOME_CHANNEL = 'spor';
    var ESPN = 'https://site.api.espn.com/apis/site/v2/sports';
    var BASE = WORKER_URL ? WORKER_URL.replace(/\/+$/, '') : ESPN;

    var CFG = {
        LIVE_MS: 30000,
        SOON_MS: 60000,
        IDLE_MS: 300000,
        TTL_MS: 15000,
        NEWS_TTL_MS: 60000,
        TOAST_MS: 9000,
        MAX_LINES: 50
    };

    var BOARDS = {
        'soccer/all':             { sport: 'futbol' },
        'soccer/tur.1':           { sport: 'futbol', name: 'Süper Lig' },
        'soccer/uefa.champions':  { sport: 'futbol', name: 'Şampiyonlar Ligi' },
        'soccer/uefa.europa':     { sport: 'futbol', name: 'Avrupa Ligi' },
        'soccer/uefa.europa.conf': { sport: 'futbol', name: 'Konferans Ligi' },
        'basketball/nba':         { sport: 'basketbol', name: 'NBA' },
        'basketball/wnba':        { sport: 'basketbol', name: 'WNBA' },
        'basketball/nbl':         { sport: 'basketbol', name: 'NBL (Avustralya)' },
        'basketball/fiba':        { sport: 'basketbol', name: 'FIBA' },
        'football/nfl':           { sport: 'nfl', name: 'NFL' },
        'baseball/mlb':           { sport: 'beyzbol', name: 'MLB' },
        'hockey/nhl':             { sport: 'hokey', name: 'NHL' }
    };

    var SPORT_LABEL = {
        futbol: '⚽ Futbol', basketbol: '🏀 Basketbol', nfl: '🏈 Amerikan Futbolu',
        beyzbol: '⚾ Beyzbol', hokey: '🏒 Buz Hokeyi'
    };
    var SPORT_ORDER = ['futbol', 'basketbol', 'nfl', 'beyzbol', 'hokey'];
    var SPORT_KEYS = {
        futbol: ['soccer/all'],
        basketbol: ['basketball/nba', 'basketball/wnba', 'basketball/nbl', 'basketball/fiba'],
        nfl: ['football/nfl'],
        beyzbol: ['baseball/mlb'],
        hokey: ['hockey/nhl']
    };
    var SPORT_WORDS = {
        futbol: 'futbol', basketbol: 'basketbol', basket: 'basketbol', nba: 'basketbol', wnba: 'basketbol',
        nfl: 'nfl', amerikan: 'nfl', mlb: 'beyzbol', beyzbol: 'beyzbol', nhl: 'hokey', hokey: 'hokey'
    };
    var SHORT_CODES = {
        nba: 'basketball/nba', wnba: 'basketball/wnba', nbl: 'basketball/nbl', fiba: 'basketball/fiba',
        nfl: 'football/nfl', mlb: 'baseball/mlb', nhl: 'hockey/nhl'
    };
    // Haber çekilebilecek varsayılan ligler
    var DEFAULT_NEWS_BOARDS = ['soccer/tur.1', 'soccer/uefa.champions', 'soccer/eng.1', 'soccer/esp.1'];
    var DEFAULT_ALERT_BOARDS = ['soccer/tur.1', 'soccer/uefa.champions', 'soccer/uefa.europa', 'soccer/uefa.europa.conf'];
    var TEAM_BOARDS = ['soccer/all', 'basketball/nba', 'basketball/wnba', 'football/nfl', 'baseball/mlb', 'hockey/nhl'];
    var ALL_KEYS = [];
    SPORT_ORDER.forEach(function (s) { ALL_KEYS = ALL_KEYS.concat(SPORT_KEYS[s]); });

    var LG_TR = [
        [/^turkish super lig$/i, 'Süper Lig'],
        [/^uefa champions league$/i, 'Şampiyonlar Ligi'],
        [/^uefa europa league$/i, 'Avrupa Ligi'],
        [/^uefa (europa )?conference league$|^uefa europa conf/i, 'Konferans Ligi'],
        [/^english premier league$/i, 'Premier Lig'],
        [/^spanish (la ?liga)$/i, 'La Liga'],
        [/^german bundesliga$/i, 'Bundesliga'],
        [/^italian serie a$/i, 'Serie A'],
        [/^french ligue 1$/i, 'Ligue 1'],
        [/^fifa world cup$/i, 'Dünya Kupası'],
        [/^uefa nations league$/i, 'UEFA Uluslar Ligi'],
        [/^dutch eredivisie$/i, 'Hollanda Ligi'],
        [/^portuguese primeira liga$/i, 'Portekiz Ligi'],
        [/^major league soccer$/i, 'MLS'],
        [/^national basketball association$|^nba$/i, 'NBA']
    ];
    function lgInfo(name) {
        var n = String(name || '');
        for (var i = 0; i < LG_TR.length; i++) {
            if (LG_TR[i][0].test(n)) return { name: LG_TR[i][1], rank: i };
        }
        return { name: n || 'Diğer Maçlar', rank: 100 };
    }

    var ALIAS = {
        gs: 'galatasaray', cimbom: 'galatasaray',
        fb: 'fenerbahce', fener: 'fenerbahce',
        bjk: 'besiktas', ts: 'trabzonspor', bsk: 'basaksehir',
        barca: 'barcelona', real: 'real madrid',
        city: 'manchester city', united: 'manchester united',
        psg: 'paris saint germain', atletico: 'atletico madrid',
        inter: 'inter', milan: 'ac milan',
        lakers: 'los angeles lakers', warriors: 'golden state warriors',
        celtics: 'boston celtics', bulls: 'chicago bulls', heat: 'miami heat'
    };

    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }
    function norm(s) {
        return String(s || '').toLocaleLowerCase('tr')
            .replace(/ı/g, 'i')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9 ]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }
    function pad(n) { return String(n).padStart(2, '0'); }
    function ymd(d) { return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()); }
    function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
    function fmtTime(ts) { return new Date(ts).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }); }
    function fmtDay(ts) { return new Date(ts).toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' }); }
    function sameDay(a, b) { return new Date(a).toDateString() === new Date(b).toDateString(); }
    function ago(ts) {
        var diff = Date.now() - ts;
        var m = Math.floor(diff / 60000);
        if (m < 1) return 'az önce';
        if (m < 60) return m + ' dk önce';
        var h = Math.floor(m / 60);
        if (h < 24) return h + ' sa önce';
        var d = Math.floor(h / 24);
        return d + ' gün önce';
    }

    function logged() {
        try { return typeof currentUser !== 'undefined' && !!currentUser; } catch (e) { return false; }
    }
    function inHome() {
        try { return typeof currentChannel !== 'undefined' && currentChannel === HOME_CHANNEL; } catch (e) { return false; }
    }
    function say(html) {
        try { if (inHome() && typeof window.addSystemMessage === 'function') window.addSystemMessage(html); } catch (e) {}
    }

    var PK = 'cety_spor_prefs';
    var prefs = { alerts: true, teams: [], boards: DEFAULT_ALERT_BOARDS.slice() };
    try { prefs = Object.assign(prefs, JSON.parse(localStorage.getItem(PK) || '{}')); } catch (e) {}
    if (!Array.isArray(prefs.teams)) prefs.teams = [];
    if (!Array.isArray(prefs.boards) || !prefs.boards.length) prefs.boards = DEFAULT_ALERT_BOARDS.slice();
    prefs.boards = prefs.boards.filter(function (k) { return /^[a-z-]+\/[a-z0-9._-]+$/.test(k); });
    function savePrefs() { try { localStorage.setItem(PK, JSON.stringify(prefs)); } catch (e) {} }

    var cache = new Map();
    var newsCache = new Map();
    var net = { route: null, errs: {}, ok: 0, fail: 0 };

    function getJSON(url, ms) {
        return new Promise(function (resolve, reject) {
            var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
            var to = setTimeout(function () { if (ctl) ctl.abort(); }, ms || 12000);
            fetch(url, { signal: ctl ? ctl.signal : undefined })
                .then(function (r) {
                    if (!r.ok) throw new Error('HTTP ' + r.status);
                    return r.json();
                })
                .then(function (j) {
                    clearTimeout(to);
                    if (!j || (!Array.isArray(j.events) && !Array.isArray(j.articles))) {
                        reject(new Error('Beklenmeyen yanıt'));
                        return;
                    }
                    resolve(j);
                })
                .catch(function (e) { clearTimeout(to); reject(e); });
        });
    }

    function routes(path) {
        var list = [{ name: 'worker', url: BASE + path }];
        if (BASE !== ESPN) list.push({ name: 'doğrudan', url: ESPN + path });
        if (net.route) {
            var i = -1;
            for (var k = 0; k < list.length; k++) { if (list[k].name === net.route) { i = k; break; } }
            if (i > 0) list.unshift(list.splice(i, 1)[0]);
        }
        return list;
    }

    function sportOf(key) {
        var b = BOARDS[key];
        if (b) return b.sport;
        var s = key.split('/')[0];
        return { soccer: 'futbol', basketball: 'basketbol', football: 'nfl', baseball: 'beyzbol', hockey: 'hokey' }[s] || 'futbol';
    }

    function tryRoute(path, ttl, cacheStore) {
        var ck = path;
        var hit = cacheStore.get(ck);
        if (hit && Date.now() - hit.t < ttl) return Promise.resolve(hit.v);

        var list = routes(path);
        function tryNext(idx) {
            if (idx >= list.length) { net.fail++; return Promise.reject(new Error('Bağlantı kurulamadı')); }
            var r = list[idx];
            return getJSON(r.url).then(function (j) {
                net.route = r.name;
                net.ok++;
                cacheStore.set(ck, { t: Date.now(), v: j });
                return j;
            }).catch(function (e) {
                net.errs[r.name] = (e && e.name === 'AbortError') ? 'zaman aşımı' : String((e && e.message) || e);
                return tryNext(idx + 1);
            });
        }
        return tryNext(0);
    }

    function fetchBoard(key, dates, ttl) {
        var path = '/' + key + '/scoreboard?limit=500' + (dates ? '&dates=' + dates : '');
        return tryRoute(path, ttl == null ? CFG.TTL_MS : ttl, cache).then(function (j) {
            var map = leagueMap(j);
            return (j.events || []).map(function (e) { return parseEvent(e, key, j, map); });
        });
    }

    function fetchNews(key, limit) {
        var path = '/' + key + '/news?limit=' + (limit || 15);
        return tryRoute(path, CFG.NEWS_TTL_MS, newsCache).then(function (j) {
            return (j.articles || []).map(function (a) {
                return {
                    id: String(a.id || a.guid || Math.random()),
                    board: key,
                    sport: sportOf(key),
                    lgName: (BOARDS[key] && BOARDS[key].name) || key,
                    headline: a.headline || a.title || '',
                    description: a.description || '',
                    published: Date.parse(a.published || a.lastModified) || 0,
                    url: (a.links && a.links.web && a.links.web.href) || (a.links && a.links.api && a.links.api.news) || '',
                    image: (a.images && a.images[0] && a.images[0].url) || ''
                };
            });
        });
    }

    function leagueMap(j) {
        var m = {};
        (j.leagues || []).forEach(function (l) {
            if (l && l.id != null) m[String(l.id)] = l.name || l.abbreviation || '';
        });
        return m;
    }

    function evLeague(ev, key, map, j) {
        var cfg = BOARDS[key];
        if (cfg && cfg.name) return cfg.name;
        if (ev.league && (ev.league.name || ev.league.abbreviation)) return ev.league.name || ev.league.abbreviation;
        var m = /~l:(\d+)/.exec(String(ev.uid || ''));
        if (m && map[m[1]]) return map[m[1]];
        if ((j.leagues || []).length === 1 && j.leagues[0].name) return j.leagues[0].name;
        return '';
    }

    function parseEvent(ev, key, j, map) {
        var comp = (ev.competitions || [])[0] || {};
        var cs = comp.competitors || [];
        var h = null, a = null;
        for (var i = 0; i < cs.length; i++) {
            if (cs[i].homeAway === 'home') h = cs[i];
            if (cs[i].homeAway === 'away') a = cs[i];
        }
        if (!h) h = cs[0] || {};
        if (!a) a = cs[1] || {};
        var st = ev.status || comp.status || {};
        var tp = st.type || {};

        function side(c) {
            var team = c.team || c.athlete || {};
            return {
                id: String(team.id || c.id || ''),
                name: team.shortDisplayName || team.displayName || c.name || '?',
                full: team.displayName || '',
                score: parseInt(c.score, 10) || 0
            };
        }

        return {
            id: String(ev.id),
            board: key,
            sport: sportOf(key),
            lgName: evLeague(ev, key, map || {}, j || {}),
            date: Date.parse(ev.date) || 0,
            state: tp.state || 'pre',
            sname: String(tp.name || ''),
            clock: st.displayClock || '',
            period: st.period || 0,
            short: tp.shortDetail || tp.detail || '',
            home: side(h),
            away: side(a),
            details: comp.details || [],
            venue: ((comp.venue || {}).fullName) || ''
        };
    }

    function uniq(lists) {
        var m = new Map();
        lists.forEach(function (l) { l.forEach(function (e) { m.set(e.sport + '|' + e.id, e); }); });
        return Array.from(m.values());
    }

    function collectDays(keys, offsets) {
        var now = new Date();
        var jobs = [];
        keys.forEach(function (k) {
            offsets.forEach(function (o) { jobs.push(fetchBoard(k, ymd(addDays(now, o)))); });
        });
        return Promise.allSettled(jobs).then(function (res) {
            var ok = res.filter(function (r) { return r.status === 'fulfilled'; });
            if (!ok.length) throw new Error('Skor servisine ulaşılamadı');
            return uniq(ok.map(function (r) { return r.value; }));
        });
    }

    function collectRange(keys, from, to) {
        var jobs = [];
        keys.forEach(function (k) {
            if (k === 'soccer/all') {
                for (var d = new Date(from); d <= to; d = addDays(d, 1)) jobs.push(fetchBoard(k, ymd(d)));
            } else {
                jobs.push(fetchBoard(k, ymd(from) + '-' + ymd(to)));
            }
        });
        return Promise.allSettled(jobs).then(function (res) {
            var ok = res.filter(function (r) { return r.status === 'fulfilled'; });
            if (!ok.length) throw new Error('Skor servisine ulaşılamadı');
            return uniq(ok.map(function (r) { return r.value; }));
        });
    }

    function parseFilter(text) {
        var q = norm(text);
        if (!q) return { sport: null, q: '' };
        if (SPORT_WORDS[q]) return { sport: SPORT_WORDS[q], q: '' };
        return { sport: null, q: q };
    }
    function keysFor(f) {
        return f.sport ? SPORT_KEYS[f.sport] : ALL_KEYS;
    }
    function applyFilter(evs, f) {
        if (f.sport) evs = evs.filter(function (e) { return e.sport === f.sport; });
        if (f.q) {
            evs = evs.filter(function (e) {
                return norm(e.lgName).indexOf(f.q) !== -1 ||
                    norm(lgInfo(e.lgName).name).indexOf(f.q) !== -1 ||
                    matchTeam(e, f.q);
            });
        }
        return evs;
    }

    function special(e) {
        if (/POSTPONED/.test(e.sname)) return '⏸️ Ertelendi';
        if (/CANCEL|ABANDON/.test(e.sname)) return '🚫 İptal';
        if (/DELAY|SUSPEND/.test(e.sname)) return '⏳ Gecikti';
        return '';
    }

    function statusTxt(e) {
        var sp = special(e);
        if (sp) return sp;
        if (e.state === 'pre') return '🕒 ' + fmtTime(e.date);
        if (e.state === 'in') {
            if (/HALFTIME/.test(e.sname)) return '⏸️ Devre arası';
            if (/SHOOTOUT|PEN/.test(e.sname)) return '🔴 Penaltılar';
            if (e.sport === 'futbol') return '🔴 ' + (e.clock || 'Canlı');
            return '🔴 ' + (e.short || e.clock || 'Canlı');
        }
        return '✅ Maç sonu';
    }

    function line(e) {
        var sc = (e.state === 'pre' || special(e)) ? ' - ' : ' ' + e.home.score + '-' + e.away.score + ' ';
        return statusTxt(e) + ' &nbsp;<strong>' + esc(e.home.name) + sc + esc(e.away.name) + '</strong>';
    }

    function groupHtml(title, events) {
        var bySport = {};
        events.forEach(function (e) {
            (bySport[e.sport] = bySport[e.sport] || {});
            var ln = e.lgName || 'Diğer Maçlar';
            (bySport[e.sport][ln] = bySport[e.sport][ln] || []).push(e);
        });

        var h = title + '<br>';
        var shown = 0;
        var total = events.length;

        SPORT_ORDER.forEach(function (s) {
            if (!bySport[s] || shown >= CFG.MAX_LINES) return;
            var names = Object.keys(bySport[s]).sort(function (a, b) {
                var ra = lgInfo(a).rank, rb = lgInfo(b).rank;
                return ra !== rb ? ra - rb : a.localeCompare(b);
            });
            var head = '<br><strong>' + SPORT_LABEL[s] + '</strong><br>';
            var headDone = false;
            names.forEach(function (n) {
                if (shown >= CFG.MAX_LINES) return;
                var list = bySport[s][n].sort(function (a, b) { return a.date - b.date; });
                var room = CFG.MAX_LINES - shown;
                var take = list.slice(0, room);
                if (!headDone) { h += head; headDone = true; }
                h += '<span style="opacity:.75">🏆 ' + esc(lgInfo(n).name) + '</span><br>' +
                    take.map(line).join('<br>') + '<br>';
                shown += take.length;
            });
        });

        if (shown < total) {
            h += '<br><span style="opacity:.6">… ve ' + (total - shown) + ' maç daha. ' +
                'Filtrele: <strong>/bugun süper lig</strong> • <strong>/bugun basketbol</strong> • <strong>/bugun premier</strong></span>';
        }
        return h;
    }

    function incidents(e) {
        var out = [];
        (e.details || []).forEach(function (d) {
            var ath = (d.athletesInvolved || [])[0] || {};
            var who = ath.displayName || ath.shortName || '';
            var min = (d.clock || {}).displayValue || '';
            var teamId = String((d.team || {}).id || '');
            var team = teamId === e.home.id ? e.home.name : teamId === e.away.id ? e.away.name : '';
            if (d.scoringPlay) {
                out.push(['⚽', min, who, team, d.ownGoal ? ' (kk)' : d.penaltyKick ? ' (pen)' : '']);
            } else if (d.redCard) {
                out.push(['🟥', min, who, team, '']);
            }
        });
        return out.map(function (x) {
            return x[0] + ' ' + esc(x[1]) + ' ' + esc(x[2]) +
                (x[3] ? ' <span style="opacity:.6">(' + esc(x[3]) + ')</span>' : '') + x[4];
        }).join('<br>');
    }

    function reds(e) {
        return (e.details || []).filter(function (d) { return d.redCard; }).length;
    }

    function matchTeam(e, q) {
        var n = norm(ALIAS[norm(q)] || q);
        if (!n) return false;
        var arr = [norm(e.home.name), norm(e.home.full), norm(e.away.name), norm(e.away.full)];
        return arr.some(function (t) {
            return t && (t.indexOf(n) !== -1 || (n.indexOf(t) !== -1 && t.length > 3));
        });
    }

    function failMsg(e) {
        say('⚠️ ' + esc(e.message) + '. Sorunu görmek için <strong>/spor test</strong> yaz.');
    }

    /* ---------- SKOR KOMUTLARI ---------- */
    function cmdLive(arg) {
        var f = parseFilter(arg);
        say('⏳ Canlı maçlar aranıyor…');
        return collectDays(keysFor(f), [-1, 0]).then(function (all) {
            var evs = applyFilter(all, f);
            var live = evs.filter(function (e) { return e.state === 'in'; });
            if (live.length) {
                say(groupHtml('🔴 <strong>CANLI MAÇLAR</strong> (' + live.length + ')', live));
                return;
            }
            var next = evs.filter(function (e) { return e.state === 'pre' && e.date > Date.now(); })
                .sort(function (a, b) { return a.date - b.date; }).slice(0, 6);
            say('😴 Şu an canlı maç yok.' + (next.length ? '<br><br><strong>Sıradakiler:</strong><br>' +
                next.map(function (e) {
                    return fmtDay(e.date) + ' ' + fmtTime(e.date) + ' — <strong>' +
                        esc(e.home.name) + ' - ' + esc(e.away.name) + '</strong> <span style="opacity:.6">(' +
                        esc(lgInfo(e.lgName).name) + ')</span>';
                }).join('<br>') : ''));
        }).catch(failMsg);
    }

    function cmdToday(arg) {
        var f = parseFilter(arg);
        say('⏳ Bugünün maçları getiriliyor…');
        var now = new Date();
        return collectDays(keysFor(f), [-1, 0, 1]).then(function (all) {
            var evs = applyFilter(all, f).filter(function (e) { return sameDay(e.date, now); });
            if (!evs.length) {
                say('📅 Bugün' + (arg ? ' "' + esc(arg) + '" için' : '') + ' maç görünmüyor.');
                return;
            }
            say(groupHtml('📅 <strong>BUGÜNÜN MAÇLARI</strong> — ' + fmtDay(now) + ' (' + evs.length + ')', evs));
        }).catch(failMsg);
    }

    function cmdScore(q) {
        if (!q) {
            say('Kullanım: /skor takım adı (örn: /skor galatasaray, /skor fb, /skor lakers, /skor real madrid)');
            return Promise.resolve();
        }
        say('⏳ "' + esc(q) + '" aranıyor…');
        var now = new Date();
        return collectRange(ALL_KEYS, addDays(now, -2), addDays(now, 4)).then(function (list) {
            var evs = list.filter(function (e) { return matchTeam(e, q); });
            if (!evs.length) {
                say('🤷 "' + esc(q) + '" için yakın tarihli maç bulunamadı. Takım adını (örn. galatasaray, fb, real madrid, lakers) dene.');
                return;
            }
            var live = evs.filter(function (e) { return e.state === 'in'; });
            var today = evs.filter(function (e) { return sameDay(e.date, now); });
            var past = evs.filter(function (e) { return e.state === 'post'; }).sort(function (a, b) { return b.date - a.date; });
            var fut = evs.filter(function (e) { return e.state === 'pre'; }).sort(function (a, b) { return a.date - b.date; });
            var main = live[0] || today[0] || past[0] || fut[0];
            var extra = (main === fut[0] || main.state === 'pre') ? null : fut[0];

            var h = '<strong>' + esc(main.home.name) + ' ' +
                (main.state === 'pre' ? '-' : main.home.score + '-' + main.away.score) + ' ' +
                esc(main.away.name) + '</strong><br>' +
                statusTxt(main) + ' • ' + fmtDay(main.date) +
                (main.state === 'pre' ? ' ' + fmtTime(main.date) : '') +
                ' • <span style="opacity:.7">' + esc(lgInfo(main.lgName).name) + '</span>';
            var inc = main.sport === 'futbol' ? incidents(main) : '';
            if (inc) h += '<br>' + inc;
            if (extra) {
                h += '<br><br>⏭️ Sıradaki: ' + fmtDay(extra.date) + ' ' + fmtTime(extra.date) +
                    ' — ' + esc(extra.home.name) + ' - ' + esc(extra.away.name);
            }
            say((SPORT_LABEL[main.sport] || '').split(' ')[0] + ' ' + h);
        }).catch(failMsg);
    }

    /* ---------- HABER KOMUTU ---------- */
    function boardNameForNews(query) {
        var q = norm(query);
        if (!q) return 'soccer/tur.1';
        // Doğrudan kod mu? (nba, tur.1, eng.1 ...)
        if (SHORT_CODES[q]) return SHORT_CODES[q];
        if (/^[a-z]{2,}\.[a-z0-9._]+$/.test(q)) return 'soccer/' + q;
        // Lig adı araması
        if (q.indexOf('super lig') !== -1 || q === 'turkiye' || q === 'turkiye ligi') return 'soccer/tur.1';
        if (q.indexOf('sampiyonlar') !== -1 || q === 'ucl') return 'soccer/uefa.champions';
        if (q.indexOf('avrupa ligi') !== -1 || q === 'uel') return 'soccer/uefa.europa';
        if (q.indexOf('konferans') !== -1) return 'soccer/uefa.europa.conf';
        if (q.indexOf('premier') !== -1) return 'soccer/eng.1';
        if (q.indexOf('la liga') !== -1 || q.indexOf('ispanya') !== -1) return 'soccer/esp.1';
        if (q.indexOf('bundesliga') !== -1 || q.indexOf('almanya') !== -1) return 'soccer/ger.1';
        if (q.indexOf('serie a') !== -1 || q.indexOf('italya') !== -1) return 'soccer/ita.1';
        if (q.indexOf('ligue 1') !== -1 || q.indexOf('fransa') !== -1) return 'soccer/fra.1';
        if (q === 'nba') return 'basketball/nba';
        if (q === 'nfl') return 'football/nfl';
        if (q === 'mlb') return 'baseball/mlb';
        if (q === 'nhl') return 'hockey/nhl';
        // Varsayılan
        return 'soccer/tur.1';
    }

    function cmdNews(arg) {
        var key = boardNameForNews(arg);
        var label = (BOARDS[key] && BOARDS[key].name) || key;
        say('📰 ' + esc(label) + ' haberleri getiriliyor…');

        return fetchNews(key, 10).then(function (articles) {
            if (!articles.length) {
                say('📰 ' + esc(label) + ' için haber bulunamadı.');
                return;
            }
            var h = '📰 <strong>' + esc(label) + ' — SON HABERLER</strong> (' + articles.length + ')<br><br>';
            articles.slice(0, 8).forEach(function (a) {
                var title = esc(a.headline);
                var desc = a.description ? esc(a.description.slice(0, 140)) + (a.description.length > 140 ? '…' : '') : '';
                var time = a.published ? ago(a.published) : '';
                var link = a.url ? ' <a href="' + esc(a.url) + '" target="_blank" rel="noopener">↗ devamı</a>' : '';
                h += '• <strong>' + title + '</strong>' + link + '<br>';
                if (desc) h += '<span style="opacity:.75; font-size:13px;">' + desc + '</span><br>';
                if (time) h += '<span style="opacity:.5; font-size:11px;">🕒 ' + time + '</span><br><br>';
            });
            h += '<span style="opacity:.6; font-size:12px;">Diğer ligler için: <strong>/haber nba</strong> • <strong>/haber premier</strong> • <strong>/haber şampiyonlar</strong> • <strong>/haber eng.1</strong></span>';
            say(h);
        }).catch(function (e) {
            say('⚠️ Haberler alınamadı. <strong>/spor test</strong> ile kontrol et. (' + esc(e.message) + ')');
        });
    }

    function cmdTest() {
        var ok = '✅', no = '❌';
        say('🔧 <strong>Spor botu testi</strong> (v' + VERSION + ') çalışıyor…');
        var rows = [];
        rows.push(ok + ' spor_bot.js yüklendi');
        rows.push((typeof window.addSystemMessage === 'function' ? ok : no) + ' sohbete yazma');
        rows.push((logged() ? ok : no) + ' giriş yapılmış');
        rows.push(ok + ' kanal: #' + HOME_CHANNEL);

        var scoreChecks = ['soccer/tur.1', 'soccer/all', 'basketball/nba'];
        scoreChecks.forEach(function (k) { cache.delete('/' + k + '/scoreboard?limit=500'); });

        return Promise.allSettled(scoreChecks.map(function (k) { return fetchBoard(k, null, 0); })).then(function (res) {
            res.forEach(function (r, i) {
                var k = scoreChecks[i];
                if (r.status === 'fulfilled') {
                    rows.push(ok + ' skor ' + esc(k) + ': ' + r.value.length + ' maç');
                } else {
                    rows.push(no + ' skor ' + esc(k) + ': ' + esc(String((r.reason && r.reason.message) || r.reason)));
                }
            });

            return Promise.allSettled([
                fetchNews('soccer/tur.1', 5),
                fetchNews('basketball/nba', 5)
            ]).then(function (nres) {
                nres.forEach(function (r, i) {
                    var k = i === 0 ? 'soccer/tur.1' : 'basketball/nba';
                    if (r.status === 'fulfilled') {
                        rows.push(ok + ' haber ' + esc(k) + ': ' + r.value.length + ' makale');
                    } else {
                        rows.push(no + ' haber ' + esc(k) + ': ' + esc(String((r.reason && r.reason.message) || r.reason)));
                    }
                });
                rows.push('🌐 yol: ' + esc(net.route || '-'));
                Object.keys(net.errs).forEach(function (k) {
                    rows.push('&nbsp;&nbsp;↳ ' + esc(k) + ': ' + esc(net.errs[k]));
                });
                rows.push('🔔 Bildirimler: ' + (prefs.alerts ? 'açık' : 'kapalı') +
                    ' • takip: ' + (prefs.teams.length ? prefs.teams.map(esc).join(', ') : 'yok'));
                rows.push('💡 Worker: <strong>' + esc(WORKER_URL) + '</strong>');
                say(rows.join('<br>'));
            });
        });
    }

    function boardName(k) {
        return (BOARDS[k] && BOARDS[k].name) || k.split('/')[1];
    }

    function toBoardKey(code) {
        var c = String(code || '').toLowerCase().trim();
        if (SHORT_CODES[c]) return SHORT_CODES[c];
        if (/^[a-z]{2,}\.[a-z0-9._]+$/.test(c)) return 'soccer/' + c;
        return null;
    }

    function cmdSpor(args) {
        var sub = (args[0] || '').toLowerCase();
        var rest = args.slice(1).join(' ');

        if (sub === 'test') { cmdTest(); return; }

        if (sub === 'kapat') {
            prefs.alerts = false;
            savePrefs();
            say('🔕 Canlı spor bildirimleri kapatıldı. (/spor ac ile açabilirsin)');
            return;
        }

        if (sub === 'ac' || sub === 'aç') {
            prefs.alerts = true;
            savePrefs();
            say('🔔 Canlı spor bildirimleri açıldı: ' + prefs.boards.map(boardName).map(esc).join(', ') +
                (prefs.teams.length ? ' + takip ettiğin takımlar' : '') + '.');
            return;
        }

        if (sub === 'takip' && rest) {
            var t = norm(ALIAS[norm(rest)] || rest);
            if (t && prefs.teams.indexOf(t) === -1) prefs.teams.push(t);
            savePrefs();
            say('⭐ Takip: <strong>' + esc(t) + '</strong> — futbol, NBA, NFL, MLB, NHL maçlarında bu takımın bildirimlerini alacaksın.');
            return;
        }

        if ((sub === 'takipsil' || sub === 'sil') && rest) {
            var t2 = norm(ALIAS[norm(rest)] || rest);
            prefs.teams = prefs.teams.filter(function (x) { return x !== t2; });
            savePrefs();
            say('🗑️ Takipten çıkarıldı: ' + esc(t2));
            return;
        }

        if (sub === 'liste') {
            say('⭐ Takip ettiklerin: ' + (prefs.teams.length ? prefs.teams.map(esc).join(', ') : 'yok'));
            return;
        }

        if (sub === 'bildirim') {
            var act = (args[1] || 'liste').toLowerCase();
            if (act === 'liste') {
                say('🏆 Bildirim gelen ligler: ' + prefs.boards.map(boardName).map(esc).join(', ') +
                    '<br>Ekle: <strong>/spor bildirim ekle eng.1</strong> (veya nba, nfl, mlb, nhl, esp.1, ger.1, ita.1, bra.1 ...)' +
                    '<br>Çıkar: <strong>/spor bildirim sil nba</strong>');
                return;
            }
            var key = toBoardKey(args[2]);
            if (!key) { say('❌ Geçersiz kod. Örnek: <strong>/spor bildirim ekle eng.1</strong> veya <strong>nba</strong>'); return; }
            if (act === 'ekle') {
                if (prefs.boards.indexOf(key) === -1) prefs.boards.push(key);
                savePrefs();
                say('✅ Bildirim eklendi: <strong>' + esc(boardName(key)) + '</strong>');
            } else if (act === 'sil') {
                prefs.boards = prefs.boards.filter(function (k) { return k !== key; });
                if (!prefs.boards.length) prefs.boards = DEFAULT_ALERT_BOARDS.slice();
                savePrefs();
                say('🗑️ Bildirim kaldırıldı: <strong>' + esc(boardName(key)) + '</strong>');
            }
            return;
        }

        if (sub === 'ligler' || sub === 'sporlar') {
            say('🌍 <strong>Kapsam</strong><br>' +
                '⚽ Futbol: dünyadaki tüm ligler<br>' +
                '🏀 Basketbol: NBA, WNBA, NBL, FIBA<br>' +
                '🏈 NFL • ⚾ MLB • 🏒 NHL<br><br>' +
                'Filtre: <strong>/canli basketbol</strong> • <strong>/bugun süper lig</strong> • <strong>/haber nba</strong>');
            return;
        }

        say('🏟️ <strong>SPOR BOTU</strong> v' + VERSION + '<br>' +
            '<strong>Skor:</strong><br>' +
            '• /canli [spor] — canlı maçlar<br>' +
            '• /bugun [lig/spor] — bugünün programı<br>' +
            '• /skor takım — /skor galatasaray<br>' +
            '<strong>Haber:</strong><br>' +
            '• /haber [lig/takım] — son haberler (örn. /haber nba, /haber premier)<br>' +
            '<strong>Ayarlar:</strong><br>' +
            '• /spor ac | kapat — canlı bildirimler (' + (prefs.alerts ? 'AÇIK' : 'KAPALI') + ')<br>' +
            '• /spor bildirim ekle|sil|liste kod<br>' +
            '• /spor takip takım | takipsil takım | liste<br>' +
            '• /spor test — tanılama<br>' +
            '<span style="opacity:.6">Bot sadece #spor kanalında çalışır.</span>');
    }

    function toast(html, ms) {
        try {
            if (!inHome()) return;
            if (!document.getElementById('sporToastCss')) {
                var st = document.createElement('style');
                st.id = 'sporToastCss';
                st.textContent =
                    '#sporToasts{position:fixed;top:calc(var(--hdr-h,56px) + 8px);right:10px;z-index:3950;display:flex;flex-direction:column;gap:8px;width:min(340px,calc(100vw - 20px));pointer-events:none}' +
                    '.spor-toast{pointer-events:auto;background:var(--bg-elevated,#1b1b1b);border:1px solid var(--border-strong,#333);border-left:4px solid var(--youtube-red,#2ecc71);border-radius:12px;padding:10px 12px;color:var(--text-primary,#f1f1f1);font-size:13.5px;line-height:1.45;box-shadow:var(--shadow-lg,0 8px 28px rgba(0,0,0,.6));animation:sporIn .25s ease;cursor:pointer}' +
                    '@keyframes sporIn{from{transform:translateX(30px);opacity:0}to{transform:none;opacity:1}}';
                document.head.appendChild(st);
            }
            var box = document.getElementById('sporToasts');
            if (!box) {
                box = document.createElement('div');
                box.id = 'sporToasts';
                document.body.appendChild(box);
            }
            var t = document.createElement('div');
            t.className = 'spor-toast';
            t.innerHTML = html;
            t.onclick = function () { t.remove(); };
            box.appendChild(t);
            while (box.children.length > 4) box.firstChild.remove();
            setTimeout(function () { t.remove(); }, ms || CFG.TOAST_MS);
        } catch (e) {}
    }

    function announce(msgs) {
        if (!msgs.length || !logged() || !inHome()) return;
        if (msgs.length > 6) {
            say(msgs.slice(0, 6).join('<br>') + '<br>… ve ' + (msgs.length - 6) + ' gelişme daha (/canli)');
            toast(msgs[0] + '<br><span style="opacity:.6">+' + (msgs.length - 1) + ' gelişme</span>');
            return;
        }
        msgs.forEach(function (m) { say(m); toast(m); });
    }

    var snap = {};
    var ready = {};
    var meta = {};

    function followed(e) {
        return prefs.teams.some(function (t) { return matchTeam(e, t); });
    }

    function detect(e, out, baseline, key) {
        var alertBoard = prefs.boards.indexOf(key) !== -1;
        if (!alertBoard && !followed(e)) return;

        var sid = e.sport + '|' + e.id;
        var prev = snap[sid];
        snap[sid] = {
            state: e.state, sname: e.sname,
            hs: e.home.score, as: e.away.score,
            red: reds(e), ts: Date.now()
        };
        if (!baseline || !prev) return;

        var sc = '<strong>' + esc(e.home.name) + ' ' + e.home.score + '-' + e.away.score + ' ' + esc(e.away.name) + '</strong>';
        var lgName = ' <span style="opacity:.6">(' + esc(lgInfo(e.lgName).name) + ')</span>';
        var icon = (SPORT_LABEL[e.sport] || '⚽').split(' ')[0];

        if (prev.state === 'pre' && e.state === 'in') {
            out.push('🟢 <strong>Maç başladı:</strong> ' + esc(e.home.name) + ' - ' + esc(e.away.name) + lgName);
        }

        if (e.sport === 'futbol') {
            var goalsNow = e.home.score + e.away.score;
            var goalsPrev = prev.hs + prev.as;

            if (goalsNow > goalsPrev && e.state !== 'pre') {
                var sd = (e.details || []).filter(function (d) { return d.scoringPlay; });
                var last = sd[sd.length - 1];
                var who = last && ((last.athletesInvolved || [])[0] || {}).displayName;
                var min = (last && (last.clock || {}).displayValue) || e.clock;
                var scorer = e.home.score > prev.hs ? e.home.name : e.away.name;
                out.push('⚽ <strong>GOL!</strong> ' + esc(scorer) + ' — ' + sc + ' • ' + esc(min || '') +
                    (who && sd.length === goalsNow ? ' ' + esc(who) + (last.ownGoal ? ' (kk)' : last.penaltyKick ? ' (pen)' : '') : '') + lgName);
            } else if (goalsNow < goalsPrev) {
                out.push('❌ <strong>Gol iptal (VAR)</strong> — ' + sc + lgName);
            }

            if (reds(e) > prev.red) {
                var rd = (e.details || []).filter(function (d) { return d.redCard; }).pop() || {};
                out.push('🟥 <strong>Kırmızı kart</strong> ' +
                    esc(((rd.athletesInvolved || [])[0] || {}).displayName || '') + ' ' +
                    esc((rd.clock || {}).displayValue || '') + ' — ' + sc + lgName);
            }
        }

        if (/HALFTIME/.test(e.sname) && !/HALFTIME/.test(prev.sname)) {
            out.push('⏸️ <strong>Devre arası:</strong> ' + sc + lgName);
        }

        if (prev.state === 'in' && e.state === 'post') {
            out.push(icon + ' 🏁 <strong>Maç bitti:</strong> ' + sc + lgName);
        }
    }

    function poll(key) {
        return fetchBoard(key, null, 5000).then(function (evs) {
            var out = [];
            evs.forEach(function (e) { detect(e, out, !!ready[key], key); });
            ready[key] = true;
            var upcoming = evs.filter(function (e) { return e.state === 'pre' && e.date > Date.now(); })
                .map(function (e) { return e.date; }).sort(function (a, b) { return a - b; })[0];
            meta[key] = {
                live: evs.some(function (e) { return e.state === 'in'; }),
                next: upcoming || 0,
                t: Date.now()
            };
            if (prefs.alerts) announce(out);
        });
    }

    function due(key) {
        var m = meta[key];
        if (!m) return true;
        var iv = m.live ? CFG.LIVE_MS : (m.next && m.next - Date.now() < 15 * 60000 ? CFG.SOON_MS : CFG.IDLE_MS);
        return Date.now() - m.t >= iv;
    }

    var busy = false;
    var wasHome = false;

    function tick() {
        if (!inHome()) { wasHome = false; return; }
        if (!wasHome) { wasHome = true; ready = {}; meta = {}; snap = {}; }
        if (busy || !logged() || document.hidden || !prefs.alerts) return;

        busy = true;
        var keys = prefs.boards.slice();
        if (prefs.teams.length) {
            TEAM_BOARDS.forEach(function (k) { if (keys.indexOf(k) === -1) keys.push(k); });
        }
        Promise.allSettled(keys.filter(due).map(poll)).then(
            function () { busy = false; },
            function () { busy = false; }
        );
    }

    setInterval(tick, 10000);

    document.addEventListener('visibilitychange', function () {
        if (!document.hidden) {
            Object.keys(meta).forEach(function (k) { meta[k].t = 0; });
            tick();
        }
    });

    var COMMANDS = ['canli', 'canlı', 'bugun', 'bugün', 'skor', 'haber', 'spor'];

    function isCommand(text) {
        if (!text || text[0] !== '/') return false;
        var cmd = text.slice(1).split(/\s+/)[0].toLowerCase();
        return COMMANDS.indexOf(cmd) !== -1;
    }

    function handleCommand(text) {
        if (!inHome()) return;
        var parts = text.slice(1).split(/\s+/);
        var cmd = parts[0].toLowerCase();
        var args = parts.slice(1);

        if (cmd === 'canli' || cmd === 'canlı') return cmdLive(args.join(' '));
        if (cmd === 'bugun' || cmd === 'bugün') return cmdToday(args.join(' '));
        if (cmd === 'skor') return cmdScore(args.join(' '));
        if (cmd === 'haber') return cmdNews(args.join(' '));
        if (cmd === 'spor') return cmdSpor(args);
    }

    function registry() {
        var R = window.CMD_REGISTRY;
        if (!Array.isArray(R)) return;
        if (R.some(function (c) { return c[0] === 'canli'; })) return;
        R.push(
            ['canli', '[spor]', 'Şu an oynanan maçlar (futbol, basketbol, NFL...)', 'all', 'spor botu'],
            ['bugun', '[lig/spor]', 'Bugünün maç programı', 'all', 'spor botu'],
            ['skor', 'takım', 'Takımın canlı/son/sıradaki maçı', 'all', 'spor botu'],
            ['haber', '[lig/takım]', 'Son spor haberleri (örn. /haber nba)', 'all', 'spor botu'],
            ['spor', '[ac|kapat|ligler|takip takım]', 'Spor botu yardımı', 'all', 'spor botu']
        );
    }

    var hello = false;
    setInterval(function () {
        registry();
        if (!hello && logged() && inHome()) {
            hello = true;
            try { console.info('[spor_bot] v' + VERSION + ' hazır'); } catch (e) {}
            say('🏟️ Spor botu hazır — <strong>/canli</strong> • <strong>/bugun</strong> • <strong>/skor takım</strong> • <strong>/haber</strong> • /spor');
        }
    }, 1000);

    window.SporBot = {
        version: VERSION,
        isCommand: isCommand,
        handleCommand: handleCommand,
        test: cmdTest,
        live: cmdLive,
        today: cmdToday,
        score: cmdScore,
        news: cmdNews,
        net: net,
        _cache: cache,
        _newsCache: newsCache,
        _parse: parseEvent,
        _detect: detect,
        _match: matchTeam,
        _snap: snap,
        _prefs: prefs,
        _savePrefs: savePrefs
    };

    window.__sporBotReady = true;
})();
