// irccommands.js - Tüm IRC Komutları

function handleIRCCommand(command, args) {
    switch(command) {
        // Kanalla ilgili komutlar
        case 'join':
        case 'kanal':
            joinChannel(args[0] || 'main');
            break;
            
        case 'part':
        case 'leave':
            leaveChannel();
            break;
            
        case 'create':
        case 'kanalac':
            createChannel(args[0]);
            break;
            
        case 'invite':
            inviteToChannel(args[0], args[1]);
            break;
            
        case 'topic':
            setChannelTopic(args.slice(0).join(' '));
            break;
            
        // Kullanıcı komutları
        case 'whois':
            whoisUser(args[0]);
            break;
            
        case 'whowas':
            whowasUser(args[0]);
            break;
            
        case 'list':
            listChannels();
            break;
            
        // Operatör komutları
        case 'mode':
            setChannelMode(args[0], args[1], args[2]);
            break;
            
        case 'kick':
            ircKickUser(args[0], args.slice(1).join(' '));
            break;
            
        case 'ban':
            ircBanUser(args[0], args.slice(1).join(' '));
            break;
            
        case 'unban':
            ircUnbanUser(args[0]);
            break;
            
        case 'voice':
            giveVoice(args[0]);
            break;
            
        case 'devoice':
            removeVoice(args[0]);
            break;
            
        case 'op':
            giveOperator(args[0]);
            break;
            
        case 'deop':
            removeOperator(args[0]);
            break;
            
        // Owner komutları
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
                glineUser(args[0], args[1], args.slice(2).join(' '));
            }
            break;
            
        // Yardım komutları
        case 'help':
        case 'yardım':
            showIRCHelp();
            break;
            
        case 'commands':
            showAllCommands();
            break;
            
        // Sistem komutları
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
            
        default:
            showToast(`❌ Bilinmeyen IRC komutu: ${command}`);
    }
}

// Kanal fonksiyonları
function joinChannel(channelName) {
    if (!channelName) {
        showToast('Kanal adı gerekli!');
        return;
    }
    
    if (currentChannel === channelName) {
        showToast('Zaten bu kanaldasınız!');
        return;
    }
    
    // Kanal kontrolü
    if (userChannels[channelName] || channelName === 'main') {
        currentChannel = channelName;
        showToast(`✅ ${channelName} kanalına katıldınız!`);
        
        // Mesajları yenile
        if (messagesRef) {
            messagesRef.once('value').then(snapshot => {
                updateMessages(snapshot.val());
            });
        }
    } else {
        showToast('❌ Bu kanal mevcut değil!');
    }
}

function createChannel(channelName) {
    if (!channelName) {
        showToast('Kanal adı gerekli!');
        return;
    }
    
    if (userChannels[channelName]) {
        showToast('❌ Bu kanal zaten mevcut!');
        return;
    }
    
    if (channelsRef) {
        channelsRef.child(channelName).set({
            name: channelName,
            owner: currentUser.name,
            created: Date.now(),
            topic: `${currentUser.name}'in kanalı`,
            modes: '+nt',
            users: [currentUser.name]
        });
        
        // Kullanıcıyı coadmin yap
        if (usersRef) {
            usersRef.child(currentUser.name).update({
                role: 'coadmin'
            });
            
            currentUser.role = 'coadmin';
            isCoAdmin = true;
            updateUserInfo();
            checkAdminStatus();
            updateVideoEditButton();
        }
        
        showToast(`✅ ${channelName} kanalı oluşturuldu!`);
    }
}

// Diğer IRC fonksiyonları (kısaltılmış)
function leaveChannel() {
    if (currentChannel === 'main') {
        showToast('Ana kanaldan ayrılamazsınız!');
        return;
    }
    
    const oldChannel = currentChannel;
    currentChannel = 'main';
    
    showToast(`✅ ${oldChannel} kanalından ayrıldınız!`);
    
    // Mesajları yenile
    if (messagesRef) {
        messagesRef.once('value').then(snapshot => {
            updateMessages(snapshot.val());
        });
    }
}

function showIRCHelp() {
    const help = `
🎮 IRC KOMUTLARI:

🔹 KANAL KOMUTLARI:
/join #kanal - Kanal'a katıl
/part - Kanal'dan ayrıl
/create #kanal - Yeni kanal oluştur
/invite kullanıcı #kanal - Kullanıcıyı davet et
/topic metin - Kanal konusunu değiştir
/list - Tüm kanalları listele

🔹 KULLANICI KOMUTLARI:
/whois kullanıcı - Kullanıcı bilgisi
/whowas kullanıcı - Eski kullanıcı bilgisi

🔹 OPERATOR KOMUTLARI (Admin/CoAdmin):
/mode #kanal +/-mod - Kanal modu değiştir
/kick kullanıcı sebep - Kullanıcıyı at
/ban kullanıcı sebep - Kullanıcıyı banla
/unban kullanıcı - Ban'ı kaldır
/voice kullanıcı - Voice yetkisi ver
/devoice kullanıcı - Voice yetkisi al
/op kullanıcı - Operator yetkisi ver
/deop kullanıcı - Operator yetkisi al

🔹 SİSTEM KOMUTLARI:
/ping - Bağlantı testi
/version - Sürüm bilgisi
/time - Sunucu zamanı
/stats - İstatistikler
    `;
    
    console.log(help);
    showToast('IRC komutları konsola yazıldı!');
}