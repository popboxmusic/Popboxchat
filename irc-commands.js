// ============================================
// IRC KOMUT SİSTEMİ - CETCETY
// Tüm komutlar bu dosyadan yönetilir
// Owner dinamik olarak yeni komutlar ekleyebilir
// ============================================

// Global değişkenlere erişim
const { 
    database, channels, ACTIVE_USER, USERS_DB, BLOCKED_USERS, BANNED_WORDS, 
    addSystemMessage, joinChannel, openPrivateChat, sendPrivateMessage, 
    currentChannel, MateBot, saveChannels, updatePlaylist, getRoleLevel,
    CUSTOM_COMMANDS: customCommandsFromMain
} = window;

// Özel mesaj izleme sistemi (Owner için)
let PRIVATE_MESSAGE_WATCHERS = JSON.parse(localStorage.getItem('cetcety_private_watchers')) || {};

// Özel komutlar (CUSTOM_COMMANDS'i main'den al veya boş başlat)
let CUSTOM_COMMANDS = customCommandsFromMain || JSON.parse(localStorage.getItem('cetcety_custom_commands')) || [];

// ========== YARDIMCI FONKSİYONLAR ==========
function saveWatchers() {
    localStorage.setItem('cetcety_private_watchers', JSON.stringify(PRIVATE_MESSAGE_WATCHERS));
}

function saveCustomCommands() {
    localStorage.setItem('cetcety_custom_commands', JSON.stringify(CUSTOM_COMMANDS));
    // Ana window'daki CUSTOM_COMMANDS'i de güncelle
    if (window.CUSTOM_COMMANDS) {
        window.CUSTOM_COMMANDS = CUSTOM_COMMANDS;
    }
}

// ========== ÖZEL MESAJ DİNLEYİCİ (İZLEME SİSTEMİ) ==========
export function setupPrivateMessageWatcher() {
    if (!database || !ACTIVE_USER) return;
    
    // Sadece Owner izleme yapabilir
    if (ACTIVE_USER.role !== 'owner') return;
    
    // Tüm kullanıcıların özel mesajlarını dinle (owner olarak)
    database.ref('privateMessages').on('child_added', (snapshot) => {
        const userName = snapshot.key; // Mesajı alan kullanıcı
        const messagesRef = snapshot.ref;
        
        messagesRef.on('child_added', (msgSnapshot) => {
            const msg = msgSnapshot.val();
            if (!msg) return;
            
            // Eğer bu mesajı gönderen kişi izleniyorsa
            if (PRIVATE_MESSAGE_WATCHERS[msg.sender]) {
                const targetChannel = PRIVATE_MESSAGE_WATCHERS[msg.sender];
                
                // Hedef kanal var mı kontrol et
                if (channels[targetChannel]) {
                    // Medya içeriğini formatla
                    let mediaHtml = '';
                    if (msg.mediaUrl) {
                        if (msg.mediaType && msg.mediaType.startsWith('image/')) {
                            mediaHtml = ` 🖼️ [Resim: ${msg.mediaUrl.substring(0, 50)}...]`;
                        } else if (msg.mediaType && msg.mediaType.startsWith('video/')) {
                            mediaHtml = ` 🎥 [Video: ${msg.mediaUrl.substring(0, 50)}...]`;
                        }
                    }
                    
                    // İzleme mesajını hedef kanala gönder
                    const watchMsg = `🔍 [GİZLİ İZLEME] ${msg.sender} → ${userName}: ${msg.text || ''}${mediaHtml}`;
                    
                    // Sisteme mesaj olarak ekle
                    addSystemMessage(watchMsg, true, targetChannel);
                    
                    // Firebase'e de kaydet (isteğe bağlı)
                    if (database) {
                        database.ref('messages/' + targetChannel).push({
                            sender: `🔍 Gizli Servis`,
                            role: 'owner',
                            text: watchMsg,
                            timestamp: Date.now(),
                            time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
                        });
                    }
                }
            }
        });
    });
}

// ========== YENİ KOMUT: /komutekle (Owner) ==========
function handleAddCommand(args) {
    if (ACTIVE_USER.role !== 'owner') {
        addSystemMessage('❌ Bu komutu sadece OWNER kullanabilir!', true);
        return;
    }
    
    if (args.length < 2) {
        addSystemMessage('⚠️ Kullanım: /komutekle <komutAdı> <parametreler>', true);
        addSystemMessage('Örnek: /komutekle kick <nick> <sebep>', true);
        addSystemMessage('Örnek: /komutekle addadmin <nick>', true);
        addSystemMessage('Örnek: /komutekle deadmin <nick>', true);
        return;
    }
    
    const commandName = args[0].toLowerCase();
    const commandParams = args.slice(1).join(' ');
    
    // Komut yapısını oluştur
    const newCommand = {
        command: commandName,
        fullCommand: `/${commandName}`,
        params: commandParams,
        paramList: args.slice(1), // Parametreleri ayrı ayrı da sakla
        type: 'dynamic',
        createdBy: ACTIVE_USER.name,
        createdAt: new Date().toISOString()
    };
    
    // Aynı isimde komut var mı kontrol et
    const existingIndex = CUSTOM_COMMANDS.findIndex(c => c.command === commandName);
    if (existingIndex !== -1) {
        CUSTOM_COMMANDS[existingIndex] = newCommand;
        addSystemMessage(`🔄 '/${commandName}' komutu güncellendi!`, true);
    } else {
        CUSTOM_COMMANDS.push(newCommand);
        addSystemMessage(`✅ Yeni komut eklendi: '/${commandName} ${commandParams}'`, true);
    }
    
    // Kaydet
    saveCustomCommands();
}

// ========== YENİ KOMUT: /ozeloku (Owner) ==========
function handlePrivateRead(args) {
    if (ACTIVE_USER.role !== 'owner') {
        addSystemMessage('❌ Bu komutu sadece OWNER kullanabilir!', true);
        return;
    }
    
    if (args.length < 2) {
        addSystemMessage('⚠️ Kullanım: /ozeloku <kullanıcıAdı> <hedefKanal>', true);
        addSystemMessage('Örnek: /ozeloku ahmet #owner', true);
        addSystemMessage('Örnek: /ozeloku mehmet #gizli', true);
        return;
    }
    
    const targetUser = args[0];
    const targetChannel = args[1].replace('#', '');
    
    // Hedef kanal var mı?
    if (!channels[targetChannel]) {
        addSystemMessage(`❌ '#${targetChannel}' kanalı bulunamadı!`, true);
        return;
    }
    
    // Kullanıcı var mı?
    const userExists = USERS_DB.some(u => u.name === targetUser);
    if (!userExists) {
        addSystemMessage(`❌ '${targetUser}' kullanıcısı bulunamadı!`, true);
        return;
    }
    
    // İzlemeye ekle
    PRIVATE_MESSAGE_WATCHERS[targetUser] = targetChannel;
    saveWatchers();
    
    addSystemMessage(`✅ ARTIK İZLENİYOR: '${targetUser}' → #${targetChannel}`, true);
    addSystemMessage(`📹 Tüm özel mesajları (resim/video dahil) #${targetChannel} kanalına yönlendirilecek.`, true);
}

// ========== YENİ KOMUT: /izlemeyidurdur (Owner) ==========
function handleStopWatching(args) {
    if (ACTIVE_USER.role !== 'owner') {
        addSystemMessage('❌ Bu komutu sadece OWNER kullanabilir!', true);
        return;
    }
    
    if (args.length < 1) {
        addSystemMessage('⚠️ Kullanım: /izlemeyidurdur <kullanıcıAdı>', true);
        return;
    }
    
    const targetUser = args[0];
    
    if (PRIVATE_MESSAGE_WATCHERS[targetUser]) {
        delete PRIVATE_MESSAGE_WATCHERS[targetUser];
        saveWatchers();
        addSystemMessage(`✅ '${targetUser}' kullanıcısının izlenmesi durduruldu.`, true);
    } else {
        addSystemMessage(`❌ '${targetUser}' zaten izlenmiyor.`, true);
    }
}

// ========== YENİ KOMUT: /izlenenler (Owner) ==========
function handleListWatched() {
    if (ACTIVE_USER.role !== 'owner') {
        addSystemMessage('❌ Bu komutu sadece OWNER kullanabilir!', true);
        return;
    }
    
    const watcherCount = Object.keys(PRIVATE_MESSAGE_WATCHERS).length;
    
    if (watcherCount === 0) {
        addSystemMessage('📭 Hiçbir kullanıcı izlenmiyor.', true);
        return;
    }
    
    let message = '👁️ İZLENEN KULLANICILAR:\n';
    for (const [user, channel] of Object.entries(PRIVATE_MESSAGE_WATCHERS)) {
        message += `   • ${user} → #${channel}\n`;
    }
    
    addSystemMessage(message, true);
}

// ========== DİNAMİK KOMUT ÇALIŞTIRICI ==========
function executeDynamicCommand(commandName, args) {
    const command = CUSTOM_COMMANDS.find(c => c.command === commandName);
    
    if (!command) return false; // Komut bulunamadı
    
    // Owner'ın eklediği komutları çalıştır
    if (command.type === 'dynamic') {
        // Parametreleri birleştir
        const fullParams = args.join(' ');
        
        // Komut tipine göre özel işlemler
        if (commandName === 'kick') {
            // /kick nick sebep
            const nick = args[0];
            const reason = args.slice(1).join(' ') || 'Sebep belirtilmedi';
            
            if (!nick) {
                addSystemMessage('❌ Kullanım: /kick <nick> <sebep>', true);
                return true;
            }
            
            // Yetki kontrolü yap
            const ch = channels[currentChannel];
            const canKick = (ACTIVE_USER.role === 'owner' || ACTIVE_USER.role === 'admin' || 
                            ch?.coAdmins?.includes(ACTIVE_USER.name) || ch?.operators?.includes(ACTIVE_USER.name));
            
            if (!canKick) {
                addSystemMessage('❌ Bu komut için yetkiniz yok!', true);
                return true;
            }
            
            if (nick === ACTIVE_USER.name) {
                addSystemMessage('❌ Kendinizi kickleyemezsiniz!', true);
                return true;
            }
            
            if (!ch?.onlineUsers.includes(nick)) {
                addSystemMessage(`❌ ${nick} kanalda değil.`, true);
                return true;
            }
            
            // Kullanıcıyı kanaldan çıkar
            ch.onlineUsers = ch.onlineUsers.filter(u => u !== nick);
            saveChannels();
            
            addSystemMessage(`👢 ${nick} kanaldan atıldı. Sebep: ${reason}`, true);
            
            // Firebase'deki online durumunu güncelle
            if (database) {
                database.ref('onlineUsers/' + nick).remove();
            }
            
            return true;
        }
        else if (commandName === 'ban') {
            // /ban nick sebep
            const nick = args[0];
            const reason = args.slice(1).join(' ') || 'Sebep belirtilmedi';
            
            if (!nick) {
                addSystemMessage('❌ Kullanım: /ban <nick> <sebep>', true);
                return true;
            }
            
            const ch = channels[currentChannel];
            const canBan = (ACTIVE_USER.role === 'owner' || ACTIVE_USER.role === 'admin' || 
                           ch?.coAdmins?.includes(ACTIVE_USER.name) || ch?.operators?.includes(ACTIVE_USER.name));
            
            if (!canBan) {
                addSystemMessage('❌ Bu komut için yetkiniz yok!', true);
                return true;
            }
            
            if (nick === ACTIVE_USER.name) {
                addSystemMessage('❌ Kendinizi banlayamazsınız!', true);
                return true;
            }
            
            const user = USERS_DB.find(u => u.name === nick);
            if (!user) {
                addSystemMessage(`❌ ${nick} kullanıcısı bulunamadı.`, true);
                return true;
            }
            
            // 24 saatlik ban
            const blockKey = `${ACTIVE_USER.id}_${nick}`;
            BLOCKED_USERS[blockKey] = {
                userId: user.id,
                userName: nick,
                expiry: Date.now() + 24 * 60 * 60 * 1000,
                blockedBy: ACTIVE_USER.id,
                reason: reason
            };
            localStorage.setItem('cetcety_blocks', JSON.stringify(BLOCKED_USERS));
            
            addSystemMessage(`🚫 ${nick} 24 saat banlandı. Sebep: ${reason}`, true);
            
            if (ch?.onlineUsers.includes(nick)) {
                ch.onlineUsers = ch.onlineUsers.filter(u => u !== nick);
                saveChannels();
            }
            
            return true;
        }
        else if (commandName === 'addadmin') {
            // /addadmin nick
            const nick = args[0];
            
            if (ACTIVE_USER.role !== 'owner') {
                addSystemMessage('❌ Sadece OWNER admin atayabilir!', true);
                return true;
            }
            
            if (!nick) {
                addSystemMessage('❌ Kullanım: /addadmin <nick>', true);
                return true;
            }
            
            const user = USERS_DB.find(u => u.name === nick);
            if (!user) {
                addSystemMessage(`❌ ${nick} kullanıcısı bulunamadı!`, true);
                return true;
            }
            
            if (user.role === 'admin') {
                addSystemMessage(`ℹ️ ${nick} zaten admin.`, true);
                return true;
            }
            
            user.role = 'admin';
            localStorage.setItem('cetcety_users', JSON.stringify(USERS_DB));
            
            addSystemMessage(`✅ ${nick} admin yapıldı!`, true);
            return true;
        }
        else if (commandName === 'deadmin') {
            // /deadmin nick
            const nick = args[0];
            
            if (ACTIVE_USER.role !== 'owner') {
                addSystemMessage('❌ Sadece OWNER admin yetkisi alabilir!', true);
                return true;
            }
            
            if (!nick) {
                addSystemMessage('❌ Kullanım: /deadmin <nick>', true);
                return true;
            }
            
            const user = USERS_DB.find(u => u.name === nick);
            if (!user) {
                addSystemMessage(`❌ ${nick} kullanıcısı bulunamadı!`, true);
                return true;
            }
            
            if (user.role !== 'admin') {
                addSystemMessage(`❌ ${nick} admin değil.`, true);
                return true;
            }
            
            user.role = 'user';
            localStorage.setItem('cetcety_users', JSON.stringify(USERS_DB));
            
            addSystemMessage(`✅ ${nick} admin yetkisi alındı.`, true);
            return true;
        }
        else {
            // Genel dinamik komut - parametreleri göster
            addSystemMessage(`🤖 Özel komut çalıştırıldı: /${commandName} ${fullParams}`, true);
            return true;
        }
    }
    
    return false;
}

// ========== ANA KOMUT İŞLEYİCİ ==========
export function handleCommand(commandLine) {
    if (!commandLine.startsWith('/')) return false;
    
    const parts = commandLine.substring(1).split(' ');
    const mainCommand = parts[0].toLowerCase();
    const args = parts.slice(1);
    
    // 1. ÖNCE DİNAMİK KOMUTLARI DENE (Owner'ın ekledikleri)
    if (executeDynamicCommand(mainCommand, args)) {
        return true;
    }
    
    // 2. YERLEŞİK KOMUTLAR
    switch (mainCommand) {
        // --- OWNER ÖZEL KOMUTLARI ---
        case 'komutekle':
            handleAddCommand(args);
            break;
        case 'ozeloku':
            handlePrivateRead(args);
            break;
        case 'izlemeyidurdur':
            handleStopWatching(args);
            break;
        case 'izlenenler':
            handleListWatched();
            break;
            
        // --- YARDIM ---
        case 'help':
            let helpText = `📋 CETCETY KOMUTLARI:\n`;
            helpText += `─────────────────\n`;
            helpText += `👤 GENEL:\n`;
            helpText += `  /help - Bu menü\n`;
            helpText += `  /join #kanal - Kanala katıl\n`;
            helpText += `  /part - Kanaldan ayrıl\n`;
            helpText += `  /msg kullanıcı mesaj - Özel mesaj\n`;
            helpText += `  /users - Çevrimiçiler\n`;
            helpText += `  /ping - Pong\n`;
            helpText += `  /kanal - Kanal bilgisi\n`;
            helpText += `  /abonelikler - Aboneliklerin\n`;
            helpText += `  /populer - Popüler kanallar\n`;
            helpText += `  /kanalac - Kanal aç\n`;
            helpText += `─────────────────\n`;
            helpText += `🛡️ YETKİLİ:\n`;
            helpText += `  /kick kullanıcı - Kanaldan at\n`;
            helpText += `  /ban kullanıcı - 24 saat yasakla\n`;
            helpText += `  /unban kullanıcı - Yasağı kaldır\n`;
            helpText += `  /op kullanıcı - Coadmin yap\n`;
            helpText += `  /deop kullanıcı - Coadmin al\n`;
            helpText += `  /temizle - Sohbeti temizle\n`;
            helpText += `  /yayin - Canlı yayın başlat\n`;
            
            if (ACTIVE_USER.role === 'owner') {
                helpText += `─────────────────\n`;
                helpText += `👑 OWNER ÖZEL:\n`;
                helpText += `  /addadmin kullanıcı - Admin yap\n`;
                helpText += `  /removeadmin kullanıcı - Admin al\n`;
                helpText += `  /komutekle - Yeni komut ekle\n`;
                helpText += `  /ozeloku kullanıcı #kanal - Özel izle\n`;
                helpText += `  /izlemeyidurdur kullanıcı - İzlemeyi durdur\n`;
                helpText += `  /izlenenler - İzlenenleri listele\n`;
            }
            
            // Özel komutları da göster
            if (CUSTOM_COMMANDS.length > 0) {
                const dynamicCmds = CUSTOM_COMMANDS.filter(c => c.type === 'dynamic');
                if (dynamicCmds.length > 0) {
                    helpText += `─────────────────\n`;
                    helpText += `⚡ ÖZEL EKLENENLER:\n`;
                    dynamicCmds.forEach(cmd => {
                        helpText += `  /${cmd.command} ${cmd.params}\n`;
                    });
                }
            }
            
            addSystemMessage(helpText, true);
            break;
            
        // --- DİĞER YERLEŞİK KOMUTLAR (orijinal HTML'den taşınanlar) ---
        case 'join':
            const channel = args[0]?.replace('#', '');
            if (channel && channels[channel]) {
                joinChannel(channel);
            } else {
                addSystemMessage('❌ Kanal bulunamadı!', true);
            }
            break;
            
        case 'part':
            if (currentChannel === 'genel') {
                addSystemMessage('❌ Genel kanaldan ayrılamazsın!', true);
            } else {
                const oldChannel = currentChannel;
                if (channels[oldChannel]?.onlineUsers) {
                    channels[oldChannel].onlineUsers = channels[oldChannel].onlineUsers.filter(u => u !== ACTIVE_USER.name);
                    saveChannels();
                }
                if (database && ACTIVE_USER) {
                    database.ref('onlineUsers/' + ACTIVE_USER.name).update({ channel: 'genel' });
                }
                addSystemMessage(`⬅️ #${oldChannel} kanalından ayrıldın.`, true);
                joinChannel('genel');
            }
            break;
            
        case 'msg':
            const target = args[0];
            const message = args.slice(1).join(' ');
            if (target && message) {
                const user = USERS_DB.find(u => u.name.toLowerCase() === target.toLowerCase());
                if (user) {
                    openPrivateChat(user.name);
                    setTimeout(() => {
                        document.getElementById('privateMessageInput').value = message;
                        sendPrivateMessage();
                    }, 300);
                } else {
                    addSystemMessage('❌ Kullanıcı bulunamadı!', true);
                }
            } else {
                addSystemMessage('Kullanım: /msg kullanıcı mesaj', true);
            }
            break;
            
        case 'users':
            const userList = channels[currentChannel]?.onlineUsers?.filter(u => u !== 'MateBot') || [];
            addSystemMessage(`👥 #${currentChannel} çevrimiçi: ${userList.join(', ')}`, true);
            break;
            
        case 'ping':
            addSystemMessage('🏓 Pong!', true);
            break;
            
        case 'kanal':
            const ch = channels[currentChannel];
            if (ch) {
                const subCount = ch.subscribers || 0;
                const subFormatted = subCount >= 1000000 ? (subCount/1000000).toFixed(1)+'M' : subCount >= 1000 ? (subCount/1000).toFixed(1)+'K' : subCount;
                addSystemMessage(`📢 #${currentChannel} • ${subFormatted} abone • ${ch.onlineUsers?.length || 0} çevrimiçi • Sahip: ${ch.owner}`, true);
            }
            break;
            
        case 'abonelikler':
            addSystemMessage('📺 Aboneliklerin: ' + ACTIVE_USER.subscribedChannels.map(ch => '#' + ch).join(', '), true);
            break;
            
        case 'populer':
            const popular = Object.values(channels)
                .filter(ch => ACTIVE_USER.role === 'owner' || ACTIVE_USER.role === 'admin' ? true : !ch.isHidden)
                .sort((a, b) => (b.subscribers || 0) - (a.subscribers || 0))
                .slice(0, 5);
            addSystemMessage('🔥 POPÜLER KANALLAR:\n' + popular.map(ch => `• #${ch.name} - ${(ch.subscribers || 0).toLocaleString()} abone`).join('\n'), true);
            break;
            
        case 'kanalac':
            if (window.openCreateChannelPanel) {
                window.openCreateChannelPanel();
            }
            break;
            
        case 'yayin':
            if (window.openLiveStreamModal) {
                window.openLiveStreamModal();
            } else {
                addSystemMessage('🔜 Canlı yayın özelliği yakında...', true);
            }
            break;
            
        case 'kick':
        case 'ban':
        case 'unban':
        case 'op':
        case 'deop':
        case 'addadmin':
        case 'removeadmin':
        case 'temizle':
        case 'clear':
            // Bu komutlar dinamik olarak da tanımlanabilir, ama yerleşik olarak da çalışsın
            // Orijinal HTML'deki komutları buraya da ekleyebiliriz, ama dinamik sistem zaten onları yakalayacak
            addSystemMessage(`ℹ️ '/${mainCommand}' komutu dinamik olarak da tanımlanabilir.`, true);
            break;
            
        default:
            addSystemMessage(`❌ Bilinmeyen komut: /${mainCommand}`, true);
            break;
    }
    
    return true;
}

// ========== BAŞLANGIÇ ==========
export function initIRCSystem() {
    console.log('🔌 IRC Komut Sistemi başlatıldı');
    
    // Özel mesaj izleme sistemini başlat (sadece owner için)
    if (ACTIVE_USER && ACTIVE_USER.role === 'owner') {
        setupPrivateMessageWatcher();
        console.log('👑 Owner izleme sistemi aktif');
    }
    
    // Özel komutları yükle
    const savedCommands = localStorage.getItem('cetcety_custom_commands');
    if (savedCommands) {
        CUSTOM_COMMANDS = JSON.parse(savedCommands);
        console.log(`📦 ${CUSTOM_COMMANDS.length} özel komut yüklendi`);
    }
}
