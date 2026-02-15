// ========== private.js ==========
// ÖZEL SOHBET İŞLEMLERİ

const PrivateChat = {
    currentUser: null,
    
    open: function(username) {
        this.currentUser = username;
        document.getElementById('privateChatName').textContent = username;
        document.getElementById('privateChatAvatar').innerHTML = username.charAt(0).toUpperCase();
        document.getElementById('privateChatPanel').classList.add('active');
    },
    
    close: function() {
        document.getElementById('privateChatPanel').classList.remove('active');
        this.currentUser = null;
    },
    
    send: function() {
        const input = document.getElementById('privateMessageInput');
        const text = input.value.trim();
        if (!text || !this.currentUser) return;
        
        Utils.addSystemMessage(`📨 ${App.currentUser.name} → ${this.currentUser}: ${text}`);
        input.value = '';
    },
    
    block: function() {
        if (this.currentUser) {
            Utils.addSystemMessage(`🚫 ${this.currentUser} engellendi`);
            this.close();
        }
    },
    
    report: function() {
        if (this.currentUser) {
            Utils.addSystemMessage(`⚠️ ${this.currentUser} şikayet edildi`);
        }
    },
    
    switchTab: function(tab) {
        if (tab !== 'chat') {
            Utils.addSystemMessage('🔜 Bu özellik yakında aktif olacak');
        }
    },
    
    uploadImage: function() {
        document.getElementById('privateImageUpload').click();
    },
    
    uploadVideo: function() {
        document.getElementById('privateVideoUpload').click();
    }
};

window.PrivateChat = PrivateChat;
console.log('✅ Private.js yüklendi');