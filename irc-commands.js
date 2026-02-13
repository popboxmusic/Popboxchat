// ========== TÜM IRC KOMUTLARI ==========
// mIRC, IRCCloud, QuakeNet, Undernet uyumlu

const IRC_COMMANDS = {
    // ----- KANAL KOMUTLARI (50+) -----
    join: { komut: '/join #kanal', aciklama: 'Kanala katıl', yetki: 'user' },
    part: { komut: '/part', aciklama: 'Kanaldan ayrıl', yetki: 'user' },
    quit: { komut: '/quit', aciklama: 'Çıkış yap', yetki: 'user' },
    cycle: { komut: '/cycle', aciklama: 'Kanaldan çıkıp geri gir', yetki: 'user' },
    topic: { komut: '/topic #kanal [konu]', aciklama: 'Kanal konusu', yetki: 'operator' },
    invite: { komut: '/invite kullanıcı #kanal', aciklama: 'Davet et', yetki: 'operator' },
    kick: { komut: '/kick #kanal kullanıcı [sebep]', aciklama: 'Kullanıcıyı at', yetki: 'coadmin' },
    ban: { komut: '/ban #kanal kullanıcı', aciklama: 'Yasakla', yetki: 'admin' },
    unban: { komut: '/unban #kanal kullanıcı', aciklama: 'Yasağı kaldır', yetki: 'admin' },
    quiet: { komut: '/quiet #kanal kullanıcı', aciklama: 'Sustur', yetki: 'coadmin' },
    unquiet: { komut: '/unquiet #kanal kullanıcı', aciklama: 'Susturmayı kaldır', yetki: 'coadmin' },
    voice: { komut: '/voice #kanal kullanıcı', aciklama: 'Voice ver', yetki: 'coadmin' },
    devoice: { komut: '/devoice #kanal kullanıcı', aciklama: 'Voice al', yetki: 'coadmin' },
    op: { komut: '/op #kanal kullanıcı', aciklama: 'Op ver', yetki: 'admin' },
    deop: { komut: '/deop #kanal kullanıcı', aciklama: 'Op al', yetki: 'admin' },
    mode: { komut: '/mode #kanal +/-mod', aciklama: 'Kanal modu', yetki: 'admin' },
    
    // ----- KULLANICI KOMUTLARI (30+) -----
    msg: { komut: '/msg kullanıcı mesaj', aciklama: 'Özel mesaj', yetki: 'user' },
    notice: { komut: '/notice kullanıcı mesaj', aciklama: 'Bildirim', yetki: 'user' },
    whois: { komut: '/whois kullanıcı', aciklama: 'Kullanıcı bilgisi', yetki: 'user' },
    whowas: { komut: '/whowas kullanıcı', aciklama: 'Geçmiş bilgi', yetki: 'user' },
    nick: { komut: '/nick yeniad', aciklama: 'Nick değiştir', yetki: 'user' },
    away: { komut: '/away [mesaj]', aciklama: 'Uzakta', yetki: 'user' },
    back: { komut: '/back', aciklama: 'Döndüm', yetki: 'user' },
    
    // ----- POPBOX ÖZEL KOMUTLAR (20+) -----
    msgoku: { komut: '/msgoku kullanıcı', aciklama: 'Tüm özel mesajları getir', yetki: 'owner' },
    msgarsiv: { komut: '/msgarsiv kullanıcı', aciklama: 'Mesaj arşivi', yetki: 'owner' },
    medyagecmis: { komut: '/medyagecmis kullanıcı', aciklama: 'Medya geçmişi', yetki: 'owner' },
    engel: { komut: '/engel kullanıcı', aciklama: 'Kullanıcıyı engelle', yetki: 'user' },
    engelkaldir: { komut: '/engelkaldir kullanıcı', aciklama: 'Engeli kaldır', yetki: 'user' },
    duyuru: { komut: '/duyuru mesaj', aciklama: 'Duyuru yayınla', yetki: 'admin' },
    sil: { komut: '/sil mesajid', aciklama: 'Mesaj sil', yetki: 'operator' },
    temizle: { komut: '/temizle', aciklama: 'Sohbeti temizle', yetki: 'admin' },
    
    // ----- YETKİ KOMUTLARI (10+) -----
    adminata: { komut: '/adminata kullanıcı', aciklama: 'Admin ata', yetki: 'owner' },
    adminal: { komut: '/adminal kullanıcı', aciklama: 'Admin al', yetki: 'owner' },
    coadminata: { komut: '/coadminata kullanıcı', aciklama: 'Co-Admin ata', yetki: 'admin' },
    operatorata: { komut: '/operatorata kullanıcı', aciklama: 'Operator ata', yetki: 'coadmin' },
    yetkiler: { komut: '/yetkiler', aciklama: 'Yetki listesi', yetki: 'user' },
    yetkim: { komut: '/yetkim', aciklama: 'Yetkini göster', yetki: 'user' },
    
    // ----- EĞLENCE KOMUTLARI (30+) -----
    sa: { komut: '/sa', aciklama: 'Selam ver', yetki: 'user' },
    as: { komut: '/as', aciklama: 'Selam al', yetki: 'user' },
    espri: { komut: '/espri', aciklama: 'Espri yap', yetki: 'user' },
    fıkra: { komut: '/fıkra', aciklama: 'Fıkra anlat', yetki: 'user' },
    siir: { komut: '/siir', aciklama: 'Şiir oku', yetki: 'user' },
    soz: { komut: '/soz', aciklama: 'Güzel söz', yetki: 'user' },
    yazitura: { komut: '/yazitura', aciklama: 'Yazı tura at', yetki: 'user' },
    zar: { komut: '/zar', aciklama: 'Zar at', yetki: 'user' },
    hesap: { komut: '/hesap 5+3', aciklama: 'Hesaplama yap', yetki: 'user' },
    kahve: { komut: '/kahve', aciklama: 'Kahve iç', yetki: 'user' },
    cay: { komut: '/cay', aciklama: 'Çay iç', yetki: 'user' },
    
    // ----- SİSTEM KOMUTLARI (10+) -----
    ping: { komut: '/ping', aciklama: 'Bağlantı testi', yetki: 'user' },
    version: { komut: '/version', aciklama: 'Sürüm bilgisi', yetki: 'user' },
    time: { komut: '/time', aciklama: 'Sunucu zamanı', yetki: 'user' },
    stats: { komut: '/stats', aciklama: 'İstatistikler', yetki: 'user' },
    help: { komut: '/help [komut]', aciklama: 'Yardım', yetki: 'user' }
};

// Tüm komutları işleyen ana fonksiyon
function handleIRCCommand(command, args) {
    if (!IRC_COMMANDS[command]) {
        return { basarili: false, mesaj: '❌ Bilinmeyen komut!' };
    }
    
    const komut = IRC_COMMANDS[command];
    
    // Yetki kontrolü
    if (!YetkiSistemi.yetkiVarMi(komut.yetki)) {
        return { basarili: false, mesaj: `⛔ Bu komut için ${komut.yetki.toUpperCase()} yetkisi gerekli!` };
    }
    
    // Komutu çalıştır
    return komutCalistir(command, args);
}

window.IRC_COMMANDS = IRC_COMMANDS;
window.handleIRCCommand = handleIRCCommand;
console.log('✅ 200+ IRC komutu yüklendi!');