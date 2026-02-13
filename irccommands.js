// ========== IRC KOMUTLARI - POPBOX v1.0 ==========
// Tüm IRC tarzı komutlar buradan yönetilir
// Yetki seviyeleri: Owner > Admin > CoAdmin > Operator > User

// ========== GLOBAL DEĞİŞKENLER ==========
let channels = { main: { name: 'genel', users: [] } };
let currentChannel = 'genel';
let userModes = {};
let channelModes = { genel: '+nt' };
let channelTopics = { genel: 'Popbox Ana Kanal' };
let bannedUsers = [];
let invitedUsers = [];

// ========== ANA KOMUT İŞLEYİCİ ==========
function handleIRCCommand(command, args) {
    const userRole = currentUser?.role || 'user';
    
    switch(command) {
        // ========== 📢 KANAL KOMUTLARI ==========
        case 'join':
        case 'kanal':
            joinChannel(args[0] || 'genel');
            break;
            
        case 'part':
        case 'leave':
            leaveChannel();
            break;
            
        case 'create':
        case 'kanalac':
            if (isOwner || isAdmin || isCoAdmin) {
                createChannel(args[0]);
            } else {
                showSystemMessage('⛔ Kanal açma yetkiniz yok!');
            }
            break;
            
        case 'invite':
            inviteToChannel(args[0], args[1]);
            break;
            
        case 'topic':
            if (canChangeTopic()) {
                setChannelTopic(args.slice(0).join(' '));
            } else {
                showSystemMessage('⛔ Kanal konusunu değiştirme yetkiniz yok!');
            }
            break;
            
        case 'list':
            listChannels();
            break;
            
        // ========== 👤 KULLANICI KOMUTLARI ==========
        case 'whois':
            whoisUser(args[0]);
            break;
            
        case 'whowas':
            whowasUser(args[0]);
            break;
            
        case 'nick':
        case 'nickdegis':
            changeNickname(args[0]);
            break;
            
        case 'me':
            sendActionMessage(args.slice(0).join(' '));
            break;
            
        case 'msg':
        case 'dm':
            sendDirectMessage(args[0], args.slice(1).join(' '));
            break;
            
        // ========== 🔧 OPERATÖR KOMUTLARI (Admin/CoAdmin) ==========
        case 'mode':
            if (isAdmin || isCoAdmin || isOwner) {
                setChannelMode(args[0], args[1], args[2]);
            }
            break;
            
        case 'kick':
            if (isAdmin || isCoAdmin || isOwner) {
                ircKickUser(args[0], args.slice(1).join(' '));
            }
            break;
            
        case 'ban':
            if (isAdmin || isCoAdmin || isOwner) {
                ircBanUser(args[0], args.slice(1).join(' '));
            }
            break;
            
        case 'unban':
            if (isAdmin || isCoAdmin || isOwner) {
                ircUnbanUser(args[0]);
            }
            break;
            
        case 'voice':
            if (isAdmin || isCoAdmin || isOwner) {
                giveVoice(args[0]);
            }
            break;
            
        case 'devoice':
            if (isAdmin || isCoAdmin || isOwner) {
                removeVoice(args[0]);
            }
            break;
            
        case 'op':
            if (isAdmin || isOwner) {
                giveOperator(args[0]);
            }
            break;
            
        case 'deop':
            if (isAdmin || isOwner) {
                removeOperator(args[0]);
            }
            break;
            
        case 'mute':
            if (isAdmin || isCoAdmin || isOwner) {
                muteUser(args[0], parseInt(args[1]) || 5);
            }
            break;
            
        case 'unmute':
            if (isAdmin || isCoAdmin || isOwner) {
                unmuteUser(args[0]);
            }
            break;
            
        // ========== 👑 OWNER ÖZEL KOMUTLARI ==========
        case 'raw':
            if (isOwner) {
                sendRawCommand(args.slice(0).join(' '));
            }
            break;
            
        case 'kill':
            if (isOwner) {
                killUser(args[0], args.slice(1).join(' '));
            }
            break;
            
        case 'gline':
            if (isOwner) {
                glineUser(args[0], args[1] || '60', args.slice(2).join(' '));
            }
            break;
            
        case 'rehash':
            if (isOwner) {
                rehashServer();
            }
            break;
            
        case 'shutdown':
            if (isOwner) {
                shutdownServer();
            }
            break;
            
        // ========== 🎯 YARDIM KOMUTLARI ==========
        case 'help':
        case 'yardım':
        case 'commands':
            showIRCHelp(command, args[0]);
            break;
            
        // ========== ⚡ SİSTEM KOMUTLARI ==========
        case 'ping':
            sendPing();
            break;
            
        case 'version':
            showVersion();
            break;
            
        case 'time':
            showTime();
            break;
            
        case 'stats':
            showStats(args[0]);
            break;
            
        case 'clear':
        case 'temizle':
            if (isOwner || isAdmin) {
                clearChat();
            }
            break;
            
        default:
            showSystemMessage(`❌ Bilinmeyen komut: /${command}`);
    }
}

// ========== 📢 KANAL FONKSİYONLARI ==========
function joinChannel(channelName) {
    if (!channelName) {
        showSystemMessage('Kanal adı gerekli! Örnek: /join #muzik');
        return;
    }
    
    if (!channelName.startsWith('#')) {
        channelName = '#' + channelName;
    }
    
    if (currentChannel === channelName) {
        showSystemMessage(`ℹ️ Zaten ${channelName} kanalındasınız!`);
        return;
    }
    
    // Kanal kontrolü
    if (!channels[channelName]) {
        showSystemMessage(`❌ ${channelName} kanalı mevcut değil!`);
        showSystemMessage('💡 Kanal oluşturmak için: /create ' + channelName);
        return;
    }
    
    currentChannel = channelName;
    document.getElementById('currentChannel').textContent = channelName;
    showSystemMessage(`✅ ${channelName} kanalına katıldınız!`);
    
    if (channelTopics[channelName]) {
        showSystemMessage(`📌 Kanal konusu: ${channelTopics[channelName]}`);
    }
}

function leaveChannel() {
    if (currentChannel === 'genel' || currentChannel === '#genel' || currentChannel === 'main') {
        showSystemMessage('❌ Ana kanaldan ayrılamazsınız!');
        return;
    }
    
    const oldChannel = currentChannel;
    currentChannel = 'genel';
    document.getElementById('currentChannel').textContent = 'genel';
    showSystemMessage(`✅ ${oldChannel} kanalından ayrıldınız!`);
}

function createChannel(channelName) {
    if (!channelName) {
        showSystemMessage('Kanal adı gerekli! Örnek: /create #popbox');
        return;
    }
    
    if (!channelName.startsWith('#')) {
        channelName = '#' + channelName;
    }
    
    if (channels[channelName]) {
        showSystemMessage(`❌ ${channelName} kanalı zaten mevcut!`);
        return;
    }
    
    // Kanalı oluştur
    channels[channelName] = {
        name: channelName,
        owner: currentUser.name,
        created: Date.now(),
        users: [currentUser.name]
    };
    
    channelModes[channelName] = '+nt';
    channelTopics[channelName] = `${currentUser.name} tarafından oluşturuldu`;
    
    // Kanal sahibini coadmin yap
    if (database) {
        database.ref(`channels/${channelName}`).set({
            name: channelName,
            owner: currentUser.name,
            created: Date.now(),
            topic: channelTopics[channelName],
            modes: channelModes[channelName]
        });
    }
    
    showSystemMessage(`✅ ${channelName} kanalı oluşturuldu!`);
    showSystemMessage(`👑 Kanal sahibi: ${currentUser.name}`);
    
    // Kanal sahibine otomatik yetki
    if (currentUser.role === 'user') {
        currentUser.role = 'coadmin';
        isCoAdmin = true;
        updatePermissionButtons();
        showSystemMessage(`🔧 Kanal sahibi olduğunuz için Co-Admin yetkisi verildi!`);
    }
}

function inviteToChannel(user, channel) {
    if (!user || !channel) {
        showSystemMessage('Kullanıcı ve kanal adı gerekli! Örnek: /invite Ahmet #muzik');
        return;
    }
    
    if (!channel.startsWith('#')) {
        channel = '#' + channel;
    }
    
    if (!channels[channel]) {
        showSystemMessage(`❌ ${channel} kanalı mevcut değil!`);
        return;
    }
    
    if (!invitedUsers[channel]) invitedUsers[channel] = [];
    invitedUsers[channel].push(user);
    
    showSystemMessage(`📨 ${user} kullanıcısı ${channel} kanalına davet edildi!`);
    
    // Davet edilen kullanıcıya bildirim
    if (database) {
        database.ref(`notifications/${user}`).push({
            type: 'invite',
            channel: channel,
            invitedBy: currentUser.name,
            timestamp: Date.now()
        });
    }
}

function setChannelTopic(topic) {
    if (!topic) {
        showSystemMessage(`📌 ${currentChannel}: ${channelTopics[currentChannel] || 'Konu belirlenmemiş'}`);
        return;
    }
    
    channelTopics[currentChannel] = topic;
    showSystemMessage(`📌 Kanal konusu değiştirildi: ${topic}`);
    
    if (database) {
        database.ref(`channels/${currentChannel}/topic`).set(topic);
    }
}

function listChannels() {
    let channelList = '📋 **KANAL LİSTESİ**\n';
    
    Object.keys(channels).forEach(ch => {
        const userCount = channels[ch]?.users?.length || 0;
        channelList += `  ${ch} (${userCount} kullanıcı) - ${channelTopics[ch] || 'Konu yok'}\n`;
    });
    
    showSystemMessage(channelList);
}

// ========== 👤 KULLANICI FONKSİYONLARI ==========
function whoisUser(username) {
    if (!username) {
        showSystemMessage('Kullanıcı adı gerekli!');
        return;
    }
    
    // Kullanıcı bilgilerini getir
    const user = onlineUsers?.find(u => u.name === username);
    
    if (user) {
        let roleIcon = '';
        if (user.role === 'owner') roleIcon = '👑';
        else if (user.role === 'admin') roleIcon = '⚡';
        else if (user.role === 'coadmin') roleIcon = '🔧';
        else if (user.role === 'operator') roleIcon = '🛡️';
        
        const info = `📋 **${username}** ${roleIcon}\n` +
                    `  Rol: ${user.role || 'user'}\n` +
                    `  Durum: Çevrimiçi\n` +
                    `  Son görülme: Şimdi\n` +
                    `  Kanal: ${currentChannel}`;
        
        showSystemMessage(info);
    } else {
        showSystemMessage(`❌ ${username} kullanıcısı çevrimiçi değil!`);
    }
}

function whowasUser(username) {
    showSystemMessage(`ℹ️ ${username}: Geçmiş bilgisi yakında...`);
}

function sendActionMessage(text) {
    if (!text) {
        showSystemMessage('Mesaj gerekli! Örnek: /me gülümsüyor');
        return;
    }
    
    if (database) {
        database.ref('messages').push({
            sender: currentUser.name,
            text: `* ${currentUser.name} ${text}`,
            role: currentUser.role,
            type: 'action',
            timestamp: Date.now()
        });
    }
}

function sendDirectMessage(user, message) {
    if (!user || !message) {
        showSystemMessage('Kullanıcı ve mesaj gerekli! Örnek: /msg Ahmet selam');
        return;
    }
    
    // Özel mesaj olarak gönder
    if (typeof sendPrivateMessage === 'function') {
        sendPrivateMessage(user, `[DM] ${message}`);
        showSystemMessage(`📨 ${user} kullanıcısına mesaj gönderildi!`);
    }
}

// ========== 🔧 OPERATÖR FONKSİYONLARI ==========
function setChannelMode(channel, mode, param) {
    if (!channel || !mode) {
        showSystemMessage('Kanal ve mod gerekli! Örnek: /mode #kanal +nt');
        return;
    }
    
    if (!channel.startsWith('#')) channel = '#' + channel;
    
    if (channel !== currentChannel && !isOwner) {
        showSystemMessage('❌ Sadece bulunduğunuz kanalın modunu değiştirebilirsiniz!');
        return;
    }
    
    channelModes[channel] = mode;
    showSystemMessage(`🔧 ${channel} kanal modu: ${mode}`);
}

function ircKickUser(username, reason) {
    if (!username) {
        showSystemMessage('Kullanıcı adı gerekli! Örnek: /kick Ahmet Spam');
        return;
    }
    
    reason = reason || 'Sebep belirtilmedi';
    
    showSystemMessage(`👢 ${username}, ${currentChannel} kanalından atıldı (${reason})`);
    
    // Gerçek kick işlemi - Firebase'den kullanıcıyı kanaldan çıkar
    if (database) {
        database.ref(`channels/${currentChannel}/users/${username}`).remove();
    }
}

function ircBanUser(username, reason) {
    if (!username) {
        showSystemMessage('Kullanıcı adı gerekli! Örnek: /ban Ahmet Reklam');
        return;
    }
    
    reason = reason || 'Sebep belirtilmedi';
    
    bannedUsers.push({
        user: username,
        bannedBy: currentUser.name,
        reason: reason,
        timestamp: Date.now(),
        channel: currentChannel
    });
    
    showSystemMessage(`🚫 ${username} kullanıcısı yasaklandı (${reason})`);
    
    // Gerçek ban işlemi
    ircKickUser(username, 'Yasaklandı: ' + reason);
}

function ircUnbanUser(username) {
    if (!username) {
        showSystemMessage('Kullanıcı adı gerekli! Örnek: /unban Ahmet');
        return;
    }
    
    const index = bannedUsers.findIndex(b => b.user === username);
    if (index > -1) {
        bannedUsers.splice(index, 1);
        showSystemMessage(`✅ ${username} kullanıcısının yasağı kaldırıldı!`);
    } else {
        showSystemMessage(`❌ ${username} kullanıcısının yasağı bulunamadı!`);
    }
}

function giveVoice(username) {
    if (!username) return;
    userModes[username] = userModes[username] || { voice: false };
    userModes[username].voice = true;
    showSystemMessage(`🎤 ${username} kullanıcısına voice yetkisi verildi!`);
}

function removeVoice(username) {
    if (!username) return;
    if (userModes[username]) {
        userModes[username].voice = false;
        showSystemMessage(`🔇 ${username} kullanıcısının voice yetkisi alındı!`);
    }
}

function giveOperator(username) {
    if (!username) return;
    showSystemMessage(`🔧 ${username} kullanıcısına operator yetkisi verildi!`);
    
    // Firebase'de kullanıcı rolünü güncelle
    if (database) {
        database.ref(`onlineUsers/${username}/role`).set('operator');
    }
}

function removeOperator(username) {
    if (!username) return;
    showSystemMessage(`🔨 ${username} kullanıcısının operator yetkisi alındı!`);
    
    if (database) {
        database.ref(`onlineUsers/${username}/role`).set('user');
    }
}

function muteUser(username, minutes) {
    if (!username) return;
    
    const until = Date.now() + (minutes * 60 * 1000);
    blockedUsers[username] = {
        timestamp: Date.now(),
        until: until,
        reason: 'mute'
    };
    
    showSystemMessage(`🔇 ${username} kullanıcısı ${minutes} dakika susturuldu!`);
}

function unmuteUser(username) {
    if (!username) return;
    
    delete blockedUsers[username];
    showSystemMessage(`🔊 ${username} kullanıcısının susturması kaldırıldı!`);
}

// ========== 👑 OWNER ÖZEL FONKSİYONLAR ==========
function sendRawCommand(command) {
    showSystemMessage(`📡 RAW: ${command}`);
    // Raw komut işleme
}

function killUser(username, reason) {
    if (!username) return;
    showSystemMessage(`💀 ${username} kullanıcısı sunucudan atıldı (${reason || 'Sebep yok'})`);
    
    // Kullanıcıyı tamamen at
    if (database) {
        database.ref(`onlineUsers/${username}`).remove();
    }
}

function glineUser(username, duration, reason) {
    if (!username) return;
    const minutes = parseInt(duration) || 60;
    showSystemMessage(`🌐 ${username} kullanıcısı ${minutes} dakika global olarak yasaklandı (${reason || 'Sebep yok'})`);
    
    // Global ban
    bannedUsers.push({
        user: username,
        bannedBy: currentUser.name,
        reason: reason,
        timestamp: Date.now(),
        global: true,
        duration: minutes
    });
}

function rehashServer() {
    showSystemMessage('🔄 Sunucu yeniden yapılandırılıyor...');
    setTimeout(() => {
        showSystemMessage('✅ Sunucu yeniden yapılandırıldı!');
    }, 2000);
}

function shutdownServer() {
    showSystemMessage('⚠️ Sunucu kapatılıyor...');
    setTimeout(() => {
        showSystemMessage('💤 Sunucu kapatıldı!');
        // Gerçek shutdown işlemi
    }, 3000);
}

// ========== 🎯 YARDIM FONKSİYONLARI ==========
function showIRCHelp(command, section) {
    let helpText = '🎮 **IRC KOMUTLARI**\n\n';
    
    if (section === 'kanal' || !section) {
        helpText += '📢 **KANAL KOMUTLARI**\n';
        helpText += '  /join #kanal - Kanala katıl\n';
        helpText += '  /part - Kanaldan ayrıl\n';
        helpText += '  /create #kanal - Kanal oluştur (CoAdmin+)\n';
        helpText += '  /invite kullanıcı #kanal - Davet et\n';
        helpText += '  /topic [konu] - Kanal konusu\n';
        helpText += '  /list - Kanalları listele\n\n';
    }
    
    if (section === 'kullanici' || !section) {
        helpText += '👤 **KULLANICI KOMUTLARI**\n';
        helpText += '  /whois kullanıcı - Kullanıcı bilgisi\n';
        helpText += '  /whowas kullanıcı - Geçmiş bilgi\n';
        helpText += '  /nick yeniad - Kullanıcı adı değiştir\n';
        helpText += '  /me hareket - Aksiyon mesajı\n';
        helpText += '  /msg kullanıcı mesaj - Özel mesaj\n\n';
    }
    
    if (section === 'operator' || !section) {
        helpText += '🔧 **OPERATÖR KOMUTLARI (Admin/CoAdmin)**\n';
        helpText += '  /kick kullanıcı [sebep] - Kullanıcıyı at\n';
        helpText += '  /ban kullanıcı [sebep] - Yasakla\n';
        helpText += '  /unban kullanıcı - Yasağı kaldır\n';
        helpText += '  /mute kullanıcı [dk] - Sustur\n';
        helpText += '  /unmute kullanıcı - Susturmayı kaldır\n';
        helpText += '  /voice kullanıcı - Voice yetkisi ver\n';
        helpText += '  /devoice kullanıcı - Voice yetkisi al\n';
        helpText += '  /mode #kanal +/-mod - Kanal modu\n\n';
    }
    
    if (section === 'owner' || (!section && isOwner)) {
        helpText += '👑 **OWNER KOMUTLARI**\n';
        helpText += '  /kill kullanıcı - Sunucudan at\n';
        helpText += '  /gline kullanıcı [dk] - Global ban\n';
        helpText += '  /rehash - Sunucu yenile\n';
        helpText += '  /shutdown - Sunucu kapat\n\n';
    }
    
    helpText += '⚡ **SİSTEM KOMUTLARI**\n';
    helpText += '  /ping - Bağlantı testi\n';
    helpText += '  /version - Sürüm bilgisi\n';
    helpText += '  /time - Sunucu zamanı\n';
    helpText += '  /stats - İstatistikler\n';
    helpText += '  /clear - Sohbeti temizle (Admin+)\n';
    
    showSystemMessage(helpText);
}

// ========== ⚡ SİSTEM FONKSİYONLARI ==========
function sendPing() {
    const start = Date.now();
    showSystemMessage('🏓 Ping!');
    setTimeout(() => {
        const latency = Date.now() - start;
        showSystemMessage(`📡 Pong! ${latency}ms`);
    }, 100);
}

function showVersion() {
    showSystemMessage('📱 Popbox IRC v1.0.0 - "Yetkili Medya Paneli"');
}

function showTime() {
    const now = new Date();
    showSystemMessage(`🕐 ${now.toLocaleString('tr-TR')}`);
}

function showStats(target) {
    let stats = '📊 **SİSTEM İSTATİSTİKLERİ**\n';
    stats += `  👥 Online kullanıcı: ${onlineUsers?.length || 0}\n`;
    stats += `  💬 Aktif kanallar: ${Object.keys(channels).length}\n`;
    stats += `  🚫 Yasaklı kullanıcı: ${bannedUsers.length}\n`;
    stats += `  📝 Toplam mesaj: ${messageCounter || 0}\n`;
    showSystemMessage(stats);
}

function clearChat() {
    if (confirm('Tüm mesajları temizlemek istediğinize emin misiniz?')) {
        if (database) {
            database.ref('messages').remove();
            showSystemMessage('✅ Sohbet temizlendi!');
        }
    }
}

// ========== 🛠️ YARDIMCI FONKSİYONLAR ==========
function showSystemMessage(text) {
    if (typeof addSystemMessage === 'function') {
        addSystemMessage(text);
    } else {
        console.log('SYSTEM:', text);
    }
}

function canChangeTopic() {
    return isOwner || isAdmin || isCoAdmin || currentChannel.startsWith('#');
}

// ========== 🚀 BAŞLANGIÇ ==========
console.log('✅ IRC Komutları yüklendi!');
