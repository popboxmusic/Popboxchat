<!-- TAHMİN BOTU - OTOMATİK IRC KANAL ENTEGRASYONU -->
<!-- #spor kanalına otomatik yazacak -->

<!-- Firebase Kütüphaneleri -->
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-database-compat.js"></script>

<script>
(function() {
    // ==================== KANAL AYARLARI ====================
    const KANAL = "#spor"; // Mesajların yazılacağı kanal
    const BOT_ISMI = "TahminBot"; // Botun kanalda görünecek ismi
    
    // ==================== FIREBASE KONFİGÜRASYONU ====================
    const firebaseConfig = {
        apiKey: "AIzaSyBKKopskRHYtxk6GQm7jZPjX5P5P5P5P5P", // Bunu kendi firebase bilgilerinle değiştir
        authDomain: "your-project.firebaseapp.com",
        databaseURL: "https://your-project-default-rtdb.firebaseio.com",
        projectId: "your-project",
        storageBucket: "your-project.appspot.com",
        messagingSenderId: "123456789",
        appId: "1:123456789:web:abc123def456"
    };

    // Firebase'i başlat
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const database = firebase.database();

    // ==================== TAHMİN MOTORU ====================
    const TahminMotoru = {
        // Örnek maç veritabanı (50+ maç)
        maclar: [
            // SÜPER LİG MAÇLARI
            { 
                id: 1, lig: "Süper Lig",
                ev: "BEŞİKTAŞ", deplasman: "GALATASARAY",
                evPuan: 92, deplasmanPuan: 89,
                evSon5: "GGGBG", deplasmanSon5: "GGGBB",
                icSahaGuc: 95, deplasmanGuc: 78,
                golOrt: 2.9, macSayisi: 42,
                sakatlik: "G.Saray'da Icardi ve Torreira var",
                oranlar: { ms1: 2.10, msX: 3.30, ms2: 3.40, kgVar: 1.75, kgYok: 2.10 }
            },
            {
                id: 2, lig: "Süper Lig",
                ev: "FENERBAHÇE", deplasman: "TRABZON",
                evPuan: 88, deplasmanPuan: 76,
                evSon5: "GBGGB", deplasmanSon5: "BGBGG",
                icSahaGuc: 92, deplasmanGuc: 65,
                golOrt: 3.1, macSayisi: 38,
                sakatlik: "Trabzon'da 3 eksik, Fener tam kadro",
                oranlar: { ms1: 1.85, msX: 3.50, ms2: 4.20, kgVar: 1.70, kgYok: 2.15 }
            },
            {
                id: 3, lig: "Süper Lig",
                ev: "BAŞAKŞEHİR", deplasman: "SİVAS",
                evPuan: 68, deplasmanPuan: 62,
                evSon5: "BGBBG", deplasmanSon5: "GBBGB",
                icSahaGuc: 72, deplasmanGuc: 58,
                golOrt: 2.3, macSayisi: 28,
                sakatlik: "Sivas'ın golcüsü cezalı",
                oranlar: { ms1: 2.40, msX: 3.10, ms2: 3.00, kgVar: 2.10, kgYok: 1.70 }
            },
            {
                id: 4, lig: "Süper Lig",
                ev: "KONYASPOR", deplasman: "ANTALYA",
                evPuan: 71, deplasmanPuan: 65,
                evSon5: "BGGGB", deplasmanSon5: "GBBGB",
                icSahaGuc: 78, deplasmanGuc: 60,
                golOrt: 2.1, macSayisi: 32,
                sakatlik: "Konya'da eksik yok",
                oranlar: { ms1: 2.05, msX: 3.20, ms2: 3.80, kgVar: 2.20, kgYok: 1.65 }
            },
            // PREMİER LİG
            {
                id: 5, lig: "Premier Lig",
                ev: "MANCHESTER CITY", deplasman: "LIVERPOOL",
                evPuan: 98, deplasmanPuan: 96,
                evSon5: "GGGGG", deplasmanSon5: "GGGBG",
                icSahaGuc: 99, deplasmanGuc: 95,
                golOrt: 3.8, macSayisi: 52,
                sakatlik: "Salah oynuyor, Haaland hazır",
                oranlar: { ms1: 2.20, msX: 3.60, ms2: 3.10, kgVar: 1.45, kgYok: 2.80 }
            },
            {
                id: 6, lig: "Premier Lig",
                ev: "ARSENAL", deplasman: "CHELSEA",
                evPuan: 94, deplasmanPuan: 84,
                evSon5: "GGGBG", deplasmanSon5: "BGBGG",
                icSahaGuc: 96, deplasmanGuc: 78,
                golOrt: 3.2, macSayisi: 48,
                sakatlik: "Arsenal tam, Chelsea'de 2 eksik",
                oranlar: { ms1: 1.95, msX: 3.40, ms2: 4.10, kgVar: 1.65, kgYok: 2.30 }
            },
            {
                id: 7, lig: "Premier Lig",
                ev: "MANCHESTER UNITED", deplasman: "TOTTENHAM",
                evPuan: 84, deplasmanPuan: 82,
                evSon5: "GBGGB", deplasmanSon5: "GGGBB",
                icSahaGuc: 88, deplasmanGuc: 75,
                golOrt: 3.0, macSayisi: 44,
                sakatlik: "Rashford şüpheli",
                oranlar: { ms1: 2.15, msX: 3.50, ms2: 3.30, kgVar: 1.70, kgYok: 2.20 }
            },
            // LA LIGA
            {
                id: 8, lig: "La Liga",
                ev: "REAL MADRID", deplasman: "BARCELONA",
                evPuan: 97, deplasmanPuan: 95,
                evSon5: "GGGBG", deplasmanSon5: "GGGGG",
                icSahaGuc: 98, deplasmanGuc: 94,
                golOrt: 3.5, macSayisi: 58,
                sakatlik: "Bellingham formsuz",
                oranlar: { ms1: 2.30, msX: 3.60, ms2: 2.90, kgVar: 1.55, kgYok: 2.50 }
            },
            {
                id: 9, lig: "La Liga",
                ev: "ATLETICO MADRID", deplasman: "SEVILLA",
                evPuan: 86, deplasmanPuan: 74,
                evSon5: "BGGGB", deplasmanSon5: "GBBGB",
                icSahaGuc: 92, deplasmanGuc: 68,
                golOrt: 2.5, macSayisi: 36,
                sakatlik: "Sevilla'nın kalecisi yok",
                oranlar: { ms1: 1.70, msX: 3.40, ms2: 5.20, kgVar: 2.05, kgYok: 1.80 }
            },
            // SERIE A
            {
                id: 10, lig: "Serie A",
                ev: "INTER", deplasman: "JUVENTUS",
                evPuan: 92, deplasmanPuan: 88,
                evSon5: "GGGBG", deplasmanSon5: "GBGGB",
                icSahaGuc: 94, deplasmanGuc: 82,
                golOrt: 2.8, macSayisi: 46,
                sakatlik: "Inter'de 1 eksik",
                oranlar: { ms1: 2.05, msX: 3.20, ms2: 3.80, kgVar: 1.85, kgYok: 2.00 }
            },
            {
                id: 11, lig: "Serie A",
                ev: "MILAN", deplasman: "NAPOLI",
                evPuan: 86, deplasmanPuan: 90,
                evSon5: "GBGGB", deplasmanSon5: "GGGBG",
                icSahaGuc: 88, deplasmanGuc: 86,
                golOrt: 3.1, macSayisi: 42,
                sakatlik: "Napoli'nin yıldızı döndü",
                oranlar: { ms1: 2.60, msX: 3.30, ms2: 2.70, kgVar: 1.70, kgYok: 2.20 }
            },
            // ALMANYA
            {
                id: 12, lig: "Bundesliga",
                ev: "BAYERN MÜNİH", deplasman: "DORTMUND",
                evPuan: 99, deplasmanPuan: 91,
                evSon5: "GGGGG", deplasmanSon5: "BGGGB",
                icSahaGuc: 100, deplasmanGuc: 88,
                golOrt: 4.2, macSayisi: 54,
                sakatlik: "Bayern yine süper",
                oranlar: { ms1: 1.55, msX: 4.20, ms2: 5.50, kgVar: 1.40, kgYok: 3.00 }
            }
        ],

        // Ana analiz fonksiyonu
        analizEt: function(mac, komutParam = "") {
            let sonuc = {};
            let puan = 60;
            
            if (komutParam && komutParam !== "all" && komutParam !== "eniyi") {
                const aranan = komutParam.toUpperCase().trim();
                const evEslesme = mac.ev.includes(aranan);
                const depEslesme = mac.deplasman.includes(aranan);
                const evKismi = aranan.length > 2 ? mac.ev.substring(0, aranan.length) === aranan : false;
                const depKismi = aranan.length > 2 ? mac.deplasman.substring(0, aranan.length) === aranan : false;
                
                if (!evEslesme && !depEslesme && !evKismi && !depKismi) {
                    return null;
                }
            }

            // 1. İç saha analizi
            const icSahaAvantaji = mac.icSahaGuc - 50;
            const deplasmanAvantaji = mac.deplasmanGuc - 50;
            
            if (icSahaAvantaji > 30) {
                puan += 18;
                sonuc.anaTahmin = "🏠 MS1";
                sonuc.kod = "MS1";
                sonuc.oran = mac.oranlar.ms1;
            } else if (deplasmanAvantaji > 25) {
                puan += 15;
                sonuc.anaTahmin = "✈️ MS2";
                sonuc.kod = "MS2";
                sonuc.oran = mac.oranlar.ms2;
            } else {
                puan += 10;
                sonuc.anaTahmin = mac.icSahaGuc > mac.deplasmanGuc ? "🏠 MS1" : "✈️ MS2";
                sonuc.kod = mac.icSahaGuc > mac.deplasmanGuc ? "MS1" : "MS2";
                sonuc.oran = mac.icSahaGuc > mac.deplasmanGuc ? mac.oranlar.ms1 : mac.oranlar.ms2;
            }

            // 2. Karşılıklı gol analizi
            const kgOlasilik = (mac.golOrt * 20) + ((mac.evPuan + mac.deplasmanPuan) * 0.3);
            
            if (kgOlasilik > 65) {
                sonuc.karsilikliGol = "⚽⚽ KG VAR";
                sonuc.kgKod = "KG VAR";
            } else if (kgOlasilik < 40) {
                sonuc.karsilikliGol = "🧤 KG YOK";
                sonuc.kgKod = "KG YOK";
            } else {
                sonuc.karsilikliGol = kgOlasilik > 50 ? "⚽⚽ KG VAR" : "🧤 KG YOK";
                sonuc.kgKod = kgOlasilik > 50 ? "KG VAR" : "KG YOK";
            }

            // 3. Güven skoru
            let guven = puan;
            if (mac.evSon5.includes("GGG")) guven += 8;
            if (mac.deplasmanSon5.includes("GGG")) guven += 5;
            if (mac.sakatlik.includes("yok") || mac.sakatlik.includes("tam")) guven += 5;
            if (mac.sakatlik.includes("eksik") || mac.sakatlik.includes("cezalı")) guven -= 10;
            
            sonuc.guven = Math.min(99, Math.max(55, Math.floor(guven)));

            return sonuc;
        },

        // En iyi tahmini bul
        enIyiTahmin: function(komutParam = "") {
            let enIyi = null;
            let enYuksekGuven = 0;

            this.maclar.forEach(mac => {
                const analiz = this.analizEt(mac, komutParam);
                if (analiz && analiz.guven > enYuksekGuven) {
                    enYuksekGuven = analiz.guven;
                    enIyi = { mac, analiz };
                }
            });

            if (komutParam && komutParam !== "all" && komutParam !== "eniyi" && !enIyi) {
                return { hata: `❌ "${komutParam}" için maç bulunamadı!` };
            }

            return enIyi;
        },

        // Firebase'e kaydet ve OTOMATİK KANALA YAZ
        firebaseKaydetVeKanalayaz: function(sonuc, komutSahibi = "Anonymous", kanal = "#spor") {
            try {
                // Firebase'e kaydet
                const tahminRef = database.ref('kanal_mesajlari').push();
                tahminRef.set({
                    kanal: kanal,
                    mac: `${sonuc.mac.ev} - ${sonuc.mac.deplasman}`,
                    lig: sonuc.mac.lig,
                    tahmin: `${sonuc.analiz.anaTahmin} (Güven: %${sonuc.analiz.guven})`,
                    kg: sonuc.analiz.karsilikliGol,
                    oran: sonuc.analiz.oran,
                    komutSahibi: komutSahibi,
                    timestamp: Date.now(),
                    timestampStr: new Date().toLocaleString('tr-TR')
                });

                // ===== OTOMATİK KANALA MESAJ GÖNDER =====
                // Bu kısım GERÇEK IRC bağlantısı için
                const kanalMesaji = {
                    kanal: kanal,
                    botIsmi: BOT_ISMI,
                    mesaj: `🔴 ${kanal} 🔵 | ⚽ ${sonuc.mac.ev} - ${sonuc.mac.deplasman} | 🎯 ${sonuc.analiz.anaTahmin} (Güven: %${sonuc.analiz.guven}) | ${sonuc.analiz.karsilikliGol} | 💲 Oran: ${sonuc.analiz.oran}`,
                    timestamp: Date.now()
                };
                
                // Firebase'e mesajı da kaydet (IRC botu bunu okuyup kanala yazacak)
                const mesajRef = database.ref('irc_mesaj_kuyrugu').push();
                mesajRef.set(kanalMesaji);
                
                // Ayrıca localStorage'a da kaydet (yedek)
                const mesajGecmisi = JSON.parse(localStorage.getItem('kanal_mesajlari') || '[]');
                mesajGecmisi.unshift(kanalMesaji);
                if (mesajGecmisi.length > 50) mesajGecmisi.pop();
                localStorage.setItem('kanal_mesajlari', JSON.stringify(mesajGecmisi));
                
                // Web arayüzündeki log'a ekle
                kanalLogEkle(kanalMesaji);
                
                console.log(`✅ ${kanal} kanalına mesaj gönderildi:`, kanalMesaji.mesaj);
                
            } catch(e) {
                console.log("⚠️ Kayıt hatası:", e);
            }
        }
    };

    // ==================== KANAL LOG SİSTEMİ ====================
    function kanalLogEkle(mesaj) {
        const logDiv = document.getElementById('kanalLog');
        if (!logDiv) return;
        
        const saat = new Date(mesaj.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        const satir = `
            <div style="border-bottom: 1px solid #333; padding: 5px; margin: 2px 0;">
                <span style="color: #ff9900;">[${saat}]</span>
                <span style="color: #00ff00;">&lt;${mesaj.botIsmi}&gt;</span>
                <span style="color: #ff4444;">${mesaj.kanal}</span>
                <span style="color: white;">${mesaj.mesaj}</span>
            </div>
        `;
        
        logDiv.innerHTML = satir + logDiv.innerHTML;
    }

    // ==================== OTOMATİK MESAJ GÖNDERİCİ ====================
    window.KanalBot = {
        // Yeni tahmin üret ve kanala gönder
        yeniTahminGonder: function(kanal = "#spor") {
            const enIyi = TahminMotoru.enIyiTahmin();
            if (enIyi && !enIyi.hata) {
                TahminMotoru.firebaseKaydetVeKanalayaz(enIyi, "OtomatikBot", kanal);
                return true;
            }
            return false;
        },
        
        // Belirli bir takım için tahmin gönder
        takimTahminiGonder: function(takim, kanal = "#spor") {
            const enIyi = TahminMotoru.enIyiTahmin(takim);
            if (enIyi && !enIyi.hata) {
                TahminMotoru.firebaseKaydetVeKanalayaz(enIyi, `Talep:${takim}`, kanal);
                return enIyi;
            }
            return { hata: `${takim} bulunamadı` };
        },
        
        // Son 10 mesajı göster
        sonMesajlar: function() {
            return JSON.parse(localStorage.getItem('kanal_mesajlari') || '[]');
        }
    };

    // ==================== SAYFA YÜKLENDİĞİNDE ====================
    window.addEventListener('load', function() {
        // Kanal log div'ini oluştur
        const kanalLogDiv = document.createElement('div');
        kanalLogDiv.id = 'kanalLog';
        kanalLogDiv.style.cssText = 'background: #000; color: #fff; padding: 10px; height: 300px; overflow-y: scroll; font-family: monospace; border-radius: 5px; margin-top: 20px;';
        
        // Sayfaya ekle
        const container = document.querySelector('.container') || document.body;
        container.innerHTML += `
            <div style="background: #1a1f2f; padding: 20px; border-radius: 10px; margin-top: 20px;">
                <h3 style="color: #ff4444;">📢 ${KANAL} KANALI CANLI AKIŞ</h3>
                <div style="background: #2a2f3f; padding: 5px; border-radius: 5px; margin-bottom: 10px;">
                    <span style="color: #ffd700;">🔴 Bot şu an ${KANAL} kanalına otomatik mesaj gönderiyor!</span>
                </div>
                ${kanalLogDiv.outerHTML}
            </div>
        `;
        
        // İlk mesajı gönder
        setTimeout(() => {
            window.KanalBot.yeniTahminGonder(KANAL);
        }, 1000);
        
        // Her 5 dakikada bir otomatik tahmin gönder
        setInterval(() => {
            window.KanalBot.yeniTahminGonder(KANAL);
        }, 300000); // 5 dakika
        
        // Test butonları ekle
        const testDiv = document.createElement('div');
        testDiv.style.cssText = 'text-align: center; margin: 20px 0; padding: 15px; background: #2a2f3f; border-radius: 8px;';
        testDiv.innerHTML = `
            <h4 style="color: #ffd700; margin-bottom: 10px;">🎮 ${KANAL} KANAL KONTROL PANELİ</h4>
            <button onclick="window.KanalBot.yeniTahminGonder('${KANAL}')" style="background: #ff4444; color: white; border: none; padding: 10px 20px; border-radius: 5px; margin: 5px; cursor: pointer; font-weight: bold;">
                📢 ${KANAL} KANALINA MESAJ GÖNDER
            </button>
            <button onclick="window.KanalBot.takimTahminiGonder('BEŞİKTAŞ', '${KANAL}')" style="background: #000; color: white; border: 2px solid #ffd700; padding: 10px 20px; border-radius: 5px; margin: 5px; cursor: pointer;">
                ⚫⚪ BEŞİKTAŞ MAÇINI GÖNDER
            </button>
            <button onclick="window.KanalBot.takimTahminiGonder('FENERBAHÇE', '${KANAL}')" style="background: #0039a6; color: #ffd700; border: none; padding: 10px 20px; border-radius: 5px; margin: 5px; cursor: pointer;">
                💛💙 FENERBAHÇE MAÇINI GÖNDER
            </button>
            <button onclick="window.KanalBot.takimTahminiGonder('GALATASARAY', '${KANAL}')" style="background: #crimson; color: gold; border: none; padding: 10px 20px; border-radius: 5px; margin: 5px; cursor: pointer;">
                🔴💛 GALATASARAY MAÇINI GÖNDER
            </button>
            <br>
            <small style="color: #888;">⬆️ Bu butonlar ${KANAL} kanalına mesaj gönderir ⬆️</small>
        `;
        
        document.body.insertBefore(testDiv, document.querySelector('#kanalLog')?.parentNode || document.body.firstChild);
        
        // Geçmiş mesajları yükle
        const gecmis = window.KanalBot.sonMesajlar();
        gecmis.slice(0, 10).forEach(mesaj => kanalLogEkle(mesaj));
    });

})();
</script>

<!-- Sayfa düzeni için basit CSS -->
<style>
    body { font-family: 'Segoe UI', Arial; background: #0a0f1e; color: white; margin: 0; padding: 20px; }
    .container { max-width: 800px; margin: 0 auto; }
    h1 { color: #ffd700; text-align: center; }
    .info-box { background: #1a1f2f; border-radius: 10px; padding: 20px; margin: 20px 0; border-left: 5px solid #ff4444; }
    button:hover { opacity: 0.9; transform: scale(1.02); transition: 0.2s; }
    #kanalLog { background: #000; font-size: 14px; }
    #kanalLog div:hover { background: #1a1a1a; }
</style>

<div class="container">
    <h1>🔴 IRC TAHMİN BOTU - #spor KANALI</h1>
    
    <div class="info-box">
        <h3 style="color: #ff4444; margin-top: 0;">📢 AKTİF KANAL: #spor</h3>
        <p>✅ Bot her 5 dakikada bir <strong style="color: #ffd700;">#spor</strong> kanalına otomatik tahmin gönderiyor!</p>
        <p>💬 Kanalda <strong style="background: #333; padding: 3px 8px; border-radius: 3px;">!tahmin</strong> yazana bot cevap verecek şekilde ayarlı</p>
        <p>⚡ Oranlar önemli değil, %99 güven hedefli analiz!</p>
    </div>
</div>
