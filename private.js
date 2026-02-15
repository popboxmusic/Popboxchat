// ========== PRIVATE.JS ==========
const PrivateChat = {
    currentUser: null,
    
    // Özel sohbet aç
    open: function(username) {
        this.currentUser = username;
        document.getElementById('privateChatName').textContent = username;
        document.getElementById('privateChatAvatar').innerHTML = username.charAt(0).toUpperCase();
        document.getElementById('privateChatPanel').classList.add('active');
    },
    
    // Kapat
    close: function() {
        document.getElementById('privateChatPanel').classList.remove('active');
        this.currentUser = null;
    },
    
    // Mesaj gönder
    send: function() {
        const input = document.getElementById('privateMessageInput');
        const text = input.value.trim();
        if (!text || !this.currentUser) return;
        
        Utils.addSystemMessage(`📨 ${Auth.currentUser.name} → ${this.currentUser}: ${text}`);
        input.value = '';
    },
    
    // Engelle
    block: function() {
        if (this.currentUser) {
            Utils.addSystemMessage(`🚫 ${this.currentUser} engellendi`);
            this.close();
        }
    },
    
    // Şikayet
    report: function() {
        if (this.currentUser) {
            Utils.addSystemMessage(`⚠️ ${this.currentUser} şikayet edildi`);
        }
    },
    
    // Sekme değiştir
    switchTab: function(tab) {
        if (tab !== 'chat') {
            Utils.addSystemMessage('🔜 Yakında...');
        }
    },
    
    // Resim yükle
    uploadImage: function() {
        document.getElementById('privateImageUpload').click();
    },
    
    // Video yükle
    uploadVideo: function() {
        document.getElementById('privateVideoUpload').click();
    }
};

window.PrivateChat = PrivateChat;
console.log('✅ Private.js yüklendi');
