// ========== ui.js ==========
// UI İŞLEMLERİ

const UI = {
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
        
        App.currentUser.subscribedChannels.forEach(ch => {
            const c = App.channels[ch] || { subscribers: 0 };
            html += `
                <div class="subscription-item" onclick="App.joinChannel('${ch}')">
                    <div class="subscription-avatar"><i class="fas fa-hashtag"></i></div>
                    <div class="subscription-info">
                        <div class="subscription-name">${ch}</div>
                        <div class="subscription-meta">${Utils.formatNumber(c.subscribers)} abone</div>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        panel.innerHTML = html;
    },
    
    // Tüm kanallar
    showChannels: function(panel) {
        let html = `
            <div class="panel-header">
                <h3><i class="fas fa-list-ul" style="color:#ff0000;"></i> Kanallar</h3>
                <div class="panel-close" onclick="UI.loadLeftPanel('subscriptions')">
                    <i class="fas fa-times"></i>
                </div>
            </div>
            <div class="panel-content">
        `;
        
        Object.values(App.channels).forEach(ch => {
            const isSub = App.currentUser.subscribedChannels.includes(ch.name);
            html += `
                <div class="channel-item" onclick="App.joinChannel('${ch.name}')">
                    <div class="channel-avatar"><i class="fas fa-hashtag"></i></div>
                    <div class="channel-info">
                        <div class="channel-name">${ch.name}</div>
                        <div class="channel-meta">${Utils.formatNumber(ch.subscribers)} abone</div>
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
        panel.innerHTML = `
            <div class="panel-header">
                <h3><i class="fas fa-user" style="color:#ff0000;"></i> Profil</h3>
                <div class="panel-close" onclick="UI.loadLeftPanel('subscriptions')">
                    <i class="fas fa-times"></i>
                </div>
            </div>
            <div class="panel-content">
                <div style="text-align: center; padding: 20px;">
                    <div class="profile-avatar-panel" style="width:80px; height:80px; font-size:32px; margin:0 auto 10px;">
                        ${user.avatar}
                    </div>
                    <h2>${user.name}</h2>
                    <span class="badge ${user.role === 'owner' ? 'badge-owner' : ''}">
                        ${user.role === 'owner' ? '👑 Owner' : '👤 Kullanıcı'}
                    </span>
                </div>
                <button class="form-button" onclick="App.logout()" style="margin-top:20px;">
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
        if (active === 'subscriptions') {
            document.querySelector('.icon-item[onclick*="openSubscriptions"]')?.classList.add('active');
        }
    }
};

window.UI = UI;