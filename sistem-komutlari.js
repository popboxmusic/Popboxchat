// ========== SİSTEM-KOMUTLARI.JS - CETCETY Profesyonel Sistem Komutları ==========
console.log('%c⚙️ CETCETY Sistem Komutları yükleniyor...', 'color: #ff0000; font-size: 14px; font-weight: bold;');

class CETCETYSystemCommands {
    constructor() {
        this.commands = this.loadCommands();
        console.log('%c✅ Sistem komutları hazır!', 'color: #4caf50;');
    }

    // ========== SİSTEM KOMUTLARI ==========
    loadCommands() {
        return [
            // ===== MEVCUT KOMUTLAR (DOKUNMA) =====
            {
                command: '/adminlist',
                description: 'Tüm adminleri listeler',
                usage: '/adminlist',
                category: 'admin',
                minRole: 'admin',
                function: (parts, user, channel) => {
                    const admins = JSON.parse(localStorage.getItem('cetcety_admins')) || [];
                    let list = '👑 YÖNETİCİLER:\n';
                    admins.forEach(a => {
                        list += `${a.role === 'owner' ? '👑' : '⚡'} ${a.name}\n`;
                    });
                    return list;
                }
            },
            {
                command: '/addadmin',
                description: 'Yeni admin ekler (Sadece Owner)',
                usage: '/addadmin kullanıcıadı',
                category: 'admin',
                minRole: 'owner',
                function: (parts, user, channel) => {
                    const newAdmin = parts[1];
                    if (!newAdmin) return 'Kullanım: /addadmin kullanıcıadı';
                    
                    const users = JSON.parse(localStorage.getItem('cetcety_users')) || [];
                    const userIndex = users.findIndex(u => u.name === newAdmin);
                    
                    if (userIndex === -1) return '❌ Kullanıcı bulunamadı';
                    
                    users[userIndex].role = 'admin';
                    users[userIndex].level = 4;
                    localStorage.setItem('cetcety_users', JSON.stringify(users));
                    
                    return `✅ ${newAdmin} admin yapıldı`;
                }
            },
            {
                command: '/removeadmin',
                description: 'Admin yetkisi alır (Sadece Owner)',
                usage: '/removeadmin kullanıcıadı',
                category: 'admin',
                minRole: 'owner',
                function: (parts, user, channel) => {
                    const admin = parts[1];
                    if (!admin) return 'Kullanım: /removeadmin kullanıcıadı';
                    
                    const users = JSON.parse(localStorage.getItem('cetcety_users')) || [];
                    const userIndex = users.findIndex(u => u.name === admin);
                    
                    if (userIndex === -1) return '❌ Kullanıcı bulunamadı';
                    
                    users[userIndex].role = 'user';
                    users[userIndex].level = 1;
                    localStorage.setItem('cetcety_users', JSON.stringify(users));
                    
                    return `✅ ${admin} admin yetkisi alındı`;
                }
            },
            {
                command: '/kanallar',
                description: 'Tüm kanalları listeler',
                usage: '/kanallar',
                category: 'kanal',
                minRole: 'user',
                function: (parts, user, channel) => {
                    const channels = JSON.parse(localStorage.getItem('cetcety_channels')) || {};
                    let list = '📢 KANALLAR:\n';
                    Object.values(channels).forEach(ch => {
                        const gizli = ch.isHidden ? '🔒' : '🔓';
                        const aktif = ch.onlineUsers?.length || 0;
                        list += `${gizli} #${ch.name} - ${aktif} çevrimiçi\n`;
                    });
                    return list;
                }
            },
            {
                command: '/kanalbilgi',
                description: 'Kanal detaylarını gösterir',
                usage: '/kanalbilgi #kanal',
                category: 'kanal',
                minRole: 'user',
                function: (parts, user, channel) => {
                    const channelName = parts[1]?.replace('#', '') || channel;
                    const channels = JSON.parse(localStorage.getItem('cetcety_channels')) || {};
                    const ch = channels[channelName];
                    
                    if (!ch) return '❌ Kanal bulunamadı';
                    
                    return `📊 #${channelName} BİLGİLERİ:\n` +
                           `👑 Sahip: ${ch.owner}\n` +
                           `📊 Abone: ${ch.subscribers?.toLocaleString() || 0}\n` +
                           `🟢 Çevrimiçi: ${ch.onlineUsers?.length || 0}\n` +
                           `🔒 Gizli: ${ch.isHidden ? 'Evet' : 'Hayır'}\n` +
                           `🎵 Video: ${ch.currentTitle || 'Yok'}`;
                }
            },
            {
                command: '/kullanıcılar',
                description: 'Çevrimiçi kullanıcıları listeler',
                usage: '/kullanıcılar',
                category: 'kullanıcı',
                minRole: 'user',
                function: (parts, user, channel) => {
                    const channels = JSON.parse(localStorage.getItem('cetcety_channels')) || {};
                    const currentCh = channels[channel];
                    
                    if (!currentCh) return '❌ Kanal bulunamadı';
                    
                    const users = currentCh.onlineUsers || [];
                    return `👥 #${channel} çevrimiçi (${users.length}):\n${users.join(', ')}`;
                }
            },
            {
                command: '/kullanıcıbilgi',
                description: 'Kullanıcı detaylarını gösterir',
                usage: '/kullanıcıbilgi kullanıcıadı',
                category: 'kullanıcı',
                minRole: 'user',
                function: (parts, user, channel) => {
                    const target = parts[1] || user.name;
                    const users = JSON.parse(localStorage.getItem('cetcety_users')) || [];
                    const u = users.find(u => u.name === target);
                    
                    if (!u) return '❌ Kullanıcı bulunamadı';
                    
                    return `👤 ${target} BİLGİLERİ:\n` +
                           `🎭 Rol: ${u.role || 'user'}\n` +
                           `📅 Katılım: ${new Date(u.joinDate).toLocaleDateString('tr-TR')}\n` +
                           `📺 Abonelik: ${u.subscribedChannels?.length || 0}`;
                }
            },
            {
                command: '/yasakla',
                description: 'Kullanıcıyı yasaklar (Admin+)',
                usage: '/yasakla kullanıcı [süre] [sebep]',
                category: 'ban',
                minRole: 'admin',
                function: (parts, user, channel) => {
                    const target = parts[1];
                    const duration = parts[2] || 'perm';
                    const reason = parts.slice(3).join(' ') || 'Belirtilmemiş';
                    
                    if (!target) return 'Kullanım: /yasakla kullanıcı [süre] [sebep]';
                    
                    const bans = JSON.parse(localStorage.getItem('cetcety_bans')) || {};
                    
                    let expiry = null;
                    if (duration === 'perm') {
                        expiry = 'permanent';
                    } else {
                        const days = parseInt(duration.replace('d', ''));
                        expiry = Date.now() + (days * 24 * 60 * 60 * 1000);
                    }
                    
                    bans[target] = {
                        username: target,
                        bannedBy: user.name,
                        reason: reason,
                        bannedAt: Date.now(),
                        expiry: expiry
                    };
                    
                    localStorage.setItem('cetcety_bans', JSON.stringify(bans));
                    
                    const channels = JSON.parse(localStorage.getItem('cetcety_channels')) || {};
                    Object.keys(channels).forEach(ch => {
                        if (channels[ch].onlineUsers?.includes(target)) {
                            channels[ch].onlineUsers = channels[ch].onlineUsers.filter(u => u !== target);
                        }
                    });
                    localStorage.setItem('cetcety_channels', JSON.stringify(channels));
                    
                    return `🚫 ${target} yasaklandı\n📝 Sebep: ${reason}\n⏱️ Süre: ${duration === 'perm' ? 'Süresiz' : duration}`;
                }
            },
            {
                command: '/yasakkaldır',
                description: 'Yasağı kaldırır',
                usage: '/yasakkaldır kullanıcı',
                category: 'ban',
                minRole: 'admin',
                function: (parts, user, channel) => {
                    const target = parts[1];
                    if (!target) return 'Kullanım: /yasakkaldır kullanıcı';
                    
                    const bans = JSON.parse(localStorage.getItem('cetcety_bans')) || {};
                    
                    if (bans[target]) {
                        delete bans[target];
                        localStorage.setItem('cetcety_bans', JSON.stringify(bans));
                        return `✅ ${target} yasağı kaldırıldı`;
                    }
                    
                    return `❌ ${target} için yasak bulunamadı`;
                }
            },
            {
                command: '/yasaklılar',
                description: 'Yasaklıları listeler',
                usage: '/yasaklılar',
                category: 'ban',
                minRole: 'admin',
                function: (parts, user, channel) => {
                    const bans = JSON.parse(localStorage.getItem('cetcety_bans')) || {};
                    
                    if (Object.keys(bans).length === 0) {
                        return '📭 Yasaklı kullanıcı yok';
                    }
                    
                    let list = '🚫 YASAKLILAR:\n';
                    Object.values(bans).forEach(ban => {
                        const kalan = ban.expiry === 'permanent' ? 'Süresiz' : 
                            Math.ceil((ban.expiry - Date.now()) / (1000 * 60 * 60 * 24)) + ' gün';
                        list += `${ban.username} - ${ban.reason} (${kalan})\n`;
                    });
                    
                    return list;
                }
            },
            {
                command: '/sistembilgi',
                description: 'Sistem bilgilerini gösterir',
                usage: '/sistembilgi',
                category: 'sistem',
                minRole: 'user',
                function: (parts, user, channel) => {
                    const users = JSON.parse(localStorage.getItem('cetcety_users')) || [];
                    const channels = JSON.parse(localStorage.getItem('cetcety_channels')) || {};
                    const admins = JSON.parse(localStorage.getItem('cetcety_admins')) || [];
                    
                    let totalOnline = 0;
                    Object.values(channels).forEach(ch => {
                        totalOnline += ch.onlineUsers?.length || 0;
                    });
                    
                    return `📊 SİSTEM BİLGİLERİ:\n` +
                           `👥 Toplam Kullanıcı: ${users.length}\n` +
                           `🟢 Çevrimiçi: ${totalOnline}\n` +
                           `📢 Kanal Sayısı: ${Object.keys(channels).length}\n` +
                           `👑 Yönetici: ${admins.length}\n` +
                           `💾 Versiyon: 2.0.0`;
                }
            },
            {
                command: '/istatistik',
                description: 'Kanal istatistiklerini gösterir',
                usage: '/istatistik',
                category: 'sistem',
                minRole: 'user',
                function: (parts, user, channel) => {
                    const channels = JSON.parse(localStorage.getItem('cetcety_channels')) || {};
                    const messages = JSON.parse(localStorage.getItem('cetcety_channel_messages')) || {};
                    
                    let totalMessages = 0;
                    Object.values(messages).forEach(msgs => {
                        totalMessages += msgs.length;
                    });
                    
                    return `📈 İSTATİSTİKLER:\n` +
                           `💬 Toplam Mesaj: ${totalMessages}\n` +
                           `🎵 Toplam Video: ${Object.values(channels).reduce((a, c) => a + (c.playlist?.length || 0), 0)}\n` +
                           `👍 Toplam Abone: ${Object.values(channels).reduce((a, c) => a + (c.subscribers || 0), 0)}`;
                }
            },
            {
                command: '/temizle',
                description: 'Sohbeti temizler (Co-Admin+)',
                usage: '/temizle',
                category: 'temizlik',
                minRole: 'coadmin',
                function: (parts, user, channel) => {
                    const messagesDiv = document.getElementById('messages');
                    if (messagesDiv) {
                        messagesDiv.innerHTML = '';
                        return '✅ Sohbet temizlendi';
                    }
                    return '❌ Sohbet bulunamadı';
                }
            },
            // ========== YENİ EKLENEN OWNER KOMUTLARI ==========
            // BU SATIRDAN İTİBAREN YENİ KOMUTLAR
            {
                command: '/sistemkapat',
                description: 'Sistemi kapatır (Sadece Owner)',
                usage: '/sistemkapat',
                category: 'owner',
                minRole: 'owner',
                function: (parts, user, channel) => {
                    if (!window.ownerSystem) {
                        return '❌ Owner sistemi bulunamadı! owner.js dosyasını kontrol et.';
                    }
                    window.ownerSystem.systemShutdown();
                    return '🔴 Sistem kapatılıyor... Tüm kanallara duyuru yapıldı.';
                }
            },
            {
                command: '/sistemyenile',
                description: 'Sistemi yeniden başlatır (Sadece Owner)',
                usage: '/sistemyenile',
                category: 'owner',
                minRole: 'owner',
                function: (parts, user, channel) => {
                    if (!window.ownerSystem) {
                        return '❌ Owner sistemi bulunamadı! owner.js dosyasını kontrol et.';
                    }
                    window.ownerSystem.systemRestart();
                    return '🔄 Sistem yeniden başlatılıyor... 5 saniye sonra yenilenecek.';
                }
            },
            {
                command: '/yedekal',
                description: 'Tam sistem yedeği alır (Sadece Owner)',
                usage: '/yedekal',
                category: 'owner',
                minRole: 'owner',
                function: (parts, user, channel) => {
                    if (!window.ownerSystem) {
                        return '❌ Owner sistemi bulunamadı! owner.js dosyasını kontrol et.';
                    }
                    window.ownerSystem.fullBackup();
                    return '💾 Yedek alınıyor... Dosya indirilecek.';
                }
            },
            {
                command: '/izle',
                description: 'Kullanıcıyı izlemeye başlar (Sadece Owner)',
                usage: '/izle kullanıcıadı',
                category: 'owner',
                minRole: 'owner',
                function: (parts, user, channel) => {
                    if (!window.ownerSystem) {
                        return '❌ Owner sistemi bulunamadı! owner.js dosyasını kontrol et.';
                    }
                    const target = parts[1];
                    if (!target) return 'Kullanım: /izle kullanıcıadı';
                    window.ownerSystem.watchUser(target);
                    return `👁️ ${target} izlenmeye başlandı. Tüm mesajları konsolda görünecek.`;
                }
            },
            {
                command: '/kanalsil',
                description: 'Kanalı tamamen siler (Sadece Owner)',
                usage: '/kanalsil #kanal',
                category: 'owner',
                minRole: 'owner',
                function: (parts, user, channel) => {
                    if (!window.ownerSystem) {
                        return '❌ Owner sistemi bulunamadı! owner.js dosyasını kontrol et.';
                    }
                    const channelName = parts[1]?.replace('#', '');
                    if (!channelName) return 'Kullanım: /kanalsil #kanal';
                    window.ownerSystem.deleteChannel(channelName);
                    return `🗑️ #${channelName} kanalı silindi.`;
                }
            },
            {
                command: '/kanaladdeğiştir',
                description: 'Kanal adını değiştirir (Sadece Owner)',
                usage: '/kanaladdeğiştir #eskiad #yeniad',
                category: 'owner',
                minRole: 'owner',
                function: (parts, user, channel) => {
                    if (!window.ownerSystem) {
                        return '❌ Owner sistemi bulunamadı! owner.js dosyasını kontrol et.';
                    }
                    const oldName = parts[1]?.replace('#', '');
                    const newName = parts[2]?.replace('#', '');
                    if (!oldName || !newName) return 'Kullanım: /kanaladdeğiştir #eskiad #yeniad';
                    window.ownerSystem.renameChannel(oldName, newName);
                    return `📝 #${oldName} → #${newName} olarak değiştirildi.`;
                }
            },
            {
                command: '/kelimeekle',
                description: 'Yasaklı kelime ekler (Sadece Owner)',
                usage: '/kelimeekle kelime',
                category: 'owner',
                minRole: 'owner',
                function: (parts, user, channel) => {
                    if (!window.ownerSystem) {
                        return '❌ Owner sistemi bulunamadı! owner.js dosyasını kontrol et.';
                    }
                    const word = parts[1];
                    if (!word) return 'Kullanım: /kelimeekle kelime';
                    window.ownerSystem.addBannedWord(word);
                    return `🚫 "${word}" yasaklı kelimelere eklendi.`;
                }
            },
            {
                command: '/kelimesil',
                description: 'Yasaklı kelime siler (Sadece Owner)',
                usage: '/kelimesil kelime',
                category: 'owner',
                minRole: 'owner',
                function: (parts, user, channel) => {
                    if (!window.ownerSystem) {
                        return '❌ Owner sistemi bulunamadı! owner.js dosyasını kontrol et.';
                    }
                    const word = parts[1];
                    if (!word) return 'Kullanım: /kelimesil kelime';
                    window.ownerSystem.removeBannedWord(word);
                    return `✅ "${word}" yasaklı kelimelerden çıkarıldı.`;
                }
            },
            {
                command: '/ayar',
                description: 'Sistem ayarı değiştirir (Sadece Owner)',
                usage: '/ayar anahtar değer',
                category: 'owner',
                minRole: 'owner',
                function: (parts, user, channel) => {
                    if (!window.ownerSystem) {
                        return '❌ Owner sistemi bulunamadı! owner.js dosyasını kontrol et.';
                    }
                    const key = parts[1];
                    const value = parts[2];
                    if (!key || !value) return 'Kullanım: /ayar anahtar değer';
                    window.ownerSystem.setSystemSetting(key, value);
                    return `⚙️ ${key} = ${value} olarak ayarlandı.`;
                }
            }
        ];
    }

    // ========== KOMUT ÇALIŞTIR ==========
    executeCommand(cmd, user, channel) {
        const parts = cmd.split(' ');
        const main = parts[0].toLowerCase();
        
        const command = this.commands.find(c => c.command === main);
        
        if (!command) return null;
        
        const roleLevel = {
            'owner': 5,
            'admin': 4,
            'coadmin': 3,
            'operator': 2,
            'user': 1
        };
        
        const userLevel = roleLevel[user?.role] || 1;
        const requiredLevel = roleLevel[command.minRole] || 1;
        
        if (userLevel < requiredLevel) {
            return `🚫 Bu komut için ${command.minRole} yetkisi gerekli!`;
        }
        
        try {
            return command.function(parts, user, channel);
        } catch (error) {
            console.error('Komut hatası:', error);
            return `❌ Komut çalıştırılamadı: ${error.message}`;
        }
    }

    // ========== YARDIM MENÜSÜ ==========
    getHelp(category = null) {
        if (category) {
            const catCommands = this.commands.filter(c => c.category === category);
            let help = `📋 ${category.toUpperCase()} KOMUTLARI:\n`;
            catCommands.forEach(c => {
                help += `${c.command} - ${c.description}\n   Kullanım: ${c.usage}\n`;
            });
            return help;
        }
        
        const categories = {};
        this.commands.forEach(c => {
            if (!categories[c.category]) categories[c.category] = [];
            categories[c.category].push(c);
        });
        
        let help = '📚 SİSTEM KOMUTLARI:\n\n';
        Object.keys(categories).forEach(cat => {
            help += `[${cat.toUpperCase()}]\n`;
            categories[cat].forEach(c => {
                help += `  ${c.command} - ${c.description}\n`;
            });
            help += '\n';
        });
        
        return help;
    }
}

// Global sistem komutlarını başlat
window.systemCommands = new CETCETYSystemCommands();