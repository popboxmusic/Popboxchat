// ========== app.js ==========
// ANA UYGULAMA - SIFIR HATA GARANTİLİ

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
        
        // Kısa bir bekleme ile UI'ın yüklenmesini bekle
        setTimeout(() => {
            this.loadChannels();
        }, 50);
    },
    
    // Kanalları yükle (GÜVENLİ VERSİYON)
    loadChannels: function() {
        console.log('📡 Kanallar yükleniyor...');
        
        // Rozetleri manuel güncelle (UI'a güvenme)
        if (this.currentUser) {
            document.getElementById('subscriptionBadge').textContent = 
                this.currentUser.subscribedChannels.length;
        }
        document.getElementById('channelCountBadge').textContent = 
            Object.keys(this.channels).length;
        
        // UI varsa paneli yükle, yoksa basit panel göster
        const panel = document.getElementById('leftPanel');
        
        if (window.UI && typeof UI.loadLeftPanel === 'function') {
            UI.loadLeftPanel('subscriptions');
        } else {
            // Acil durum paneli
            panel.innerHTML = `
                <div class="panel-header">
                    <h3><i class="fas fa-bell"></i> Abonelikler</h3>
                    <div class="panel-close" onclick="App.loadChannels()">
                        <i class="fas fa-times"></i>
                    </div>
                </div>
                <div class="panel-content">
                    <div style="padding:20px; color:#aaa; text-align:center;">
                        <i class="fas fa-spinner fa-spin"></i> Yükleniyor...
                    </div>
                </div>
            `;
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
        
        // Paneldeki aktif kanalı güncelle
        this.loadChannels();
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
    
    // Çıkış
    logout: function() {
        if (database && this.currentUser) {
            database.ref(`online/${this.currentChannel}/${this.currentUser.id}`).remove();
        }
        localStorage.removeItem('cetcety_user');
        location.reload();
    }
};

// App'i global yap
window.App = App;

// Sayfa yüklendiğinde başlat
document.addEventListener('DOMContentLoaded', function() {
    // Kısa bir bekleme ile tüm dosyaların yüklenmesini bekle
    setTimeout(() => {
        App.init();
    }, 100);
});

console.log('✅ App.js yüklendi - Sıfır hata garantili');
