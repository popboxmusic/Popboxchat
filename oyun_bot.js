// ============================================================
// AKIL KÜPÜ 🧠 - Dinamik Soru Üretici + Zorluk Sistemi
// Kanal Sahibi: mateky | Kanal: oyun
// ============================================================
(function () {
    'use strict';

    // --- Ayarlar ---
    const GAME_CHANNEL = 'oyun';
    const GAME_OWNER = 'mateky';
    const BOT_NAME = 'Akıl Küpü';
    const BOT_ICON = '🧠';
    const BOT_ROLE = 'supervisor';

    const DIFFICULTY = {
        kolay:  { label: '🟢 Kolay',  points: 5,  time: 30000 },
        orta:   { label: '🟡 Orta',   points: 10, time: 25000 },
        zor:    { label: '🔴 Zor',    points: 20, time: 20000 },
        efsane: { label: '💀 Efsane', points: 40, time: 15000 }
    };

    // --- Global Değişkenler ---
    let gameActive = false;
    let currentQuestion = null;
    let questionTimer = null;
    let scores = {};
    let players = new Set();
    let answered = false;
    let scoreRef = null;
    let usedQuestions = new Set();
    let roundNumber = 0;
    let askedCount = { kolay: 0, orta: 0, zor: 0, efsane: 0 };

    // ============================================================
    // KATMAN 1: ŞABLON MOTORU
    // ============================================================
    const TEMPLATES = {
        kolay: [
            () => { const a = rnd(1, 20), b = rnd(1, 20); return { q: `${a} + ${b} kaçtır?`, a: String(a + b) }; },
            () => { const a = rnd(10, 50), b = rnd(1, 9); return { q: `${a} × ${b} kaçtır?`, a: String(a * b) }; },
            () => { const a = rnd(20, 100), b = rnd(1, 20); return { q: `${a} - ${b} kaçtır?`, a: String(a - b) }; },
            () => { const a = rnd(2, 12); return { q: `${a} sayısının karesi kaçtır?`, a: String(a * a) }; },
            () => { const a = rnd(10, 60); return { q: `${a} sayısının yarısı kaçtır?`, a: String(a / 2) }; },
            () => { const n = rnd(10, 99); return { q: `${n} sayısının rakamları toplamı kaçtır?`, a: String(Math.floor(n / 10) + n % 10) }; },
            () => ({ q: 'Bir düzine kaç tanedir?', a: '12' }),
            () => ({ q: 'Bir hafta kaç gündür?', a: '7' }),
            () => ({ q: 'Bir yılda kaç gün vardır?', a: '365' }),
            () => ({ q: 'Bir saat kaç dakikadır?', a: '60' }),
            () => ({ q: "Türkiye'nin başkenti neresidir?", a: 'ankara' }),
            () => ({ q: 'Gökyüzü hangi renktir?', a: 'mavi' }),
            () => ({ q: 'Kaç kıta vardır?', a: '7' }),
            () => ({ q: 'Bir çeyrek saat kaç dakikadır?', a: '15' }),
        ],
        orta: [
            () => { const a = rnd(5, 15), b = rnd(5, 15), c = rnd(1, 10); return { q: `${a} × ${b} + ${c} kaçtır?`, a: String(a * b + c) }; },
            () => { const a = rnd(2, 10); return { q: `${a}³ (küpü) kaçtır?`, a: String(a * a * a) }; },
            () => { const a = rnd(100, 999); return { q: `${a} sayısının yarısı kaçtır?`, a: String(a / 2) }; },
            () => { const a = rnd(3, 12), b = rnd(3, 12); return { q: `${a} sayısının %${b * 5}'i kaçtır?`, a: String(Math.round(a * b * 5 / 100)) }; },
            () => ({ q: 'Türkiye Cumhuriyeti hangi yıl kuruldu?', a: '1923' }),
            () => ({ q: "İstanbul'un fethi hangi yıldır?", a: '1453' }),
            () => ({ q: 'İstiklal Marşı kaç kıtadır?', a: '10' }),
            () => ({ q: 'Dünyanın en büyük okyanusu hangisidir?', a: 'pasifik' }),
            () => ({ q: 'İnsan vücudundaki en büyük organ hangisidir?', a: 'deri' }),
            () => ({ q: 'Suyun kimyasal formülü nedir?', a: 'h2o' }),
            () => ({ q: 'Bir üçgenin iç açıları toplamı kaçtır?', a: '180' }),
            () => ({ q: 'En büyük gezegen hangisidir?', a: 'jüpiter' }),
            () => ({ q: 'Türk bayrağında ne vardır?', a: 'ay ve yıldız' }),
            () => ({ q: 'Türkiye kaç bölgeden oluşur?', a: '7' }),
        ],
        zor: [
            () => { const a = rnd(15, 40), b = rnd(15, 40); return { q: `${a} × ${b} kaçtır?`, a: String(a * b) }; },
            () => { const a = rnd(100, 500), b = rnd(10, 50); return { q: `${a} ÷ ${b} (yaklaşık tam sayı) kaçtır?`, a: String(Math.round(a / b)) }; },
            () => { const a = rnd(2, 9), b = rnd(2, 9); return { q: `${a}^${b} kaçtır?`, a: String(Math.pow(a, b)) }; },
            () => { const a = rnd(50, 200); return { q: `${a} sayısının karekökü yaklaşık kaçtır?`, a: String(Math.round(Math.sqrt(a))) }; },
            () => ({ q: 'Osmanlı Devleti hangi yıl kuruldu?', a: '1299' }),
            () => ({ q: 'Kurtuluş Savaşı hangi yıl başladı?', a: '1919' }),
            () => ({ q: 'Mona Lisa tablosunu kim yaptı?', a: 'leonardo da vinci' }),
            () => ({ q: 'Dünyanın en uzun nehri hangisidir?', a: 'nil' }),
            () => ({ q: 'En hızlı kara hayvanı hangisidir?', a: 'çita' }),
            () => ({ q: 'Periyodik tabloda demirin sembolü nedir?', a: 'fe' }),
            () => ({ q: "Türkiye'de kaç il vardır?", a: '81' }),
            () => ({ q: 'Bir asır kaç yıldır?', a: '100' }),
            () => ({ q: 'Atom numarası 1 olan element nedir?', a: 'hidrojen' }),
            () => ({ q: 'Dünyanın en büyük kıtası hangisidir?', a: 'asya' }),
        ],
        efsane: [
            () => { const a = rnd(50, 99), b = rnd(50, 99); return { q: `${a} × ${b} kaçtır?`, a: String(a * b) }; },
            () => { const a = rnd(2, 6), b = rnd(5, 10); return { q: `${a}^${b} kaçtır?`, a: String(Math.pow(a, b)) }; },
            () => { const n = rnd(3, 6); return { q: `${n}! (faktöriyel) kaçtır?`, a: String(factorial(n)) }; },
            () => { const a = rnd(100, 999); return { q: `${a} sayısı asal mıdır? (evet/hayır)`, a: isPrime(a) ? 'evet' : 'hayır' }; },
            () => ({ q: "İstanbul'un fethi hangi padişah döneminde oldu?", a: 'fatih sultan mehmet' }),
            () => ({ q: 'Atom numarası 79 olan element nedir?', a: 'altın' }),
            () => ({ q: 'Dünyanın en büyük çölü hangisidir?', a: 'sahara' }),
            () => ({ q: 'Einstein hangi teorisiyle ünlüdür?', a: 'izafiyet' }),
            () => ({ q: 'İnsan kalbi kaç odacıklıdır?', a: '4' }),
            () => ({ q: "Türkiye'nin en yüksek dağı hangisidir?", a: 'ağrı' }),
            () => ({ q: 'Işık hızı yaklaşık kaç km/s?', a: '300000' }),
            () => ({ q: 'Periyodik tabloda kaç element vardır?', a: '118' }),
            () => ({ q: 'Pi sayısı yaklaşık kaçtır? (2 ondalık)', a: '3.14' }),
        ]
    };

    function rnd(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
    function factorial(n) { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; }
    function isPrime(n) { if (n < 2) return false; for (let i = 2; i <= Math.sqrt(n); i++) if (n % i === 0) return false; return true; }

    // ============================================================
    // KATMAN 2: HARİCİ API (Open Trivia DB)
    // ============================================================
    async function fetchFromAPI(difficulty) {
        const diffMap = { kolay: 'easy', orta: 'medium', zor: 'hard', efsane: 'hard' };
        const url = `https://opentdb.com/api.php?amount=1&category=9&difficulty=${diffMap[difficulty] || 'medium'}&type=multiple`;
        try {
            const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
            const data = await res.json();
            if (data.response_code !== 0 || !data.results || !data.results[0]) return null;
            const item = data.results[0];
            const question = decodeHtml(item.question);
            const correct = decodeHtml(item.correct_answer);
            // Sadece İngilizce karakter içeriyorsa (Türkçe değilse) atla
            if (!/[a-zA-Z]/.test(question)) return null;
            // İngilizce soruları Türkçeleştirmek zor - sadece basit olanları al
            return { q: question, a: correct };
        } catch (e) {
            return null;
        }
    }

    function decodeHtml(html) {
        const txt = document.createElement('textarea');
        txt.innerHTML = html;
        return txt.value;
    }

    // ============================================================
    // KATMAN 3: YEDEK HAVUZ
    // ============================================================
    const FALLBACK_POOL = [
        { q: "Türkiye'nin en kalabalık şehri hangisidir?", a: 'istanbul' },
        { q: 'Bir yılda kaç ay vardır?', a: '12' },
        { q: 'Dünyanın uydusu nedir?', a: 'ay' },
        { q: 'Güneş sisteminde kaç gezegen vardır?', a: '8' },
        { q: 'Türk bayrağının rengi nedir?', a: 'kırmızı' },
        { q: 'En büyük memeli hayvan hangisidir?', a: 'balina' },
        { q: 'Bir gün kaç saattir?', a: '24' },
    ];

    // ============================================================
    // SORU ÜRETİCİ (3 katmanlı)
    // ============================================================
    async function generateQuestion(difficulty) {
        // API dene (zor ve efsane için)
        if (difficulty === 'zor' || difficulty === 'efsane') {
            const apiQ = await fetchFromAPI(difficulty);
            if (apiQ && !usedQuestions.has(apiQ.q)) {
                usedQuestions.add(apiQ.q);
                return apiQ;
            }
        }

        // Şablon motoru
        const templates = TEMPLATES[difficulty] || TEMPLATES.orta;
        for (let i = 0; i < 50; i++) {
            const gen = templates[rnd(0, templates.length - 1)];
            const q = gen();
            if (!usedQuestions.has(q.q)) {
                usedQuestions.add(q.q);
                return q;
            }
        }

        // Yedek havuz
        for (const fb of FALLBACK_POOL) {
            if (!usedQuestions.has(fb.q)) {
                usedQuestions.add(fb.q);
                return fb;
            }
        }

        // Hepsi kullanıldıysa sıfırla
        usedQuestions.clear();
        return TEMPLATES[difficulty][0]();
    }

    function pickDifficulty() {
        const total = roundNumber;
        const r = Math.random();
        if (total < 3) return r < 0.7 ? 'kolay' : 'orta';
        if (total < 8) {
            if (r < 0.3) return 'kolay';
            if (r < 0.8) return 'orta';
            return 'zor';
        }
        if (total < 15) {
            if (r < 0.15) return 'kolay';
            if (r < 0.5) return 'orta';
            if (r < 0.85) return 'zor';
            return 'efsane';
        }
        if (r < 0.2) return 'orta';
        if (r < 0.6) return 'zor';
        return 'efsane';
    }

    // ============================================================
    // YARDIMCILAR
    // ============================================================
    function normalizeNick(n) { return n ? String(n).toLowerCase().trim() : ''; }
    function getDB() { return window.database || null; }
    function timeNow() { return new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }); }

    async function botSend(text) {
        const db = getDB();
        if (!db) return null;
        const ref = db.ref('channelMessages/' + GAME_CHANNEL);
        const r = await ref.push({
            sender: BOT_NAME, text: text, type: 'supervisor',
            isBotMessage: true, isGameBot: true,
            timestamp: Date.now(), time: timeNow(), avatar: null, channel: GAME_CHANNEL
        });
        return r.key;
    }

    // ============================================================
    // OYUN AKIŞI
    // ============================================================
    async function askQuestion() {
        if (!gameActive) return;

        const difficulty = pickDifficulty();
        const qData = await generateQuestion(difficulty);
        currentQuestion = { ...qData, difficulty };
        answered = false;
        roundNumber++;
        askedCount[difficulty]++;

        const d = DIFFICULTY[difficulty];
        const msg = `${BOT_ICON} **SORU #${roundNumber}** — ${d.label}\n` +
                    `━━━━━━━━━━━━━━\n` +
                    `❓ ${currentQuestion.q}\n\n` +
                    `💰 Ödül: **${d.points}** puan  |  ⏱️ Süre: **${d.time / 1000}s**`;

        await botSend(msg);

        if (questionTimer) clearTimeout(questionTimer);
        questionTimer = setTimeout(async () => {
            if (!answered && gameActive) {
                await botSend(`⏰ Süre doldu! Doğru cevap: **${currentQuestion.a}**\n${DIFFICULTY[currentQuestion.difficulty].label} soruydu.`);
                setTimeout(askQuestion, 2000);
            }
        }, d.time);
    }

    async function checkAnswer(username, text) {
        if (!gameActive || !currentQuestion || answered) return;
        if (!players.has(username)) return;

        const answer = normalizeNick(text);
        const correct = normalizeNick(currentQuestion.a);

        const isMatch = answer === correct ||
            (correct.length > 3 && answer.includes(correct)) ||
            (answer.length > 3 && correct.includes(answer));

        if (isMatch) {
            answered = true;
            if (questionTimer) clearTimeout(questionTimer);

            const d = DIFFICULTY[currentQuestion.difficulty];
            if (!scores[username]) scores[username] = 0;
            scores[username] += d.points;

            await botSend(`✅ **${username}** doğru bildi! (+${d.points} puan)\n` +
                          `📖 Cevap: **${currentQuestion.a}**\n` +
                          `📊 Güncel puan: **${scores[username]}**`);

            if (scoreRef) scoreRef.child(username).set(scores[username]);
            setTimeout(askQuestion, 2000);
        }
    }

    async function startGame(initiator) {
        if (gameActive) { await botSend('⚠️ Oyun zaten aktif! `/oyun-durdur` ile durdurun.'); return; }
        const db = getDB();
        if (!db) { await botSend('❌ Veritabanı bağlantısı yok!'); return; }

        scoreRef = db.ref('gameScores/' + GAME_CHANNEL);
        const snap = await scoreRef.once('value');
        scores = snap.val() || {};

        players.clear();
        if (window.currentUser) players.add(window.currentUser.name);

        gameActive = true;
        roundNumber = 0;
        usedQuestions.clear();
        askedCount = { kolay: 0, orta: 0, zor: 0, efsane: 0 };

        await botSend(`${BOT_ICON} **AKIL KÜPÜ OYUNU BAŞLADI!**\n` +
                      `━━━━━━━━━━━━━━\n` +
                      `👤 Başlatan: **${initiator}**\n` +
                      `👥 Katılmak için: **/katil**\n\n` +
                      `📊 **ZORLUK SEVİYELERİ:**\n` +
                      `🟢 Kolay → 5 puan (30s)\n` +
                      `🟡 Orta → 10 puan (25s)\n` +
                      `🔴 Zor → 20 puan (20s)\n` +
                      `💀 Efsane → 40 puan (15s)\n\n` +
                      `⚡ Sorular **dinamik** üretilir!\n\n` +
                      `🎯 İlk soru geliyor...`);

        setTimeout(askQuestion, 3000);
    }

    async function stopGame(initiator) {
        if (!gameActive) { await botSend('⚠️ Aktif oyun yok.'); return; }
        gameActive = false;
        if (questionTimer) clearTimeout(questionTimer);
        currentQuestion = null;
        await botSend(`${BOT_ICON} **Oyun durduruldu!**\n👤 Durduran: **${initiator}**`);
        await sendScoreboard();
        await sendStats();
    }

    async function sendScoreboard() {
        const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]).slice(0, 10);
        if (sorted.length === 0) { await botSend('📊 Henüz kimse puan kazanmadı.'); return; }
        let msg = `${BOT_ICON} **SKOR TABLOSU**\n━━━━━━━━━━━━━━\n`;
        sorted.forEach(([u, s], i) => {
            const m = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '•';
            msg += `${m} **${u}**: ${s} puan\n`;
        });
        await botSend(msg);
    }

    async function sendStats() {
        const total = askedCount.kolay + askedCount.orta + askedCount.zor + askedCount.efsane;
        if (total === 0) return;
        await botSend(`${BOT_ICON} **OTURUM İSTATİSTİKLERİ**\n━━━━━━━━━━━━━━\n` +
                      `🟢 Kolay: ${askedCount.kolay}\n` +
                      `🟡 Orta: ${askedCount.orta}\n` +
                      `🔴 Zor: ${askedCount.zor}\n` +
                      `💀 Efsane: ${askedCount.efsane}\n` +
                      `📊 Toplam: ${total} soru`);
    }

    async function addPlayer(username) {
        if (!gameActive) { await botSend('⚠️ Önce `/oyun` ile oyunu başlatın.'); return; }
        if (players.has(username)) { await botSend(`ℹ️ **${username}** zaten oyunda.`); return; }
        if (players.size >= 20) { await botSend('⚠️ Oyuncu limiti dolu (20).'); return; }
        players.add(username);
        await botSend(`✅ **${username}** oyuna katıldı! (${players.size}/20)`);
    }

    // ============================================================
    // YETKİ
    // ============================================================
    function isOwnerOrAdmin(u) {
        const n = normalizeNick(u);
        if (n === normalizeNick(GAME_OWNER)) return true;
        const al = window.adminList || [];
        const da = (window.SECURE_CONFIG && window.SECURE_CONFIG.DEFAULT_ADMINS) || [];
        return al.some(x => normalizeNick(x) === n) || da.some(x => normalizeNick(x) === n);
    }

    // ============================================================
    // KOMUTLAR
    // ============================================================
    async function handleCommand(cmd, args, user) {
        switch (cmd) {
            case '/oyun':
            case '/oyun-baslat':
                if (!isOwnerOrAdmin(user)) { await botSend(`⛔ Sadece **${GAME_OWNER}** ve adminler oyun başlatabilir!`); return true; }
                await startGame(user); return true;
            case '/oyun-durdur':
                if (!isOwnerOrAdmin(user)) { await botSend(`⛔ Sadece **${GAME_OWNER}** ve adminler oyun durdurabilir!`); return true; }
                await stopGame(user); return true;
            case '/katil': case '/katıl': await addPlayer(user); return true;
            case '/skor': case '/puan': await sendScoreboard(); return true;
            case '/istatistik': await sendStats(); return true;
            case '/oyun-yardim': case '/akilkupu':
                await botSend(`${BOT_ICON} **AKIL KÜPÜ KOMUTLARI**\n━━━━━━━━━━━━━━\n` +
                              `• /oyun — Oyunu başlat\n• /oyun-durdur — Durdur\n` +
                              `• /katil — Oyuna katıl\n• /skor — Skor tablosu\n` +
                              `• /istatistik — Oturum özeti\n• /oyun-yardim — Bu mesaj\n\n` +
                              `💡 Sorular **dinamik üretilir**: matematik, tarih, coğrafya, bilim...`);
                return true;
            default: return false;
        }
    }

    // ============================================================
    // DİNLEYİCİ
    // ============================================================
    function attachListener() {
        const db = getDB();
        if (!db) return;
        const ref = db.ref('channelMessages/' + GAME_CHANNEL).limitToLast(1);
        ref.on('child_added', async (snap) => {
            const msg = snap.val();
            if (!msg) return;
            if (normalizeNick(msg.sender) === normalizeNick(BOT_NAME)) return;
            if (msg.type === 'system' || msg.type === 'supervisor') return;

            if (msg.text && msg.text.startsWith('/')) {
                const parts = msg.text.trim().split(/\s+/);
                await handleCommand(parts[0].toLowerCase(), parts.slice(1), msg.sender);
                return;
            }
            if (gameActive && currentQuestion && !answered) {
                await checkAnswer(msg.sender, msg.text || '');
            }
        });
    }

    // ============================================================
    // KURULUM
    // ============================================================
    async function ensureBotUser() {
        const db = getDB(); if (!db) return;
        try {
            await db.ref('onlineUsers/' + BOT_NAME).set({
                name: BOT_NAME, role: BOT_ROLE, level: 4.5, isBot: true,
                isOnline: true, lastSeen: Date.now(), joinedAt: Date.now(), avatar: null
            });
            db.ref('onlineUsers/' + BOT_NAME).onDisconnect().update({ isOnline: false, lastSeen: Date.now() });
        } catch (e) {}
    }

    async function ensureGameChannel() {
        const db = getDB(); if (!db) return;
        try {
            const s = await db.ref('channels/' + GAME_CHANNEL).once('value');
            if (!s.exists()) {
                await db.ref('channels/' + GAME_CHANNEL).set({
                    name: GAME_CHANNEL, label: 'Oyun',
                    createdBy: GAME_OWNER, owner: GAME_OWNER,
                    createdAt: Date.now(), isHidden: false, isLocked: false, order: 10,
                    description: '🧠 Akıl Küpü genel kültür oyunu. /oyun-yardim yazarak komutları görebilirsiniz.'
                });
            }
        } catch (e) {}
    }

    async function initGameBot() {
        console.log('🧠 Akıl Küpü botu başlatılıyor...');
        let tries = 0;
        while (!getDB() && tries < 60) { await new Promise(r => setTimeout(r, 500)); tries++; }
        if (!getDB()) { console.error('❌ Firebase yok.'); return; }
        await ensureGameChannel();
        await ensureBotUser();
        attachListener();
        console.log('✅ Akıl Küpü hazır!');
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initGameBot);
    else initGameBot();

    window.AkilKupu = {
        start: startGame, stop: stopGame,
        scores: () => scores, players: () => Array.from(players),
        isActive: () => gameActive,
        stats: () => ({ ...askedCount, round: roundNumber })
    };
})();