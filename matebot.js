// ========== MATEBOT.JS - CETCETY Bot Yöneticisi ==========
console.log('%c🤖 CETCETY MateBot başlatılıyor...', 'color: #ff0000; font-size: 14px; font-weight: bold;');

class CETCETYBot {
    constructor() {
        this.name = 'MateBot';
        this.role = 'bot';
        this.spamCount = new Map();
        this.lastMessageTime = new Map();
        this.customCommands = this.loadCustomCommands();
        console.log('%c✅ MateBot hazır!', 'color: #4caf50; font-size: 12px;');
    }

    // ========== ÖZEL KOMUTLAR ==========
    loadCustomCommands() {
        return JSON.parse(localStorage.getItem('cetcety_custom_commands')) || [];
    }

    saveCustomCommands() {
        localStorage.setItem('cetcety_custom_commands', JSON.stringify(this.customCommands));
    }

    // Yeni komut ekle (SADECE OWNER)
    addCustomCommand(user, cmd, response) {
        // Owner kontrolü
        if (user?.role !== 'owner') {
            this.addSystemMessage('🚫 Sadece OWNER özel komut ekleyebilir!');
            return false;
        }

        if (!cmd.startsWith('/')) cmd = '/' + cmd;
        
        this.customCommands.push({ 
            command: cmd, 
            response: response,
            addedBy: user.name,
            addedAt: Date.now()
        });
        
        this.saveCustomCommands();
        this.addSystemMessage(`✅ Yeni komut eklendi: ${cmd} → ${response}`);
        return true;
    }

    // Komut sil (SADECE OWNER)
    removeCustomCommand(user, cmd) {
        if (user?.role !== 'owner') {
            this.addSystemMessage('🚫 Sadece OWNER komut silebilir!');
            return false;
        }

        const index = this.customCommands.findIndex(c => c.command === cmd);
        if (index > -1) {
            const removed = this.customCommands[index];
            this.customCommands.splice(index, 1);
            this.saveCustomCommands();
            this.addSystemMessage(`🗑️ Komut silindi: ${removed.command}`);
            return true;
        }
        return false;
    }

    // Özel komutları listele
    listCustomCommands() {
        if (this.customCommands.length === 0) {
            return '📭 Hiç özel komut yok';
        }
        return this.customCommands.map(c => `${c.command} → ${c.response}`).join('\n');
    }

    // ========== SPAM KORUMASI ==========
    checkSpam(user) {
        if (!user) return false;
        
        const now = Date.now();
        const userId = user.id;
        const last = this.lastMessageTime.get(userId) || 0;
        const count = this.spamCount.get(userId) || 0;

        if (now - last < 3000) {
            this.spamCount.set(userId, count + 1);
            if (count >= 2) {
                this.addSystemMessage(`⚠️ ${user.name}, lütfen spam yapma! 10 saniye beklemelisin.`);
                return true; // Spam yapıyor
            }
        } else {
            this.spamCount.set(userId, 0);
        }
        
        this.lastMessageTime.set(userId, now);
        return false; // Spam yok
    }

    // ========== KOMUT İŞLEYİCİ ==========
    handleCommand(cmd, user, channel) {
        const parts = cmd.substring(1).split(' ');
        const main = parts[0].toLowerCase();

        // Özel komutları kontrol et
        const customCmd = this.customCommands.find(c => c.command === '/' + main || c.command === main);
        if (customCmd) {
            this.addSystemMessage(`🤖 ${customCmd.response}`);
            return;
        }

        // YERLEŞİK KOMUTLAR (Owner/Admin korumalı)
        switch(main) {
            // ===== YARDIM =====
            case 'help':
                this.showHelp(user);
                break;

            // ===== SADECE OWNER KOMUTLARI =====
            case 'addcmd':
                if (user?.role !== 'owner') {
                    this.addSystemMessage('🚫 Bu komut sadece OWNER içindir!');
                    return;
                }
                const cmdName = parts[1];
                const cmdResponse = parts.slice(2).join(' ');
                if (cmdName && cmdResponse) {
                    this.addCustomCommand(user, cmdName, cmdResponse);
                } else {
                    this.addSystemMessage('Kullanım: /addcmd komut_adı yanıt_mesajı');
                }
                break;

            case 'delcmd':
                if (user?.role !== 'owner') {
                    this.addSystemMessage('🚫 Bu komut sadece OWNER içindir!');
                    return;
                }
                const delCmd = parts[1];
                if (delCmd) {
                    this.removeCustomCommand(user, delCmd);
                } else {
                    this.addSystemMessage('Kullanım: /delcmd komut_adı');
                }
                break;

            case 'listcmd':
                if (user?.role !== 'owner') {
                    this.addSystemMessage('🚫 Bu komut sadece OWNER içindir!');
                    return;
                }
                this.addSystemMessage(`📋 Özel Komutlar:\n${this.listCustomCommands()}`);
                break;

            // ===== ADMIN/OWNER KOMUTLARI =====
            case 'kick':
                if (user?.role !== 'owner' && user?.role !== 'admin') {
                    this.addSystemMessage('🚫 Bu komut için admin/owner yetkisi gerekli!');
                    return;
                }
                this.kickUser(parts[1], channel, user);
                break;

            case 'ban':
                if (user?.role !== 'owner' && user?.role !== 'admin') {
                    this.addSystemMessage('🚫 Bu komut için admin/owner yetkisi gerekli!');
                    return;
                }
                this.banUser(parts[1], user);
                break;

            case 'unban':
                if (user?.role !== 'owner' && user?.role !== 'admin') {
                    this.addSystemMessage('🚫 Bu komut için admin/owner yetkisi gerekli!');
                    return;
                }
                this.unbanUser(parts[1]);
                break;

            // ===== HERKESİN KULLANABİLDİĞİ KOMUTLAR =====
            case 'users':
                this.showUsers(channel);
                break;

            case 'ping':
                this.addSystemMessage('🏓 Pong!');
                break;

            case 'temizle':
            case 'clear':
                if (user?.role === 'owner' || user?.role === 'admin' || user?.role === 'coadmin') {
                    this.clearChat();
                } else {
                    this.addSystemMessage('🚫 Sohbeti temizleme yetkiniz yok!');
                }
                break;

            default:
                this.addSystemMessage(`❌ Bilinmeyen komut: ${cmd}`);
        }
    }

    // ===== KOMUT FONKSİYONLARI =====
    showHelp(user) {
        let help = '📋 MATEBOT KOMUTLARI:\n\n';
        
        // Herkesin kullanabildiği komutlar
        help += '👤 HERKES İÇİN:\n';
        help += '/users - Çevrimiçi kullanıcılar\n';
        help += '/ping - Bot test\n\n';

        // Co-admin komutları
        if (user?.role === 'coadmin' || user?.role === 'admin' || user?.role === 'owner') {
            help += '🔧 CO-ADMIN KOMUTLARI:\n';
            help += '/kick kullanıcı - Kanaldan at\n';
            help += '/temizle - Sohbeti temizle\n\n';
        }

        // Admin komutları
        if (user?.role === 'admin' || user?.role === 'owner') {
            help += '⚡ ADMIN KOMUTLARI:\n';
            help += '/ban kullanıcı - 24 saat yasakla\n';
            help += '/unban kullanıcı - Yasağı kaldır\n\n';
        }

        // Owner komutları
        if (user?.role === 'owner') {
            help += '👑 OWNER KOMUTLARI:\n';
            help += '/addcmd komut yanıt - Özel komut ekle\n';
            help += '/delcmd komut - Komut sil\n';
            help += '/listcmd - Tüm özel komutları listele\n';
        }

        // Özel komutlar varsa göster
        if (this.customCommands.length > 0) {
            help += '\n🎯 ÖZEL KOMUTLAR:\n';
            this.customCommands.forEach(cmd => {
                help += `${cmd.command} - ${cmd.response}\n`;
            });
        }

        this.addSystemMessage(help);
    }

    kickUser(target, channel, admin) {
        if (!target) {
            this.addSystemMessage('Kullanım: /kick kullanıcı');
            return;
        }

        const channels = JSON.parse(localStorage.getItem('cetcety_channels')) || {};
        const ch = channels[channel];
        
        if (!ch || !ch.onlineUsers.includes(target)) {
            this.addSystemMessage(`❌ ${target} kanalda değil.`);
            return;
        }

        ch.onlineUsers = ch.onlineUsers.filter(u => u !== target);
        localStorage.setItem('cetcety_channels', JSON.stringify(channels));
        
        this.addSystemMessage(`👢 ${target} kanaldan atıldı (${admin.name} tarafından).`);
        this.sendToAdmin(`⚠️ ${admin.name}, ${target}'i #${channel} kanalından attı.`);
    }

    banUser(target, admin) {
        if (!target) {
            this.addSystemMessage('Kullanım: /ban kullanıcı');
            return;
        }

        const users = JSON.parse(localStorage.getItem('cetcety_users')) || [];
        const user = users.find(u => u.name === target);
        
        if (!user) {
            this.addSystemMessage('❌ Kullanıcı bulunamadı.');
            return;
        }

        const blocks = JSON.parse(localStorage.getItem('cetcety_blocks')) || {};
        const blockKey = `${admin.id}_${target}`;
        
        blocks[blockKey] = {
            userId: user.id,
            userName: target,
            expiry: Date.now() + 24*60*60*1000,
            blockedBy: admin.id
        };
        
        localStorage.setItem('cetcety_blocks', JSON.stringify(blocks));
        this.addSystemMessage(`🚫 ${target} 24 saat yasaklandı (${admin.name} tarafından).`);
        
        // Kanaldan çıkar
        const channels = JSON.parse(localStorage.getItem('cetcety_channels')) || {};
        Object.keys(channels).forEach(ch => {
            if (channels[ch].onlineUsers?.includes(target)) {
                channels[ch].onlineUsers = channels[ch].onlineUsers.filter(u => u !== target);
            }
        });
        localStorage.setItem('cetcety_channels', JSON.stringify(channels));
    }

    unbanUser(target) {
        if (!target) {
            this.addSystemMessage('Kullanım: /unban kullanıcı');
            return;
        }

        const blocks = JSON.parse(localStorage.getItem('cetcety_blocks')) || {};
        let found = false;

        Object.keys(blocks).forEach(key => {
            if (blocks[key].userName === target) {
                delete blocks[key];
                found = true;
            }
        });

        if (found) {
            localStorage.setItem('cetcety_blocks', JSON.stringify(blocks));
            this.addSystemMessage(`✅ ${target} yasağı kaldırıldı.`);
        } else {
            this.addSystemMessage(`❌ ${target} için yasak bulunamadı.`);
        }
    }

    showUsers(channel) {
        const channels = JSON.parse(localStorage.getItem('cetcety_channels')) || {};
        const ch = channels[channel];
        
        if (!ch) return;
        
        const list = ch.onlineUsers?.filter(u => u !== this.name).join(', ') || 'Hiç kimse';
        this.addSystemMessage(`👥 #${channel} çevrimiçi: ${list}`);
    }

    clearChat() {
        const messagesDiv = document.getElementById('messages');
        if (messagesDiv) {
            messagesDiv.innerHTML = '';
            this.addSystemMessage('✅ Sohbet temizlendi!');
        }
    }

    // ========== YASAKLI KELİME KONTROLÜ ==========
    checkBannedWords(text) {
        if (!text) return false;
        
        const bannedWords = JSON.parse(localStorage.getItem('cetcety_banned_words')) || 
                           ['spam', 'reklam', 'şiddet', 'hakaret'];
        
        const lower = text.toLowerCase();
        for (let word of bannedWords) {
            if (lower.includes(word.toLowerCase())) return word;
        }
        return false;
    }

    // ========== SİSTEM MESAJI ==========
    addSystemMessage(text) {
        const messagesDiv = document.getElementById('messages');
        if (!messagesDiv) return;
        
        const msgDiv = document.createElement('div');
        msgDiv.className = 'system-message';
        msgDiv.innerHTML = `<i class="fas fa-info-circle"></i> 🤖 ${this.escapeHTML(text)}`;
        messagesDiv.appendChild(msgDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    sendToAdmin(text) {
        this.addSystemMessage(`📢 ${text}`);
    }

    escapeHTML(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Global bot'u başlat
window.MateBot = new CETCETYBot();

// Storage değişikliklerini dinle
window.addEventListener('storage', (e) => {
    if (e.key === 'cetcety_custom_commands') {
        window.MateBot.customCommands = JSON.parse(e.newValue) || [];
    }
});