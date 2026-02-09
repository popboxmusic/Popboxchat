// EliteChat IRC Komut Sistemi
class IRCCommandSystem {
    constructor() {
        this.commands = new Map();
        this.registerCommands();
    }
    
    registerCommands() {
        // Temel IRC komutları
        this.commands.set('/nick', this.handleNick.bind(this));
        this.commands.set('/join', this.handleJoin.bind(this));
        this.commands.set('/leave', this.handleLeave.bind(this));
        this.commands.set('/msg', this.handleMsg.bind(this));
        this.commands.set('/me', this.handleMe.bind(this));
        this.commands.set('/who', this.handleWho.bind(this));
        this.commands.set('/clear', this.handleClear.bind(this));
        this.commands.set('/topic', this.handleTopic.bind(this));
        this.commands.set('/ping', this.handlePing.bind(this));
        this.commands.set('/time', this.handleTime.bind(this));
        this.commands.set('/help', this.handleHelp.bind(this));
        this.commands.set('/quit', this.handleQuit.bind(this));
        
        // Yetkili komutları
        this.commands.set('/kick', this.handleKick.bind(this));
        this.commands.set('/ban', this.handleBan.bind(this));
        this.commands.set('/mute', this.handleMute.bind(this));
        this.commands.set('/op', this.handleOp.bind(this));
        this.commands.set('/deop', this.handleDeop.bind(this));
        this.commands.set('/voice', this.handleVoice.bind(this));
        this.commands.set('/devoice', this.handleDevoice.bind(this));
    }
    
    execute(command, args, context) {
        const handler = this.commands.get(command.toLowerCase());
        if (handler) {
            return handler(args, context);
        }
        return false;
    }
    
    handleNick(args, context) {
        if (args.length < 1) {
            context.addSystemMessage('❌ Kullanım: /nick yeni_nick');
            return false;
        }
        
        const newNick = args[0];
        const db = window.eliteChatDatabase;
        
        // Nick değiştirme işlemi
        const result = this.changeNick(context.currentUser.id, newNick);
        if (result) {
            context.addSystemMessage(`✅ Nick değiştirildi: ${context.currentUser.name} → ${newNick}`);
            context.currentUser.name = newNick;
            context.currentUser.avatar = newNick.charAt(0).toUpperCase();
            context.updateOnlineList();
        }
        
        return result;
    }
    
    handleJoin(args, context) {
        if (args.length < 1) {
            context.addSystemMessage('❌ Kullanım: /join #kanal');
            return false;
        }
        
        let channelName = args[0];
        if (!channelName.startsWith('#')) {
            channelName = '#' + channelName;
        }
        
        const channelId = channelName.substring(1).toLowerCase().replace(/[^a-z0-9]/g, '_');
        const db = window.eliteChatDatabase;
        const channel = db.getChannel(channelId);
        
        if (!channel) {
            context.addSystemMessage(`❌ Kanal bulunamadı: ${channelName}`);
            return false;
        }
        
        // Kanala katıl
        channel.users.add(context.currentUser.id);
        context.addChannelTab(channel);
        context.switchChannel(channelId);
        context.addSystemMessage(`✅ ${channelName} kanalına katıldınız`);
        
        return true;
    }
    
    handleHelp(args, context) {
        const helpText = `
📋 IRC KOMUTLARI:

👤 GENEL KOMUTLAR:
/nick yeni_nick       - Kullanıcı adını değiştir
/join #kanal          - Kanala katıl
/leave                - Kanaldan ayrıl
/msg nick mesaj       - Özel mesaj gönder
/me eylem             - Eylem mesajı gönder
/who                  - Kanal kullanıcılarını listele
/clear                - Sohbeti temizle
/topic yeni_konu      - Kanal konusunu değiştir
/ping                 - Ping kontrolü
/time                 - Zamanı göster
/help                 - Bu yardımı göster
/quit                 - Çıkış yap

👮 YETKİLİ KOMUTLARI:
/kick nick            - Kullanıcıyı kanaldan at
/ban nick             - Kullanıcıyı kanaldan banla
/mute nick [süre]     - Kullanıcıyı sustur
/op nick              - Kullanıcıya OP yetkisi ver
/deop nick            - OP yetkisini al
/voice nick           - Kullanıcıya voice yetkisi ver
/devoice nick         - Voice yetkisini al
        `;
        
        helpText.trim().split('\n').forEach(line => {
            if (line.trim()) {
                context.addSystemMessage(line);
            }
        });
        
        return true;
    }
    
    // Diğer komut handler'ları...
    
    changeNick(oldUserId, newNick) {
        const cleanNick = newNick.replace(/[^a-zA-Z0-9._]/g, '');
        const newUserId = cleanNick.toLowerCase();
        
        if (newUserId === 'mate') {
            return false; // Mate bot nick'i
        }
        
        const db = window.eliteChatDatabase;
        
        if (db.getUser(newUserId) && newUserId !== oldUserId) {
            return false; // Nick zaten kullanılıyor
        }
        
        // Kullanıcıyı güncelle
        const user = db.getUser(oldUserId);
        if (!user) return false;
        
        const oldUserData = { ...user };
        
        // Yeni kullanıcı oluştur
        user.id = newUserId;
        user.name = cleanNick;
        user.avatar = cleanNick.charAt(0).toUpperCase();
        
        // Kanallardaki referansları güncelle
        db.channels.forEach(channel => {
            if (channel.users.has(oldUserId)) {
                channel.users.delete(oldUserId);
                channel.users.add(newUserId);
            }
        });
        
        // Veritabanında güncelle
        db.users.delete(oldUserId);
        db.users.set(newUserId, user);
        
        return true;
    }
}

// Global IRC sistemini başlat
window.ircCommandSystem = new IRCCommandSystem();