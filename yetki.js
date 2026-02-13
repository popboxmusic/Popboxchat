// ========== POPBOX YETKİ SİSTEMİ ==========
// SADECE OWNER ADMIN ATABİLİR!

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

    // ADMIN ATA - SADECE OWNER!
    adminAta: function(kullaniciAdi) {
        if (!window.currentUser || !window.isOwner) {
            return { basarili: false, mesaj: '⛔ Sadece OWNER admin atayabilir!' };
        }
        
        if (!kullaniciAdi) {
            return { basarili: false, mesaj: '❌ Kullanıcı adı gerekli!' };
        }

        if (window.database) {
            window.database.ref(`onlineUsers/${kullaniciAdi}`).update({
                role: 'admin',
                roleLevel: 80,
                atayan: window.currentUser.name,
                atamaTarihi: Date.now()
            });
            
            window.database.ref('yetkiLoglari').push({
                islem: 'ADMIN_ATA',
                yapan: window.currentUser.name,
                hedef: kullaniciAdi,
                timestamp: Date.now()
            });
            
            return { basarili: true, mesaj: `✅ ${kullaniciAdi} artık ADMIN! (Yetki: OWNER)` };
        }
        
        return { basarili: false, mesaj: '❌ Veritabanı hatası!' };
    },

    // ADMIN AL - SADECE OWNER!
    adminAl: function(kullaniciAdi) {
        if (!window.currentUser || !window.isOwner) {
            return { basarili: false, mesaj: '⛔ Sadece OWNER admin alabilir!' };
        }

        if (window.database) {
            window.database.ref(`onlineUsers/${kullaniciAdi}`).update({
                role: 'user',
                roleLevel: 20,
                alan: window.currentUser.name,
                almaTarihi: Date.now()
            });
            
            return { basarili: true, mesaj: `✅ ${kullaniciAdi} kullanıcısının admin yetkisi alındı!` };
        }
    },

    // Co-Admin ata - ADMIN ve OWNER
    coAdminAta: function(kullaniciAdi) {
        if (!window.currentUser || !(window.isOwner || window.isAdmin)) {
            return { basarili: false, mesaj: '⛔ Sadece OWNER ve ADMIN co-admin atayabilir!' };
        }

        if (window.database) {
            window.database.ref(`onlineUsers/${kullaniciAdi}`).update({
                role: 'coadmin',
                roleLevel: 60,
                atayan: window.currentUser.name,
                atamaTarihi: Date.now()
            });
            
            return { basarili: true, mesaj: `✅ ${kullaniciAdi} artık CO-ADMIN!` };
        }
    },

    // Operator ata - ADMIN, CO-ADMIN ve OWNER
    operatorAta: function(kullaniciAdi) {
        if (!window.currentUser || !(window.isOwner || window.isAdmin || window.isCoAdmin)) {
            return { basarili: false, mesaj: '⛔ Yetkiniz yok!' };
        }

        if (window.database) {
            window.database.ref(`onlineUsers/${kullaniciAdi}`).update({
                role: 'operator',
                roleLevel: 40,
                atayan: window.currentUser.name,
                atamaTarihi: Date.now()
            });
            
            return { basarili: true, mesaj: `✅ ${kullaniciAdi} artık OPERATOR!` };
        }
    },

    // Yetki kontrolü
    yetkiVarMi: function(gerekliRol) {
        if (!window.currentUser) return false;
        if (window.isOwner) return true;
        
        const userSeviye = this.seviyeler[window.currentUser.role] || 0;
        const gerekliSeviye = this.seviyeler[gerekliRol] || 0;
        
        return userSeviye >= gerekliSeviye;
    },

    // Yetki listesi
    yetkiListesi: function() {
        return {
            'owner': ['👑 Tüm yetkiler', '➕ Admin atama', '➖ Admin alma', '👁️ Tüm mesajlar', '🗑️ Tüm silme', '📢 Duyuru', '🚫 Global ban'],
            'admin': ['🔧 Co-Admin atama', '👤 Operator atama', '👁️ Rapor mesajları', '🗑️ Yetki mesaj silme', '📢 Duyuru', '🚫 Kanal ban'],
            'coadmin': ['🛡️ Operator atama', '👁️ Şikayet mesajları', '🗑️ Playlist yönetimi', '🚫 Kanal kick', '🔇 Susturma'],
            'operator': ['🔇 Susturma', '🗑️ Kanal mesaj silme', '⚠️ Uyarı']
        };
    }
};

// Global yap
window.YetkiSistemi = YetkiSistemi;
console.log('✅ Yetki sistemi yüklendi!');