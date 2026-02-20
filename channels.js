// ========== KANAL İŞLEMLERİ ==========

// Kanal mesajlarını başlat
function initChannelMessages(channel) {
    if (!CHANNEL_MESSAGES[channel]) {
        CHANNEL_MESSAGES[channel] = [];
    }
}

// Kanalları kaydet
function saveChannels() {
    localStorage.setItem('cetcety_channels', JSON.stringify(channels));
}

// Kanal UI'ını güncelle
function updateChannelUI() {
    let c = channels[currentChannel];
    if (c) {
        document.getElementById('currentChannelName').textContent = currentChannel;
        document.getElementById('channelUserCount').textContent = c.onlineUsers ? c.onlineUsers.length : 1;
        
        let sub = c.subscribers || 1;
        let fmt = sub >= 1000000 ? (sub / 1000000).toFixed(1) + 'M' : sub >= 1000 ? (sub / 1000).toFixed(1) + 'K' : sub;
        document.getElementById('channelSubscribers').textContent = fmt;
    }
}

// Kanala katıl
function joinChannel(ch) {
    if (!channels[ch]) return;

    if (channels[ch].isSuperHidden && ACTIVE_USER.role !== 'owner') {
        addSystemMessage('❌ Bu kanala erişim yetkiniz yok.');
        return;
    }

    if (ch === 'admin' && !(ACTIVE_USER.role === 'owner' || ACTIVE_USER.role === 'admin')) {
        addSystemMessage('❌ Bu kanala erişim yetkiniz yok.');
        return;
    }

    // Eski kanaldan ayrıl
    if (currentChannel && channels[currentChannel] && typeof updateUserOnlineStatus === 'function' && database && ACTIVE_USER) {
        updateUserOnlineStatus(ACTIVE_USER, currentChannel, 'offline');
    }

    currentChannel = ch;
    
    // Yeni kanala katıl
    if (typeof updateUserOnlineStatus === 'function' && database && ACTIVE_USER) {
        updateUserOnlineStatus(ACTIVE_USER, ch, 'online');
        listenChannelMessages(ch);
        listenChannelInfo(ch);
        listenChannelUsers(ch);
    }

    let c = channels[ch];
    if (!c.onlineUsers.includes(ACTIVE_USER.name)) {
        c.onlineUsers.push(ACTIVE_USER.name);
    }
    saveChannels();

    document.getElementById('currentChannelName').textContent = ch;
    let sub = c.subscribers || 1;
    let fmt = sub >= 1000000 ? (sub / 1000000).toFixed(1) + 'M' : sub >= 1000 ? (sub / 1000).toFixed(1) + 'K' : sub;
    document.getElementById('channelSubscribers').textContent = fmt;
    document.getElementById('channelUserCount').textContent = c.onlineUsers.length;

    if (typeof updateMediaDisplay === 'function') updateMediaDisplay();
    if (typeof loadChannelMessages === 'function') loadChannelMessages(ch);

    let subBtn = document.getElementById('subscribeChannelBtn');
    if (ACTIVE_USER.subscribedChannels.includes(ch)) {
        subBtn.innerHTML = '<i class="fas fa-check"></i> Abone Olundu';
        subBtn.classList.add('subscribed');
    } else {
        subBtn.innerHTML = '<i class="fas fa-plus"></i> Abone Ol';
        subBtn.classList.remove('subscribed');
    }

    if (typeof updateRoleControls === 'function') updateRoleControls();
    addSystemMessage(`📢 #${ch} kanalına katıldın! ${fmt} abone, ${c.onlineUsers.length} çevrimiçi.`);
}

// Kanal gizle/göster
function toggleChannelHidden() {
    let c = channels[currentChannel];
    if (!c) return;
    
    if (c.isSuperHidden && ACTIVE_USER.role !== 'owner') {
        addSystemMessage('❌ Bu kanalı gizleme yetkiniz yok!');
        return;
    }
    
    if (ACTIVE_USER.role === 'owner' || ACTIVE_USER.role === 'admin' || c.coAdmins?.includes(ACTIVE_USER.name)) {
        c.isHidden = !c.isHidden;
        saveChannels();
        let icon = document.getElementById('hideYoutubeIcon');
        if (icon) icon.className = c.isHidden ? 'fas fa-eye-slash' : 'fas fa-eye';
        
        addSystemMessage(`👁️ #${currentChannel} ${c.isHidden ? 'gizlendi' : 'gösteriliyor'}.`);
        sendToAdminChannel(`👁️ ${ACTIVE_USER.name}, #${currentChannel} kanalını ${c.isHidden ? 'gizledi' : 'gösterdi'}.`);
        if (typeof updatePopularChannels === 'function') updatePopularChannels();
    } else {
        addSystemMessage('❌ Yetkiniz yok!');
    }
}

// Kanal oluştur
function createChannel() {
    if (ACTIVE_USER.role !== 'owner' && ACTIVE_USER.myChannel) {
        alert('Zaten bir kanalınız var!');
        return;
    }
    
    let name = document.getElementById('newChannelName')?.value?.toLowerCase().trim();
    if (!name) {
        alert('Kanal adı girin!');
        return;
    }
    
    if (!/^[a-z0-9-]+$/.test(name)) {
        alert('Kanal adı sadece küçük harf, rakam ve tire içerebilir!');
        return;
    }
    
    if (channels[name]) {
        alert('Bu kanal adı zaten mevcut!');
        return;
    }
    
    let desc = document.getElementById('newChannelDesc')?.value?.trim() || `${ACTIVE_USER.name} tarafından oluşturuldu.`;
    let category = document.getElementById('newChannelCategory')?.value || 'general';
    
    channels[name] = {
        name, 
        owner: ACTIVE_USER.name, 
        ownerRole: 'coadmin', 
        coAdmins: [ACTIVE_USER.name],
        subscribers: 1, 
        online: 1, 
        description: desc, 
        category: category,
        isPrivate: false, 
        isHidden: false,
        isSuperHidden: false,
        youtube: {
            currentVideo: 'jfKfPfyJRdk',
            currentTitle: 'CETCETY Radio',
            currentArtist: ACTIVE_USER.name,
            playlist: [{ id: 'jfKfPfyJRdk', title: 'CETCETY Radio', addedBy: ACTIVE_USER.name, role: 'coadmin' }]
        },
        onlineUsers: [ACTIVE_USER.name]
    };
    
    saveChannels();
    ACTIVE_USER.myChannel = name;
    
    if (ACTIVE_USER.role !== 'owner') ACTIVE_USER.role = 'coadmin';
    if (!ACTIVE_USER.subscribedChannels.includes(name)) ACTIVE_USER.subscribedChannels.push(name);
    
    localStorage.setItem('cetcety_active_user', JSON.stringify(ACTIVE_USER));
    
    const index = USERS_DB.findIndex(u => u.id === ACTIVE_USER.id);
    if (index !== -1) {
        USERS_DB[index] = ACTIVE_USER;
        localStorage.setItem('cetcety_users', JSON.stringify(USERS_DB));
    }
    
    if (typeof updateAllBadges === 'function') updateAllBadges();
    addSystemMessage(`✅ #${name} kanalı oluşturuldu!`);
    sendToAdminChannel(`✅ ${ACTIVE_USER.name}, #${name} kanalını oluşturdu.`);
    joinChannel(name);
    if (typeof loadLeftPanel === 'function') loadLeftPanel('channels');
}

// Kanalı sil
function deleteMyChannel() {
    if (!ACTIVE_USER.myChannel) return;
    if (confirm(`#${ACTIVE_USER.myChannel} kanalını kalıcı olarak silmek istediğinize emin misiniz?`)) {
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
        if (typeof updateAllBadges === 'function') updateAllBadges();
        joinChannel('genel');
        if (typeof loadLeftPanel === 'function') loadLeftPanel('profile');
    }
}
