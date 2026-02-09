// EliteChat Sunucu Sistemi
class EliteChatServer {
    constructor() {
        this.clients = new Map();
        this.eventListeners = new Map();
        this.setupBroadcastSystem();
    }
    
    // İstemci bağlantısı
    connectClient(clientId, userData) {
        const client = {
            id: clientId,
            user: userData,
            connectedAt: Date.now(),
            lastActivity: Date.now(),
            channels: new Set(['general'])
        };
        
        this.clients.set(clientId, client);
        
        // Kullanıcıyı veritabanına ekle
        const db = window.eliteChatDatabase;
        db.addUser(userData);
        
        // Genel kanala ekle
        const generalChannel = db.getChannel('general');
        if (generalChannel) {
            generalChannel.users.add(clientId);
        }
        
        // Diğer kullanıcılara bildir
        this.broadcast('user_joined', {
            user: userData,
            timestamp: Date.now()
        });
        
        return client;
    }
    
    // Mesaj gönderme
    sendMessage(clientId, channelId, text) {
        const client = this.clients.get(clientId);
        if (!client) return null;
        
        const db = window.eliteChatDatabase;
        const channel = db.getChannel(channelId);
        if (!channel) return null;
        
        // Mesaj oluştur
        const message = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'message',
            userId: clientId,
            text: text,
            time: Date.now(),
            channel: channelId
        };
        
        // Kanal mesajlarına ekle
        channel.messages.push(message);
        if (channel.messages.length > 100) {
            channel.messages = channel.messages.slice(-100);
        }
        
        // Broadcast et
        this.broadcast('new_message', {
            message: message,
            channel: channelId
        });
        
        return message;
    }
    
    // Özel mesaj gönderme
    sendPrivateMessage(fromId, toId, text) {
        const db = window.eliteChatDatabase;
        
        const message = {
            id: `pm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'pm',
            from: fromId,
            to: toId,
            text: text,
            time: Date.now(),
            read: false
        };
        
        // Veritabanına kaydet
        db.addPrivateMessage(message);
        
        // Alıcıya gönder
        this.sendToUser(toId, 'private_message', { message });
        
        return message;
    }
    
    // Kanal oluşturma
    createChannel(clientId, channelData) {
        const client = this.clients.get(clientId);
        if (!client) return null;
        
        const db = window.eliteChatDatabase;
        
        // Kanal ID oluştur
        const channelId = channelData.name.substring(1).toLowerCase().replace(/[^a-z0-9]/g, '_');
        
        if (db.getChannel(channelId)) {
            return null; // Kanal zaten var
        }
        
        // Yeni kanal oluştur
        const channel = db.createChannel({
            id: channelId,
            name: channelData.name,
            owner: clientId,
            type: channelData.type || 'public',
            topic: channelData.topic || 'Yeni sohbet kanalı'
        });
        
        // Broadcast et
        this.broadcast('channel_created', { channel });
        
        return channel;
    }
    
    // Event sistemi
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }
    
    broadcast(event, data) {
        // LocalStorage üzerinden broadcast
        const broadcasts = JSON.parse(localStorage.getItem('elitechat_broadcasts') || '[]');
        broadcasts.push({
            event,
            data,
            timestamp: Date.now()
        });
        
        if (broadcasts.length > 50) {
            broadcasts.splice(0, broadcasts.length - 50);
        }
        
        localStorage.setItem('elitechat_broadcasts', JSON.stringify(broadcasts));
        
        // Window event olarak tetikle
        window.dispatchEvent(new CustomEvent('elitechat_broadcast', {
            detail: { event, data }
        }));
        
        // Event listener'ları tetikle
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(data);
                } catch (err) {
                    console.error(`Event error (${event}):`, err);
                }
            });
        }
    }
    
    sendToUser(userId, event, data) {
        // Kullanıcıya özel event
        const userEvents = JSON.parse(localStorage.getItem(`elitechat_user_${userId}`) || '[]');
        userEvents.push({
            event,
            data,
            timestamp: Date.now()
        });
        
        if (userEvents.length > 20) {
            userEvents.splice(0, userEvents.length - 20);
        }
        
        localStorage.setItem(`elitechat_user_${userId}`, JSON.stringify(userEvents));
        
        // User-specific event tetikle
        window.dispatchEvent(new CustomEvent(`elitechat_user_${userId}`, {
            detail: { event, data }
        }));
    }
    
    setupBroadcastSystem() {
        // Broadcast'leri dinle
        window.addEventListener('elitechat_broadcast', (e) => {
            const { event, data } = e.detail;
            console.log(`📡 Broadcast: ${event}`, data);
        });
        
        // Her kullanıcı için dinleme
        setInterval(() => {
            if (window.eliteChatClient && window.eliteChatClient.userId) {
                const userId = window.eliteChatClient.userId;
                const userEvents = JSON.parse(localStorage.getItem(`elitechat_user_${userId}`) || '[]');
                
                userEvents.forEach(eventData => {
                    if (eventData.timestamp > (window.lastUserEventTime || 0)) {
                        window.dispatchEvent(new CustomEvent(`elitechat_user_${userId}_received`, {
                            detail: eventData
                        }));
                        window.lastUserEventTime = eventData.timestamp;
                    }
                });
            }
        }, 1000);
    }
}

// Global server instance
window.eliteChatServer = new EliteChatServer();
