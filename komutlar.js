// ========== POPBOX KOMUTLARI ==========
window.PopboxCommands = {
    help: function() {
        addSystemMessage('🎮 KOMUTLAR: /help, /ping, /me, /temizle');
    },
    ping: function() {
        addSystemMessage('🏓 Pong!');
    },
    me: function(args) {
        database.ref('messages').push({
            sender: currentUser.name,
            text: `* ${currentUser.name} ${args.join(' ')}`,
            role: currentUser.role,
            timestamp: Date.now()
        });
    },
    temizle: function() {
        if (isOwner || isAdmin) {
            database.ref('messages').remove();
            addSystemMessage('✅ Sohbet temizlendi!');
        }
    }
};

console.log('✅ Popbox komutları yüklendi!');