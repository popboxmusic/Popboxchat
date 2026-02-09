// ==================== VERİTABANI SİSTEMİ ====================
class Database {
    constructor() {
        this.initializeDatabase();
        this.loadData();
    }

    initializeDatabase() {
        if (!localStorage.getItem('elitechat_users')) {
            localStorage.setItem('elitechat_users', JSON.stringify({}));
        }
        if (!localStorage.getItem('elitechat_channels')) {
            const defaultChannels = {
                general: {
                    id: 'general',
                    name: '#Genel',
                    owner: 'mate',
                    type: 'public',
                    topic: 'EliteChat Hoş Geldiniz',
                    users: ['mate'],
                    operators: ['mate'],
                    voices: [],
                    bans: {},
                    mutes: {},
                    slowmode: 0,
                    locked: false,
                    userLimit: 0,
                    messages: [],
                    video: { 
                        id: 'jfKfPfyJRdk', 
                        title: 'Lofi Hip Hop Radio 📚',
                        channel: 'Genel'
                    }
                }
            };
            localStorage.setItem('elitechat_channels', JSON.stringify(defaultChannels));
        }
        if (!localStorage.getItem('elitechat_private_messages')) {
            localStorage.setItem('elitechat_private_messages', JSON.stringify({}));
        }
        if (!localStorage.getItem('elitechat_registered_users')) {
            const ownerPass = this.hashPassword('kumsal07@');
            const registeredUsers = {
                'mate': {
                    password: ownerPass,
                    role: 'owner',
                    bio: 'Sistem Sahibi',
                    joinDate: new Date().toISOString(),
                    lastSeen: new Date().toISOString(),
                    avatar: 'M'
                }
            };
            localStorage.setItem('elitechat_registered_users', JSON.stringify(registeredUsers));
        }
        if (!localStorage.getItem('elitechat_custom_commands')) {
            localStorage.setItem('elitechat_custom_commands', JSON.stringify({}));
        }
        if (!localStorage.getItem('elitechat_media_logs')) {
            localStorage.setItem('elitechat_media_logs', JSON.stringify([]));
        }
    }

    loadData() {
        this.users = JSON.parse(localStorage.getItem('elitechat_users') || '{}');
        this.channels = JSON.parse(localStorage.getItem('elitechat_channels') || '{}');
        this.privateMessages = JSON.parse(localStorage.getItem('elitechat_private_messages') || '{}');
        this.registeredUsers = JSON.parse(localStorage.getItem('elitechat_registered_users') || '{}');
        this.customCommands = JSON.parse(localStorage.getItem('elitechat_custom_commands') || '{}');
        this.mediaLogs = JSON.parse(localStorage.getItem('elitechat_media_logs') || '[]');
        this.onlineUsers = new Set();
        this.userChannels = new Map();
        this.globalBans = new Set();
        this.globalMutes = new Set();
    }

    saveData() {
        localStorage.setItem('elitechat_users', JSON.stringify(this.users));
        localStorage.setItem('elitechat_channels', JSON.stringify(this.channels));
        localStorage.setItem('elitechat_private_messages', JSON.stringify(this.privateMessages));
        localStorage.setItem('elitechat_registered_users', JSON.stringify(this.registeredUsers));
        localStorage.setItem('elitechat_custom_commands', JSON.stringify(this.customCommands));
        localStorage.setItem('elitechat_media_logs', JSON.stringify(this.mediaLogs));
    }

    hashPassword(password) {
        if (!password) return '';
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return 'hashed_' + Math.abs(hash).toString(36);
    }

    // Kullanıcı işlemleri
    addUser(user) {
        this.users[user.id] = user;
        this.saveData();
        return user;
    }

    updateUser(userId, updates) {
        if (this.users[userId]) {
            this.users[userId] = { ...this.users[userId], ...updates };
            this.saveData();
        }
    }

    getUser(userId) {
        return this.users[userId];
    }

    getOnlineUsers() {
        return Object.values(this.users).filter(u => u.online && !u.invisible);
    }

    // Kanal işlemleri
    createChannel(channelData) {
        const channelId = channelData.name.substring(1).toLowerCase().replace(/[^a-z0-9]/g, '_');
        
        if (this.channels[channelId]) {
            return null;
        }

        const newChannel = {
            id: channelId,
            name: channelData.name,
            owner: channelData.owner,
            type: channelData.type || 'public',
            topic: channelData.topic || 'Yeni sohbet kanalı',
            users: [channelData.owner, 'mate'],
            operators: [],
            voices: [],
            bans: {},
            mutes: {},
            slowmode: 0,
            locked: false,
            userLimit: 0,
            messages: [],
            video: {
                id: 'jfKfPfyJRdk',
                title: 'Lofi Hip Hop Radio 📚',
                channel: channelData.name.replace('#', '')
            }
        };

        this.channels[channelId] = newChannel;
        this.saveData();
        return newChannel;
    }

    updateChannel(channelId, updates) {
        if (this.channels[channelId]) {
            this.channels[channelId] = { ...this.channels[channelId], ...updates };
            this.saveData();
        }
    }

    deleteChannel(channelId) {
        if (channelId !== 'general') {
            delete this.channels[channelId];
            this.saveData();
            return true;
        }
        return false;
    }

    // Mesaj işlemleri
    addMessage(channelId, message) {
        if (this.channels[channelId]) {
            if (!this.channels[channelId].messages) {
                this.channels[channelId].messages = [];
            }
            this.channels[channelId].messages.push(message);
            
            // Son 200 mesajı tut
            if (this.channels[channelId].messages.length > 200) {
                this.channels[channelId].messages = this.channels[channelId].messages.slice(-200);
            }
            
            this.saveData();
        }
    }

    deleteMessage(channelId, messageId) {
        const channel = this.channels[channelId];
        if (channel && channel.messages) {
            const index = channel.messages.findIndex(m => m.id === messageId);
            if (index > -1) {
                channel.messages.splice(index, 1);
                this.saveData();
                return true;
            }
        }
        return false;
    }

    // Özel mesaj işlemleri
    addPrivateMessage(pmKey, message) {
        if (!this.privateMessages[pmKey]) {
            this.privateMessages[pmKey] = [];
        }
        this.privateMessages[pmKey].push(message);
        
        // Son 100 mesajı tut
        if (this.privateMessages[pmKey].length > 100) {
            this.privateMessages[pmKey] = this.privateMessages[pmKey].slice(-100);
        }
        
        this.saveData();
        return message;
    }

    getPrivateMessages(user1, user2) {
        const pmKey = [user1, user2].sort().join('_');
        return this.privateMessages[pmKey] || [];
    }

    getAllPrivateMessages() {
        return this.privateMessages;
    }

    // Kayıtlı kullanıcı işlemleri
    registerUser(username, password, role = 'user') {
        const userId = username.toLowerCase();
        if (this.registeredUsers[userId]) {
            return null;
        }

        this.registeredUsers[userId] = {
            password: this.hashPassword(password),
            role: role,
            bio: '',
            joinDate: new Date().toISOString(),
            lastSeen: new Date().toISOString(),
            avatar: username.charAt(0).toUpperCase()
        };

        this.saveData();
        return this.registeredUsers[userId];
    }

    authenticateUser(username, password) {
        const userId = username.toLowerCase();
        const user = this.registeredUsers[userId];
        
        if (user && user.password === this.hashPassword(password)) {
            return user;
        }
        return null;
    }

    // Medya logları
    addMediaLog(log) {
        this.mediaLogs.unshift(log);
        if (this.mediaLogs.length > 100) {
            this.mediaLogs = this.mediaLogs.slice(0, 100);
        }
        this.saveData();
    }

    getMediaLogs() {
        return this.mediaLogs;
    }

    // Özel komutlar
    addCustomCommand(name, code) {
        this.customCommands[name] = code;
        this.saveData();
        return true;
    }

    deleteCustomCommand(name) {
        if (this.customCommands[name]) {
            delete this.customCommands[name];
            this.saveData();
            return true;
        }
        return false;
    }

    getCustomCommands() {
        return this.customCommands;
    }

    // Yedekleme
    createBackup() {
        const backup = {
            users: this.users,
            channels: this.channels,
            registeredUsers: this.registeredUsers,
            privateMessages: this.privateMessages,
            customCommands: this.customCommands,
            timestamp: new Date().toISOString()
        };
        return JSON.stringify(backup);
    }

    restoreBackup(backupData) {
        try {
            const backup = JSON.parse(backupData);
            
            this.users = backup.users || {};
            this.channels = backup.channels || {};
            this.registeredUsers = backup.registeredUsers || {};
            this.privateMessages = backup.privateMessages || {};
            this.customCommands = backup.customCommands || {};
            
            this.saveData();
            return true;
        } catch (e) {
            console.error('Yedek yükleme hatası:', e);
            return false;
        }
    }

    // Temizleme
    clearChannelMessages(channelId) {
        if (this.channels[channelId]) {
            this.channels[channelId].messages = [];
            this.saveData();
        }
    }

    clearAllMessages() {
        Object.keys(this.channels).forEach(channelId => {
            this.channels[channelId].messages = [];
        });
        this.saveData();
    }
}

// Global database instance
window.elitechatDB = new Database();
