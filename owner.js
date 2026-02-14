// ========== OWNER.JS - CETCETY Owner Özel Yetkileri ==========
console.log('%c👑 CETCETY Owner Sistemi başlatılıyor...', 'color: #ffd700; font-size: 16px; font-weight: bold;');

class CETCETYOwner {
    constructor() {
        this.ownerName = 'MateKy';
        this.ownerPassword = 'Sahi17407@SCM';
        console.log('%c✅ Owner sistemi hazır!', 'color: #4caf50;');
    }

    // ===== SİSTEM YÖNETİMİ =====
    systemShutdown() {
        this.broadcastToAllChannels('🔴 SİSTEM KAPANIYOR! 10 saniye...');
        setTimeout(() => {
            document.body.innerHTML = `
                <div style="
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100vh;
                    background: #000;
                    color: #ffd700;
                    font-size: 48px;
                ">
                    👑 SİSTEM BAKIMDA
                    <div style="font-size: 18px; color: #666; margin-top: 20px;">
                        Owner tarafından kapatıldı
                    </div>
                </div>
            `;
        }, 10000);
    }

    systemRestart() {
        this.broadcastToAllChannels('🔄 SİSTEM YENİDEN BAŞLATILIYOR...');
        setTimeout(() => {
            localStorage.clear();
            location.reload();
        }, 5000);
    }

    // ===== VERİTABANI YÖNETİMİ =====
    fullBackup() {
        const backup = {
            users: localStorage.getItem('cetcety_users'),
            channels: localStorage.getItem('cetcety_channels'),
            messages: localStorage.getItem('cetcety_channel_messages'),
            private: localStorage.getItem('cetcety_private_chats'),
            bans: localStorage.getItem('cetcety_bans'),
            admins: localStorage.getItem('cetcety_admins'),
            commands: localStorage.getItem('cetcety_custom_commands'),
            settings: localStorage.getItem('cetcety_settings'),
            timestamp: Date.now(),
            version: '2.0.0'
        };
        
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cetcety_full_backup_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.json`;
        a.click();
        
        this.log('💾 Tam yedek alındı');
    }

    fullRestore(backupData) {
        try {
            const backup = JSON.parse(backupData);
            
            localStorage.setItem('cetcety_users', backup.users);
            localStorage.setItem('cetcety_channels', backup.channels);
            localStorage.setItem('cetcety_channel_messages', backup.messages);
            localStorage.setItem('cetcety_private_chats', backup.private);
            localStorage.setItem('cetcety_bans', backup.bans);
            localStorage.setItem('cetcety_admins', backup.admins);
            localStorage.setItem('cetcety_custom_commands', backup.commands);
            localStorage.setItem('cetcety_settings', backup.settings);
            
            this.log('♻️ Sistem geri yüklendi!');
            setTimeout(() => location.reload(), 2000);
        } catch (e) {
            this.log('❌ Geri yükleme hatası: ' + e.message);
        }
    }

    // ===== KULLANICI İZLEME =====
    watchUser(username) {
        const watcher = {
            username: username,
            startedAt: Date.now(),
            watchedBy: this.ownerName
        };
        
        localStorage.setItem(`cetcety_watch_${username}`, JSON.stringify(watcher));
        
        // Tüm mesajları logla
        setInterval(() => {
            const privates = JSON.parse(localStorage.getItem('cetcety_private_chats')) || {};
            const channels = JSON.parse(localStorage.getItem('cetcety_channel_messages')) || {};
            
            console.log(`📡 ${username} aktiviteleri:`);
            console.log('Özel mesajlar:', privates);
            console.log('Kanal mesajları:', channels);
        }, 10000);
        
        this.log(`👁️ ${username} izlenmeye başlandı`);
    }

    // ===== SİSTEM AYARLARI =====
    setSystemSetting(key, value) {
        const settings = JSON.parse(localStorage.getItem('cetcety_settings')) || {};
        settings[key] = value;
        localStorage.setItem('cetcety_settings', JSON.stringify(settings));
        this.log(`⚙️ Sistem ayarı değiştirildi: ${key} = ${value}`);
    }

    // ===== YASAKLI KELİME YÖNETİMİ =====
    addBannedWord(word) {
        const banned = JSON.parse(localStorage.getItem('cetcety_banned_words')) || [];
        if (!banned.includes(word)) {
            banned.push(word);
            localStorage.setItem('cetcety_banned_words', JSON.stringify(banned));
            this.log(`🚫 Yasaklı kelime eklendi: ${word}`);
        }
    }

    removeBannedWord(word) {
        let banned = JSON.parse(localStorage.getItem('cetcety_banned_words')) || [];
        banned = banned.filter(w => w !== word);
        localStorage.setItem('cetcety_banned_words', JSON.stringify(banned));
        this.log(`✅ Yasaklı kelime kaldırıldı: ${word}`);
    }

    // ===== KANAL YÖNETİMİ =====
    deleteChannel(channelName) {
        const channels = JSON.parse(localStorage.getItem('cetcety_channels')) || {};
        
        if (channels[channelName]) {
            delete channels[channelName];
            localStorage.setItem('cetcety_channels', JSON.stringify(channels));
            this.log(`🗑️ #${channelName} kanalı silindi`);
        }
    }

    renameChannel(oldName, newName) {
        const channels = JSON.parse(localStorage.getItem('cetcety_channels')) || {};
        
        if (channels[oldName]) {
            channels[newName] = channels[oldName];
            channels[newName].name = newName;
            delete channels[oldName];
            localStorage.setItem('cetcety_channels', JSON.stringify(channels));
            this.log(`📝 #${oldName} → #${newName} olarak değiştirildi`);
        }
    }

    // ===== YARDIMCI FONKSİYONLAR =====
    broadcastToAllChannels(message) {
        const channels = JSON.parse(localStorage.getItem('cetcety_channels')) || {};
        const channelMessages = JSON.parse(localStorage.getItem('cetcety_channel_messages')) || {};
        
        Object.keys(channels).forEach(ch => {
            if (!channelMessages[ch]) channelMessages[ch] = [];
            channelMessages[ch].push({
                sender: '👑 SİSTEM',
                text: message,
                time: new Date().toLocaleTimeString('tr-TR'),
                timestamp: Date.now()
            });
        });
        
        localStorage.setItem('cetcety_channel_messages', JSON.stringify(channelMessages));
    }

    log(message) {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'system-message';
        msgDiv.innerHTML = `<i class="fas fa-crown" style="color: #ffd700;"></i> 👑 ${message}`;
        document.getElementById('messages')?.appendChild(msgDiv);
    }
}

// Global owner sistemini başlat
window.ownerSystem = new CETCETYOwner();