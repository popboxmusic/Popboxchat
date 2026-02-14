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

        // Eski kanaldan çıkar
        if (this.currentChannel && channels[this.currentChannel] && channels[this.currentChannel].onlineUsers) {
            channels[this.currentChannel].onlineUsers = channels[this.currentChannel].onlineUsers.filter(u => u !== user?.name);
        }

        this.currentChannel = ch;
        let c = channels[ch];

        // Yeni kanala ekle
        if (!c.onlineUsers.includes(user?.name)) {
            c.onlineUsers.push(user?.name);
        }
        this.saveChannels(channels);

        // UI güncelle
        document.getElementById('currentChannelName').textContent = ch;
        document.getElementById('currentChannelPlaylist').textContent = `#${ch} playlist`;
        
        let sub = c.subscribers || 0;
        let fmt = sub >= 1000000 ? (sub/1000000).toFixed(1)+'M' : sub >= 1000 ? (sub/1000).toFixed(1)+'K' : sub;
        document.getElementById('channelSubscribers').textContent = fmt;
        document.getElementById('channelUserCount').textContent = c.onlineUsers.length;
        
        document.getElementById('nowPlayingTitle').textContent = c.currentTitle;
        document.getElementById('nowPlayingOwner').innerHTML = `${c.ownerRole === 'owner' ? '👑' : '🔧'} ${c.owner}`;
        
        // Medya yöneticisini güncelle
        if (window.mediaManager) {
            window.mediaManager.setChannel(ch);
        }

        // Abone butonunu güncelle
        const subBtn = document.getElementById('subscribeChannelBtn');
        if (user?.subscribedChannels?.includes(ch)) {
            subBtn.innerHTML = '<i class="fas fa-check"></i> Abone Olundu';
            subBtn.classList.add('subscribed');
        } else {
            subBtn.innerHTML = '<i class="fas fa-plus"></i> Abone Ol';
            subBtn.classList.remove('subscribed');
        }

        this.addSystemMessage(`📢 #${ch} kanalına katıldın! ${fmt} abone, ${c.onlineUsers.length} çevrimiçi.`);
        
        // Kanal mesajlarını yükle (global fonksiyon)
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