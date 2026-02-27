// ========== ADMIN.JS - TÜM KOMUTLAR VE YETKİLER ==========
// Admin yetkileri ÇOĞALTILDI: Admin sistemde her şeyi yapar, co-admin atar/siler, operator atar/siler
// Owner'dan sonra en yetkili kişi

// ========== GLOBAL DEĞİŞKENLER ==========
let currentUser = null;
let currentChannel = 'genel';
let USERS_DB = JSON.parse(localStorage.getItem('cetcety_users')) || [];
let channels = JSON.parse(localStorage.getItem('cetcety_channels')) || {};
let BANNED_WORDS = JSON.parse(localStorage.getItem('cetcety_banned_words')) || ['spam', 'reklam', 'şiddet', 'hakaret'];
let CUSTOM_COMMANDS = JSON.parse(localStorage.getItem('cetcety_custom_commands')) || [];
let BLOCKED_USERS = JSON.parse(localStorage.getItem('cetcety_blocks')) || {};

// Owner özel değişkenler
let PRIVATE_SPY_CHANNELS = JSON.parse(localStorage.getItem('cetcety_private_spy')) || {};
let PRIVATE_SPY_ACTIVE = false;
let PRIVATE_SPY_CURRENT_CHANNEL = null;
let SUPER_HIDDEN_CHANNELS = JSON.parse(localStorage.getItem('cetcety_super_hidden')) || [];

const OWNER_PASSWORD = 'Sahi17407@SCM';

// ========== YETKİ KONTROL FONKSİYONLARI ==========
function hasRole(requiredRole) {
    if (!currentUser) return false;
    
    const roles = {
        'user': 1,
        'operator': 2,
        'coadmin': 3,
        'admin': 4,
        'owner': 5
    };
    
    return roles[currentUser.role] >= roles[requiredRole];
}

// ========== ADMIN YETKİLERİ (ÇOĞALTILMIŞ) ==========

// Admin her şeyi yapar:
// - Kullanıcı yasaklama / yasak kaldırma
// - Co-admin atama / silme
// - Operator atama / silme
// - Kanal gizleme / gösterme
// - Yasaklı kelime ekleme / silme (owner ile birlikte)
// - Özel komut ekleme / silme (owner ile birlikte)
// - Herkesin mesajlarını silme
// - Admin kanalına erişim

// ========== KULLANICI YÖNETİMİ ==========

// Kullanıcıyı yasakla (ban)
function banUser(username, duration = 24, reason = 'Belirtilmemiş') {
    if (!hasRole('admin')) {
        addSystemMessage('⛔ Bu komutu sadece admin ve üzeri kullanabilir!');
        return;
    }
    
    if (!username) {
        addSystemMessage('Kullanım: /ban [kullanıcı] [saat] [sebep]');
        return;
    }
    
    if (username.toLowerCase() === 'mateky') {
        addSystemMessage('⛔ Owner yasaklanamaz!');
        return;
    }
    
    const user = USERS_DB.find(u => u.name.toLowerCase() === username.toLowerCase());
    if (!user) {
        addSystemMessage('❌ Kullanıcı bulunamadı!');
        return;
    }
    
    // Admin başka admini yasaklayamaz (sadece owner)
    if (user.role === 'admin' && currentUser.role !== 'owner') {
        addSystemMessage('⛔ Adminleri sadece owner yasaklayabilir!');
        return;
    }
    
    const blockKey = `${currentUser.id}_${user.id}`;
    const banUntil = Date.now() + (parseInt(duration) * 60 * 60 * 1000);
    
    BLOCKED_USERS[blockKey] = {
        userId: user.id,
        userName: user.name,
        bannedUntil: banUntil,
        bannedBy: currentUser.name,
        bannedByRole: currentUser.role,
        reason: reason,
        timestamp: Date.now()
    };
    
    localStorage.setItem('cetcety_blocks', JSON.stringify(BLOCKED_USERS));
    
    // Kullanıcıyı kanaldan çıkar
    if (channels[currentChannel] && channels[currentChannel].onlineUsers) {
        channels[currentChannel].onlineUsers = channels[currentChannel].onlineUsers.filter(u => u !== user.name);
        saveChannels();
    }
    
    addBanMessage(`🚫 ${user.name} kullanıcısı ${duration} saat yasaklandı!\nSebep: ${reason}\nYasaklayan: ${currentUser.name} (${currentUser.role})`);
    sendToAdminChannel(`🚫 ${currentUser.name}, ${user.name} kullanıcısını ${duration} saat yasakladı. Sebep: ${reason}`);
}

// Yasağı kaldır (unban)
function unbanUser(username) {
    if (!hasRole('admin')) {
        addSystemMessage('⛔ Bu komutu sadece admin ve üzeri kullanabilir!');
        return;
    }
    
    if (!username) {
        addSystemMessage('Kullanım: /unban [kullanıcı]');
        return;
    }
    
    let found = false;
    
    for (let key in BLOCKED_USERS) {
        if (BLOCKED_USERS[key].userName.toLowerCase() === username.toLowerCase()) {
            // Admin başka adminin banını kaldıramaz (sadece owner)
            if (BLOCKED_USERS[key].bannedByRole === 'admin' && currentUser.role !== 'owner') {
                addSystemMessage('⛔ Adminlerin attığı banları sadece owner kaldırabilir!');
                return;
            }
            
            delete BLOCKED_USERS[key];
            found = true;
            break;
        }
    }
    
    if (found) {
        localStorage.setItem('cetcety_blocks', JSON.stringify(BLOCKED_USERS));
        addSystemMessage(`✅ ${username} yasağı kaldırıldı.`);
        sendToAdminChannel(`✅ ${currentUser.name}, ${username} kullanıcısının yasağını kaldırdı.`);
    } else {
        addSystemMessage(`❌ ${username} için yasak bulunamadı.`);
    }
}

// Ban listesini göster
function showBanList() {
    const now = Date.now();
    let activeBans = [];
    
    for (let key in BLOCKED_USERS) {
        if (BLOCKED_USERS[key].bannedUntil > now) {
            activeBans.push(BLOCKED_USERS[key]);
        }
    }
    
    if (activeBans.length === 0) {
        addBanMessage('✅ Aktif yasaklı kullanıcı yok.');
        return;
    }
    
    let message = '🚫 **AKTİF YASAKLILAR:**\n\n';
    activeBans.forEach(ban => {
        const remaining = Math.ceil((ban.bannedUntil - now) / (60 * 60 * 1000));
        message += `• ${ban.userName}\n  Yasaklayan: ${ban.bannedBy} (${ban.bannedByRole})\n  Kalan: ${remaining} saat\n  Sebep: ${ban.reason}\n\n`;
    });
    
    addBanMessage(message);
}

// ========== YETKİ ATAMA ==========

// Co-admin ata (admin yapabilir)
function addCoAdmin(username) {
    if (!hasRole('admin')) {
        addSystemMessage('⛔ Bu komutu sadece admin ve üzeri kullanabilir!');
        return;
    }
    
    if (!username) {
        addSystemMessage('Kullanım: /coadmin [kullanıcı]');
        return;
    }
    
    const user = USERS_DB.find(u => u.name.toLowerCase() === username.toLowerCase());
    if (!user) {
        addSystemMessage('❌ Kullanıcı bulunamadı!');
        return;
    }
    
    if (user.role === 'coadmin') {
        addSystemMessage(`ℹ️ ${username} zaten co-admin.`);
        return;
    }
    
    if (user.role === 'admin' || user.role === 'owner') {
        addSystemMessage(`⛔ ${username} zaten daha yüksek yetkili.`);
        return;
    }
    
    user.role = 'coadmin';
    user.roleLevel = 3;
    
    // Kullanıcıyı güncelle
    const index = USERS_DB.findIndex(u => u.id === user.id);
    if (index !== -1) {
        USERS_DB[index] = user;
        localStorage.setItem('cetcety_users', JSON.stringify(USERS_DB));
    }
    
    // Kanal co-admin listesine ekle
    if (channels[currentChannel]) {
        if (!channels[currentChannel].coAdmins) channels[currentChannel].coAdmins = [];
        if (!channels[currentChannel].coAdmins.includes(user.name)) {
            channels[currentChannel].coAdmins.push(user.name);
            saveChannels();
        }
    }
    
    addSystemMessage(`🔧 ${username} artık co-admin!`);
    sendToAdminChannel(`🔧 ${currentUser.name}, ${username} kullanıcısını co-admin yaptı.`);
}

// Co-admin yetkisini al
function removeCoAdmin(username) {
    if (!hasRole('admin')) {
        addSystemMessage('⛔ Bu komutu sadece admin ve üzeri kullanabilir!');
        return;
    }
    
    if (!username) {
        addSystemMessage('Kullanım: /removecoadmin [kullanıcı]');
        return;
    }
    
    const user = USERS_DB.find(u => u.name.toLowerCase() === username.toLowerCase());
    if (!user) {
        addSystemMessage('❌ Kullanıcı bulunamadı!');
        return;
    }
    
    if (user.role !== 'coadmin') {
        addSystemMessage(`ℹ️ ${username} co-admin değil.`);
        return;
    }
    
    user.role = 'user';
    user.roleLevel = 1;
    
    // Kullanıcıyı güncelle
    const index = USERS_DB.findIndex(u => u.id === user.id);
    if (index !== -1) {
        USERS_DB[index] = user;
        localStorage.setItem('cetcety_users', JSON.stringify(USERS_DB));
    }
    
    // Kanal co-admin listesinden çıkar
    for (let ch in channels) {
        if (channels[ch].coAdmins && channels[ch].coAdmins.includes(user.name)) {
            channels[ch].coAdmins = channels[ch].coAdmins.filter(u => u !== user.name);
        }
    }
    saveChannels();
    
    addSystemMessage(`🔨 ${username} co-admin yetkisi alındı.`);
    sendToAdminChannel(`🔨 ${currentUser.name}, ${username} kullanıcısının co-admin yetkisini aldı.`);
}

// Operator ata (admin yapabilir)
function addOperator(username) {
    if (!hasRole('admin')) {
        addSystemMessage('⛔ Bu komutu sadece admin ve üzeri kullanabilir!');
        return;
    }
    
    if (!username) {
        addSystemMessage('Kullanım: /operator [kullanıcı]');
        return;
    }
    
    const user = USERS_DB.find(u => u.name.toLowerCase() === username.toLowerCase());
    if (!user) {
        addSystemMessage('❌ Kullanıcı bulunamadı!');
        return;
    }
    
    if (user.role === 'operator') {
        addSystemMessage(`ℹ️ ${username} zaten operator.`);
        return;
    }
    
    if (user.role === 'coadmin' || user.role === 'admin' || user.role === 'owner') {
        addSystemMessage(`⛔ ${username} zaten daha yüksek yetkili.`);
        return;
    }
    
    user.role = 'operator';
    user.roleLevel = 2;
    
    // Kullanıcıyı güncelle
    const index = USERS_DB.findIndex(u => u.id === user.id);
    if (index !== -1) {
        USERS_DB[index] = user;
        localStorage.setItem('cetcety_users', JSON.stringify(USERS_DB));
    }
    
    addSystemMessage(`🛠️ ${username} artık operator!`);
    sendToAdminChannel(`🛠️ ${currentUser.name}, ${username} kullanıcısını operator yaptı.`);
}

// Operator yetkisini al
function removeOperator(username) {
    if (!hasRole('admin')) {
        addSystemMessage('⛔ Bu komutu sadece admin ve üzeri kullanabilir!');
        return;
    }
    
    if (!username) {
        addSystemMessage('Kullanım: /removeoperator [kullanıcı]');
        return;
    }
    
    const user = USERS_DB.find(u => u.name.toLowerCase() === username.toLowerCase());
    if (!user) {
        addSystemMessage('❌ Kullanıcı bulunamadı!');
        return;
    }
    
    if (user.role !== 'operator') {
        addSystemMessage(`ℹ️ ${username} operator değil.`);
        return;
    }
    
    user.role = 'user';
    user.roleLevel = 1;
    
    // Kullanıcıyı güncelle
    const index = USERS_DB.findIndex(u => u.id === user.id);
    if (index !== -1) {
        USERS_DB[index] = user;
        localStorage.setItem('cetcety_users', JSON.stringify(USERS_DB));
    }
    
    addSystemMessage(`🔨 ${username} operator yetkisi alındı.`);
    sendToAdminChannel(`🔨 ${currentUser.name}, ${username} kullanıcısının operator yetkisini aldı.`);
}

// ========== KANAL YÖNETİMİ ==========

// Kullanıcıyı kanaldan at (kick)
function kickUser(username) {
    if (!hasRole('operator')) {
        addSystemMessage('⛔ Bu komutu sadece operator ve üzeri kullanabilir!');
        return;
    }
    
    if (!username) {
        addSystemMessage('Kullanım: /kick [kullanıcı]');
        return;
    }
    
    if (username === currentUser.name) {
        addSystemMessage('❌ Kendinizi atamazsınız!');
        return;
    }
    
    const channel = channels[currentChannel];
    if (!channel || !channel.onlineUsers) {
        addSystemMessage('❌ Kanal bulunamadı!');
        return;
    }
    
    if (!channel.onlineUsers.includes(username)) {
        addSystemMessage(`❌ ${username} kanalda değil.`);
        return;
    }
    
    // Operator, co-admin veya admin atamaz
    const user = USERS_DB.find(u => u.name === username);
    if (user && (user.role === 'coadmin' || user.role === 'admin') && currentUser.role === 'operator') {
        addSystemMessage('⛔ Operator, co-admin veya admin atamaz!');
        return;
    }
    
    channel.onlineUsers = channel.onlineUsers.filter(u => u !== username);
    saveChannels();
    
    addSystemMessage(`👢 ${username} kanaldan atıldı.`);
    sendToAdminChannel(`👢 ${currentUser.name}, ${username} kullanıcısını #${currentChannel} kanalından attı.`);
}

// Kanalı gizle/göster
function toggleChannelVisibility() {
    if (!hasRole('admin')) {
        addSystemMessage('⛔ Bu komutu sadece admin ve üzeri kullanabilir!');
        return;
    }
    
    const channel = channels[currentChannel];
    if (!channel) return;
    
    channel.isHidden = !channel.isHidden;
    saveChannels();
    
    const status = channel.isHidden ? 'gizlendi' : 'gösteriliyor';
    addSystemMessage(`👁️ #${currentChannel} ${status}.`);
    sendToAdminChannel(`👁️ ${currentUser.name}, #${currentChannel} kanalını ${status}.`);
}

// ========== MESAJ YÖNETİMİ ==========

// Tüm mesajları temizle
function clearAllMessages() {
    if (!hasRole('operator')) {
        addSystemMessage('⛔ Bu komutu sadece operator ve üzeri kullanabilir!');
        return;
    }
    
    if (!confirm('Tüm mesajları temizlemek istediğinize emin misiniz?')) return;
    
    CHANNEL_MESSAGES[currentChannel] = [];
    localStorage.setItem('cetcety_channel_messages', JSON.stringify(CHANNEL_MESSAGES));
    
    document.getElementById('messages').innerHTML = '';
    addSystemMessage('✅ Tüm mesajlar temizlendi!');
}

// Belirli bir mesajı sil (ID ile)
function deleteMessageById(messageId) {
    if (!hasRole('operator')) {
        addSystemMessage('⛔ Bu komutu sadece operator ve üzeri kullanabilir!');
        return;
    }
    
    // Bu fonksiyon geliştirilecek
    addSystemMessage('🚧 Bu özellik yapım aşamasında.');
}

// ========== YASAKLI KELİME YÖNETİMİ ==========

// Yasaklı kelime ekle (admin ve owner yapabilir)
function addBannedWord(word) {
    if (!hasRole('admin')) {
        addSystemMessage('⛔ Bu komutu sadece admin ve üzeri kullanabilir!');
        return;
    }
    
    if (!word) {
        addSystemMessage('Kullanım: /addbanned [kelime]');
        return;
    }
    
    if (BANNED_WORDS.includes(word)) {
        addSystemMessage(`ℹ️ "${word}" zaten yasaklı listesinde.`);
        return;
    }
    
    BANNED_WORDS.push(word);
    localStorage.setItem('cetcety_banned_words', JSON.stringify(BANNED_WORDS));
    
    addSystemMessage(`🚫 "${word}" yasaklı kelimelere eklendi.`);
    sendToAdminChannel(`🚫 ${currentUser.name} yasaklı kelime ekledi: ${word}`);
}

// Yasaklı kelime kaldır (admin ve owner yapabilir)
function removeBannedWord(word) {
    if (!hasRole('admin')) {
        addSystemMessage('⛔ Bu komutu sadece admin ve üzeri kullanabilir!');
        return;
    }
    
    if (!word) {
        addSystemMessage('Kullanım: /removebanned [kelime]');
        return;
    }
    
    const index = BANNED_WORDS.indexOf(word);
    if (index === -1) {
        addSystemMessage(`❌ "${word}" yasaklı listesinde bulunamadı.`);
        return;
    }
    
    BANNED_WORDS.splice(index, 1);
    localStorage.setItem('cetcety_banned_words', JSON.stringify(BANNED_WORDS));
    
    addSystemMessage(`✅ "${word}" yasaklı kelimelerden kaldırıldı.`);
    sendToAdminChannel(`✅ ${currentUser.name} yasaklı kelime kaldırdı: ${word}`);
}

// Yasaklı kelimeleri listele
function listBannedWords() {
    if (BANNED_WORDS.length === 0) {
        addSystemMessage('📋 Yasaklı kelime bulunmuyor.');
        return;
    }
    
    let message = '🚫 **YASAKLI KELİMELER:**\n';
    BANNED_WORDS.forEach((word, i) => {
        message += `${i + 1}. ${word}\n`;
    });
    
    addSystemMessage(message);
}

// ========== ÖZEL KOMUT YÖNETİMİ ==========

// Özel komut ekle (admin ve owner yapabilir)
function addCustomCommand(cmd, response) {
    if (!hasRole('admin')) {
        addSystemMessage('⛔ Bu komutu sadece admin ve üzeri kullanabilir!');
        return;
    }
    
    if (!cmd || !response) {
        addSystemMessage('Kullanım: /addcmd [komut] [yanıt]');
        return;
    }
    
    if (!cmd.startsWith('/')) cmd = '/' + cmd;
    
    const existing = CUSTOM_COMMANDS.find(c => c.command === cmd);
    if (existing) {
        existing.response = response;
    } else {
        CUSTOM_COMMANDS.push({
            command: cmd,
            response: response,
            createdBy: currentUser.name,
            createdAt: Date.now()
        });
    }
    
    localStorage.setItem('cetcety_custom_commands', JSON.stringify(CUSTOM_COMMANDS));
    
    addSystemMessage(`✅ ${cmd} komutu eklendi/güncellendi.`);
    sendToAdminChannel(`✅ ${currentUser.name} özel komut ekledi: ${cmd}`);
}

// Özel komut sil (admin ve owner yapabilir)
function removeCustomCommand(cmd) {
    if (!hasRole('admin')) {
        addSystemMessage('⛔ Bu komutu sadece admin ve üzeri kullanabilir!');
        return;
    }
    
    if (!cmd) {
        addSystemMessage('Kullanım: /removecmd [komut]');
        return;
    }
    
    if (!cmd.startsWith('/')) cmd = '/' + cmd;
    
    const index = CUSTOM_COMMANDS.findIndex(c => c.command === cmd);
    if (index === -1) {
        addSystemMessage(`❌ ${cmd} komutu bulunamadı.`);
        return;
    }
    
    CUSTOM_COMMANDS.splice(index, 1);
    localStorage.setItem('cetcety_custom_commands', JSON.stringify(CUSTOM_COMMANDS));
    
    addSystemMessage(`🗑️ ${cmd} komutu silindi.`);
    sendToAdminChannel(`🗑️ ${currentUser.name} özel komut sildi: ${cmd}`);
}

// Özel komutları listele
function listCustomCommands() {
    if (CUSTOM_COMMANDS.length === 0) {
        addSystemMessage('📋 Özel komut bulunmuyor.');
        return;
    }
    
    let message = '🤖 **ÖZEL KOMUTLAR:**\n';
    CUSTOM_COMMANDS.forEach(c => {
        message += `${c.command} - ${c.response.substring(0, 30)}${c.response.length > 30 ? '...' : ''}\n`;
    });
    
    addSystemMessage(message);
}

// ========== KULLANICI LİSTESİ ==========

// Online kullanıcıları göster
function showOnlineUsers() {
    const channel = channels[currentChannel];
    if (!channel || !channel.onlineUsers || channel.onlineUsers.length === 0) {
        addSystemMessage(`👥 #${currentChannel} kanalında çevrimiçi kullanıcı yok.`);
        return;
    }
    
    let message = `👥 **#${currentChannel} ÇEVRİMİÇİ (${channel.onlineUsers.length}):**\n`;
    channel.onlineUsers.forEach(user => {
        const userData = USERS_DB.find(u => u.name === user);
        let roleIcon = '';
        if (userData) {
            if (userData.role === 'owner') roleIcon = '👑 ';
            else if (userData.role === 'admin') roleIcon = '⚡ ';
            else if (userData.role === 'coadmin') roleIcon = '🔧 ';
            else if (userData.role === 'operator') roleIcon = '🛠️ ';
        }
        message += `• ${roleIcon}${user}\n`;
    });
    
    addSystemMessage(message);
}

// Tüm kullanıcıları göster (admin görebilir)
function showAllUsers() {
    if (!hasRole('admin')) {
        addSystemMessage('⛔ Bu komutu sadece admin ve üzeri kullanabilir!');
        return;
    }
    
    if (USERS_DB.length === 0) {
        addSystemMessage('📋 Kayıtlı kullanıcı yok.');
        return;
    }
    
    let message = '📋 **KAYITLI KULLANICILAR:**\n';
    USERS_DB.forEach(user => {
        let roleIcon = '';
        if (user.role === 'owner') roleIcon = '👑 ';
        else if (user.role === 'admin') roleIcon = '⚡ ';
        else if (user.role === 'coadmin') roleIcon = '🔧 ';
        else if (user.role === 'operator') roleIcon = '🛠️ ';
        
        const online = user.isOnline ? '🟢' : '⚫';
        message += `${online} ${roleIcon}${user.name}\n`;
    });
    
    addSystemMessage(message);
}

// ========== ADMIN PANELİ ==========

// Admin panelini aç
function openAdminPanel() {
    if (!hasRole('admin')) {
        addSystemMessage('⛔ Admin panelini sadece admin ve üzeri kullanabilir!');
        return;
    }
    
    const panel = document.getElementById('settingsContent');
    if (!panel) return;
    
    let html = `
        <h4 style="margin-bottom:15px;">👑 Admin Paneli</h4>
        
        <div style="margin-bottom:20px;">
            <h5 style="color:#ff6b6b; margin-bottom:10px;">⚡ Yetki Atama</h5>
            <div style="display:flex; gap:5px; margin-bottom:5px;">
                <input type="text" id="adminUsername" class="form-input" placeholder="Kullanıcı adı" style="flex:1;">
                <button class="form-button" style="width:auto; padding:8px 15px;" onclick="adminAddCoAdmin()">Co-Admin Yap</button>
            </div>
            <div style="display:flex; gap:5px; margin-bottom:5px;">
                <input type="text" id="adminUsername2" class="form-input" placeholder="Kullanıcı adı" style="flex:1;">
                <button class="form-button" style="width:auto; padding:8px 15px;" onclick="adminAddOperator()">Operator Yap</button>
            </div>
        </div>
        
        <div style="margin-bottom:20px;">
            <h5 style="color:#ff6b6b; margin-bottom:10px;">🚫 Yasaklama</h5>
            <div style="display:flex; gap:5px; margin-bottom:5px;">
                <input type="text" id="banUsername" class="form-input" placeholder="Kullanıcı adı" style="flex:1;">
                <input type="number" id="banHours" class="form-input" placeholder="Saat" value="24" style="width:70px;">
                <button class="form-button danger" style="width:auto; padding:8px 15px;" onclick="adminBanUser()">Yasakla</button>
            </div>
            <div style="display:flex; gap:5px;">
                <input type="text" id="unbanUsername" class="form-input" placeholder="Kullanıcı adı" style="flex:1;">
                <button class="form-button" style="width:auto; padding:8px 15px;" onclick="adminUnbanUser()">Yasağı Kaldır</button>
            </div>
        </div>
        
        <div style="margin-bottom:20px;">
            <h5 style="color:#ff6b6b; margin-bottom:10px;">🚫 Yasaklı Kelimeler</h5>
            <div style="display:flex; gap:5px; margin-bottom:5px;">
                <input type="text" id="bannedWord" class="form-input" placeholder="Kelime" style="flex:1;">
                <button class="form-button" style="width:auto; padding:8px 15px;" onclick="adminAddBannedWord()">Ekle</button>
            </div>
            <div style="max-height:150px; overflow-y:auto; background:#1a1a1a; padding:10px; border-radius:5px;">
                ${BANNED_WORDS.map(w => `<span style="display:inline-block; background:#2a2a2a; padding:3px 8px; margin:2px; border-radius:3px;">${w} <i class="fas fa-times" style="cursor:pointer; color:#ff4444;" onclick="adminRemoveBannedWord('${w}')"></i></span>`).join('')}
            </div>
        </div>
        
        <div style="margin-bottom:20px;">
            <h5 style="color:#ff6b6b; margin-bottom:10px;">🤖 Özel Komutlar</h5>
            <div style="display:flex; gap:5px; margin-bottom:5px;">
                <input type="text" id="cmdName" class="form-input" placeholder="/komut" style="flex:1;">
                <input type="text" id="cmdResponse" class="form-input" placeholder="Yanıt" style="flex:2;">
                <button class="form-button" style="width:auto; padding:8px 15px;" onclick="adminAddCommand()">Ekle</button>
            </div>
        </div>
    `;
    
    panel.innerHTML = html;
}

// Admin paneli yardımcı fonksiyonları
function adminAddCoAdmin() {
    const username = document.getElementById('adminUsername')?.value.trim();
    if (username) {
        addCoAdmin(username);
        document.getElementById('adminUsername').value = '';
    }
}

function adminAddOperator() {
    const username = document.getElementById('adminUsername2')?.value.trim();
    if (username) {
        addOperator(username);
        document.getElementById('adminUsername2').value = '';
    }
}

function adminBanUser() {
    const username = document.getElementById('banUsername')?.value.trim();
    const hours = document.getElementById('banHours')?.value || 24;
    if (username) {
        banUser(username, hours);
        document.getElementById('banUsername').value = '';
    }
}

function adminUnbanUser() {
    const username = document.getElementById('unbanUsername')?.value.trim();
    if (username) {
        unbanUser(username);
        document.getElementById('unbanUsername').value = '';
    }
}

function adminAddBannedWord() {
    const word = document.getElementById('bannedWord')?.value.trim();
    if (word) {
        addBannedWord(word);
        document.getElementById('bannedWord').value = '';
        openAdminPanel(); // Paneli yenile
    }
}

function adminRemoveBannedWord(word) {
    if (confirm(`"${word}" kelimesini kaldırmak istediğinize emin misiniz?`)) {
        removeBannedWord(word);
        openAdminPanel(); // Paneli yenile
    }
}

function adminAddCommand() {
    const cmd = document.getElementById('cmdName')?.value.trim();
    const resp = document.getElementById('cmdResponse')?.value.trim();
    if (cmd && resp) {
        addCustomCommand(cmd, resp);
        document.getElementById('cmdName').value = '';
        document.getElementById('cmdResponse').value = '';
    }
}

// ========== OWNER ÖZEL KOMUTLAR (GİZLİ) ==========

// Owner panelini aç
function openOwnerPanel() {
    if (currentUser?.role !== 'owner') return;
    
    const panel = document.getElementById('settingsContent');
    if (!panel) return;
    
    let html = `
        <h4 style="margin-bottom:15px; color:#ffd700;">👑 Owner Paneli (GİZLİ)</h4>
        
        <div style="margin-bottom:20px;">
            <h5 style="color:#ffd700;">🔒 Süper Gizli Kanallar</h5>
            <div style="display:flex; gap:5px; margin-bottom:5px;">
                <input type="text" id="superChannelName" class="form-input" placeholder="Kanal adı" style="flex:1;">
                <button class="form-button" style="width:auto; padding:8px 15px;" onclick="createSuperHiddenChannel()">Oluştur</button>
            </div>
            <div style="max-height:100px; overflow-y:auto;">
                ${SUPER_HIDDEN_CHANNELS.map(ch => `<div style="display:flex; justify-content:space-between; padding:5px;">#${ch} <i class="fas fa-times" style="cursor:pointer; color:#ff4444;" onclick="deleteSuperHiddenChannel('${ch}')"></i></div>`).join('')}
            </div>
        </div>
        
        <div style="margin-bottom:20px;">
            <h5 style="color:#ffd700;">👁️ Özel Sohbet Takibi</h5>
            <div style="display:flex; gap:5px;">
                <input type="text" id="spyChannel" class="form-input" placeholder="Kanal adı" style="flex:1;">
                <button class="form-button" onclick="startPrivateSpy()">Başlat</button>
                <button class="form-button danger" onclick="stopPrivateSpy()">Durdur</button>
            </div>
        </div>
    `;
    
    panel.innerHTML = html;
}

// Süper gizli kanal oluştur
function createSuperHiddenChannel() {
    const name = document.getElementById('superChannelName')?.value.trim().toLowerCase();
    if (!name) return;
    
    if (channels[name]) {
        addSystemMessage(`❌ #${name} kanalı zaten mevcut!`);
        return;
    }
    
    channels[name] = {
        name: name,
        owner: 'MateKy',
        ownerRole: 'owner',
        coAdmins: [],
        subscribers: 1,
        isHidden: true,
        isSuperHidden: true,
        youtube: {
            currentVideo: 'QKEHXrDVBF8',
            currentTitle: 'LoFi Study Beats',
            currentArtist: 'Soul Cafe',
            playlist: [{
                id: 'QKEHXrDVBF8',
                title: 'LoFi Study Beats',
                addedBy: 'MateKy',
                role: 'owner'
            }]
        },
        onlineUsers: [currentUser.name]
    };
    
    SUPER_HIDDEN_CHANNELS.push(name);
    saveChannels();
    localStorage.setItem('cetcety_super_hidden', JSON.stringify(SUPER_HIDDEN_CHANNELS));
    
    if (!currentUser.subscribedChannels.includes(name)) {
        currentUser.subscribedChannels.push(name);
        localStorage.setItem('cetcety_active_user', JSON.stringify(currentUser));
    }
    
    addSystemMessage(`🔒 Süper gizli #${name} kanalı oluşturuldu! Sadece owner görebilir.`);
    openOwnerPanel();
}

// Süper gizli kanal sil
function deleteSuperHiddenChannel(name) {
    if (!confirm(`#${name} kanalını silmek istediğinize emin misiniz?`)) return;
    
    delete channels[name];
    SUPER_HIDDEN_CHANNELS = SUPER_HIDDEN_CHANNELS.filter(ch => ch !== name);
    saveChannels();
    localStorage.setItem('cetcety_super_hidden', JSON.stringify(SUPER_HIDDEN_CHANNELS));
    
    addSystemMessage(`🗑️ #${name} kanalı silindi.`);
    openOwnerPanel();
}

// Özel sohbet takibi başlat
function startPrivateSpy() {
    const channel = document.getElementById('spyChannel')?.value.trim();
    if (!channel) return;
    
    if (!channels[channel]) {
        addSystemMessage(`❌ #${channel} kanalı bulunamadı!`);
        return;
    }
    
    PRIVATE_SPY_ACTIVE = true;
    PRIVATE_SPY_CURRENT_CHANNEL = channel;
    PRIVATE_SPY_CHANNELS = { [channel]: true };
    localStorage.setItem('cetcety_private_spy', JSON.stringify(PRIVATE_SPY_CHANNELS));
    
    // Gösterge ekle
    let indicator = document.getElementById('privateSpyIndicator');
    if (indicator) indicator.remove();
    
    indicator = document.createElement('div');
    indicator.id = 'privateSpyIndicator';
    indicator.className = 'owner-spy-indicator';
    indicator.innerHTML = `
        <i class="fas fa-eye"></i> Özel Sohbet Takibi: #${channel}
        <button onclick="stopPrivateSpy()" style="background:transparent; border:none; color:white; margin-left:10px; cursor:pointer;">
            <i class="fas fa-times"></i>
        </button>
    `;
    document.body.appendChild(indicator);
    
    addSystemMessage(`👁️ #${channel} kanalında özel sohbet takibi başlatıldı.`);
}

// Özel sohbet takibi durdur
function stopPrivateSpy() {
    PRIVATE_SPY_ACTIVE = false;
    PRIVATE_SPY_CURRENT_CHANNEL = null;
    PRIVATE_SPY_CHANNELS = {};
    localStorage.setItem('cetcety_private_spy', JSON.stringify(PRIVATE_SPY_CHANNELS));
    
    const indicator = document.getElementById('privateSpyIndicator');
    if (indicator) indicator.remove();
    
    addSystemMessage('👁️ Özel sohbet takibi durduruldu.');
}

// Owner mesaj takibi (özel sohbetleri logla)
function logPrivateMessageForOwner(sender, receiver, message, type, content) {
    if (!PRIVATE_SPY_ACTIVE || !PRIVATE_SPY_CURRENT_CHANNEL) return;
    
    // Bu fonksiyon sohbet.js'den çağrılacak
    const spyContainer = document.getElementById('spyMessages');
    if (!spyContainer) return;
    
    const time = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    
    let msgHtml = '';
    if (type === 'text') {
        msgHtml = `<div style="margin-bottom:10px; padding:8px; background:#2a2a2a; border-radius:8px;">
            <span style="color:#ffd700;">${time}</span> 
            <span style="color:#fff;">${sender} → ${receiver}:</span>
            <div style="color:#ddd; margin-top:4px;">${escapeHTML(content)}</div>
        </div>`;
    } else if (type === 'image') {
        msgHtml = `<div style="margin-bottom:10px; padding:8px; background:#2a2a2a; border-radius:8px;">
            <span style="color:#ffd700;">${time}</span> 
            <span style="color:#fff;">${sender} → ${receiver}:</span>
            <div style="margin-top:4px;"><i class="fas fa-image"></i> Resim gönderildi</div>
        </div>`;
    } else if (type === 'video') {
        msgHtml = `<div style="margin-bottom:10px; padding:8px; background:#2a2a2a; border-radius:8px;">
            <span style="color:#ffd700;">${time}</span> 
            <span style="color:#fff;">${sender} → ${receiver}:</span>
            <div style="margin-top:4px;"><i class="fas fa-video"></i> Video gönderildi</div>
        </div>`;
    }
    
    spyContainer.innerHTML += msgHtml;
    spyContainer.scrollTop = spyContainer.scrollHeight;
}

// ========== YARDIMCI FONKSİYONLAR ==========

function saveChannels() {
    localStorage.setItem('cetcety_channels', JSON.stringify(channels));
}

function addSystemMessage(text) {
    // sohbet.js'den gelecek
    if (window.Chat && window.Chat.addSystemMessage) {
        window.Chat.addSystemMessage(text);
    } else {
        console.log('Sistem mesajı:', text);
    }
}

function addBanMessage(text) {
    const container = document.getElementById('messages');
    if (!container) return;
    
    const div = document.createElement('div');
    div.className = 'system-message ban-message';
    div.innerHTML = text;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function sendToAdminChannel(text) {
    // Admin kanalına mesaj gönder
    if (!channels.admin) return;
    
    const time = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    
    if (!CHANNEL_MESSAGES.admin) CHANNEL_MESSAGES.admin = [];
    
    CHANNEL_MESSAGES.admin.push({
        sender: '🔔 SİSTEM',
        text: text,
        time: time,
        timestamp: Date.now(),
        isHtml: true
    });
    
    localStorage.setItem('cetcety_channel_messages', JSON.stringify(CHANNEL_MESSAGES));
    
    if (currentChannel === 'admin') {
        addAdminMessage(text);
    }
}

function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ========== KOMUT İŞLEYİCİ ==========
function handleCommand(cmd) {
    const parts = cmd.substring(1).split(' ');
    const main = parts[0].toLowerCase();
    const args = parts.slice(1);
    
    // Özel komut kontrolü
    const custom = CUSTOM_COMMANDS.find(c => c.command === '/' + main || c.command === main);
    if (custom) {
        addSystemMessage(`🤖 ${custom.response}`);
        return;
    }
    
    switch(main) {
        // Genel komutlar
        case 'help':
            showHelp();
            break;
        case 'join':
            if (args[0]) joinChannel(args[0].replace('#', ''));
            else addSystemMessage('Kullanım: /join #kanal');
            break;
        case 'part':
            if (currentChannel !== 'genel') {
                channels[currentChannel].onlineUsers = channels[currentChannel].onlineUsers.filter(u => u !== currentUser.name);
                saveChannels();
                joinChannel('genel');
            } else {
                addSystemMessage('❌ Genel kanaldan ayrılamazsın.');
            }
            break;
        case 'users':
            showOnlineUsers();
            break;
        case 'clear':
            clearAllMessages();
            break;
            
        // Admin komutları
        case 'ban':
            banUser(args[0], args[1] || 24, args.slice(2).join(' ') || 'Belirtilmemiş');
            break;
        case 'unban':
            unbanUser(args[0]);
            break;
        case 'banlist':
            showBanList();
            break;
        case 'kick':
            kickUser(args[0]);
            break;
        case 'coadmin':
            addCoAdmin(args[0]);
            break;
        case 'removecoadmin':
            removeCoAdmin(args[0]);
            break;
        case 'operator':
        case 'op':
            addOperator(args[0]);
            break;
        case 'removeoperator':
        case 'deop':
            removeOperator(args[0]);
            break;
        case 'gizle':
            toggleChannelVisibility();
            break;
        case 'addbanned':
            addBannedWord(args.join(' '));
            break;
        case 'removebanned':
            removeBannedWord(args.join(' '));
            break;
        case 'listbanned':
            listBannedWords();
            break;
        case 'addcmd':
            addCustomCommand(args[0], args.slice(1).join(' '));
            break;
        case 'removecmd':
            removeCustomCommand(args[0]);
            break;
        case 'listcmd':
            listCustomCommands();
            break;
        case 'allusers':
            showAllUsers();
            break;
            
        // Owner komutları (gizli)
        case 'channelopen':
            if (currentUser?.role === 'owner') createSuperHiddenChannel(args[0]?.replace('#', ''));
            break;
        case 'channelsil':
            if (currentUser?.role === 'owner') deleteSuperHiddenChannel(args[0]?.replace('#', ''));
            break;
        case 'showprv':
            if (currentUser?.role === 'owner') startPrivateSpy();
            break;
        case 'stopshowprv':
            if (currentUser?.role === 'owner') stopPrivateSpy();
            break;
            
        default:
            addSystemMessage(`❌ Bilinmeyen komut: ${cmd}`);
    }
}

function showHelp() {
    let help = '📋 **KOMUTLAR**\n\n';
    
    help += '👤 **HERKES:**\n';
    help += '/help - Bu menü\n';
    help += '/join #kanal - Kanala katıl\n';
    help += '/part - Kanaldan ayrıl (genelden ayrılmaz)\n';
    help += '/users - Çevrimiçi kullanıcılar\n';
    help += '/clear - Sohbeti temizle\n\n';
    
    if (hasRole('operator')) {
        help += '🛠️ **OPERATÖR:**\n';
        help += '/kick kullanıcı - Kullanıcıyı at\n';
        help += '/clear - Tüm mesajları temizle\n\n';
    }
    
    if (hasRole('coadmin')) {
        help += '🔧 **CO-ADMIN:**\n';
        help += '/kick kullanıcı - Kullanıcıyı at\n';
        help += '/gizle - Kanalı gizle/göster\n\n';
    }
    
    if (hasRole('admin')) {
        help += '⚡ **ADMIN (ÇOĞALTILMIŞ YETKİLER):**\n';
        help += '/ban kullanıcı [saat] [sebep] - Yasakla\n';
        help += '/unban kullanıcı - Yasağı kaldır\n';
        help += '/banlist - Yasaklıları göster\n';
        help += '/coadmin kullanıcı - Co-admin yap\n';
        help += '/removecoadmin kullanıcı - Co-admin yetkisini al\n';
        help += '/operator kullanıcı - Operator yap\n';
        help += '/removeoperator kullanıcı - Operator yetkisini al\n';
        help += '/addbanned kelime - Yasaklı kelime ekle\n';
        help += '/removebanned kelime - Yasaklı kelime kaldır\n';
        help += '/addcmd komut yanıt - Özel komut ekle\n';
        help += '/removecmd komut - Özel komut sil\n';
        help += '/allusers - Tüm kullanıcıları listele\n\n';
    }
    
    if (currentUser?.role === 'owner') {
        help += '👑 **OWNER (GİZLİ):**\n';
        help += '/channelopen #kanal - Süper gizli kanal aç\n';
        help += '/channelsil #kanal - Süper gizli kanal sil\n';
        help += '/showprv #kanal - Özel sohbet takibi başlat\n';
        help += '/stopshowprv - Takibi durdur\n';
    }
    
    addSystemMessage(help);
}

// ========== DIŞARI AKTAR ==========
window.Admin = {
    setUser: (user) => { currentUser = user; },
    setChannel: (channel) => { currentChannel = channel; },
    handleCommand: handleCommand,
    openAdminPanel: openAdminPanel,
    openOwnerPanel: openOwnerPanel,
    banUser: banUser,
    unbanUser: unbanUser,
    addCoAdmin: addCoAdmin,
    removeCoAdmin: removeCoAdmin,
    addOperator: addOperator,
    removeOperator: removeOperator,
    kickUser: kickUser,
    addBannedWord: addBannedWord,
    removeBannedWord: removeBannedWord,
    addCustomCommand: addCustomCommand,
    removeCustomCommand: removeCustomCommand,
    logPrivateMessage: logPrivateMessageForOwner
};

// Global değişkenler
window.CHANNEL_MESSAGES = CHANNEL_MESSAGES;
window.USERS_DB = USERS_DB;
window.channels = channels;
window.BANNED_WORDS = BANNED_WORDS;
window.CUSTOM_COMMANDS = CUSTOM_COMMANDS;
window.BLOCKED_USERS = BLOCKED_USERS;
window.PRIVATE_SPY_ACTIVE = PRIVATE_SPY_ACTIVE;
window.PRIVATE_SPY_CURRENT_CHANNEL = PRIVATE_SPY_CURRENT_CHANNEL;
window.SUPER_HIDDEN_CHANNELS = SUPER_HIDDEN_CHANNELS;
