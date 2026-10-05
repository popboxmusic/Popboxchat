/* ============================================================
   spor_bot.js — CETCETY Spor Botu v3.0
   ------------------------------------------------------------
   • Firebase'e HİÇBİR ŞEY yazmaz / okumaz (limiti yemez).
   • Skorları Cloudflare Worker üzerinden çeker (CORS yok).
   • Komutlar: /canli  /bugun  /skor <takım>  /spor
   • Canlı bildirim: gol, VAR iptali, kırmızı kart, başlama,
     devre arası, bitiş → sohbette mesaj + açılır bildirim.
   • Kurulum: HTML'de <script src="spor_bot.js"></script> yeterli.
   • Çalışmıyorsa sohbete /spor test yaz.
   ============================================================ */
(function () {
    'use strict';
    if (window.__sporBot) return; window.__sporBot = true;

    // ▼▼▼ Cloudflare Worker adresi — DJ botu için kullandığın worker ▼▼▼
    const WORKER_URL = 'https://spor-worker.kyazar07.workers.dev/';
    // ▲▲▲ -------------------------------------------------------- ▲▲▲

    const VERSION = '3.0';
    const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/soccer';
    const CFG = Object.assign({
        BASE: WORKER_URL ? WORKER_URL.replace(/\/+$/, '') + '/soccer' : ESPN,
        FALLBACKS: [],
        LIVE_MS: 30000,
        SOON_MS: 60000,
        IDLE_MS: 300000,
        TTL_MS: 15000,
        TOAST_MS: 9000
    }, window.SPOR_CONFIG || {});

    const LEAGUES = {
        'tur.1': 'Süper Lig', 'uefa.champions': 'Şampiyonlar Ligi',
        'uefa.europa': 'Avrupa Ligi', 'uefa.europa.conf': 'Konferans Ligi',
        'eng.1': 'Premier Lig', 'esp.1': 'La Liga', 'ger.1': 'Bundesliga',
        'ita.1': 'Serie A', 'fra.1': 'Ligue 1'
    };
    const ALL = Object.keys(LEAGUES);
    const ALERT = ['tur.1', 'uefa.champions', 'uefa.europa', 'uefa.europa.conf'];
    const ALIAS = {
        gs: 'galatasaray', cimbom: 'galatasaray', fb: 'fenerbahce',
        bjk: 'besiktas', ts: 'trabzonspor', bsk: 'basaksehir',
        barca: 'barcelona', real: 'real madrid', city: 'manchester city',
        united: 'manchester united', psg: 'paris saint germain',
        atletico: 'atletico madrid', inter: 'inter', milan: 'ac milan'
    };

    /* ---------- yardımcılar ---------- */
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
    const norm = s => String(s || '').toLocaleLowerCase('tr')
        .replace(/ı/g, 'i').normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9 ]+/g, ' ')
        .replace(/\s+/g, ' ').trim();
    const pad = n => String(n).padStart(2, '0');
    const ymd = d => d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());
    const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
    const fmtTime = ts => new Date(ts).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const fmtDay = ts => new Date(ts).toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' });
    const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
    const logged = () => { try { return typeof currentUser !== 'undefined' && !!currentUser; } catch (_) { return false; } };
    const say = html => { try { if (typeof window.addSystemMessage === 'function') window.addSystemMessage(html); } catch (_) {} };

    /* ---------- ayarlar (yalnız bu cihazda) ---------- */
    const PK = 'cety_spor_prefs';
    let prefs = { alerts: true, teams: [] };
    try { prefs = Object.assign(prefs, JSON.parse(localStorage.getItem(PK) || '{}')); } catch (_) {}
    const savePrefs = () => { try { localStorage.setItem(PK, JSON.stringify(prefs)); } catch (_) {} };

    /* ---------- veri çekme ---------- */
    const cache = new Map();
    const net = { route: null, errs: {}, ok: 0, fail: 0 };

    async function getJSON(url, ms) {
        const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const to = setTimeout(() => ctl && ctl.abort(), ms || 9000);
        try {
            const r = await fetch(url, { signal: ctl ? ctl.signal : undefined });
            if (!r.ok) throw new Error('HTTP ' + r.status);
            const j = await r.json();
            if (!j || !Array.isArray(j.events)) throw new Error('Beklenmeyen yanıt');
            return j;
        } finally { clearTimeout(to); }
    }

    function routes(path) {
        const list = [{ name: 'worker', url: CFG.BASE + path }];
        if (CFG.BASE !== ESPN) list.push({ name: 'doğrudan', url: ESPN + path });
        if (net.route) {
            const i = list.findIndex(r => r.name === net.route);
            if (i > 0) list.unshift(list.splice(i, 1)[0]);
        }
        return list;
    }

    async function fetchBoard(lg, dates, ttl) {
        const key = lg + '|' + (dates || '');
        const hit = cache.get(key);
        if (hit && Date.now() - hit.t < (ttl == null ? CFG.TTL_MS : ttl)) return hit.v;

        const path = '/' + lg + '/scoreboard?limit=200' + (dates ? '&dates=' + dates : '');
        let last = null;
        for (const r of routes(path)) {
            try {
                const j = await getJSON(r.url);
                net.route = r.name; net.ok++;
                const v = (j.events || []).map(e => parseEvent(e, lg));
                cache.set(key, { t: Date.now(), v });
                return v;
            } catch (e) {
                last = e;
                net.errs[r.name] = (e && e.name === 'AbortError') ? 'zaman aşımı' : String((e && e.message) || e);
            }
        }
        net.fail++;
        throw last || new Error('Bağlantı kurulamadı');
    }

    function parseEvent(ev, lg) {
        const comp = (ev.competitions || [])[0] || {};
        const cs = comp.competitors || [];
        const h = cs.find(c => c.homeAway === 'home') || cs[0] || {};
        const a = cs.find(c => c.homeAway === 'away') || cs[1] || {};
        const st = ev.status || comp.status || {};
        const tp = st.type || {};
        const side = c => ({
            id: String((c.team || {}).id || c.id || ''),
            name: (c.team || {}).shortDisplayName || (c.team || {}).displayName || c.name || '?',
            full: (c.team || {}).displayName || '',
            score: parseInt(c.score, 10) || 0
        });
        return {
            id: String(ev.id), lg: lg, date: Date.parse(ev.date) || 0,
            state: tp.state || 'pre', sname: String(tp.name || ''),
            clock: st.displayClock || '', period: st.period || 0,
            home: side(h), away: side(a),
            details: comp.details || [],
            venue: ((comp.venue || {}).fullName) || ''
        };
    }

    async function fetchRange(lgs, from, to) {
        try { return await fetchMany(lgs, ymd(from) + '-' + ymd(to)); }
        catch (_) {
            const days = [];
            for (let d = new Date(from); d <= to; d = addDays(d, 1)) days.push(ymd(d));
            const parts = await Promise.allSettled(days.map(x => fetchMany(lgs, x)));
            const ok = parts.filter(p => p.status === 'fulfilled');
            if (!ok.length) throw new Error('Skor servisine ulaşılamadı');
            return dedupe(ok.flatMap(p => p.value));
        }
    }
    const dedupe = list => { const m = new Map(); list.forEach(e => m.set(e.lg + e.id, e)); return [...m.values()]; };

    async function fetchMany(lgs, dates) {
        const res = await Promise.allSettled(lgs.map(l => fetchBoard(l, dates)));
        const ok = res.filter(r => r.status === 'fulfilled');
        if (!ok.length) throw new Error('Skor servisine ulaşılamadı');
        return dedupe(ok.flatMap(r => r.value));
    }

    /* ---------- gösterim ---------- */
    const special = e => /POSTPONED|CANCEL|ABANDON/.test(e.sname)
        ? (/POSTPONED/.test(e.sname) ? '⏸️ Ertelendi' : '🚫 İptal')
        : (/DELAY|SUSPEND/.test(e.sname) ? '⏳ Gecikti' : '');

    function statusTxt(e) {
        const sp = special(e); if (sp) return sp;
        if (e.state === 'pre') return '🕒 ' + fmtTime(e.date);
        if (e.state === 'in') {
            if (/HALFTIME/.test(e.sname)) return '⏸️ Devre arası';
            if (/SHOOTOUT|PEN/.test(e.sname)) return '🔴 Penaltılar';
            return '🔴 ' + (e.clock || 'Canlı');
        }
        return '✅ Maç sonu';
    }

    function line(e) {
        const sc = e.state === 'pre' || special(e) ? ' - ' : ' ' + e.home.score + '-' + e.away.score + ' ';
        return statusTxt(e) + ' &nbsp;<strong>' + esc(e.home.name) + sc + esc(e.away.name) + '</strong>';
    }

    function groupHtml(title, events) {
        const by = {};
        events.forEach(e => (by[e.lg] = by[e.lg] || []).push(e));
        let h = title + '<br>';
        ALL.filter(l => by[l]).forEach(l => {
            h += '<br><strong>🏆 ' + LEAGUES[l] + '</strong><br>' +
                by[l].sort((a, b) => a.date - b.date).map(line).join('<br>') + '<br>';
        });
        return h;
    }

    function incidents(e) {
        const out = [];
        (e.details || []).forEach(d => {
            const who = ((d.athletesInvolved || [])[0] || {}).displayName ||
                        ((d.athletesInvolved || [])[0] || {}).shortName || '';
            const min = (d.clock || {}).displayValue || '';
            const team = String((d.team || {}).id || '') === e.home.id ? e.home.name :
                         String((d.team || {}).id || '') === e.away.id ? e.away.name : '';
            if (d.scoringPlay) out.push(['⚽', min, who, team, d.ownGoal ? ' (kk)' : d.penaltyKick ? ' (pen)' : '']);
            else if (d.redCard) out.push(['🟥', min, who, team, '']);
        });
        return out.map(x => x[0] + ' ' + esc(x[1]) + ' ' + esc(x[2]) +
            (x[3] ? ' <span style="opacity:.6">(' + esc(x[3]) + ')</span>' : '') + x[4]).join('<br>');
    }

    const reds = e => (e.details || []).filter(d => d.redCard).length;

    /* ---------- takım eşleştirme ---------- */
    function matchTeam(e, q) {
        const n = norm(ALIAS[norm(q)] || q);
        if (!n) return false;
        return [norm(e.home.name), norm(e.home.full), norm(e.away.name), norm(e.away.full)]
            .some(t => t && (t.includes(n) || (n.includes(t) && t.length > 3)));
    }

    /* ---------- komutlar ---------- */
    async function cmdLive() {
        say('⏳ Canlı maçlar aranıyor…');
        try {
            const evs = await fetchMany(ALL);
            const live = evs.filter(e => e.state === 'in');
            if (live.length) { say(groupHtml('🔴 <strong>CANLI MAÇLAR</strong> (' + live.length + ')', live)); return; }
            const next = evs.filter(e => e.state === 'pre' && e.date > Date.now())
                .sort((a, b) => a.date - b.date).slice(0, 5);
            say('😴 Şu an canlı maç yok.' + (next.length ? '<br><br><strong>Sıradakiler:</strong><br>' +
                next.map(e => fmtDay(e.date) + ' ' + fmtTime(e.date) + ' — <strong>' +
                    esc(e.home.name) + ' - ' + esc(e.away.name) + '</strong> <span style="opacity:.6">(' +
                    LEAGUES[e.lg] + ')</span>').join('<br>') : ''));
        } catch (e) {
            say('⚠️ ' + esc(e.message) + '. Sorunu görmek için <strong>/spor test</strong> yaz.');
        }
    }

    async function cmdToday() {
        say('⏳ Bugünün maçları getiriliyor…');
        try {
            const now = new Date();
            const evs = (await fetchMany(ALL, ymd(now))).filter(e => sameDay(e.date, now));
            if (!evs.length) { say('📅 Bugün Süper Lig / Avrupa futbolunda maç görünmüyor.'); return; }
            say(groupHtml('📅 <strong>BUGÜNÜN MAÇLARI</strong> — ' + fmtDay(now) + ' (' + evs.length + ')', evs));
        } catch (e) {
            say('⚠️ ' + esc(e.message) + '. Sorunu görmek için <strong>/spor test</strong> yaz.');
        }
    }

    async function cmdScore(q) {
        say('⏳ "' + esc(q) + '" aranıyor…');
        try {
            const now = new Date();
            const evs = (await fetchRange(ALL, addDays(now, -3), addDays(now, 7))).filter(e => matchTeam(e, q));
            if (!evs.length) {
                say('🤷 "' + esc(q) + '" için yakın tarihli maç bulunamadı. Takım adını (örn. galatasaray, fb, real madrid) dene.');
                return;
            }
            const live = evs.filter(e => e.state === 'in');
            const today = evs.filter(e => sameDay(e.date, now));
            const past = evs.filter(e => e.state === 'post').sort((a, b) => b.date - a.date);
            const fut = evs.filter(e => e.state === 'pre').sort((a, b) => a.date - b.date);
            const main = live[0] || today[0] || past[0] || fut[0];
            const extra = (main === fut[0] || main.state === 'pre') ? null : fut[0];

            let h = '⚽ <strong>' + esc(main.home.name) + ' ' +
                (main.state === 'pre' ? '-' : main.home.score + '-' + main.away.score) + ' ' +
                esc(main.away.name) + '</strong><br>' +
                statusTxt(main) + ' • ' + fmtDay(main.date) +
                (main.state === 'pre' ? ' ' + fmtTime(main.date) : '') +
                ' • <span style="opacity:.7">' + LEAGUES[main.lg] + '</span>';
            const inc = incidents(main);
            if (inc) h += '<br>' + inc;
            if (extra) h += '<br><br>⏭️ Sıradaki: ' + fmtDay(extra.date) + ' ' + fmtTime(extra.date) +
                ' — ' + esc(extra.home.name) + ' - ' + esc(extra.away.name);
            say(h);
        } catch (e) {
            say('⚠️ ' + esc(e.message) + '. Sorunu görmek için <strong>/spor test</strong> yaz.');
        }
    }

    async function cmdTest() {
        const ok = '✅', no = '❌';
        say('🔧 <strong>Spor botu testi</strong> (v' + VERSION + ') çalışıyor…');
        const rows = [];
        rows.push(ok + ' spor_bot.js yüklendi');
        rows.push((window.sendMessage && window.sendMessage.__spor ? ok : no) + ' komut kancası');
        rows.push((typeof window.addSystemMessage === 'function' ? ok : no) + ' sohbete yazma');
        rows.push((logged() ? ok : no) + ' giriş yapılmış');

        let n = null;
        try {
            cache.delete('tur.1|');
            const ev = await fetchBoard('tur.1', null, 0);
            n = ev.length;
            rows.push(ok + ' Worker üzerinden Süper Lig: ' + n + ' maç okundu (yol: ' + esc(net.route) + ')');
        } catch (e) {
            rows.push(no + ' Worker\'a ulaşılamadı — ' + esc(String(e.message || e)));
        }

        Object.keys(net.errs).forEach(k => rows.push('&nbsp;&nbsp;↳ ' + esc(k) + ': ' + esc(net.errs[k])));
        if (n === null) {
            rows.push('💡 Worker adresi: <strong>' + esc(WORKER_URL) + '</strong><br>' +
                'Bu adresi tarayıcıda aç: <strong>' + esc(WORKER_URL) + '/soccer/tur.1/scoreboard</strong> — JSON görmelisin.');
        }
        rows.push('🔔 Bildirimler: ' + (prefs.alerts ? 'açık' : 'kapalı') +
            ' • takip: ' + (prefs.teams.length ? prefs.teams.map(esc).join(', ') : 'yok'));
        say(rows.join('<br>'));
    }

    function cmdSpor(args) {
        const sub = (args[0] || '').toLowerCase(), rest = args.slice(1).join(' ');
        if (sub === 'test') { cmdTest(); return; }
        if (sub === 'kapat') { prefs.alerts = false; savePrefs(); say('🔕 Canlı spor bildirimleri kapatıldı. (/spor ac ile açabilirsin)'); return; }
        if (sub === 'ac' || sub === 'aç') {
            prefs.alerts = true; savePrefs();
            say('🔔 Canlı spor bildirimleri açıldı: Süper Lig + Avrupa kupaları' +
                (prefs.teams.length ? ' + takip ettiğin takımlar' : '') + '.');
            return;
        }
        if (sub === 'takip' && rest) {
            const t = norm(ALIAS[norm(rest)] || rest);
            if (t && !prefs.teams.includes(t)) prefs.teams.push(t);
            savePrefs();
            say('⭐ Takip: <strong>' + esc(t) + '</strong> — bu takımın gol/maç bildirimlerini alacaksın.');
            return;
        }
        if ((sub === 'takipsil' || sub === 'sil') && rest) {
            const t = norm(ALIAS[norm(rest)] || rest);
            prefs.teams = prefs.teams.filter(x => x !== t);
            savePrefs();
            say('🗑️ Takipten çıkarıldı: ' + esc(t));
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

    /* ---------- açılır bildirim ---------- */
    function toast(html, ms) {
        try {
            if (!document.getElementById('sporToastCss')) {
                const st = document.createElement('style');
                st.id = 'sporToastCss';
                st.textContent =
                    '#sporToasts{position:fixed;top:calc(var(--hdr-h,56px) + 8px);right:10px;z-index:3950;display:flex;flex-direction:column;gap:8px;width:min(340px,calc(100vw - 20px));pointer-events:none}' +
                    '.spor-toast{pointer-events:auto;background:#1b1b1b;border:1px solid #333;border-left:4px solid #2ecc71;border-radius:12px;padding:10px 12px;color:#f1f1f1;font-size:13.5px;line-height:1.45;box-shadow:0 8px 28px rgba(0,0,0,.6);animation:sporIn .25s ease;cursor:pointer}' +
                    '@keyframes sporIn{from{transform:translateX(30px);opacity:0}to{transform:none;opacity:1}}';
                document.head.appendChild(st);
            }
            let box = document.getElementById('sporToasts');
            if (!box) { box = document.createElement('div'); box.id = 'sporToasts'; document.body.appendChild(box); }
            const t = document.createElement('div');
            t.className = 'spor-toast'; t.innerHTML = html;
            t.onclick = () => t.remove();
            box.appendChild(t);
            while (box.children.length > 4) box.firstChild.remove();
            setTimeout(() => t.remove(), ms || CFG.TOAST_MS);
        } catch (_) {}
    }

    function announce(msgs) {
        if (!msgs.length || !logged()) return;
        if (msgs.length > 6) {
            say(msgs.slice(0, 6).join('<br>') + '<br>… ve ' + (msgs.length - 6) + ' gelişme daha (/canli)');
            toast(msgs[0] + '<br><span style="opacity:.6">+' + (msgs.length - 1) + ' gelişme</span>');
            return;
        }
        msgs.forEach(m => { say(m); toast(m); });
    }

    /* ---------- canlı takip ---------- */
    const snap = {}, ready = {}, meta = {};
    const watched = e => ALERT.includes(e.lg) || prefs.teams.some(t => matchTeam(e, t));

    function detect(e, out, baseline) {
        const prev = snap[e.id];
        snap[e.id] = { state: e.state, sname: e.sname, hs: e.home.score, as: e.away.score, red: reds(e), ts: Date.now() };
        if (!baseline || !prev || !watched(e)) return;
        const sc = '<strong>' + esc(e.home.name) + ' ' + e.home.score + '-' + e.away.score + ' ' + esc(e.away.name) + '</strong>';
        const lgName = ' <span style="opacity:.6">(' + LEAGUES[e.lg] + ')</span>';

        if (prev.state === 'pre' && e.state === 'in') {
            out.push('🟢 <strong>Maç başladı:</strong> ' + esc(e.home.name) + ' - ' + esc(e.away.name) + lgName);
        }
        const goalsNow = e.home.score + e.away.score, goalsPrev = prev.hs + prev.as;
        if (goalsNow > goalsPrev && e.state !== 'pre') {
            const sd = (e.details || []).filter(d => d.scoringPlay);
            const last = sd[sd.length - 1];
            const who = last && ((last.athletesInvolved || [])[0] || {}).displayName;
            const min = (last && (last.clock || {}).displayValue) || e.clock;
            const scorer = e.home.score > prev.hs ? e.home.name : e.away.name;
            out.push('⚽ <strong>GOL!</strong> ' + esc(scorer) + ' — ' + sc + ' • ' + esc(min || '') +
                (who && sd.length === goalsNow ? ' ' + esc(who) + (last.ownGoal ? ' (kk)' : last.penaltyKick ? ' (pen)' : '') : '') + lgName);
        } else if (goalsNow < goalsPrev) {
            out.push('❌ <strong>Gol iptal (VAR)</strong> — ' + sc + lgName);
        }
        if (reds(e) > prev.red) {
            const rd = (e.details || []).filter(d => d.redCard).pop() || {};
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

    async function poll(lg) {
        const evs = await fetchBoard(lg, null, 5000), out = [];
        evs.forEach(e => detect(e, out, !!ready[lg]));
        ready[lg] = true;
        const upcoming = evs.filter(e => e.state === 'pre' && e.date > Date.now())
            .map(e => e.date).sort((a, b) => a - b)[0];
        meta[lg] = { live: evs.some(e => e.state === 'in'), next: upcoming || 0, t: Date.now() };
        if (prefs.alerts) announce(out);
    }

    function due(lg) {
        const m = meta[lg]; if (!m) return true;
        const iv = m.live ? CFG.LIVE_MS : (m.next && m.next - Date.now() < 15 * 60000 ? CFG.SOON_MS : CFG.IDLE_MS);
        return Date.now() - m.t >= iv;
    }

    let busy = false;
    async function tick() {
        if (busy || !logged() || document.hidden || !prefs.alerts) return;
        busy = true;
        try { await Promise.allSettled((prefs.teams.length ? ALL : ALERT).filter(due).map(poll)); }
        finally { busy = false; }
    }
    setInterval(tick, 10000);
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) { Object.keys(meta).forEach(k => { meta[k].t = 0; }); tick(); }
    });

    /* ---------- sendMessage'a bağlan ---------- */
    function handle(cmd, args) {
        if (cmd === 'canli' || cmd === 'canlı') return cmdLive();
        if (cmd === 'bugun' || cmd === 'bugün') return cmdToday();
        if (cmd === 'skor') return cmdScore(args.join(' '));
        if (cmd === 'spor') return cmdSpor(args);
    }

    function hook() {
        if (typeof window.sendMessage !== 'function' || window.sendMessage.__spor) return;
        const orig = window.sendMessage;
        const wrapped = async function () {
            try {
                const inp = document.getElementById('message-input');
                const t = inp ? inp.value.trim() : '';
                if (t[0] === '/') {
                    const parts = t.slice(1).split(/\s+/);
                    const cmd = parts[0].toLowerCase();
                    const args = parts.slice(1);
                    if (cmd === 'canli' || cmd === 'canlı' || cmd === 'bugun' || cmd === 'bugün' || cmd === 'spor' ||
                        (cmd === 'skor' && args.length)) {
                        inp.value = '';
                        try { if (typeof autoResize === 'function') autoResize(inp); } catch (_) {}
                        handle(cmd.replace('ı', 'i').replace('ü', 'u'), args);
                        return;
                    }
                }
            } catch (_) {}
            return orig.apply(this, arguments);
        };
        wrapped.__spor = true;
        window.sendMessage = wrapped;
    }

    function registry() {
        const R = window.CMD_REGISTRY;
        if (!Array.isArray(R) || R.some(c => c[0] === 'canli')) return;
        R.push(
            ['canli', '', 'Şu an oynanan Süper Lig / Avrupa maçları', 'all', 'spor botu'],
            ['bugun', '', 'Bugünün maç programı', 'all', 'spor botu'],
            ['skor', 'takım', 'Takımın canlı/son/sıradaki maçı', 'all', 'spor botu'],
            ['spor', '[ac|kapat|takip takım]', 'Spor botu yardımı', 'all', 'spor botu']
        );
    }

    let hello = false;
    setInterval(() => {
        hook(); registry();
        if (!hello && logged() && window.sendMessage && window.sendMessage.__spor) {
            hello = true;
            try { console.info('[spor_bot] v' + VERSION + ' hazır'); } catch (_) {}
            say('⚽ Spor botu hazır — <strong>/canli</strong> • <strong>/bugun</strong> • <strong>/skor takım</strong> • /spor');
        }
    }, 1000);

    window.SporBot = {
        _cache: cache, version: VERSION, test: cmdTest, net: net,
        live: cmdLive, today: cmdToday, score: cmdScore,
        _parse: parseEvent, _detect: detect, _match: matchTeam, _snap: snap
    };
})();
