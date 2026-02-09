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
        
        // Mate bot'u başlat
        this.mateBot = new MateBot();
        
        // Sistemleri başlat
        this.ircCommands = new IRCCommands(this);
        this.pmSystem = new PMSystem(this);
        
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
        
        const cleanNick = nick.replace(/[^a-zA-Z0-9._]/g, '');
        
        if (!cleanNick || cleanNick.length < 2) {
            alert('Kullanıcı adı en az 2 karakter olmalıdır (sadece harf, rakam, . ve _)');
            nickInput.value = '';
            nickInput.focus();
            return;
        }
        
        const userId = cleanNick.toLowerCase();
        
        if (userId === 'mate') {
            alert('Bu kullanıcı adı sistem tarafından kullanılıyor!');
            nickInput.value = '';
            nickInput.focus();
            return;
        }
        
        // Owner kontrolü
        if (userId === 'mateky' && pass === 'kumsal07@') {
            this.loginAsOwner(userId, cleanNick);
            return;
        }
        
        // Kayıtlı kullanıcı kontrolü
        const registeredUser = this.db.authenticateUser(userId, pass);
        
        let role = 'user';
        if (registeredUser) {
            role = registeredUser.role;
        } else if (pass) {
            // Yeni kayıt
            this.db.registerUser(userId, pass, role);
        }
        
        const userData = {
            id: userId,
            name: cleanNick,
            role: role,
            registered: !!pass,
            online: true,
            invisible: false,
            avatar: cleanNick.charAt(0).toUpperCase(),
            bio: registeredUser?.bio || '',
            joinDate: registeredUser?.joinDate || new Date().toISOString(),
            lastSeen: new Date().toISOString()
        };
        
        this.loginUser(userData);
    }

    loginAsOwner(userId, cleanNick) {
        const userData = {
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
        
        this.loginUser(userData);
        
        // Owner panel butonunu göster
        document.getElementById('ownerPanelBtn').classList.remove('hidden');
    }

    loginUser(userData) {
        this.currentUser = userData;
        this.db.addUser(userData);
        this.db.onlineUsers.add(userData.id);
        
        // Genel kanala ekle
        const generalChannel = this.db.channels.general;
        if (generalChannel && !generalChannel.users.includes(userData.id)) {
            generalChannel.users.push(userData.id);
            this.db.saveData();
        }
        
        // UI'ı göster
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');
        
        this.addSystemMessage(`🎉 ${this.currentUser.name} sohbete katıldı!`);
        
        this.updateOnlineList();
        this.updatePanelInfo();
        this.loadChannelMessages('general');
        
        this.startAutoUpdates();
        
        // Giriş alanlarını temizle
        document.getElementById('nickInput').value = '';
        document.getElementById('passInput').value = '';
    }

    // ==================== SOHBET SİSTEMİ ====================
    sendMessage() {
        const input = document.getElementById('messageInput');
        const text = input.value.trim();
        
        if (!text) return;
        
        if (text.startsWith('/')) {
            this.ircCommands.execute(text);
            input.value = '';
            return;
        }
        
        if (this.pmSystem.activePM) {
            this.pmSystem.sendPrivateMessage(this.pmSystem.activePM, text);
        } else {
            this.sendChannelMessage(text);
        }
        
        input.value = '';
        input.focus();
    }

    sendChannelMessage(text, media = null) {
        const channel = this.db.channels[this.currentChannel];
        if (!channel) return;
        
        // Yetki kontrolleri
        if (this.db.globalMutes.has(this.currentUser.id)) {
            this.addSystemMessage('⚠️ Global susturulmuşsunuz! Mesaj gönderemezsiniz.');
            return;
        }
        
        if (channel.mutes && channel.mutes[this.currentUser.id]) {
            const muteEnd = new Date(channel.mutes[this.currentUser.id].endTime);
            if (new Date() < muteEnd) {
                this.addSystemMessage('⚠️ Bu kanalda susturulmuşsunuz! Mesaj gönderemezsiniz.');
                return;
            }
            delete channel.mutes[this.currentUser.id];
        }
        
        if (channel.slowmode > 0) {
            const lastMessage = channel.messages
                ?.filter(m => m.userId === this.currentUser.id)
                ?.pop();
            if (lastMessage) {
                const timeDiff = (new Date() - new Date(lastMessage.time)) / 1000;
                if (timeDiff < channel.slowmode) {
                    this.addSystemMessage(`⏱️ Yavaş mod aktif! ${Math.ceil(channel.slowmode - timeDiff)} saniye bekleyin.`);
                    return;
                }
            }
        }
        
        const message = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'message',
            userId: this.currentUser.id,
            text: text,
            media: media,
            time: new Date(),
            channel: this.currentChannel
        };
        
        // Medya gönderiliyorsa log'a ekle
        if (media) {
            this.db.addMediaLog({
                type: 'channel',
                from: this.currentUser.id,
                channel: this.currentChannel,
                media: media,
                time: new Date()
            });
        }
        
        this.db.addMessage(this.currentChannel, message);
        this.addMessageToChat(message, this.currentUser);
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
                        `<img src="${message.media.url}" alt="${message.media.name}">` : 
                        `<video controls><source src="${message.media.url}" type="${message.media.type}"></video>`}
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

    // ==================== KANAL SİSTEMİ ====================
    switchChannel(channelId) {
        if (!this.db.channels[channelId]) return;
        
        this.currentChannel = channelId;
        this.pmSystem.activePM = null;
        
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
        Object.keys(this.pmSystem.pmWindows).forEach(userId => {
            this.pmSystem.closePMWindow(userId);
        });
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
                        <img src="${e.target.result}" alt="${file.name}">
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
            this.pmSystem.sendMedia(this.system.uploadTarget, file)
                .then(() => {
                    this.closeModal('uploadModal');
                    fileInput.value = '';
                })
                .catch(err => {
                    console.error('Dosya gönderme hatası:', err);
                    this.addSystemMessage('❌ Dosya gönderilemedi!');
                });
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

    // ==================== UTILITY FONKSİYONLARI ====================
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
                if (channel.users && channel.users.includes(this.currentUser.id)) {
                    const index = channel.users.indexOf(this.currentUser.id);
                    if (index > -1) {
                        channel.users.splice(index, 1);
                    }
                }
            });
            
            this.db.saveData();
        }
        
        this.stopAutoUpdates();
    }

    // Diğer metodlar (kısaltıldı)
    updateOnlineList() { /* ... */ }
    updatePanelInfo() { /* ... */ }
    loadChannelMessages(channelId) { /* ... */ }
    loadChannelVideo() { /* ... */ }
    changeChannelVideo() { /* ... */ }
    showChannelInfo() { /* ... */ }
    toggleFullscreen() { /* ... */ }
    openSettings() { /* ... */ }
    changeNick(newNick) { /* ... */ }
    joinChannel(channelName) { /* ... */ }
    leaveChannel() { /* ... */ }
    changeTopic(newTopic) { /* ... */ }
    quit() { /* ... */ }
    switchPanel(panelName) { /* ... */ }
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
        window.elitechatDB.addUser(this);
        window.elitechatDB.onlineUsers.add(this.id);
    }
    
    sendSecurityAlert(message, channelId = 'general') {
        const channel = window.elitechatDB.channels[channelId];
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

// Uygulamayı başlat
document.addEventListener('DOMContentLoaded', function() {
    window.eliteChatClient = new EliteChatClient();
});
