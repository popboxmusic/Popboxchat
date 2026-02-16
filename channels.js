// ========== CHANNELS.JS ==========
const Channels = {
    currentChannel: 'genel',
    
    // Kanal değiştir
    join: function(channelName) {
        // #ow kanalı kontrolü
        if (channelName === 'ow' && !Auth.canAccessOW()) {
            Utils.addSystemMessage('❌ Bu kanala erişim yetkiniz yok.');
            return;
        }
        
        // Eski kanaldan çık
        if (window.database && Auth.currentUser) {
            window.database.ref(`online/${this.currentChannel}/${Auth.currentUser.id}`).remove();
        }
        
        this.currentChannel = channelName;
        document.getElementById('currentChannelName').textContent = channelName;
        document.getElementById('messages').innerHTML = '';
        
        // Yeni kanala gir
        if (window.database && Auth.currentUser) {
            window.database.ref(`online/${channelName}/${Auth.currentUser.id}`).set({
                name: Auth.currentUser.name,
                role: Auth.currentUser.role,
                lastSeen: Date.now()
            });
        }
        
        // #ow kanalıysa özel mesajları göster
        if (channelName === 'ow' && Auth.canAccessOW()) {
            if (window.PrivateChat) {
                PrivateChat.loadOWMessages();
            }
        } else {
            // Normal kanal mesajlarını dinlemeye başla
            this.listenMessages();
        }
        
        Utils.addSystemMessage(`📢 #${channelName} kanalına katıldın!`);
    },
    
    // Mesajları dinle
    listenMessages: function() {
        if (!window.database) return;
        
        // Önceki dinleyiciyi kaldır
        if (this.messageListener) {
            this.messageListener.off();
        }
        
        // Yeni dinleyici ekle
        this.messageListener = window.database.ref('messages')
            .orderByChild('timestamp')
            .limitToLast(50)
            .on('child_added', (snapshot) => {
                const msg = snapshot.val();
                if (msg && msg.channel === this.currentChannel) {
                    this.displayMessage(msg, msg.sender === Auth.currentUser?.name);
                }
            });
    },
    
    // Mesaj gönder
    sendMessage: function() {
        const input = document.getElementById('messageInput');
        const text = input.value.trim();
        if (!text || !Auth.currentUser) return;
        
        if (text.startsWith('/')) {
            if (window.Commands) Commands.handle(text);
            input.value = '';
            Utils.autoResize(input);
            return;
        }
        
        const msg = {
            sender: Auth.currentUser.name,
            text: text,
            channel: this.currentChannel,
            time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
            timestamp: Date.now()
        };
        
        // Firebase'e gönder
        if (window.database) {
            window.database.ref('messages').push(msg);
        }
        
        input.value = '';
        Utils.autoResize(input);
    },
    
    // Mesaj göster
    displayMessage: function(msg, isMe = false) {
        const container = document.getElementById('messages');
        
        const div = document.createElement('div');
        div.className = `message ${isMe ? 'right' : ''}`;
        div.innerHTML = `
            <div class="message-header" style="${isMe ? 'justify-content: flex-end;' : ''}">
                <span class="message-time">${msg.time}</span>
                <span class="message-sender">${Utils.escapeHTML(msg.sender)}</span>
            </div>
            <div class="message-text">${Utils.escapeHTML(msg.text)}</div>
        `;
        
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    },
    
    // Çevrimiçi kullanıcıları dinle
    listenOnline: function() {
        if (!window.database) return;
        
        window.database.ref(`online/${this.currentChannel}`).on('value', (snapshot) => {
            const users = snapshot.val() || {};
            const count = Object.keys(users).length;
            document.getElementById('channelUserCount').textContent = count;
            
            // Çevrimiçi listesini güncelle
            this.updateOnlineList(users);
        });
    },
    
    // Çevrimiçi listesini güncelle
    updateOnlineList: function(users) {
        const onlineTab = document.getElementById('tabOnline');
        if (onlineTab) {
            onlineTab.textContent = `Çevrimiçi (${Object.keys(users).length})`;
        }
        
        // Eğer online tab aktifse listeyi güncelle
        const chatPanelContent = document.getElementById('chatPanelContent');
        if (chatPanelContent && document.getElementById('tabOnline')?.classList.contains('active')) {
            let html = '';
            Object.values(users).forEach(user => {
                let roleIcon = '';
                if (user.role === 'owner') roleIcon = '👑 ';
                else if (user.role === 'admin') roleIcon = '⚡ ';
                else if (user.role === 'coadmin') roleIcon = '🔧 ';
                else if (user.role === 'operator') roleIcon = '🛠️ ';
                
                html += `<div class="online-item" onclick="PrivateChat.open('${user.name}')">
                    <div class="online-avatar"><span>${user.name.charAt(0)}</span></div>
                    <div class="online-info">
                        <div class="online-name">${roleIcon}${user.name}<span class="online-status"></span></div>
                        <div class="online-meta"><span>#${this.currentChannel}</span></div>
                    </div>
                </div>`;
            });
            chatPanelContent.innerHTML = html || '<div style="color:#aaa; padding:20px; text-align:center;">Kimse çevrimiçi değil</div>';
        }
    },
    
    // Abone ol/çık
    toggleSubscribe: function() {
        const btn = document.getElementById('subscribeChannelBtn');
        if (btn.classList.contains('subscribed')) {
            btn.innerHTML = '<i class="fas fa-plus"></i> Abone Ol';
            btn.classList.remove('subscribed');
            Utils.addSystemMessage(`❌ Abonelikten çıkıldı.`);
        } else {
            btn.innerHTML = '<i class="fas fa-check"></i> Abone Olundu';
            btn.classList.add('subscribed');
            Utils.addSystemMessage(`✅ Abone olundu!`);
        }
    },
    
    // Kanal gizle
    toggleHidden: function() {
        Utils.addSystemMessage('👁️ Bu özellik yakında...');
    },
    
    // Şikayet et
    report: function() {
        const reason = prompt('Şikayet sebebi:');
        if (reason) {
            Utils.addSystemMessage(`🚩 #${this.currentChannel} şikayet edildi: ${reason}`);
        }
    }
};

window.Channels = Channels;
console.log('✅ Channels.js yüklendi - Eşzamanlı mesajlaşma aktif');
