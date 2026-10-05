/* ============================================================
   haber_bot.js — CETCETY Haber Botu v1.0
   ------------------------------------------------------------
   • Firebase'e HİÇBİR ŞEY YAZMAZ (limit yemez).
   • Haberleri Cloudflare Worker üzerinden çeker (CORS yok).
   • Her 60 saniyede bir yeni haber kontrolü yapar.
   • Yeni haber bulursa sohbete yazar (system mesaj).
   • Kategoriler: /haber ac <kategori>, /haber kapat
   • Kurulum: HTML'de <script src="haber_bot.js"></script> yeterli.
   • Test: /haber test
   ============================================================ */
(function () {
    'use strict';
    if (window.__haberBot) return;
    window.__haberBot = true;

    // ▼▼▼ Cloudflare Worker adresi ▼▼▼
    const WORKER_URL = 'https://haber-worker.kyazar07.workers.dev';
    // ▲▲▲ ------------------------ ▲▲▲

    const VERSION = '1.0';
    const CHECK_MS = 60000;      // 60 saniyede bir kontrol
    const MAX_CACHE = 300;       // son 300 haber ID'sini hafızada tut
    const INITIAL_BACKFILL = 5;  // ilk açılışta en yeni 5 haberi göster

    const CATEGORIES = {
        'gundem':    '🇹🇷 Gündem',
        'sondakika': '🔴 Son Dakika',
        'dunya':     '🌍 Dünya',
        'ekonomi':   '💰 Ekonomi',
        'teknoloji': '💻 Teknoloji',
        'spor':      '⚽ Spor',
        'bilim':     '🔬 Bilim',
        'saglik':    '🏥 Sağlık',
        'eglence':   '🎬 Eğlence',
        'siyaset':   '🏛️ Siyaset',
        'world_en':  '🌐 World',
        'tech_en':   '💻 Tech'
    };

    /* ---------- ayarlar (sadece bu cihazda) ---------- */
    const PK = 'cety_haber_prefs';
    let prefs = {
        enabled: true,
        categories: ['gundem', 'sondakika', 'dunya'],  // varsayılan
        lastSeenIds: []  // son görülen haber ID'leri (dedupe için)
    };
    try {
        const saved = JSON.parse(localStorage.getItem(PK) || '{}');
        prefs = Object.assign(prefs, saved);
        if (!Array.isArray(prefs.lastSeenIds)) prefs.lastSeenIds = [];
    } catch (_) {}
    const savePrefs = () => {
        try {
            // Sadece son MAX_CACHE kadar ID sakla
            prefs.lastSeenIds = prefs.lastSeenIds.slice(0, MAX_CACHE);
            localStorage.setItem(PK, JSON.stringify(prefs));
        } catch (_) {}
    };

    /* ---------- yardımcılar ---------- */
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
    const fmtTime = ts => new Date(ts).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const fmtAgo = ts => {
        const diff = Math.floor((Date.now() - ts) / 1000);
        if (diff < 60) return diff + ' sn önce';
        if (diff < 3600) return Math.floor(diff / 60) + ' dk önce';
        if (diff < 86400) return Math.floor(diff / 3600) + ' sa önce';
        return Math.floor(diff / 86400) + ' gün önce';
    };
    const logged = () => { try { return typeof currentUser !== 'undefined' && !!currentUser; } catch (_) { return false; } };
    const say = html => { try { if (typeof window.addSystemMessage === 'function') window.addSystemMessage(html); } catch (_) {} };

    /* ---------- veri çekme ---------- */
    async function fetchNews(categories) {
        const url = WORKER_URL.replace(/\/+$/, '') + '/haber?kategori=' + categories.join(',');
        const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const to = setTimeout(() => ctl && ctl.abort(), 12000);
        try {
            const r = await fetch(url, { signal: ctl ? ctl.signal : undefined });
            if (!r.ok) throw new Error('HTTP ' + r.status);
            const j = await r.json();
            if (!j || !Array.isArray(j.items)) throw new Error('Beklenmeyen yanıt');
            return j.items;
        } finally { clearTimeout(to); }
    }

    /* ---------- gösterim ---------- */
    function formatNews(item) {
        const title = esc(item.title);
        const source = item.source ? ' <span style="opacity:.6">— ' + esc(item.source) + '</span>' : '';
        const label = item.label ? ' <span style="opacity:.5">[' + esc(item.label) + ']</span>' : '';
        const ago = ' <span style="opacity:.4; font-size:11px">' + fmtAgo(item.pubTs) + '</span>';
        const link = item.link
            ? '<br><a href="' + esc(item.link) + '" target="_blank" rel="noopener noreferrer" style="color:#3ea6ff">🔗 Habere git</a>'
            : '';
        return '📰 <strong>' + title + '</strong>' + source + label + ago + link;
    }

    /* ---------- haber işleme ---------- */
    async function checkNews(isInitial) {
        if (!logged() || !prefs.enabled || !prefs.categories.length) return;
        try {
            const items = await fetchNews(prefs.categories);
            if (!items.length) return;

            const seenSet = new Set(prefs.lastSeenIds);
            const fresh = items.filter(it => it.id && !seenSet.has(it.id));

            if (isInitial) {
                // İlk açılışta son N haberi göster, geri kalanını "görülmüş" olarak işaretle
                const toShow = fresh.slice(0, INITIAL_BACKFILL);
                if (toShow.length) {
                    showNewsGroup(toShow, '📢 <strong>Haber botu aktif</strong> — son ' + toShow.length + ' haber:');
                } else {
                    say('📢 <strong>Haber botu aktif</strong> — ' + prefs.categories.map(c => CATEGORIES[c] || c).join(', ') + '. Yeni haberler otomatik gelecek.');
                }
                prefs.lastSeenIds = [...new Set([...fresh.map(i => i.id), ...prefs.lastSeenIds])];
            } else if (fresh.length) {
                showNewsGroup(fresh, '🔔 <strong>' + fresh.length + ' yeni haber</strong>');
                prefs.lastSeenIds = [...new Set([...fresh.map(i => i.id), ...prefs.lastSeenIds])];
            }

            savePrefs();
        } catch (e) {
            // Sessiz hata — kullanıcıyı rahatsız etme
            try { console.warn('[haber_bot] fetch hatası:', e && e.message); } catch (_) {}
        }
    }

    function showNewsGroup(items, header) {
        // Grup başlığı
        say(header);
        // En fazla 5 haber göster (spam olmasın)
        items.slice(0, 5).forEach(it => {
            say(formatNews(it));
        });
        if (items.length > 5) {
            say('<span style="opacity:.6">… ve ' + (items.length - 5) + ' haber daha (sonraki turda gelecek)</span>');
        }
    }

    /* ---------- komutlar ---------- */
    async function cmdHaber(args) {
        const sub = (args[0] || '').toLowerCase();

        if (sub === 'test') {
            say('🔧 <strong>Haber botu testi</strong> (v' + VERSION + ')…');
            const rows = [];
            rows.push('✅ haber_bot.js yüklendi');
            rows.push((logged() ? '✅' : '❌') + ' giriş yapılmış');
            rows.push('⚙️ Durum: ' + (prefs.enabled ? 'AÇIK' : 'KAPALI'));
            rows.push('📁 Kategoriler: ' + (prefs.categories.length ? prefs.categories.map(c => CATEGORIES[c] || c).join(', ') : 'YOK'));
            try {
                const items = await fetchNews(prefs.categories.length ? prefs.categories : ['gundem']);
                rows.push('✅ Worker: ' + items.length + ' haber okundu');
                if (items[0]) rows.push('📰 Örnek: <em>' + esc(items[0].title.slice(0, 60)) + '…</em>');
            } catch (e) {
                rows.push('❌ Worker\'a ulaşılamadı — ' + esc(String(e.message || e)));
                rows.push('💡 Worker adresi: <strong>' + esc(WORKER_URL) + '</strong>');
            }
            rows.push('🗂️ Önbellek: ' + prefs.lastSeenIds.length + ' haber ID');
            say(rows.join('<br>'));
            return;
        }

        if (sub === 'kapat') {
            prefs.enabled = false;
            savePrefs();
            say('🔕 Haber botu kapatıldı. Açmak için: <strong>/haber ac</strong>');
            return;
        }

        if (sub === 'ac' || sub === 'aç') {
            prefs.enabled = true;
            savePrefs();
            say('🔔 Haber botu açıldı — ' + prefs.categories.map(c => CATEGORIES[c] || c).join(', '));
            return;
        }

        if (sub === 'kategoriler' || sub === 'kategori') {
            const list = Object.entries(CATEGORIES)
                .map(([k, v]) => '• <code>' + k + '</code> — ' + v)
                .join('<br>');
            say('📁 <strong>Kategoriler:</strong><br>' + list +
                '<br><br>Aktif: ' + prefs.categories.map(c => CATEGORIES[c] || c).join(', ') +
                '<br>Değiştir: <strong>/haber kategoriler gundem,teknoloji,dunya</strong>');
            return;
        }

        if (sub === 'kategoriler' && args[1]) { /* aşağıda */ }

        // /haber kategoriler gundem,teknoloji,dunya
        if (args[0] && CATEGORIES[args[0].toLowerCase()] === undefined && args.join(' ').includes(',')) {
            // args[0] bir kategori değil ve virgül içeriyor → kategori listesi olarak yorumla
        }

        if (sub === 'ayarla' || (args.length >= 2 && args[0] === 'kategoriler')) {
            const list = (args[1] || args.slice(1).join(',')).split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
            const valid = list.filter(k => CATEGORIES[k]);
            const invalid = list.filter(k => !CATEGORIES[k]);
            if (!valid.length) {
                say('❌ Geçerli kategori yok. <strong>/haber kategoriler</strong> yazarak listeyi görebilirsin.');
                return;
            }
            prefs.categories = valid;
            prefs.lastSeenIds = [];  // kategori değişince önbelleği sıfırla
            savePrefs();
            say('✅ Aktif kategoriler: ' + valid.map(c => CATEGORIES[c]).join(', ') +
                (invalid.length ? '<br>⚠️ Geçersiz: ' + invalid.join(', ') : ''));
            return;
        }

        if (sub === 'durum') {
            say('📊 <strong>Haber botu durumu</strong><br>' +
                '• Durum: ' + (prefs.enabled ? '🟢 AÇIK' : '🔴 KAPALI') + '<br>' +
                '• Kategoriler: ' + (prefs.categories.length ? prefs.categories.map(c => CATEGORIES[c]).join(', ') : 'yok') + '<br>' +
                '• Önbellek: ' + prefs.lastSeenIds.length + ' haber<br>' +
                '• Kontrol sıklığı: her ' + (CHECK_MS / 1000) + ' saniye');
            return;
        }

        if (sub === 'temizle') {
            prefs.lastSeenIds = [];
            savePrefs();
            say('🧹 Önbellek temizlendi — sonraki turda tüm haberler yeni sayılacak.');
            return;
        }

        // Yardım
        say('📰 <strong>HABER BOTU</strong> v' + VERSION + '<br>' +
            '• /haber — bu yardım<br>' +
            '• /haber durum — mevcut ayarlar<br>' +
            '• /haber ac | kapat — botu aç/kapat<br>' +
            '• /haber kategoriler — kategori listesi<br>' +
            '• /haber kategoriler gundem,teknoloji,dunya — kategori seç<br>' +
            '• /haber temizle — önbelleği sıfırla (tüm haberler yeniden gösterilir)<br>' +
            '• /haber test — bağlantı testi<br>' +
            '<span style="opacity:.6">Haberler her ' + (CHECK_MS / 1000) + ' saniyede bir otomatik kontrol edilir.</span>');
    }

    /* ---------- döngü ---------- */
    let busy = false;
    let initialDone = false;

    async function tick() {
        if (busy || !logged() || document.hidden || !prefs.enabled) return;
        busy = true;
        try {
            await checkNews(!initialDone);
            initialDone = true;
        } finally { busy = false; }
    }

    setInterval(tick, CHECK_MS);

    // Sayfa tekrar görünür olduğunda hemen kontrol et
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) tick();
    });

    /* ============================================================
       PUBLIC API — ana sendMessage fonksiyonu için
       ============================================================ */
    const COMMANDS = ['haber'];

    function isCommand(text) {
        if (!text || text[0] !== '/') return false;
        const cmd = text.slice(1).split(/\s+/)[0].toLowerCase();
        return COMMANDS.includes(cmd);
    }

    function handleCommand(text) {
        const parts = text.slice(1).split(/\s+/);
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1);
        if (cmd === 'haber') return cmdHaber(args);
    }

    /* ---------- komut kaydı ---------- */
    function registry() {
        const R = window.CMD_REGISTRY;
        if (!Array.isArray(R) || R.some(c => c[0] === 'haber')) return;
        R.push(['haber', '[ac|kapat|durum|kategoriler|test]', 'Haber botu kontrolü', 'all', 'haber botu']);
    }

    let hello = false;
    setInterval(() => {
        registry();
        if (!hello && logged()) {
            hello = true;
            try { console.info('[haber_bot] v' + VERSION + ' hazır'); } catch (_) {}
            say('📰 Haber botu hazır — <strong>/haber</strong> ile ayarları görebilirsin.');
        }
    }, 1500);

    /* ---------- public API ---------- */
    window.HaberBot = {
        version: VERSION,
        isCommand: isCommand,
        handleCommand: handleCommand,
        test: () => cmdHaber(['test']),
        refresh: () => { initialDone = false; return tick(); },
        _prefs: prefs,
        _savePrefs: savePrefs
    };

    window.__haberBotReady = true;
})();