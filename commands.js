// ========== KOMUT İŞLEYİCİLER ==========

// Yetki bazlı help komutu
function getHelpByRole() {
    if (!ACTIVE_USER) return "❌ Kullanıcı bilgisi bulunamadı.";
    
    let userCommands = [
        "**👤 KULLANICI KOMUTLARI:**",
        "/help - Bu yardım menüsünü göster",
        "/join #kanal - Belirtilen kanala katıl",
        "/part - Bulunduğun kanaldan ayrıl (genel'den ayrılamazsın)",
        "/msg kullanıcı mesaj - Kullanıcıya özel mesaj gönder",
        "/users - Kanalda çevrimiçi kullanıcıları göster",
        "/ping - Botun çalışıp çalışmadığını kontrol et",
        "/temizle /clear - Sohbeti temizle",
        "/abonelikler - Abone olduğun kanalları göster",
        "/populer - Popüler kanalları listele",
        "/kanal - Bulunduğun kanalın bilgilerini göster",
        "/kanalac - Kanal açma panelini açar",
        "/youtube - YouTube video ekleme panelini açar"
    ];
    
    let coadminCommands = [
        "\n**🔧 CO-ADMIN KOMUTLARI (Kendi kanalında):**",
        "/kick kullanıcı - Kullanıcıyı kanaldan at",
        "/ban kullanıcı - Kullanıcıyı 24 saat yasakla",
        "/op kullanıcı - Kullanıcıyı co-admin yap",
        "/deop kullanıcı - Co-admin yetkisini al",
        "/kanalsil - Kendi kanalını sil",
        "/gizle - Kanalını gizle/göster",
        "/video - YouTube video ekle"
    ];
    
    let adminCommands = [
        "\n**⚡ ADMIN KOMUTLARI:**",
        "/ban kullanıcı - Kullanıcıyı 24 saat yasakla",
        "/unban kullanıcı - Kullanıcının yasağını kaldır",
        "/kanalsil - Kendi kanalını sil"
    ];
    
    let helpMessage = "📋 **YETKİ BAZLI KOMUTLAR**\n\n";
    helpMessage += userCommands.join("\n");
    
    if (ACTIVE_USER.role === 'coadmin' || ACTIVE_USER.role === 'admin' || ACTIVE_USER.role === 'owner') {
        helpMessage += coadminCommands.join("\n");
    }
    
    if (ACTIVE_USER.role === 'admin' || ACTIVE_USER.role === 'owner') {
        helpMessage += adminCommands.join("\n");
    }
    
    if (ACTIVE_USER.role === 'owner') {
        helpMessage += "\n\n👑 **OWNER NOTU:** Özel owner komutları gizlidir ve sadece size özeldir.";
    }
    
    return helpMessage;
}

// Komut işleyici
function handleCommand(cmd) {
    let parts = cmd.substring(1).split(' ');
    let main = parts[0].toLowerCase();

    let custom = CUSTOM_COMMANDS.find(c => c.command === '/' + main || c.command === main);
    if (custom) {
        addSystemMessage(`🤖 ${custom.response}`);
        return;
    }

    if (main === 'help') {
        let helpText = getHelpByRole();
        let msgDiv = document.createElement('div');
        msgDiv.className = 'system-message';
        msgDiv.style.whiteSpace = 'pre-line';
        msgDiv.style.textAlign = 'left';
        msgDiv.innerHTML = `<i class="fas fa-info-circle"></i><br>${escapeHTML(helpText)}`;
        document.getElementById('messages').appendChild(msgDiv);
        document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
        return;
    }

    else if (main === 'join') {
        let ch = parts[1]?.replace('#', '');
        if (ch && channels[ch]) {
            if (ch === 'admin' && !(ACTIVE_USER.role === 'owner' || ACTIVE_USER.role === 'admin'))
                addSystemMessage('❌ Admin kanalına erişim yetkiniz yok.');
            else if (channels[ch].isSuperHidden && ACTIVE_USER.role !== 'owner')
                addSystemMessage('❌ Bu kanala erişim yetkiniz yok.');
            else joinChannel(ch);
        } else addSystemMessage('❌ Kanal bulunamadı.');
    }

    else if (main === 'part') {
        if (currentChannel === 'genel') addSystemMessage('❌ Genel kanaldan ayrılamazsın.');
        else {
            let oldChannel = currentChannel;
            if (channels[oldChannel] && channels[oldChannel].onlineUsers) {
                channels[oldChannel].onlineUsers = channels[oldChannel].onlineUsers.filter(u => u !== ACTIVE_USER.name);
                saveChannels();
            }
            addSystemMessage(`⬅️ #${oldChannel} kanalından ayrıldın.`);
            joinChannel('genel');
        }
    }

    else if (main === 'msg') {
        let target = parts[1];
        let msg = parts.slice(2).join(' ');
        if (target && msg) {
            let user = USERS_DB.find(u => u.name.toLowerCase() === target.toLowerCase());
            if (user) {
                openPrivateChat(user.name);
                setTimeout(() => {
                    let input = document.getElementById('privateMessageInput');
                    if (input) {
                        input.value = msg;
                        sendPrivateMessage();
                    }
                }, 300);
            } else addSystemMessage('❌ Kullanıcı bulunamadı.');
        } else addSystemMessage('Kullanım: /msg kullanıcı mesaj');
    }

    else if (main === 'users') {
        let list = channels[currentChannel].onlineUsers.join(', ');
        addSystemMessage(`👥 #${currentChannel} çevrimiçi: ${list || 'Kimse yok'}`);
    }

    else if (main === 'ping') addSystemMessage('🏓 Pong!');

    else if (main === 'temizle' || main === 'clear') {
        document.getElementById('messages').innerHTML = '';
        addSystemMessage('✅ Sohbet temizlendi!');
    }

    else if (main === 'abonelikler')
        addSystemMessage('📺 Aboneliklerin: ' + ACTIVE_USER.subscribedChannels.map(ch => '#' + ch).join(', '));

    else if (main === 'populer') {
        let v = Object.values(channels).filter(ch => {
            if (ch.isSuperHidden && ACTIVE_USER.role !== 'owner') return false;
            return (ACTIVE_USER.role === 'owner' || ACTIVE_USER.role === 'admin') ? true : !ch.isHidden;
        }).sort((a, b) => (b.subscribers || 0) - (a.subscribers || 0)).slice(0, 5);
        addSystemMessage('🔥 Popüler kanallar:\n' + v.map(ch => `• #${ch.name} - ${(ch.subscribers || 1).toLocaleString()} abone`).join('\n'));
    }

    else if (main === 'kanal') {
        let ch = channels[currentChannel];
        let f = (ch.subscribers || 1) >= 1000000 ? ((ch.subscribers || 1) / 1000000).toFixed(1) + 'M' : (ch.subscribers || 1) >= 1000 ? ((ch.subscribers || 1) / 1000).toFixed(1) + 'K' : (ch.subscribers || 1);
        addSystemMessage(`📢 #${currentChannel} • ${f} abone • ${ch.onlineUsers ? ch.onlineUsers.length : 1} çevrimiçi • Sahip: ${ch.owner}`);
    }

    else if (main === 'kanalac') loadLeftPanel('createchannel');

    else if (main === 'youtube' || main === 'video') openAddYoutubeModal();

    else if (main === 'kick') {
        let target = parts[1];
        if (!target) {
            addSystemMessage('Kullanım: /kick kullanıcı');
            return;
        }
        let ch = channels[currentChannel];
        let canKick = ACTIVE_USER.role === 'owner' || ACTIVE_USER.role === 'admin' || (ch.coAdmins?.includes(ACTIVE_USER.name));
        if (!canKick) {
            addSystemMessage('❌ Bu komut için yetkin yok!');
            return;
        }
        if (target === ACTIVE_USER.name) {
            addSystemMessage('❌ Kendini atamazsın!');
            return;
        }
        if (!ch.onlineUsers.includes(target)) {
            addSystemMessage(`❌ ${target} kanalda değil.`);
            return;
        }
        ch.onlineUsers = ch.onlineUsers.filter(u => u !== target);
        saveChannels();
        addSystemMessage(`👢 ${target} kanaldan atıldı.`);
        sendToAdminChannel(`👢 ${ACTIVE_USER.name}, ${target} kullanıcısını #${currentChannel} kanalından attı.`);
    }

    else if (main === 'ban') {
        let target = parts[1];
        if (!target) {
            addSystemMessage('Kullanım: /ban kullanıcı');
            return;
        }
        let ch = channels[currentChannel];
        
        let canBan = ACTIVE_USER.role === 'owner' || ACTIVE_USER.role === 'admin' || (ch.coAdmins?.includes(ACTIVE_USER.name) && ch.owner === ACTIVE_USER.name);
        
        if (!canBan) {
            addSystemMessage('❌ Bu komut için yetkin yok!');
            return;
        }
        if (target === ACTIVE_USER.name) {
            addSystemMessage('❌ Kendini yasaklayamazsın!');
            return;
        }
        let user = USERS_DB.find(u => u.name === target);
        if (!user) {
            addSystemMessage('❌ Kullanıcı bulunamadı.');
            return;
        }
        let blockKey = `${ACTIVE_USER.id}_${user.id}`;
        BLOCKED_USERS[blockKey] = { userId: user.id, userName: target, expiry: Date.now() + 24 * 60 * 60 * 1000, blockedBy: ACTIVE_USER.id };
        localStorage.setItem('cetcety_blocks', JSON.stringify(BLOCKED_USERS));
        addSystemMessage(`🚫 ${target} 24 saat yasaklandı.`);
        sendToAdminChannel(`🚫 ${ACTIVE_USER.name}, ${target} kullanıcısını 24 saat yasakladı.`);
        
        if (channels[currentChannel].onlineUsers.includes(target)) {
            channels[currentChannel].onlineUsers = channels[currentChannel].onlineUsers.filter(u => u !== target);
            saveChannels();
        }
    }

    else if (main === 'op') {
        let target = parts[1];
        if (!target) {
            addSystemMessage('Kullanım: /op kullanıcı');
            return;
        }
        let ch = channels[currentChannel];
        let canOp = ACTIVE_USER.role === 'owner' || ACTIVE_USER.role === 'admin' || (ch.owner === ACTIVE_USER.name);
        if (!canOp) {
            addSystemMessage('❌ Yetkin yok!');
            return;
        }
        let user = USERS_DB.find(u => u.name === target);
        if (!user) {
            addSystemMessage('❌ Kullanıcı bulunamadı.');
            return;
        }
        if (!ch.coAdmins) ch.coAdmins = [];
        if (!ch.coAdmins.includes(target)) {
            ch.coAdmins.push(target);
            user.role = 'coadmin';
            let userIndex = USERS_DB.findIndex(u => u.id === user.id);
            if (userIndex !== -1) USERS_DB[userIndex].role = 'coadmin';
            localStorage.setItem('cetcety_users', JSON.stringify(USERS_DB));
            saveChannels();
            addSystemMessage(`🔧 ${target} artık #${currentChannel} kanalında coadmin.`);
            sendToAdminChannel(`🔧 ${ACTIVE_USER.name}, ${target} kullanıcısını #${currentChannel} kanalında co-admin yaptı.`);
        } else addSystemMessage(`ℹ️ ${target} zaten coadmin.`);
    }

    else if (main === 'deop') {
        let target = parts[1];
        if (!target) {
            addSystemMessage('Kullanım: /deop kullanıcı');
            return;
        }
        let ch = channels[currentChannel];
        let canDeop = ACTIVE_USER.role === 'owner' || ACTIVE_USER.role === 'admin' || (ch.owner === ACTIVE_USER.name);
        if (!canDeop) {
            addSystemMessage('❌ Yetkin yok!');
            return;
        }
        if (ch.coAdmins && ch.coAdmins.includes(target)) {
            ch.coAdmins = ch.coAdmins.filter(u => u !== target);
            saveChannels();
            addSystemMessage(`🔨 ${target} coadmin yetkisi alındı.`);
            sendToAdminChannel(`🔨 ${ACTIVE_USER.name}, ${target} kullanıcısının co-admin yetkisini aldı.`);
        } else addSystemMessage(`ℹ️ ${target} coadmin değil.`);
    }

    else if (main === 'kanalsil') {
        if (!ACTIVE_USER.myChannel) {
            addSystemMessage('❌ Silinecek bir kanalınız yok!');
            return;
        }
        if (confirm(`#${ACTIVE_USER.myChannel} kanalını silmek istediğinize emin misiniz?`)) {
            let channelName = ACTIVE_USER.myChannel;
            delete channels[ACTIVE_USER.myChannel];
            saveChannels();
            ACTIVE_USER.myChannel = null;
            if (ACTIVE_USER.role !== 'owner') ACTIVE_USER.role = 'user';
            localStorage.setItem('cetcety_active_user', JSON.stringify(ACTIVE_USER));
            const index = USERS_DB.findIndex(u => u.id === ACTIVE_USER.id);
            if (index !== -1) USERS_DB[index] = ACTIVE_USER;
            localStorage.setItem('cetcety_users', JSON.stringify(USERS_DB));
            addSystemMessage('🗑️ Kanalınız silindi.');
            sendToAdminChannel(`🗑️ ${ACTIVE_USER.name}, #${channelName} kanalını sildi.`);
            updateAllBadges();
            joinChannel('genel');
            loadLeftPanel('profile');
        }
    }

    else if (main === 'gizle') {
        toggleChannelHidden();
    }

    else if (main === 'unban') {
        let target = parts[1];
        if (!target) {
            addSystemMessage('Kullanım: /unban kullanıcı');
            return;
        }
        let canUnban = ACTIVE_USER.role === 'owner' || ACTIVE_USER.role === 'admin';
        if (!canUnban) {
            addSystemMessage('❌ Sadece admin unban yapabilir.');
            return;
        }
        let found = false;
        for (let key in BLOCKED_USERS) {
            if (BLOCKED_USERS[key].userName === target) {
                delete BLOCKED_USERS[key];
                found = true;
            }
        }
        if (found) {
            localStorage.setItem('cetcety_blocks', JSON.stringify(BLOCKED_USERS));
            addSystemMessage(`✅ ${target} yasağı kaldırıldı.`);
            sendToAdminChannel(`✅ ${ACTIVE_USER.name}, ${target} kullanıcısının yasağını kaldırdı.`);
        } else addSystemMessage(`❌ ${target} için yasak bulunamadı.`);
    }

    else {
        addSystemMessage(`❌ Bilinmeyen komut: ${cmd}`);
    }
}
