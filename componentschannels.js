// Kanal Yönetim Sistemi
class ChannelSystem {
    constructor() {
        this.channels = new Map();
        this.loadChannels();
    }
    
    loadChannels() {
        const db = window.eliteChatDatabase;
        db.channels.forEach((channel, id) => {
            this.channels.set(id, channel);
            this.createChannelTab(id, channel.name);
        });
    }
    
    createChannelTab(channelId, channelName) {
        const tabsContainer = document.getElementById('channelTabs');
        if (!tabsContainer) return;
        
        // Sekme zaten var mı kontrol et
        const existingTab = tabsContainer.querySelector(`[data-channel="${channelId}"]`);
        if (existingTab) return;
        
        const tab = document.createElement('div');
        tab.className = 'channel-tab';
        tab.dataset.channel = channelId;
        tab.innerHTML = `<i class="fas fa-hashtag"></i> ${channelName.substring(1)}`;
        
        tab.addEventListener('click', () => {
            this.switchChannel(channelId);
        });
        
        tabsContainer.appendChild(tab);
    }
    
    switchChannel(channelId) {
        const app = window.eliteChat;
        if (app) {
            app.switchChannel(channelId);
        }
    }
    
    createChannel(channelData) {
        const db = window.eliteChatDatabase;
        const app = window.eliteChat;
        
        if (!app || !app.currentUser) return null;
        
        const channel = db.createChannel({
            id: channelData.id,
            name: channelData.name,
            owner: app.currentUser.id,
            type: channelData.type,
            topic: channelData.topic
        });
        
        if (channel) {
            this.channels.set(channelData.id, channel);
            this.createChannelTab(channelData.id, channelData.name);
            
            // Sunucuya bildir
            const server = window.eliteChatServer;
            if (server) {
                server.broadcast('channel_created', { channel });
            }
            
            return channel;
        }
        
        return null;
    }
    
    getChannelUsers(channelId) {
        const channel = this.channels.get(channelId);
        if (!channel) return [];
        
        const db = window.eliteChatDatabase;
        return Array.from(channel.users)
            .map(id => db.getUser(id))
            .filter(user => user);
    }
    
    updateChannelInfo(channelId) {
        const channel = this.channels.get(channelId);
        if (!channel) return;
        
        // UI güncellemeleri
        document.getElementById('currentChannel').textContent = channel.name.replace('#', '');
        document.getElementById('channelTopic').textContent = channel.topic;
        document.getElementById('panelChannelName').textContent = channel.name;
        document.getElementById('panelChannelTopic').textContent = channel.topic;
        
        // Online kullanıcı sayısı
        document.getElementById('channelUsers').textContent = channel.users.size;
        
        // Video bilgisi
        if (channel.video) {
            document.getElementById('videoTitle').textContent = channel.video.title;
            document.getElementById('panelChannelVideo').textContent = channel.video.title;
            document.getElementById('videoChannel').textContent = channel.name.replace('#', '');
        }
    }
}

// Kanal sistemini başlat
window.channelSystem = new ChannelSystem();