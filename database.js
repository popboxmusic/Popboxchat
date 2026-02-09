// EliteChat Veritabanı Sistemi
class EliteChatDatabase {
    constructor() {
        this.users = new Map();
        this.channels = new Map();
        this.privateMessages = new Map();
        this.registeredUsers = new Map();
        this.onlineUsers = new Set();
        this.globalBans = new Set();
        this.globalMutes = new Set();
        
        this.initializeDatabase();
    }
    
    initializeDatabase() {
        // Mate Bot'u ekle
        this.addUser({
            id: 'mate',
            name: '🤖Mate',
            role: 'owner',
            registered: true,
            online: true,
            invisible: false,
            avatar: 'M',
            bio: 'Güvenlik Botu',
            joinDate: new Date().toISOString(),
            lastSeen: new Date().toISOString()
        });
        
        // Genel kanalı oluştur
        this.createChannel({
            id: 'general',
            name: '#Genel',
            owner: 'mate',
            type: 'public',
            topic: 'EliteChat Hoş Geldiniz'
        });
    }
    
    // Kullanıcı işlemleri
    addUser(userData) {
        this.users.set(userData.id, userData);
        if (userData.online) {
            this.onlineUsers.add(userData.id);
        }
        this.saveToStorage('users');
        return userData;
    }
    
    getUser(userId) {
        return this.users.get(userId);
    }
    
    updateUser(userId, updates) {
        const user = this.users.get(userId);
        if (user) {
            Object.assign(user, updates);
            this.saveToStorage('users');
            return user;
        }
        return null;
    }
    
    // Kanal işlemleri
    createChannel(channelData) {
        const channel = {
            ...channelData,
            users: new Set([channelData.owner, 'mate']),
            operators: new Set(),
            voices: new Set(),
            bans: new Map(),
            mutes: new Map(),
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
        
        this.channels.set(channelData.id, channel);
        this.saveToStorage('channels');
        return channel;
    }
    
    getChannel(channelId) {
        return this.channels.get(channelId);
    }
    
    // Özel mesaj işlemleri
    addPrivateMessage(message) {
        const key = [message.from, message.to].sort().join('_');
        if (!this.privateMessages.has(key)) {
            this.privateMessages.set(key, []);
        }
        this.privateMessages.get(key).push(message);
        this.saveToStorage('privateMessages');
        return message;
    }
    
    getPrivateMessages(userId1, userId2) {
        const key = [userId1, userId2].sort().join('_');
        return this.privateMessages.get(key) || [];
    }
    
    // Kayıtlı kullanıcı sistemi
    registerUser(username, password, userData) {
        const hashedPassword = this.hashPassword(password);
        this.registeredUsers.set(username, {
            password: hashedPassword,
            userData: userData,
            registeredAt: new Date().toISOString()
        });
        this.saveToStorage('registeredUsers');
        return true;
    }
    
    authenticateUser(username, password) {
        const user = this.registeredUsers.get(username);
        if (!user) return null;
        
        const hashedPassword = this.hashPassword(password);
        if (user.password === hashedPassword) {
            return user.userData;
        }
        return null;
    }
    
    // Şifreleme fonksiyonu
    hashPassword(password) {
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return 'hashed_' + Math.abs(hash).toString(36);
    }
    
    // LocalStorage işlemleri
    saveToStorage(key) {
        try {
            let data;
            switch(key) {
                case 'users':
                    data = Array.from(this.users.values());
                    break;
                case 'channels':
                    data = Array.from(this.channels.values()).map(channel => ({
                        ...channel,
                        users: Array.from(channel.users),
                        operators: Array.from(channel.operators),
                        voices: Array.from(channel.voices),
                        bans: Array.from(channel.bans.entries()),
                        mutes: Array.from(channel.mutes.entries())
                    }));
                    break;
                case 'privateMessages':
                    data = Array.from(this.privateMessages.entries());
                    break;
                case 'registeredUsers':
                    data = Array.from(this.registeredUsers.entries());
                    break;
                default:
                    return;
            }
            
            localStorage.setItem(`elitechat_${key}`, JSON.stringify(data));
        } catch (e) {
            console.error(`Storage save error (${key}):`, e);
        }
    }
    
    loadFromStorage() {
        try {
            // Kullanıcıları yükle
            const usersData = JSON.parse(localStorage.getItem('elitechat_users') || '[]');
            usersData.forEach(user => {
                this.users.set(user.id, user);
                if (user.online) this.onlineUsers.add(user.id);
            });
            
            // Kanalları yükle
            const channelsData = JSON.parse(localStorage.getItem('elitechat_channels') || '[]');
            channelsData.forEach(channelData => {
                const channel = {
                    ...channelData,
                    users: new Set(channelData.users || []),
                    operators: new Set(channelData.operators || []),
                    voices: new Set(channelData.voices || []),
                    bans: new Map(channelData.bans || []),
                    mutes: new Map(channelData.mutes || []),
                    messages: channelData.messages || []
                };
                this.channels.set(channelData.id, channel);
            });
            
            // Özel mesajları yükle
            const pmData = JSON.parse(localStorage.getItem('elitechat_privateMessages') || '[]');
            pmData.forEach(([key, messages]) => {
                this.privateMessages.set(key, messages || []);
            });
            
            // Kayıtlı kullanıcıları yükle
            const registeredData = JSON.parse(localStorage.getItem('elitechat_registeredUsers') || '[]');
            registeredData.forEach(([username, data]) => {
                this.registeredUsers.set(username, data);
            });
            
            console.log('✅ Veritabanı yüklendi:', {
                users: this.users.size,
                channels: this.channels.size,
                registered: this.registeredUsers.size
            });
            
        } catch (e) {
            console.error('Veritabanı yükleme hatası:', e);
        }
    }
}

// Global database instance
window.eliteChatDatabase = new EliteChatDatabase();
window.eliteChatDatabase.loadFromStorage();