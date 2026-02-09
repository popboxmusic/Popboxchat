// ==================== ANA UYGULAMA MANTIĞI ====================
class EliteChatClient {
    constructor() {
        this.db = window.elitechatDB;
        this.currentUser = null;
        this.currentChannel = 'general';
        this.system = {
            theme: 'night',
            intervals: [],
            uploadType: null,
            uploadTarget: null
        };
        
        this.ircCommands = null;
        this.pmSystem = null;
        this.mateBot = null;
        
        this.initialize();
    }

    initialize() {
        this.setupEventListeners();
        this.loadCustomCommands();
        
        // Sistemleri başlat
        this.mateBot = new MateBot();
        this.ircCommands = new IRCCommands(this);
        this.pmSystem = new PMSystem(this);
        
        // Real-time dinleyicileri başlat
        this.startRealtimeUpdates();
        this.startMessageListener();
        
        console.log('✅ EliteChat sistemi başlatıldı!');
    }

    setupEventListeners() {
        // Giriş butonu
        document.getElementById('loginButton')?.addEventListener('click', () => this.handleLogin());
        
        // Giriş inputları
        document.getElementById('nickInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleLogin();
        });
        document.getElementById('passInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleLogin();
        });
        
        // Mesaj gönderme
        document.getElementById('sendBtn')?.addEventListener('click', () => this.sendMessage());
        document.getElementById('messageInput')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Panel sekmeleri
        document.querySelectorAll('.panel-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchPanel(tab.dataset.panel);
            });
        });
        
        // Temel butonlar
        this.setupBasicButtons();
        
        // Sayfa kapatma
        window.addEventListener('beforeunload', () => this.disconnect());
        
        // Dosya yükleme
        this.setupFileUpload();
    }

    setupBasicButtons() {
        const buttons = {
            'createChannelBtn': () => this.openModal('channelModal'),
            'ownerPanelBtn': () => this.openOwnerPanel(),
            'settingsBtn': () => this.openSettings(),
            'themeBtn': () => this.toggleTheme(),
            'videoManagerBtn': () => this.changeChannelVideo(),
            'changeVideoBtn': () => this.changeChannelVideo(),
            'fullscreenBtn': () => this.toggleFullscreen(),
            'channelInfoBtn': () => this.showChannelInfo(),
            'newPmBtn': () => this.openModal('newPmModal'),
            'attachImageBtn': () => this.openUploadModal('channel'),
            'attachFileBtn': () => this.openUploadModal('channel'),
            
            // Modal kapatma butonları
            'closeOwnerPanel': () => this.closeModal('ownerPanelModal'),
            'closeUploadModal': () => this.closeModal('uploadModal'),
            'cancelUpload': () => this.closeModal('uploadModal'),
            'sendUpload': () => this.handleFileUpload(),
            
            // Owner panel butonları
            'addCustomCommand': () => this.addCustomCommand(),
            'broadcastBtn': () => this.broadcastToAll(),
            'resetChannelBtn': () => this.resetChannel(),
            'resetChatBtn': () => this.resetAllChats(),
            'backupBtn': () => this.createBackup(),
            'restoreBtn': () => this.restoreBackup()
        };
        
        Object.keys(buttons).forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('click', buttons[id]);
            }
        });
    }

    setupFileUpload() {
        const dropZone = document.getElementById('uploadDropZone');
        const fileInput = document.getElementById('fileInput');
        
        if (dropZone && fileInput) {
            dropZone.addEventListener('click', () => fileInput.click());
            
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.style.borderColor = 'var(--accent-blue)';
                dropZone.style.background = 'rgba(59, 130, 246, 0.1)';
            });
            
            dropZone.addEventListener('dragleave', () => {
                dropZone.style.borderColor = 'var(--border-light)';
                dropZone.style.background = '';
            });
            
            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.style.borderColor = 'var(--border-light)';
                dropZone.style.background = '';
                
                if (e.dataTransfer.files.length > 0) {
                    fileInput.files = e.dataTransfer.files;
                    this.previewFile(e.dataTransfer.files[0]);
                }
            });
            
            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.previewFile(e.target.files[0]);
                }
            });
        }
    }

    // ==================== GİRİŞ SİSTEMİ ====================
    handleLogin() {
        const nickInput = document.getElementById('nickInput');
        const passInput = document.getElementById('passInput');
        const nick = nickInput.value.trim();
        const pass = passInput.value;
        
        if (!nick || nick.length < 2) {
            alert('Kullanıcı adı en az 2 karakter olmalıdır');
            nickInput.focus();
            return;
        }
        
        // Nick temizleme
        const cleanNick = nick.replace(/[^a-zA-Z0-9._]/g, '');
        const userId = cleanNick.toLowerCase();
        
        if (userId === 'mate') {
            alert('Bu kullanıcı adı sistem tarafından kullanılıyor!');
            nickInput.value = '';
            nickInput.focus();
            return;
        }
        
        // Owner kontrolü
        if (cleanNick.toLowerCase() === 'mateky' && pass === 'kumsal07@') {
            this.loginAsOwner('mateky', cleanNick);
            return;
        }
        
        // Kayıtlı kullanıcı kontrolü
        if (pass) {
            const authResult = this.db.authenticateUser(cleanNick, pass);
            
            if (authResult.error) {
                alert(authResult.error);
                return;
            }
            
            // Başarılı giriş
            const originalNick = authResult.originalNick || cleanNick;
            this.loginRegisteredUser(originalNick, authResult.user);
        } else {
            // Misafir girişi - büyük/küçük harf kontrolü
            if (this.db.isNickRegistered(cleanNick)) {
                const existingNick = this.db.findRegisteredNick(cleanNick);
                alert(`Bu nick kayıtlıdır! Lütfen şifrenizi girin veya başka bir nick seçin.\nKayıtlı nick: ${existingNick}`);
                nickInput.value = '';
                passInput.focus();
                return;
            }
            
            this.loginGuestUser(cleanNick);
        }
    }

    loginRegisteredUser(nick, userData) {
        const user = {
            id: nick.toLowerCase(),
            name: nick, // Orijinal nick
            role: userData.role,
            registered: true,
            online: true,
            invisible: false,
            avatar: userData.avatar || nick.charAt(0).toUpperCase(),
            bio: userData.bio || '',
            joinDate: userData.joinDate || new Date().toISOString(),
            lastSeen: new Date().toISOString()
        };
        
        this.completeLogin(user);
    }

    loginGuestUser(nick) {
        const user = {
            id: nick.toLowerCase(),
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
        
        this.completeLogin(user);
    }

    loginAsOwner(userId, cleanNick) {
        const user = {
            id: userId,
            name: cleanNick,
            role: 'owner',
            registered: true,
            online: true,
            invisible: false,
            avatar: cleanNick.charAt(0).toUpperCase(),
            bio: 'Sistem Sahibi',
            joinDate: new Date().toISOString(),
            lastSeen: new Date().toISOString()
        };
        
        this.completeLogin(user);
    }

    completeLogin(user) {
        this.currentUser = user;
        
        // Kullanıcıyı veritabanına ekle
        this.db.addUser(user);
        
        // Genel kanala ekle
        const generalChannel = this.db.channels.general;
        if (generalChannel && !generalChannel.users.has(user.id)) {
            generalChannel.users.add(user.id);
            this.db.saveData();
        }
        
        // UI'ı göster
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');
        
        // Owner panel butonunu göster/gizle
        if (user.role === 'owner') {
            document.getElementById('ownerPanelBtn').classList.remove('hidden');
        }
        
        this.addSystemMessage(`🎉 ${this.currentUser.name} sohbete katıldı!`);
        
        this.updateOnlineList();
        this.updatePanelInfo();
        this.loadChannelMessages('general');
        
        this.startAutoUpdates();
        
        // Giriş alanlarını temizle
        document.getElementById('nickInput').value = '';
        document.getElementById('passInput').value = '';
        
        // Diğer kullanıcılara bildir
        this.broadcastUserUpdate('login');
    }

    // ==================== SOHBET SİSTEMİ ====================
    sendMessage() {
        const input = document.getElementById('messageInput');
        const text = input.value.trim();
        
        if (!text) return;
        
        if (text.startsWith('/')) {
            if (this.ircCommands) {
                this.ircCommands.execute(text);
            } else {
                this.addSystemMessage('❌ Komut sistemi hazır değil');
            }
            input.value = '';
            return;
        }
        
        if (this.pmSystem?.activePM) {
            this.pmSystem.sendPrivateMessage(this.pmSystem.activePM, text);
        } else {
            this.sendChannelMessage(text);
        }
        
        input.value = '';
        input.focus();
    }

    sendChannelMessage(text, media = null) {
        if (!this.currentUser || !this.currentChannel) return;
        
        const channel = this.db.channels[this.currentChannel];
        if (!channel) {
            this.addSystemMessage('❌ Kanal bulunamadı!');
            return;
        }
        
        // Kilit kontrolü
        if (channel.locked && 
            this.currentUser.role !== 'owner' && 
            this.currentUser.role !== 'admin' && 
            this.currentUser.role !== 'coadmin' &&
            !channel.operators.has(this.currentUser.id) &&
            channel.owner !== this.currentUser.id) {
            this.addSystemMessage('🔒 Kanal kilitli! Mesaj gönderemezsiniz.');
            return;
        }
        
        // Ban kontrolü
        if (channel.bans?.has(this.currentUser.id)) {
            const banInfo = channel.bans.get(this.currentUser.id);
            if (new Date(banInfo.endTime) > new Date()) {
                this.addSystemMessage(`🚫 Bu kanaldan banlısınız! Sebep: ${banInfo.reason}`);
                return;
            } else {
                channel.bans.delete(this.currentUser.id);
            }
        }
        
        // Global mute kontrolü
        if (this.db.globalMutes.has(this.currentUser.id)) {
            this.addSystemMessage('🔇 Global susturulmuşsunuz! Mesaj gönderemezsiniz.');
            return;
        }
        
        // Kanal mute kontrolü
        if (channel.mutes?.has(this.currentUser.id)) {
            const muteInfo = channel.mutes.get(this.currentUser.id);
            if (new Date(muteInfo.endTime) > new Date()) {
                this.addSystemMessage(`🔇 Bu kanalda susturulmuşsunuz! Sebep: ${muteInfo.reason}`);
                return;
            } else {
                channel.mutes.delete(this.currentUser.id);
            }
        }
        
        // Slowmode kontrolü
        if (channel.slowmode > 0) {
            const now = Date.now();
            const userMessages = channel.messages?.filter(m => 
                m.userId === this.currentUser.id
            ) || [];
            
            if (userMessages.length > 0) {
                const lastMessage = userMessages[userMessages.length - 1];
                const timeDiff = (now - new Date(lastMessage.time).getTime()) / 1000;
                
                if (timeDiff < channel.slowmode) {
                    const waitTime = Math.ceil(channel.slowmode - timeDiff);
                    this.addSystemMessage(`⏱️ Yavaş mod aktif! ${waitTime} saniye bekleyin.`);
                    return;
                }
            }
        }
        
        // Mesaj oluştur
        const message = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'message',
            userId: this.currentUser.id,
            text: text,
            media: media,
            time: new Date(),
            channel: this.currentChannel
        };
        
        // Medya log'u
        if (media) {
            this.db.addMediaLog({
                type: 'channel',
                from: this.currentUser.id,
                channel: this.currentChannel,
                media: media,
                time: new Date()
            });
        }
        
        // Veritabanına ekle
        this.db.addMessage(this.currentChannel, message);
        
        // UI'a ekle
        this.addMessageToChat(message, this.currentUser);
        
        // Diğer tab'lara bildirim gönder
        this.broadcastNewMessage(message);
    }

    addMessageToChat(message, user) {
        const container = document.getElementById('chatMessages');
        if (!container) return;
        
        // Eğer boş mesaj varsa temizle
        if (container.children.length === 1 && 
            container.children[0].querySelector('.fas.fa-comments')) {
            this.clearContainer('chatMessages');
        }
        
        const isOutgoing = user.id === this.currentUser.id;
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isOutgoing ? 'message-outgoing' : 'message-incoming'}`;
        messageDiv.dataset.messageId = message.id;
        
        const displayName = user.id === 'mate' ? '🤖Mate' : user.name;
        
        let messageContent = '';
        
        if (message.media) {
            // Medya mesajı
            messageContent = `
                <div class="message-sender">
                    <span style="font-weight: 500;">${this.escapeHtml(displayName)}</span>
                    ${this.getRoleBadge(user.role)}
                    ${user.registered ? '<i class="fas fa-check-circle" style="color: var(--accent-blue); font-size: 10px;"></i>' : ''}
                    ${isOutgoing ? '<button class="message-delete-btn" data-message-id="' + message.id + '"><i class="fas fa-trash"></i></button>' : ''}
                </div>
                <div class="message-media">
                    ${message.media.type.startsWith('image') ? 
                        `<img src="${message.media.url}" alt="${message.media.name}" style="max-width: 300px; max-height: 300px;">` : 
                        `<video controls style="max-width: 300px; max-height: 300px;">
                            <source src="${message.media.url}" type="${message.media.type}">
                        </video>`}
                    <div class="media-info">${this.escapeHtml(message.media.name)}</div>
                </div>
                <div class="message-time">${this.formatTime(message.time)}</div>
            `;
        } else {
            // Normal mesaj
            messageContent = `
                <div class="message-sender">
                    <span style="font-weight: 500;">${this.escapeHtml(displayName)}</span>
                    ${this.getRoleBadge(user.role)}
                    ${user.registered ? '<i class="fas fa-check-circle" style="color: var(--accent-blue); font-size: 10px;"></i>' : ''}
                    ${isOutgoing ? '<button class="message-delete-btn" data-message-id="' + message.id + '"><i class="fas fa-trash"></i></button>' : ''}
                </div>
                <div class="message-text">${this.escapeHtml(message.text)}</div>
                <div class="message-time">${this.formatTime(message.time)}</div>
            `;
        }
        
        messageDiv.innerHTML = messageContent;
        container.appendChild(messageDiv);
        container.scrollTop = container.scrollHeight;
        
        // Silme butonu event'i
        const deleteBtn = messageDiv.querySelector('.message-delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteMessage(message.id);
            });
        }
    }

    addSystemMessage(text) {
        const container = document.getElementById('chatMessages');
        if (!container) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message';
        messageDiv.style.textAlign = 'center';
        messageDiv.style.maxWidth = '100%';
        
        messageDiv.innerHTML = `
            <div style="display: inline-block; background: var(--bg-tertiary); padding: 8px 16px; border-radius: 16px; color: var(--text-secondary); font-style: italic; font-size: 13px;">
                ${this.escapeHtml(text)}
            </div>
        `;
        
        container.appendChild(messageDiv);
        container.scrollTop = container.scrollHeight;
    }

    deleteMessage(messageId) {
        const deleted = this.db.deleteMessage(this.currentChannel, messageId);
        if (deleted) {
            this.addSystemMessage('✅ Mesaj silindi');
            this.reloadMessages();
        } else {
            this.addSystemMessage('❌ Mesaj bulunamadı veya silinemedi');
        }
    }

    clearChat() {
        const container = document.getElementById('chatMessages');
        if (container) {
            this.clearContainer('chatMessages');
            this.addSystemMessage('✅ Sohbet temizlendi');
        }
    }

    reloadMessages() {
        this.loadChannelMessages(this.currentChannel);
    }

    loadChannelMessages(channelId) {
        const container = document.getElementById('chatMessages');
        if (!container) return;
        
        this.clearContainer('chatMessages');
        
        const channel = this.db.channels[channelId];
        if (!channel || !channel.messages || channel.messages.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; color: var(--text-secondary);">
                    <i class="fas fa-comments" style="font-size: 48px; margin-bottom: 15px; opacity: 0.5;"></i>
                    <h3 style="margin-bottom: 10px;">${channel?.name?.replace('#', '') || 'Kanal'} Sohbeti</h3>
                    <p>Bu kanalda henüz mesaj yok. İlk mesajı siz gönderin!</p>
                </div>
            `;
            return;
        }
        
        // Mesajları tarihe göre sırala
        const sortedMessages = [...channel.messages].sort((a, b) => 
            new Date(a.time) - new Date(b.time)
        );
        
        sortedMessages.forEach(msg => {
            const user = this.db.users[msg.userId];
            if (user) {
                this.addMessageToChat(msg, user);
            }
        });
        
        container.scrollTop = container.scrollHeight;
    }

    // ==================== KANAL SİSTEMİ ====================
    switchChannel(channelId) {
        if (!this.db.channels[channelId]) return;
        
        this.currentChannel = channelId;
        if (this.pmSystem) {
            this.pmSystem.activePM = null;
        }
        
        // Sekmeleri güncelle
        document.querySelectorAll('.channel-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.channel === channelId) {
                tab.classList.add('active');
            }
        });
        
        const channel = this.db.channels[channelId];
        document.getElementById('currentChannel').textContent = channel.name.replace('#', '');
        document.getElementById('channelTopic').textContent = channel.topic;
        
        this.updatePanelInfo();
        
        // Video butonlarını kontrol et
        const videoBtn = document.getElementById('videoManagerBtn');
        const changeVideoBtn = document.getElementById('changeVideoBtn');
        
        if (this.hasVideoPermission(channelId)) {
            videoBtn?.classList.remove('hidden');
            changeVideoBtn?.classList.remove('hidden');
        } else {
            videoBtn?.classList.add('hidden');
            changeVideoBtn?.classList.add('hidden');
        }
        
        this.loadChannelMessages(channelId);
        this.updateOnlineList();
        this.loadChannelVideo();
        
        // PM pencerelerini kapat
        if (this.pmSystem) {
            Object.keys(this.pmSystem.pmWindows).forEach(userId => {
                this.pmSystem.closePMWindow(userId);
            });
        }
    }

    createNewChannel() {
        const nameInput = document.getElementById('channelName');
        const typeSelect = document.getElementById('channelType');
        const topicInput = document.getElementById('channelTopicInput');
        
        const name = nameInput.value.trim();
        const type = typeSelect.value;
        const topic = topicInput.value.trim() || 'Yeni sohbet kanalı';
        
        if (!name || !name.startsWith('#')) {
            alert('Kanal adı # ile başlamalı!');
            return;
        }
        
        if (this.db.userChannels.has(this.currentUser.id)) {
            alert('Zaten bir kanalınız var! Her kullanıcı sadece 1 kanal açabilir.');
            return;
        }
        
        const newChannel = this.db.createChannel({
            name: name,
            owner: this.currentUser.id,
            type: type,
            topic: topic
        });
        
        if (newChannel) {
            this.db.userChannels.set(this.currentUser.id, newChannel.id);
            
            // Sekme ekle
            const tabsContainer = document.getElementById('channelTabs');
            const tab = document.createElement('div');
            tab.className = 'channel-tab';
            tab.dataset.channel = newChannel.id;
            tab.innerHTML = `<i class="fas fa-hashtag"></i> ${name.substring(1)}`;
            tab.addEventListener('click', () => this.switchChannel(newChannel.id));
            tabsContainer.appendChild(tab);
            
            // Kanalı aç
            this.switchChannel(newChannel.id);
            this.closeModal('channelModal');
            
            // Alanları temizle
            nameInput.value = '';
            topicInput.value = '';
            
            this.addSystemMessage(`🎊 ${this.currentUser.name} yeni kanal oluşturdu: ${name}`);
        }
    }

    // ==================== DOSYA YÜKLEME ====================
    openUploadModal(type, target = null) {
        this.system.uploadType = type;
        this.system.uploadTarget = target;
        
        const title = document.getElementById('uploadTitle');
        if (title) {
            title.textContent = type === 'pm' ? 'Özel Mesaj Dosyası' : 'Kanal Dosyası';
        }
        
        // Önizlemeyi temizle
        document.getElementById('uploadPreview').innerHTML = '';
        document.getElementById('sendUpload').disabled = true;
        
        this.openModal('uploadModal');
    }

    previewFile(file) {
        if (!file) return;
        
        // Boyut kontrolü (10MB)
        if (file.size > 10 * 1024 * 1024) {
            alert('Dosya boyutu 10MB\'dan büyük olamaz!');
            return;
        }
        
        // Tip kontrolü (sadece resim/video)
        if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
            alert('Sadece resim ve video dosyaları yükleyebilirsiniz!');
            return;
        }
        
        const preview = document.getElementById('uploadPreview');
        const reader = new FileReader();
        
        reader.onload = (e) => {
            let previewHTML = '';
            
            if (file.type.startsWith('image/')) {
                previewHTML = `
                    <div class="upload-preview">
                        <img src="${e.target.result}" alt="${file.name}" style="max-width: 100%; max-height: 200px;">
                        <div style="text-align: center; margin-top: 10px; font-size: 13px;">
                            ${this.escapeHtml(file.name)} (${this.formatFileSize(file.size)})
                        </div>
                    </div>
                `;
            } else if (file.type.startsWith('video/')) {
                previewHTML = `
                    <div class="upload-preview">
                        <video controls style="max-width: 100%; max-height: 200px;">
                            <source src="${e.target.result}" type="${file.type}">
                        </video>
                        <div style="text-align: center; margin-top: 10px; font-size: 13px;">
                            ${this.escapeHtml(file.name)} (${this.formatFileSize(file.size)})
                        </div>
                    </div>
                `;
            }
            
            preview.innerHTML = previewHTML;
            preview.style.display = 'block';
            
            document.getElementById('sendUpload').disabled = false;
        };
        
        reader.readAsDataURL(file);
    }

    handleFileUpload() {
        const fileInput = document.getElementById('fileInput');
        if (!fileInput.files.length) return;
        
        const file = fileInput.files[0];
        
        if (this.system.uploadType === 'pm' && this.system.uploadTarget) {
            // PM'ye dosya gönder
            if (this.pmSystem) {
                this.pmSystem.sendMedia(this.system.uploadTarget, file)
                    .then(() => {
                        this.closeModal('uploadModal');
                        fileInput.value = '';
                    })
                    .catch(err => {
                        console.error('Dosya gönderme hatası:', err);
                        this.addSystemMessage('❌ Dosya gönderilemedi!');
                    });
            }
        } else {
            // Kanala dosya gönder
            this.sendFileToChannel(file);
        }
    }

    sendFileToChannel(file) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const mediaData = {
                type: file.type,
                name: file.name,
                size: file.size,
                url: e.target.result,
                data: e.target.result.split(',')[1]
            };
            
            this.sendChannelMessage(`📎 ${file.name} (${this.formatFileSize(file.size)})`, mediaData);
            this.closeModal('uploadModal');
            document.getElementById('fileInput').value = '';
        };
        
        reader.readAsDataURL(file);
    }

    // ==================== OWNER PANEL ====================
    openOwnerPanel() {
        this.loadOwnerPanelData();
        this.openModal('ownerPanelModal');
    }

    loadOwnerPanelData() {
        // PM logları
        if (this.pmSystem) {
            const pmLogs = this.pmSystem.getPMLogsForOwner();
            const pmLogsList = document.getElementById('pmLogsList');
            if (pmLogsList) {
                pmLogsList.innerHTML = '';
                
                pmLogs.slice(0, 20).forEach(log => {
                    const user1 = this.db.users[log.users[0]]?.name || log.users[0];
                    const user2 = this.db.users[log.users[1]]?.name || log.users[1];
                    
                    const logItem = document.createElement('div');
                    logItem.className = 'pm-log-item';
                    logItem.innerHTML = `
                        <div style="font-weight: 500; font-size: 13px;">
                            ${this.escapeHtml(user1)} ↔ ${this.escapeHtml(user2)}
                            <span style="float: right; font-size: 11px; color: var(--text-secondary);">
                                ${this.formatTime(log.message.time)}
                            </span>
                        </div>
                        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 5px;">
                            ${log.message.media ? 
                              `📎 ${this.escapeHtml(log.message.media.name)}` : 
                              this.escapeHtml(log.message.text.substring(0, 50)) + (log.message.text.length > 50 ? '...' : '')}
                        </div>
                        <div class="pm-log-content" id="pm-content-${log.message.id}">
                            ${log.message.media ? 
                              `<div style="margin: 10px 0;">
                                ${log.message.media.type.startsWith('image/') ? 
                                  `<img src="${log.message.media.url}" style="max-width: 100%; max-height: 200px;">` : 
                                  `<video controls style="max-width: 100%; max-height: 200px;">
                                    <source src="${log.message.media.url}" type="${log.message.media.type}">
                                  </video>`}
                              </div>` : 
                              `<div style="padding: 10px; background: var(--bg-tertiary); border-radius: 8px;">
                                ${this.escapeHtml(log.message.text)}
                              </div>`}
                        </div>
                    `;
                    
                    logItem.addEventListener('click', () => {
                        const content = document.getElementById(`pm-content-${log.message.id}`);
                        content.style.display = content.style.display === 'block' ? 'none' : 'block';
                    });
                    
                    pmLogsList.appendChild(logItem);
                });
            }
            
            // Medya logları
            const mediaLogs = this.pmSystem.getMediaLogsForOwner();
            const mediaLogsList = document.getElementById('mediaLogsList');
            if (mediaLogsList) {
                mediaLogsList.innerHTML = '';
                
                mediaLogs.slice(0, 20).forEach(log => {
                    const sender = this.db.users[log.from]?.name || log.from;
                    const target = log.type === 'pm' ? 
                        (this.db.users[log.to]?.name || log.to) : 
                        log.channel;
                    
                    const logItem = document.createElement('div');
                    logItem.className = 'pm-log-item';
                    logItem.innerHTML = `
                        <div style="font-weight: 500; font-size: 13px;">
                            ${this.escapeHtml(sender)} → ${this.escapeHtml(target)}
                            <span style="float: right; font-size: 11px; color: var(--text-secondary);">
                                ${this.formatTime(log.time)}
                            </span>
                        </div>
                        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 5px;">
                            📎 ${this.escapeHtml(log.media.name)}
                        </div>
                        <div style="margin-top: 10px;">
                            ${log.media.type.startsWith('image/') ? 
                              `<img src="${log.media.url}" style="max-width: 100%; max-height: 150px; cursor: pointer;" 
                                   onclick="window.open('${log.media.url}', '_blank')">` : 
                              `<video controls style="max-width: 100%; max-height: 150px;">
                                <source src="${log.media.url}" type="${log.media.type}">
                              </video>`}
                        </div>
                    `;
                    
                    mediaLogsList.appendChild(logItem);
                });
            }
        }
        
        // Özel komutlar
        this.loadCustomCommandsList();
        
        // Tab event'leri
        document.querySelectorAll('.owner-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.owner-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.owner-content').forEach(c => c.classList.remove('active'));
                
                tab.classList.add('active');
                document.getElementById(tab.dataset.tab + 'Tab').classList.add('active');
            });
        });
    }

    loadCustomCommands() {
        this.customCommands = this.db.getCustomCommands();
    }

    loadCustomCommandsList() {
        const list = document.getElementById('customCommandsList');
        if (!list) return;
        
        list.innerHTML = '';
        
        Object.keys(this.customCommands).forEach(cmd => {
            const item = document.createElement('div');
            item.className = 'pm-log-item';
            item.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="font-weight: 500; font-size: 13px;">
                        ${this.escapeHtml(cmd)}
                    </div>
                    <button class="btn btn-danger btn-sm" data-command="${cmd}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div style="font-size: 11px; color: var(--text-secondary); margin-top: 5px; font-family: monospace;">
                    ${this.escapeHtml(this.customCommands[cmd].substring(0, 50))}...
                </div>
            `;
            
            const deleteBtn = item.querySelector('button');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`${cmd} komutunu silmek istediğinize emin misiniz?`)) {
                    this.db.deleteCustomCommand(cmd);
                    this.loadCustomCommands();
                    this.loadCustomCommandsList();
                }
            });
            
            list.appendChild(item);
        });
    }

    addCustomCommand() {
        const nameInput = document.getElementById('newCommandName');
        const codeInput = document.getElementById('newCommandCode');
        
        const name = nameInput.value.trim();
        const code = codeInput.value.trim();
        
        if (!name || !code) {
            alert('Komut adı ve kodu gerekli!');
            return;
        }
        
        if (!name.startsWith('/')) {
            alert('Komut adı / ile başlamalı!');
            return;
        }
        
        if (this.db.addCustomCommand(name, code)) {
            this.loadCustomCommands();
            this.loadCustomCommandsList();
            
            nameInput.value = '';
            codeInput.value = '';
            
            this.addSystemMessage(`✅ Özel komut eklendi: ${name}`);
        }
    }

    broadcastToAll() {
        const message = prompt('Her kanala gönderilecek mesaj:');
        if (message) {
            Object.keys(this.db.channels).forEach(channelId => {
                const broadcastMsg = {
                    id: 'broadcast_' + Date.now(),
                    type: 'system',
                    userId: 'system',
                    text: `📢 OWNER DUYURUSU: ${message}`,
                    time: new Date(),
                    channel: channelId
                };
                
                this.db.addMessage(channelId, broadcastMsg);
            });
            
            this.addSystemMessage(`📢 Tüm kanallara duyuru gönderildi: ${message}`);
        }
    }

    resetChannel() {
        const channelId = this.currentChannel;
        if (channelId === 'general') {
            alert('Genel kanalı sıfırlayamazsınız!');
            return;
        }
        
        if (confirm(`${this.db.channels[channelId]?.name} kanalını sıfırlamak istediğinize emin misiniz?`)) {
            this.db.clearChannelMessages(channelId);
            this.reloadMessages();
            this.addSystemMessage(`✅ ${this.db.channels[channelId]?.name} kanalı sıfırlandı`);
        }
    }

    resetAllChats() {
        if (confirm('Tüm kanallardaki mesajları temizlemek istediğinize emin misiniz?')) {
            this.db.clearAllMessages();
            this.reloadMessages();
            this.addSystemMessage('✅ Tüm kanallar sıfırlandı');
        }
    }

    createBackup() {
        const backup = this.db.createBackup();
        const blob = new Blob([backup], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `elitechat_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        
        this.addSystemMessage('✅ Yedek alındı');
    }

    restoreBackup() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            
            reader.onload = (e) => {
                if (confirm('Yedek yüklenecek, mevcut verilerin üzerine yazılacak. Emin misiniz?')) {
                    const success = this.db.restoreBackup(e.target.result);
                    if (success) {
                        location.reload();
                    } else {
                        alert('Yedek yüklenemedi!');
                    }
                }
            };
            
            reader.readAsText(file);
        };
        
        input.click();
    }

    // ==================== REAL-TIME SİSTEMİ ====================
    startRealtimeUpdates() {
        // LocalStorage değişikliklerini dinle
        window.addEventListener('storage', (e) => {
            if (e.key === 'elitechat_user_update') {
                this.handleUserUpdate(JSON.parse(e.newValue));
            }
            if (e.key === 'elitechat_new_message') {
                this.handleNewMessage(JSON.parse(e.newValue));
            }
        });
        
        // Periyodik online kontrol
        setInterval(() => this.checkOnlineUsers(), 5000);
    }

    startMessageListener() {
        // Mesaj dinleyicisi
        window.addEventListener('storage', (e) => {
            if (e.key === 'elitechat_new_message') {
                try {
                    const data = JSON.parse(e.newValue);
                    if (data && data.type === 'new_message' && data.message) {
                        this.handleNewMessage(data);
                    }
                } catch (err) {
                    console.error('Message parse error:', err);
                }
            }
        });
    }

    broadcastUserUpdate(action) {
        const updateEvent = {
            type: 'user_update',
            user: this.currentUser,
            action: action,
            timestamp: Date.now()
        };
        
        localStorage.setItem('elitechat_user_update', JSON.stringify(updateEvent));
    }

    broadcastNewMessage(message) {
        const broadcast = {
            type: 'new_message',
            message: message,
            channel: this.currentChannel,
            timestamp: Date.now()
        };
        
        localStorage.setItem('elitechat_new_message', JSON.stringify(broadcast));
    }

    handleUserUpdate(update) {
        if (!update || update.user.id === this.currentUser?.id) return;
        
        switch (update.action) {
            case 'login':
                // Yeni kullanıcı giriş yaptı
                this.db.addUser(update.user);
                this.updateOnlineList();
                break;
                
            case 'logout':
                // Kullanıcı çıkış yaptı
                if (this.db.users[update.user.id]) {
                    this.db.users[update.user.id].online = false;
                    this.db.onlineUsers.delete(update.user.id);
                    this.updateOnlineList();
                }
                break;
        }
    }

    handleNewMessage(data) {
        // Aynı kullanıcıdan gelen mesajı tekrar ekleme
        if (data.message.userId === this.currentUser?.id) return;
        
        // Aynı kanalda mıyız?
        if (data.channel === this.currentChannel) {
            const user = this.db.users[data.message.userId];
            if (user) {
                this.addMessageToChat(data.message, user);
            }
        }
        
        // Bildirim gönder
        if (data.message.userId !== 'mate') {
            const sender = this.db.users[data.message.userId];
            if (sender) {
                this.showNotification(
                    sender.name,
                    data.message.text || 'Yeni mesaj',
                    'message'
                );
            }
        }
    }

    checkOnlineUsers() {
        // Çevrimdışı kalmış kullanıcıları kontrol et
        const now = Date.now();
        Object.keys(this.db.users).forEach(userId => {
            const user = this.db.users[userId];
            if (user.online && userId !== this.currentUser?.id && userId !== 'mate') {
                // Son aktiviteyi kontrol et (5 dakika)
                const lastSeen = new Date(user.lastSeen).getTime();
                if (now - lastSeen > 5 * 60 * 1000) {
                    user.online = false;
                    this.db.onlineUsers.delete(userId);
                }
            }
        });
        
        this.updateOnlineList();
    }

    // ==================== UTILITY FONKSİYONLARI ====================
    updateOnlineList() {
        const container = document.getElementById('userList');
        const countElement = document.getElementById('onlineCount');
        
        if (!container || !this.currentUser) return;
        
        this.clearContainer('userList');
        
        const channel = this.db.channels[this.currentChannel];
        if (!channel || !channel.users) return;
        
        // Kanaldaki kullanıcıları al
        const channelUsers = Array.from(channel.users || [])
            .map(userId => this.db.users[userId])
            .filter(user => user && (user.online || user.id === 'mate'))
            .filter(user => !user.invisible || user.id === this.currentUser.id)
            .sort((a, b) => {
                const roleOrder = { 
                    owner: 1, admin: 2, coadmin: 3, 
                    operator: 4, voice: 5, user: 6 
                };
                const roleA = roleOrder[a.role] || 6;
                const roleB = roleOrder[b.role] || 6;
                
                if (roleA !== roleB) return roleA - roleB;
                return a.name.localeCompare(b.name);
            });
        
        // Sayıyı güncelle
        const onlineCount = channelUsers.filter(u => u.online).length;
        if (countElement) {
            countElement.textContent = `(${onlineCount})`;
        }
        
        // Kanal kullanıcı sayısını güncelle
        const channelUsersElement = document.getElementById('channelUsers');
        if (channelUsersElement) {
            channelUsersElement.textContent = channelUsers.length;
        }
        
        // Liste boşsa mesaj göster
        if (channelUsers.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 30px 20px; color: var(--text-secondary);">
                    <i class="fas fa-user-slash" style="font-size: 32px; margin-bottom: 10px; opacity: 0.5;"></i>
                    <div style="font-size: 13px;">Henüz kullanıcı yok</div>
                </div>
            `;
            return;
        }
        
        // Kullanıcıları listele
        channelUsers.forEach(user => {
            const item = document.createElement('div');
            item.className = `user-item ${user.online ? 'online' : ''}`;
            if (this.pmSystem?.activePM === user.id) {
                item.classList.add('active');
            }
            
            const displayName = user.id === 'mate' ? '🤖Mate' : user.name;
            const isInvisible = user.invisible && user.id !== this.currentUser.id;
            
            item.innerHTML = `
                <div class="user-avatar ${user.online && !isInvisible ? 'online' : ''}" 
                     style="${user.avatarUrl ? `background-image: url('${user.avatarUrl}');` : ''}">
                    ${user.avatarUrl ? '' : user.avatar}
                </div>
                <div class="user-info">
                    <div class="user-name">
                        ${this.escapeHtml(displayName)}
                        ${this.getRoleBadge(user.role)}
                        ${user.registered ? '<i class="fas fa-check-circle" style="color: var(--accent-blue); font-size: 10px;"></i>' : ''}
                        ${isInvisible ? '<i class="fas fa-eye-slash" style="color: var(--text-secondary); font-size: 10px;"></i>' : ''}
                    </div>
                    <div class="user-status">
                        ${user.online && !isInvisible ? '🟢 Çevrimiçi' : '⚫ Çevrimdışı'}
                    </div>
                </div>
            `;
            
            item.addEventListener('click', () => {
                if (user.id !== this.currentUser.id && this.pmSystem) {
                    this.pmSystem.openPrivateChat(user.id);
                }
            });
            
            container.appendChild(item);
        });
        
        // PM konuşma listesini de güncelle
        if (this.pmSystem) {
            this.pmSystem.updatePMConversationList();
        }
    }

    updatePanelInfo() {
        const channel = this.db.channels[this.currentChannel];
        if (!channel) return;
        
        document.getElementById('panelChannelName').textContent = channel.name;
        document.getElementById('panelChannelTopic').textContent = channel.topic;
        document.getElementById('panelChannelVideo').textContent = channel.video?.title || 'Video yok';
        document.getElementById('videoChannel').textContent = channel.name.replace('#', '');
        document.getElementById('videoTitle').textContent = channel.video?.title || 'Video yok';
    }

    loadChannelVideo() {
        const channel = this.db.channels[this.currentChannel];
        if (!channel || !channel.video) return;
        
        const player = document.getElementById('youtubePlayer');
        const titleElement = document.getElementById('videoTitle');
        
        if (player && titleElement) {
            player.src = `https://www.youtube-nocookie.com/embed/${channel.video.id}?autoplay=1&mute=1&rel=0&controls=1&modestbranding=1`;
            titleElement.textContent = channel.video.title;
        }
    }

    changeChannelVideo() {
        const channel = this.db.channels[this.currentChannel];
        if (!channel) return;
        
        if (!this.hasVideoPermission(this.currentChannel)) {
            alert('Video değiştirme yetkiniz yok!');
            return;
        }
        
        // Video modalını aç
        document.getElementById('videoUrl').value = '';
        document.getElementById('videoTitleInput').value = channel.video?.title || '';
        this.openModal('videoModal');
    }

    hasVideoPermission(channelId) {
        const channel = this.db.channels[channelId];
        if (!channel) return false;
        
        const user = this.currentUser;
        if (!user) return false;
        
        if (user.role === 'owner') return true;
        if (user.role === 'admin') return true;
        if (user.role === 'coadmin' && channel.owner === user.id) return true;
        if (channel.owner === user.id) return true;
        
        return false;
    }

    showChannelInfo() {
        const channel = this.db.channels[this.currentChannel];
        if (!channel) return;
        
        document.getElementById('infoChannelName').textContent = channel.name;
        document.getElementById('infoChannelTopic').textContent = channel.topic;
        document.getElementById('infoChannelOwner').textContent = 
            this.db.users[channel.owner]?.name || channel.owner;
        document.getElementById('infoChannelType').textContent = 
            channel.type === 'public' ? 'Public' : 
            channel.type === 'private' ? 'Private' : 'Secret';
        document.getElementById('infoChannelVideo').textContent = channel.video?.title || 'Video yok';
        document.getElementById('infoChannelUsers').textContent = channel.users.size;
        
        this.openModal('channelInfoModal');
    }

    toggleFullscreen() {
        const player = document.getElementById('youtubePlayer');
        if (player.requestFullscreen) {
            player.requestFullscreen();
        } else if (player.webkitRequestFullscreen) {
            player.webkitRequestFullscreen();
        } else if (player.msRequestFullscreen) {
            player.msRequestFullscreen();
        }
    }

    openSettings() {
        if (!this.currentUser) return;
        
        document.getElementById('settingsNick').value = this.currentUser.name;
        document.getElementById('settingsAvatar').textContent = this.currentUser.avatar;
        document.getElementById('settingsBio').value = this.currentUser.bio || '';
        document.getElementById('settingsInvisible').checked = this.currentUser.invisible;
        
        this.openModal('settingsModal');
    }

    saveSettings() {
        const nickInput = document.getElementById('settingsNick');
        const bioInput = document.getElementById('settingsBio');
        const invisibleInput = document.getElementById('settingsInvisible');
        
        const newNick = nickInput.value.trim();
        const bio = bioInput.value.trim();
        const invisible = invisibleInput.checked;
        
        if (newNick && newNick !== this.currentUser.name) {
            // Nick değiştirme
            this.changeNick(newNick);
        }
        
        this.currentUser.bio = bio;
        this.currentUser.invisible = invisible;
        
        this.db.updateUser(this.currentUser.id, {
            bio: bio,
            invisible: invisible
        });
        
        this.closeModal('settingsModal');
        this.updateOnlineList();
        this.addSystemMessage('✅ Ayarlarınız güncellendi.');
    }

    changeNick(newNick) {
        if (!newNick || newNick.length < 2) {
            this.addSystemMessage('❌ Geçersiz nick! (min 2 karakter)');
            return;
        }
        
        const cleanNick = newNick.replace(/[^a-zA-Z0-9._]/g, '');
        const userId = cleanNick.toLowerCase();
        
        if (userId === 'mate') {
            this.addSystemMessage('❌ Bu kullanıcı adı sistem tarafından kullanılıyor!');
            return;
        }
        
        if (this.db.users[userId] && userId !== this.currentUser.id) {
            this.addSystemMessage('❌ Bu kullanıcı adı zaten kullanılıyor!');
            return;
        }
        
        const oldNick = this.currentUser.name;
        const oldUserId = this.currentUser.id;
        
        // Nick'i değiştir
        this.currentUser.name = cleanNick;
        this.currentUser.avatar = cleanNick.charAt(0).toUpperCase();
        
        // Veritabanını güncelle
        delete this.db.users[oldUserId];
        this.db.users[userId] = this.currentUser;
        
        this.db.onlineUsers.delete(oldUserId);
        this.db.onlineUsers.add(userId);
        
        // Kanallardaki nick'i güncelle
        Object.values(this.db.channels).forEach(channel => {
            if (channel.users.has(oldUserId)) {
                channel.users.delete(oldUserId);
                channel.users.add(userId);
            }
        });
        
        this.addSystemMessage(`✅ Nick değiştirildi: ${oldNick} → ${cleanNick}`);
        this.updateOnlineList();
    }

    joinChannel(channelName) {
        const channelId = channelName.substring(1).toLowerCase().replace(/[^a-z0-9]/g, '_');
        
        if (!this.db.channels[channelId]) {
            this.addSystemMessage(`❌ Kanal bulunamadı: ${channelName}`);
            return;
        }
        
        const channel = this.db.channels[channelId];
        
        if (channel.bans?.has(this.currentUser.id)) {
            const banInfo = channel.bans.get(this.currentUser.id);
            this.addSystemMessage(`❌ Bu kanaldan banlısınız! Sebep: ${banInfo.reason}`);
            return;
        }
        
        channel.users.add(this.currentUser.id);
        this.db.saveData();
        
        // Sekme ekle
        let tabExists = false;
        document.querySelectorAll('.channel-tab').forEach(tab => {
            if (tab.dataset.channel === channelId) {
                tabExists = true;
            }
        });
        
        if (!tabExists) {
            const tabsContainer = document.getElementById('channelTabs');
            const tab = document.createElement('div');
            tab.className = 'channel-tab';
            tab.dataset.channel = channelId;
            tab.innerHTML = `<i class="fas fa-hashtag"></i> ${channel.name.substring(1)}`;
            tab.addEventListener('click', () => this.switchChannel(channelId));
            tabsContainer.appendChild(tab);
        }
        
        this.switchChannel(channelId);
        this.addSystemMessage(`✅ ${channelName} kanalına katıldınız`);
    }

    leaveChannel() {
        if (this.currentChannel === 'general') {
            this.addSystemMessage('❌ Genel kanaldan ayrılamazsınız!');
            return;
        }
        
        const channel = this.db.channels[this.currentChannel];
        const channelName = channel.name;
        
        channel.users.delete(this.currentUser.id);
        this.db.saveData();
        
        // Sekmeyi kaldır
        const tab = document.querySelector(`.channel-tab[data-channel="${this.currentChannel}"]`);
        if (tab) tab.remove();
        
        // Genel kanala geç
        this.switchChannel('general');
        this.addSystemMessage(`✅ ${channelName} kanalından ayrıldınız`);
    }

    changeTopic(newTopic) {
        const channel = this.db.channels[this.currentChannel];
        if (!channel) return;
        
        if (channel.owner !== this.currentUser.id && 
            this.currentUser.role !== 'owner' && 
            this.currentUser.role !== 'admin') {
            this.addSystemMessage('❌ Kanal konusunu değiştirme yetkiniz yok!');
            return;
        }
        
        const oldTopic = channel.topic;
        channel.topic = newTopic;
        this.db.saveData();
        
        document.getElementById('channelTopic').textContent = newTopic;
        document.getElementById('panelChannelTopic').textContent = newTopic;
        
        this.addSystemMessage(`📝 Kanal konusu değiştirildi: "${oldTopic}" → "${newTopic}"`);
    }

    quit() {
        this.addSystemMessage('👋 Çıkış yapılıyor...');
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    }

    switchPanel(panelName) {
        document.getElementById('onlinePanel').classList.add('hidden');
        document.getElementById('pmPanel').classList.add('hidden');
        
        document.querySelectorAll('.panel-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        document.getElementById(`${panelName}Panel`).classList.remove('hidden');
        document.querySelector(`.panel-tab[data-panel="${panelName}"]`).classList.add('active');
        
        if (panelName === 'pm' && this.pmSystem) {
            this.pmSystem.updatePMConversationList();
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(text).replace(/[&<>"']/g, m => map[m]);
    }

    formatTime(date = new Date()) {
        return date.toLocaleTimeString('tr-TR', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false
        });
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

    showNotification(title, message, type = 'info') {
        console.log(`[${type.toUpperCase()}] ${title}: ${message}`);
        
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body: message });
        } else if (Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }

    clearContainer(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }
    }

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }

    toggleTheme() {
        if (this.system.theme === 'night') {
            document.body.classList.add('day-mode');
            document.body.classList.remove('night-mode');
            this.system.theme = 'day';
        } else {
            document.body.classList.add('night-mode');
            document.body.classList.remove('day-mode');
            this.system.theme = 'night';
        }
    }

    startAutoUpdates() {
        // Online listeyi güncelle
        const interval = setInterval(() => {
            this.updateOnlineList();
        }, 5000);
        
        this.system.intervals.push(interval);
    }

    stopAutoUpdates() {
        this.system.intervals.forEach(interval => clearInterval(interval));
        this.system.intervals = [];
    }

    disconnect() {
        if (this.currentUser) {
            this.currentUser.online = false;
            this.db.updateUser(this.currentUser.id, { online: false });
            
            // Kanallardan çıkar
            Object.values(this.db.channels).forEach(channel => {
                if (channel.users.has(this.currentUser.id)) {
                    channel.users.delete(this.currentUser.id);
                }
            });
            
            this.db.saveData();
            
            // Diğer kullanıcılara bildir
            this.broadcastUserUpdate('logout');
        }
        
        this.stopAutoUpdates();
    }
}

// ==================== MATE BOT SİSTEMİ ====================
class MateBot {
    constructor() {
        this.id = 'mate';
        this.name = '🤖Mate';
        this.role = 'owner';
        this.registered = true;
        this.online = true;
        this.invisible = false;
        this.avatar = 'M';
        this.bio = 'Güvenlik Botu - Sadece güvenlik ve owner mesajlarını iletirim';
        this.joinDate = new Date();
        this.lastSeen = new Date();
        
        // Veritabanına ekle
        if (window.elitechatDB) {
            window.elitechatDB.addUser(this);
        }
    }
    
    sendSecurityAlert(message, channelId = 'general') {
        const channel = window.elitechatDB?.channels[channelId];
        if (!channel) return;
        
        const alertMessage = {
            id: 'alert_' + Date.now(),
            type: 'security',
            userId: this.id,
            text: `🔒 **GÜVENLİK**: ${message}`,
            time: new Date(),
            channel: channelId
        };
        
        window.elitechatDB.addMessage(channelId, alertMessage);
        
        // Eğer o kanal açıksa mesajı göster
        if (window.eliteChatClient && window.eliteChatClient.currentChannel === channelId) {
            window.eliteChatClient.addMessageToChat(alertMessage, this);
        }
    }
}
// Mobil kontrolü
isMobile() {
    return window.innerWidth <= 992;
}

// Swipe için kanal geçişi
setupMobileSwipe() {
    if (!this.isMobile()) return;
    
    let startX = 0;
    let currentTranslate = 0;
    let currentIndex = 0;
    
    document.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
    });
    
    document.addEventListener('touchmove', (e) => {
        if (!this.isMobile()) return;
        
        const currentX = e.touches[0].clientX;
        const diff = currentX - startX;
        
        // Kanal swipe
        if (Math.abs(diff) > 50) {
            if (diff > 0) {
                this.prevChannel(); // Sola swipe
            } else {
                this.nextChannel(); // Sağa swipe
            }
            startX = currentX;
        }
    });
}

// Özel sohbet açma (mobile)
openMobilePM(userId) {
    if (!this.isMobile()) return;
    
    const pmWindow = document.createElement('div');
    pmWindow.className = 'pm-window-mobile active';
    pmWindow.innerHTML = `
        <div class="pm-swipe-handle"></div>
        <div class="pm-header-mobile">
            <button class="btn btn-sm close-pm-mobile">
                <i class="fas fa-chevron-down"></i>
            </button>
            <h4>${this.db.users[userId]?.name}</h4>
        </div>
        <div class="pm-content-mobile" id="pm-mobile-content">
            <!-- Mesajlar -->
        </div>
        <div class="pm-input-mobile">
            <input type="text" placeholder="Mesaj yaz..." class="mobile-pm-input">
        </div>
    `;
    
    document.body.appendChild(pmWindow);
    
    // Swipe down to close
    this.setupSwipeToClose(pmWindow);
}
// Uygulamayı başlat
document.addEventListener('DOMContentLoaded', function() {
    window.eliteChatClient = new EliteChatClient();
});
