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

    const VERSION = '2.0';
    const HOME_CHANNEL = 'haber';   // bot SADECE bu kanalda yazar / haber çeker
    const CHECK_MS = 60000;      // 60 saniyede bir kontrol
    const MAX_CACHE = 300;       // son 300 haber ID'sini hafızada tut
    const INITIAL_BACKFILL = 5;  // ilk açılışta en yeni 5 haberi göster
    const PER_TICK = 5;          // her kontrolde en fazla kaç haber yazılsın (spam olmasın)
    const MAX_AGE_MS = 3 * 3600 * 1000;  // 3 saatten eski haberler 'yeni' sayılmaz

    const CATEGORIES = {
        'hepsi':     '🗞️ Hepsi (tüm kaynaklar)',
        'sondakika': '🔴 Son Dakika',
        'gundem':    '🇹🇷 Gündem',
        'siyaset':   '🏛️ Siyaset',
        'ekonomi':   '💰 Ekonomi',
        'dunya':     '🌍 Dünya',
        'spor':      '⚽ Spor',
        'teknoloji': '💻 Teknoloji',
        'saglik':    '🏥 Sağlık',
        'magazin':   '🎬 Magazin',
        'yasam':     '🌱 Yaşam',
        'kultur':    '🎭 Kültür-Sanat',
        'egitim':    '📚 Eğitim',
        'kripto':    '🪙 Kripto',
        'yerel':     '📍 Yerel'
    };

    /* ---------- ayarlar (sadece bu cihazda) ---------- */
    const PK = 'cety_haber_prefs';
    let prefs = {
        enabled: true,
        categories: ['sondakika', 'gundem'],  // varsayılan
        sources: [],      // boş = tüm kaynaklar
        lastSeenIds: []  // son görülen haber ID'leri (dedupe için)
    };
    try {
        const saved = JSON.parse(localStorage.getItem(PK) || '{}');
        prefs = Object.assign(prefs, saved);
        if (!Array.isArray(prefs.lastSeenIds)) prefs.lastSeenIds = [];
        if (!Array.isArray(prefs.sources)) prefs.sources = [];
        // eski sürümden kalan geçersiz kategorileri temizle
        prefs.categories = (prefs.categories || []).filter(k => CATEGORIES[k]);
        if (!prefs.categories.length) prefs.categories = ['sondakika', 'gundem'];
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
    // Şu an #haber kanalında mıyız?
    const inHome = () => { try { return typeof currentChannel !== 'undefined' && currentChannel === HOME_CHANNEL; } catch (_) { return false; } };
    // Mesaj sadece #haber kanalındayken yazılır (diğer kanallara asla)
    const say = html => { try { if (inHome() && typeof window.addSystemMessage === 'function') window.addSystemMessage(html); } catch (_) {} };

    /* ---------- veri çekme ---------- */
    async function fetchNews(categories) {
        let url = WORKER_URL.replace(/\/+$/, '') + '/haber?kategori=' + categories.join(',');
        if (prefs.sources && prefs.sources.length) url += '&kaynak=' + prefs.sources.join(',');
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
        if (!logged() || !inHome() || !prefs.enabled || !prefs.categories.length) return;
        try {
            const items = await fetchNews(prefs.categories);
            if (!items.length) return;
            if (!inHome()) return;   // beklerken kanaldan çıkıldıysa haberleri kaçırma, sonra gösterilir

            const seenSet = new Set(prefs.lastSeenIds);
            const unseen = items.filter(it => it.id && !seenSet.has(it.id));
            const now = Date.now();
            const recent = unseen.filter(it => now - it.pubTs < MAX_AGE_MS);
            const stale = unseen.filter(it => now - it.pubTs >= MAX_AGE_MS);
            const mark = list => {
                prefs.lastSeenIds = [...new Set([...list.map(i => i.id), ...prefs.lastSeenIds])];
            };

            if (isInitial) {
                // İlk açılışta en yeni N haberi göster, geri kalanını "görülmüş" say (eski yığın akıtılmasın)
                const toShow = recent.slice(0, INITIAL_BACKFILL);
                if (toShow.length) {
                    showNewsGroup(toShow, '📢 <strong>Haber botu aktif</strong> — son ' + toShow.length + ' haber:', 0);
                } else {
                    say('📢 <strong>Haber botu aktif</strong> — ' + prefs.categories.map(c => CATEGORIES[c] || c).join(', ') + '. Yeni haberler otomatik gelecek.');
                }
                mark(unseen);
            } else {
                // Eski haberleri sessizce işaretle; yeni olanlardan sadece PER_TICK kadarını yaz.
                // Gösterilmeyenler "görülmedi" kalır ve sonraki turda gelir (kaybolmaz).
                mark(stale);
                const toShow = recent.slice(0, PER_TICK);
                if (toShow.length) {
                    showNewsGroup(toShow, '🔔 <strong>' + recent.length + ' yeni haber</strong>', recent.length - toShow.length);
                    mark(toShow);
                }
            }
            savePrefs();
        } catch (e) {
            // Sessiz hata — kullanıcıyı rahatsız etme
            try { console.warn('[haber_bot] fetch hatası:', e && e.message); } catch (_) {}
        }
    }

    function showNewsGroup(items, header, remaining) {
        say(header);
        items.forEach(it => say(formatNews(it)));
        if (remaining > 0) {
            say('<span style="opacity:.6">… ' + remaining + ' haber daha sırada (sonraki turda gelecek)</span>');
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

        if ((sub === 'kategoriler' || sub === 'kategori') && !args[1]) {
            const list = Object.entries(CATEGORIES)
                .map(([k, v]) => '• <code>' + k + '</code> — ' + v)
                .join('<br>');
            say('📁 <strong>Kategoriler:</strong><br>' + list +
                '<br><br>Aktif: ' + prefs.categories.map(c => CATEGORIES[c] || c).join(', ') +
                '<br>Değiştir: <strong>/haber kategoriler gundem,teknoloji,dunya</strong>' +
                '<br>Tüm kaynaklardan: <strong>/haber kategoriler hepsi</strong>');
            return;
        }


        // /haber kategoriler gundem,teknoloji,dunya
        if (args[0] && CATEGORIES[args[0].toLowerCase()] === undefined && args.join(' ').includes(',')) {
            // args[0] bir kategori değil ve virgül içeriyor → kategori listesi olarak yorumla
        }

        if (sub === 'ayarla' || (args.length >= 2 && (args[0] === 'kategoriler' || args[0] === 'kategori'))) {
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

        if (sub === 'kaynak' || sub === 'kaynaklar') {
            let info = null;
            try {
                const r = await fetch(WORKER_URL.replace(/\/+$/, '') + '/');
                info = await r.json();
            } catch (e) {
                say('❌ Kaynak listesi alınamadı — ' + esc(String(e.message || e)));
                return;
            }
            const all = info.sources || {};
            if (args[1]) {
                const wanted = args.slice(1).join(',').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
                if (wanted.includes('hepsi')) {
                    prefs.sources = [];
                    prefs.lastSeenIds = [];
                    savePrefs();
                    say('✅ Tüm kaynaklar açık.');
                    return;
                }
                const valid = wanted.filter(k => all[k]);
                const invalid = wanted.filter(k => !all[k]);
                if (!valid.length) {
                    say('❌ Geçerli kaynak yok. <strong>/haber kaynaklar</strong> yazarak listeyi gör.');
                    return;
                }
                prefs.sources = valid;
                prefs.lastSeenIds = [];
                savePrefs();
                say('✅ Aktif kaynaklar: ' + valid.map(k => all[k]).join(', ') +
                    (invalid.length ? '<br>⚠️ Geçersiz: ' + invalid.join(', ') : ''));
                return;
            }
            const list = Object.entries(all).map(([k, v]) => '<code>' + k + '</code> ' + v).join(' · ');
            say('🗞️ <strong>Kaynaklar:</strong><br>' + list +
                '<br><br>Aktif: ' + (prefs.sources.length ? prefs.sources.map(k => all[k] || k).join(', ') : 'hepsi') +
                '<br>Seç: <strong>/haber kaynak cnnturk,trt,sozcu</strong> · Hepsi: <strong>/haber kaynak hepsi</strong>');
            return;
        }

        if (sub === 'durum') {
            say('📊 <strong>Haber botu durumu</strong><br>' +
                '• Durum: ' + (prefs.enabled ? '🟢 AÇIK' : '🔴 KAPALI') + '<br>' +
                '• Kategoriler: ' + (prefs.categories.length ? prefs.categories.map(c => CATEGORIES[c]).join(', ') : 'yok') + '<br>' +
                '• Kaynaklar: ' + (prefs.sources.length ? prefs.sources.join(', ') : 'hepsi') + '<br>' +
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
            '• /haber kaynaklar — haber siteleri listesi<br>' +
            '• /haber kaynak cnnturk,trt,sozcu — belirli siteleri seç (hepsi: /haber kaynak hepsi)<br>' +
            '• /haber temizle — önbelleği sıfırla (tüm haberler yeniden gösterilir)<br>' +
            '• /haber test — bağlantı testi<br>' +
            '<span style="opacity:.6">Haberler her ' + (CHECK_MS / 1000) + ' saniyede bir otomatik kontrol edilir.</span>');
    }

    /* ---------- döngü ---------- */
    let busy = false;
    let initialDone = false;

    async function tick() {
        if (busy || !logged() || !inHome() || document.hidden || !prefs.enabled) return;
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
        R.push(['haber', '[ac|kapat|durum|kategoriler|kaynaklar|test]', 'Haber botu kontrolü', 'all', 'haber botu']);
    }

    let hello = false;
    let wasHome = false;
    setInterval(() => {
        registry();
        const nowHome = inHome();
        if (nowHome && !wasHome) setTimeout(tick, 300);   // #haber kanalına girilince hemen haberleri getir
        wasHome = nowHome;
        if (!hello && logged() && nowHome) {
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
