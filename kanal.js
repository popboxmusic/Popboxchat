// ========== KANAL.JS - CETCETY Kanal Yöneticisi ==========
console.log('%c📡 CETCETY Kanal Yöneticisi başlatılıyor...', 'color: #ff0000; font-size: 14px; font-weight: bold;');

class CETCETYChannel {
    constructor() {
        this.currentChannel = 'genel';
        this.channels = JSON.parse(localStorage.getItem('cetcety_channels')) || {};
        console.log('%c✅ Kanal Yöneticisi hazır!', 'color: #4caf50; font-size: 12px;');
    }

    // ========== KANAL VERİLERİ ==========
    getChannels() {
        return JSON.parse(localStorage.getItem('cetcety_channels')) || {};
    }

    getChannel(name) {
        const channels = this.getChannels();
        return channels[name];
    }

    saveChannels(channels) {
        localStorage.setItem('cetcety_channels', JSON.stringify(channels));
    }

    getActiveUser() {
        return JSON.parse(localStorage.getItem('cetcety_active_user'));
    }

    // ========== KANAL İŞLEMLERİ ==========
    joinChannel(ch) {
        const channels = this.getChannels();
        const user = this.getActiveUser();
        
        if (!channels[ch]) return;
        if (ch === 'admin' && !(user?.role === 'owner' || user?.role === 'admin')) {
            this.addSystemMessage('❌ Bu kanala erişim yetkiniz yok.');
            return;
        }

        if (this.currentChannel && channels[this.currentChannel] && channels[this.currentChannel].onlineUsers) {
            channels[this.currentChannel].onlineUsers = channels[this.currentChannel].onlineUsers.filter(u => u !== user?.name);
        }

        this.currentChannel = ch;
        let c = channels[ch];

        if (!c.onlineUsers.includes(user?.name)) {
            c.onlineUsers.push(user?.name);
        }
        this.saveChannels(channels);

        document.getElementById('currentChannelName').textContent = ch;
        document.getElementById('currentChannelPlaylist').textContent = `#${ch} playlist`;
        
        let sub = c.subscribers || 0;
        let fmt = sub >= 1000000 ? (sub/1000000).toFixed(1)+'M' : sub >= 1000 ? (sub/1000).toFixed(1)+'K' : sub;
        document.getElementById('channelSubscribers').textContent = fmt;
        document.getElementById('channelUserCount').textContent = c.onlineUsers.length;
        
        document.getElementById('nowPlayingTitle').textContent = c.currentTitle || 'CETCETY Radio';
        document.getElementById('nowPlayingOwner').innerHTML = `${c.ownerRole === 'owner' ? '👑' : '🔧'} ${c.owner || 'Sistem'}`;
        
        if (window.mediaManager) {
            window.mediaManager.setChannel(ch);
        }

        const subBtn = document.getElementById('subscribeChannelBtn');
        if (user?.subscribedChannels?.includes(ch)) {
            subBtn.innerHTML = '<i class="fas fa-check"></i> Abone Olundu';
            subBtn.classList.add('subscribed');
        } else {
            subBtn.innerHTML = '<i class="fas fa-plus"></i> Abone Ol';
            subBtn.classList.remove('subscribed');
        }

        this.addSystemMessage(`📢 #${ch} kanalına katıldın! ${fmt} abone, ${c.onlineUsers.length} çevrimiçi.`);
        
        if (window.loadChannelMessages) {
            window.loadChannelMessages(ch);
        }
    }

    // ========== ABONELİK İŞLEMLERİ ==========
    subscribeChannel(ch) {
        const channels = this.getChannels();
        const user = this.getActiveUser();
        
        if (!channels[ch]) {
            channels[ch] = {
                name: ch, owner: 'Sistem', ownerRole: 'user',
                subscribers: 1000, online: 0, isHidden: false,
                currentVideo: 'dQw4w9WgXcQ', currentTitle: `${ch} kanalı`,
                currentArtist: '👤 Sistem', playlist: [], onlineUsers: []
            };
        }
        
        if (!user.subscribedChannels.includes(ch)) {
            user.subscribedChannels.push(ch);
            channels[ch].subscribers = (channels[ch].subscribers || 1000) + 1;
            
            this.saveChannels(channels);
            localStorage.setItem('cetcety_active_user', JSON.stringify(user));
            
            this.addSystemMessage(`✅ #${ch} abone olundu!`);
            this.updateAllBadges();
            this.updatePopularChannels();
        }
    }

    unsubscribeChannel(ch) {
        const channels = this.getChannels();
        const user = this.getActiveUser();
        
        const i = user.subscribedChannels.indexOf(ch);
        if (i > -1) {
            user.subscribedChannels.splice(i, 1);
            if (channels[ch]) {
                channels[ch].subscribers = Math.max(0, (channels[ch].subscribers || 1000) - 1);
            }
            
            this.saveChannels(channels);
            localStorage.setItem('cetcety_active_user', JSON.stringify(user));
            
            this.addSystemMessage(`❌ #${ch} abonelikten çıkıldı.`);
            this.updateAllBadges();
            this.updatePopularChannels();
        }
    }

    toggleChannelSubscribe() {
        const user = this.getActiveUser();
        if (user.subscribedChannels.includes(this.currentChannel)) {
            this.unsubscribeChannel(this.currentChannel);
        } else {
            this.subscribeChannel(this.currentChannel);
        }
    }

    // ========== KANAL OLUŞTURMA ==========
    createChannel() {
        const user = this.getActiveUser();
        const channels = this.getChannels();
        
        if (user.role !== 'owner' && user.myChannel) {
            alert('Zaten bir kanalınız var!');
            return;
        }
        
        let name = document.getElementById('newChannelName')?.value?.toLowerCase().trim();
        if (!name) {
            alert('Kanal adı girin!');
            return;
        }
        
        if (channels[name]) {
            alert('Bu kanal adı zaten mevcut!');
            return;
        }
        
        let desc = document.getElementById('newChannelDesc')?.value?.trim() || `${user.name} tarafından oluşturuldu.`;
        
        channels[name] = {
            name, owner: user.name, ownerRole: 'coadmin',
            coAdmins: [user.name], subscribers: 1, online: 1,
            description: desc, isPrivate: false, isHidden: false,
            currentVideo: 'jfKfPfyJRdk', currentTitle: 'CETCETY Radio',
            currentArtist: `👑 ${user.name}`,
            playlist: [{ id: 'jfKfPfyJRdk', title: 'CETCETY Radio', addedBy: user.name, role: 'coadmin' }],
            onlineUsers: [user.name]
        };
        
        this.saveChannels(channels);
        
        user.myChannel = name;
        if (user.role !== 'owner') user.role = 'coadmin';
        if (!user.subscribedChannels.includes(name)) user.subscribedChannels.push(name);
        
        localStorage.setItem('cetcety_active_user', JSON.stringify(user));
        
        this.updateAllBadges();
        this.addSystemMessage(`✅ #${name} kanalı oluşturuldu!`);
        this.joinChannel(name);
    }

    // ========== ABONELİKLER PANELİ ==========
    loadSubscriptionsPanel(panel) {
        const user = this.getActiveUser();
        const subs = user?.subscribedChannels || ['genel', 'rock', 'arabesk'];
        const channels = this.getChannels();
        
        let html = `
            <div class="panel-header">
                <h3><i class="fas fa-bell" style="color:#ffd700;"></i> Abonelikler</h3>
                <span class="subscription-count">${subs.length}</span>
                <div class="panel-close" onclick="closeLeftPanel()"><i class="fas fa-times"></i></div>
            </div>
            <div class="panel-content">
                <div class="search-container">
                    <i class="fas fa-search"></i>
                    <input type="text" class="search-input" placeholder="Kanal, kullanıcı ara...">
                </div>
        `;
        
        // Abone olunan kanallar
        subs.forEach(ch => {
            const c = channels[ch] || { owner: 'Sistem', subscribers: 1000, onlineUsers: [], ownerRole: 'user', isHidden: false };
            let icon = 'fa-hashtag';
            if (ch === 'rock') icon = 'fa-guitar';
            else if (ch === 'arabesk') icon = 'fa-music';
            else if (ch === 'jazz') icon = 'fa-saxophone';
            else if (ch === 'hiphop') icon = 'fa-headphones';
            else if (ch === 'pop') icon = 'fa-microphone';
            else if (ch === 'admin') icon = 'fa-shield-alt';
            
            const sub = c.subscribers || 1000;
            const fmt = sub >= 1000000 ? (sub/1000000).toFixed(1)+'M' : sub >= 1000 ? (sub/1000).toFixed(1)+'K' : sub;
            const hidden = c.isHidden ? '<span class="badge badge-hidden">GİZLİ</span>' : '';
            const active = ch === this.currentChannel ? 'active' : '';
            
            html += `
                <div class="subscription-item ${active}" onclick="window.channelManager.joinChannel('${ch}')">
                    <div class="subscription-avatar"><i class="fas ${icon}"></i></div>
                    <div class="subscription-info">
                        <div class="subscription-name">
                            ${ch} ${hidden}
                            <span class="badge ${c.ownerRole === 'owner' ? 'badge-owner' : c.ownerRole === 'admin' ? 'badge-admin' : c.ownerRole === 'coadmin' ? 'badge-coadmin' : 'badge-operator'}">
                                ${c.ownerRole === 'owner' ? '👑' : c.ownerRole === 'admin' ? '⚡' : c.ownerRole === 'coadmin' ? '🔧' : '🛠️'}
                            </span>
                        </div>
                        <div class="subscription-meta">
                            <span>${c.owner}</span>
                            <span>• ${fmt} abone</span>
                        </div>
                    </div>
                    <div class="subscription-stats">${c.onlineUsers?.length || 0}</div>
                </div>
            `;
        });
        
        html += `</div>`;
        
        // Popüler Kanallar
        html += `
            <div class="popular-channels">
                <div class="popular-header">
                    <i class="fas fa-fire" style="color:#ff4444;"></i> Popüler Kanallar
                </div>
                <div id="popularChannelsList"></div>
            </div>
        `;
        
        panel.innerHTML = html;
        this.updatePopularChannels();
    }

    // ========== KANALLAR PANELİ ==========
    loadChannelsPanel(panel) {
        const channels = this.getChannels();
        const user = this.getActiveUser();
        
        let html = `
            <div class="panel-header">
                <h3><i class="fas fa-list-ul" style="color:#ff0000;"></i> Tüm Kanallar</h3>
                <span class="subscription-count">${Object.keys(channels).length}</span>
                <div class="panel-close" onclick="closeLeftPanel()"><i class="fas fa-times"></i></div>
            </div>
            <div class="panel-content">
                <div class="search-container">
                    <i class="fas fa-search"></i>
                    <input type="text" class="search-input" placeholder="Kanal ara...">
                </div>
        `;
        
        let vis = Object.values(channels).filter(ch => {
            if (ch.name === 'admin' && !(user?.role === 'owner' || user?.role === 'admin')) return false;
            return (user?.role === 'owner' || user?.role === 'admin') ? true : !ch.isHidden;
        });
        
        vis.sort((a, b) => (b.subscribers || 0) - (a.subscribers || 0)).forEach(ch => {
            const sub = ch.subscribers || 0;
            const fmt = sub >= 1000000 ? (sub/1000000).toFixed(1)+'M' : sub >= 1000 ? (sub/1000).toFixed(1)+'K' : sub;
            const isSub = user?.subscribedChannels?.includes(ch.name);
            const hidden = ch.isHidden ? '<span class="badge badge-hidden">GİZLİ</span>' : '';
            
            html += `
                <div class="channel-item" onclick="window.channelManager.joinChannel('${ch.name}')">
                    <div class="channel-avatar"><i class="fas fa-hashtag"></i></div>
                    <div class="channel-info">
                        <div class="channel-name">
                            ${ch.name} ${hidden}
                            <span class="badge ${ch.ownerRole === 'owner' ? 'badge-owner' : ch.ownerRole === 'admin' ? 'badge-admin' : ch.ownerRole === 'coadmin' ? 'badge-coadmin' : 'badge-operator'}">
                                ${ch.ownerRole === 'owner' ? '👑' : ch.ownerRole === 'admin' ? '⚡' : ch.ownerRole === 'coadmin' ? '🔧' : '🛠️'}
                            </span>
                        </div>
                        <div class="channel-meta">
                            <span>${ch.owner}</span>
                            <span>• ${fmt} abone</span>
                            <span>• ${ch.onlineUsers?.length || 0} çevrimiçi</span>
                        </div>
                    </div>
                    <button class="subscribe-btn ${isSub ? 'subscribed' : ''}" onclick="event.stopPropagation(); ${isSub ? 'window.channelManager.unsubscribeChannel' : 'window.channelManager.subscribeChannel'}('${ch.name}')">
                        <i class="fas ${isSub ? 'fa-check' : 'fa-plus'}"></i> ${isSub ? 'Abone Olundu' : 'Abone Ol'}
                    </button>
                </div>
            `;
        });
        
        html += `</div>`;
        panel.innerHTML = html;
    }

    // ========== SOHBETLERİM PANELİ ==========
    loadChatListPanel(panel) {
        const user = this.getActiveUser();
        const privates = JSON.parse(localStorage.getItem('cetcety_private_chats')) || {};
        
        let html = `
            <div class="panel-header">
                <h3><i class="fas fa-comment" style="color:#7289da;"></i> Sohbetlerim</h3>
                <span class="subscription-count" id="chatListCount">${document.getElementById('chatListBadge').textContent}</span>
                <div class="panel-close" onclick="closeLeftPanel()"><i class="fas fa-times"></i></div>
            </div>
            <div class="panel-tabs">
                <div id="tabChats" class="panel-tab active" onclick="window.channelManager.switchChatTab('chats')">Sohbetler</div>
                <div id="tabOnline" class="panel-tab" onclick="window.channelManager.switchChatTab('online')">Çevrimiçi (${this.channels[this.currentChannel]?.onlineUsers?.length || 0})</div>
            </div>
            <div class="panel-content" id="chatPanelContent">
        `;
        
        let chats = [];
        for (let chatId in privates) {
            const ids = chatId.split('_');
            const otherId = ids[0] == user?.id ? ids[1] : ids[0];
            const lastMsg = privates[chatId].slice(-1)[0];
            const unread = privates[chatId].filter(m => m.senderId != user?.id && !m.read).length;
            chats.push({ 
                name: otherId, 
                lastMsg: lastMsg ? (lastMsg.type === 'text' ? lastMsg.content : '📎 medya') : '...', 
                time: lastMsg ? new Date(lastMsg.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '', 
                unread 
            });
        }
        
        if (chats.length === 0) {
            chats = [
                { name: 'Mehmet', lastMsg: 'Merhaba', time: '12:34', unread: 2 },
                { name: 'Ahmet', lastMsg: 'Nasılsın?', time: '11:20', unread: 0 },
                { name: 'Ayşe', lastMsg: 'Selam', time: 'Dün', unread: 1 }
            ];
        }
        
        chats.forEach(chat => {
            html += `
                <div class="chat-item" onclick="openPrivateChat('${chat.name}')">
                    <div class="chat-avatar"><span>${chat.name.charAt(0)}</span></div>
                    <div class="chat-info">
                        <div class="chat-name">${chat.name} ${chat.unread > 0 ? '<span class="subscription-notification" style="margin-left:8px;"></span>' : ''}</div>
                        <div class="chat-meta"><span>${chat.lastMsg}</span><span>• ${chat.time}</span></div>
                    </div>
                    ${chat.unread > 0 ? `<div class="subscription-stats" style="color:#ff4444;">${chat.unread}</div>` : ''}
                </div>
            `;
        });
        
        html += `</div>`;
        panel.innerHTML = html;
    }

    // ========== KANAL AÇ PANELİ ==========
    loadCreateChannelPanel(panel) {
        const user = this.getActiveUser();
        
        let html = `
            <div class="panel-header">
                <h3><i class="fas fa-plus-circle" style="color:#ff0000;"></i> Kanal Aç</h3>
                <div class="panel-close" onclick="closeLeftPanel()"><i class="fas fa-times"></i></div>
            </div>
            <div class="panel-content">
        `;
        
        if (user.role !== 'owner' && user.myChannel) {
            html += `
                <div class="info-box">
                    <p><i class="fas fa-info-circle"></i> Zaten bir kanalınız var: <strong>#${user.myChannel}</strong>.</p>
                </div>
            `;
        } else {
            html += `
                <div class="form-group">
                    <label class="form-label">Kanal Adı</label>
                    <input type="text" id="newChannelName" class="form-input" placeholder="örnek: teknoloji" maxlength="20">
                </div>
                <div class="form-group">
                    <label class="form-label">Açıklama</label>
                    <input type="text" id="newChannelDesc" class="form-input" placeholder="Kanalın konusu...">
                </div>
                <button class="form-button" onclick="window.channelManager.createChannel()">Kanalı Oluştur</button>
            `;
        }
        
        html += `</div>`;
        panel.innerHTML = html;
    }

    // ========== BİLDİRİMLER PANELİ ==========
    loadNotificationsPanel(panel) {
        let html = `
            <div class="panel-header">
                <h3><i class="fas fa-bell" style="color:#ff4444;"></i> Bildirimler</h3>
                <span class="subscription-count">2</span>
                <div class="panel-close" onclick="closeLeftPanel()"><i class="fas fa-times"></i></div>
            </div>
            <div class="panel-content">
        `;
        
        const nots = [
            { text: '#rock kanalında yeni video eklendi', time: '5 dk önce' },
            { text: 'Mehmet sana özel mesaj gönderdi', time: '12 dk önce' },
            { text: '#arabesk kanalı popüler oldu!', time: '1 saat önce' }
        ];
        
        nots.forEach(n => {
            html += `
                <div style="display:flex; align-items:center; gap:12px; padding:12px;">
                    <i class="fas fa-info-circle" style="color:#6495ed;"></i>
                    <div style="flex:1;">
                        <div style="font-size:13px; color:#fff;">${n.text}</div>
                        <div style="font-size:10px; color:#aaa; margin-top:2px;">${n.time}</div>
                    </div>
                </div>
            `;
        });
        
        html += `</div>`;
        panel.innerHTML = html;
    }

    // ========== DESTEK PANELİ ==========
    loadSupportPanel(panel) {
        let html = `
            <div class="panel-header">
                <h3><i class="fas fa-headset" style="color:#7289da;"></i> Destek</h3>
                <div class="panel-close" onclick="closeLeftPanel()"><i class="fas fa-times"></i></div>
            </div>
            <div class="panel-content">
                <div class="info-box">
                    <p><i class="fas fa-info-circle"></i> Canlı destek talebiniz #admin kanalına iletilir.</p>
                </div>
                
                <div style="background:#1a1a1a; border-radius:8px; padding:16px; margin-bottom:16px;">
                    <h4 style="color:#fff; margin-bottom:12px;">📋 Sık Sorulan Sorular</h4>
                    
                    <div onclick="window.channelManager.addSystemMessage('📌 Kanal açmak için sol menüde + ikonuna tıklayın.')" 
                         style="cursor:pointer; padding:8px; border-radius:6px; background:#2a2a2a; color:#ddd; font-size:13px; margin-bottom:8px;">
                        <i class="fas fa-question-circle" style="color:#7289da; margin-right:8px;"></i> Kanal nasıl açarım?
                    </div>
                    
                    <div onclick="window.channelManager.addSystemMessage('📌 Yetki sistemi: Owner her şeyi görür, Admin sistem genelinde, Co-admin kendi kanalında yetkilidir.')" 
                         style="cursor:pointer; padding:8px; border-radius:6px; background:#2a2a2a; color:#ddd; font-size:13px;">
                        <i class="fas fa-question-circle" style="color:#7289da; margin-right:8px;"></i> Yetki sistemi nasıl çalışır?
                    </div>
                    
                    <div onclick="window.channelManager.addSystemMessage('📌 Özel sohbetlerde resim/video gönderebilirsiniz.')" 
                         style="cursor:pointer; padding:8px; border-radius:6px; background:#2a2a2a; color:#ddd; font-size:13px; margin-top:8px;">
                        <i class="fas fa-question-circle" style="color:#7289da; margin-right:8px;"></i> Özel sohbet özellikleri
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Destek Talebi</label>
                    <textarea id="supportMessage" class="form-input" placeholder="Sorununuzu yazın..." rows="3"></textarea>
                </div>
                
                <button class="form-button" style="background:#7289da;" onclick="window.channelManager.sendSupportTicket()">Gönder</button>
            </div>
        `;
        panel.innerHTML = html;
    }

    // ========== PROFİL PANELİ ==========
    loadProfilePanel(panel) {
        const user = this.getActiveUser() || { name: 'Misafir', role: 'user', subscribedChannels: [], myChannel: null, avatar: '?', joinDate: new Date().toISOString(), privateMode: 'all', blockedNicks: [] };
        const date = user.joinDate ? new Date(user.joinDate) : new Date();
        const fmtDate = `${date.getDate()}.${date.getMonth()+1}.${date.getFullYear()}`;
        
        let roleText = user.role === 'owner' ? '👑 Kurucu' : user.role === 'admin' ? '⚡ Admin' : user.role === 'coadmin' ? '🔧 Co-Admin' : user.role === 'operator' ? '🛠️ Operator' : '👤 Kullanıcı';
        let roleClass = user.role === 'owner' ? 'badge-owner' : user.role === 'admin' ? 'badge-admin' : user.role === 'coadmin' ? 'badge-coadmin' : user.role === 'operator' ? 'badge-operator' : '';
        
        let html = `
            <div class="panel-header">
                <h3><i class="fas fa-user" style="color:#ff0000;"></i> Profil</h3>
                <div class="panel-close" onclick="closeLeftPanel()"><i class="fas fa-times"></i></div>
            </div>
            <div class="panel-content">
                <!-- Avatar -->
                <div style="display:flex; flex-direction:column; align-items:center; padding:20px 0;">
                    <div class="profile-avatar-panel" style="width:80px; height:80px; font-size:32px; margin-bottom:12px; cursor:pointer;" onclick="changeAvatar()">
                        ${user.avatar || user.name.charAt(0).toUpperCase()}
                    </div>
                    <h2 style="font-size:20px; font-weight:700; color:#fff; margin-bottom:4px;">${user.name}</h2>
                    <span class="badge ${roleClass}" style="margin-bottom:16px;">${roleText}</span>
                </div>
                
                <!-- İstatistikler -->
                <div style="display:flex; justify-content:space-around; padding:16px 0; border-top:1px solid #2a2a2a; border-bottom:1px solid #2a2a2a; margin-bottom:16px;">
                    <div style="text-align:center;">
                        <div style="font-size:18px; font-weight:700; color:#fff;">${user.subscribedChannels?.length || 0}</div>
                        <div style="font-size:11px; color:#aaa;">Abonelik</div>
                    </div>
                    <div style="text-align:center;">
                        <div style="font-size:18px; font-weight:700; color:#fff;">${user.myChannel ? 1 : 0}</div>
                        <div style="font-size:11px; color:#aaa;">Kanalım</div>
                    </div>
                    <div style="text-align:center;">
                        <div style="font-size:18px; font-weight:700; color:#fff;">${fmtDate.split('.')[0]}</div>
                        <div style="font-size:11px; color:#aaa;">Katılım</div>
                    </div>
                </div>
                
                <!-- Kullanıcı adı değiştir -->
                <div class="form-group">
                    <label class="form-label">Kullanıcı Adı</label>
                    <input type="text" id="profileNick" class="form-input" value="${user.name}">
                    <button class="form-button secondary" style="margin-top:8px;" onclick="changeNick()">Değiştir</button>
                </div>
                
                <!-- Şifre değiştir -->
                <div class="form-group">
                    <label class="form-label">Şifre</label>
                    <input type="password" id="profilePassword" class="form-input" placeholder="Yeni şifre">
                    <button class="form-button secondary" style="margin-top:8px;" onclick="changePassword()">Şifreyi Kaydet</button>
                </div>
                
                <!-- Özel sohbet modu -->
                <div class="form-group">
                    <label class="form-label">Özel Sohbet</label>
                    <select id="privateModeSelect" class="form-select" onchange="changePrivateMode()">
                        <option value="all" ${user.privateMode === 'all' ? 'selected' : ''}>Herkese Açık</option>
                        <option value="none" ${user.privateMode === 'none' ? 'selected' : ''}>Herkese Kapalı</option>
                        <option value="blocked" ${user.privateMode === 'blocked' ? 'selected' : ''}>Sadece Engellenenler</option>
                    </select>
                </div>
                
                <!-- Engelleme -->
                <div class="form-group">
                    <label class="form-label">Belirli kişiyi engelle (nick)</label>
                    <input type="text" id="blockNickInput" class="form-input" placeholder="Kullanıcı adı">
                    <button class="form-button secondary" style="margin-top:8px;" onclick="blockSpecificNick()">Engelle</button>
                </div>
        `;
        
        // Engellenen kişiler listesi
        if (user.blockedNicks && user.blockedNicks.length) {
            html += `
                <div style="margin-bottom:16px;">
                    <label class="form-label">Engellenen Kişiler</label>
                    <div style="background:#1a1a1a; border-radius:8px; padding:12px;">
                        ${user.blockedNicks.map(nick => `
                            <span style="display:inline-block; background:#2a2a2a; padding:4px 10px; border-radius:20px; margin:0 4px 4px 0; font-size:12px;">
                                ${nick} <i class="fas fa-times" style="margin-left:6px; cursor:pointer;" onclick="unblockNick('${nick}')"></i>
                            </span>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        // Kanalımı sil (varsa)
        if (user.myChannel) {
            html += `<div style="margin-top:16px;"><button class="form-button danger" onclick="deleteMyChannel()">Kanalımı Sil</button></div>`;
        }
        
        // Çıkış butonu
        html += `<div style="margin-top:24px;"><button class="form-button" onclick="logout()">Güvenli Çıkış</button></div>`;
        
        // OWNER PANELİ (sadece owner görür)
        if (user.role === 'owner') {
            const bannedWords = JSON.parse(localStorage.getItem('cetcety_banned_words')) || ['spam', 'reklam', 'şiddet', 'hakaret'];
            const customCommands = JSON.parse(localStorage.getItem('cetcety_custom_commands')) || [];
            
            html += `
                <hr style="border-color:#333; margin:20px 0;">
                <h4 style="color:#ffd700; margin-bottom:10px;">👑 Owner Paneli</h4>
                
                <!-- Yasaklı kelime ekle -->
                <div class="form-group">
                    <label class="form-label">Yasaklı Kelime Ekle</label>
                    <input type="text" id="newBannedWord" class="form-input" placeholder="örn: küfür">
                    <button class="form-button secondary" style="margin-top:8px;" onclick="addBannedWord()">Ekle</button>
                </div>
                
                <!-- Yasaklı kelime listesi -->
                <div style="margin-bottom:16px;">
                    <label class="form-label">Mevcut Yasaklı Kelimeler</label>
                    <div style="background:#1a1a1a; border-radius:8px; padding:12px;">
                        ${bannedWords.map(word => `
                            <span style="display:inline-block; background:#2a2a2a; padding:4px 10px; border-radius:20px; margin:0 4px 4px 0; font-size:12px;">
                                ${word} <i class="fas fa-times" style="margin-left:6px; cursor:pointer;" onclick="removeBannedWord('${word}')"></i>
                            </span>
                        `).join('')}
                    </div>
                </div>
                
                <!-- Özel komut ekle -->
                <div class="form-group">
                    <label class="form-label">Yeni Komut Ekle (örn: /selam)</label>
                    <input type="text" id="newCommandName" class="form-input" placeholder="Komut adı (başında / ile)">
                    <input type="text" id="newCommandResponse" class="form-input" style="margin-top:8px;" placeholder="Yanıt mesajı">
                    <button class="form-button secondary" style="margin-top:8px;" onclick="addCustomCommand()">Komut Ekle</button>
                </div>
                
                <!-- Özel komut listesi -->
                <div style="margin-bottom:16px;">
                    <label class="form-label">Mevcut Özel Komutlar</label>
                    <div style="background:#1a1a1a; border-radius:8px; padding:12px;">
                        ${customCommands.map(cmd => `
                            <span style="display:inline-block; background:#2a2a2a; padding:4px 10px; border-radius:20px; margin:0 4px 4px 0; font-size:12px;">
                                ${cmd.command} → ${cmd.response} <i class="fas fa-times" style="margin-left:6px; cursor:pointer;" onclick="removeCustomCommand('${cmd.command}')"></i>
                            </span>
                        `).join('')}
                    </div>
                </div>
                
                <!-- Özel sohbet izle -->
                <div class="form-group">
                    <label class="form-label">Özel Sohbet İzle (kullanıcı adı yaz)</label>
                    <input type="text" id="monitorUsername" class="form-input" placeholder="örn: Mehmet">
                    <button class="form-button secondary" style="margin-top:8px;" onclick="showPrivateChatMonitor()">İzlemeyi Başlat</button>
                </div>
                <div id="monitorResult" style="background:#1a1a1a; border-radius:8px; padding:12px; max-height:200px; overflow-y:auto; display:none;"></div>
            `;
        }
        
        html += `</div>`;
        panel.innerHTML = html;
    }

    // ========== POPÜLER KANALLAR ==========
    updatePopularChannels() {
        const c = document.getElementById('popularChannelsList');
        if (!c) return;
        
        const channels = this.getChannels();
        const user = this.getActiveUser();
        
        c.innerHTML = '';
        let vis = Object.values(channels).filter(ch => {
            if (ch.name === 'admin' && !(user?.role === 'owner' || user?.role === 'admin')) return false;
            return (user?.role === 'owner' || user?.role === 'admin') ? true : !ch.isHidden;
        });
        
        vis.sort((a, b) => (b.subscribers || 0) - (a.subscribers || 0))
           .slice(0, 3)
           .forEach(ch => {
            let sub = ch.subscribers || 0;
            let fmt = sub >= 1000000 ? (sub/1000000).toFixed(1)+'M' : sub >= 1000 ? (sub/1000).toFixed(1)+'K' : sub;
            let isSub = user?.subscribedChannels?.includes(ch.name);
            let hidden = ch.isHidden ? '<span class="badge badge-hidden">GİZLİ</span>' : '';
            let roleClass = ch.ownerRole === 'owner' ? 'badge-owner' : ch.ownerRole === 'admin' ? 'badge-admin' : ch.ownerRole === 'coadmin' ? 'badge-coadmin' : 'badge-operator';
            
            c.innerHTML += `
                <div class="popular-item" onclick="window.channelManager.joinChannel('${ch.name}')">
                    <div class="popular-info">
                        <div class="popular-name">
                            ${ch.name} ${hidden}
                            <span class="badge ${roleClass}">${ch.ownerRole === 'owner' ? '👑' : ch.ownerRole === 'admin' ? '⚡' : ch.ownerRole === 'coadmin' ? '🔧' : '🛠️'}</span>
                            ${ch.name === 'genel' ? '<span class="badge badge-owner">ANA</span>' : ''}
                            ${ch.subscribers > 1000000 ? '<span class="badge badge-coadmin">POP</span>' : ''}
                        </div>
                        <div class="popular-subscribers">${fmt} abone</div>
                    </div>
                    <button class="subscribe-btn ${isSub ? 'subscribed' : ''}" 
                        onclick="event.stopPropagation(); ${isSub ? 'window.channelManager.unsubscribeChannel' : 'window.channelManager.subscribeChannel'}('${ch.name}')">
                        <i class="fas ${isSub ? 'fa-check' : 'fa-plus'}"></i> ${isSub ? 'Abone Olundu' : 'Abone Ol'}
                    </button>
                </div>
            `;
        });
    }

    // ========== YARDIMCI FONKSİYONLAR ==========
    switchChatTab(tab) {
        document.getElementById('tabChats').classList.toggle('active', tab === 'chats');
        document.getElementById('tabOnline').classList.toggle('active', tab === 'online');
        
        if (tab === 'online') {
            this.showOnlineTab();
        } else {
            this.loadChatListPanel(document.getElementById('leftPanel'));
        }
    }
    
    showOnlineTab() {
        const c = document.getElementById('chatPanelContent');
        const ch = this.channels[this.currentChannel];
        const users = ch?.onlineUsers || ['MateKy', 'Mehmet', 'Ahmet'];
        
        let html = '';
        users.forEach(u => {
            html += `
                <div class="online-item" onclick="openPrivateChat('${u}')">
                    <div class="online-avatar"><span>${u.charAt(0)}</span></div>
                    <div class="online-info">
                        <div class="online-name">${u}<span class="online-status"></span></div>
                        <div class="online-meta"><span>#${this.currentChannel}</span></div>
                    </div>
                </div>
            `;
        });
        c.innerHTML = html;
    }
    
    sendSupportTicket() {
        const msg = document.getElementById('supportMessage')?.value.trim();
        if (msg) {
            this.addSystemMessage(`🛟 Destek talebiniz iletildi: "${msg}"`);
            closeLeftPanel();
        }
    }
    
    formatSayi(sayi) {
        if (sayi >= 1000000) return (sayi/1000000).toFixed(1) + 'M';
        if (sayi >= 1000) return (sayi/1000).toFixed(1) + 'K';
        return sayi;
    }

    // ========== BADGE GÜNCELLEME ==========
    updateAllBadges() {
        const user = this.getActiveUser();
        document.getElementById('subscriptionBadge').textContent = user?.subscribedChannels?.length || 0;
        document.getElementById('channelCountBadge').textContent = Object.keys(this.getChannels()).length;
    }

    // ========== SİSTEM MESAJI ==========
    addSystemMessage(text) {
        const messagesDiv = document.getElementById('messages');
        if (!messagesDiv) return;
        
        const msgDiv = document.createElement('div');
        msgDiv.className = 'system-message';
        msgDiv.innerHTML = `<i class="fas fa-info-circle"></i> ${this.escapeHTML(text)}`;
        messagesDiv.appendChild(msgDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    escapeHTML(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Global kanal yöneticisini başlat
window.channelManager = new CETCETYChannel();

// Storage değişikliklerini dinle
window.addEventListener('storage', (e) => {
    if (e.key === 'cetcety_channels') {
        window.channelManager.updatePopularChannels();
        window.channelManager.updateAllBadges();
    }
});
