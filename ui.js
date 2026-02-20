// ========== UI PANEL YÖNETİMİ ==========

// Sol panel yükle
function loadLeftPanel(panelName) {
    if (!ACTIVE_USER) return;
    const panel = document.getElementById('leftPanel');
    if (panelName === 'subscriptions') loadSubscriptionsPanel(panel);
    else if (panelName === 'channels') loadChannelsPanel(panel);
    else if (panelName === 'chatlist') loadChatListPanel(panel);
    else if (panelName === 'notifications') loadNotificationsPanel(panel);
    else if (panelName === 'profile') loadProfilePanel(panel);
    else if (panelName === 'createchannel') loadCreateChannelPanel(panel);
    else if (panelName === 'support') loadSupportPanel(panel);
    else loadSubscriptionsPanel(panel);
    setActiveIcon(panelName);
}

// Sol panel kapat
function closeLeftPanel() { 
    loadLeftPanel('subscriptions'); 
}

// İkon paneli aktif et
function setActiveIcon(active) {
    document.querySelectorAll('.icon-item').forEach(el => el.classList.remove('active'));
    if (active === 'subscriptions') document.querySelector('.icon-item[onclick*="openSubscriptions"]')?.classList.add('active');
    else if (active === 'channels') document.querySelector('.icon-item[onclick*="openChannelPanel"]')?.classList.add('active');
    else if (active === 'chatlist') document.querySelector('.icon-item[onclick*="openChatListPanel"]')?.classList.add('active');
    else if (active === 'notifications') document.querySelector('.icon-item[onclick*="openNotificationPanel"]')?.classList.add('active');
    else if (active === 'profile') document.querySelector('.profile-avatar')?.classList.add('active');
}

// İkon fonksiyonları
function openSubscriptions() { loadLeftPanel('subscriptions'); }
function openChannelPanel() { loadLeftPanel('channels'); }
function openChatListPanel() { loadLeftPanel('chatlist'); }
function openNotificationPanel() { loadLeftPanel('notifications'); }
function openProfilePanel() { loadLeftPanel('profile'); }

// UI'ı kullanıcıya göre güncelle
function updateUIForUser() {
    let avatarSpan = document.getElementById('avatarText');
    let avatarImg = document.getElementById('avatarImage');
    
    if (ACTIVE_USER.avatarData) {
        avatarSpan.style.display = 'none';
        avatarImg.style.display = 'block';
        avatarImg.src = ACTIVE_USER.avatarData;
    } else {
        avatarSpan.style.display = 'block';
        avatarImg.style.display = 'none';
        avatarSpan.textContent = ACTIVE_USER.avatar || ACTIVE_USER.name.charAt(0).toUpperCase();
    }
}

// Tüm rozetleri güncelle
function updateAllBadges() {
    document.getElementById('subscriptionBadge').textContent = ACTIVE_USER.subscribedChannels.length;
    document.getElementById('channelCountBadge').textContent = Object.keys(channels).length;
    updateUnreadBadge();
    updatePopularChannels();
}

// Okunmamış mesaj rozetini güncelle
function updateUnreadBadge() {
    let total = 0;
    for (let chatId in PRIVATE_CHATS) {
        if (PRIVATE_CHATS[chatId]) {
            total += PRIVATE_CHATS[chatId].filter(m => m.senderId != ACTIVE_USER?.id && !m.read).length;
        }
    }
    document.getElementById('chatListBadge').textContent = total || 0;
}

// Popüler kanalları güncelle
function updatePopularChannels() {
    let container = document.getElementById('popularChannelsList');
    if (!container || !ACTIVE_USER) return;

    container.innerHTML = '';
    let popularChannels = Object.values(channels)
        .filter(ch => {
            if (ch.isSuperHidden && ACTIVE_USER.role !== 'owner') return false;
            return !ch.isHidden || ACTIVE_USER?.role === 'owner' || ACTIVE_USER?.role === 'admin';
        })
        .sort((a, b) => (b.subscribers || 0) - (a.subscribers || 0))
        .slice(0, 5);

    popularChannels.forEach(ch => {
        let isSubscribed = ACTIVE_USER?.subscribedChannels?.includes(ch.name);
        let subCount = ch.subscribers || 1;
        let subText = subCount >= 1000000 ? (subCount / 1000000).toFixed(1) + 'M' :
            subCount >= 1000 ? (subCount / 1000).toFixed(1) + 'K' : subCount;

        container.innerHTML += `
            <div class="popular-item" onclick="joinChannel('${ch.name}')">
                <div class="popular-info">
                    <div class="popular-name">#${ch.name}</div>
                    <div class="popular-subscribers">${subText} abone</div>
                </div>
                <button class="subscribe-btn ${isSubscribed ? 'subscribed' : ''}" 
                        onclick="event.stopPropagation(); ${isSubscribed ? 'unsubscribeChannel' : 'subscribeChannel'}('${ch.name}')">
                    <i class="fas ${isSubscribed ? 'fa-check' : 'fa-plus'}"></i>
                    ${isSubscribed ? 'Abone Olundu' : 'Abone Ol'}
                </button>
            </div>
        `;
    });
}

// Abonelikler paneli
function loadSubscriptionsPanel(panel) {
    let html = `<div class="panel-header"><h3><i class="fas fa-bell" style="color:#ffd700;"></i> Abonelikler</h3><span class="subscription-count">${ACTIVE_USER.subscribedChannels.length}</span><div class="panel-close" onclick="closeLeftPanel()"><i class="fas fa-times"></i></div></div><div class="panel-content">`;
    html += `<div class="search-container"><i class="fas fa-search"></i><input type="text" class="search-input" placeholder="Kanal, kullanıcı ara..." id="panelSearchInput"></div>`;
    
    let visible = ACTIVE_USER.subscribedChannels.filter(ch => {
        let c = channels[ch]; 
        if (!c) return true;
        
        if (c.isSuperHidden && ACTIVE_USER.role !== 'owner') return false;
        
        if (ch === 'admin' && !(ACTIVE_USER.role === 'owner' || ACTIVE_USER.role === 'admin')) return false;
        return (ACTIVE_USER.role === 'owner' || ACTIVE_USER.role === 'admin') ? true : !c.isHidden;
    });
    
    if (visible.length === 0) html += '<div style="color:#aaa; padding:16px; text-align:center;">Abone olunan kanal yok.</div>';
    else visible.forEach(ch => {
        let c = channels[ch] || { owner: 'MateKy', subscribers: 1, online: 0, ownerRole: 'user', isHidden: false, isSuperHidden: false };
        let icon = 'fa-hashtag';
        let sub = c.subscribers || 1;
        let fmt = sub >= 1000000 ? (sub / 1000000).toFixed(1) + 'M' : sub >= 1000 ? (sub / 1000).toFixed(1) + 'K' : sub;
        let active = ch === currentChannel ? 'active' : '';
        let hidden = c.isHidden ? '<span class="badge badge-hidden">GİZLİ</span>' : '';
        let superHidden = c.isSuperHidden ? '<span class="badge badge-super-hidden">SÜPER GİZLİ</span>' : '';
        
        let roleDisplay = '';
        if (c.ownerRole === 'owner') {
            if (ACTIVE_USER.role === 'owner') {
                roleDisplay = '<span class="badge badge-owner">👑</span>';
            } else {
                roleDisplay = '';
            }
        } else if (c.ownerRole === 'admin') {
            roleDisplay = '<span class="badge badge-admin">⚡</span>';
        } else if (c.ownerRole === 'coadmin') {
            roleDisplay = '<span class="badge badge-coadmin">🔧</span>';
        }
        
        html += `<div class="subscription-item ${active}" onclick="joinChannel('${ch}')"><div class="subscription-avatar"><i class="fas ${icon}"></i></div><div class="subscription-info"><div class="subscription-name">${ch} ${hidden} ${superHidden} ${roleDisplay}</div><div class="subscription-meta"><span>${c.owner}</span><span>• ${fmt} abone</span></div></div><div class="subscription-stats">${c.onlineUsers ? c.onlineUsers.length : 0}</div></div>`;
    });
    html += `</div><div class="popular-channels"><div class="popular-header"><i class="fas fa-fire" style="color:#ff4444;"></i> Popüler Kanallar</div><div id="popularChannelsList"></div></div>`;
    panel.innerHTML = html;
    updatePopularChannels();
}

// Tüm kanallar paneli
function loadChannelsPanel(panel) {
    let html = `<div class="panel-header"><h3><i class="fas fa-list-ul" style="color:#ff0000;"></i> Tüm Kanallar</h3><span class="subscription-count">${Object.keys(channels).length}</span><div class="panel-close" onclick="closeLeftPanel()"><i class="fas fa-times"></i></div></div><div class="panel-content">`;
    html += `<div class="search-container"><i class="fas fa-search"></i><input type="text" class="search-input" placeholder="Kanal ara..."></div>`;
    
    let vis = Object.values(channels).filter(ch => {
        if (ch.isSuperHidden && ACTIVE_USER.role !== 'owner') return false;
        if (ch.name === 'admin' && !(ACTIVE_USER.role === 'owner' || ACTIVE_USER.role === 'admin')) return false;
        return (ACTIVE_USER.role === 'owner' || ACTIVE_USER.role === 'admin') ? true : !ch.isHidden;
    });
    
    vis.sort((a, b) => (b.subscribers || 0) - (a.subscribers || 0)).forEach(ch => {
        let sub = ch.subscribers || 1, fmt = sub >= 1000000 ? (sub / 1000000).toFixed(1) + 'M' : sub >= 1000 ? (sub / 1000).toFixed(1) + 'K' : sub;
        let isSub = ACTIVE_USER.subscribedChannels.includes(ch.name);
        let hidden = ch.isHidden ? '<span class="badge badge-hidden">GİZLİ</span>' : '';
        let superHidden = ch.isSuperHidden ? '<span class="badge badge-super-hidden">SÜPER GİZLİ</span>' : '';
        
        let roleDisplay = '';
        if (ch.ownerRole === 'owner') {
            if (ACTIVE_USER.role === 'owner') {
                roleDisplay = '<span class="badge badge-owner">👑</span>';
            } else {
                roleDisplay = '';
            }
        } else if (ch.ownerRole === 'admin') {
            roleDisplay = '<span class="badge badge-admin">⚡</span>';
        } else if (ch.ownerRole === 'coadmin') {
            roleDisplay = '<span class="badge badge-coadmin">🔧</span>';
        }
        
        html += `<div class="channel-item" onclick="joinChannel('${ch.name}')"><div class="channel-avatar"><i class="fas fa-hashtag"></i></div><div class="channel-info"><div class="channel-name">${ch.name} ${hidden} ${superHidden} ${roleDisplay}</div><div class="channel-meta"><span>${ch.owner}</span><span>• ${fmt} abone</span><span>• ${ch.onlineUsers ? ch.onlineUsers.length : 0} çevrimiçi</span></div></div><button class="subscribe-btn ${isSub ? 'subscribed' : ''}" onclick="event.stopPropagation(); ${isSub ? 'unsubscribeChannel' : 'subscribeChannel'}('${ch.name}')"><i class="fas ${isSub ? 'fa-check' : 'fa-plus'}"></i> ${isSub ? 'Abone Olundu' : 'Abone Ol'}</button></div>`;
    });
    html += `</div>`;
    panel.innerHTML = html;
}

// Sohbetlerim paneli
function loadChatListPanel(panel) {
    updateUnreadBadge();
    let html = `<div class="panel-header"><h3><i class="fas fa-comment" style="color:#7289da;"></i> Sohbetlerim</h3><span class="subscription-count" id="chatListCount">${document.getElementById('chatListBadge').textContent}</span><div class="panel-close" onclick="closeLeftPanel()"><i class="fas fa-times"></i></div></div>`;
    html += `<div class="panel-tabs"><div id="tabChats" class="panel-tab active" onclick="switchChatTab('chats')">Sohbetler</div><div id="tabOnline" class="panel-tab" onclick="switchChatTab('online')">Çevrimiçi (${channels[currentChannel]?.onlineUsers?.length || 1})</div></div>`;
    html += `<div class="panel-content" id="chatPanelContent"></div>`;
    panel.innerHTML = html;
    showChatsTab();
}

// Chat tabını değiştir
function switchChatTab(tab) {
    document.getElementById('tabChats').classList.toggle('active', tab === 'chats');
    document.getElementById('tabOnline').classList.toggle('active', tab === 'online');
    if (tab === 'chats') showChatsTab();
    else showOnlineTab();
}

// Sohbetler tabını göster
function showChatsTab() {
    let c = document.getElementById('chatPanelContent');
    if (!c) return;

    let chats = [];
    for (let chatId in PRIVATE_CHATS) {
        if (!PRIVATE_CHATS[chatId] || !ACTIVE_USER) continue;
        let ids = chatId.split('_');
        let otherId = ids[0] == ACTIVE_USER.id ? ids[1] : ids[0];
        let otherUser = USERS_DB.find(u => u.id == otherId) || { name: 'Kullanıcı' };
        let lastMsg = PRIVATE_CHATS[chatId].slice(-1)[0];
        let unread = PRIVATE_CHATS[chatId].filter(m => m.senderId != ACTIVE_USER.id && !m.read).length;
        chats.push({ name: otherUser.name, lastMsg: lastMsg ? (lastMsg.type === 'text' ? lastMsg.content : '📎 medya') : '...', time: lastMsg ? new Date(lastMsg.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '', unread });
    }

    let h = '';
    if (chats.length === 0) {
        h = '<div style="color:#aaa; padding:16px; text-align:center;">Henüz özel sohbet yok.</div>';
    } else {
        chats.forEach(chat => {
            h += `<div class="chat-item" onclick="openPrivateChat('${chat.name}')"><div class="chat-avatar"><span>${chat.name.charAt(0)}</span></div><div class="chat-info"><div class="chat-name">${chat.name}${chat.unread > 0 ? '<span class="subscription-notification" style="margin-left:8px;"></span>' : ''}</div><div class="chat-meta"><span>${escapeHTML(chat.lastMsg)}</span><span>• ${chat.time}</span></div></div>${chat.unread > 0 ? `<div class="subscription-stats" style="color:#ff4444;">${chat.unread}</div>` : ''}</div>`;
        });
    }
    c.innerHTML = h;
}

// Online tabını göster
function showOnlineTab() {
    let c = document.getElementById('chatPanelContent');
    if (!c) return;

    let users = channels[currentChannel]?.onlineUsers || [];
    let h = '';
    if (users.length === 0) {
        h = '<div style="color:#aaa; padding:16px; text-align:center;">Çevrimiçi kullanıcı yok.</div>';
    } else {
        users.forEach(u => {
            h += `<div class="online-item" onclick="openPrivateChat('${u}')"><div class="online-avatar"><span>${u.charAt(0)}</span></div><div class="online-info"><div class="online-name">${u}<span class="online-status"></span></div><div class="online-meta"><span>#${currentChannel}</span></div></div></div>`;
        });
    }
    c.innerHTML = h;
}

// Bildirimler paneli
function loadNotificationsPanel(panel) {
    let h = `<div class="panel-header"><h3><i class="fas fa-bell" style="color:#ff4444;"></i> Bildirimler</h3><span class="subscription-count">0</span><div class="panel-close" onclick="closeLeftPanel()"><i class="fas fa-times"></i></div></div><div class="panel-content">`;
    h += `<div style="color:#aaa; padding:16px; text-align:center;">Henüz bildirim yok.</div>`;
    h += `</div>`;
    panel.innerHTML = h;
}

// Profil paneli
function loadProfilePanel(panel) {
    let date = ACTIVE_USER.joinDate ? new Date(ACTIVE_USER.joinDate) : new Date();
    let fmtDate = `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
    
    let roleText = '';
    let roleClass = '';
    
    if (ACTIVE_USER.role === 'owner') {
        roleText = '👑 Kurucu';
        roleClass = 'badge-owner';
    } else if (ACTIVE_USER.role === 'admin') {
        roleText = '⚡ Admin';
        roleClass = 'badge-admin';
    } else if (ACTIVE_USER.role === 'coadmin') {
        roleText = '🔧 Co-Admin';
        roleClass = 'badge-coadmin';
    } else {
        roleText = '👤 Kullanıcı';
    }
    
    let avatarHtml = '';
    if (ACTIVE_USER.avatarData) {
        avatarHtml = `<img src="${ACTIVE_USER.avatarData}" style="width:100%; height:100%; object-fit:cover;">`;
    } else {
        avatarHtml = ACTIVE_USER.avatar || ACTIVE_USER.name.charAt(0).toUpperCase();
    }
    
    let h = `<div class="panel-header"><h3><i class="fas fa-user" style="color:#ff0000;"></i> Profil</h3><div class="panel-close" onclick="closeLeftPanel()"><i class="fas fa-times"></i></div></div>
    <div class="panel-content">
        <div style="display:flex; flex-direction:column; align-items:center; padding:20px 0;">
            <div class="profile-avatar-panel" style="width:80px; height:80px; font-size:32px; margin-bottom:12px; cursor:pointer; overflow:hidden;" onclick="openAvatarModal()">
                ${avatarHtml}
            </div>
            <h2 style="font-size:20px; font-weight:700; color:#fff; margin-bottom:4px;">${ACTIVE_USER.name}</h2>
            <span class="badge ${roleClass}" style="margin-bottom:16px;">${roleText}</span>
            <div style="display:flex; gap:12px; margin-bottom:16px;">
                <button class="form-button secondary" style="padding:8px 16px; font-size:12px;" onclick="openAvatarModal()"><i class="fas fa-camera"></i> Resim Yükle</button>
                <button class="form-button" style="padding:8px 16px; font-size:12px;" onclick="loadLeftPanel('createchannel')"><i class="fas fa-plus-circle"></i> Kanal Aç</button>
                <button class="form-button secondary" style="padding:8px 16px; font-size:12px;" onclick="loadLeftPanel('support')"><i class="fas fa-headset"></i> Destek</button>
            </div>
        </div>
        <div style="display:flex; justify-content:space-around; padding:16px 0; border-top:1px solid rgba(255,255,255,0.1); border-bottom:1px solid rgba(255,255,255,0.1); margin-bottom:16px;">
            <div style="text-align:center;"><div style="font-size:18px; font-weight:700; color:#fff;">${ACTIVE_USER.subscribedChannels.length}</div><div style="font-size:11px; color:#aaa;">Abonelik</div></div>
            <div style="text-align:center;"><div style="font-size:18px; font-weight:700; color:#fff;">${ACTIVE_USER.myChannel ? '1' : '0'}</div><div style="font-size:11px; color:#aaa;">Kanalım</div></div>
            <div style="text-align:center;"><div style="font-size:18px; font-weight:700; color:#fff;">${fmtDate.split('.')[0]}</div><div style="font-size:11px; color:#aaa;">Katılım</div></div>
        </div>
        <div class="form-group"><label class="form-label">Kullanıcı Adı</label><input type="text" id="profileNick" class="form-input" value="${ACTIVE_USER.name}"><button class="form-button secondary" style="margin-top:8px;" onclick="changeNick()">Değiştir</button></div>
        <div class="form-group"><label class="form-label">Şifre</label><input type="password" id="profilePassword" class="form-input" placeholder="Yeni şifre"><button class="form-button secondary" style="margin-top:8px;" onclick="changePassword()">Şifreyi Kaydet</button></div>
        <div class="form-group"><label class="form-label">Özel Sohbet</label>
            <select id="privateModeSelect" class="form-select" onchange="changePrivateMode()">
                <option value="all" ${ACTIVE_USER.privateMode === 'all' ? 'selected' : ''}>Herkese Açık</option>
                <option value="none" ${ACTIVE_USER.privateMode === 'none' ? 'selected' : ''}>Herkese Kapalı</option>
                <option value="blocked" ${ACTIVE_USER.privateMode === 'blocked' ? 'selected' : ''}>Sadece Engellenenler</option>
            </select>
        </div>
        <div class="form-group"><label class="form-label">Belirli kişiyi engelle (nick)</label><input type="text" id="blockNickInput" class="form-input" placeholder="Kullanıcı adı"><button class="form-button secondary" style="margin-top:8px;" onclick="blockSpecificNick()">Engelle</button></div>
        ${ACTIVE_USER.blockedNicks && ACTIVE_USER.blockedNicks.length ? `
        <div style="margin-bottom:16px;">
            <label class="form-label">Engellenen Kişiler</label>
            <div style="background:rgba(26,26,26,0.8); border-radius:8px; padding:12px;">
                ${ACTIVE_USER.blockedNicks.map(nick => `<span style="display:inline-block; background:rgba(42,42,42,0.8); padding:4px 10px; border-radius:20px; margin:0 4px 4px 0; font-size:12px;">${nick} <i class="fas fa-times" style="margin-left:6px; cursor:pointer;" onclick="unblockNick('${nick}')"></i></span>`).join('')}
            </div>
        </div>` : ''}
        ${ACTIVE_USER.myChannel ? `<div style="margin-top:16px;"><button class="form-button danger" onclick="deleteMyChannel()">Kanalımı Sil</button></div>` : ''}
        <div style="margin-top:24px;"><button class="form-button" onclick="logout()">Güvenli Çıkış</button></div>
    `;

    h += `</div>`;
    panel.innerHTML = h;
}

// Kanal aç paneli
function loadCreateChannelPanel(panel) {
    let h = `<div class="panel-header"><h3><i class="fas fa-plus-circle" style="color:#ff0000;"></i> Kanal Aç</h3><div class="panel-close" onclick="closeLeftPanel()"><i class="fas fa-times"></i></div></div>
    <div class="panel-content">
        <div class="info-box">
            <p><i class="fas fa-info-circle"></i> Yeni bir kanal açarak kendi topluluğunu oluşturabilirsin. Kanal sahibi olarak co-admin yetkilerine sahip olursun.</p>
        </div>`;

    if (ACTIVE_USER.role !== 'owner' && ACTIVE_USER.myChannel) {
        h += `<div class="info-box" style="border-left-color: #ffaa00;">
            <p><i class="fas fa-exclamation-triangle" style="color:#ffaa00;"></i> Zaten bir kanalınız var: <strong>#${ACTIVE_USER.myChannel}</strong>. Bir kullanıcı sadece bir kanala sahip olabilir.</p>
        </div>`;
    } else {
        h += `<div class="form-group">
            <label class="form-label">Kanal Adı</label>
            <input type="text" id="newChannelName" class="form-input" placeholder="örnek: teknoloji, oyun, müzik" maxlength="20">
            <div style="font-size:11px; color:#aaa; margin-top:4px;">Sadece küçük harf, rakam ve tire kullanabilirsiniz.</div>
        </div>
        <div class="form-group">
            <label class="form-label">Kanal Açıklaması</label>
            <textarea id="newChannelDesc" class="form-textarea" placeholder="Kanalın konusu ve kuralları..."></textarea>
        </div>
        <div class="form-group">
            <label class="form-label">Kategori (Opsiyonel)</label>
            <select id="newChannelCategory" class="form-select">
                <option value="general">Genel</option>
                <option value="music">Müzik</option>
                <option value="gaming">Oyun</option>
                <option value="technology">Teknoloji</option>
                <option value="sports">Spor</option>
            </select>
        </div>
        <button class="form-button" onclick="createChannel()">Kanalı Oluştur</button>`;
    }
    h += `</div>`;
    panel.innerHTML = h;
}

// Destek paneli
function loadSupportPanel(panel) {
    let h = `<div class="panel-header"><h3><i class="fas fa-headset" style="color:#7289da;"></i> Destek</h3><div class="panel-close" onclick="closeLeftPanel()"><i class="fas fa-times"></i></div></div>
    <div class="panel-content">
        <div class="info-box">
            <p><i class="fas fa-info-circle"></i> Canlı destek talebiniz #admin kanalına iletilir. Size en kısa sürede yardımcı olacağız.</p>
        </div>
        
        <div style="background:rgba(26,26,26,0.8); border-radius:12px; padding:20px; margin-bottom:20px;">
            <h4 style="color:#fff; margin-bottom:16px; display:flex; align-items:center; gap:8px;">
                <i class="fas fa-question-circle" style="color:#7289da;"></i> Sık Sorulan Sorular
            </h4>
            
            <div class="faq-item" style="margin-bottom:12px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:12px;">
                <div onclick="toggleFaq(this)" style="cursor:pointer; display:flex; justify-content:space-between; align-items:center;">
                    <span style="color:#fff; font-weight:500;">📌 Kanal nasıl açarım?</span>
                    <i class="fas fa-chevron-down" style="color:#aaa;"></i>
                </div>
                <div class="faq-answer" style="display:none; margin-top:12px; color:#aaa; font-size:13px; line-height:1.5;">
                    Profilinizdeki "Kanal Aç" butonuna tıklayarak yeni bir kanal oluşturabilirsiniz. Kanal adı benzersiz olmalı ve sadece küçük harf, rakam ve tire içerebilir. Her kullanıcı sadece bir kanala sahip olabilir.
                </div>
            </div>
            
            <div class="faq-item" style="margin-bottom:12px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:12px;">
                <div onclick="toggleFaq(this)" style="cursor:pointer; display:flex; justify-content:space-between; align-items:center;">
                    <span style="color:#fff; font-weight:500;">📌 Yetki sistemi nasıl çalışır?</span>
                    <i class="fas fa-chevron-down" style="color:#aaa;"></i>
                </div>
                <div class="faq-answer" style="display:none; margin-top:12px; color:#aaa; font-size:13px; line-height:1.5;">
                    <strong style="color:#ff6b6b;">⚡ Admin:</strong> Sistem genelinde yetkilidir, kullanıcıları yasaklayabilir.<br>
                    <strong style="color:#6495ed;">🔧 Co-admin:</strong> Sadece kendi kanalında yetkilidir, video ekleyebilir, kullanıcıları atabilir ve BAN atabilir.<br>
                    <strong>👤 Kullanıcı:</strong> Temel sohbet özelliklerini kullanabilir.
                </div>
            </div>
            
            <div class="faq-item" style="margin-bottom:12px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:12px;">
                <div onclick="toggleFaq(this)" style="cursor:pointer; display:flex; justify-content:space-between; align-items:center;">
                    <span style="color:#fff; font-weight:500;">📌 Özel sohbet özellikleri</span>
                    <i class="fas fa-chevron-down" style="color:#aaa;"></i>
                </div>
                <div class="faq-answer" style="display:none; margin-top:12px; color:#aaa; font-size:13px; line-height:1.5;">
                    Özel sohbetlerde resim, video gönderebilir, mesajlarınızı silebilirsiniz. Karşı tarafı engelleyebilir veya şikayet edebilirsiniz. Profilinizden gizlilik ayarlarını değiştirebilirsiniz. Özel mesajlarınız çıkış yaptığınızda otomatik olarak silinir.
                </div>
            </div>
            
            <div class="faq-item" style="margin-bottom:12px;">
                <div onclick="toggleFaq(this)" style="cursor:pointer; display:flex; justify-content:space-between; align-items:center;">
                    <span style="color:#fff; font-weight:500;">📌 Medya özellikleri</span>
                    <i class="fas fa-chevron-down" style="color:#aaa;"></i>
                </div>
                <div class="faq-answer" style="display:none; margin-top:12px; color:#aaa; font-size:13px; line-height:1.5;">
                    YouTube entegrasyonu ile kanalınızda video paylaşabilirsiniz. Co-admin ve üzeri yetkiler video ekleyebilir. Şikayet butonu ile uygunsuz içerikleri bildirebilirsiniz. Playlist otomatik olarak sırayla oynatılır.
                </div>
            </div>
        </div>
        
        <div style="background:rgba(26,26,26,0.8); border-radius:12px; padding:20px; margin-bottom:20px;">
            <h4 style="color:#fff; margin-bottom:16px; display:flex; align-items:center; gap:8px;">
                <i class="fas fa-envelope" style="color:#7289da;"></i> Bize Ulaşın
            </h4>
            
            <div class="form-group">
                <label class="form-label">Konu</label>
                <select id="supportTopic" class="form-select">
                    <option value="bug">Hata Bildirimi</option>
                    <option value="suggestion">Öneri</option>
                    <option value="complaint">Şikayet</option>
                    <option value="other">Diğer</option>
                </select>
            </div>
            
            <div class="form-group">
                <label class="form-label">Mesajınız</label>
                <textarea id="supportMessage" class="form-textarea" placeholder="Sorununuzu veya önerinizi detaylıca yazın..."></textarea>
            </div>
            
            <button class="form-button" style="background:#7289da;" onclick="sendSupportTicket()">
                <i class="fas fa-paper-plane"></i> Gönder
            </button>
        </div>
        
        <div style="background:rgba(26,26,26,0.8); border-radius:12px; padding:16px; text-align:center;">
            <i class="fas fa-shield-alt" style="color:#7289da; font-size:24px; margin-bottom:8px;"></i>
            <p style="color:#aaa; font-size:12px;">7/24 destek ekibimiz size yardımcı olmak için hazır.</p>
            <p style="color:#7289da; font-size:13px; margin-top:8px;">Yanıt süresi: ~2 saat</p>
        </div>
    </div>`;
    panel.innerHTML = h;
}

// Destek talebi gönder
function sendSupportTicket() {
    let topic = document.getElementById('supportTopic')?.value;
    let message = document.getElementById('supportMessage')?.value.trim();
    
    if (!message) {
        alert('Lütfen bir mesaj yazın!');
        return;
    }
    
    let topics = {
        'bug': 'Hata Bildirimi',
        'suggestion': 'Öneri',
        'complaint': 'Şikayet',
        'other': 'Diğer'
    };
    
    let supportMsg = `🆘 ${ACTIVE_USER.name} yeni bir destek talebi gönderdi.\n📌 Konu: ${topics[topic]}\n💬 Mesaj: ${message}`;
    
    addSystemMessage(`✅ Destek talebiniz alındı. En kısa sürede dönüş yapılacak.`);
    sendToAdminChannel(supportMsg);
    
    document.getElementById('supportMessage').value = '';
    loadLeftPanel('notifications');
}

// Avatar modalını aç
function openAvatarModal() {
    document.getElementById('avatarFileInput').value = '';
    document.getElementById('avatarPreviewText').style.display = 'block';
    document.getElementById('avatarPreviewImage').style.display = 'none';
    document.getElementById('avatarPreviewText').textContent = ACTIVE_USER.avatar || ACTIVE_USER.name.charAt(0).toUpperCase();
    openModal('avatarModal');
}

// Avatar önizleme
function previewAvatar(input) {
    if (input.files && input.files[0]) {
        let reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('avatarPreviewText').style.display = 'none';
            document.getElementById('avatarPreviewImage').style.display = 'block';
            document.getElementById('avatarPreviewImage').src = e.target.result;
        }
        reader.readAsDataURL(input.files[0]);
    }
}

// Avatar yükle
function uploadAvatar() {
    let fileInput = document.getElementById('avatarFileInput');
    if (fileInput.files && fileInput.files[0]) {
        let reader = new FileReader();
        reader.onload = function(e) {
            ACTIVE_USER.avatarData = e.target.result;
            
            localStorage.setItem('cetcety_active_user', JSON.stringify(ACTIVE_USER));
            
            let index = USERS_DB.findIndex(u => u.id === ACTIVE_USER.id);
            if (index !== -1) {
                USERS_DB[index].avatarData = e.target.result;
                localStorage.setItem('cetcety_users', JSON.stringify(USERS_DB));
            }
            
            updateUIForUser();
            closeModal('avatarModal');
            
            if (document.getElementById('leftPanel').innerHTML.includes('Profil')) {
                loadLeftPanel('profile');
            }
            
            addSystemMessage('✅ Profil resmi güncellendi.');
        };
        reader.readAsDataURL(fileInput.files[0]);
    } else {
        alert('Lütfen bir resim seçin!');
    }
}

// Profil fonksiyonları
function changeNick() {
    let newNick = document.getElementById('profileNick')?.value.trim();
    if (!newNick) return;
    
    let existingUser = USERS_DB.find(u => u.name.toLowerCase() === newNick.toLowerCase() && u.id !== ACTIVE_USER.id);
    if (existingUser) {
        alert('Bu kullanıcı adı zaten kullanılıyor!');
        return;
    }
    
    ACTIVE_USER.name = newNick;
    localStorage.setItem('cetcety_active_user', JSON.stringify(ACTIVE_USER));
    const index = USERS_DB.findIndex(u => u.id === ACTIVE_USER.id);
    if (index !== -1) USERS_DB[index] = ACTIVE_USER;
    localStorage.setItem('cetcety_users', JSON.stringify(USERS_DB));
    updateUIForUser();
    loadLeftPanel('profile');
    addSystemMessage(`✅ Kullanıcı adı değiştirildi: ${newNick}`);
}

function changePassword() {
    let pwd = document.getElementById('profilePassword')?.value.trim();
    if (pwd) {
        ACTIVE_USER.password = pwd;
        localStorage.setItem('cetcety_active_user', JSON.stringify(ACTIVE_USER));
        const index = USERS_DB.findIndex(u => u.id === ACTIVE_USER.id);
        if (index !== -1) USERS_DB[index] = ACTIVE_USER;
        localStorage.setItem('cetcety_users', JSON.stringify(USERS_DB));
        addSystemMessage('✅ Şifre güncellendi.');
        document.getElementById('profilePassword').value = '';
    } else alert('Şifre boş olamaz!');
}

function changePrivateMode() {
    let mode = document.getElementById('privateModeSelect')?.value;
    if (mode) {
        ACTIVE_USER.privateMode = mode;
        localStorage.setItem('cetcety_active_user', JSON.stringify(ACTIVE_USER));
        const index = USERS_DB.findIndex(u => u.id === ACTIVE_USER.id);
        if (index !== -1) USERS_DB[index] = ACTIVE_USER;
        localStorage.setItem('cetcety_users', JSON.stringify(USERS_DB));
        addSystemMessage(`🔒 Özel sohbet modu: ${mode === 'all' ? 'Herkese Açık' : mode === 'none' ? 'Herkese Kapalı' : 'Sadece Engellenenler'}`);
    }
}

function blockSpecificNick() {
    let nick = document.getElementById('blockNickInput')?.value.trim();
    if (!nick) return;
    if (!ACTIVE_USER.blockedNicks) ACTIVE_USER.blockedNicks = [];
    if (!ACTIVE_USER.blockedNicks.includes(nick)) {
        ACTIVE_USER.blockedNicks.push(nick);
        localStorage.setItem('cetcety_active_user', JSON.stringify(ACTIVE_USER));
        const index = USERS_DB.findIndex(u => u.id === ACTIVE_USER.id);
        if (index !== -1) USERS_DB[index] = ACTIVE_USER;
        localStorage.setItem('cetcety_users', JSON.stringify(USERS_DB));
        addSystemMessage(`🚫 ${nick} engellendi.`);
        loadLeftPanel('profile');
    }
}

function unblockNick(nick) {
    if (ACTIVE_USER.blockedNicks) {
        ACTIVE_USER.blockedNicks = ACTIVE_USER.blockedNicks.filter(n => n !== nick);
        localStorage.setItem('cetcety_active_user', JSON.stringify(ACTIVE_USER));
        const index = USERS_DB.findIndex(u => u.id === ACTIVE_USER.id);
        if (index !== -1) USERS_DB[index] = ACTIVE_USER;
        localStorage.setItem('cetcety_users', JSON.stringify(USERS_DB));
        addSystemMessage(`✅ ${nick} engeli kaldırıldı.`);
        loadLeftPanel('profile');
    }
}
