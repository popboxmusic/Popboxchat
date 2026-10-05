// ============================================================
// DJ BOT 🎧 — v3.0 (API Anahtarsız)
// Kanal: radyo | Sahip: mateky
// ============================================================
// Özellikler:
//   • API anahtarı GEREKMEZ
//   • !cal [şarkı adı] — YouTube'da arar, playlist'e ekler
//   • !cal [link/ID] — Direkt ekler
//   • !atla / !kuyruk / !durdur / !devam
//   • Firebase kotası dostu (filtreli dinleyici, dedupe, cache)
// ============================================================
(function () {
    'use strict';

    if (window.__DJ_BOT_LOADED__) return;
    window.__DJ_BOT_LOADED__ = true;

    // ------------------------------------------------------------
    // AYARLAR
    // ------------------------------------------------------------
    const CHANNEL = 'radyo';
    const BOT_NAME = 'DJ';
    const BOT_ICON = '🎧';

    // Kota koruması
    const BOT_MSG_DEDUPE_MS = 5000;
    const SEARCH_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 saat
    const SEARCH_COOLDOWN_MS = 3000;              // 3 sn arayla max 1 arama
    const MAX_SEARCH_PER_DAY = 300;               // Scraping kotası yok ama IP ban yememek için

    // YouTube arama proxy'leri (biri çalışmazsa diğeri denenir)
    // Not: CORS nedeniyle tarayıcıda doğrudan youtube.com'a fetch edilemez,
    // bu yüzden açık kaynak CORS proxy'leri kullanılır.
    const CORS_PROXIES = [
        'https://api.allorigins.win/raw?url=',
        'https://corsproxy.io/?',
        'https://api.codetabs.com/v1/proxy?quest='
    ];

    // ------------------------------------------------------------
    // DURUM
    // ------------------------------------------------------------
    let _initialized = false;
    let _listenerBound = false;
    let _listenerRef = null;

    const _seenMsgKeys = new Set();
    let _lastBotMsg = { text: '', time: 0 };

    const _searchCache = {};      // { query: { videoId, title, ts } }
    let _lastSearchTime = 0;
    let _dailySearchCount = 0;
    let _dailySearchDate = new Date().toISOString().slice(0, 10);

    // ------------------------------------------------------------
    // YARDIMCILAR
    // ------------------------------------------------------------
    function getDB() { return window.database || null; }
    function timeNow() {
        return new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    }
    function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
    function today() { return new Date().toISOString().slice(0, 10); }

    function checkSearchQuota() {
        const t = today();
        if (_dailySearchDate !== t) {
            _dailySearchDate = t;
            _dailySearchCount = 0;
        }
        return _dailySearchCount < MAX_SEARCH_PER_DAY;
    }

    // ------------------------------------------------------------
    // VIDEO ID ÇIKAR (link veya direkt ID)
    // ------------------------------------------------------------
    function extractVideoId(text) {
        if (!text) return null;
        if (/^[a-zA-Z0-9_-]{11}$/.test(text.trim())) return text.trim();
        let m = text.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
        if (m) return m[1];
        m = text.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
        if (m) return m[1];
        m = text.match(/embed\/([a-zA-Z0-9_-]{11})/);
        if (m) return m[1];
        m = text.match(/shorts\/([a-zA-Z0-9_-]{11})/);
        if (m) return m[1];
        return null;
    }

    // ------------------------------------------------------------
    // YOUTUBE ARAMA — API ANAHTARSIZ (Scraping + CORS Proxy)
    // ------------------------------------------------------------
    async function searchYouTube(query) {
        // 1) Cache kontrolü
        const cacheKey = query.toLowerCase().trim();
        const cached = _searchCache[cacheKey];
        if (cached && (Date.now() - cached.ts) < SEARCH_CACHE_TTL) {
            console.log('🎧 Cache:', query);
            return { id: cached.videoId, title: cached.title, fromCache: true };
        }

        // 2) Cooldown
        const now = Date.now();
        if (now - _lastSearchTime < SEARCH_COOLDOWN_MS) {
            await sleep(SEARCH_COOLDOWN_MS - (now - _lastSearchTime));
        }
        _lastSearchTime = Date.now();

        // 3) Kota kontrolü
        if (!checkSearchQuota()) {
            console.warn('🎧 Günlük arama limiti doldu.');
            return { quotaExceeded: true };
        }

        // 4) YouTube arama sayfası
        const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAQ%253D%253D`;

        // 5) CORS proxy'leri sırayla dene
        for (const proxy of CORS_PROXIES) {
            try {
                const url = proxy + encodeURIComponent(ytUrl);
                const res = await fetch(url);
                if (!res.ok) continue;
                const html = await res.text();

                // Video ID'lerini çıkar (birden fazla regex dene)
                const ids = extractVideoIdsFromHTML(html);
                if (ids.length === 0) continue;

                // İlk geçerli videoyu al
                const videoId = ids[0];
                // Başlığı da çıkarmayı dene
                const title = extractTitleFromHTML(html, videoId) || query;

                _dailySearchCount++;

                // Cache'e kaydet
                _searchCache[cacheKey] = {
                    videoId: videoId,
                    title: title,
                    ts: Date.now()
                };

                console.log(`🎧 Bulundu: ${title} (${videoId})`);
                return { id: videoId, title: title };

            } catch (e) {
                console.warn('🎧 Proxy hatası:', proxy, e.message);
                continue;
            }
        }

        return null;
    }

    // HTML'den video ID'lerini ayıkla
    function extractVideoIdsFromHTML(html) {
        const ids = new Set();

        // Yöntem 1: videoId alanı
        const re1 = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
        let m;
        while ((m = re1.exec(html)) !== null) ids.add(m[1]);

        // Yöntem 2: watch?v= linkleri
        const re2 = /\/watch\?v=([a-zA-Z0-9_-]{11})/g;
        while ((m = re2.exec(html)) !== null) ids.add(m[1]);

        // Yöntem 3: youtu.be linkleri
        const re3 = /youtu\.be\/([a-zA-Z0-9_-]{11})/g;
        while ((m = re3.exec(html)) !== null) ids.add(m[1]);

        return Array.from(ids);
    }

    // HTML'den başlık ayıkla
    function extractTitleFromHTML(html, videoId) {
        try {
            // videoId'nin yanındaki title alanını bul
            const re = new RegExp(`"videoId":"${videoId}"[^}]*?"title":\\{"runs":\\[\\{"text":"([^"]+)"`, 's');
            const m = html.match(re);
            if (m) return decodeHTMLEntities(m[1]);
            return null;
        } catch (_) {
            return null;
        }
    }

    function decodeHTMLEntities(s) {
        if (!s) return '';
        return s.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
            String.fromCharCode(parseInt(hex, 16))
        ).replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    }

    // ------------------------------------------------------------
    // PLAYLIST'E EKLE
    // ------------------------------------------------------------
    async function addToRadioPlaylist(videoId, title, requester) {
        const db = getDB();
        if (!db) return { error: true };

        try {
            // Aynı video zaten playlist'te mi?
            const snap = await db.ref('channelPlaylists/' + CHANNEL).once('value');
            const data = snap.val() || {};
            const exists = Object.values(data).some(item => item.id === videoId);
            if (exists) return { alreadyExists: true };

            await db.ref('channelPlaylists/' + CHANNEL).push({
                id: videoId,
                title: title || videoId,
                url: `https://youtu.be/${videoId}`,
                addedBy: requester,
                addedAt: Date.now()
            });
            return { ok: true };
        } catch (e) {
            console.error('🎧 Playlist ekleme hatası:', e);
            return { error: true };
        }
    }

    // ------------------------------------------------------------
    // BOT MESAJ
    // ------------------------------------------------------------
    async function botSend(text) {
        const db = getDB();
        if (!db) return null;

        const now = Date.now();
        if (_lastBotMsg.text === text && (now - _lastBotMsg.time) < BOT_MSG_DEDUPE_MS) {
            return null;
        }
        _lastBotMsg = { text, time: now };

        try {
            const ref = db.ref('channelMessages/' + CHANNEL);
            const r = await ref.push({
                sender: BOT_NAME,
                text: text,
                type: 'supervisor',
                isBotMessage: true,
                isDjBot: true,
                timestamp: Date.now(),
                time: timeNow(),
                avatar: null,
                channel: CHANNEL
            });
            return r.key;
        } catch (e) {
            console.error('🎧 botSend hatası:', e);
            return null;
        }
    }

    // ------------------------------------------------------------
    // KOMUTLAR
    // ------------------------------------------------------------
    async function handleCommand(cmd, args, user) {
        switch (cmd) {
            case '!cal': {
                if (!args.length) {
                    await botSend(`${BOT_ICON} Kullanım: **!cal [şarkı adı]** veya **!cal [YouTube linki]**`);
                    return true;
                }

                const query = args.join(' ');
                let videoId = extractVideoId(query);
                let title = query;

                if (!videoId) {
                    await botSend(`${BOT_ICON} 🔍 Aranıyor: **${query}**...`);
                    const result = await searchYouTube(query);

                    if (!result) {
                        await botSend(
                            `${BOT_ICON} ❌ Bulunamadı: **${query}**\n` +
                            `💡 YouTube linkini direkt yapıştırmayı dene: **!cal https://youtu.be/...**`
                        );
                        return true;
                    }
                    if (result.quotaExceeded) {
                        await botSend(`${BOT_ICON} ⚠️ Günlük arama limiti doldu. Link gönder.`);
                        return true;
                    }
                    videoId = result.id;
                    title = result.title;
                }

                const res = await addToRadioPlaylist(videoId, title, user);

                if (res.ok) {
                    await botSend(
                        `${BOT_ICON} ✅ **${user}** tarafından eklendi:\n` +
                        `🎵 **${title}**\n` +
                        `🔗 https://youtu.be/${videoId}`
                    );
                } else if (res.alreadyExists) {
                    await botSend(`${BOT_ICON} ℹ️ **${title}** zaten kuyrukta.`);
                } else {
                    await botSend(`${BOT_ICON} ❌ Playlist'e eklenemedi.`);
                }
                return true;
            }

            case '!atla': {
                await botSend(`${BOT_ICON} ⏭️ Sıradaki şarkıya geçiliyor...`);
                if (typeof window.playNextVideo === 'function') {
                    window.playNextVideo();
                }
                return true;
            }

            case '!kuyruk': {
                const db = getDB();
                if (!db) return true;
                const snap = await db.ref('channelPlaylists/' + CHANNEL).once('value');
                const data = snap.val() || {};
                const items = Object.values(data);
                if (!items.length) {
                    await botSend(`${BOT_ICON} 📭 Kuyruk boş. **!cal [şarkı]** ile ekle.`);
                    return true;
                }
                let msg = `${BOT_ICON} **RADYO KUYRUĞU** (${items.length} şarkı)\n━━━━━━━━━━━━━━\n`;
                items.slice(0, 10).forEach((item, i) => {
                    msg += `${i + 1}. **${item.title || item.id}**\n`;
                });
                if (items.length > 10) msg += `... ve ${items.length - 10} şarkı daha`;
                await botSend(msg);
                return true;
            }

            case '!durdur': {
                if (window.player && window.player.pauseVideo) window.player.pauseVideo();
                await botSend(`${BOT_ICON} ⏸️ Durduruldu.`);
                return true;
            }

            case '!devam': {
                if (window.player && window.player.playVideo) window.player.playVideo();
                await botSend(`${BOT_ICON} ▶️ Devam ediyor.`);
                return true;
            }

            case '!dj-yardim':
            case '!yardim': {
                await botSend(
                    `${BOT_ICON} **DJ BOT KOMUTLARI**\n━━━━━━━━━━━━━━\n` +
                    `• **!cal [şarkı]** — Ara ve ekle\n` +
                    `• **!cal [link/ID]** — Direkt ekle\n` +
                    `• **!atla** — Sıradaki şarkı\n` +
                    `• **!kuyruk** — Kuyruğu göster\n` +
                    `• **!durdur** — Durdur\n` +
                    `• **!devam** — Devam et\n` +
                    `• **!dj-yardim** — Bu mesaj\n\n` +
                    `🔑 API anahtarı GEREKMEZ!`
                );
                return true;
            }

            default:
                return false;
        }
    }

    // ------------------------------------------------------------
    // DİNLEYİCİ (Filtreli)
    // ------------------------------------------------------------
    function attachListener() {
        const db = getDB();
        if (!db) return;
        if (_listenerBound) return;
        _listenerBound = true;

        _listenerRef = db.ref('channelMessages/' + CHANNEL).limitToLast(5);
        _listenerRef.on('child_added', async (snap) => {
            const msg = snap.val();
            if (!msg) return;
            if (msg.sender === BOT_NAME) return;
            if (msg.type === 'system' || msg.type === 'supervisor') return;
            if (msg.isBotMessage) return;
            if (!msg.text || !msg.text.startsWith('!')) return; // Sadece komutlar

            const key = snap.key;
            if (_seenMsgKeys.has(key)) return;
            _seenMsgKeys.add(key);
            if (_seenMsgKeys.size > 200) {
                const arr = Array.from(_seenMsgKeys);
                _seenMsgKeys.clear();
                arr.slice(-100).forEach(k => _seenMsgKeys.add(k));
            }

            const parts = msg.text.trim().split(/\s+/);
            await handleCommand(parts[0].toLowerCase(), parts.slice(1), msg.sender);
        });

        console.log('🎧 DJ Bot dinleyicisi bağlandı (filtreli).');
    }

    // ------------------------------------------------------------
    // BAŞLATMA
    // ------------------------------------------------------------
    async function init() {
        if (_initialized) return;
        _initialized = true;

        console.log('🎧 DJ Bot başlatılıyor...');

        let tries = 0;
        while (!getDB() && tries < 60) {
            await sleep(500);
            tries++;
        }
        if (!getDB()) {
            console.error('❌ Firebase yok, DJ Bot başlatılamadı.');
            return;
        }

        // #radyo kanalı var mı?
        try {
            const s = await getDB().ref('channels/' + CHANNEL).once('value');
            if (!s.exists()) {
                await getDB().ref('channels/' + CHANNEL).set({
                    name: CHANNEL,
                    label: 'Radyo',
                    createdBy: 'mateky',
                    owner: 'mateky',
                    createdAt: Date.now(),
                    isHidden: false,
                    isLocked: false,
                    order: 1,
                    description: '🎧 Radyo kanalı. **!cal [şarkı]** ile şarkı isteyin.'
                });
                console.log('🎧 #radyo kanalı oluşturuldu.');
            }
        } catch (e) {}

        // Bot kullanıcısı
        try {
            await getDB().ref('onlineUsers/' + BOT_NAME).set({
                name: BOT_NAME,
                role: 'supervisor',
                level: 4.5,
                isBot: true,
                isOnline: true,
                lastSeen: Date.now(),
                joinedAt: Date.now(),
                avatar: null
            });
            getDB().ref('onlineUsers/' + BOT_NAME).onDisconnect().update({
                isOnline: false,
                lastSeen: Date.now()
            });
        } catch (e) {}

        attachListener();
        console.log('✅ DJ Bot hazır! (API anahtarsız)');
    }

    // ------------------------------------------------------------
    // DIŞA AÇIK API
    // ------------------------------------------------------------
    window.DJ = {
        search: searchYouTube,
        add: addToRadioPlaylist,
        cache: () => ({ ..._searchCache }),
        quota: () => ({ used: _dailySearchCount, max: MAX_SEARCH_PER_DAY, date: _dailySearchDate })
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
