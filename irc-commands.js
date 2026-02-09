// EliteChat IRC Komut Sistemi
class IRCCommands {
    constructor() {
        this.commands = new Map();
        this.registerCommands();
    }
    
    // KOMUTLARI KAYDET
    registerCommands() {
        // ==================== GENEL KOMUTLAR ====================
        this.commands.set('/nick', {
            description: 'Kullanıcı adını değiştir',
            usage: '/nick yeni_nick',
            handler: this.cmdNick.bind(this),
            minArgs: 1
        });
        
        this.commands.set('/join', {
            description: 'Kanala katıl',
            usage: '/join #kanal',
            handler: this.cmdJoin.bind(this),
            minArgs: 1
        });
        
        this.commands.set('/leave', {
            description: 'Kanaldan ayrıl',
            usage: '/leave',
            handler: this.cmdLeave.bind(this)
        });
        
        this.commands.set('/msg', {
            description: 'Özel mesaj gönder',
            usage: '/msg nick mesaj',
            handler: this.cmdMsg.bind(this),
            minArgs: 2
        });
        
        this.commands.set('/me', {
            description: 'Eylem mesajı gönder',
            usage: '/me eylem',
            handler: this.cmdMe.bind(this),
            minArgs: 1
        });
        
        this.commands.set('/who', {
            description: 'Kanal kullanıcılarını listele',
            usage: '/who',
            handler: this.cmdWho.bind(this)
        });
        
        this.commands.set('/clear', {
            description: 'Sohbeti temizle',
            usage: '/clear',
            handler: this.cmdClear.bind(this)
        });
        
        this.commands.set('/topic', {
            description: 'Kanal konusunu değiştir',
            usage: '/topic yeni_konu',
            handler: this.cmdTopic.bind(this),
            minArgs: 1
        });
        
        this.commands.set('/help', {
            description: 'Yardım göster',
            usage: '/help [komut]',
            handler: this.cmdHelp.bind(this)
        });
        
        this.commands.set('/ping', {
            description: 'Ping kontrolü',
            usage: '/ping',
            handler: this.cmdPing.bind(this)
        });
        
        this.commands.set('/time', {
            description: 'Zamanı göster',
            usage: '/time',
            handler: this.cmdTime.bind(this)
        });
        
        this.commands.set('/quit', {
            description: 'Çıkış yap',
            usage: '/quit',
            handler: this.cmdQuit.bind(this)
        });
        
        // ==================== YETKİLİ KOMUTLARI ====================
        this.commands.set('/kick', {
            description: 'Kullanıcıyı kanaldan at',
            usage: '/kick nick [sebep]',
            handler: this.cmdKick.bind(this),
            minArgs: 1,
            requiresOp: true
        });
        
        this.commands.set('/ban', {
            description: 'Kullanıcıyı banla',
            usage: '/ban nick [sebep]',
            handler: this.cmdBan.bind(this),
            minArgs: 1,
            requiresOp: true
        });
        
        this.commands.set('/mute', {
            description: 'Kullanıcıyı sustur',
            usage: '/mute nick [dakika]',
            handler: this.cmdMute.bind(this),
            minArgs: 1,
            requiresOp: true
        });
        
        this.commands.set('/op', {
            description: 'OP yetkisi ver',
            usage: '/op nick',
            handler: this.cmdOp.bind(this),
            minArgs: 1,
            requiresOwner: true
        });
        
        this.commands.set('/voice', {
            description: 'Voice yetkisi ver',
            usage: '/voice nick',
            handler: this.cmdVoice.bind(this),
            minArgs: 1,
            requiresOp: true
        });
        
        this.commands.set('/admin', {
            description: 'Admin yetkisi ver',
            usage: '/admin nick',
            handler: this.cmdAdmin.bind(this),
            minArgs: 1,
            requiresOwner: true
        });
        
        // ==================== SAHİP KOMUTLARI ====================
        this.commands.set('/setpassword', {
            description: 'Kullanıcı şifresi belirle',
            usage: '/setpassword nick şifre',
            handler: this.cmdSetPassword.bind(this),
            minArgs: 2,
            requiresOwner: true
        });
        
        this.commands.set('/deleteuser', {
            description: 'Kullanıcıyı sil',
            usage: '/deleteuser nick',
            handler: this.cmdDeleteUser.bind(this),
            minArgs: 1,
            requiresOwner: true
        });
        
        this.commands.set('/globalban', {
            description: 'Global ban',
            usage: '/globalban nick',
            handler: this.cmdGlobalBan.bind(this),
            minArgs: 1,
            requiresOwner: true
        });
    }
    
    // KOMUT ÇALIŞTIR
    execute(command, args, context) {
        const cmd = this.commands.get(command.toLowerCase());
        if (!cmd) {
            context.showError(`Bilinmeyen komut: ${command}`);
            return false;
        }
        
        // Argüman kontrolü
        if (cmd.minArgs && args.length < cmd.minArgs) {
            context.showError(`Kullanım: ${cmd.usage}`);
            return false;
        }
        
        // Yetki kontrolü
        if (cmd.requiresOwner && context.currentUser?.role !== 'owner') {
            context.showError('Bu komut için owner yetkisi gerekli!');
            return false;
        }
        
        if (cmd.requiresOp && !this.hasOpPrivileges(context)) {
            context.showError('Bu komut için OP yetkisi gerekli!');
            return false;
        }
        
        // Komutu çalıştır
        return cmd.handler(args, context);
    }
    
    // ==================== KOMUT HANDLER'LARI ====================
    
    // /nick
    cmdNick(args, context) {
        const newNick = args[0];
        const db = window.eliteChatDB;
        
        if (newNick.toLowerCase() === 'mate') {
            context.showError('Mate nicki kullanılamaz!');
            return false;
        }
        
        const result = context.changeNick(newNick);
        if (result) {
            context.showMessage(`Nick değiştirildi: ${context.currentUser.name} → ${newNick}`);
            return true;
        }
        
        return false;
    }
    
    // /join
    cmdJoin(args, context) {
        let channelName = args[0];
        if (!channelName.startsWith('#')) {
            channelName = '#' + channelName;
        }
        
        const channelId = channelName.substring(1).toLowerCase().replace(/[^a-z0-9]/g, '_');
        const db = window.eliteChatDB;
        const channel = db.getChannel(channelId);
        
        if (!channel) {
            // Kanal yoksa oluştur (sadece yetkililer)
            if (context.currentUser?.role === 'owner' || context.currentUser?.role === 'admin') {
                const newChannel = db.createChannel(context.currentUser.id, channelName);
                if (newChannel) {
                    context.switchChannel(channelId);
                    context.showMessage(`Kanal oluşturuldu: ${channelName}`);
                    return true;
                }
            }
            context.showError(`Kanal bulunamadı: ${channelName}`);
            return false;
        }
        
        // Kanala katıl
        channel.users.add(context.currentUser.id);
        context.switchChannel(channelId);
        context.showMessage(`${channelName} kanalına katıldınız`);
        return true;
    }
    
    // /leave
    cmdLeave(args, context) {
        if (context.currentChannel === 'general') {
            context.showError('Genel kanaldan ayrılamazsınız!');
            return false;
        }
        
        const db = window.eliteChatDB;
        const channel = db.getChannel(context.currentChannel);
        
        if (channel) {
            channel.users.delete(context.currentUser.id);
            context.switchChannel('general');
            context.showMessage(`${channel.name} kanalından ayrıldınız`);
            return true;
        }
        
        return false;
    }
    
    // /msg
    cmdMsg(args, context) {
        const targetUser = args[0];
        const message = args.slice(1).join(' ');
        
        const db = window.eliteChatDB;
        const user = db.getUser(targetUser.toLowerCase());
        
        if (!user) {
            context.showError(`Kullanıcı bulunamadı: ${targetUser}`);
            return false;
        }
        
        if (user.id === context.currentUser.id) {
            context.showError('Kendinize mesaj gönderemezsiniz!');
            return false;
        }
        
        // PM gönder
        db.addPM(context.currentUser.id, user.id, message);
        context.openPM(user.id);
        context.showMessage(`${user.name} kişisine özel mesaj gönderildi`);
        return true;
    }
    
    // /me
    cmdMe(args, context) {
        const action = args.join(' ');
        const message = `* ${context.currentUser.name} ${action}`;
        
        const db = window.eliteChatDB;
        db.addMessage(context.currentChannel, context.currentUser.id, message);
        context.displayMessage(message, context.currentUser);
        return true;
    }
    
    // /who
    cmdWho(args, context) {
        const db = window.eliteChatDB;
        const channel = db.getChannel(context.currentChannel);
        
        if (!channel) return false;
        
        const users = Array.from(channel.users)
            .map(id => db.getUser(id))
            .filter(u => u)
            .sort((a, b) => {
                const roleOrder = { owner: 1, admin: 2, operator: 3, voice: 4, user: 5 };
                return (roleOrder[a.role] || 5) - (roleOrder[b.role] || 5);
            });
        
        let output = `👥 ${channel.name} (${users.length} kullanıcı):\n`;
        users.forEach(user => {
            const roleIcon = {
                owner: '👑', admin: '⭐', operator: '🛡️', voice: '🔊', user: '👤'
            }[user.role] || '👤';
            
            output += `${roleIcon} ${user.name} ${user.online ? '🟢' : '⚫'}\n`;
        });
        
        context.showMessage(output.trim());
        return true;
    }
    
    // /clear
    cmdClear(args, context) {
        context.clearChat();
        context.showMessage('Sohbet temizlendi');
        return true;
    }
    
    // /topic
    cmdTopic(args, context) {
        const newTopic = args.join(' ');
        const db = window.eliteChatDB;
        const channel = db.getChannel(context.currentChannel);
        
        if (!channel) return false;
        
        // Yetki kontrolü (sadece owner/admin/op)
        if (!this.hasOpPrivileges(context)) {
            context.showError('Kanal konusunu değiştirme yetkiniz yok!');
            return false;
        }
        
        const oldTopic = channel.topic;
        channel.topic = newTopic;
        db.saveToStorage();
        
        context.showMessage(`Kanal konusu değiştirildi: "${oldTopic}" → "${newTopic}"`);
        context.updateChannelInfo();
        return true;
    }
    
    // /help
    cmdHelp(args, context) {
        if (args.length > 0) {
            // Spesifik komut yardımı
            const cmdName = args[0].toLowerCase();
            const cmd = this.commands.get(cmdName);
            
            if (cmd) {
                let helpText = `📖 Komut: ${cmdName}\n`;
                helpText += `📝 Açıklama: ${cmd.description}\n`;
                helpText += `🔧 Kullanım: ${cmd.usage}\n`;
                
                if (cmd.requiresOwner) helpText += `⚠️  Gereken Yetki: Owner\n`;
                else if (cmd.requiresOp) helpText += `⚠️  Gereken Yetki: OP+\n`;
                
                context.showMessage(helpText);
            } else {
                context.showError(`Komut bulunamadı: ${cmdName}`);
            }
        } else {
            // Genel yardım
            let helpText = '📋 IRC KOMUTLARI:\n\n';
            helpText += '👤 GENEL KOMUTLAR:\n';
            
            // Kategorilere ayır
            const generalCmds = ['/nick', '/join', '/leave', '/msg', '/me', '/who', 
                                '/clear', '/topic', '/help', '/ping', '/time', '/quit'];
            
            const opCmds = ['/kick', '/ban', '/mute', '/voice'];
            const ownerCmds = ['/op', '/admin', '/setpassword', '/deleteuser', '/globalban'];
            
            generalCmds.forEach(cmdName => {
                const cmd = this.commands.get(cmdName);
                if (cmd) {
                    helpText += `${cmdName} - ${cmd.description}\n`;
                }
            });
            
            helpText += '\n👮 OP KOMUTLARI:\n';
            opCmds.forEach(cmdName => {
                const cmd = this.commands.get(cmdName);
                if (cmd) helpText += `${cmdName} - ${cmd.description}\n`;
            });
            
            helpText += '\n👑 OWNER KOMUTLARI:\n';
            ownerCmds.forEach(cmdName => {
                const cmd = this.commands.get(cmdName);
                if (cmd) helpText += `${cmdName} - ${cmd.description}\n`;
            });
            
            helpText += '\nℹ️  Detaylı yardım için: /help komut_adı';
            context.showMessage(helpText);
        }
        return true;
    }
    
    // /ping
    cmdPing(args, context) {
        context.showMessage('🏓 Pong!');
        return true;
    }
    
    // /time
    cmdTime(args, context) {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        const dateStr = now.toLocaleDateString('tr-TR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        context.showMessage(`🕒 ${timeStr}\n📅 ${dateStr}`);
        return true;
    }
    
    // /quit
    cmdQuit(args, context) {
        context.showMessage('👋 Çıkış yapılıyor...');
        setTimeout(() => {
            window.location.reload();
        }, 1000);
        return true;
    }
    
    // /kick
    cmdKick(args, context) {
        const targetNick = args[0];
        const reason = args.slice(1).join(' ') || 'Sebep belirtilmedi';
        
        const db = window.eliteChatDB;
        const channel = db.getChannel(context.currentChannel);
        
        if (!channel) return false;
        
        // Hedef kullanıcıyı bul
        const targetUser = Array.from(channel.users)
            .map(id => db.getUser(id))
            .find(u => u && u.name.toLowerCase() === targetNick.toLowerCase());
        
        if (!targetUser) {
            context.showError(`Kullanıcı bulunamadı: ${targetNick}`);
            return false;
        }
        
        // Kendini atamaz
        if (targetUser.id === context.currentUser.id) {
            context.showError('Kendinizi atamazsınız!');
            return false;
        }
        
        // Owner'ı atamaz
        if (targetUser.role === 'owner') {
            context.showError('Owner atılamaz!');
            return false;
        }
        
        // Yetki kontrolü (daha yüksek yetki atamaz)
        if (this.compareRoles(targetUser.role, context.currentUser.role) >= 0) {
            context.showError('Eşit veya daha yüksek yetkili kullanıcıyı atamazsınız!');
            return false;
        }
        
        // Kullanıcıyı kanaldan çıkar
        channel.users.delete(targetUser.id);
        db.saveToStorage();
        
        // Sistem mesajı
        const kickMessage = `👢 ${targetUser.name} kanaldan atıldı! Sebep: ${reason}`;
        db.addMessage(context.currentChannel, 'mate', kickMessage);
        context.displaySystemMessage(kickMessage);
        
        return true;
    }
    
    // /ban
    cmdBan(args, context) {
        // /kick benzeri, ban listesine ekler
        context.showMessage('Ban komutu yakında eklenecek');
        return false;
    }
    
    // /op
    cmdOp(args, context) {
        const targetNick = args[0];
        const db = window.eliteChatDB;
        const targetUser = db.getUser(targetNick.toLowerCase());
        
        if (!targetUser) {
            context.showError(`Kullanıcı bulunamadı: ${targetNick}`);
            return false;
        }
        
        // OP yetkisi ver
        targetUser.role = 'operator';
        db.saveToStorage();
        
        context.showMessage(`🛡️ ${targetUser.name} kullanıcısına OP yetkisi verildi`);
        return true;
    }
    
    // /admin
    cmdAdmin(args, context) {
        const targetNick = args[0];
        const db = window.eliteChatDB;
        const targetUser = db.getUser(targetNick.toLowerCase());
        
        if (!targetUser) {
            context.showError(`Kullanıcı bulunamadı: ${targetNick}`);
            return false;
        }
        
        // Admin yetkisi ver
        targetUser.role = 'admin';
        db.saveToStorage();
        
        context.showMessage(`⭐ ${targetUser.name} kullanıcısına Admin yetkisi verildi`);
        return true;
    }
    
    // /setpassword
    cmdSetPassword(args, context) {
        const targetNick = args[0];
        const password = args[1];
        
        const db = window.eliteChatDB;
        
        // Kullanıcıyı bul veya oluştur
        let user = db.getUser(targetNick.toLowerCase());
        if (!user) {
            // Yeni kullanıcı oluştur
            user = {
                id: targetNick.toLowerCase(),
                name: targetNick,
                role: 'user',
                online: false,
                avatar: targetNick.charAt(0).toUpperCase(),
                bio: '',
                registered: true
            };
            db.users.set(user.id, user);
        }
        
        // Şifreyi ayarla
        const result = db.registerUser(user.id, password, user);
        if (result) {
            context.showMessage(`🔐 ${targetNick} kullanıcısının şifresi ayarlandı`);
            return true;
        }
        
        return false;
    }
    
    // UTILITY FONKSİYONLAR
    hasOpPrivileges(context) {
        const user = context.currentUser;
        if (!user) return false;
        
        const opRoles = ['owner', 'admin', 'operator'];
        return opRoles.includes(user.role);
    }
    
    compareRoles(role1, role2) {
        const roleOrder = { owner: 4, admin: 3, operator: 2, voice: 1, user: 0 };
        return (roleOrder[role1] || 0) - (roleOrder[role2] || 0);
    }
    
    // Komut listesini al
    getCommandList() {
        return Array.from(this.commands.keys());
    }
    
    // Yeni komut ekle (runtime'da)
    addCommand(name, config) {
        this.commands.set(name, config);
    }
    
    // Komut sil
    removeCommand(name) {
        return this.commands.delete(name);
    }
}

// Global IRC sistemini başlat
window.ircCommands = new IRCCommands();
