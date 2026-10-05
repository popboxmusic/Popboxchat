// ============================================================
// DJ BOT 🎧 — v2.0 (Firebase Kotası Dostu)
// Kanal: radyo | Sahip: mateky
// ============================================================
// 🔧 v2.0 Firebase Korumaları:
//   • Mesaj dinleme filtresi (sadece "!" ile başlayanları işle)
//   • Duplicate komut koruması (aynı mesaj iki kez işlenmez)
//   • Bot mesaj dedupe (aynı mesaj 5 sn içinde 2. kez yazılmaz)
//   • Aynı şarkıyı tekrar aramaz (cache)
//   • Kota kontrolü: günlük arama sayısı takip edilir
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
    const YOUTUBE_API_KEY = 'YOUTUBE_API_ANAHTARINI_BURAYA_YAPISTIR';

    // Kota koruması
    const MAX_SEARCH_PER_DAY = 80;   // Günde max arama (kota = 100, tampon bırak)
    const BOT_MSG_DEDUPE_MS = 5000;  // Aynı bot mesajı 5 sn içinde tekrar yazılmaz
    const SEARCH_CACHE_TTL = 24 * 60 * 60 * 1000; // Arama cache'i 24 saat geçerli

    // ------------------------------------------------------------
    // DURUM
    // ------------------------------------------------------------
    let _initialized = false;
    let _listenerBound = false;
    let _listenerRef = null;

    // Duplicate koruma
    const _seenMsgKeys = new Set();
    let _lastBotMsg = { text: '', time: 0 };

    // Arama cache (Firebase kotası + YouTube kotası korur)
    const _searchCache = {};       // { query: { videoId, title, ts } }

    // Kota takibi
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

    // ------------------------------------------------------------
    // KOTA KONTROLÜ
    // ------------------------------------------------------------
    function checkSearchQuota() {
        const t = today();
        if (_dailySearchDate !== t) {
            _dailySearchDate = t;
            _dailySearchCount = 0;
        }
        return _dailySearchCount < MAX_SEARCH_PER_DAY;
    }

    function incrementSearchCount() {
        _dailySearchCount++;
    }

    // ------------------------------------------------------------
    // YOUTUBE ARAMA — Cache'li
    // ------------------------------------------------------------
    async function searchYouTube(query) {
        if (!YOUTUBE_API_KEY || YOUTUBE_API_KEY === 'YOUTUBE_API_ANAHTARINI_BURAYA_YAPISTIR') {
            console.warn('🎧 YouTube API anahtarı ayarlanmamış.');
            return null;
        }

        // 1) Cache kontrolü (0 kota)
        const cached = _searchCache[query.toLowerCase()];
        if (cached && (Date.now() - cached.ts) < SEARCH_CACHE_TTL) {
            console.log('🎧 Cache\'den alındı:', query);
            return { id: cached.videoId, title: cached.title, channel: cached.channel, fromCache: true };
        }

        // 2) Günlük kota kontrolü
        if (!checkSearchQuota()) {
            console.warn('🎧 Günlük arama kotası doldu.');
            return { quotaExceeded: true };
        }

        // 3) API çağrısı
        try {
            const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=1&key=${YOUTUBE_API_KEY}`;
            const res = await fetch(url);
            if (!res.ok) return null;
            const data = await res.json();
            const item = data.items?.[0];
            if (!item) return null;

            incrementSearchCount();

            const result = {
                id: item.id.videoId,
                title: item.snippet.title,
                channel: item.snippet.channelTitle
            };

            // Cache'e kaydet
            _searchCache[query.toLowerCase()] = {
                videoId: result.id,
                title: result.title,
                channel: result.channel,
                ts: Date.now()
            };

            return result;
        } catch (e) {
            console.error('🎧 YouTube arama hatası:', e);
            return null;
        }
    }

    // ------------------------------------------------------------
    // VIDEO ID ÇIKAR
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
        return null;
    }

    // ------------------------------------------------------------
    // PLAYLIST'E EKLE
    // ------------------------------------------------------------
    async function addToRadioPlaylist(videoId, title, requester) {
        const db = getDB();
        if (!db) return false;

        try {
            // Aynı video zaten playlist'te mi? (Firebase yazma koruması)
            const snap = await db.ref('channelPlaylists/' + CHANNEL).once('value');
            const data = snap.val() || {};
            const exists = Object.values(data).some(item => item.id === videoId);
            if (exists) {
                return { alreadyExists: true };
            }

            const ref = db.ref('channelPlaylists/' + CHANNEL);
            await ref.push({
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
    // BOT MESAJ — Duplicate korumalı
    // ------------------------------------------------------------
    async function botSend(text) {
        const db = getDB();
        if (!db) return null;

        // Aynı mesaj 5 sn içinde tekrar yazılmaz
        const now = Date.now();
        if (_lastBotMsg.text === text && (now - _lastBotMsg.time) < BOT_MSG_DEDUPE_MS) {
            console.warn('🎧 Duplicate bot mesajı engellendi.');
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
                    // API anahtarı yoksa uyar
                    if (!YOUTUBE_API_KEY || YOUTUBE_API_KEY === 'YOUTUBE_API_ANAHTARINI_BURAYA_YAPISTIR') {
                        await botSend(`${BOT_ICON} ⚠️ Şarkı adıyla arama için YouTube API anahtarı gerekli. Şimdilik **link** veya **video ID** gönder.`);
                        return true;
                    }

                    const result = await searchYouTube(query);
                    if (!result) {
                        await botSend(`${BOT_ICON} ❌ Şarkı bulunamadı: **${query}**`);
                        return true;
                    }
                    if (result.quotaExceeded) {
                        await botSend(`${BOT_ICON} ⚠️ Günlük arama kotası doldu. Link veya video ID gönder.`);
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
                    await botSend(`${BOT_ICON} 📭 Playlist boş. **!cal [şarkı]** ile şarkı ekle.`);
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
                await botSend(`${BOT_ICON} ⏸️ Müzik durduruldu.`);
                return true;
            }

            case '!devam': {
                if (window.player && window.player.playVideo) window.player.playVideo();
                await botSend(`${BOT_ICON} ▶️ Müzik devam ediyor.`);
                return true;
            }

            case '!dj-yardim':
            case '!yardim': {
                await botSend(
                    `${BOT_ICON} **DJ BOT KOMUTLARI**\n━━━━━━━━━━━━━━\n` +
                    `• **!cal [şarkı]** — YouTube'da ara ve ekle\n` +
                    `• **!cal [link/ID]** — Direkt ekle\n` +
                    `• **!atla** — Sıradaki şarkıya geç\n` +
                    `• **!kuyruk** — Kuyruğu göster\n` +
                    `• **!durdur** — Müziği durdur\n` +
                    `• **!devam** — Müziği devam ettir\n` +
                    `• **!dj-yardim** — Bu mesaj`
                );
                return true;
            }

            default:
                return false;
        }
    }

    // ------------------------------------------------------------
    // DİNLEYİCİ — Mesaj filtresiyle
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

            // 🚫 Botun kendi mesajlarını atla
            if (msg.sender === BOT_NAME) return;
            if (msg.type === 'system' || msg.type === 'supervisor') return;
            if (msg.isBotMessage) return;

            // 🚫 "!" ile başlamayan mesajları HİÇ işleme (sohbet mesajları)
            if (!msg.text || !msg.text.startsWith('!')) return;

            // 🚫 Duplicate mesaj koruması (aynı key iki kez işlenmez)
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
            console.error('❌ Firebase bağlantısı yok, DJ Bot başlatılamadı.');
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
        console.log('✅ DJ Bot hazır!');
    }

    // ------------------------------------------------------------
    // DIŞA AÇIK API
    // ------------------------------------------------------------
    window.DJ = {
        search: searchYouTube,
        add: addToRadioPlaylist,
        quota: () => ({ used: _dailySearchCount, max: MAX_SEARCH_PER_DAY, date: _dailySearchDate }),
        cache: () => ({ ..._searchCache })
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();