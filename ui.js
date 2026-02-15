// ========== ui.js ==========
// UI İŞLEMLERİ - TÜM FONKSİYONLAR EKLENDİ

const UI = {
    // Kanal listesini güncelle
    updateChannelList: function() {
        console.log('🔄 Kanal listesi güncelleniyor...');
        // Abonelik rozetini güncelle
        if (App.currentUser) {
            document.getElementById('subscriptionBadge').textContent = 
                App.currentUser.subscribedChannels.length;
        }
        // Kanal sayısı rozetini güncelle
        document.getElementById('channelCountBadge').textContent = 
            Object.keys(App.channels).length;
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
            default:
                this.showSubscriptions(panel);
        }
        
        this.setActiveIcon(panelName);
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
            const onlineCount = ch.onlineUsers ? Object.keys(ch.onlineUsers).length : 0;
            
            html += `
                <div class="channel-item" onclick="App.joinChannel('${ch.name}')">
                    <div class="channel-avatar"><i class="fas fa-hashtag"></i></div>
                    <div class="channel-info">
                        <div class="channel-name">${ch.name}</div>
                        <div class="channel-meta">
                            <span>${ch.owner}</span>
                            <span>• ${subCount} abone</span>
                            <span>• ${onlineCount} çevrimiçi</span>
                        </div>
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
        const roleText = user.role === 'owner' ? '👑 Kurucu' : 
                        user.role === 'admin' ? '⚡ Admin' : '👤 Kullanıcı';
        const roleClass = user.role === 'owner' ? 'badge-owner' : '';
        
        panel.innerHTML = `
            <div class="panel-header">
                <h3><i class="fas fa-user" style="color:#ff0000;"></i> Profil</h3>
                <div class="panel-close" onclick="UI.loadLeftPanel('subscriptions')">
                    <i class="fas fa-times"></i>
                </div>
            </div>
            <div class="panel-content">
                <div style="text-align: center; padding: 20px 0;">
                    <div class="profile-avatar-panel" style="width:80px; height:80px; font-size:32px; margin:0 auto 10px; background:#ff0000; color:#fff; border-radius:50%; display:flex; align-items:center; justify-content:center;">
                        ${user.avatar}
                    </div>
                    <h2 style="margin-bottom:4px;">${user.name}</h2>
                    <span class="badge ${roleClass}" style="margin-bottom:16px;">${roleText}</span>
                </div>
                
                <div style="display:flex; justify-content:space-around; padding:16px 0; border-top:1px solid #2a2a2a; border-bottom:1px solid #2a2a2a; margin-bottom:16px;">
                    <div style="text-align:center;">
                        <div style="font-size:18px; font-weight:700;">${user.subscribedChannels.length}</div>
                        <div style="font-size:11px; color:#aaa;">Abonelik</div>
                    </div>
                    <div style="text-align:center;">
                        <div style="font-size:18px; font-weight:700;">${user.myChannel ? '1' : '0'}</div>
                        <div style="font-size:11px; color:#aaa;">Kanalım</div>
                    </div>
                </div>
                
                <button class="form-button" onclick="App.logout()" style="margin-top:20px; width:100%; padding:12px; background:#ff0000; border:none; border-radius:8px; color:#fff; cursor:pointer;">
                    Güvenli Çıkış
                </button>
            </div>
        `;
    },
    
    // Kanal bilgilerini güncelle
    updateChannelInfo: function() {
        const ch = App.channels[App.currentChannel];
        if (ch) {
            document.getElementById('channelSubscribers').textContent = 
                Utils.formatNumber(ch.subscribers || 0);
        }
    },
    
    // Aktif ikonu ayarla
    setActiveIcon: function(active) {
        document.querySelectorAll('.icon-item').forEach(el => el.classList.remove('active'));
        
        const icons = {
            'subscriptions': '.icon-item[onclick*="openSubscriptions"], .icon-item[onclick*="loadLeftPanel(\'subscriptions\')"]',
            'channels': '.icon-item[onclick*="openChannelPanel"], .icon-item[onclick*="loadLeftPanel(\'channels\')"]',
            'profile': '.icon-item[onclick*="openProfilePanel"], .icon-item[onclick*="loadLeftPanel(\'profile\')"], .profile-avatar'
        };
        
        if (icons[active]) {
            document.querySelectorAll(icons[active]).forEach(el => el.classList.add('active'));
        }
    }
};

window.UI = UI;
console.log('✅ UI.js yüklendi - tüm fonksiyonlar hazır');
