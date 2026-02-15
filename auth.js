// ========== AUTH.JS ==========
const Auth = {
    currentUser: null,
    
    // Giriş yap
    login: function() {
        const nick = document.getElementById('loginNick').value.trim();
        const pass = document.getElementById('loginPassword').value.trim();
        
        if (!nick) { alert('Kullanıcı adı boş olamaz!'); return; }
        
        // Owner kontrolü
        if (nick === 'MateKy') {
            if (pass !== 'Sahi17407@SCM') {
                alert('Owner şifresi hatalı!');
                return;
            }
            this.createUser(nick, 'owner');
            return;
        }
        
        // Normal kullanıcı
        this.createUser(nick, 'user');
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
        
        localStorage.setItem('cetcety_user', JSON.stringify(this.currentUser));
        
        // Firebase'e bildir
        if (window.database) {
            window.database.ref(`online/genel/${this.currentUser.id}`).set({
                name: nick,
                role: role,
                lastSeen: Date.now()
            });
        }
        
        // UI'ı göster
        document.getElementById('loginOverlay').classList.add('hidden');
        document.getElementById('app').style.display = 'flex';
        document.getElementById('avatarText').textContent = this.currentUser.avatar;
        
        if (window.UI) UI.loadLeftPanel('subscriptions');
        Utils.addSystemMessage(`👋 Hoş geldin, ${nick}!`);
    },
    
    // Çıkış
    logout: function() {
        if (window.database && this.currentUser) {
            window.database.ref(`online/genel/${this.currentUser.id}`).remove();
        }
        localStorage.removeItem('cetcety_user');
        location.reload();
    },
    
    // Yetki kontrolü
    hasPermission: function(requiredRole, channelName = null) {
        if (!this.currentUser) return false;
        if (this.currentUser.role === 'owner') return true;
        if (this.currentUser.role === 'admin') return requiredRole !== 'owner';
        return false;
    }
};

window.Auth = Auth;
console.log('✅ Auth.js yüklendi');