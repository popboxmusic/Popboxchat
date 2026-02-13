// ========== POPBOX YETKİ SİSTEMİ ==========
// Sadece OWNER admin atayabilir!

const YetkiSistemi = {
    // Yetki seviyeleri
    seviyeler: {
        'owner': 100,
        'admin': 80,
        'coadmin': 60,
        'operator': 40,
        'user': 20,
        'misafir': 0
    },

    // Admin atama - SADECE OWNER
    adminAta: function(kullaniciAdi) {
        if (!currentUser || !isOwner) {
            return { basarili: false, mesaj: '⛔ Sadece OWNER admin atayabilir!' };
        }
        
        if (!kullaniciAdi) {
            return { basarili: false, mesaj: '❌ Kullanıcı adı gerekli!' };
        }

        // Firebase'de kullanıcıyı admin yap
        if (database) {
            database.ref(`onlineUsers/${kullaniciAdi}`).update({
                role: 'admin',
                roleLevel: 80,
                atayan: currentUser.name,
                atamaTarihi: Date.now()
            });
            
            // Log kaydı
            database.ref('adminLogs').push({
                islem: 'admin_ata',
                yapan: currentUser.name,
                hedef: kullaniciAdi,
                timestamp: Date.now()
            });
            
            return { basarili: true, mesaj: `✅ ${kullaniciAdi} artık ADMIN! (Yetki: Owner)` };
        }
        
        return { basarili: false, mesaj: '❌ Veritabanı hatası!' };
    },

    // Admin alma - SADECE OWNER
    adminAl: function(kullaniciAdi) {
        if (!currentUser || !isOwner) {
            return { basarili: false, mesaj: '⛔ Sadece OWNER admin alabilir!' };
        }

        if (database) {
            database.ref(`onlineUsers/${kullaniciAdi}`).update({
                role: 'user',
                roleLevel: 20,
                alan: currentUser.name,
                almaTarihi: Date.now()
            });
            
            return { basarili: true, mesaj: `✅ ${kullaniciAdi} kullanıcısının admin yetkisi alındı!` };
        }
    },

    // Co-Admin atama - ADMIN ve OWNER
    coAdminAta: function(kullaniciAdi) {
        if (!currentUser || !(isOwner || isAdmin)) {
            return { basarili: false, mesaj: '⛔ Sadece OWNER ve ADMIN co-admin atayabilir!' };
        }

        if (database) {
            database.ref(`onlineUsers/${kullaniciAdi}`).update({
                role: 'coadmin',
                roleLevel: 60,
                atayan: currentUser.name,
                atamaTarihi: Date.now()
            });
            
            return { basarili: true, mesaj: `✅ ${kullaniciAdi} artık CO-ADMIN!` };
        }
    },

    // Operator atama - ADMIN, CO-ADMIN ve OWNER
    operatorAta: function(kullaniciAdi) {
        if (!currentUser || !(isOwner || isAdmin || isCoAdmin)) {
            return { basarili: false, mesaj: '⛔ Yetkiniz yok!' };
        }

        if (database) {
            database.ref(`onlineUsers/${kullaniciAdi}`).update({
                role: 'operator',
                roleLevel: 40,
                atayan: currentUser.name,
                atamaTarihi: Date.now()
            });
            
            return { basarili: true, mesaj: `✅ ${kullaniciAdi} artık OPERATOR!` };
        }
    },

    // Yetki kontrolü
    yetkiVarMi: function(gerekliSeviye) {
        if (!currentUser) return false;
        if (isOwner) return true; // Owner her şeyi yapabilir
        
        const userSeviye = this.seviyeler[currentUser.role] || 0;
        const gerekli = this.seviyeler[gerekliSeviye] || 0;
        
        return userSeviye >= gerekli;
    },

    // Yetki listesi
    yetkiListesi: function() {
        return {
            '👑 OWNER': [
                '➕ Admin atayabilir',
                '➖ Admin alabilir',
                '👁️ Tüm özel mesajları görebilir',
                '🗑️ Tüm mesajları silebilir',
                '📢 Duyuru yapabilir',
                '🚫 Global ban atabilir',
                '⚙️ Sistemi yönetir',
                '👥 Tüm yetkileri atayabilir'
            ],
            '⚡ ADMIN': [
                '❌ Admin atayamaz (SADECE OWNER)',
                '🔧 Co-Admin atayabilir',
                '👤 Operator atayabilir',
                '👁️ Rapor edilen mesajları görebilir',
                '🗑️ Kendi yetkisindeki mesajları silebilir',
                '📢 Duyuru yapabilir',
                '🚫 Kanal ban atabilir'
            ],
            '🔧 CO-ADMIN': [
                '🛡️ Operator atayabilir',
                '👁️ Şikayet edilen mesajları görebilir',
                '🗑️ Playlist yönetimi',
                '🚫 Kanal kick atabilir',
                '🔇 Susturma yetkisi'
            ],
            '🛡️ OPERATOR': [
                '🔇 Susturma yetkisi',
                '🗑️ Kendi kanalında mesaj silebilir',
                '👁️ Basit moderasyon',
                '⚠️ Uyarı verebilir'
            ]
        };
    }
};

// ========== OWNER KOMUT PANELİ YETKİLER ==========
function ownerAdminAta() {
    const kullanici = prompt('Admin yapılacak kullanıcı adı:');
    if (kullanici) {
        const sonuc = YetkiSistemi.adminAta(kullanici);
        addSystemMessage(sonuc.mesaj);
    }
}

function ownerAdminAl() {
    const kullanici = prompt('Admin yetkisi alınacak kullanıcı adı:');
    if (kullanici) {
        const sonuc = YetkiSistemi.adminAl(kullanici);
        addSystemMessage(sonuc.mesaj);
    }
}

// ========== YETKİ KOMUTLARI ==========
function yetkiKomutlari() {
    let mesaj = '👑 **YETKİ KOMUTLARI**\n';
    mesaj += '─────────────────\n';
    mesaj += '🔹 /adminata [kullanıcı] - Admin ata (SADECE OWNER)\n';
    mesaj += '🔹 /adminal [kullanıcı] - Admin yetkisini al (SADECE OWNER)\n';
    mesaj += '🔹 /coadminata [kullanıcı] - Co-Admin ata (Admin+)\n';
    mesaj += '🔹 /operatorata [kullanıcı] - Operator ata (Co-Admin+)\n';
    mesaj += '🔹 /yetkiler - Yetki listesini göster\n';
    mesaj += '🔹 /yetkim - Kendi yetkini göster\n';
    addSystemMessage(mesaj);
}

// /yetkim komutu
function yetkim() {
    if (!currentUser) {
        addSystemMessage('❌ Giriş yapmamışsınız!');
        return;
    }
    
    let rolIcon = '';
    if (currentUser.role === 'owner') rolIcon = '👑';
    else if (currentUser.role === 'admin') rolIcon = '⚡';
    else if (currentUser.role === 'coadmin') rolIcon = '🔧';
    else if (currentUser.role === 'operator') rolIcon = '🛡️';
    else rolIcon = '👤';
    
    let mesaj = `${rolIcon} **${currentUser.name}**\n`;
    mesaj += `─────────────────\n`;
    mesaj += `🔰 Rol: **${currentUser.role.toUpperCase()}**\n`;
    mesaj += `📊 Seviye: ${YetkiSistemi.seviyeler[currentUser.role] || 20}\n`;
    
    // Yetkileri göster
    const yetkiListesi = YetkiSistemi.yetkiListesi();
    if (currentUser.role === 'owner') {
        mesaj += `\n👑 **OWNER YETKİLERİ:**\n`;
        yetkiListesi['👑 OWNER'].forEach(y => mesaj += `  ${y}\n`);
    } else if (currentUser.role === 'admin') {
        mesaj += `\n⚡ **ADMIN YETKİLERİ:**\n`;
        yetkiListesi['⚡ ADMIN'].forEach(y => mesaj += `  ${y}\n`);
    } else if (currentUser.role === 'coadmin') {
        mesaj += `\n🔧 **CO-ADMIN YETKİLERİ:**\n`;
        yetkiListesi['🔧 CO-ADMIN'].forEach(y => mesaj += `  ${y}\n`);
    } else if (currentUser.role === 'operator') {
        mesaj += `\n🛡️ **OPERATOR YETKİLERİ:**\n`;
        yetkiListesi['🛡️ OPERATOR'].forEach(y => mesaj += `  ${y}\n`);
    }
    
    addSystemMessage(mesaj);
}

console.log('✅ Yetki sistemi yüklendi!');