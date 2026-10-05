/* ============================================================
   spor_bot.js — CETCETY Spor Botu v4.3
   Firebase'e YAZMAZ. Cloudflare Worker üzerinden skor çeker.
   Komutlar: /canli /bugun /skor <takım> /spor
   ============================================================ */
(function () {
    'use strict';
    if (window.__sporBot) return;
    window.__sporBot = true;

    var WORKER_URL = 'https://spor-worker.kyazar07.workers.dev/';
    var VERSION = '4.3';
    var ESPN = 'https://site.api.espn.com/apis/site/v2/sports/soccer';

    var CFG = {
        BASE: WORKER_URL ? WORKER_URL.replace(/\/+$/, '') + '/soccer' : ESPN,
        LIVE_MS: 30000,
        SOON_MS: 60000,
        IDLE_MS: 300000,
        TTL_MS: 15000,
        TOAST_MS: 9000
    };

    var LEAGUES = {
        'tur.1': 'Süper Lig',
        'uefa.champions': 'Şampiyonlar Ligi',
        'uefa.europa': 'Avrupa Ligi',
        'uefa.europa.conf': 'Konferans Ligi',
        'eng.1': 'Premier Lig',
        'esp.1': 'La Liga',
        'ger.1': 'Bundesliga',
        'ita.1': 'Serie A',
        'fra.1': 'Ligue 1'
    };

    var ALL = Object.keys(LEAGUES);
    var ALERT = ['tur.1', 'uefa.champions', 'uefa.europa', 'uefa.europa.conf'];

    var ALIAS = {
        gs: 'galatasaray', cimbom: 'galatasaray',
        fb: 'fenerbahce', fener: 'fenerbahce',
        bjk: 'besiktas', ts: 'trabzonspor', bsk: 'basaksehir',
        barca: 'barcelona', real: 'real madrid',
        city: 'manchester city', united: 'manchester united',
        psg: 'paris saint germain', atletico: 'atletico madrid',
        inter: 'inter', milan: 'ac milan'
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

    function logged() {
        try { return typeof currentUser !== 'undefined' && !!currentUser; } catch (e) { return false; }
    }

    function say(html) {
        try { if (typeof window.addSystemMessage === 'function') window.addSystemMessage(html); } catch (e) {}
    }

    var PK = 'cety_spor_prefs';
    var prefs = { alerts: true, teams: [] };
    try { prefs = Object.assign(prefs, JSON.parse(localStorage.getItem(PK) || '{}')); } catch (e) {}
    function savePrefs() { try { localStorage.setItem(PK, JSON.stringify(prefs)); } catch (e) {} }

    var cache = new Map();
    var net = { route: null, errs: {}, ok: 0, fail: 0 };

    function getJSON(url, ms) {
        return new Promise(function (resolve, reject) {
            var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
            var to = setTimeout(function () { if (ctl) ctl.abort(); }, ms || 9000);
            fetch(url, { signal: ctl ? ctl.signal : undefined })
                .then(function (r) {
                    if (!r.ok) throw new Error('HTTP ' + r.status);
                    return r.json();
                })
                .then(function (j) {
                    clearTimeout(to);
                    if (!j || !Array.isArray(j.events)) { reject(new Error('Beklenmeyen yanıt')); return; }
                    resolve(j);
                })
                .catch(function (e) {
                    clearTimeout(to);
                    reject(e);
                });
        });
    }

    function routes(path) {
        var list = [{ name: 'worker', url: CFG.BASE + path }];
        if (CFG.BASE !== ESPN) list.push({ name: 'doğrudan', url: ESPN + path });
        if (net.route) {
            var i = -1;
            for (var k = 0; k < list.length; k++) {
                if (list[k].name === net.route) { i = k; break; }
            }
            if (i > 0) {
                var moved = list.splice(i, 1)[0];
                list.unshift(moved);
            }
        }
        return list;
    }

    function fetchBoard(lg, dates, ttl) {
        var key = lg + '|' + (dates || '');
        var hit = cache.get(key);
        if (hit && Date.now() - hit.t < (ttl == null ? CFG.TTL_MS : ttl)) {
            return Promise.resolve(hit.v);
        }

        var path = '/' + lg + '/scoreboard?limit=200' + (dates ? '&dates=' + dates : '');
        var list = routes(path);

        function tryNext(idx) {
            if (idx >= list.length) {
                net.fail++;
                return Promise.reject(new Error('Bağlantı kurulamadı'));
            }
            var r = list[idx];
            return getJSON(r.url).then(function (j) {
                net.route = r.name;
                net.ok++;
                var v = (j.events || []).map(function (e) { return parseEvent(e, lg); });
                cache.set(key, { t: Date.now(), v: v });
                return v;
            }).catch(function (e) {
                net.errs[r.name] = (e && e.name === 'AbortError') ? 'zaman aşımı' : String((e && e.message) || e);
                return tryNext(idx + 1);
            });
        }
        return tryNext(0);
    }

    function parseEvent(ev, lg) {
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
            var team = c.team || {};
            return {
                id: String(team.id || c.id || ''),
                name: team.shortDisplayName || team.displayName || c.name || '?',
                full: team.displayName || '',
                score: parseInt(c.score, 10) || 0
            };
        }

        return {
            id: String(ev.id),
            lg: lg,
            date: Date.parse(ev.date) || 0,
            state: tp.state || 'pre',
            sname: String(tp.name || ''),
            clock: st.displayClock || '',
            period: st.period || 0,
            home: side(h),
            away: side(a),
            details: comp.details || [],
            venue: ((comp.venue || {}).fullName) || ''
        };
    }

    function fetchMany(lgs, dates) {
        return Promise.allSettled(lgs.map(function (l) { return fetchBoard(l, dates); }))
            .then(function (res) {
                var ok = res.filter(function (r) { return r.status === 'fulfilled'; });
                if (!ok.length) throw new Error('Skor servisine ulaşılamadı');
                var m = new Map();
                ok.forEach(function (r) {
                    r.value.forEach(function (e) { m.set(e.lg + e.id, e); });
                });
                return Array.from(m.values());
            });
    }

    function fetchRange(lgs, from, to) {
        return fetchMany(lgs, ymd(from) + '-' + ymd(to)).catch(function () {
            var days = [];
            for (var d = new Date(from); d <= to; d = addDays(d, 1)) days.push(ymd(d));
            return Promise.allSettled(days.map(function (x) { return fetchMany(lgs, x); }))
                .then(function (parts) {
                    var ok = parts.filter(function (p) { return p.status === 'fulfilled'; });
                    if (!ok.length) throw new Error('Skor servisine ulaşılamadı');
                    var m = new Map();
                    ok.forEach(function (p) {
                        p.value.forEach(function (e) { m.set(e.lg + e.id, e); });
                    });
                    return Array.from(m.values());
                });
        });
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
            return '🔴 ' + (e.clock || 'Canlı');
        }
        return '✅ Maç sonu';
    }

    function line(e) {
        var sc = (e.state === 'pre' || special(e)) ? ' - ' : ' ' + e.home.score + '-' + e.away.score + ' ';
        return statusTxt(e) + ' &nbsp;<strong>' + esc(e.home.name) + sc + esc(e.away.name) + '</strong>';
    }

    function groupHtml(title, events) {
        var by = {};
        events.forEach(function (e) {
            if (!by[e.lg]) by[e.lg] = [];
            by[e.lg].push(e);
        });
        var h = title + '<br>';
        ALL.forEach(function (l) {
            if (!by[l]) return;
            h += '<br><strong>🏆 ' + LEAGUES[l] + '</strong><br>' +
                by[l].sort(function (a, b) { return a.date - b.date; }).map(line).join('<br>') + '<br>';
        });
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

    function cmdLive() {
        say('⏳ Canlı maçlar aranıyor…');
        return fetchMany(ALL).then(function (evs) {
            var live = evs.filter(function (e) { return e.state === 'in'; });
            if (live.length) {
                say(groupHtml('🔴 <strong>CANLI MAÇLAR</strong> (' + live.length + ')', live));
                return;
            }
            var next = evs.filter(function (e) { return e.state === 'pre' && e.date > Date.now(); })
                .sort(function (a, b) { return a.date - b.date; }).slice(0, 5);
            say('😴 Şu an canlı maç yok.' + (next.length ? '<br><br><strong>Sıradakiler:</strong><br>' +
                next.map(function (e) {
                    return fmtDay(e.date) + ' ' + fmtTime(e.date) + ' — <strong>' +
                        esc(e.home.name) + ' - ' + esc(e.away.name) + '</strong> <span style="opacity:.6">(' +
                        LEAGUES[e.lg] + ')</span>';
                }).join('<br>') : ''));
        }).catch(function (e) {
            say('⚠️ ' + esc(e.message) + '. Sorunu görmek için <strong>/spor test</strong> yaz.');
        });
    }

    function cmdToday() {
        say('⏳ Bugünün maçları getiriliyor…');
        var now = new Date();
        return fetchMany(ALL, ymd(now)).then(function (list) {
            var evs = list.filter(function (e) { return sameDay(e.date, now); });
            if (!evs.length) {
                say('📅 Bugün Süper Lig / Avrupa futbolunda maç görünmüyor.');
                return;
            }
            say(groupHtml('📅 <strong>BUGÜNÜN MAÇLARI</strong> — ' + fmtDay(now) + ' (' + evs.length + ')', evs));
        }).catch(function (e) {
            say('⚠️ ' + esc(e.message) + '. Sorunu görmek için <strong>/spor test</strong> yaz.');
        });
    }

    function cmdScore(q) {
        if (!q) {
            say('Kullanım: /skor takım adı (örn: /skor galatasaray, /skor fb)');
            return Promise.resolve();
        }
        say('⏳ "' + esc(q) + '" aranıyor…');
        var now = new Date();
        return fetchRange(ALL, addDays(now, -3), addDays(now, 7)).then(function (list) {
            var evs = list.filter(function (e) { return matchTeam(e, q); });
            if (!evs.length) {
                say('🤷 "' + esc(q) + '" için yakın tarihli maç bulunamadı. Takım adını (örn. galatasaray, fb, real madrid) dene.');
                return;
            }
            var live = evs.filter(function (e) { return e.state === 'in'; });
            var today = evs.filter(function (e) { return sameDay(e.date, now); });
            var past = evs.filter(function (e) { return e.state === 'post'; }).sort(function (a, b) { return b.date - a.date; });
            var fut = evs.filter(function (e) { return e.state === 'pre'; }).sort(function (a, b) { return a.date - b.date; });
            var main = live[0] || today[0] || past[0] || fut[0];
            var extra = (main === fut[0] || main.state === 'pre') ? null : fut[0];

            var h = '⚽ <strong>' + esc(main.home.name) + ' ' +
                (main.state === 'pre' ? '-' : main.home.score + '-' + main.away.score) + ' ' +
                esc(main.away.name) + '</strong><br>' +
                statusTxt(main) + ' • ' + fmtDay(main.date) +
                (main.state === 'pre' ? ' ' + fmtTime(main.date) : '') +
                ' • <span style="opacity:.7">' + LEAGUES[main.lg] + '</span>';
            var inc = incidents(main);
            if (inc) h += '<br>' + inc;
            if (extra) {
                h += '<br><br>⏭️ Sıradaki: ' + fmtDay(extra.date) + ' ' + fmtTime(extra.date) +
                    ' — ' + esc(extra.home.name) + ' - ' + esc(extra.away.name);
            }
            say(h);
        }).catch(function (e) {
            say('⚠️ ' + esc(e.message) + '. Sorunu görmek için <strong>/spor test</strong> yaz.');
        });
    }

    function cmdTest() {
        var ok = '✅';
        var no = '❌';
        say('🔧 <strong>Spor botu testi</strong> (v' + VERSION + ') çalışıyor…');
        var rows = [];
        rows.push(ok + ' spor_bot.js yüklendi');
        rows.push((typeof window.addSystemMessage === 'function' ? ok : no) + ' sohbete yazma');
        rows.push((logged() ? ok : no) + ' giriş yapılmış');

        cache.delete('tur.1|');
        return fetchBoard('tur.1', null, 0).then(function (ev) {
            rows.push(ok + ' Worker üzerinden Süper Lig: ' + ev.length + ' maç okundu (yol: ' + esc(net.route) + ')');
            Object.keys(net.errs).forEach(function (k) {
                rows.push('&nbsp;&nbsp;↳ ' + esc(k) + ': ' + esc(net.errs[k]));
            });
            rows.push('🔔 Bildirimler: ' + (prefs.alerts ? 'açık' : 'kapalı') +
                ' • takip: ' + (prefs.teams.length ? prefs.teams.map(esc).join(', ') : 'yok'));
            say(rows.join('<br>'));
        }).catch(function (e) {
            rows.push(no + ' Worker\'a ulaşılamadı — ' + esc(String(e.message || e)));
            Object.keys(net.errs).forEach(function (k) {
                rows.push('&nbsp;&nbsp;↳ ' + esc(k) + ': ' + esc(net.errs[k]));
            });
            rows.push('💡 Worker adresi: <strong>' + esc(WORKER_URL) + '</strong>');
            say(rows.join('<br>'));
        });
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
            say('🔔 Canlı spor bildirimleri açıldı: Süper Lig + Avrupa kupaları' +
                (prefs.teams.length ? ' + takip ettiğin takımlar' : '') + '.');
            return;
        }

        if (sub === 'takip' && rest) {
            var t = norm(ALIAS[norm(rest)] || rest);
            if (t && prefs.teams.indexOf(t) === -1) prefs.teams.push(t);
            savePrefs();
            say('⭐ Takip: <strong>' + esc(t) + '</strong> — bu takımın gol/maç bildirimlerini alacaksın.');
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

        say('⚽ <strong>SPOR BOTU</strong> — Süper Lig + Avrupa futbolu<br>' +
            '• /canli — şu an oynanan maçlar<br>' +
            '• /bugun — bugünün maç programı<br>' +
            '• /skor takım — örn. /skor galatasaray, /skor fb<br>' +
            '• /spor ac | kapat — canlı bildirimler (şu an: ' + (prefs.alerts ? 'AÇIK' : 'KAPALI') + ')<br>' +
            '• /spor takip takım | takipsil takım | liste<br>' +
            '• /spor test — çalışmıyorsa tanılama<br>' +
            '<span style="opacity:.6">Veriler ESPN\'den Cloudflare Worker üzerinden çekilir.</span>');
    }

    function toast(html, ms) {
        try {
            if (!document.getElementById('sporToastCss')) {
                var st = document.createElement('style');
                st.id = 'sporToastCss';
                st.textContent =
                    '#sporToasts{position:fixed;top:calc(var(--hdr-h,56px) + 8px);right:10px;z-index:3950;display:flex;flex-direction:column;gap:8px;width:min(340px,calc(100vw - 20px));pointer-events:none}' +
                    '.spor-toast{pointer-events:auto;background:#1b1b1b;border:1px solid #333;border-left:4px solid #2ecc71;border-radius:12px;padding:10px 12px;color:#f1f1f1;font-size:13.5px;line-height:1.45;box-shadow:0 8px 28px rgba(0,0,0,.6);animation:sporIn .25s ease;cursor:pointer}' +
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
        if (!msgs.length || !logged()) return;
        if (msgs.length > 6) {
            say(msgs.slice(0, 6).join('<br>') + '<br>… ve ' + (msgs.length - 6) + ' gelişme daha (/canli)');
            toast(msgs[0] + '<br><span style="opacity:.6">+' + (msgs.length - 1) + ' gelişme</span>');
            return;
        }
        msgs.forEach(function (m) {
            say(m);
            toast(m);
        });
    }

    var snap = {};
    var ready = {};
    var meta = {};

    function watched(e) {
        if (ALERT.indexOf(e.lg) !== -1) return true;
        return prefs.teams.some(function (t) { return matchTeam(e, t); });
    }

    function detect(e, out, baseline) {
        var prev = snap[e.id];
        snap[e.id] = {
            state: e.state,
            sname: e.sname,
            hs: e.home.score,
            as: e.away.score,
            red: reds(e),
            ts: Date.now()
        };
        if (!baseline || !prev || !watched(e)) return;

        var sc = '<strong>' + esc(e.home.name) + ' ' + e.home.score + '-' + e.away.score + ' ' + esc(e.away.name) + '</strong>';
        var lgName = ' <span style="opacity:.6">(' + LEAGUES[e.lg] + ')</span>';

        if (prev.state === 'pre' && e.state === 'in') {
            out.push('🟢 <strong>Maç başladı:</strong> ' + esc(e.home.name) + ' - ' + esc(e.away.name) + lgName);
        }

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

        if (/HALFTIME/.test(e.sname) && !/HALFTIME/.test(prev.sname)) {
            out.push('⏸️ <strong>Devre arası:</strong> ' + sc + lgName);
        }

        if (prev.state === 'in' && e.state === 'post') {
            out.push('🏁 <strong>Maç bitti:</strong> ' + sc + lgName);
        }
    }

    function poll(lg) {
        return fetchBoard(lg, null, 5000).then(function (evs) {
            var out = [];
            evs.forEach(function (e) { detect(e, out, !!ready[lg]); });
            ready[lg] = true;
            var upcoming = evs.filter(function (e) { return e.state === 'pre' && e.date > Date.now(); })
                .map(function (e) { return e.date; }).sort(function (a, b) { return a - b; })[0];
            meta[lg] = {
                live: evs.some(function (e) { return e.state === 'in'; }),
                next: upcoming || 0,
                t: Date.now()
            };
            if (prefs.alerts) announce(out);
        });
    }

    function due(lg) {
        var m = meta[lg];
        if (!m) return true;
        var iv = m.live ? CFG.LIVE_MS : (m.next && m.next - Date.now() < 15 * 60000 ? CFG.SOON_MS : CFG.IDLE_MS);
        return Date.now() - m.t >= iv;
    }

    var busy = false;
    function tick() {
        if (busy || !logged() || document.hidden || !prefs.alerts) return;
        busy = true;
        var list = prefs.teams.length ? ALL : ALERT;
        var toPoll = list.filter(due);
        Promise.allSettled(toPoll.map(poll)).then(
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

    var COMMANDS = ['canli', 'canlı', 'bugun', 'bugün', 'skor', 'spor'];

    function isCommand(text) {
        if (!text || text[0] !== '/') return false;
        var cmd = text.slice(1).split(/\s+/)[0].toLowerCase();
        return COMMANDS.indexOf(cmd) !== -1;
    }

    function handleCommand(text) {
        var parts = text.slice(1).split(/\s+/);
        var cmd = parts[0].toLowerCase();
        var args = parts.slice(1);

        if (cmd === 'canli' || cmd === 'canlı') return cmdLive();
        if (cmd === 'bugun' || cmd === 'bugün') return cmdToday();
        if (cmd === 'skor') return cmdScore(args.join(' '));
        if (cmd === 'spor') return cmdSpor(args);
    }

    function registry() {
        var R = window.CMD_REGISTRY;
        if (!Array.isArray(R)) return;
        if (R.some(function (c) { return c[0] === 'canli'; })) return;
        R.push(
            ['canli', '', 'Şu an oynanan Süper Lig / Avrupa maçları', 'all', 'spor botu'],
            ['bugun', '', 'Bugünün maç programı', 'all', 'spor botu'],
            ['skor', 'takım', 'Takımın canlı/son/sıradaki maçı', 'all', 'spor botu'],
            ['spor', '[ac|kapat|takip takım]', 'Spor botu yardımı', 'all', 'spor botu']
        );
    }

    var hello = false;
    setInterval(function () {
        registry();
        if (!hello && logged()) {
            hello = true;
            try { console.info('[spor_bot] v' + VERSION + ' hazır'); } catch (e) {}
            say('⚽ Spor botu hazır — <strong>/canli</strong> • <strong>/bugun</strong> • <strong>/skor takım</strong> • /spor');
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
        net: net,
        _cache: cache,
        _parse: parseEvent,
        _detect: detect,
        _match: matchTeam,
        _snap: snap,
        _prefs: prefs,
        _savePrefs: savePrefs
    };

    window.__sporBotReady = true;
})();
