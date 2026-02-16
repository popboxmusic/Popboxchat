// ========== AUTH.JS ==========
const Auth = {
    currentUser: null,
    
    // Giriş yap
    login: function() {
        // ... mevcut kod ...
    },
    
    // Kullanıcı oluştur
    createUser: function(nick, role) {
        // ... mevcut kod ...
    },
    
    // Çıkış
    logout: function() {
        // ... mevcut kod ...
    },
    
    // Yetki kontrolü
    hasPermission: function(requiredRole, channelName = null) {
        if (!this.currentUser) return false;
        if (this.currentUser.role === 'owner') return true;
        if (this.currentUser.role === 'admin') return requiredRole !== 'owner';
        return false;
    },
    
    // #ow kanalına girebilir mi? (YENİ)
    canAccessOW: function() {
        return this.currentUser?.name === 'MateKy';
    }
};

window.Auth = Auth;
console.log('✅ Auth.js yüklendi');
