// ========== CHANNELS.JS ==========
const Channels = {
    currentChannel: 'genel',
    
    // Kanal değiştir
    join: function(channelName) {
        if (!window.channels) window.channels = {};
        if (!window.channels[channelName]) {
            Utils.addSystemMessage('❌ Kanal bulunamadı.');
            return;
        }
        
        this.currentChannel = channelName;
        
        // UI güncelle
        document.getElementById('currentChannelName').textContent = channelName;
        document.getElementById('messages').innerHTML = '';
        Utils.addSystemMessage(`📢 #${channelName} kanalına katıldın!`);
        
        // Abone butonunu güncelle
        this.updateSubscribeButton();
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
        
        const banned = Utils.checkBannedWords(text);
        if (banned) {
            Utils.addSystemMessage(`🚫 Yasaklı kelime: "${banned}"`);
            input.value = '';
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
        
        this.displayMessage(msg, true);
        input.value = '';
        Utils.autoResize(input);
    },
    
    // Mesaj göster
    displayMessage: function(msg, isMe = false) {
        const div = document.createElement('div');
        div.className = `message ${isMe ? 'right' : ''}`;
        div.innerHTML = `
            <div class="message-header" style="${isMe ? 'justify-content: flex-end;' : ''}">
                <span class="message-time">${msg.time}</span>
                <span class="message-sender">${Utils.escapeHTML(msg.sender)}</span>
            </div>
            <div class="message-text">${Utils.escapeHTML(msg.text)}</div>
        `;
        document.getElementById('messages').appendChild(div);
        document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
    },
    
    // Abone ol/çık
    toggleSubscribe: function() {
        if (!Auth.currentUser) return;
        
        const btn = document.getElementById('subscribeChannelBtn');
        if (btn.classList.contains('subscribed')) {
            btn.innerHTML = '<i class="fas fa-plus"></i> Abone Ol';
            btn.classList.remove('subscribed');
            Utils.addSystemMessage(`❌ #${this.currentChannel} abonelikten çıkıldı.`);
        } else {
            btn.innerHTML = '<i class="fas fa-check"></i> Abone Olundu';
            btn.classList.add('subscribed');
            Utils.addSystemMessage(`✅ #${this.currentChannel} abone olundu!`);
        }
    },
    
    // Abone butonunu güncelle
    updateSubscribeButton: function() {
        const btn = document.getElementById('subscribeChannelBtn');
        if (btn) {
            btn.innerHTML = '<i class="fas fa-plus"></i> Abone Ol';
            btn.classList.remove('subscribed');
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
console.log('✅ Channels.js yüklendi');
