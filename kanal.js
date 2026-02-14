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
        
        document.getElementById('nowPlayingTitle').textContent = c.currentTitle;
        document.getElementById('nowPlayingOwner').innerHTML = `${c.ownerRole === 'owner' ? '👑' : '🔧'} ${c.owner}`;
        
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

    // ========== PANEL YÜKLEME FONKSİYONLARI (EKLEDİM) ==========
    
    // Abonelikler paneli
    loadSubscriptionsPanel(panel) {
        const user = this.getActiveUser();
        const subs = user?.subscribedChannels || ['genel', 'rock', 'arabesk'];
        
        let html = `
            <div class="panel-header">
                <h3><i class="fas fa-bell" style="color:#ffd700;"></i> Abonelikler</h3>
                <span class="subscription-count">${subs.length}</span>
                <div class="panel-close" onclick="closeLeftPanel()"><i class="fas fa-times"></i></div>
            </div>
            <div class="panel-content">
        `;
        
        subs.forEach(ch => {
            const c = this.channels[ch] || { subscribers: 1000, onlineUsers: [] };
            html += `
                <div class="subscription-item" onclick="window.channelManager.joinChannel('${ch}')">
                    <div class="subscription-avatar"><i class="fas fa-hashtag"></i></div>
                    <div class="subscription-info">
                        <div class="subscription-name">${ch}</div>
                        <div class="subscription-meta">${c.onlineUsers?.length || 0} çevrimiçi</div>
                    </div>
                    <div class="subscription-stats">${this.formatSayi(c.subscribers || 0)}</div>
                </div>
            `;
        });
        
        html += `</div>`;
        panel.innerHTML = html;
    }
    
    // Kanallar paneli
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
        
        Object.values(channels).forEach(ch => {
            if (ch.isHidden && !(user?.role === 'owner' || user?.role === 'admin')) return;
            
            const isSub = user?.subscribedChannels?.includes(ch.name);
            html += `
                <div class="channel-item" onclick="window.channelManager.joinChannel('${ch.name}')">
                    <div class="channel-avatar"><i class="fas fa-hashtag"></i></div>
                    <div class="channel-info">
                        <div class="channel-name">${ch.name} ${ch.isHidden ? '<span class="badge badge-hidden">GİZLİ</span>' : ''}</div>
                        <div class="channel-meta">${this.formatSayi(ch.subscribers || 0)} abone • ${ch.onlineUsers?.length || 0} çevrimiçi</div>
                    </div>
                    <button class="subscribe-btn ${isSub ? 'subscribed' : ''}" onclick="event.stopPropagation(); ${isSub ? 'window.channelManager.unsubscribeChannel' : 'window.channelManager.subscribeChannel'}('${ch.name}')">
                        <i class="fas ${isSub ? 'fa-check' : 'fa-plus'}"></i>
                    </button>
                </div>
            `;
        });
        
        html += `</div>`;
        panel.innerHTML = html;
    }
    
    // Sohbetlerim paneli
    loadChatListPanel(panel) {
        const user = this.getActiveUser();
        const privates = JSON.parse(localStorage.getItem('cetcety_private_chats')) || {};
        
        let html = `
            <div class="panel-header">
                <h3><i class="fas fa-comment" style="color:#7289da;"></i> Sohbetlerim</h3>
                <div class="panel-close" onclick="closeLeftPanel()"><i class="fas fa-times"></i></div>
            </div>
            <div class="panel-tabs">
                <div class="panel-tab active" onclick="window.channelManager.switchChatTab('chats')">Sohbetler</div>
                <div class="panel-tab" onclick="window.channelManager.switchChatTab('online')">Çevrimiçi</div>
            </div>
            <div class="panel-content" id="chatPanelContent">
        `;
        
        // Özel sohbetleri listele
        let chatHtml = '';
        Object.keys(privates).forEach(chatId => {
            const ids = chatId.split('_');
            const otherId = ids[0] == user?.id ? ids[1] : ids[0];
            const sonMesaj = privates[chatId][privates[chatId].length - 1];
            
            chatHtml += `
                <div class="chat-item" onclick="openPrivateChat('${otherId}')">
                    <div class="chat-avatar">${otherId.charAt(0)}</div>
                    <div class="chat-info">
                        <div class="chat-name">${otherId}</div>
                        <div class="chat-meta">${sonMesaj?.content || '...'}</div>
                    </div>
                </div>
            `;
        });
        
        html += chatHtml || '<div style="color:#aaa; text-align:center; padding:20px;">Sohbet yok</div>';
        html += `</div>`;
        panel.innerHTML = html;
    }
    
    // Kanal aç paneli
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
                    <p><i class="fas fa-info-circle"></i> Zaten bir kanalınız var: <strong>#${user.myChannel}</strong></p>
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
    
    // Bildirimler paneli
    loadNotificationsPanel(panel) {
        panel.innerHTML = `
            <div class="panel-header">
                <h3><i class="fas fa-bell" style="color:#ff4444;"></i> Bildirimler</h3>
                <div class="panel-close" onclick="closeLeftPanel()"><i class="fas fa-times"></i></div>
            </div>
            <div class="panel-content">
                <div style="display:flex; align-items:center; gap:12px; padding:12px; background:#1a1a1a; border-radius:8px; margin-bottom:8px;">
                    <i class="fas fa-info-circle" style="color:#6495ed;"></i>
                    <div style="flex:1;">
                        <div style="font-size:13px; color:#fff;">#rock kanalında yeni video eklendi</div>
                        <div style="font-size:10px; color:#aaa;">5 dk önce</div>
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:12px; padding:12px; background:#1a1a1a; border-radius:8px;">
                    <i class="fas fa-envelope" style="color:#ffd700;"></i>
                    <div style="flex:1;">
                        <div style="font-size:13px; color:#fff;">Mehmet sana mesaj gönderdi</div>
                        <div style="font-size:10px; color:#aaa;">12 dk önce</div>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Destek paneli
    loadSupportPanel(panel) {
        panel.innerHTML = `
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
                         style="cursor:pointer; padding:12px; background:#2a2a2a; border-radius:8px; margin-bottom:8px;">
                        <i class="fas fa-question-circle" style="color:#7289da; margin-right:8px;"></i>
                        Kanal nasıl açarım?
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Destek Talebi</label>
                    <textarea id="supportMessage" class="form-input" placeholder="Sorununuzu yazın..." rows="3"></textarea>
                </div>
                <button class="form-button" style="background:#7289da;" onclick="window.channelManager.sendSupportTicket()">Gönder</button>
            </div>
        `;
    }
    
    // Profil paneli
    loadProfilePanel(panel) {
        const user = this.getActiveUser() || { name: 'Misafir', role: 'user' };
        
        panel.innerHTML = `
            <div class="panel-header">
                <h3><i class="fas fa-user" style="color:#ff0000;"></i> Profil</h3>
                <div class="panel-close" onclick="closeLeftPanel()"><i class="fas fa-times"></i></div>
            </div>
            <div class="panel-content">
                <div style="display:flex; flex-direction:column; align-items:center; padding:20px 0;">
                    <div class="profile-avatar-panel" style="width:80px; height:80px; font-size:32px; margin-bottom:12px;">
                        ${user.name.charAt(0).toUpperCase()}
                    </div>
                    <h2 style="font-size:20px; font-weight:700; color:#fff; margin-bottom:4px;">${user.name}</h2>
                    <span class="badge ${user.role === 'owner' ? 'badge-owner' : user.role === 'admin' ? 'badge-admin' : 'badge-operator'}">
                        ${user.role === 'owner' ? '👑 Kurucu' : user.role === 'admin' ? '⚡ Admin' : '👤 Kullanıcı'}
                    </span>
                </div>
                <div style="display:flex; justify-content:space-around; padding:16px 0; border-top:1px solid #2a2a2a; border-bottom:1px solid #2a2a2a; margin:16px 0;">
                    <div style="text-align:center;">
                        <div style="font-size:18px; font-weight:700; color:#fff;">${user.subscribedChannels?.length || 0}</div>
                        <div style="font-size:11px; color:#aaa;">Abonelik</div>
                    </div>
                    <div style="text-align:center;">
                        <div style="font-size:18px; font-weight:700; color:#fff;">${user.myChannel ? 1 : 0}</div>
                        <div style="font-size:11px; color:#aaa;">Kanalım</div>
                    </div>
                </div>
                <button class="form-button" onclick="logout()">Çıkış Yap</button>
            </div>
        `;
    }
    
    // Yardımcı fonksiyonlar
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
                    <div class="online-avatar">${u.charAt(0)}</div>
                    <div class="online-info">
                        <div class="online-name">${u}<span class="online-status"></span></div>
                        <div class="online-meta">#${this.currentChannel}</div>
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
                            <span class="badge ${roleClass}">${ch.ownerRole === 'owner' ? '👑' : ch.ownerRole === 'admin' ? '⚡' : '🔧'}</span>
                        </div>
                        <div class="popular-subscribers">${fmt} abone</div>
                    </div>
                    <button class="subscribe-btn ${isSub ? 'subscribed' : ''}" 
                        onclick="event.stopPropagation(); ${isSub ? 'window.channelManager.unsubscribeChannel' : 'window.channelManager.subscribeChannel'}('${ch.name}')">
                        <i class="fas ${isSub ? 'fa-check' : 'fa-plus'}"></i>
                    </button>
                </div>
            `;
        });
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
