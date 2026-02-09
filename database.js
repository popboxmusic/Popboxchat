// EliteChat Database System
class EliteChatDB {
    constructor() {
        this.users = new Map();
        this.channels = new Map();
        this.onlineUsers = new Set();
        this.registeredUsers = new Map(); // Şifreli kullanıcılar
        this.messages = new Map();
        this.pms = new Map();
        
        this.init();
    }
    
    init() {
        // MATE BOT (FIXED CREDENTIALS)
        this.users.set('mate', {
            id: 'mate',
            name: '🤖Mate',
            role: 'owner',
            password: this.hashPassword('mate123'), // Default şifre
            online: true,
            avatar: 'M',
            bio: 'Güvenlik Botu',
            joinDate: new Date().toISOString()
        });
        this.onlineUsers.add('mate');
        
        // OWNER ACCOUNT (Default owner)
        this.registeredUsers.set('admin', {
            password: this.hashPassword('admin123'),
            role: 'owner',
            userData: {
                id: 'admin',
                name: 'Admin',
                role: 'owner',
                avatar: 'A',
                bio: 'Sistem Yöneticisi'
            }
        });
        
        // GENEL KANAL
        this.channels.set('general', {
            id: 'general',
            name: '#Genel',
            topic: 'Hoş geldiniz',
            users: new Set(['mate']),
            messages: [],
            video: { id: 'jfKfPfyJRdk', title: 'Lofi Radio' }
        });
        
        // LOCALSTORAGE'DAN YÜKLE
        this.loadFromStorage();
    }
    
    // ŞİFRELEME
    hashPassword(password) {
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return 'hash_' + Math.abs(hash).toString(36);
    }
    
    // KULLANICI İŞLEMLERİ
    registerUser(username, password, userData) {
        const hashedPassword = this.hashPassword(password);
        this.registeredUsers.set(username, {
            password: hashedPassword,
            userData: userData,
            registeredAt: new Date().toISOString()
        });
        this.saveToStorage();
        return true;
    }
    
    authenticateUser(username, password) {
        const userRecord = this.registeredUsers.get(username);
        if (!userRecord) return null;
        
        const hashedInput = this.hashPassword(password);
        if (userRecord.password === hashedInput) {
            return userRecord.userData;
        }
        return null;
    }
    
    // Kullanıcı girişi (şifreli veya misafir)
    loginUser(nick, password = null) {
        const userId = nick.toLowerCase().replace(/[^a-z0-9._]/g, '');
        
        // Mate bot kontrolü
        if (userId === 'mate') {
            if (password && this.hashPassword(password) === this.users.get('mate').password) {
                return this.users.get('mate');
            }
            return null; // Mate şifresi yanlış
        }
        
        // Kayıtlı kullanıcı
        if (password) {
            const authUser = this.authenticateUser(userId, password);
            if (authUser) {
                authUser.online = true;
                this.users.set(userId, authUser);
                this.onlineUsers.add(userId);
                return authUser;
            }
            return null; // Şifre yanlış
        }
        
        // Misafir kullanıcı
        const guestUser = {
            id: userId,
            name: nick,
            role: 'user',
            online: true,
            avatar: nick.charAt(0).toUpperCase(),
            bio: '',
            registered: false,
            joinDate: new Date().toISOString()
        };
        
        this.users.set(userId, guestUser);
        this.onlineUsers.add(userId);
        return guestUser;
    }
    
    // KANAL İŞLEMLERİ
    createChannel(creatorId, channelName, topic = '') {
        const channelId = channelName.substring(1).toLowerCase().replace(/[^a-z0-9]/g, '_');
        
        if (this.channels.has(channelId)) return null;
        
        const channel = {
            id: channelId,
            name: channelName,
            topic: topic || 'Yeni kanal',
            owner: creatorId,
            users: new Set([creatorId, 'mate']),
            messages: [],
            video: { id: 'jfKfPfyJRdk', title: 'Lofi Radio' }
        };
        
        this.channels.set(channelId, channel);
        this.saveToStorage();
        return channel;
    }
    
    // MESAJ İŞLEMLERİ
    addMessage(channelId, userId, text) {
        const channel = this.channels.get(channelId);
        if (!channel) return null;
        
        const message = {
            id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            userId: userId,
            text: text,
            time: new Date(),
            channel: channelId
        };
        
        channel.messages.push(message);
        this.saveToStorage();
        return message;
    }
    
    addPM(fromId, toId, text) {
        const key = [fromId, toId].sort().join('_');
        if (!this.pms.has(key)) {
            this.pms.set(key, []);
        }
        
        const message = {
            id: 'pm_' + Date.now(),
            from: fromId,
            to: toId,
            text: text,
            time: new Date(),
            read: false
        };
        
        this.pms.get(key).push(message);
        this.saveToStorage();
        return message;
    }
    
    // STORAGE
    saveToStorage() {
        try {
            // Kullanıcılar
            const usersData = Array.from(this.users.entries());
            localStorage.setItem('elitechat_users', JSON.stringify(usersData));
            
            // Kanallar
            const channelsData = Array.from(this.channels.entries()).map(([id, channel]) => ({
                ...channel,
                users: Array.from(channel.users)
            }));
            localStorage.setItem('elitechat_channels', JSON.stringify(channelsData));
            
            // PM'ler
            const pmsData = Array.from(this.pms.entries());
            localStorage.setItem('elitechat_pms', JSON.stringify(pmsData));
            
            // Kayıtlı kullanıcılar
            const registeredData = Array.from(this.registeredUsers.entries());
            localStorage.setItem('elitechat_registered', JSON.stringify(registeredData));
            
        } catch (e) {
            console.error('Kaydetme hatası:', e);
        }
    }
    
    loadFromStorage() {
        try {
            // Kullanıcılar
            const usersData = JSON.parse(localStorage.getItem('elitechat_users') || '[]');
            usersData.forEach(([id, user]) => {
                this.users.set(id, user);
                if (user.online) this.onlineUsers.add(id);
            });
            
            // Kanallar
            const channelsData = JSON.parse(localStorage.getItem('elitechat_channels') || '[]');
            channelsData.forEach(channel => {
                channel.users = new Set(channel.users);
                this.channels.set(channel.id, channel);
            });
            
            // PM'ler
            const pmsData = JSON.parse(localStorage.getItem('elitechat_pms') || '[]');
            pmsData.forEach(([key, messages]) => {
                this.pms.set(key, messages || []);
            });
            
            // Kayıtlı kullanıcılar
            const registeredData = JSON.parse(localStorage.getItem('elitechat_registered') || '[]');
            registeredData.forEach(([username, data]) => {
                this.registeredUsers.set(username, data);
            });
            
        } catch (e) {
            console.error('Yükleme hatası:', e);
        }
    }
    
    // UTILITY
    getUser(userId) {
        return this.users.get(userId);
    }
    
    getChannel(channelId) {
        return this.channels.get(channelId);
    }
    
    getOnlineUsers() {
        return Array.from(this.onlineUsers).map(id => this.getUser(id)).filter(u => u);
    }
    
    // Mate bot mesajı
    sendBotMessage(channelId, text) {
        return this.addMessage(channelId, 'mate', text);
    }
}

// Global database instance
window.eliteChatDB = new EliteChatDB();
