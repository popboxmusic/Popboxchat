// ========== app.js ==========
// ANA UYGULAMA - DÜZELTİLDİ

const App = {
    // Kullanıcı bilgileri
    currentUser: null,
    currentChannel: 'genel',
    channels: {},
    
    // Başlangıç
    init: function() {
        console.log('🚀 App başlatılıyor...');
        
        // Varsayılan kanalları oluştur
        this.channels = {
            genel: {
                name: 'genel',
                owner: 'MateKy',
                subscribers: 15000000,
                onlineUsers: {},
                playlist: []
            }
        };
        
        // Kayıtlı kullanıcı var mı?
        const savedUser = localStorage.getItem('cetcety_user');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            this.showApp();
            this.loadChannels();
            Utils.addSystemMessage(`👋 Tekrar hoş geldin, ${this.currentUser.name}!`);
        }
        
        // Firebase bağlantısını dinle
        if (window.database) {
            this.listenFirebase();
        }
    },
    
    // Firebase dinleyicileri
    listenFirebase: function() {
        if (!database) return;
        
        // Online kullanıcıları dinle
        database.ref('online').on('value', (snapshot) => {
            const online = snapshot.val();
            if (online && this.currentChannel) {
                const channelOnline = online[this.currentChannel] || {};
                const count = Object.keys(channelOnline).length;
                document.getElementById('channelUserCount').textContent = count;
            }
        });
        
        // Mesajları dinle
        database.ref('messages').on('child_added', (snapshot) => {
            const msg = snapshot.val();
            if (msg && msg.channel === this.currentChannel && msg.sender !== this.currentUser?.name) {
                this.displayMessage(msg);
            }
        });
        
        console.log('👂 Firebase dinleyiciler aktif');
    },
    
    // Giriş yap
    login: function(nick, pass) {
        if (!nick) { alert('Kullanıcı adı boş olamaz!'); return false; }
        
        // Owner kontrolü
        if (nick === 'MateKy') {
            if (pass !== 'Sahi17407@SCM') {
                alert('Owner şifresi hatalı!');
                return false;
            }
            this.createUser(nick, 'owner');
            return true;
        }
        
        // Normal kullanıcı
        this.createUser(nick, 'user');
        return true;
    },
    
    // Kullanıcı oluştur
    createUser: function(nick, role) {
        this.currentUser = {
            id: Date.now().toString(),
            name: nick,
            role: role,
            roleLevel: role === 'owner' ? 5 : 1,
            subscribedChannels: ['genel'],
            myChannel: null,
            avatar: nick.charAt(0).toUpperCase()
        };
        
        // Kaydet
        localStorage.setItem('cetcety_user', JSON.stringify(this.currentUser));
        
        // Firebase'e bildir
        if (database) {
            database.ref(`online/${this.currentChannel}/${this.currentUser.id}`).set({
                name: nick,
                role: role,
                lastSeen: Date.now()
            });
            
            // Çıkışta temizle
            database.ref(`online/${this.currentChannel}/${this.currentUser.id}`)
                .onDisconnect().remove();
        }
        
        // UI'ı göster
        this.showApp();
        Utils.addSystemMessage(`👋 Hoş geldin, ${nick}!`);
    },
    
    // Uygulamayı göster
    showApp: function() {
        document.getElementById('loginOverlay').classList.add('hidden');
        document.getElementById('app').style.display = 'flex';
        document.getElementById('avatarText').textContent = this.currentUser.avatar;
        this.loadChannels();
    },
    
    // Kanalları yükle (DÜZELTİLDİ)
    loadChannels: function() {
        console.log('📡 Kanallar yükleniyor...');
        
        // UI'ı güncelle
        if (typeof UI !== 'undefined' && UI.updateChannelList) {
            UI.updateChannelList();
        } else {
            console.warn('UI.updateChannelList fonksiyonu bulunamadı');
        }
        
        // Sol paneli yükle
        if (typeof UI !== 'undefined' && UI.loadLeftPanel) {
            UI.loadLeftPanel('subscriptions');
        }
        
        // Kanal bilgilerini güncelle
        document.getElementById('currentChannelName').textContent = this.currentChannel;
        
        const ch = this.channels[this.currentChannel];
        if (ch) {
            document.getElementById('channelSubscribers').textContent = 
                Utils.formatNumber(ch.subscribers || 0);
        }
    },
    
    // Kanal değiştir
    joinChannel: function(channelName) {
        if (!this.channels[channelName]) {
            Utils.addSystemMessage('❌ Kanal bulunamadı.');
            return;
        }
        
        const oldChannel = this.currentChannel;
        this.currentChannel = channelName;
        
        // Firebase'de güncelle
        if (database && this.currentUser) {
            database.ref(`online/${oldChannel}/${this.currentUser.id}`).remove();
            database.ref(`online/${channelName}/${this.currentUser.id}`).set({
                name: this.currentUser.name,
                role: this.currentUser.role
            });
        }
        
        // UI güncelle
        document.getElementById('currentChannelName').textContent = channelName;
        document.getElementById('messages').innerHTML = '';
        Utils.addSystemMessage(`📢 #${channelName} kanalına katıldın!`);
        
        // Online sayısını güncelle
        if (database) {
            database.ref(`online/${channelName}`).once('value', (snapshot) => {
                const users = snapshot.val() || {};
                document.getElementById('channelUserCount').textContent = Object.keys(users).length;
            });
        }
    },
    
    // Mesaj gönder
    sendMessage: function(text) {
        if (!text || !this.currentUser) return;
        
        const msg = {
            sender: this.currentUser.name,
            text: text,
            channel: this.currentChannel,
            time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
            timestamp: Date.now()
        };
        
        // Firebase'e gönder
        if (database) {
            database.ref('messages').push(msg);
        }
        
        // Kendi mesajını göster
        this.displayMessage(msg, true);
    },
    
    // Mesajı ekrana ekle
    displayMessage: function(msg, isMe = false) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${isMe ? 'right' : ''}`;
        msgDiv.innerHTML = `
            <div class="message-header" style="${isMe ? 'justify-content: flex-end;' : ''}">
                <span class="message-time">${msg.time}</span>
                <span class="message-sender">${Utils.escapeHTML(msg.sender)}</span>
            </div>
            <div class="message-text">${Utils.escapeHTML(msg.text)}</div>
        `;
        document.getElementById('messages').appendChild(msgDiv);
        document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
    },
    
    // Yetki kontrolü
    hasPermission: function(requiredRole, channelName = null) {
        if (!this.currentUser) return false;
        if (this.currentUser.role === 'owner') return true;
        return false;
    },
    
    // Çıkış
    logout: function() {
        if (database && this.currentUser) {
            database.ref(`online/${this.currentChannel}/${this.currentUser.id}`).remove();
        }
        localStorage.removeItem('cetcety_user');
        location.reload();
    }
};

window.App = App;
