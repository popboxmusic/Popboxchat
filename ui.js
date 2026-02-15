// ========== UI.JS ==========
const UI = {
    // Sol panel yükle
    loadLeftPanel: function(panelName) {
        const panel = document.getElementById('leftPanel');
        
        switch(panelName) {
            case 'subscriptions':
                panel.innerHTML = this.getSubscriptionsHTML();
                break;
            case 'channels':
                panel.innerHTML = this.getChannelsHTML();
                break;
            case 'profile':
                panel.innerHTML = this.getProfileHTML();
                break;
            case 'chatlist':
                panel.innerHTML = this.getChatListHTML();
                break;
            case 'notifications':
                panel.innerHTML = this.getNotificationsHTML();
                break;
            case 'support':
                panel.innerHTML = this.getSupportHTML();
                break;
            case 'createchannel':
                panel.innerHTML = this.getCreateChannelHTML();
                break;
        }
        
        this.setActiveIcon(panelName);
    },
    
    // Abonelikler HTML
    getSubscriptionsHTML: function() {
        return `
            <div class="panel-header">
                <h3><i class="fas fa-bell" style="color:#ffd700;"></i> Abonelikler</h3>
                <span class="subscription-count">1</span>
                <div class="panel-close" onclick="UI.loadLeftPanel('subscriptions')">
                    <i class="fas fa-times"></i>
                </div>
            </div>
            <div class="panel-content">
                <div class="subscription-item active" onclick="Channels.join('genel')">
                    <div class="subscription-avatar"><i class="fas fa-hashtag"></i></div>
                    <div class="subscription-info">
                        <div class="subscription-name">genel</div>
                        <div class="subscription-meta">👑 MateKy • 15M abone</div>
                    </div>
                </div>
            </div>
        `;
    },
    
    // Kanallar HTML
    getChannelsHTML: function() {
        return `
            <div class="panel-header">
                <h3><i class="fas fa-list-ul" style="color:#ff0000;"></i> Kanallar</h3>
                <span class="subscription-count">3</span>
                <div class="panel-close" onclick="UI.loadLeftPanel('subscriptions')">
                    <i class="fas fa-times"></i>
                </div>
            </div>
            <div class="panel-content">
                <div class="channel-item" onclick="Channels.join('genel')">
                    <div class="channel-avatar"><i class="fas fa-hashtag"></i></div>
                    <div class="channel-info">
                        <div class="channel-name">genel</div>
                        <div class="channel-meta">👑 MateKy • 15M abone</div>
                    </div>
                </div>
            </div>
        `;
    },
    
    // Profil HTML
    getProfileHTML: function() {
        const user = Auth.currentUser || { name: 'Misafir', avatar: '?' };
        return `
            <div class="panel-header">
                <h3><i class="fas fa-user" style="color:#ff0000;"></i> Profil</h3>
                <div class="panel-close" onclick="UI.loadLeftPanel('subscriptions')">
                    <i class="fas fa-times"></i>
                </div>
            </div>
            <div class="panel-content">
                <div style="text-align:center; padding:20px;">
                    <div style="width:80px; height:80px; border-radius:50%; background:#ff0000; color:#fff; display:flex; align-items:center; justify-content:center; font-size:32px; margin:0 auto 10px;">
                        ${user.avatar}
                    </div>
                    <h2>${user.name}</h2>
                </div>
                <button class="form-button" onclick="Auth.logout()">Çıkış Yap</button>
            </div>
        `;
    },
    
    // Sohbet listesi HTML
    getChatListHTML: function() {
        return `
            <div class="panel-header">
                <h3><i class="fas fa-comment" style="color:#7289da;"></i> Sohbetlerim</h3>
                <div class="panel-close" onclick="UI.loadLeftPanel('subscriptions')">
                    <i class="fas fa-times"></i>
                </div>
            </div>
            <div class="panel-tabs">
                <div class="panel-tab active">Sohbetler</div>
                <div class="panel-tab">Çevrimiçi</div>
            </div>
            <div class="panel-content">
                <div style="color:#aaa; text-align:center; padding:20px;">Yakında...</div>
            </div>
        `;
    },
    
    // Bildirimler HTML
    getNotificationsHTML: function() {
        return `
            <div class="panel-header">
                <h3><i class="fas fa-bell" style="color:#ff4444;"></i> Bildirimler</h3>
                <div class="panel-close" onclick="UI.loadLeftPanel('subscriptions')">
                    <i class="fas fa-times"></i>
                </div>
            </div>
            <div class="panel-content">
                <div style="color:#aaa; text-align:center; padding:20px;">Bildirim yok</div>
            </div>
        `;
    },
    
    // Destek HTML
    getSupportHTML: function() {
        return `
            <div class="panel-header">
                <h3><i class="fas fa-headset" style="color:#7289da;"></i> Destek</h3>
                <div class="panel-close" onclick="UI.loadLeftPanel('subscriptions')">
                    <i class="fas fa-times"></i>
                </div>
            </div>
            <div class="panel-content">
                <div style="padding:20px; text-align:center;">
                    <p>Yardım için /help yazın</p>
                </div>
            </div>
        `;
    },
    
    // Kanal aç HTML
    getCreateChannelHTML: function() {
        return `
            <div class="panel-header">
                <h3><i class="fas fa-plus-circle" style="color:#ff0000;"></i> Kanal Aç</h3>
                <div class="panel-close" onclick="UI.loadLeftPanel('subscriptions')">
                    <i class="fas fa-times"></i>
                </div>
            </div>
            <div class="panel-content">
                <div class="info-box">
                    <p>Yakında...</p>
                </div>
            </div>
        `;
    },
    
    // İkon paneli fonksiyonları
    showHome: function() {
        Utils.addSystemMessage('🏠 Ana sayfa');
    },
    
    openSubscriptions: function() {
        this.loadLeftPanel('subscriptions');
    },
    
    openChannelPanel: function() {
        this.loadLeftPanel('channels');
    },
    
    openChatListPanel: function() {
        this.loadLeftPanel('chatlist');
    },
    
    openCreateChannelPanel: function() {
        this.loadLeftPanel('createchannel');
    },
    
    openNotificationPanel: function() {
        this.loadLeftPanel('notifications');
    },
    
    openSupportPanel: function() {
        this.loadLeftPanel('support');
    },
    
    openProfilePanel: function() {
        this.loadLeftPanel('profile');
    },
    
    // Yönetici paneli
    toggleAdminPanel: function() {
        const panel = document.getElementById('adminPanel');
        const overlay = document.getElementById('modalOverlay');
        panel.classList.toggle('active');
        overlay.classList.toggle('active');
    },
    
    // Tüm modalları kapat
    closeAllModals: function() {
        document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
        document.getElementById('modalOverlay').classList.remove('active');
    },
    
    // Aktif ikon
    setActiveIcon: function(active) {
        document.querySelectorAll('.icon-item').forEach(el => el.classList.remove('active'));
        if (active === 'subscriptions') {
            document.querySelector('.icon-item[onclick*="openSubscriptions"]')?.classList.add('active');
        }
    }
};

window.UI = UI;
console.log('✅ UI.js yüklendi');
