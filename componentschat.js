// Sohbet Yönetim Sistemi
class ChatSystem {
    constructor() {
        this.messages = new Map();
        this.messageHistory = [];
        this.typingUsers = new Map();
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadMessageHistory();
    }
    
    setupEventListeners() {
        // Mesaj input'u için typing detection
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            let typingTimeout;
            
            messageInput.addEventListener('input', () => {
                this.sendTypingIndicator(true);
                
                clearTimeout(typingTimeout);
                typingTimeout = setTimeout(() => {
                    this.sendTypingIndicator(false);
                }, 1000);
            });
            
            messageInput.addEventListener('blur', () => {
                this.sendTypingIndicator(false);
            });
        }
        
        // Mesaj gönderme
        document.getElementById('sendBtn')?.addEventListener('click', () => {
            this.sendMessage();
        });
        
        // Resim ekleme
        document.getElementById('attachImageBtn')?.addEventListener('click', () => {
            this.attachImage();
        });
    }
    
    sendMessage() {
        const input = document.getElementById('messageInput');
        if (!input) return;
        
        const text = input.value.trim();
        if (!text) return;
        
        // IRC komutu mu?
        if (text.startsWith('/')) {
            this.handleIRCCommand(text);
            input.value = '';
            return;
        }
        
        const app = window.eliteChat;
        if (!app?.currentUser) return;
        
        // Özel mesaj mı?
        if (app.activePM) {
            app.sendPrivateMessage(app.activePM, text);
        } else {
            // Kanal mesajı
            app.sendChannelMessage(text);
        }
        
        // Input'u temizle
        input.value = '';
        input.focus();
        
        // Typing'i durdur
        this.sendTypingIndicator(false);
        
        // Mesajı history'ye ekle
        this.addToHistory(text);
    }
    
    handleIRCCommand(command) {
        const ircSystem = window.ircCommandSystem;
        const app = window.eliteChat;
        
        if (ircSystem && app) {
            const parts = command.split(' ');
            const cmd = parts[0];
            const args = parts.slice(1);
            
            const success = ircSystem.execute(cmd, args, app);
            if (!success) {
                app.addSystemMessage?.(`❌ Bilinmeyen komut: ${cmd}`);
            }
        }
    }
    
    sendTypingIndicator(isTyping) {
        const app = window.eliteChat;
        const server = window.eliteChatServer;
        
        if (!app?.currentUser || !server) return;
        
        // Özel mesajdaysak
        if (app.activePM) {
            // Typing indicator gönder (gelecek versiyon)
            console.log('Typing to:', app.activePM, isTyping);
        }
    }
    
    attachImage() {
        // Dosya seçici oluştur
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            // Dosya boyutu kontrolü (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                alert('Dosya boyutu 5MB\'dan küçük olmalıdır!');
                return;
            }
            
            // Resmi yükle ve gönder
            this.uploadAndSendImage(file);
        });
        
        input.click();
    }
    
    uploadAndSendImage(file) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            
            // Mesaj oluştur
            const message = `📸 ${file.name} (${Math.round(file.size / 1024)}KB)`;
            
            const app = window.eliteChat;
            if (!app) return;
            
            // Mesajı gönder
            if (app.activePM) {
                app.sendPrivateMessage(app.activePM, message);
            } else {
                app.sendChannelMessage(message);
            }
            
            // Bildirim
            app.addSystemMessage?.('✅ Resim gönderildi!');
            
            // Gerçek uygulamada burada sunucuya upload yapılır
            console.log('Image uploaded:', {
                name: file.name,
                size: file.size,
                type: file.type,
                preview: dataUrl.substring(0, 100) + '...'
            });
        };
        
        reader.readAsDataURL(file);
    }
    
    addToHistory(text) {
        this.messageHistory.push({
            text: text,
            timestamp: new Date(),
            channel: window.eliteChat?.currentChannel,
            isPM: !!window.eliteChat?.activePM
        });
        
        // History'yi sınırla (son 100 mesaj)
        if (this.messageHistory.length > 100) {
            this.messageHistory = this.messageHistory.slice(-100);
        }
        
        // LocalStorage'a kaydet
        this.saveHistory();
    }
    
    loadMessageHistory() {
        try {
            const saved = localStorage.getItem('elitechat_messageHistory');
            if (saved) {
                this.messageHistory = JSON.parse(saved);
            }
        } catch (e) {
            console.error('Message history load error:', e);
            this.messageHistory = [];
        }
    }
    
    saveHistory() {
        try {
            localStorage.setItem('elitechat_messageHistory', 
                JSON.stringify(this.messageHistory));
        } catch (e) {
            console.error('Message history save error:', e);
        }
    }
    
    displayMessage(message, user) {
        const container = document.getElementById('chatMessages');
        if (!container) return;
        
        // Welcome mesajını temizle
        if (container.children.length === 1 && 
            container.children[0].classList.contains('welcome-message')) {
            container.innerHTML = '';
        }
        
        const messageElement = this.createMessageElement(message, user);
        container.appendChild(messageElement);
        
        // Scroll'u en alta al
        container.scrollTop = container.scrollHeight;
    }
    
    createMessageElement(message, user) {
        const isOutgoing = user.id === window.eliteChat?.currentUser?.id;
        const isSystem = message.type === 'system';
        const isPM = message.isPM;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isOutgoing ? 'outgoing' : 'incoming'} 
                               ${isSystem ? 'system' : ''} ${isPM ? 'pm' : ''}`;
        messageDiv.dataset.messageId = message.id;
        
        if (isSystem) {
            messageDiv.innerHTML = `
                <div class="system-message-content">
                    ${this.escapeHtml(message.text)}
                </div>
            `;
        } else {
            const displayName = user.id === 'mate' ? '🤖Mate' : user.name;
            const time = this.formatTime(new Date(message.time || Date.now()));
            
            messageDiv.innerHTML = `
                <div class="message-header">
                    <div class="message-sender">
                        <span class="sender-name">${this.escapeHtml(displayName)}</span>
                        ${this.getRoleBadge(user.role)}
                        ${user.registered ? '<i class="fas fa-check-circle verified-badge"></i>' : ''}
                    </div>
                    <div class="message-time">${time}</div>
                </div>
                <div class="message-content">
                    ${this.formatMessageText(message.text)}
                </div>
                ${message.media ? this.createMediaElement(message.media) : ''}
            `;
        }
        
        return messageDiv;
    }
    
    formatMessageText(text) {
        // URL'leri link'e çevir
        let formatted = this.escapeHtml(text);
        
        // URL pattern
        const urlPattern = /(https?:\/\/[^\s]+)/g;
        formatted = formatted.replace(urlPattern, 
            '<a href="$1" target="_blank" class="message-link">$1</a>');
        
        // Emoji desteği
        const emojiPattern = /:([a-z0-9_+-]+):/g;
        formatted = formatted.replace(emojiPattern, (match, emoji) => {
            const emojis = {
                'smile': '😊',
                'sad': '😢',
                'wink': '😉',
                'heart': '❤️',
                'like': '👍',
                'dislike': '👎',
                'fire': '🔥',
                '100': '💯',
                'clap': '👏',
                'check': '✅',
                'x': '❌'
            };
            return emojis[emoji] || match;
        });
        
        // Satır sonlarını <br> ile değiştir
        formatted = formatted.replace(/\n/g, '<br>');
        
        return formatted;
    }
    
    createMediaElement(media) {
        if (media.type === 'image') {
            return `
                <div class="message-media image">
                    <img src="${media.url}" alt="${media.alt || 'Image'}" 
                         onclick="window.open('${media.url}', '_blank')">
                    <div class="media-caption">${media.caption || ''}</div>
                </div>
            `;
        } else if (media.type === 'video') {
            return `
                <div class="message-media video">
                    <video src="${media.url}" controls 
                           poster="${media.thumbnail || ''}"></video>
                    <div class="media-caption">${media.caption || ''}</div>
                </div>
            `;
        }
        return '';
    }
    
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(text).replace(/[&<>"']/g, m => map[m]);
    }
    
    formatTime(date) {
        return date.toLocaleTimeString('tr-TR', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false
        });
    }
    
    getRoleBadge(role) {
        const badges = {
            'owner': '<span class="role-badge role-owner">O</span>',
            'admin': '<span class="role-badge role-admin">A</span>',
            'operator': '<span class="role-badge role-operator">OP</span>',
            'voice': '<span class="role-badge role-voice">V</span>'
        };
        return badges[role] || '';
    }
    
    clearChat() {
        const container = document.getElementById('chatMessages');
        if (!container) return;
        
        container.innerHTML = `
            <div class="welcome-message">
                <i class="fas fa-comments"></i>
                <h3>EliteChat'e Hoş Geldiniz</h3>
                <p>Mesaj yazmaya başlayın veya birine özel mesaj gönderin</p>
            </div>
        `;
    }
}

// Sohbet sistemini başlat
window.chatSystem = new ChatSystem();