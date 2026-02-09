// Özel Mesaj Sistemi
class PMSystem {
    constructor() {
        this.windows = new Map();
        this.conversations = new Map();
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadConversations();
    }
    
    setupEventListeners() {
        // Yeni PM butonu
        document.getElementById('newPmBtn')?.addEventListener('click', () => {
            window.modalSystem?.openModal('newPmModal');
        });
        
        // PM gönderme event'leri
        document.addEventListener('click', (e) => {
            if (e.target.closest('.btn-send-pm')) {
                const userId = e.target.closest('.btn-send-pm').dataset.userId;
                const input = document.getElementById(`pm-input-${userId}`);
                if (input && input.value.trim()) {
                    this.sendMessage(userId, input.value.trim());
                    input.value = '';
                }
            }
        });
    }
    
    loadConversations() {
        const db = window.eliteChatDatabase;
        const app = window.eliteChat;
        
        if (!db || !app?.currentUser) return;
        
        // PM'leri yükle
        db.privateMessages.forEach((messages, key) => {
            if (key.includes(app.currentUser.id)) {
                this.conversations.set(key, messages);
            }
        });
        
        this.updatePMList();
    }
    
    openPrivateChat(userId) {
        const db = window.eliteChatDatabase;
        const app = window.eliteChat;
        
        if (!db || !app?.currentUser || userId === app.currentUser.id) return;
        
        const user = db.getUser(userId);
        if (!user) return;
        
        // Pencere zaten açık mı?
        if (this.windows.has(userId)) {
            const window = this.windows.get(userId);
            window.classList.remove('minimized');
            return;
        }
        
        // Yeni PM penceresi oluştur
        this.createPMWindow(user);
    }
    
    createPMWindow(user) {
        const pmWindow = document.createElement('div');
        pmWindow.className = 'pm-window';
        pmWindow.id = `pm-window-${user.id}`;
        
        const displayName = user.id === 'mate' ? '🤖Mate' : user.name;
        
        pmWindow.innerHTML = `
            <div class="pm-window-header" data-user-id="${user.id}">
                <div class="pm-header-info">
                    <div class="user-avatar ${user.online ? 'online' : ''}">${user.avatar}</div>
                    <div>
                        <div class="pm-user-name">
                            ${displayName}
                            ${this.getRoleBadge(user.role)}
                        </div>
                        <div class="pm-user-status">
                            ${user.online ? '🟢 Çevrimiçi' : '⚫ Çevrimdışı'}
                        </div>
                    </div>
                </div>
                <div class="pm-window-controls">
                    <button class="btn btn-sm btn-minimize-pm">
                        <i class="fas fa-minus"></i>
                    </button>
                    <button class="btn btn-sm btn-close-pm">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div class="pm-window-messages" id="pm-messages-${user.id}"></div>
            <div class="pm-window-input">
                <div class="message-input-container">
                    <textarea class="message-input pm-input" 
                              id="pm-input-${user.id}" 
                              placeholder="${displayName} ile mesajlaşın..." 
                              rows="2"></textarea>
                </div>
                <div class="input-actions">
                    <div class="media-buttons">
                        <button class="btn btn-secondary btn-sm" data-user-id="${user.id}">
                            <i class="fas fa-image"></i>
                        </button>
                        <button class="btn btn-secondary btn-sm" data-user-id="${user.id}">
                            <i class="fas fa-camera"></i>
                        </button>
                    </div>
                    <button class="btn btn-primary btn-send-pm" data-user-id="${user.id}">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </div>
            </div>
        `;
        
        document.getElementById('pm-windows-container')?.appendChild(pmWindow);
        this.windows.set(user.id, pmWindow);
        
        this.setupPMWindowEvents(user.id);
        this.loadPMMessages(user.id);
        
        // Aktif PM'yi güncelle
        const app = window.eliteChat;
        if (app) {
            app.activePM = user.id;
            app.updateOnlineList();
        }
    }
    
    setupPMWindowEvents(userId) {
        const window = this.windows.get(userId);
        if (!window) return;
        
        // Minimize butonu
        window.querySelector('.btn-minimize-pm')?.addEventListener('click', (e) => {
            e.stopPropagation();
            window.classList.toggle('minimized');
        });
        
        // Kapat butonu
        window.querySelector('.btn-close-pm')?.addEventListener('click', () => {
            this.closePMWindow(userId);
        });
        
        // Header'a tıklama
        window.querySelector('.pm-window-header')?.addEventListener('click', (e) => {
            if (e.target.closest('.pm-window-header')) {
                window.classList.toggle('minimized');
            }
        });
        
        // Mesaj gönderme
        const input = document.getElementById(`pm-input-${userId}`);
        const sendBtn = window.querySelector('.btn-send-pm');
        
        if (input && sendBtn) {
            sendBtn.addEventListener('click', () => {
                if (input.value.trim()) {
                    this.sendMessage(userId, input.value.trim());
                    input.value = '';
                }
            });
            
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (input.value.trim()) {
                        this.sendMessage(userId, input.value.trim());
                        input.value = '';
                    }
                }
            });
        }
    }
    
    sendMessage(toUserId, text) {
        const app = window.eliteChat;
        const server = window.eliteChatServer;
        
        if (!app?.currentUser || !server) return;
        
        const message = server.sendPrivateMessage(app.currentUser.id, toUserId, text);
        
        if (message) {
            // Kendi penceremize ekle
            this.addMessageToPMWindow(toUserId, message, true);
            
            // Mesaj listesini güncelle
            this.updatePMList();
        }
    }
    
    addMessageToPMWindow(userId, message, isOutgoing = false) {
        const container = document.getElementById(`pm-messages-${userId}`);
        if (!container) return;
        
        const db = window.eliteChatDatabase;
        const sender = db.getUser(message.from);
        if (!sender) return;
        
        const displayName = sender.id === 'mate' ? '🤖Mate' : sender.name;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `pm-message ${isOutgoing ? 'outgoing' : 'incoming'}`;
        
        messageDiv.innerHTML = `
            <div class="pm-message-sender">
                ${displayName}
                ${this.getRoleBadge(sender.role)}
            </div>
            <div class="pm-message-text">${this.escapeHtml(message.text)}</div>
            <div class="pm-message-time">${this.formatTime(new Date(message.time))}</div>
        `;
        
        container.appendChild(messageDiv);
        container.scrollTop = container.scrollHeight;
    }
    
    loadPMMessages(userId) {
        const container = document.getElementById(`pm-messages-${userId}`);
        if (!container) return;
        
        const app = window.eliteChat;
        const db = window.eliteChatDatabase;
        
        if (!app?.currentUser || !db) return;
        
        const messages = db.getPrivateMessages(app.currentUser.id, userId);
        
        if (messages.length === 0) {
            container.innerHTML = `
                <div class="empty-pm">
                    <i class="fas fa-comment"></i>
                    <h4>${db.getUser(userId)?.name} ile Sohbet</h4>
                    <p>Henüz mesaj yok. İlk mesajı siz gönderin!</p>
                </div>
            `;
            return;
        }
        
        messages.forEach(msg => {
            const isOutgoing = msg.from === app.currentUser.id;
            this.addMessageToPMWindow(userId, msg, isOutgoing);
        });
    }
    
    closePMWindow(userId) {
        const window = this.windows.get(userId);
        if (window) {
            window.remove();
            this.windows.delete(userId);
            
            // Aktif PM'yi temizle
            const app = window.eliteChat;
            if (app && app.activePM === userId) {
                app.activePM = null;
                app.updateOnlineList();
            }
        }
    }
    
    updatePMList() {
        const container = document.getElementById('pmConversationList');
        if (!container) return;
        
        const app = window.eliteChat;
        const db = window.eliteChatDatabase;
        
        if (!app?.currentUser || !db) return;
        
        container.innerHTML = '';
        
        const conversations = [];
        
        // Tüm PM'leri topla
        db.privateMessages.forEach((messages, key) => {
            if (key.includes(app.currentUser.id)) {
                const [user1, user2] = key.split('_');
                const otherUserId = user1 === app.currentUser.id ? user2 : user1;
                
                if (otherUserId !== app.currentUser.id) {
                    const lastMessage = messages[messages.length - 1];
                    const unreadCount = messages.filter(m => 
                        m.from !== app.currentUser.id && !m.read
                    ).length;
                    
                    conversations.push({
                        userId: otherUserId,
                        user: db.getUser(otherUserId),
                        lastMessage,
                        unreadCount
                    });
                }
            }
        });
        
        // Sırala (son mesaja göre)
        conversations.sort((a, b) => {
            if (!a.lastMessage) return 1;
            if (!b.lastMessage) return -1;
            return new Date(b.lastMessage.time) - new Date(a.lastMessage.time);
        });
        
        if (conversations.length === 0) {
            container.innerHTML = `
                <div class="empty-conversations">
                    <i class="fas fa-comments"></i>
                    <p>Henüz özel sohbetiniz yok</p>
                </div>
            `;
            return;
        }
        
        conversations.forEach(conv => {
            if (!conv.user) return;
            
            const item = document.createElement('div');
            item.className = `pm-list-item ${conv.unreadCount > 0 ? 'unread' : ''}`;
            
            const lastMsg = conv.lastMessage?.text || 'Mesaj yok';
            const shortMsg = lastMsg.length > 30 ? lastMsg.substring(0, 30) + '...' : lastMsg;
            
            item.innerHTML = `
                <div class="pm-list-avatar">${conv.user.avatar}</div>
                <div class="pm-list-info">
                    <div class="pm-list-name">
                        ${conv.user.name}
                        ${conv.unreadCount > 0 ? 
                          `<span class="pm-unread-count">${conv.unreadCount}</span>` : ''}
                    </div>
                    <div class="pm-list-preview">${this.escapeHtml(shortMsg)}</div>
                </div>
                <div class="pm-list-time">
                    ${conv.lastMessage ? this.formatTime(new Date(conv.lastMessage.time)) : ''}
                </div>
            `;
            
            item.addEventListener('click', () => {
                this.openPrivateChat(conv.userId);
            });
            
            container.appendChild(item);
        });
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
    
    getRoleBadge(role) {
        const badges = {
            'owner': '<span class="role-badge role-owner">O</span>',
            'admin': '<span class="role-badge role-admin">A</span>',
            'operator': '<span class="role-badge role-operator">OP</span>',
            'voice': '<span class="role-badge role-voice">V</span>'
        };
        return badges[role] || '';
    }
}

// PM sistemini başlat
window.pmSystem = new PMSystem();