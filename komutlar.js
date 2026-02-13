// PopboxCommands içine EKLE:

// Admin ata - SADECE OWNER
adminata: function(args) {
    const kullanici = args[0];
    if (!kullanici) {
        PopboxUtils.sendMessage('❌ Kullanıcı adı gerekli! Örnek: /adminata Ahmet');
        return;
    }
    
    if (!isOwner) {
        PopboxUtils.sendMessage('⛔ Sadece OWNER admin atayabilir!');
        return;
    }
    
    const sonuc = YetkiSistemi.adminAta(kullanici);
    PopboxUtils.sendMessage(sonuc.mesaj);
},

// Admin al - SADECE OWNER
adminal: function(args) {
    const kullanici = args[0];
    if (!kullanici) {
        PopboxUtils.sendMessage('❌ Kullanıcı adı gerekli! Örnek: /adminal Ahmet');
        return;
    }
    
    if (!isOwner) {
        PopboxUtils.sendMessage('⛔ Sadece OWNER admin alabilir!');
        return;
    }
    
    const sonuc = YetkiSistemi.adminAl(kullanici);
    PopboxUtils.sendMessage(sonuc.mesaj);
},

// Co-Admin ata - ADMIN ve OWNER
coadminata: function(args) {
    const kullanici = args[0];
    if (!kullanici) {
        PopboxUtils.sendMessage('❌ Kullanıcı adı gerekli!');
        return;
    }
    
    const sonuc = YetkiSistemi.coAdminAta(kullanici);
    PopboxUtils.sendMessage(sonuc.mesaj);
},

// Operator ata - CO-ADMIN, ADMIN, OWNER
operatorata: function(args) {
    const kullanici = args[0];
    if (!kullanici) {
        PopboxUtils.sendMessage('❌ Kullanıcı adı gerekli!');
        return;
    }
    
    const sonuc = YetkiSistemi.operatorAta(kullanici);
    PopboxUtils.sendMessage(sonuc.mesaj);
},

// Yetki listesi
yetkiler: function() {
    const listeler = YetkiSistemi.yetkiListesi();
    let mesaj = '👑 **YETKİ HİYERARŞİSİ**\n';
    mesaj += '─────────────────\n\n';
    
    mesaj += '👑 **OWNER** (Seviye 100)\n';
    listeler['👑 OWNER'].forEach(y => mesaj += `  ${y}\n`);
    mesaj += '\n';
    
    mesaj += '⚡ **ADMIN** (Seviye 80)\n';
    mesaj += '  ⚠️ SADECE OWNER atayabilir!\n';
    listeler['⚡ ADMIN'].forEach(y => mesaj += `  ${y}\n`);
    mesaj += '\n';
    
    mesaj += '🔧 **CO-ADMIN** (Seviye 60)\n';
    listeler['🔧 CO-ADMIN'].forEach(y => mesaj += `  ${y}\n`);
    mesaj += '\n';
    
    mesaj += '🛡️ **OPERATOR** (Seviye 40)\n';
    listeler['🛡️ OPERATOR'].forEach(y => mesaj += `  ${y}\n`);
    
    PopboxUtils.sendMessage(mesaj);
},

// Kendi yetkini göster
yetkim: function() {
    if (!currentUser) {
        PopboxUtils.sendMessage('❌ Giriş yapmamışsınız!');
        return;
    }
    
    yetkim(); // Yukarıdaki fonksiyon
},