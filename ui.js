// ========== ui.js ==========
// UI İŞLEMLERİ - TÜM FONKSİYONLAR

const UI = {
    // Kanal listesini güncelle
    updateChannelList: function() {
        console.log('🔄 Kanal listesi güncelleniyor...');
        if (App.currentUser) {
            document.getElementById('subscriptionBadge').textContent = 
                App.currentUser.subscribedChannels.length;
        }
        document.getElementById('channelCountBadge').textContent = 
            Object.keys(App.channels).length;
    },
    
    // Ana sayfa
    showHome: function() {
        Utils.addSystemMessage('🏠 Ana sayfa hazırlanıyor...');
    },
    
    // Kanal aç paneli
    openCreateChannelPanel: function() {
        const panel = document.getElementById('leftPanel');
        panel.innerHTML = `
            <div class="panel-header">
                <h3><i class="fas fa-plus-circle" style="color:#ff0000;"></i> Kanal Aç</h3>
                <div class="panel-close" onclick="UI.loadLeftPanel('subscriptions')">
                    <i class="fas fa-times"></i>
                </div>
            </div>
            <div class="panel-content">
                <div class="form-group">
                    <label class="form-label">Kanal Adı</label>
                    <input type="text" id="newChannelName" class="form-input" placeholder="kanaladı">
                </div>
                <button class="form-button" onclick="Channels.create()">Kanalı Oluştur</button>
            </div>
        `;
    },
    
    // Yönetici paneli
    toggleAdminPanel: function() {
        const panel = document.getElementById('adminPanel');
        const overlay = document.getElementById('modalOverlay');
        
        if (panel.classList.contains('active')) {
            panel.classList.remove('active');
            overlay.classList.remove('active');
        } else {
            panel.classList.add('active');
            overlay.classList.add('active');
        }
    },
    
    // Sol paneli yükle
    loadLeftPanel: function(panelName) {
        if (!App.currentUser) return;
        
        const panel = document.getElementById('leftPanel');
        
        switch(panelName) {
            case 'subscriptions':
                this.showSubscriptions(panel);
                break;
            case 'channels':
                this.showChannels(panel);
                break;
            case 'profile':
                this.showProfile(panel);
                break;
            case 'chatlist':
                this.showChatList(panel);
                break;
            case 'notifications':
                this.showNotifications(panel);
                break;
            case 'support':
                this.showSupport(panel);
                break;
            default:
                this.showSubscriptions(panel);
        }
        
        this.setActiveIcon(panelName);
    },
    
    // Sohbet listesi
    showChatList: function(panel) {
        panel.innerHTML = `
            <div class="panel-header">
                <h3><i class="fas fa-comment" style="color:#7289da;"></i> Sohbetlerim</h3>
                <div class="panel-close" onclick="UI.loadLeftPanel('subscriptions')">
                    <i class="fas fa-times"></i>
                </div>
            </div>
            <div class="panel-tabs">
                <div class="panel-tab active" onclick="UI.switchChatTab('chats')">Sohbetler</div>
                <div class="panel-tab" onclick="UI.switchChatTab('online')">Çevrimiçi</div>
            </div>
            <div class="panel-content" id="chatPanelContent">
                <div style="color:#aaa; text-align:center; padding:20px;">
                    <i class="fas fa-spinner fa-spin"></i> Yükleniyor...
                </div>
            </div>
        `;
    },
    
    // Bildirimler
    showNotifications: function(panel) {
        panel.innerHTML = `
            <div class="panel-header">
                <h3><i class="fas fa-bell" style="color:#ff4444;"></i> Bildirimler</h3>
                <div class="panel-close" onclick="UI.loadLeftPanel('subscriptions')">
                    <i class="fas fa-times"></i>
                </div>
            </div>
            <div class="panel-content">
                <div style="color:#aaa; text-align:center; padding:20px;">Henüz bildirim yok</div>
            </div>
        `;
    },
    
    // Destek
    showSupport: function(panel) {
        panel.innerHTML = `
            <div class="panel-header">
                <h3><i class="fas fa-headset" style="color:#7289da;"></i> Destek</h3>
                <div class="panel-close" onclick="UI.loadLeftPanel('subscriptions')">
                    <i class="fas fa-times"></i>
                </div>
            </div>
            <div class="panel-content">
                <div class="info-box" style="background:#1a1a1a; padding:16px; border-radius:8px; margin-bottom:16px;">
                    <p><i class="fas fa-info-circle"></i> Canlı destek yakında...</p>
                </div>
                <button class="form-button" style="background:#7289da;" onclick="Utils.addSystemMessage('🛟 Destek talebi iletildi')">
                    Destek Talebi Gönder
                </button>
            </div>
        `;
    },
    
    // Abonelikler
    showSubscriptions: function(panel) {
        if (!App.currentUser) return;
        
        let html = `
            <div class="panel-header">
                <h3><i class="fas fa-bell" style="color:#ffd700;"></i> Abonelikler</h3>
                <span class="subscription-count">${App.currentUser.subscribedChannels.length}</span>
                <div class="panel-close" onclick="UI.loadLeftPanel('subscriptions')">
                    <i class="fas fa-times"></i>
                </div>
            </div>
            <div class="panel-content">
        `;
        
        if (App.currentUser.subscribedChannels.length === 0) {
            html += '<div style="color:#aaa; text-align:center; padding:20px;">Abone olunan kanal yok</div>';
        } else {
            App.currentUser.subscribedChannels.forEach(ch => {
                const c = App.channels[ch] || { subscribers: 0, owner: 'Sistem' };
                const subCount = Utils.formatNumber(c.subscribers || 0);
                const isActive = (ch === App.currentChannel) ? 'active' : '';
                
                html += `
                    <div class="subscription-item ${isActive}" onclick="App.joinChannel('${ch}')">
                        <div class="subscription-avatar"><i class="fas fa-hashtag"></i></div>
                        <div class="subscription-info">
                            <div class="subscription-name">${ch}</div>
                            <div class="subscription-meta">
                                <span>${c.owner}</span>
                                <span>• ${subCount} abone</span>
                            </div>
                        </div>
                    </div>
                `;
            });
        }
        
        html += '</div>';
        panel.innerHTML = html;
    },
    
    // Tüm kanallar
    showChannels: function(panel) {
        let html = `
            <div class="panel-header">
                <h3><i class="fas fa-list-ul" style="color:#ff0000;"></i> Kanallar</h3>
                <span class="subscription-count">${Object.keys(App.channels).length}</span>
                <div class="panel-close" onclick="UI.loadLeftPanel('subscriptions')">
                    <i class="fas fa-times"></i>
                </div>
            </div>
            <div class="panel-content">
        `;
        
        Object.values(App.channels).forEach(ch => {
            const isSub = App.currentUser.subscribedChannels.includes(ch.name);
            const subCount = Utils.formatNumber(ch.subscribers || 0);
            
            html += `
                <div class="channel-item" onclick="App.joinChannel('${ch.name}')">
                    <div class="channel-avatar"><i class="fas fa-hashtag"></i></div>
                    <div class="channel-info">
                        <div class="channel-name">${ch.name}</div>
                        <div class="channel-meta">${subCount} abone</div>
                    </div>
                    <button class="subscribe-btn ${isSub ? 'subscribed' : ''}" 
                            onclick="event.stopPropagation(); Channels.toggleSubscribe('${ch.name}')">
                        <i class="fas ${isSub ? 'fa-check' : 'fa-plus'}"></i>
                        ${isSub ? 'Abone Olundu' : 'Abone Ol'}
                    </button>
                </div>
            `;
        });
        
        html += '</div>';
        panel.innerHTML = html;
    },
    
    // Profil
    showProfile: function(panel) {
        const user = App.currentUser;
        const roleText = user.role === 'owner' ? '👑 Kurucu' : '👤 Kullanıcı';
        
        panel.innerHTML = `
            <div class="panel-header">
                <h3><i class="fas fa-user" style="color:#ff0000;"></i> Profil</h3>
                <div class="panel-close" onclick="UI.loadLeftPanel('subscriptions')">
                    <i class="fas fa-times"></i>
                </div>
            </div>
            <div class="panel-content">
                <div style="text-align:center; padding:20px 0;">
                    <div style="width:80px; height:80px; border-radius:50%; background:#ff0000; color:#fff; display:flex; align-items:center; justify-content:center; font-size:32px; margin:0 auto 10px;">
                        ${user.avatar}
                    </div>
                    <h2>${user.name}</h2>
                    <span class="badge badge-owner">${roleText}</span>
                </div>
                <button class="form-button" onclick="App.logout()" style="width:100%; padding:12px; background:#ff0000; border:none; border-radius:8px; color:#fff; cursor:pointer;">
                    Güvenli Çıkış
                </button>
            </div>
        `;
    },
    
    // Aktif ikonu ayarla
    setActiveIcon: function(active) {
        document.querySelectorAll('.icon-item').forEach(el => el.classList.remove('active'));
        
        const selectors = {
            'subscriptions': '.icon-item[onclick*="loadLeftPanel(\'subscriptions\')"]',
            'channels': '.icon-item[onclick*="loadLeftPanel(\'channels\')"]',
            'profile': '.profile-avatar',
            'chatlist': '.icon-item[onclick*="loadLeftPanel(\'chatlist\')"]',
            'notifications': '.icon-item[onclick*="loadLeftPanel(\'notifications\')"]',
            'support': '.icon-item[onclick*="loadLeftPanel(\'support\')"]'
        };
        
        if (selectors[active]) {
            document.querySelectorAll(selectors[active]).forEach(el => el.classList.add('active'));
        }
    },
    
    // Chat tab değiştir
    switchChatTab: function(tab) {
        const content = document.getElementById('chatPanelContent');
        if (tab === 'online') {
            content.innerHTML = '<div style="color:#aaa; padding:20px; text-align:center;">Çevrimiçi kullanıcılar yakında...</div>';
        } else {
            content.innerHTML = '<div style="color:#aaa; padding:20px; text-align:center;">Sohbetler yakında...</div>';
        }
    }
};

window.UI = UI;
console.log('✅ UI.js yüklendi');
