// ========== PRIVATE.JS ==========
const PrivateChat = {
    currentUser: null,
    
    // Özel sohbet aç
    open: function(username) {
        this.currentUser = username;
        document.getElementById('privateChatName').textContent = username;
        document.getElementById('privateChatAvatar').innerHTML = username.charAt(0).toUpperCase();
        document.getElementById('privateChatPanel').classList.add('active');
        
        // Önceki mesajları yükle
        this.loadMessages(username);
    },
    
    // Kapat
    close: function() {
        document.getElementById('privateChatPanel').classList.remove('active');
        this.currentUser = null;
    },
    
    // Mesaj gönder
    send: function() {
        const input = document.getElementById('privateMessageInput');
        const text = input.value.trim();
        if (!text || !this.currentUser || !Auth.currentUser) return;
        
        // Mesajı göster
        this.displayMessage(text, 'text', true);
        
        // Owner'a ilet (#ow kanalı için)
        this.logToOW(text, 'text', null);
        
        // Karşı tarafa mesaj gitmiş gibi yap (simülasyon)
        setTimeout(() => {
            this.displayMessage('Mesajınız iletilmiştir (simülasyon)', 'text', false);
        }, 500);
        
        input.value = '';
    },
    
    // Mesajı ekranda göster
    displayMessage: function(content, type, isMe = false) {
        const container = document.getElementById('privateChatMessages');
        const time = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        
        let html = '';
        if (type === 'text') {
            html = `<div class="private-message ${isMe ? 'right' : ''}">
                <div class="private-message-header" style="${isMe ? 'justify-content: flex-end;' : ''}">
                    <span class="private-message-time">${time}</span>
                    <span class="private-message-sender">${isMe ? Auth.currentUser.name : this.currentUser}</span>
                </div>
                <div class="private-message-text">${Utils.escapeHTML(content)}</div>
            </div>`;
        } else if (type === 'image') {
            html = `<div class="private-message ${isMe ? 'right' : ''}">
                <div class="private-message-header" style="${isMe ? 'justify-content: flex-end;' : ''}">
                    <span class="private-message-time">${time}</span>
                    <span class="private-message-sender">${isMe ? Auth.currentUser.name : this.currentUser}</span>
                </div>
                <div class="private-message-media">
                    <img src="${content}" style="max-width:100%; border-radius:8px; cursor:pointer;" onclick="window.open(this.src)">
                </div>
            </div>`;
        } else if (type === 'video') {
            html = `<div class="private-message ${isMe ? 'right' : ''}">
                <div class="private-message-header" style="${isMe ? 'justify-content: flex-end;' : ''}">
                    <span class="private-message-time">${time}</span>
                    <span class="private-message-sender">${isMe ? Auth.currentUser.name : this.currentUser}</span>
                </div>
                <div class="private-message-media">
                    <video controls src="${content}" style="max-width:100%; border-radius:8px;"></video>
                </div>
            </div>`;
        }
        
        container.insertAdjacentHTML('beforeend', html);
        container.scrollTop = container.scrollHeight;
    },
    
    // Özel mesajı owner kanalına ilet (#ow)
    logToOW: function(content, type, fileContent) {
        // Sadece owner değilse logla (kendi kendini loglama)
        if (Auth.currentUser?.name === 'MateKy') return;
        
        const owMessages = JSON.parse(localStorage.getItem('ow_messages') || '[]');
        const sender = Auth.currentUser?.name || 'Bilinmeyen';
        const receiver = this.currentUser || 'Bilinmeyen';
        
        let logEntry = {
            time: new Date().toLocaleTimeString('tr-TR'),
            sender: sender,
            receiver: receiver,
            type: type
        };
        
        if (type === 'text') {
            logEntry.text = content;
        } else if (type === 'image') {
            logEntry.text = `📸 Resim gönderdi`;
            logEntry.image = fileContent || content;
        } else if (type === 'video') {
            logEntry.text = `🎥 Video gönderdi`;
            logEntry.video = fileContent || content;
        }
        
        owMessages.push(logEntry);
        localStorage.setItem('ow_messages', JSON.stringify(owMessages));
        
        // Eğer #ow kanalı açıksa UI'ı güncelle
        if (window.Channels && Channels.currentChannel === 'ow') {
            this.loadOWMessages();
        }
    },
    
    // OW mesajlarını yükle (#ow kanalı için)
    loadOWMessages: function() {
        const container = document.getElementById('messages');
        if (!container) return;
        
        const messages = JSON.parse(localStorage.getItem('ow_messages') || '[]');
        
        container.innerHTML = '';
        
        if (messages.length === 0) {
            container.innerHTML = '<div class="system-message">🔒 Özel mesaj bulunmuyor</div>';
            return;
        }
        
        messages.forEach(msg => {
            let html = '<div class="system-message" style="background:#2a0a2a; border-left-color:#9370db;">';
            html += `<i class="fas fa-lock" style="color:#9370db;"></i> `;
            html += `[${msg.time}] <strong>${msg.sender}</strong> → <strong>${msg.receiver}</strong>: ${msg.text}`;
            
            if (msg.type === 'image' && msg.image) {
                html += `<br><img src="${msg.image}" style="max-width:200px; max-height:200px; margin-top:8px; border-radius:8px; cursor:pointer;" onclick="window.open(this.src)">`;
            } else if (msg.type === 'video' && msg.video) {
                html += `<br><video controls src="${msg.video}" style="max-width:200px; max-height:200px; margin-top:8px; border-radius:8px;"></video>`;
            }
            
            html += '</div>';
            container.insertAdjacentHTML('beforeend', html);
        });
        
        container.scrollTop = container.scrollHeight;
    },
    
    // Özel sohbet mesajlarını yükle
    loadMessages: function(username) {
        const container = document.getElementById('privateChatMessages');
        container.innerHTML = '<div style="color:#aaa; text-align:center; padding:20px;">Sohbet başlatıldı</div>';
    },
    
    // Engelle
    block: function() {
        if (this.currentUser) {
            Utils.addSystemMessage(`🚫 ${this.currentUser} engellendi`);
            this.close();
        }
    },
    
    // Şikayet
    report: function() {
        if (this.currentUser) {
            Utils.addSystemMessage(`⚠️ ${this.currentUser} şikayet edildi`);
            this.logToOW(`⚠️ ${Auth.currentUser?.name} tarafından şikayet edildi`, 'text');
        }
    },
    
    // Sekme değiştir
    switchTab: function(tab) {
        if (tab !== 'chat') {
            Utils.addSystemMessage('🔜 Yakında...');
        }
    },
    
    // Resim yükle
    uploadImage: function() {
        document.getElementById('privateImageUpload').click();
    },
    
    // Video yükle
    uploadVideo: function() {
        document.getElementById('privateVideoUpload').click();
    },
    
    // Resim dosyası gönder
    sendImage: function(file) {
        if (!file || !this.currentUser) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const imageData = e.target.result;
            
            // Karşı tarafa göster
            this.displayMessage(imageData, 'image', true);
            
            // Owner'a ilet
            this.logToOW('📸 Resim gönderdi', 'image', imageData);
        };
        reader.readAsDataURL(file);
    },
    
    // Video dosyası gönder
    sendVideo: function(file) {
        if (!file || !this.currentUser) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const videoData = e.target.result;
            
            // Karşı tarafa göster
            this.displayMessage(videoData, 'video', true);
            
            // Owner'a ilet
            this.logToOW('🎥 Video gönderdi', 'video', videoData);
        };
        reader.readAsDataURL(file);
    }
};

window.PrivateChat = PrivateChat;
console.log('✅ Private.js yüklendi - Özel mesajlar #ow kanalına iletilir');
