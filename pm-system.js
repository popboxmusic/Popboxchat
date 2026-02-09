// ==================== ÖZEL MESAJ SİSTEMİ ====================
class PMSystem {
    constructor(client) {
        this.client = client;
        this.db = window.elitechatDB;
        this.activePM = null;
        this.pmWindows = {};
    }

    openPrivateChat(userId) {
        if (!this.db.users[userId] || userId === this.client.currentUser.id) return;
        
        this.activePM = userId;
        
        if (this.pmWindows[userId]) {
            this.pmWindows[userId].classList.remove('minimized');
            this.pmWindows[userId].style.zIndex = '100';
            return;
        }
        
        this.createPMWindow(userId);
        this.client.updateOnlineList();
        this.updatePMConversationList();
    }

    createPMWindow(userId) {
        const user = this.db.users[userId];
        if (!user) return;
        
        const pmWindow = document.createElement('div');
        pmWindow.className = 'pm-window';
        pmWindow.id = `pm-window-${userId}`;
        
        const displayName = user.id === 'mate' ? '🤖Mate' : user.name;
        
        pmWindow.innerHTML = `
            <div class="pm-window-header" data-user-id="${userId}">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div class="user-avatar ${user.online ? 'online' : ''}" style="width: 30px; height: 30px; font-size: 14px; background-image: ${user.avatarUrl ? `url('${user.avatarUrl}')` : 'none'};">
                        ${user.avatarUrl ? '' : user.avatar}
                    </div>
                    <div>
                        <div style="font-weight: 600; font-size: 14px;">
                            ${this.client.escapeHtml(displayName)}
                            ${this.getRoleBadge(user.role)}
                        </div>
                        <div style="font-size: 11px; color: var(--text-secondary);">
                            ${user.online ? '🟢 Çevrimiçi' : '⚫ Çevrimdışı'}
                        </div>
                    </div>
                </div>
                <div style="display: flex; gap: 5px;">
                    <button class="btn btn-sm btn-minimize-pm" style="background: none; border: none; color: var(--text-secondary); padding: 4px 8px;">
                        <i class="fas fa-minus"></i>
                    </button>
                    <button class="btn btn-sm btn-close-pm" style="background: none; border: none; color: var(--text-secondary); padding: 4px 8px;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div class="pm-window-messages" id="pm-messages-${userId}">
                <!-- Mesajlar buraya gelecek -->
            </div>
            <div class="pm-window-input">
                <div class="message-input-container">
                    <textarea class="message-input pm-input" id="pm-input-${userId}" 
                              placeholder="${this.client.escapeHtml(displayName)} ile mesajlaşın..." 
                              rows="2"></textarea>
                </div>
                <div class="input-actions" style="margin-top: 10px;">
                    <div class="flex gap-2">
                        <button class="btn btn-secondary btn-sm btn-pm-attach" data-user-id="${userId}">
                            <i class="fas fa-paperclip"></i>
                        </button>
                    </div>
                    <button class="btn btn-primary btn-send-pm" data-user-id="${userId}">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(pmWindow);
        this.pmWindows[userId] = pmWindow;
        
        this.setupPMWindowEvents(userId);
        this.loadPMMessages(userId);
    }

    setupPMWindowEvents(userId) {
        const pmWindow = this.pmWindows[userId];
        if (!pmWindow) return;
        
        const header = pmWindow.querySelector('.pm-window-header');
        const minimizeBtn = pmWindow.querySelector('.btn-minimize-pm');
        const closeBtn = pmWindow.querySelector('.btn-close-pm');
        const sendBtn = pmWindow.querySelector('.btn-send-pm');
        const attachBtn = pmWindow.querySelector('.btn-pm-attach');
        const input = pmWindow.querySelector(`#pm-input-${userId}`);
        
        header.addEventListener('click', (e) => {
            if (e.target === header || e.target.closest('.pm-window-header') === header) {
                pmWindow.classList.toggle('minimized');
            }
        });
        
        minimizeBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            pmWindow.classList.toggle('minimized');
        });
        
        closeBtn?.addEventListener('click', () => {
            this.closePMWindow(userId);
        });
        
        sendBtn?.addEventListener('click', () => {
            const text = input.value.trim();
            if (text) {
                this.client.sendPrivateMessage(userId, text);
                input.value = '';
                input.focus();
            }
        });
        
        input?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const text = input.value.trim();
                if (text) {
                    this.client.sendPrivateMessage(userId, text);
                    input.value = '';
                }
            }
        });
        
        attachBtn?.addEventListener('click', () => {
            this.client.openUploadModal('pm', userId);
        });
    }

    closePMWindow(userId) {
        const pmWindow = document.getElementById(`pm-window-${userId}`);
        if (pmWindow) {
            pmWindow.remove();
            delete this.pmWindows[userId];
            
            if (this.activePM === userId) {
                this.activePM = null;
                this.client.updateOnlineList();
            }
        }
    }

    loadPMMessages(userId) {
        const container = document.getElementById(`pm-messages-${userId}`);
        if (!container) return;
        
        this.clearContainer(`pm-messages-${userId}`);
        
        const messages = this.db.getPrivateMessages(this.client.currentUser.id, userId);
        
        if (messages.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; color: var(--text-secondary);">
                    <i class="fas fa-comment" style="font-size: 48px; margin-bottom: 15px; opacity: 0.5;"></i>
                    <h3 style="margin-bottom: 10px;">${this.client.escapeHtml(this.db.users[userId]?.name)} ile Sohbet</h3>
                    <p>Henüz mesaj yok. İlk mesajı siz gönderin!</p>
                </div>
            `;
            return;
        }
        
        messages.forEach(msg => {
            this.addMessageToPMWindow(userId, msg);
        });
        
        container.scrollTop = container.scrollHeight;
    }

    addMessageToPMWindow(userId, message) {
        const container = document.getElementById(`pm-messages-${userId}`);
        if (!container) return;
        
        // Eğer boş mesaj varsa temizle
        if (container.children.length === 1 && 
            container.children[0].querySelector('.fas.fa-comment')) {
            this.clearContainer(`pm-messages-${userId}`);
        }
        
        const isOutgoing = message.from === this.client.currentUser.id;
        const sender = this.db.users[message.from];
        if (!sender) return;
        
        const displayName = sender.id === 'mate' ? '🤖Mate' : sender.name;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isOutgoing ? 'message-outgoing' : 'message-incoming'}`;
        messageDiv.dataset.messageId = message.id;
        
        let messageContent = '';
        
        if (message.media) {
            // Medya mesajı
            messageContent = `
                <div class="message-sender">
                    <span style="font-weight: 500;">${this.client.escapeHtml(displayName)}</span>
                    ${this.getRoleBadge(sender.role)}
                </div>
                <div class="message-media">
                    ${message.media.type.startsWith('image') ? 
                        `<img src="${message.media.url}" alt="${message.media.name}">` : 
                        `<video controls><source src="${message.media.url}" type="${message.media.type}"></video>`}
                    <div class="media-info">${this.client.escapeHtml(message.media.name)}</div>
                </div>
                <div class="message-time">${this.client.formatTime(message.time)}</div>
            `;
        } else {
            // Normal mesaj
            messageContent = `
                <div class="message-sender">
                    <span style="font-weight: 500;">${this.client.escapeHtml(displayName)}</span>
                    ${this.getRoleBadge(sender.role)}
                </div>
                <div class="message-text">${this.client.escapeHtml(message.text)}</div>
                <div class="message-time">${this.client.formatTime(message.time)}</div>
            `;
        }
        
        messageDiv.innerHTML = messageContent;
        container.appendChild(messageDiv);
        container.scrollTop = container.scrollHeight;
    }

    updatePMConversationList() {
        const container = document.getElementById('pmConversationList');
        if (!container) return;
        
        this.clearContainer('pmConversationList');
        
        const conversations = new Map();
        const allPMs = this.db.privateMessages;
        
        Object.keys(allPMs).forEach(pmKey => {
            const [user1, user2] = pmKey.split('_');
            const otherUserId = user1 === this.client.currentUser.id ? user2 : 
                              user2 === this.client.currentUser.id ? user1 : null;
            
            if (otherUserId && this.db.users[otherUserId]) {
                const messages = allPMs[pmKey];
                const lastMessage = messages[messages.length - 1];
                const unreadCount = messages.filter(m => 
                    m.from !== this.client.currentUser.id && !m.read
                ).length;
                
                conversations.set(otherUserId, {
                    user: this.db.users[otherUserId],
                    lastMessage: lastMessage,
                    unreadCount: unreadCount,
                    messageCount: messages.length
                });
            }
        });
        
        const sortedConversations = Array.from(conversations.values())
            .sort((a, b) => {
                if (!a.lastMessage) return 1;
                if (!b.lastMessage) return -1;
                return new Date(b.lastMessage.time) - new Date(a.lastMessage.time);
            });
        
        if (sortedConversations.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 30px 20px; color: var(--text-secondary);">
                    <i class="fas fa-comments" style="font-size: 32px; margin-bottom: 10px; opacity: 0.5;"></i>
                    <div style="font-size: 13px;">Henüz özel sohbetiniz yok</div>
                </div>
            `;
            return;
        }
        
        sortedConversations.forEach(conv => {
            const item = document.createElement('div');
            item.className = `pm-item ${conv.unreadCount > 0 ? 'unread' : ''}`;
            
            const displayName = conv.user.id === 'mate' ? '🤖Mate' : conv.user.name;
            
            let lastMessageText = 'Mesaj yok';
            if (conv.lastMessage) {
                if (conv.lastMessage.media) {
                    lastMessageText = `📎 ${conv.lastMessage.media.name}`;
                } else {
                    lastMessageText = conv.lastMessage.text.length > 30 ? 
                        conv.lastMessage.text.substring(0, 30) + '...' : 
                        conv.lastMessage.text;
                }
            }
            
            const lastMessageTime = conv.lastMessage ? 
                this.client.formatTime(conv.lastMessage.time) : '';
            
            item.innerHTML = `
                <div class="pm-avatar" style="background-image: ${conv.user.avatarUrl ? `url('${conv.user.avatarUrl}')` : 'none'};">
                    ${conv.user.avatarUrl ? '' : conv.user.avatar}
                </div>
                <div class="pm-info">
                    <div class="pm-name">
                        ${this.client.escapeHtml(displayName)}
                        ${conv.unreadCount > 0 ? 
                          `<span style="background: var(--accent-blue); color: white; font-size: 10px; padding: 1px 5px; border-radius: 10px; margin-left: 5px;">${conv.unreadCount}</span>` : 
                          ''}
                    </div>
                    <div class="pm-preview">${this.client.escapeHtml(lastMessageText)}</div>
                </div>
                <div class="pm-time">${lastMessageTime}</div>
            `;
            
            item.addEventListener('click', () => {
                this.openPrivateChat(conv.user.id);
            });
            
            container.appendChild(item);
        });
    }

    sendPrivateMessage(toUserId, text, media = null) {
        if (!this.db.users[toUserId]) {
            this.client.addSystemMessage('❌ Kullanıcı bulunamadı!');
            return null;
        }
        
        const pmKey = [this.client.currentUser.id, toUserId].sort().join('_');
        
        const message = {
            id: `pm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'pm',
            from: this.client.currentUser.id,
            to: toUserId,
            text: text || '',
            media: media,
            time: new Date(),
            read: false
        };
        
        // Medya gönderiliyorsa log'a ekle
        if (media) {
            this.db.addMediaLog({
                type: 'pm',
                from: this.client.currentUser.id,
                to: toUserId,
                media: media,
                time: new Date(),
                channel: 'private'
            });
        }
        
        this.db.addPrivateMessage(pmKey, message);
        
        // Eğer PM penceresi açıksa mesajı göster
        if (this.pmWindows[toUserId]) {
            this.addMessageToPMWindow(toUserId, message);
        }
        
        this.updatePMConversationList();
        
        // Bildirim gönder (eğer kullanıcı çevrimiçiyse)
        const receiver = this.db.users[toUserId];
        if (receiver && receiver.online && !receiver.invisible) {
            this.client.showNotification(receiver.name, text || media?.name || 'Dosya', 'pm');
        }
        
        return message;
    }

    sendMedia(toUserId, file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const mediaData = {
                    type: file.type,
                    name: file.name,
                    size: file.size,
                    url: e.target.result,
                    data: e.target.result.split(',')[1] // Base64 data
                };
                
                const message = this.sendPrivateMessage(
                    toUserId, 
                    `📎 ${file.name} (${this.formatFileSize(file.size)})`,
                    mediaData
                );
                
                resolve(message);
            };
            
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    clearContainer(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }
    }

    getRoleBadge(role) {
        const badges = {
            'owner': '<span class="role-badge role-owner">O</span>',
            'admin': '<span class="role-badge role-admin">A</span>',
            'coadmin': '<span class="role-badge role-coadmin">C</span>',
            'operator': '<span class="role-badge role-operator">OP</span>',
            'voice': '<span class="role-badge role-voice">V</span>'
        };
        return badges[role] || '';
    }

    // Owner paneli için PM logları
    getPMLogsForOwner() {
        const logs = [];
        const allPMs = this.db.privateMessages;
        
        Object.keys(allPMs).forEach(pmKey => {
            const [user1, user2] = pmKey.split('_');
            const messages = allPMs[pmKey];
            
            messages.forEach(msg => {
                logs.push({
                    users: [user1, user2],
                    message: msg,
                    pmKey: pmKey
                });
            });
        });
        
        return logs.sort((a, b) => new Date(b.message.time) - new Date(a.message.time));
    }

    // Medya logları
    getMediaLogsForOwner() {
        return this.db.getMediaLogs();
    }
}

// Global instance
window.PMSystem = PMSystem;
