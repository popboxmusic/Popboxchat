// EliteChat Ana Sistem
class EliteChat {
    constructor() {
        this.currentUser = null;
        this.currentChannel = 'general';
        this.activePM = null;
        this.theme = 'night';
        this.pmWindows = {};
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.setupServerEvents();
        this.applyTheme();
    }
    
    setupEventListeners() {
        // Giriş butonu
        document.getElementById('loginButton').addEventListener('click', () => this.handleLogin());
        
        // Enter ile giriş
        document.getElementById('nickInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleLogin();
        });
        
        // Mesaj gönderme
        document.getElementById('sendBtn').addEventListener('click', () => this.sendMessage());
        document.getElementById('messageInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Tema değiştirme
        document.getElementById('themeBtn').addEventListener('click', () => this.toggleTheme());
        
        // Modal kapatma
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                e.target.style.display = 'none';
            }
        });
    }
    
    setupServerEvents() {
        const server = window.eliteChatServer;
        
        // Yeni mesaj geldiğinde
        server.on('new_message', (data) => {
            if (data.channel === this.currentChannel) {
                this.displayMessage(data.message);
            }
        });
        
        // Özel mesaj geldiğinde
        server.on('private_message', (data) => {
            if (data.message.to === this.currentUser?.id) {
                this.handlePrivateMessage(data.message);
            }
        });
        
        // Kullanıcı katıldığında
        server.on('user_joined', (data) => {
            this.updateOnlineList();
            if (this.currentChannel === 'general') {
                this.addSystemMessage(`🎉 ${data.user.name} sohbete katıldı!`);
            }
        });
        
        // Yeni kanal oluşturulduğunda
        server.on('channel_created', (data) => {
            this.addChannelTab(data.channel);
            this.addSystemMessage(`📢 Yeni kanal oluşturuldu: ${data.channel.name}`);
        });
    }
    
    async handleLogin() {
        const nickInput = document.getElementById('nickInput');
        const passInput = document.getElementById('passInput');
        
        const nick = nickInput.value.trim();
        const password = passInput.value;
        
        if (!nick || nick.length < 2) {
            alert('Kullanıcı adı en az 2 karakter olmalıdır');
            return;
        }
        
        const userId = nick.toLowerCase().replace(/[^a-z0-9._]/g, '');
        
        if (userId === 'mate') {
            alert('Bu kullanıcı adı sistem tarafından kullanılıyor!');
            return;
        }
        
        // Şifreli giriş kontrolü
        const db = window.eliteChatDatabase;
        let userData;
        
        if (password) {
            // Kayıtlı kullanıcı girişi
            userData = db.authenticateUser(userId, password);
            if (!userData) {
                alert('Kullanıcı adı veya şifre hatalı!');
                return;
            }
            userData.online = true;
        } else {
            // Misafir girişi
            userData = {
                id: userId,
                name: nick,
                role: 'user',
                registered: false,
                online: true,
                invisible: false,
                avatar: nick.charAt(0).toUpperCase(),
                bio: '',
                joinDate: new Date().toISOString(),
                lastSeen: new Date().toISOString()
            };
        }
        
        // Sunucuya bağlan
        const server = window.eliteChatServer;
        const client = server.connectClient(userId, userData);
        
        if (!client) {
            alert('Sunucuya bağlanılamadı!');
            return;
        }
        
        this.currentUser = userData;
        
        // Giriş ekranını kapat
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');
        
        // Kanalı yükle
        this.switchChannel('general');
        
        // Sistem mesajı
        this.addSystemMessage(`🎉 Hoş geldin ${this.currentUser.name}!`);
        
        // Input'ları temizle
        nickInput.value = '';
        passInput.value = '';
    }
    
    sendMessage() {
        const input = document.getElementById('messageInput');
        const text = input.value.trim();
        
        if (!text) return;
        
        if (text.startsWith('/')) {
            // IRC komutu
            this.handleIRCCommand(text);
        } else if (this.activePM) {
            // Özel mesaj
            this.sendPrivateMessage(this.activePM, text);
        } else {
            // Kanal mesajı
            this.sendChannelMessage(text);
        }
        
        input.value = '';
        input.focus();
    }
    
    sendChannelMessage(text) {
        if (!this.currentUser) return;
        
        const server = window.eliteChatServer;
        const message = server.sendMessage(this.currentUser.id, this.currentChannel, text);
        
        if (message) {
            this.displayMessage(message);
        }
    }
    
    sendPrivateMessage(toUserId, text) {
        if (!this.currentUser) return;
        
        const server = window.eliteChatServer;
        const message = server.sendPrivateMessage(this.currentUser.id, toUserId, text);
        
        if (message && this.pmWindows[toUserId]) {
            this.addMessageToPMWindow(toUserId, message);
        }
    }
    
    displayMessage(message) {
        const container = document.getElementById('chatMessages');
        if (!container) return;
        
        const db = window.eliteChatDatabase;
        const user = db.getUser(message.userId);
        if (!user) return;
        
        const isOutgoing = message.userId === this.currentUser?.id;
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isOutgoing ? 'message-outgoing' : 'message-incoming'}`;
        
        const displayName = user.id === 'mate' ? '🤖Mate' : user.name;
        
        messageDiv.innerHTML = `
            <div class="message-sender">
                <span style="font-weight: 500;">${this.escapeHtml(displayName)}</span>
            </div>
            <div class="message-text">${this.escapeHtml(message.text)}</div>
            <div class="message-time">${this.formatTime(new Date(message.time))}</div>
        `;
        
        container.appendChild(messageDiv);
        container.scrollTop = container.scrollHeight;
    }
    
    addSystemMessage(text) {
        const container = document.getElementById('chatMessages');
        if (!container) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'system-message';
        messageDiv.textContent = text;
        
        container.appendChild(messageDiv);
        container.scrollTop = container.scrollHeight;
    }
    
    switchChannel(channelId) {
        this.currentChannel = channelId;
        this.activePM = null;
        
        // Aktif sekme
        document.querySelectorAll('.channel-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.channel === channelId) {
                tab.classList.add('active');
            }
        });
        
        // Kanal bilgilerini güncelle
        const db = window.eliteChatDatabase;
        const channel = db.getChannel(channelId);
        if (channel) {
            document.getElementById('currentChannel').textContent = channel.name.replace('#', '');
            document.getElementById('channelTopic').textContent = channel.topic;
            document.getElementById('panelChannelName').textContent = channel.name;
            document.getElementById('panelChannelTopic').textContent = channel.topic;
            
            // Mesajları yükle
            this.loadChannelMessages(channelId);
            this.updateOnlineList();
        }
    }
    
    updateOnlineList() {
        const db = window.eliteChatDatabase;
        const channel = db.getChannel(this.currentChannel);
        if (!channel) return;
        
        const container = document.getElementById('userList');
        if (!container) return;
        
        container.innerHTML = '';
        
        const users = Array.from(channel.users)
            .map(id => db.getUser(id))
            .filter(user => user && !user.invisible);
        
        users.forEach(user => {
            const userDiv = document.createElement('div');
            userDiv.className = 'user-item';
            userDiv.innerHTML = `
                <div class="user-avatar">${user.avatar}</div>
                <div class="user-name">${user.name}</div>
                <div class="user-status">${user.online ? '🟢' : '⚫'}</div>
            `;
            
            userDiv.addEventListener('click', () => {
                if (user.id !== this.currentUser?.id) {
                    this.openPrivateChat(user.id);
                }
            });
            
            container.appendChild(userDiv);
        });
    }
    
    toggleTheme() {
        this.theme = this.theme === 'night' ? 'day' : 'night';
        this.applyTheme();
    }
    
    applyTheme() {
        if (this.theme === 'night') {
            document.body.classList.add('night-mode');
            document.body.classList.remove('day-mode');
        } else {
            document.body.classList.add('day-mode');
            document.body.classList.remove('night-mode');
        }
    }
    
    // Utility fonksiyonları
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
    
    // IRC komut işleme (kısaltılmış)
    handleIRCCommand(command) {
        console.log('IRC Command:', command);
        // Detaylı IRC komutları irc-commands.js'de
    }
    
    // Özel mesaj işlemleri (kısaltılmış)
    openPrivateChat(userId) {
        console.log('Open PM with:', userId);
        // Detaylı PM sistemi pm-system.js'de
    }
}

// Uygulamayı başlat
document.addEventListener('DOMContentLoaded', () => {
    window.eliteChat = new EliteChat();
});
