// ==================== IRC KOMUT SİSTEMİ ====================
class IRCCommands {
    constructor(client) {
        this.client = client;
        this.db = window.elitechatDB;
        this.customCommands = this.db.getCustomCommands();
    }

    execute(fullCommand) {
        const parts = fullCommand.split(' ');
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1);
        
        // Özel komutları kontrol et
        if (this.customCommands[cmd]) {
            try {
                eval(this.customCommands[cmd]);
                return true;
            } catch (e) {
                this.client.addSystemMessage(`❌ Özel komut hatası: ${e.message}`);
                return false;
            }
        }

        // Standart komutlar
        const commands = {
            // ========== GENEL KOMUTLAR (Herkes) ==========
            '/nick': () => {
                if (args.length >= 1) this.changeNick(args[0]);
                else this.client.addSystemMessage('❌ Kullanım: /nick yeni_nick');
            },
            
            '/join': () => {
                if (args.length >= 1) {
                    let channelName = args[0];
                    if (!channelName.startsWith('#')) channelName = '#' + channelName;
                    this.joinChannel(channelName);
                } else {
                    this.client.addSystemMessage('❌ Kullanım: /join #kanal');
                }
            },
            
            '/leave': () => this.leaveChannel(),
            
            '/msg': () => {
                if (args.length >= 2) {
                    const target = args[0];
                    const message = args.slice(1).join(' ');
                    this.client.sendPrivateMessage(target.toLowerCase(), message);
                } else {
                    this.client.addSystemMessage('❌ Kullanım: /msg nick mesaj');
                }
            },
            
            '/me': () => {
                if (args.length >= 1) {
                    const action = args.join(' ');
                    this.client.sendChannelMessage(`* ${this.client.currentUser.name} ${action}`);
                } else {
                    this.client.addSystemMessage('❌ Kullanım: /me eylem');
                }
            },
            
            '/who': () => this.listChannelUsers(),
            
            '/whois': () => {
                if (args.length >= 1) {
                    this.showUserInfo(args[0]);
                } else {
                    this.client.addSystemMessage('❌ Kullanım: /whois nick');
                }
            },
            
            '/clear': () => this.client.clearChat(),
            
            // ========== OPERATOR (MOD) KOMUTLARI ==========
            '/sil': () => {
                if (args.length >= 1) {
                    this.deleteMessage(args[0]);
                } else {
                    this.client.addSystemMessage('❌ Kullanım: /sil mesajID');
                }
            },
            
            '/kick': () => {
                if (args.length >= 1) {
                    const reason = args.slice(1).join(' ') || 'Sebep belirtilmedi';
                    this.kickUser(args[0], reason);
                } else {
                    this.client.addSystemMessage('❌ Kullanım: /kick nick [sebep]');
                }
            },
            
            '/mute': () => {
                if (args.length >= 2) {
                    const duration = parseInt(args[1]);
                    const reason = args.slice(2).join(' ') || 'Sebep belirtilmedi';
                    this.muteUser(args[0], duration, reason);
                } else {
                    this.client.addSystemMessage('❌ Kullanım: /mute nick süre [sebep]');
                }
            },
            
            '/unmute': () => {
                if (args.length >= 1) {
                    this.unmuteUser(args[0]);
                } else {
                    this.client.addSystemMessage('❌ Kullanım: /unmute nick');
                }
            },
            
            '/warn': () => {
                if (args.length >= 2) {
                    const reason = args.slice(1).join(' ');
                    this.warnUser(args[0], reason);
                } else {
                    this.client.addSystemMessage('❌ Kullanım: /warn nick sebep');
                }
            },
            
            '/topic': () => {
                if (args.length >= 1) {
                    this.changeTopic(args.join(' '));
                } else {
                    this.client.addSystemMessage('❌ Kullanım: /topic yeni_konu');
                }
            },
            
            '/slowmode': () => {
                if (args.length >= 1) {
                    const seconds = parseInt(args[0]);
                    this.setSlowmode(seconds);
                } else {
                    this.client.addSystemMessage('❌ Kullanım: /slowmode saniye');
                }
            },
            
            '/unslow': () => this.setSlowmode(0),
            
            '/lock': () => this.lockChannel(),
            
            '/unlock': () => this.unlockChannel(),
            
            // ========== COADMIN KOMUTLARI ==========
            '/ban': () => {
                if (args.length >= 2) {
                    const duration = parseInt(args[1]);
                    const reason = args.slice(2).join(' ') || 'Sebep belirtilmedi';
                    this.banUser(args[0], duration, reason);
                } else {
                    this.client.addSystemMessage('❌ Kullanım: /ban nick süre [sebep]');
                }
            },
            
            '/unban': () => {
                if (args.length >= 1) {
                    this.unbanUser(args[0]);
                } else {
                    this.client.addSystemMessage('❌ Kullanım: /unban nick');
                }
            },
            
            '/op': () => {
                if (args.length >= 1) {
                    this.setOperator(args[0], true);
                } else {
                    this.client.addSystemMessage('❌ Kullanım: /op nick');
                }
            },
            
            '/deop': () => {
                if (args.length >= 1) {
                    this.setOperator(args[0], false);
                } else {
                    this.client.addSystemMessage('❌ Kullanım: /deop nick');
                }
            },
            
            '/voice': () => {
                if (args.length >= 1) {
                    this.setVoice(args[0], true);
                } else {
                    this.client.addSystemMessage('❌ Kullanım: /voice nick');
                }
            },
            
            '/devoice': () => {
                if (args.length >= 1) {
                    this.setVoice(args[0], false);
                } else {
                    this.client.addSystemMessage('❌ Kullanım: /devoice nick');
                }
            },
            
            '/clearall': () => this.clearAllMessages(),
            
            '/limit': () => {
                if (args.length >= 1) {
                    const limit = parseInt(args[0]);
                    this.setUserLimit(limit);
                } else {
                    this.client.addSystemMessage('❌ Kullanım: /limit sayı');
                }
            },
            
            '/unlimit': () => this.setUserLimit(0),
            
            // ========== ADMIN KOMUTLARI ==========
            '/gban': () => {
                if (args.length >= 2) {
                    const duration = parseInt(args[1]);
                    const reason = args.slice(2).join(' ') || 'Sebep belirtilmedi';
                    this.globalBan(args[0], duration, reason);
                } else {
                    this.client.addSystemMessage('❌ Kullanım: /gban nick süre [sebep]');
                }
            },
            
            '/gunban': () => {
                if (args.length >= 1) {
                    this.globalUnban(args[0]);
                } else {
                    this.client.addSystemMessage('❌ Kullanım: /gunban nick');
                }
            },
            
            '/gmute': () => {
                if (args.length >= 2) {
                    const duration = parseInt(args[1]);
                    const reason = args.slice(2).join(' ') || 'Sebep belirtilmedi';
                    this.globalMute(args[0], duration, reason);
                } else {
                    this.client.addSystemMessage('❌ Kullanım: /gmute nick süre [sebep]');
                }
            },
            
            '/gunmute': () => {
                if (args.length >= 1) {
                    this.globalUnmute(args[0]);
                } else {
                    this.client.addSystemMessage('❌ Kullanım: /gunmute nick');
                }
            },
            
            '/kanalsil': () => {
                if (args.length >= 1) {
                    let channelName = args[0];
                    if (!channelName.startsWith('#')) channelName = '#' + channelName;
                    this.deleteChannel(channelName);
                } else {
                    this.client.addSystemMessage('❌ Kullanım: /kanalsil #kanal');
                }
            },
            
            '/kanalkilit': () => {
                if (args.length >= 1) {
                    let channelName = args[0];
                    if (!channelName.startsWith('#')) channelName = '#' + channelName;
                    this.lockChannelGlobal(channelName);
                } else {
                    this.client.addSystemMessage('❌ Kullanım: /kanalkilit #kanal');
                }
            },
            
            '/kanalac': () => {
                if (args.length >= 1) {
                    let channelName = args[0];
                    if (!channelName.startsWith('#')) channelName = '#' + channelName;
                    this.unlockChannelGlobal(channelName);
                } else {
                    this.client.addSystemMessage('❌ Kullanım: /kanalac #kanal');
                }
            },
            
            '/yetki': () => {
                if (args.length >= 3) {
                    const action = args[0];
                    const nick = args[1];
                    const role = args[2];
                    
                    if (action === 'ver') {
                        this.grantRole(nick, role);
                    } else if (action === 'al') {
                        this.revokeRole(nick);
                    } else {
                        this.client.addSystemMessage('❌ Kullanım: /yetki ver|al nick role');
                    }
                } else {
                    this.client.addSystemMessage('❌ Kullanım: /yetki ver nick operator|coadmin');
                }
            },
            
            '/duyuru': () => {
                if (args.length >= 1) {
                    this.broadcast(args.join(' '));
                } else {
                    this.client.addSystemMessage('❌ Kullanım: /duyuru mesaj');
                }
            },
            
            '/log': () => {
                if (args.length >= 1) {
                    this.showUserLogs(args[0]);
                } else {
                    this.client.addSystemMessage('❌ Kullanım: /log nick');
                }
            },
            
            // ========== SİSTEM KOMUTLARI ==========
            '/help': () => this.showHelp(),
            '/ping': () => this.client.addSystemMessage('🏓 Pong!'),
            '/time': () => this.client.addSystemMessage(`🕒 ${new Date().toLocaleString('tr-TR')}`),
            '/quit': () => this.client.quit()
        };

        if (commands[cmd]) {
            // Yetki kontrolü
            if (!this.checkPermission(cmd, args)) {
                this.client.addSystemMessage('❌ Bu komutu kullanma yetkiniz yok!');
                return false;
            }
            
            commands[cmd]();
            return true;
        } else {
            this.client.addSystemMessage(`❌ Bilinmeyen komut: ${cmd}. /help yazarak yardım alın.`);
            return false;
        }
    }

    checkPermission(cmd, args) {
        const user = this.client.currentUser;
        const channel = this.db.channels[this.client.currentChannel];
        
        if (!user) return false;
        
        // Owner her şeyi yapabilir
        if (user.role === 'owner') return true;
        
        // Admin komutları
        const adminCommands = ['/gban', '/gunban', '/gmute', '/gunmute', '/kanalsil', 
                              '/kanalkilit', '/kanalac', '/yetki', '/duyuru', '/log'];
        
        if (adminCommands.includes(cmd)) {
            return user.role === 'admin';
        }
        
        // Coadmin komutları
        const coadminCommands = ['/ban', '/unban', '/op', '/deop', '/voice', '/devoice',
                                '/clearall', '/limit', '/unlimit'];
        
        if (coadminCommands.includes(cmd)) {
            if (user.role === 'admin') return true;
            if (user.role === 'coadmin' && channel && channel.owner === user.id) return true;
            return false;
        }
        
        // Operator komutları
        const operatorCommands = ['/sil', '/kick', '/mute', '/unmute', '/warn', '/topic',
                                 '/slowmode', '/unslow', '/lock', '/unlock'];
        
        if (operatorCommands.includes(cmd)) {
            if (user.role === 'admin') return true;
            if (user.role === 'coadmin' && channel && channel.owner === user.id) return true;
            if (channel && channel.operators && channel.operators.includes(user.id)) return true;
            return false;
        }
        
        // Genel komutlar - herkes kullanabilir
        const generalCommands = ['/nick', '/join', '/leave', '/msg', '/me', '/who', 
                                '/whois', '/clear', '/help', '/ping', '/time', '/quit'];
        
        if (generalCommands.includes(cmd)) {
            return true;
        }
        
        return false;
    }

    // Komut implementasyonları
    changeNick(newNick) {
        this.client.changeNick(newNick);
    }

    joinChannel(channelName) {
        this.client.joinChannel(channelName);
    }

    leaveChannel() {
        this.client.leaveChannel();
    }

    listChannelUsers() {
        const channel = this.db.channels[this.client.currentChannel];
        if (!channel) return;
        
        const users = channel.users.map(id => this.db.users[id]).filter(u => u);
        
        let message = `👥 ${channel.name} Kullanıcıları (${users.length}):\n`;
        users.forEach(user => {
            const displayName = user.id === 'mate' ? '🤖Mate' : user.name;
            message += `• ${displayName} ${this.getRoleBadge(user.role)}\n`;
        });
        
        this.client.addSystemMessage(message);
    }

    showUserInfo(nick) {
        const userId = nick.toLowerCase();
        const user = this.db.users[userId];
        
        if (!user) {
            this.client.addSystemMessage(`❌ Kullanıcı bulunamadı: ${nick}`);
            return;
        }
        
        const regInfo = this.db.registeredUsers[userId];
        const displayName = user.id === 'mate' ? '🤖Mate' : user.name;
        
        let info = `👤 ${displayName} Kullanıcı Bilgisi:\n`;
        info += `• Rol: ${user.role}\n`;
        info += `• Durum: ${user.online ? '🟢 Çevrimiçi' : '⚫ Çevrimdışı'}\n`;
        
        if (regInfo) {
            const joinDate = new Date(regInfo.joinDate);
            const lastSeen = new Date(regInfo.lastSeen);
            info += `• Kayıtlı: ${joinDate.toLocaleDateString('tr-TR')}\n`;
            info += `• Son Görülme: ${lastSeen.toLocaleString('tr-TR')}\n`;
            if (regInfo.bio) info += `• Bio: ${regInfo.bio}\n`;
        }
        
        this.client.addSystemMessage(info);
    }

    deleteMessage(messageId) {
        const deleted = this.db.deleteMessage(this.client.currentChannel, messageId);
        if (deleted) {
            this.client.addSystemMessage('✅ Mesaj silindi');
            this.client.reloadMessages();
        } else {
            this.client.addSystemMessage('❌ Mesaj bulunamadı veya silinemedi');
        }
    }

    kickUser(nick, reason) {
        const userId = nick.toLowerCase();
        const channel = this.db.channels[this.client.currentChannel];
        
        if (!channel || !channel.users.includes(userId)) {
            this.client.addSystemMessage(`❌ Kullanıcı bu kanalda değil: ${nick}`);
            return;
        }
        
        // Sahibi ve owner'ı atamaz
        if (userId === channel.owner || userId === 'mate') {
            this.client.addSystemMessage('❌ Bu kullanıcıyı atamazsınız!');
            return;
        }
        
        const index = channel.users.indexOf(userId);
        if (index > -1) {
            channel.users.splice(index, 1);
            this.db.updateChannel(this.client.currentChannel, { users: channel.users });
            
            this.client.addSystemMessage(`👢 ${nick} kanaldan atıldı. Sebep: ${reason}`);
            this.client.updateOnlineList();
        }
    }

    muteUser(nick, duration, reason) {
        const userId = nick.toLowerCase();
        const channel = this.db.channels[this.client.currentChannel];
        
        if (!channel || !channel.users.includes(userId)) {
            this.client.addSystemMessage(`❌ Kullanıcı bu kanalda değil: ${nick}`);
            return;
        }
        
        if (userId === channel.owner || userId === 'mate') {
            this.client.addSystemMessage('❌ Bu kullanıcıyı susturamazsınız!');
            return;
        }
        
        const muteEnd = new Date();
        muteEnd.setMinutes(muteEnd.getMinutes() + duration);
        
        if (!channel.mutes) channel.mutes = {};
        channel.mutes[userId] = {
            endTime: muteEnd.toISOString(),
            reason: reason,
            by: this.client.currentUser.id
        };
        
        this.db.updateChannel(this.client.currentChannel, { mutes: channel.mutes });
        
        this.client.addSystemMessage(`🔇 ${nick} ${duration} dakika susturuldu. Sebep: ${reason}`);
    }

    unmuteUser(nick) {
        const userId = nick.toLowerCase();
        const channel = this.db.channels[this.client.currentChannel];
        
        if (channel && channel.mutes && channel.mutes[userId]) {
            delete channel.mutes[userId];
            this.db.updateChannel(this.client.currentChannel, { mutes: channel.mutes });
            
            this.client.addSystemMessage(`🔊 ${nick} susturması kaldırıldı`);
        } else {
            this.client.addSystemMessage(`❌ ${nick} susturulmamış`);
        }
    }

    warnUser(nick, reason) {
        const userId = nick.toLowerCase();
        this.client.addSystemMessage(`⚠️ ${nick} uyarıldı. Sebep: ${reason}`);
        
        // Mate bot'a bilgi ver
        if (window.mateBot) {
            window.mateBot.sendSecurityAlert(
                `${this.client.currentUser.name}, ${nick} kullanıcısını uyardı. Sebep: ${reason}`,
                this.client.currentChannel
            );
        }
    }

    changeTopic(newTopic) {
        this.client.changeTopic(newTopic);
    }

    setSlowmode(seconds) {
        const channel = this.db.channels[this.client.currentChannel];
        if (channel) {
            channel.slowmode = seconds;
            this.db.updateChannel(this.client.currentChannel, { slowmode: seconds });
            
            if (seconds > 0) {
                this.client.addSystemMessage(`⏱️ Yavaş mod aktif: ${seconds} saniye`);
            } else {
                this.client.addSystemMessage(`⏱️ Yavaş mod kaldırıldı`);
            }
        }
    }

    lockChannel() {
        const channel = this.db.channels[this.client.currentChannel];
        if (channel) {
            channel.locked = true;
            this.db.updateChannel(this.client.currentChannel, { locked: true });
            this.client.addSystemMessage('🔒 Kanal kilitlendi');
        }
    }

    unlockChannel() {
        const channel = this.db.channels[this.client.currentChannel];
        if (channel) {
            channel.locked = false;
            this.db.updateChannel(this.client.currentChannel, { locked: false });
            this.client.addSystemMessage('🔓 Kanal kilidi açıldı');
        }
    }

    banUser(nick, duration, reason) {
        const userId = nick.toLowerCase();
        const channel = this.db.channels[this.client.currentChannel];
        
        if (!channel || !channel.users.includes(userId)) {
            this.client.addSystemMessage(`❌ Kullanıcı bu kanalda değil: ${nick}`);
            return;
        }
        
        if (userId === channel.owner || userId === 'mate') {
            this.client.addSystemMessage('❌ Bu kullanıcıyı banlayamazsınız!');
            return;
        }
        
        const banEnd = new Date();
        banEnd.setHours(banEnd.getHours() + duration);
        
        if (!channel.bans) channel.bans = {};
        channel.bans[userId] = {
            endTime: banEnd.toISOString(),
            reason: reason,
            by: this.client.currentUser.id
        };
        
        // Kullanıcıyı kanaldan çıkar
        const index = channel.users.indexOf(userId);
        if (index > -1) {
            channel.users.splice(index, 1);
        }
        
        this.db.updateChannel(this.client.currentChannel, { 
            bans: channel.bans,
            users: channel.users
        });
        
        this.client.addSystemMessage(`🚫 ${nick} ${duration} saat banlandı. Sebep: ${reason}`);
        this.client.updateOnlineList();
    }

    unbanUser(nick) {
        const userId = nick.toLowerCase();
        const channel = this.db.channels[this.client.currentChannel];
        
        if (channel && channel.bans && channel.bans[userId]) {
            delete channel.bans[userId];
            this.db.updateChannel(this.client.currentChannel, { bans: channel.bans });
            
            this.client.addSystemMessage(`✅ ${nick} banı kaldırıldı`);
        } else {
            this.client.addSystemMessage(`❌ ${nick} banlı değil`);
        }
    }

    setOperator(nick, isOp) {
        const userId = nick.toLowerCase();
        const channel = this.db.channels[this.client.currentChannel];
        
        if (!channel) return;
        
        if (!channel.operators) channel.operators = [];
        
        if (isOp) {
            if (!channel.operators.includes(userId)) {
                channel.operators.push(userId);
                this.client.addSystemMessage(`⭐ ${nick} operator yapıldı`);
            }
        } else {
            const index = channel.operators.indexOf(userId);
            if (index > -1) {
                channel.operators.splice(index, 1);
                this.client.addSystemMessage(`⭐ ${nick} operatorluktan alındı`);
            }
        }
        
        this.db.updateChannel(this.client.currentChannel, { operators: channel.operators });
        this.client.updateOnlineList();
    }

    setVoice(nick, hasVoice) {
        const userId = nick.toLowerCase();
        const channel = this.db.channels[this.client.currentChannel];
        
        if (!channel) return;
        
        if (!channel.voices) channel.voices = [];
        
        if (hasVoice) {
            if (!channel.voices.includes(userId)) {
                channel.voices.push(userId);
                this.client.addSystemMessage(`🎤 ${nick} voice verildi`);
            }
        } else {
            const index = channel.voices.indexOf(userId);
            if (index > -1) {
                channel.voices.splice(index, 1);
                this.client.addSystemMessage(`🎤 ${nick} voice alındı`);
            }
        }
        
        this.db.updateChannel(this.client.currentChannel, { voices: channel.voices });
        this.client.updateOnlineList();
    }

    clearAllMessages() {
        const channel = this.db.channels[this.client.currentChannel];
        if (channel) {
            channel.messages = [];
            this.db.updateChannel(this.client.currentChannel, { messages: [] });
            this.client.clearChat();
            this.client.addSystemMessage('✅ Tüm mesajlar temizlendi');
        }
    }

    setUserLimit(limit) {
        const channel = this.db.channels[this.client.currentChannel];
        if (channel) {
            channel.userLimit = limit;
            this.db.updateChannel(this.client.currentChannel, { userLimit: limit });
            
            if (limit > 0) {
                this.client.addSystemMessage(`👥 Kullanıcı limiti: ${limit}`);
            } else {
                this.client.addSystemMessage(`👥 Kullanıcı limiti kaldırıldı`);
            }
        }
    }

    globalBan(nick, duration, reason) {
        const userId = nick.toLowerCase();
        const user = this.db.users[userId];
        
        if (!user) {
            this.client.addSystemMessage(`❌ Kullanıcı bulunamadı: ${nick}`);
            return;
        }
        
        if (user.role === 'owner' || userId === 'mate') {
            this.client.addSystemMessage('❌ Bu kullanıcıyı global banlayamazsınız!');
            return;
        }
        
        const banEnd = new Date();
        banEnd.setHours(banEnd.getHours() + duration);
        
        this.db.globalBans.add(userId);
        
        // Tüm kanallardan at
        Object.values(this.db.channels).forEach(channel => {
            if (channel.users && channel.users.includes(userId)) {
                const index = channel.users.indexOf(userId);
                if (index > -1) {
                    channel.users.splice(index, 1);
                }
            }
            
            if (!channel.bans) channel.bans = {};
            channel.bans[userId] = {
                endTime: banEnd.toISOString(),
                reason: reason,
                by: this.client.currentUser.id,
                global: true
            };
        });
        
        this.db.saveData();
        this.client.addSystemMessage(`🌍 ${nick} global banlandı (${duration} saat). Sebep: ${reason}`);
        this.client.updateOnlineList();
    }

    globalUnban(nick) {
        const userId = nick.toLowerCase();
        this.db.globalBans.delete(userId);
        
        // Tüm kanallardan banı kaldır
        Object.values(this.db.channels).forEach(channel => {
            if (channel.bans && channel.bans[userId]) {
                delete channel.bans[userId];
            }
        });
        
        this.db.saveData();
        this.client.addSystemMessage(`✅ ${nick} global banı kaldırıldı`);
    }

    globalMute(nick, duration, reason) {
        const userId = nick.toLowerCase();
        const user = this.db.users[userId];
        
        if (!user) {
            this.client.addSystemMessage(`❌ Kullanıcı bulunamadı: ${nick}`);
            return;
        }
        
        if (user.role === 'owner' || userId === 'mate') {
            this.client.addSystemMessage('❌ Bu kullanıcıyı global susturamazsınız!');
            return;
        }
        
        const muteEnd = new Date();
        muteEnd.setHours(muteEnd.getHours() + duration);
        
        this.db.globalMutes.add(userId);
        
        this.client.addSystemMessage(`🔇 ${nick} global susturuldu (${duration} saat). Sebep: ${reason}`);
    }

    globalUnmute(nick) {
        const userId = nick.toLowerCase();
        this.db.globalMutes.delete(userId);
        this.client.addSystemMessage(`🔊 ${nick} global susturması kaldırıldı`);
    }

    deleteChannel(channelName) {
        const channelId = channelName.substring(1).toLowerCase().replace(/[^a-z0-9]/g, '_');
        
        if (channelId === 'general') {
            this.client.addSystemMessage('❌ Genel kanalı silemezsiniz!');
            return;
        }
        
        const deleted = this.db.deleteChannel(channelId);
        if (deleted) {
            this.client.addSystemMessage(`🗑️ ${channelName} kanalı silindi`);
            
            // Sekmeyi kaldır
            const tab = document.querySelector(`.channel-tab[data-channel="${channelId}"]`);
            if (tab) tab.remove();
            
            // Eğer o kanaldaysak genel kanala geç
            if (this.client.currentChannel === channelId) {
                this.client.switchChannel('general');
            }
        } else {
            this.client.addSystemMessage(`❌ Kanal bulunamadı: ${channelName}`);
        }
    }

    lockChannelGlobal(channelName) {
        const channelId = channelName.substring(1).toLowerCase().replace(/[^a-z0-9]/g, '_');
        const channel = this.db.channels[channelId];
        
        if (channel) {
            channel.locked = true;
            this.db.updateChannel(channelId, { locked: true });
            this.client.addSystemMessage(`🔒 ${channelName} kilitlendi`);
        }
    }

    unlockChannelGlobal(channelName) {
        const channelId = channelName.substring(1).toLowerCase().replace(/[^a-z0-9]/g, '_');
        const channel = this.db.channels[channelId];
        
        if (channel) {
            channel.locked = false;
            this.db.updateChannel(channelId, { locked: false });
            this.client.addSystemMessage(`🔓 ${channelName} kilidi açıldı`);
        }
    }

    grantRole(nick, role) {
        const userId = nick.toLowerCase();
        const user = this.db.users[userId];
        
        if (!user) {
            this.client.addSystemMessage(`❌ Kullanıcı bulunamadı: ${nick}`);
            return;
        }
        
        const validRoles = ['operator', 'coadmin'];
        if (!validRoles.includes(role)) {
            this.client.addSystemMessage(`❌ Geçersiz rol: ${role}. Sadece: operator, coadmin`);
            return;
        }
        
        user.role = role;
        this.db.updateUser(userId, { role: role });
        
        // Registered users'ı da güncelle
        if (this.db.registeredUsers[userId]) {
            this.db.registeredUsers[userId].role = role;
            this.db.saveData();
        }
        
        this.client.addSystemMessage(`✅ ${nick} kullanıcısına ${role} rolü verildi`);
        this.client.updateOnlineList();
    }

    revokeRole(nick) {
        const userId = nick.toLowerCase();
        const user = this.db.users[userId];
        
        if (!user) {
            this.client.addSystemMessage(`❌ Kullanıcı bulunamadı: ${nick}`);
            return;
        }
        
        user.role = 'user';
        this.db.updateUser(userId, { role: 'user' });
        
        // Registered users'ı da güncelle
        if (this.db.registeredUsers[userId]) {
            this.db.registeredUsers[userId].role = 'user';
            this.db.saveData();
        }
        
        this.client.addSystemMessage(`✅ ${nick} kullanıcısının rolleri alındı`);
        this.client.updateOnlineList();
    }

    broadcast(message) {
        // Tüm kanallara mesaj gönder
        Object.keys(this.db.channels).forEach(channelId => {
            const broadcastMsg = {
                id: 'broadcast_' + Date.now(),
                type: 'system',
                userId: 'system',
                text: `📢 DUYURU: ${message}`,
                time: new Date(),
                channel: channelId
            };
            
            this.db.addMessage(channelId, broadcastMsg);
        });
        
        this.client.addSystemMessage(`📢 Duyuru gönderildi: ${message}`);
    }

    showUserLogs(nick) {
        const userId = nick.toLowerCase();
        const logs = [];
        
        // Mesaj logları
        Object.values(this.db.channels).forEach(channel => {
            if (channel.messages) {
                channel.messages.forEach(msg => {
                    if (msg.userId === userId) {
                        logs.push({
                            type: 'message',
                            channel: channel.name,
                            text: msg.text,
                            time: new Date(msg.time)
                        });
                    }
                });
            }
        });
        
        // PM logları
        Object.values(this.db.privateMessages).forEach(pmArray => {
            pmArray.forEach(pm => {
                if (pm.from === userId || pm.to === userId) {
                    logs.push({
                        type: 'pm',
                        with: pm.from === userId ? pm.to : pm.from,
                        text: pm.text,
                        time: new Date(pm.time)
                    });
                }
            });
        });
        
        if (logs.length === 0) {
            this.client.addSystemMessage(`📊 ${nick} için log bulunamadı`);
            return;
        }
        
        // Son 10 log'u göster
        const recentLogs = logs.sort((a, b) => b.time - a.time).slice(0, 10);
        
        let logMessage = `📊 ${nick} Logları (Son 10):\n`;
        recentLogs.forEach(log => {
            const timeStr = log.time.toLocaleTimeString('tr-TR');
            if (log.type === 'message') {
                logMessage += `• [${timeStr}] ${log.channel}: ${log.text.substring(0, 30)}...\n`;
            } else {
                logMessage += `• [${timeStr}] PM with ${log.with}: ${log.text.substring(0, 30)}...\n`;
            }
        });
        
        this.client.addSystemMessage(logMessage);
    }

    showHelp() {
        const user = this.client.currentUser;
        let helpText = `📋 IRC KOMUTLARI:\n\n`;
        
        // Genel komutlar
        helpText += `👤 GENEL KOMUTLAR (Herkes):\n`;
        helpText += `/nick yeni_nick       - Kullanıcı adını değiştir\n`;
        helpText += `/join #kanal          - Kanala katıl\n`;
        helpText += `/leave                - Kanaldan ayrıl\n`;
        helpText += `/msg nick mesaj       - Özel mesaj gönder\n`;
        helpText += `/me eylem             - Eylem mesajı gönder\n`;
        helpText += `/who                  - Kanal kullanıcılarını listele\n`;
        helpText += `/whois nick           - Kullanıcı bilgisi göster\n`;
        helpText += `/clear                - Sohbeti temizle\n`;
        helpText += `/topic yeni_konu      - Kanal konusunu değiştir\n`;
        helpText += `/ping                 - Ping kontrolü\n`;
        helpText += `/time                 - Zamanı göster\n`;
        helpText += `/help                 - Bu yardımı göster\n`;
        helpText += `/quit                 - Çıkış yap\n\n`;
        
        // Operator komutları
        if (user.role === 'operator' || user.role === 'coadmin' || user.role === 'admin' || user.role === 'owner') {
            helpText += `🛡️ OPERATOR KOMUTLARI:\n`;
            helpText += `/sil mesajID        - Mesaj sil\n`;
            helpText += `/kick nick [sebep]  - Kullanıcıyı at\n`;
            helpText += `/mute nick süre [sebep] - Kullanıcıyı sustur\n`;
            helpText += `/unmute nick        - Susturmayı kaldır\n`;
            helpText += `/warn nick sebep    - Uyarı ver\n`;
            helpText += `/topic yazı         - Kanal konusunu değiştir\n`;
            helpText += `/slowmode saniye    - Yavaş mod ayarla\n`;
            helpText += `/unslow             - Yavaş modu kaldır\n`;
            helpText += `/lock               - Kanali kilitle\n`;
            helpText += `/unlock             - Kanal kilidini aç\n\n`;
        }
        
        // Coadmin komutları
        if (user.role === 'coadmin' || user.role === 'admin' || user.role === 'owner') {
            helpText += `⭐ COADMIN KOMUTLARI:\n`;
            helpText += `/ban nick süre [sebep] - Kullanıcıyı banla\n`;
            helpText += `/unban nick        - Banı kaldır\n`;
            helpText += `/op nick           - Operator yap\n`;
            helpText += `/deop nick         - Operatorlukten al\n`;
            helpText += `/voice nick        - Voice ver\n`;
            helpText += `/devoice nick      - Voice al\n`;
            helpText += `/clearall          - Tüm mesajları temizle\n`;
            helpText += `/limit sayı        - Kullanıcı limiti koy\n`;
            helpText += `/unlimit           - Kullanıcı limitini kaldır\n\n`;
        }
        
        // Admin komutları
        if (user.role === 'admin' || user.role === 'owner') {
            helpText += `👑 ADMIN KOMUTLARI:\n`;
            helpText += `/gban nick süre [sebep] - Global ban\n`;
            helpText += `/gunban nick       - Global banı kaldır\n`;
            helpText += `/gmute nick süre [sebep] - Global sustur\n`;
            helpText += `/gunmute nick      - Global susturmayı kaldır\n`;
            helpText += `/kanalsil #kanal   - Kanal sil\n`;
            helpText += `/kanalkilit #kanal - Kanal kilitle\n`;
            helpText += `/kanalac #kanal    - Kanal kilidini aç\n`;
            helpText += `/yetki ver nick operator|coadmin - Yetki ver\n`;
            helpText += `/yetki al nick     - Yetki al\n`;
            helpText += `/duyuru mesaj      - Herkese duyuru gönder\n`;
            helpText += `/log nick          - Kullanıcı loglarını göster\n\n`;
        }
        
        // Owner komutları
        if (user.role === 'owner') {
            helpText += `👑 OWNER KOMUTLARI:\n`;
            helpText += `/komutekle komut => kod - Özel komut ekle\n`;
            helpText += `/komutsil komut     - Özel komut sil\n`;
            helpText += `/komutlar           - Özel komutları listele\n`;
            helpText += `/panel              - Owner panelini aç\n`;
            helpText += `/herkes mesaj       - Tüm kanallara mesaj at\n`;
            helpText += `/resetkanal #kanal  - Kanalı sıfırla\n`;
            helpText += `/resetchat          - Tüm sohbetleri temizle\n`;
            helpText += `/resetyetkiler      - Tüm yetkileri sıfırla\n`;
            helpText += `/yedekal            - Yedek al\n`;
            helpText += `/yukle              - Yedekten yükle\n`;
        }
        
        helpText.split('\n').forEach(line => {
            if (line.trim()) {
                this.client.addSystemMessage(line);
            }
        });
    }

    getRoleBadge(role) {
        const badges = {
            'owner': '<span class="role-badge role-owner">O</span>',
            'admin': '<span class="role-badge role-admin">A</span>',
            'coadmin': '<span class="role-badge role-coadmin">C</span>',
            'operator': '<span class="role-badge role-operator">OP</span>',
            'voice': '<span class="role-badge role-voice">V</span>'
        };
        return badges[role] || '';
    }
}

// Global instance
window.IRCCommands = IRCCommands;
