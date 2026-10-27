// ============================================================
// AKIL KÜPÜ 🧠 — v2.0 (Kararlı Sürüm)
// Dinamik Soru Üretici + Zorluk Sistemi + Round Kilidi
// Kanal Sahibi: mateky | Kanal: oyun
// ============================================================
// 🔧 v2.0 Çözülen Sorunlar:
//   • Sorular art arda gönderiliyordu (setTimeout zinciri çoğalıyordu)
//   • Çift listener bağlanıyordu
//   • checkAnswer + süre dolması aynı anda tetikleniyordu
//   • askQuestion reentrant çağrılabiliyordu
//   • Duplicate bot mesajı sadece birebir aynı metinde engelleniyordu
// ============================================================
(function () {
    'use strict';

    // ------------------------------------------------------------
    // GLOBAL TEK YÜKLEME KİLİDİ
    // ------------------------------------------------------------
    if (window.__AKIL_KUPU_LOADED__) {
        console.warn('🧠 Akıl Küpü zaten yüklü, ikinci kez başlatılmıyor.');
        return;
    }
    window.__AKIL_KUPU_LOADED__ = true;

    // ------------------------------------------------------------
    // AYARLAR
    // ------------------------------------------------------------
    const GAME_CHANNEL = 'oyun';
    const GAME_OWNER = 'mateky';
    const BOT_NAME = 'Akıl Küpü';
    const BOT_ICON = '🧠';
    const BOT_ROLE = 'supervisor';
    const MAX_PLAYERS = 20;
    const NEXT_QUESTION_DELAY = 2000;
    const FIRST_QUESTION_DELAY = 3000;
    const BOT_MSG_DEDUPE_MS = 5000;
    const SEEN_MSG_LIMIT = 200;

    const DIFFICULTY = {
        kolay:  { label: '🟢 Kolay',  points: 5,  time: 30000 },
        orta:   { label: '🟡 Orta',   points: 10, time: 25000 },
        zor:    { label: '🔴 Zor',    points: 20, time: 20000 },
        efsane: { label: '💀 Efsane', points: 40, time: 15000 }
    };

    // ------------------------------------------------------------
    // DURUM
    // ------------------------------------------------------------
    const state = {
        active: false,
        currentQuestion: null,
        answered: false,
        roundNumber: 0,
        players: new Set(),
        scores: {},
        askedCount: { kolay: 0, orta: 0, zor: 0, efsane: 0 },
        scoreRef: null,
        usedQuestions: new Set()
    };

    // Zamanlayıcılar — hepsi tek noktadan yönetilir
    let _questionTimer = null;      // süre dolması
    let _nextQuestionTimer = null;  // sonraki soru planlaması

    // Kilitler
    let _askLock = false;
    let _answerLock = false;

    // Bot mesaj dedupe
    let _lastBotMsg = { text: '', time: 0 };
    let _lastQuestionRound = -1;

    // Listener
    let _gameListenerRef = null;
    let _listenerBound = false;
    const _seenMsgKeys = new Set();

    // ------------------------------------------------------------
    // YARDIMCILAR
    // ------------------------------------------------------------
    function rnd(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
    function factorial(n) { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; }
    function isPrime(n) {
        if (n < 2) return false;
        for (let i = 2; i <= Math.sqrt(n); i++) if (n % i === 0) return false;
        return true;
    }
    function normalizeNick(n) { return n ? String(n).toLowerCase().trim() : ''; }
    function getDB() { return window.database || null; }
    function timeNow() {
        return new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    }
    function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

    // ------------------------------------------------------------
    // ZAMANLAYICI YÖNETİCİSİ
    // ------------------------------------------------------------
    function clearQuestionTimer() {
        if (_questionTimer) { clearTimeout(_questionTimer); _questionTimer = null; }
    }
    function clearNextQuestionTimer() {
        if (_nextQuestionTimer) { clearTimeout(_nextQuestionTimer); _nextQuestionTimer = null; }
    }
    function clearAllTimers() {
        clearQuestionTimer();
        clearNextQuestionTimer();
    }
    function scheduleNextQuestion(delay = NEXT_QUESTION_DELAY) {
        clearNextQuestionTimer();
        _nextQuestionTimer = setTimeout(() => {
            _nextQuestionTimer = null;
            askQuestion();
        }, delay);
    }

    // ------------------------------------------------------------
    // KATMAN 1: ŞABLON MOTORU
    // ------------------------------------------------------------
    const TEMPLATES = {
        kolay: [
            () => { const a = rnd(1, 20), b = rnd(1, 20); return { q: `${a} + ${b} kaçtır?`, a: String(a + b) }; },
            () => { const a = rnd(10, 50), b = rnd(1, 9); return { q: `${a} × ${b} kaçtır?`, a: String(a * b) }; },
            () => { const a = rnd(20, 100), b = rnd(1, 20); return { q: `${a} - ${b} kaçtır?`, a: String(a - b) }; },
            () => { const a = rnd(2, 12); return { q: `${a} sayısının karesi kaçtır?`, a: String(a * a) }; },
            () => { const a = rnd(10, 60) * 2; return { q: `${a} sayısının yarısı kaçtır?`, a: String(a / 2) }; },
            () => { const n = rnd(10, 99); return { q: `${n} sayısının rakamları toplamı kaçtır?`, a: String(Math.floor(n / 10) + n % 10) }; },
            () => ({ q: 'Bir düzine kaç tanedir?', a: '12' }),
            () => ({ q: 'Bir hafta kaç gündür?', a: '7' }),
            () => ({ q: 'Bir yılda kaç gün vardır?', a: '365' }),
            () => ({ q: 'Bir saat kaç dakikadır?', a: '60' }),
            () => ({ q: "Türkiye'nin başkenti neresidir?", a: 'ankara' }),
            () => ({ q: 'Gökyüzü hangi renktir?', a: 'mavi' }),
            () => ({ q: 'Kaç kıta vardır?', a: '7' }),
            () => ({ q: 'Bir çeyrek saat kaç dakikadır?', a: '15' }),
            () => ({ q: 'Bir yılda kaç mevsim vardır?', a: '4' }),
            () => ({ q: 'Bir metre kaç santimetredir?', a: '100' })
        ],
        orta: [
            () => { const a = rnd(5, 15), b = rnd(5, 15), c = rnd(1, 10); return { q: `${a} × ${b} + ${c} kaçtır?`, a: String(a * b + c) }; },
            () => { const a = rnd(2, 10); return { q: `${a}³ (küpü) kaçtır?`, a: String(a * a * a) }; },
            () => { const a = rnd(100, 999); return { q: `${a} sayısının yarısı kaçtır?`, a: String(Math.floor(a / 2)) }; },
            () => { const a = rnd(20, 80) * 5; return { q: `${a} sayısının %20'si kaçtır?`, a: String(Math.round(a * 0.2)) }; },
            () => ({ q: 'Türkiye Cumhuriyeti hangi yıl kuruldu?', a: '1923' }),
            () => ({ q: "İstanbul'un fethi hangi yıldır?", a: '1453' }),
            () => ({ q: 'İstiklal Marşı kaç kıtadır?', a: '10' }),
            () => ({ q: 'Dünyanın en büyük okyanusu hangisidir?', a: 'pasifik' }),
            () => ({ q: 'İnsan vücudundaki en büyük organ hangisidir?', a: 'deri' }),
            () => ({ q: 'Suyun kimyasal formülü nedir?', a: 'h2o' }),
            () => ({ q: 'Bir üçgenin iç açıları toplamı kaçtır?', a: '180' }),
            () => ({ q: 'En büyük gezegen hangisidir?', a: 'jüpiter' }),
            () => ({ q: 'Türkiye kaç bölgeden oluşur?', a: '7' }),
            () => ({ q: 'Bir asır kaç yıldır?', a: '100' })
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
            () => ({ q: 'Atom numarası 1 olan element nedir?', a: 'hidrojen' }),
            () => ({ q: 'Dünyanın en büyük kıtası hangisidir?', a: 'asya' }),
            () => ({ q: 'Işık hızı yaklaşık kaç km/s?', a: '300000' })
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
            () => ({ q: 'Periyodik tabloda kaç element vardır?', a: '118' }),
            () => ({ q: 'Pi sayısı yaklaşık kaçtır? (2 ondalık)', a: '3.14' }),
            () => ({ q: 'Dünyanın uydusu nedir?', a: 'ay' })
        ]
    };

    // ------------------------------------------------------------
    // KATMAN 2: HARİCİ API (devre dışı — Türkçe sorular için)
    // ------------------------------------------------------------
    async function fetchFromAPI(_difficulty) { return null; }

    // ------------------------------------------------------------
    // KATMAN 3: YEDEK HAVUZ
    // ------------------------------------------------------------
    const FALLBACK_POOL = [
        { q: "Türkiye'nin en kalabalık şehri hangisidir?", a: 'istanbul' },
        { q: 'Bir yılda kaç ay vardır?', a: '12' },
        { q: 'Güneş sisteminde kaç gezegen vardır?', a: '8' },
        { q: 'Türk bayrağının rengi nedir?', a: 'kırmızı' },
        { q: 'En büyük memeli hayvan hangisidir?', a: 'balina' },
        { q: 'Bir gün kaç saattir?', a: '24' },
        { q: 'Türkiye\'nin para birimi nedir?', a: 'lira' }
    ];

    // ------------------------------------------------------------
    // SORU ÜRETİCİ
    // ------------------------------------------------------------
    async function generateQuestion(difficulty) {
        if (difficulty === 'zor' || difficulty === 'efsane') {
            const apiQ = await fetchFromAPI(difficulty);
            if (apiQ && !state.usedQuestions.has(apiQ.q)) {
                state.usedQuestions.add(apiQ.q);
                return apiQ;
            }
        }
        const templates = TEMPLATES[difficulty] || TEMPLATES.orta;
        for (let i = 0; i < 50; i++) {
            const gen = templates[rnd(0, templates.length - 1)];
            const q = gen();
            if (!state.usedQuestions.has(q.q)) {
                state.usedQuestions.add(q.q);
                return q;
            }
        }
        for (const fb of FALLBACK_POOL) {
            if (!state.usedQuestions.has(fb.q)) {
                state.usedQuestions.add(fb.q);
                return fb;
            }
        }
        // Hepsi kullanıldıysa sıfırla
        state.usedQuestions.clear();
        return TEMPLATES[difficulty][0]();
    }

    function pickDifficulty() {
        const total = state.roundNumber;
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

    // ------------------------------------------------------------
    // BOT MESAJ — Round-bazlı dedupe
    // ------------------------------------------------------------
    async function botSend(text, opts = {}) {
        const db = getDB();
        if (!db) return null;

        // Aynı round için soru mesajı zaten gönderildi mi?
        if (opts.isQuestion) {
            if (_lastQuestionRound === state.roundNumber) {
                console.warn('🧠 Aynı round için soru zaten gönderildi:', state.roundNumber);
                return null;
            }
            _lastQuestionRound = state.roundNumber;
        }

        // Genel birebir aynı mesaj koruması
        const now = Date.now();
        if (_lastBotMsg.text === text && (now - _lastBotMsg.time) < BOT_MSG_DEDUPE_MS) {
            console.warn('🧠 Duplicate bot mesajı engellendi:', text.slice(0, 60));
            return null;
        }
        _lastBotMsg = { text, time: now };

        try {
            const ref = db.ref('channelMessages/' + GAME_CHANNEL);
            const r = await ref.push({
                sender: BOT_NAME,
                text: text,
                type: 'supervisor',
                isBotMessage: true,
                isGameBot: true,
                timestamp: Date.now(),
                time: timeNow(),
                avatar: null,
                channel: GAME_CHANNEL
            });
            return r.key;
        } catch (e) {
            console.error('🧠 botSend hatası:', e);
            return null;
        }
    }

    // ------------------------------------------------------------
    // OYUN AKIŞI — SORU
    // ------------------------------------------------------------
    async function askQuestion() {
        if (!state.active) return;

        // Kilitler
        if (_askLock) {
            console.warn('🧠 askQuestion zaten çalışıyor, atlandı.');
            return;
        }
        if (state.currentQuestion && !state.answered) {
            console.warn('🧠 Önceki soru hâlâ aktif, yeni soru gönderilmedi.');
            return;
        }

        _askLock = true;
        clearAllTimers();

        try {
            const difficulty = pickDifficulty();
            const qData = await generateQuestion(difficulty);

            if (!qData || !qData.q) {
                console.warn('🧠 Soru üretilemedi, 1 sn sonra tekrar denenecek.');
                _askLock = false;
                _nextQuestionTimer = setTimeout(() => {
                    _nextQuestionTimer = null;
                    askQuestion();
                }, 1000);
                return;
            }

            state.currentQuestion = { ...qData, difficulty };
            state.answered = false;
            state.roundNumber++;
            state.askedCount[difficulty]++;

            const d = DIFFICULTY[difficulty];
            const msg =
                `${BOT_ICON} **SORU #${state.roundNumber}** — ${d.label}\n` +
                `━━━━━━━━━━━━━━\n` +
                `❓ ${state.currentQuestion.q}\n\n` +
                `💰 Ödül: **${d.points}** puan  |  ⏱️ Süre: **${d.time / 1000}s**`;

            await botSend(msg, { isQuestion: true });

            // Süre dolması
            clearQuestionTimer();
            _questionTimer = setTimeout(async () => {
                _questionTimer = null;
                if (state.answered || !state.active) return;
                state.answered = true;
                const correct = state.currentQuestion ? state.currentQuestion.a : '?';
                const diff = state.currentQuestion ? state.currentQuestion.difficulty : 'orta';
                await botSend(
                    `⏰ Süre doldu! Doğru cevap: **${correct}**\n` +
                    `${DIFFICULTY[diff].label} soruydu.`
                );
                state.currentQuestion = null;
                scheduleNextQuestion(NEXT_QUESTION_DELAY);
            }, d.time);

        } catch (err) {
            console.error('🧠 askQuestion hatası:', err);
            scheduleNextQuestion(2000);
        } finally {
            _askLock = false;
        }
    }

    // ------------------------------------------------------------
    // CEVAP KONTROLÜ
    // ------------------------------------------------------------
    async function checkAnswer(username, text) {
        if (!state.active || !state.currentQuestion || state.answered) return;
        if (_answerLock) return;
        if (!state.players.has(username)) return;

        const answer = normalizeNick(text);
        const correct = normalizeNick(state.currentQuestion.a);
        if (!answer || !correct) return;

        const isMatch =
            answer === correct ||
            (correct.length > 3 && answer.includes(correct)) ||
            (answer.length > 3 && correct.includes(answer));

        if (!isMatch) return;

        // ✅ Doğru cevap — hemen kilitle
        _answerLock = true;
        state.answered = true;
        clearAllTimers();

        try {
            const d = DIFFICULTY[state.currentQuestion.difficulty];
            if (!state.scores[username]) state.scores[username] = 0;
            state.scores[username] += d.points;

            await botSend(
                `✅ **${username}** doğru bildi! (+${d.points} puan)\n` +
                `📖 Cevap: **${state.currentQuestion.a}**\n` +
                `📊 Güncel puan: **${state.scores[username]}**`
            );

            if (state.scoreRef) {
                state.scoreRef.child(username).set(state.scores[username]).catch(() => {});
            }

            state.currentQuestion = null;
            scheduleNextQuestion(NEXT_QUESTION_DELAY);
        } catch (err) {
            console.error('🧠 checkAnswer hatası:', err);
            scheduleNextQuestion(2000);
        } finally {
            _answerLock = false;
        }
    }

    // ------------------------------------------------------------
    // OYUN BAŞLAT / DURDUR
    // ------------------------------------------------------------
    async function startGame(initiator) {
        if (state.active) {
            await botSend('⚠️ Oyun zaten aktif! `/oyun-durdur` ile durdurun.');
            return;
        }
        const db = getDB();
        if (!db) { await botSend('❌ Veritabanı bağlantısı yok!'); return; }

        clearAllTimers();
        state.scoreRef = db.ref('gameScores/' + GAME_CHANNEL);

        try {
            const snap = await state.scoreRef.once('value');
            state.scores = snap.val() || {};
        } catch (_) {
            state.scores = {};
        }

        state.players.clear();
        if (window.currentUser) state.players.add(window.currentUser.name);

        state.active = true;
        state.roundNumber = 0;
        state.usedQuestions.clear();
        state.askedCount = { kolay: 0, orta: 0, zor: 0, efsane: 0 };
        state.currentQuestion = null;
        state.answered = false;
        _lastQuestionRound = -1;

        await botSend(
            `${BOT_ICON} **AKIL KÜPÜ OYUNU BAŞLADI!**\n` +
            `━━━━━━━━━━━━━━\n` +
            `👤 Başlatan: **${initiator}**\n` +
            `👥 Katılmak için: **/katil**\n\n` +
            `📊 **ZORLUK SEVİYELERİ:**\n` +
            `🟢 Kolay → 5 puan (30s)\n` +
            `🟡 Orta → 10 puan (25s)\n` +
            `🔴 Zor → 20 puan (20s)\n` +
            `💀 Efsane → 40 puan (15s)\n\n` +
            `⚡ Sorular **dinamik** üretilir!\n\n` +
            `🎯 İlk soru geliyor...`
        );

        _nextQuestionTimer = setTimeout(() => {
            _nextQuestionTimer = null;
            askQuestion();
        }, FIRST_QUESTION_DELAY);
    }

    async function stopGame(initiator) {
        if (!state.active) { await botSend('⚠️ Aktif oyun yok.'); return; }
        state.active = false;
        clearAllTimers();
        state.currentQuestion = null;
        state.answered = false;

        await botSend(`${BOT_ICON} **Oyun durduruldu!**\n👤 Durduran: **${initiator}**`);
        await sendScoreboard();
        await sendStats();
    }

    // ------------------------------------------------------------
    // SKOR / İSTATİSTİK
    // ------------------------------------------------------------
    async function sendScoreboard() {
        const sorted = Object.entries(state.scores)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
        if (sorted.length === 0) {
            await botSend('📊 Henüz kimse puan kazanmadı.');
            return;
        }
        let msg = `${BOT_ICON} **SKOR TABLOSU**\n━━━━━━━━━━━━━━\n`;
        sorted.forEach(([u, s], i) => {
            const m = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '•';
            msg += `${m} **${u}**: ${s} puan\n`;
        });
        await botSend(msg);
    }

    async function sendStats() {
        const a = state.askedCount;
        const total = a.kolay + a.orta + a.zor + a.efsane;
        if (total === 0) return;
        await botSend(
            `${BOT_ICON} **OTURUM İSTATİSTİKLERİ**\n━━━━━━━━━━━━━━\n` +
            `🟢 Kolay: ${a.kolay}\n` +
            `🟡 Orta: ${a.orta}\n` +
            `🔴 Zor: ${a.zor}\n` +
            `💀 Efsane: ${a.efsane}\n` +
            `📊 Toplam: ${total} soru`
        );
    }

    // ------------------------------------------------------------
    // OYUNCU EKLE
    // ------------------------------------------------------------
    async function addPlayer(username) {
        if (!state.active) {
            await botSend('⚠️ Önce `/oyun` ile oyunu başlatın.');
            return;
        }
        if (state.players.has(username)) {
            await botSend(`ℹ️ **${username}** zaten oyunda.`);
            return;
        }
        if (state.players.size >= MAX_PLAYERS) {
            await botSend(`⚠️ Oyuncu limiti dolu (${MAX_PLAYERS}).`);
            return;
        }
        state.players.add(username);
        await botSend(`✅ **${username}** oyuna katıldı! (${state.players.size}/${MAX_PLAYERS})`);
    }

    // ------------------------------------------------------------
    // YETKİ
    // ------------------------------------------------------------
    function isOwnerOrAdmin(u) {
        const n = normalizeNick(u);
        if (n === normalizeNick(GAME_OWNER)) return true;
        const al = window.adminList || [];
        const da = (window.SECURE_CONFIG && window.SECURE_CONFIG.DEFAULT_ADMINS) || [];
        return al.some(x => normalizeNick(x) === n) || da.some(x => normalizeNick(x) === n);
    }

    // ------------------------------------------------------------
    // KOMUT İŞLEYİCİ
    // ------------------------------------------------------------
    async function handleCommand(cmd, args, user) {
        switch (cmd) {
            case '/oyun':
            case '/oyun-baslat':
                if (!isOwnerOrAdmin(user)) {
                    await botSend(`⛔ Sadece **${GAME_OWNER}** ve adminler oyun başlatabilir!`);
                    return true;
                }
                await startGame(user);
                return true;

            case '/oyun-durdur':
                if (!isOwnerOrAdmin(user)) {
                    await botSend(`⛔ Sadece **${GAME_OWNER}** ve adminler oyun durdurabilir!`);
                    return true;
                }
                await stopGame(user);
                return true;

            case '/katil':
            case '/katıl':
                await addPlayer(user);
                return true;

            case '/skor':
            case '/puan':
                await sendScoreboard();
                return true;

            case '/istatistik':
                await sendStats();
                return true;

            case '/oyun-yardim':
            case '/akilkupu':
                await botSend(
                    `${BOT_ICON} **AKIL KÜPÜ KOMUTLARI**\n━━━━━━━━━━━━━━\n` +
                    `• /oyun — Oyunu başlat\n• /oyun-durdur — Durdur\n` +
                    `• /katil — Oyuna katıl\n• /skor — Skor tablosu\n` +
                    `• /istatistik — Oturum özeti\n• /oyun-yardim — Bu mesaj\n\n` +
                    `💡 Sorular **dinamik üretilir**: matematik, tarih, coğrafya, bilim...`
                );
                return true;

            default:
                return false;
        }
    }

    // ------------------------------------------------------------
    // DİNLEYİCİ — Tek seferlik bağlanır
    // ------------------------------------------------------------
    function attachListener() {
        const db = getDB();
        if (!db) return;
        if (_listenerBound) {
            console.log('🧠 Listener zaten bağlı.');
            return;
        }
        _listenerBound = true;

        if (_gameListenerRef) {
            try { _gameListenerRef.off('child_added'); } catch (_) {}
        }

        _gameListenerRef = db.ref('channelMessages/' + GAME_CHANNEL).limitToLast(1);
        _gameListenerRef.on('child_added', async (snap) => {
            const msg = snap.val();
            if (!msg) return;
            if (normalizeNick(msg.sender) === normalizeNick(BOT_NAME)) return;
            if (msg.type === 'system' || msg.type === 'supervisor') return;

            // Aynı mesajı iki kez işleme
            const key = snap.key;
            if (_seenMsgKeys.has(key)) return;
            _seenMsgKeys.add(key);
            if (_seenMsgKeys.size > SEEN_MSG_LIMIT) {
                const arr = Array.from(_seenMsgKeys);
                _seenMsgKeys.clear();
                arr.slice(-Math.floor(SEEN_MSG_LIMIT / 2)).forEach(k => _seenMsgKeys.add(k));
            }

            // Komut mu?
            if (msg.text && msg.text.startsWith('/')) {
                const parts = msg.text.trim().split(/\s+/);
                await handleCommand(parts[0].toLowerCase(), parts.slice(1), msg.sender);
                return;
            }

            // Cevap mı?
            if (state.active && state.currentQuestion && !state.answered) {
                await checkAnswer(msg.sender, msg.text || '');
            }
        });

        console.log('🧠 Oyun kanalı dinleyicisi bağlandı.');
    }

    // ------------------------------------------------------------
    // BOT KULLANICI + KANAL GARANTİSİ
    // ------------------------------------------------------------
    async function ensureBotUser() {
        const db = getDB();
        if (!db) return;
        try {
            const snap = await db.ref('onlineUsers/' + BOT_NAME).once('value');
            const existing = snap.val();
            if (existing && existing.lastSeen && (Date.now() - existing.lastSeen < 30000)) return;

            await db.ref('onlineUsers/' + BOT_NAME).set({
                name: BOT_NAME,
                role: BOT_ROLE,
                level: 4.5,
                isBot: true,
                isOnline: true,
                lastSeen: Date.now(),
                joinedAt: existing?.joinedAt || Date.now(),
                avatar: null
            });
            db.ref('onlineUsers/' + BOT_NAME)
                .onDisconnect()
                .update({ isOnline: false, lastSeen: Date.now() });
        } catch (_) {}
    }

    async function ensureGameChannel() {
        const db = getDB();
        if (!db) return;
        try {
            const s = await db.ref('channels/' + GAME_CHANNEL).once('value');
            if (!s.exists()) {
                await db.ref('channels/' + GAME_CHANNEL).set({
                    name: GAME_CHANNEL,
                    label: 'Oyun',
                    createdBy: GAME_OWNER,
                    owner: GAME_OWNER,
                    createdAt: Date.now(),
                    isHidden: false,
                    isLocked: false,
                    order: 10,
                    description: '🧠 Akıl Küpü genel kültür oyunu. /oyun-yardim yazarak komutları görebilirsiniz.'
                });
            }
        } catch (_) {}
    }

    // ------------------------------------------------------------
    // BAŞLATMA — Tek seferlik
    // ------------------------------------------------------------
    async function initGameBot() {
        console.log('🧠 Akıl Küpü botu başlatılıyor...');

        let tries = 0;
        while (!getDB() && tries < 60) {
            await sleep(500);
            tries++;
        }
        if (!getDB()) {
            console.error('❌ Firebase bağlantısı kurulamadı, Akıl Küpü başlatılamadı.');
            return;
        }

        await ensureGameChannel();
        await ensureBotUser();
        attachListener();

        // Bot presence güncellemesi
        setInterval(() => {
            ensureBotUser().catch(() => {});
        }, 30000);

        console.log('✅ Akıl Küpü hazır!');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initGameBot);
    } else {
        initGameBot();
    }

    // ------------------------------------------------------------
    // DIŞA AÇIK API
    // ------------------------------------------------------------
    window.AkilKupu = {
        start: startGame,
        stop: stopGame,
        scores: () => ({ ...state.scores }),
        players: () => Array.from(state.players),
        isActive: () => state.active,
        stats: () => ({ ...state.askedCount, round: state.roundNumber }),
        _debug: () => ({
            askLock: _askLock,
            answerLock: _answerLock,
            listenerBound: _listenerBound,
            hasTimer: !!_questionTimer,
            hasNextTimer: !!_nextQuestionTimer
        })
    };
})();
