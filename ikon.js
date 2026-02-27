// ========== İKON.JS - TÜM İKONLAR VE PANELLER ==========
// Abonelikler, Kanallar, Sohbetlerim, Bildirimler, Profil panelleri
// Tüm ikon tıklamaları ve panel yönetimi

// ========== GLOBAL DEĞİŞKENLER ==========
let currentUser = null;
let currentChannel = 'genel';
let channels = JSON.parse(localStorage.getItem('cetcety_channels')) || {};
let USERS_DB = JSON.parse(localStorage.getItem('cetcety_users')) || [];

// ========== İKON TIKLAMALARI ==========
function openSubscriptions() {
    loadLeftPanel('subscriptions');
    setActiveIcon('subscriptions');
}

function openChannelPanel() {
    loadLeftPanel('channels');
    setActiveIcon('channels');
}

function openChatListPanel() {
    loadLeftPanel('chatlist');
    setActiveIcon('chatlist');
    // Sohbet listesini güncelle
    if (window.Chat) window.Chat.loadPrivateList();
}

function openNotificationPanel() {
    loadLeftPanel('notifications');
    setActiveIcon('notifications');
}

function openProfilePanel() {
    loadLeftPanel('profile');
    setActiveIcon('profile');
}

function setActiveIcon(active) {
    document.querySelectorAll('.icon-item').forEach(el => el.classList.remove('active'));
    document.querySelector('.profile-avatar').classList.remove('active');
    
    if (active === 'subscriptions') {
        document.querySelector('.icon-item[onclick="openSubscriptions()"]')?.classList.add('active');
    } else if (active === 'channels') {
        document.querySelector('.icon-item[onclick="openChannelPanel()"]')?.classList.add('active');
    } else if (active === 'chatlist') {
        document.querySelector('.icon-item[onclick="openChatListPanel()"]')?.classList.add('active');
    } else if (active === 'notifications') {
        document.querySelector('.icon-item[onclick="openNotificationPanel()"]')?.classList.add('active');
    } else if (active === 'profile') {
        document.querySelector('.profile-avatar')?.classList.add('active');
    }
}

// ========== SOL PANEL YÜKLEME ==========
function loadLeftPanel(panelName) {
    if (!currentUser) return;
    
    const panel = document.getElementById('leftPanel');
    if (!panel) return;
    
    switch(panelName) {
        case 'subscriptions':
            loadSubscriptionsPanel(panel);
            break;
        case 'channels':
            loadChannelsPanel(panel);
            break;
        case 'chatlist':
            loadChatListPanel(panel);
            break;
        case 'notifications':
            loadNotificationsPanel(panel);
            break;
        case 'profile':
            loadProfilePanel(panel);
            break;
        case 'createchannel':
            loadCreateChannelPanel(panel);
            break;
        case 'support':
            loadSupportPanel(panel);
            break;
        default:
            loadSubscriptionsPanel(panel);
    }
}

function closeLeftPanel() {
    loadLeftPanel('subscriptions');
    document.getElementById('leftPanel').classList.remove('active');
}

// ========== ABONELİKLER PANELİ ==========
function loadSubscriptionsPanel(panel) {
    let html = `
        <div class="panel-header">
            <h3><i class="fas fa-bell" style="color:#ffd700;"></i> Abonelikler</h3>
            <span class="subscription-count">${currentUser.subscribedChannels?.length || 0}</span>
            <div class="panel-close" onclick="closeLeftPanel()"><i class="fas fa-times"></i></div>
        </div>
        <div class="panel-content">
            <div class="search-container">
                <i class="fas fa-search"></i>
                <input type="text" class="search-input" placeholder="Kanal ara..." id="subscriptionSearch" oninput="searchSubscriptions(this.value)">
            </div>
            <div id="subscriptionsList"></div>
        </div>
        <div class="popular-channels">
            <div class="popular-header">
                <i class="fas fa-fire" style="color:#ff4444;"></i> Popüler Kanallar
            </div>
            <div id="popularChannelsList"></div>
        </div>
    `;
    
    panel.innerHTML = html;
    updateSubscriptionsList();
    updatePopularChannels();
}

function updateSubscriptionsList() {
    const container = document.getElementById('subscriptionsList');
    if (!container) return;
    
    if (!currentUser.subscribedChannels || currentUser.subscribedChannels.length === 0) {
        container.innerHTML = '<div style="color:#aaa; padding:20px; text-align:center;">Abone olunan kanal yok.</div>';
        return;
    }
    
    let html = '';
    currentUser.subscribedChannels.forEach(ch => {
        const channel = channels[ch];
        if (!channel) return;
        
        // Gizli kanal kontrolü
        if (channel.isSuperHidden && currentUser.role !== 'owner') return;
        if (ch === 'admin' && currentUser.role !== 'owner' && currentUser.role !== 'admin') return;
        if (channel.isHidden && currentUser.role !== 'owner' && currentUser.role !== 'admin') return;
        
        const isActive = ch === currentChannel ? 'active' : '';
        const subCount = formatNumber(channel.subscribers || 1);
        const onlineCount = channel.onlineUsers ? channel.onlineUsers.length : 0;
        
        let badges = '';
        if (channel.isHidden) badges += '<span class="badge badge-hidden">GİZLİ</span>';
        if (channel.isSuperHidden) badges += '<span class="badge badge-super-hidden">SÜPER</span>';
        
        let roleIcon = '';
        if (channel.ownerRole === 'owner') roleIcon = '👑';
        else if (channel.ownerRole === 'admin') roleIcon = '⚡';
        else if (channel.ownerRole === 'coadmin') roleIcon = '🔧';
        
        html += `
            <div class="subscription-item ${isActive}" onclick="joinChannel('${ch}')">
                <div class="subscription-avatar"><i class="fas fa-hashtag"></i></div>
                <div class="subscription-info">
                    <div class="subscription-name">
                        ${ch} ${badges} ${roleIcon ? `<span class="badge badge-${channel.ownerRole}">${roleIcon}</span>` : ''}
                    </div>
                    <div class="subscription-meta">
                        <span>${channel.owner}</span>
                        <span>• ${subCount} abone</span>
                    </div>
                </div>
                <div class="subscription-stats">${onlineCount}</div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function searchSubscriptions(query) {
    // Arama fonksiyonu
    const container = document.getElementById('subscriptionsList');
    if (!container) return;
    
    if (!query) {
        updateSubscriptionsList();
        return;
    }
    
    const filtered = currentUser.subscribedChannels.filter(ch => 
        ch.toLowerCase().includes(query.toLowerCase())
    );
    
    let html = '';
    filtered.forEach(ch => {
        const channel = channels[ch];
        if (!channel) return;
        
        html += `
            <div class="subscription-item" onclick="joinChannel('${ch}')">
                <div class="subscription-avatar"><i class="fas fa-hashtag"></i></div>
                <div class="subscription-info">
                    <div class="subscription-name">${ch}</div>
                    <div class="subscription-meta">${channel.owner}</div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html || '<div style="color:#aaa; padding:20px;">Sonuç bulunamadı.</div>';
}

// ========== KANALLAR PANELİ ==========
function loadChannelsPanel(panel) {
    let html = `
        <div class="panel-header">
            <h3><i class="fas fa-list-ul" style="color:#ff0000;"></i> Tüm Kanallar</h3>
            <span class="subscription-count">${Object.keys(channels).length}</span>
            <div class="panel-close" onclick="closeLeftPanel()"><i class="fas fa-times"></i></div>
        </div>
        <div class="panel-content">
            <div class="search-container">
                <i class="fas fa-search"></i>
                <input type="text" class="search-input" placeholder="Kanal ara..." id="channelSearch" oninput="searchChannels(this.value)">
            </div>
            <div id="channelsList"></div>
        </div>
    `;
    
    panel.innerHTML = html;
    updateChannelsList();
}

function updateChannelsList() {
    const container = document.getElementById('channelsList');
    if (!container) return;
    
    let channelsArray = Object.values(channels)
        .filter(ch => {
            if (ch.isSuperHidden && currentUser.role !== 'owner') return false;
            if (ch.name === 'admin' && currentUser.role !== 'owner' && currentUser.role !== 'admin') return false;
            return true;
        })
        .sort((a, b) => (b.subscribers || 0) - (a.subscribers || 0));
    
    let html = '';
    channelsArray.forEach(ch => {
        const isSubscribed = currentUser.subscribedChannels?.includes(ch.name);
        const subCount = formatNumber(ch.subscribers || 1);
        const onlineCount = ch.onlineUsers ? ch.onlineUsers.length : 0;
        
        let badges = '';
        if (ch.isHidden) badges += '<span class="badge badge-hidden">GİZLİ</span>';
        if (ch.isSuperHidden) badges += '<span class="badge badge-super-hidden">SÜPER</span>';
        
        let roleIcon = '';
        if (ch.ownerRole === 'owner') roleIcon = '👑';
        else if (ch.ownerRole === 'admin') roleIcon = '⚡';
        else if (ch.ownerRole === 'coadmin') roleIcon = '🔧';
        
        html += `
            <div class="channel-item" onclick="joinChannel('${ch.name}')">
                <div class="channel-avatar"><i class="fas fa-hashtag"></i></div>
                <div class="channel-info">
                    <div class="channel-name">
                        ${ch.name} ${badges} ${roleIcon ? `<span class="badge badge-${ch.ownerRole}">${roleIcon}</span>` : ''}
                    </div>
                    <div class="channel-meta">
                        <span>${ch.owner}</span>
                        <span>• ${subCount} abone</span>
                        <span>• ${onlineCount} çevrimiçi</span>
                    </div>
                </div>
                <button class="subscribe-btn ${isSubscribed ? 'subscribed' : ''}" 
                        onclick="event.stopPropagation(); ${isSubscribed ? 'unsubscribeChannel' : 'subscribeChannel'}('${ch.name}')">
                    <i class="fas ${isSubscribed ? 'fa-check' : 'fa-plus'}"></i>
                    ${isSubscribed ? 'Abone' : 'Abone Ol'}
                </button>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function searchChannels(query) {
    const container = document.getElementById('channelsList');
    if (!container) return;
    
    if (!query) {
        updateChannelsList();
        return;
    }
    
    const filtered = Object.values(channels).filter(ch => 
        ch.name.toLowerCase().includes(query.toLowerCase())
    );
    
    let html = '';
    filtered.forEach(ch => {
        const isSubscribed = currentUser.subscribedChannels?.includes(ch.name);
        
        html += `
            <div class="channel-item" onclick="joinChannel('${ch.name}')">
                <div class="channel-avatar"><i class="fas fa-hashtag"></i></div>
                <div class="channel-info">
                    <div class="channel-name">${ch.name}</div>
                    <div class="channel-meta">${ch.owner}</div>
                </div>
                <button class="subscribe-btn ${isSubscribed ? 'subscribed' : ''}" 
                        onclick="event.stopPropagation(); ${isSubscribed ? 'unsubscribeChannel' : 'subscribeChannel'}('${ch.name}')">
                    <i class="fas ${isSubscribed ? 'fa-check' : 'fa-plus'}"></i>
                </button>
            </div>
        `;
    });
    
    container.innerHTML = html || '<div style="color:#aaa; padding:20px;">Sonuç bulunamadı.</div>';
}

// ========== SOHBETLERİM PANELİ ==========
function loadChatListPanel(panel) {
    let html = `
        <div class="panel-header">
            <h3><i class="fas fa-comment" style="color:#7289da;"></i> Sohbetlerim</h3>
            <span class="subscription-count" id="chatListCount">0</span>
            <div class="panel-close" onclick="closeLeftPanel()"><i class="fas fa-times"></i></div>
        </div>
        <div class="panel-tabs">
            <div id="tabChats" class="panel-tab active" onclick="switchChatTab('chats')">Sohbetler</div>
            <div id="tabOnline" class="panel-tab" onclick="switchChatTab('online')">Çevrimiçi</div>
        </div>
        <div class="panel-content" id="chatPanelContent"></div>
    `;
    
    panel.innerHTML = html;
    
    // İlk sekmeyi göster
    if (window.Chat) {
        window.Chat.switchTab('chats');
    }
}

// ========== BİLDİRİMLER PANELİ ==========
function loadNotificationsPanel(panel) {
    let html = `
        <div class="panel-header">
            <h3><i class="fas fa-bell" style="color:#ff4444;"></i> Bildirimler</h3>
            <span class="subscription-count">0</span>
            <div class="panel-close" onclick="closeLeftPanel()"><i class="fas fa-times"></i></div>
        </div>
        <div class="panel-content">
            <div style="color:#aaa; padding:20px; text-align:center;">Henüz bildirim yok.</div>
        </div>
    `;
    
    panel.innerHTML = html;
}

// ========== KANAL AÇ PANELİ ==========
function loadCreateChannelPanel(panel) {
    let html = `
        <div class="panel-header">
            <h3><i class="fas fa-plus-circle" style="color:#ff0000;"></i> Kanal Aç</h3>
            <div class="panel-close" onclick="closeLeftPanel()"><i class="fas fa-times"></i></div>
        </div>
        <div class="panel-content">
            <div class="info-box">
                <p><i class="fas fa-info-circle"></i> Yeni bir kanal açarak kendi topluluğunu oluşturabilirsin. Kanal sahibi olarak co-admin yetkilerine sahip olursun.</p>
            </div>
    `;
    
    if (currentUser.role !== 'owner' && currentUser.myChannel) {
        html += `
            <div class="info-box" style="border-left-color: #ffaa00;">
                <p><i class="fas fa-exclamation-triangle" style="color:#ffaa00;"></i> 
                Zaten bir kanalınız var: <strong>#${currentUser.myChannel}</strong>. 
                Bir kullanıcı sadece bir kanala sahip olabilir.</p>
            </div>
        `;
    } else {
        html += `
            <div class="form-group">
                <label class="form-label">Kanal Adı</label>
                <input type="text" id="newChannelName" class="form-input" 
                       placeholder="örnek: teknoloji, oyun, müzik" maxlength="20">
                <div style="font-size:11px; color:#aaa; margin-top:4px;">
                    Sadece küçük harf, rakam ve tire kullanabilirsiniz.
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">Kanal Açıklaması</label>
                <textarea id="newChannelDesc" class="form-textarea" 
                          placeholder="Kanalın konusu ve kuralları..."></textarea>
            </div>
            <div class="form-group">
                <label class="form-label">Kategori</label>
                <select id="newChannelCategory" class="form-select">
                    <option value="general">Genel</option>
                    <option value="music">Müzik</option>
                    <option value="gaming">Oyun</option>
                    <option value="technology">Teknoloji</option>
                    <option value="sports">Spor</option>
                </select>
            </div>
            <button class="form-button" onclick="createChannel()">Kanalı Oluştur</button>
        `;
    }
    
    html += `</div>`;
    panel.innerHTML = html;
}

// ========== DESTEK PANELİ ==========
function loadSupportPanel(panel) {
    let html = `
        <div class="panel-header">
            <h3><i class="fas fa-headset" style="color:#7289da;"></i> Destek</h3>
            <div class="panel-close" onclick="closeLeftPanel()"><i class="fas fa-times"></i></div>
        </div>
        <div class="panel-content">
            <div class="info-box">
                <p><i class="fas fa-info-circle"></i> Canlı destek talebiniz #admin kanalına iletilir. Size en kısa sürede yardımcı olacağız.</p>
            </div>
            
            <div style="background:rgba(26,26,26,0.8); border-radius:12px; padding:20px; margin-bottom:20px;">
                <h4 style="color:#fff; margin-bottom:16px;">📌 Sık Sorulan Sorular</h4>
                
                <div class="faq-item" style="margin-bottom:12px;">
                    <div onclick="toggleFaq(this)" style="cursor:pointer;">
                        <span style="color:#fff;">📌 Kanal nasıl açarım?</span>
                        <i class="fas fa-chevron-down" style="float:right;"></i>
                    </div>
                    <div class="faq-answer" style="display:none; margin-top:10px; color:#aaa;">
                        Profilinizdeki "Kanal Aç" butonuna tıklayarak yeni bir kanal oluşturabilirsiniz. Kanal adı benzersiz olmalı ve sadece küçük harf, rakam ve tire içerebilir.
                    </div>
                </div>
                
                <div class="faq-item" style="margin-bottom:12px;">
                    <div onclick="toggleFaq(this)" style="cursor:pointer;">
                        <span style="color:#fff;">📌 Yetki sistemi nasıl çalışır?</span>
                        <i class="fas fa-chevron-down" style="float:right;"></i>
                    </div>
                    <div class="faq-answer" style="display:none; margin-top:10px; color:#aaa;">
                        <strong style="color:#ff6b6b;">⚡ Admin:</strong> Sistem genelinde yetkilidir<br>
                        <strong style="color:#6495ed;">🔧 Co-admin:</strong> Kendi kanalında yetkilidir<br>
                        <strong style="color:#ffaa00;">🛠️ Operator:</strong> Temel yetkiler
                    </div>
                </div>
            </div>
            
            <div style="background:rgba(26,26,26,0.8); border-radius:12px; padding:20px;">
                <h4 style="color:#fff; margin-bottom:16px;">📧 Bize Ulaşın</h4>
                
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
                    <textarea id="supportMessage" class="form-textarea" placeholder="Sorununuzu detaylıca yazın..."></textarea>
                </div>
                
                <button class="form-button" style="background:#7289da;" onclick="sendSupportTicket()">
                    <i class="fas fa-paper-plane"></i> Gönder
                </button>
            </div>
        </div>
    `;
    
    panel.innerHTML = html;
}

function toggleFaq(element) {
    const answer = element.parentElement.querySelector('.faq-answer');
    const icon = element.querySelector('i');
    
    if (answer.style.display === 'none' || !answer.style.display) {
        answer.style.display = 'block';
        icon.className = 'fas fa-chevron-up';
    } else {
        answer.style.display = 'none';
        icon.className = 'fas fa-chevron-down';
    }
}

function sendSupportTicket() {
    const topic = document.getElementById('supportTopic')?.value;
    const message = document.getElementById('supportMessage')?.value.trim();
    
    if (!message) {
        alert('Lütfen bir mesaj yazın!');
        return;
    }
    
    const topics = {
        'bug': 'Hata Bildirimi',
        'suggestion': 'Öneri',
        'complaint': 'Şikayet',
        'other': 'Diğer'
    };
    
    const supportMsg = `🆘 ${currentUser.name} yeni bir destek talebi gönderdi.\n📌 Konu: ${topics[topic]}\n💬 Mesaj: ${message}`;
    
    addSystemMessage(`✅ Destek talebiniz alındı. En kısa sürede dönüş yapılacak.`);
    
    // Admin kanalına gönder
    if (window.sendToAdminChannel) {
        window.sendToAdminChannel(supportMsg);
    }
    
    document.getElementById('supportMessage').value = '';
    loadLeftPanel('notifications');
}

// ========== PROFİL PANELİ ==========
function loadProfilePanel(panel) {
    const joinDate = currentUser.joinDate ? new Date(currentUser.joinDate) : new Date();
    const formattedDate = `${joinDate.getDate()}.${joinDate.getMonth() + 1}.${joinDate.getFullYear()}`;
    
    let roleText = '';
    let roleClass = '';
    
    if (currentUser.role === 'owner') {
        roleText = '👑 Kurucu';
        roleClass = 'badge-owner';
    } else if (currentUser.role === 'admin') {
        roleText = '⚡ Admin';
        roleClass = 'badge-admin';
    } else if (currentUser.role === 'coadmin') {
        roleText = '🔧 Co-Admin';
        roleClass = 'badge-coadmin';
    } else if (currentUser.role === 'operator') {
        roleText = '🛠️ Operator';
        roleClass = 'badge-operator';
    } else {
        roleText = '👤 Kullanıcı';
    }
    
    let avatarHtml = '';
    if (currentUser.avatarData) {
        avatarHtml = `<img src="${currentUser.avatarData}" style="width:100%; height:100%; object-fit:cover;">`;
    } else {
        avatarHtml = currentUser.avatar || currentUser.name.charAt(0).toUpperCase();
    }
    
    let html = `
        <div class="panel-header">
            <h3><i class="fas fa-user" style="color:#ff0000;"></i> Profil</h3>
            <div class="panel-close" onclick="closeLeftPanel()"><i class="fas fa-times"></i></div>
        </div>
        <div class="panel-content">
            <div style="display:flex; flex-direction:column; align-items:center; padding:20px 0;">
                <div class="profile-avatar-panel" style="width:80px; height:80px; font-size:32px; margin-bottom:12px; cursor:pointer; overflow:hidden;" 
                     onclick="openAvatarModal()">
                    ${avatarHtml}
                </div>
                <h2 style="font-size:20px; font-weight:700; color:#fff; margin-bottom:4px;">${currentUser.name}</h2>
                <span class="badge ${roleClass}" style="margin-bottom:16px;">${roleText}</span>
                
                <div style="display:flex; gap:12px; margin-bottom:16px;">
                    <button class="form-button secondary" style="padding:8px 16px; font-size:12px;" onclick="openAvatarModal()">
                        <i class="fas fa-camera"></i> Resim Yükle
                    </button>
                    <button class="form-button" style="padding:8px 16px; font-size:12px;" onclick="loadLeftPanel('createchannel')">
                        <i class="fas fa-plus-circle"></i> Kanal Aç
                    </button>
                    <button class="form-button secondary" style="padding:8px 16px; font-size:12px;" onclick="loadLeftPanel('support')">
                        <i class="fas fa-headset"></i> Destek
                    </button>
                </div>
            </div>
            
            <div style="display:flex; justify-content:space-around; padding:16px 0; border-top:1px solid #2a2a2a; border-bottom:1px solid #2a2a2a; margin-bottom:16px;">
                <div style="text-align:center;">
                    <div style="font-size:18px; font-weight:700; color:#fff;">${currentUser.subscribedChannels?.length || 0}</div>
                    <div style="font-size:11px; color:#aaa;">Abonelik</div>
                </div>
                <div style="text-align:center;">
                    <div style="font-size:18px; font-weight:700; color:#fff;">${currentUser.myChannel ? '1' : '0'}</div>
                    <div style="font-size:11px; color:#aaa;">Kanalım</div>
                </div>
                <div style="text-align:center;">
                    <div style="font-size:18px; font-weight:700; color:#fff;">${formattedDate.split('.')[0]}</div>
                    <div style="font-size:11px; color:#aaa;">Katılım</div>
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">Kullanıcı Adı</label>
                <input type="text" id="profileNick" class="form-input" value="${currentUser.name}">
                <button class="form-button secondary" style="margin-top:8px;" onclick="changeNick()">Değiştir</button>
            </div>
            
            <div class="form-group">
                <label class="form-label">Şifre</label>
                <input type="password" id="profilePassword" class="form-input" placeholder="Yeni şifre">
                <button class="form-button secondary" style="margin-top:8px;" onclick="changePassword()">Şifreyi Kaydet</button>
            </div>
            
            <div class="form-group">
                <label class="form-label">Özel Sohbet</label>
                <select id="privateModeSelect" class="form-select" onchange="changePrivateMode()">
                    <option value="all" ${currentUser.privateMode === 'all' ? 'selected' : ''}>Herkese Açık</option>
                    <option value="none" ${currentUser.privateMode === 'none' ? 'selected' : ''}>Herkese Kapalı</option>
                    <option value="blocked" ${currentUser.privateMode === 'blocked' ? 'selected' : ''}>Sadece Engellenenler</option>
                </select>
            </div>
            
            <div class="form-group">
                <label class="form-label">Engelle (nick)</label>
                <input type="text" id="blockNickInput" class="form-input" placeholder="Kullanıcı adı">
                <button class="form-button secondary" style="margin-top:8px;" onclick="blockSpecificNick()">Engelle</button>
            </div>
    `;
    
    // Engellenen kişiler listesi
    if (currentUser.blockedNicks && currentUser.blockedNicks.length) {
        html += `
            <div style="margin-bottom:16px;">
                <label class="form-label">Engellenen Kişiler</label>
                <div style="background:#1a1a1a; border-radius:8px; padding:12px;">
                    ${currentUser.blockedNicks.map(nick => `
                        <span style="display:inline-block; background:#2a2a2a; padding:4px 10px; border-radius:20px; margin:0 4px 4px 0; font-size:12px;">
                            ${nick} <i class="fas fa-times" style="margin-left:6px; cursor:pointer;" onclick="unblockNick('${nick}')"></i>
                        </span>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // Kanal sil butonu
    if (currentUser.myChannel) {
        html += `
            <div style="margin-top:16px;">
                <button class="form-button danger" onclick="deleteMyChannel()">Kanalımı Sil</button>
            </div>
        `;
    }
    
    // Admin paneli butonu
    if (currentUser.role === 'admin' || currentUser.role === 'owner') {
        html += `
            <div style="margin-top:16px;">
                <button class="form-button" style="background:#ff6b6b;" onclick="openAdminPanel()">⚡ Admin Paneli</button>
            </div>
        `;
    }
    
    // Owner paneli butonu (gizli)
    if (currentUser.role === 'owner') {
        html += `
            <div style="margin-top:16px;">
                <button class="form-button" style="background:#ffd700; color:#000;" onclick="openOwnerPanel()">👑 Owner Paneli</button>
            </div>
        `;
    }
    
    // Çıkış butonu
    html += `
        <div style="margin-top:24px;">
            <button class="form-button" onclick="logout()">Güvenli Çıkış</button>
        </div>
    `;
    
    panel.innerHTML = html;
}

// ========== PROFİL FONKSİYONLARI ==========
function changeNick() {
    const newNick = document.getElementById('profileNick')?.value.trim();
    if (!newNick) return;
    
    // Aynı nick kontrolü
    const existing = USERS_DB.find(u => u.name.toLowerCase() === newNick.toLowerCase() && u.id !== currentUser.id);
    if (existing) {
        alert('Bu kullanıcı adı zaten kullanılıyor!');
        return;
    }
    
    currentUser.name = newNick;
    currentUser.avatar = newNick.charAt(0).toUpperCase();
    
    // LocalStorage'a kaydet
    localStorage.setItem('cetcety_active_user', JSON.stringify(currentUser));
    
    const index = USERS_DB.findIndex(u => u.id === currentUser.id);
    if (index !== -1) {
        USERS_DB[index] = currentUser;
        localStorage.setItem('cetcety_users', JSON.stringify(USERS_DB));
    }
    
    updateAvatarDisplay();
    loadLeftPanel('profile');
    addSystemMessage(`✅ Kullanıcı adı değiştirildi: ${newNick}`);
}

function changePassword() {
    const newPass = document.getElementById('profilePassword')?.value.trim();
    if (!newPass) {
        alert('Şifre boş olamaz!');
        return;
    }
    
    currentUser.password = newPass;
    localStorage.setItem('cetcety_active_user', JSON.stringify(currentUser));
    
    const index = USERS_DB.findIndex(u => u.id === currentUser.id);
    if (index !== -1) {
        USERS_DB[index] = currentUser;
        localStorage.setItem('cetcety_users', JSON.stringify(USERS_DB));
    }
    
    addSystemMessage('✅ Şifre güncellendi.');
    document.getElementById('profilePassword').value = '';
}

function changePrivateMode() {
    const mode = document.getElementById('privateModeSelect')?.value;
    if (!mode) return;
    
    currentUser.privateMode = mode;
    localStorage.setItem('cetcety_active_user', JSON.stringify(currentUser));
    
    const index = USERS_DB.findIndex(u => u.id === currentUser.id);
    if (index !== -1) {
        USERS_DB[index] = currentUser;
        localStorage.setItem('cetcety_users', JSON.stringify(USERS_DB));
    }
    
    const modeText = mode === 'all' ? 'Herkese Açık' : mode === 'none' ? 'Herkese Kapalı' : 'Sadece Engellenenler';
    addSystemMessage(`🔒 Özel sohbet modu: ${modeText}`);
}

function blockSpecificNick() {
    const nick = document.getElementById('blockNickInput')?.value.trim();
    if (!nick) return;
    
    if (!currentUser.blockedNicks) currentUser.blockedNicks = [];
    
    if (!currentUser.blockedNicks.includes(nick)) {
        currentUser.blockedNicks.push(nick);
        localStorage.setItem('cetcety_active_user', JSON.stringify(currentUser));
        
        const index = USERS_DB.findIndex(u => u.id === currentUser.id);
        if (index !== -1) {
            USERS_DB[index] = currentUser;
            localStorage.setItem('cetcety_users', JSON.stringify(USERS_DB));
        }
        
        addSystemMessage(`🚫 ${nick} engellendi.`);
        loadLeftPanel('profile');
    }
}

function unblockNick(nick) {
    if (!currentUser.blockedNicks) return;
    
    currentUser.blockedNicks = currentUser.blockedNicks.filter(n => n !== nick);
    localStorage.setItem('cetcety_active_user', JSON.stringify(currentUser));
    
    const index = USERS_DB.findIndex(u => u.id === currentUser.id);
    if (index !== -1) {
        USERS_DB[index] = currentUser;
        localStorage.setItem('cetcety_users', JSON.stringify(USERS_DB));
    }
    
    addSystemMessage(`✅ ${nick} engeli kaldırıldı.`);
    loadLeftPanel('profile');
}

function updateAvatarDisplay() {
    const avatarSpan = document.getElementById('avatarText');
    const avatarImg = document.getElementById('avatarImage');
    
    if (currentUser.avatarData) {
        avatarSpan.style.display = 'none';
        avatarImg.style.display = 'block';
        avatarImg.src = currentUser.avatarData;
    } else {
        avatarSpan.style.display = 'block';
        avatarImg.style.display = 'none';
        avatarSpan.textContent = currentUser.avatar || currentUser.name.charAt(0).toUpperCase();
    }
}

// ========== POPÜLER KANALLAR ==========
function updatePopularChannels() {
    const container = document.getElementById('popularChannelsList');
    if (!container) return;
    
    const popular = Object.values(channels)
        .filter(ch => {
            if (ch.isSuperHidden && currentUser.role !== 'owner') return false;
            if (ch.name === 'admin' && currentUser.role !== 'owner' && currentUser.role !== 'admin') return false;
            return true;
        })
        .sort((a, b) => (b.subscribers || 0) - (a.subscribers || 0))
        .slice(0, 5);
    
    let html = '';
    popular.forEach(ch => {
        const isSubscribed = currentUser.subscribedChannels?.includes(ch.name);
        const subCount = formatNumber(ch.subscribers || 1);
        
        html += `
            <div class="popular-item" onclick="joinChannel('${ch.name}')">
                <div class="popular-info">
                    <div class="popular-name">#${ch.name}</div>
                    <div class="popular-subscribers">${subCount} abone</div>
                </div>
                <button class="subscribe-btn ${isSubscribed ? 'subscribed' : ''}" 
                        onclick="event.stopPropagation(); ${isSubscribed ? 'unsubscribeChannel' : 'subscribeChannel'}('${ch.name}')">
                    <i class="fas ${isSubscribed ? 'fa-check' : 'fa-plus'}"></i>
                    ${isSubscribed ? 'Abone' : 'Abone Ol'}
                </button>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ========== YARDIMCI FONKSİYONLAR ==========
function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function addSystemMessage(text) {
    if (window.Chat && window.Chat.addSystemMessage) {
        window.Chat.addSystemMessage(text);
    }
}

// ========== DIŞARI AKTAR ==========
window.Ikon = {
    setUser: (user) => { 
        currentUser = user; 
        updateAvatarDisplay();
    },
    setChannels: (ch) => { channels = ch; },
    openSubscriptions: openSubscriptions,
    openChannelPanel: openChannelPanel,
    openChatList: openChatListPanel,
    openNotifications: openNotificationPanel,
    openProfile: openProfilePanel,
    updatePopular: updatePopularChannels,
    updateSubscriptions: updateSubscriptionsList
};