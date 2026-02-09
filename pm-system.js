// EliteChat PM Sistemi
class PMSystem {
    constructor() {
        this.activePM = null;
        this.windows = new Map();
        this.init();
    }
    
    init() {
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // PM başlatma butonu
        document.getElementById('startPMBtn')?.addEventListener('click', () => {
            this.openUserSelector();
        });
        
        // PM gönderme
        document.addEventListener('click', (e) => {
            if (e.target.closest('.pm-send-btn')) {
                const windowId = e.target.closest('.pm-send-btn').dataset.userId;
                const input = document.getElementById(`pm-input-${windowId}`);
                if (input && input.value.trim()) {
                    this.sendMessage(windowId, input.value.trim());
                    input.value = '';
                }
            }
        });
    }
    
    // Kullanıcı seçici aç
    openUserSelector() {
        const db = window.eliteChatDB;
        const currentUser = window.eliteChat?.currentUser;
        
        if (!currentUser) return;
        
        // Modal oluştur
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.8); display: flex; align-items: center;
            justify-content: center; z-index: 2000;
        `;
        
        // Online kullanıcıları listele (kendisi ve mate hariç)
        const onlineUsers = db.getOnlineUsers()
            .filter(user => user.id !== currentUser.id && user.id !== 'mate');
        
        let userListHTML = '';
        if (onlineUsers.length === 0) {
            userListHTML = '<p style="text-align: center; color: #888;">Çevrimiçi kullanıcı yok</p>';
        } else {
            onlineUsers.forEach(user => {
                userListHTML += `
                    <div class="user-select-item" data-user-id="${user.id}" 
                         style="padding: 10px; border-bottom: 1px solid #333; cursor: pointer; display: flex; align-items: center; gap: 10px;">
                        <div class="avatar" style="width: 30px; height: 30px; border-radius: 50%; background: ${user.color || '#3b82f6'}; 
                             display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">
                            ${user.avatar}
                        </div>
                        <div>
                            <div style="font-weight: bold;">${user.name}</div>
                            <div style="font-size: 12px; color: #888;">${user.bio || ''}</div>
                        </div>
                    </div>
                `;
            });
        }
        
        modal.innerHTML = `
            <div style="background: #1a1a1a; border-radius: 10px; padding: 20px; width: 90%; max-width: 400px; max-height: 80vh; overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="margin: 0;">Kullanıcı Seç</h3>
                    <button class="close-btn" style="background: none; border: none; color: #888; font-size: 24px; cursor: pointer;">×</button>
                </div>
                <div id="pm-user-list">${userListHTML}</div>
                <div style="margin-top: 20px;">
                    <input type="text" id="pm-search-input" placeholder="Kullanıcı ara..." 
                           style="width: 100%; padding: 10px; border-radius: 5px; border: 1px solid #333; background: #222; color: white;">
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Kapatma
        modal.querySelector('.close-btn').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        // Kullanıcı seçme
        modal.querySelectorAll('.user-select-item').forEach(item => {
            item.addEventListener('click', () => {
                const userId = item.dataset.userId;
                this.openPMWindow(userId);
                modal.remove();
            });
        });
        
        // Arama
        const searchInput = modal.querySelector('#pm-search-input');
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const items = modal.querySelectorAll('.user-select-item');
            
            items.forEach(item => {
                const userName = item.querySelector('div:nth-child(2) > div:first-child').textContent.toLowerCase();
                item.style.display = userName.includes(searchTerm) ? 'flex' : 'none';
            });
        });
        
        searchInput.focus();
    }
    
    // PM penceresi aç
    openPMWindow(userId) {
        const db = window.eliteChatDB;
        const user = db.getUser(userId);
        if (!user) return;
        
        // Pencere zaten açık mı?
        if (this.windows.has(userId)) {
            const window = this.windows.get(userId);
            window.style.display = 'flex';
            return;
        }
        
        // Yeni PM penceresi oluştur
        const pmWindow = document.createElement('div');
        pmWindow.className = 'pm-window';
        pmWindow.dataset.userId = userId;
        pmWindow.style.cssText = `
            position: fixed; bottom: 20px; right: ${Object.keys(this.windows).length * 20}px;
            width: 350px; height: 400px; background: #1a1a1a; border-radius: 10px 10px 0 0;
            border: 1px solid #333; border-bottom: none; box-shadow: 0 -5px 20px rgba(0,0,0,0.3);
            display: flex; flex-direction: column; z-index: 100;
        `;
        
        pmWindow.innerHTML = `
            <div class="pm-header" style="padding: 12px 15px; background: #222; border-bottom: 1px solid #333;
                   display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div class="avatar" style="width: 30px; height: 30px; border-radius: 50%; background: ${user.color || '#3b82f6'}; 
                         display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">
                        ${user.avatar}
                    </div>
                    <div>
                        <div style="font-weight: bold; font-size: 14px;">${user.name}</div>
                        <div style="font-size: 11px; color: #888;">${user.online ? '🟢 Çevrimiçi' : '⚫ Çevrimdışı'}</div>
                    </div>
                </div>
                <div style="display: flex; gap: 5px;">
                    <button class="pm-minimize-btn" style="background: none; border: none; color: #888; padding: 5px; cursor: pointer;">
                        <i class="fas fa-minus"></i>
                    </button>
                    <button class="pm-close-btn" style="background: none; border: none; color: #888; padding: 5px; cursor: pointer;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            
            <div class="pm-messages" id="pm-messages-${userId}" 
                 style="flex: 1; overflow-y: auto; padding: 15px; background: #0a0a0a;"></div>
            
            <div class="pm-input-area" style="padding: 10px 15px; border-top: 1px solid #333; background: #1a1a1a;">
                <div style="display: flex; gap: 8px;">
                    <input type="text" class="pm-input" id="pm-input-${userId}" 
                           placeholder="${user.name} ile mesajlaş..." 
                           style="flex: 1; padding: 8px 12px; border-radius: 5px; border: 1px solid #333; 
                                  background: #222; color: white; font-size: 14px;">
                    <button class="pm-send-btn btn-primary" data-user-id="${userId}" 
                            style="padding: 8px 15px; border-radius: 5px; border: none; background: #3b82f6; color: white; cursor: pointer;">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(pmWindow);
        this.windows.set(userId, pmWindow);
        this.activePM = userId;
        
        // Event listener'ları ekle
        this.setupPMWindowEvents(pmWindow, userId);
        
        // Mesajları yükle
        this.loadPMMessages(userId);
    }
    
    setupPMWindowEvents(window, userId) {
        // Minimize
        window.querySelector('.pm-minimize-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            const messages = window.querySelector('.pm-messages');
            const inputArea = window.querySelector('.pm-input-area');
            
            if (messages.style.display !== 'none') {
                messages.style.display = 'none';
                inputArea.style.display = 'none';
                window.style.height = 'auto';
            } else {
                messages.style.display = 'block';
                inputArea.style.display = 'block';
                window.style.height = '400px';
            }
        });
        
        // Kapat
        window.querySelector('.pm-close-btn').addEventListener('click', () => {
            this.closePMWindow(userId);
        });
        
        // Input'tan gönder
        const input = window.querySelector(`#pm-input-${userId}`);
        const sendBtn = window.querySelector('.pm-send-btn');
        
        sendBtn.addEventListener('click', () => {
            if (input.value.trim()) {
                this.sendMessage(userId, input.value.trim());
                input.value = '';
            }
        });
        
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && input.value.trim()) {
                this.sendMessage(userId, input.value.trim());
                input.value = '';
            }
        });
    }
    
    // PM gönder
    sendMessage(toUserId, text) {
        const db = window.eliteChatDB;
        const currentUser = window.eliteChat?.currentUser;
        
        if (!currentUser) return;
        
        // PM'i kaydet
        const pm = db.addPM(currentUser.id, toUserId, text);
        
        // Kendi pencerene ekle
        this.addMessageToPMWindow(toUserId, pm, true);
        
        // Alıcının penceresi açıksa oraya da ekle
        if (this.windows.has(toUserId)) {
            this.addMessageToPMWindow(toUserId, pm, false);
        }
        
        // Bildirim (eğer pencere kapalıysa)
        if (!this.windows.has(toUserId)) {
            this.showNotification(toUserId, text);
        }
    }
    
    // PM penceresine mesaj ekle
    addMessageToPMWindow(userId, message, isOutgoing = false) {
        const container = document.getElementById(`pm-messages-${userId}`);
        if (!container) return;
        
        const db = window.eliteChatDB;
        const sender = db.getUser(message.from);
        if (!sender) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `pm-message ${isOutgoing ? 'outgoing' : 'incoming'}`;
        messageDiv.style.cssText = `
            margin-bottom: 10px; max-width: 80%; 
            ${isOutgoing ? 'margin-left: auto;' : 'margin-right: auto;'}
        `;
        
        const time = new Date(message.time).toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        messageDiv.innerHTML = `
            <div style="font-size: 12px; color: #888; margin-bottom: 3px;">
                ${isOutgoing ? 'Siz' : sender.name} • ${time}
            </div>
            <div style="background: ${isOutgoing ? '#3b82f6' : '#333'}; color: white; 
                 padding: 8px 12px; border-radius: 10px; word-break: break-word; font-size: 14px;">
                ${this.escapeHtml(message.text)}
            </div>
        `;
        
        container.appendChild(messageDiv);
        container.scrollTop = container.scrollHeight;
    }
    
    // PM mesajlarını yükle
    loadPMMessages(userId) {
        const container = document.getElementById(`pm-messages-${userId}`);
        if (!container) return;
        
        const db = window.eliteChatDB;
        const currentUser = window.eliteChat?.currentUser;
        
        if (!currentUser) return;
        
        // PM'leri getir
        const key = [currentUser.id, userId].sort().join('_');
        const messages = db.pms.get(key) || [];
        
        if (messages.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; color: #888;">
                    <i class="fas fa-comment" style="font-size: 48px; margin-bottom: 15px; opacity: 0.5;"></i>
                    <p>${db.getUser(userId)?.name} ile sohbet</p>
                    <p style="font-size: 12px; margin-top: 5px;">İlk mesajı siz gönderin</p>
                </div>
            `;
            return;
        }
        
        // Mesajları göster
        messages.forEach(msg => {
            const isOutgoing = msg.from === currentUser.id;
            this.addMessageToPMWindow(userId, msg, isOutgoing);
        });
    }
    
    // PM penceresini kapat
    closePMWindow(userId) {
        const window = this.windows.get(userId);
        if (window) {
            window.remove();
            this.windows.delete(userId);
            
            if (this.activePM === userId) {
                this.activePM = null;
            }
        }
    }
    
    // Bildirim göster
    showNotification(userId, message) {
        const db = window.eliteChatDB;
        const user = db.getUser(userId);
        if (!user) return;
        
        // Browser bildirimi
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`${user.name} - EliteChat`, {
                body: message.length > 50 ? message.substring(0, 50) + '...' : message,
                icon: 'https://cdn-icons-png.flaticon.com/512/733/733585.png'
            });
        }
        
        // Sayfa başlığında bildirim
        const originalTitle = document.title;
        if (!document.title.includes('•')) {
            document.title = `• ${originalTitle}`;
            
            setTimeout(() => {
                document.title = originalTitle;
            }, 3000);
        }
    }
    
    // Yardımcı fonksiyon
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
}

// PM sistemini başlat
window.pmSystem = new PMSystem();
