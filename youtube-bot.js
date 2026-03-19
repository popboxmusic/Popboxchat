// ============================================
// CETCETY YOUTUBE BOT - Video Arama ve Playlist Yönetimi
// ============================================

class YoutubeBot {
    constructor(config = {}) {
        this.botName = config.botName || 'cetcety';
        this.botAvatar = config.botAvatar || 'https://i.imgur.com/6H0Y7qU.png';
        this.apiKey = 'AIzaSyCzQFqQtTghhJ7kfHapFvP6eOUOG0Y6fWY';
        this.searchCache = new Map();
        this.lastSearch = {};
        this.playHistory = [];
        this.isActive = true;
        this.searchCooldown = 5000;
        this.maxResults = 10;
        this.lastSearchResults = [];
    }

    init(database, playlistRef, messagesRef, currentUser) {
        this.database = database;
        this.playlistRef = playlistRef;
        this.messagesRef = messagesRef;
        this.currentUser = currentUser;
        
        console.log(`🤖 Bot "${this.botName}" başlatıldı!`);
        this.sendBotMessage(`🎵 **${this.botName}** YouTube Bot aktif! Komutlar: !video [arama], !ara [arama], !eğlenceli, !müzik, !trend, !botyardım`);
        
        return this;
    }

    async sendBotMessage(text) {
        if (!this.messagesRef) return;
        
        const messageData = {
            sender: this.botName,
            text: text,
            type: 'system',
            bot: true,
            botAvatar: this.botAvatar,
            timestamp: Date.now(),
            time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
        };
        
        try {
            await this.messagesRef.push(messageData);
        } catch (error) {
            console.error('Bot mesaj gönderilemedi:', error);
        }
    }

    async searchYouTube(query, maxResults = 5) {
        if (!query || query.trim() === '') {
            return { success: false, error: 'Arama sorgusu boş' };
        }

        const cacheKey = query.toLowerCase().trim();
        const cached = this.searchCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp < 300000)) {
            return { success: true, data: cached.data };
        }

        const lastSearchTime = this.lastSearch[this.currentUser?.name] || 0;
        if (Date.now() - lastSearchTime < this.searchCooldown) {
            const waitTime = Math.ceil((this.searchCooldown - (Date.now() - lastSearchTime)) / 1000);
            return { 
                success: false, 
                error: `Lütfen ${waitTime} saniye bekleyin.`,
                cooldown: true
            };
        }

        try {
            const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=${maxResults}&q=${encodeURIComponent(query)}&type=video&key=${this.apiKey}`;
            
            const response = await fetch(url);
            const data = await response.json();

            if (data.error) {
                return { success: false, error: 'API hatası: ' + (data.error.message || 'Bilinmiyor') };
            }

            if (!data.items || data.items.length === 0) {
                return { success: false, error: 'Sonuç bulunamadı.' };
            }

            const videos = data.items.map(item => ({
                id: item.id.videoId,
                title: item.snippet.title,
                channel: item.snippet.channelTitle,
                description: item.snippet.description,
                thumbnail: item.snippet.thumbnails?.medium?.url
            }));

            this.searchCache.set(cacheKey, {
                timestamp: Date.now(),
                data: videos
            });

            if (this.currentUser) {
                this.lastSearch[this.currentUser.name] = Date.now();
            }

            return { success: true, data: videos };

        } catch (error) {
            console.error('YouTube arama hatası:', error);
            return { success: false, error: 'Arama sırasında hata oluştu.' };
        }
    }

    async addToPlaylist(video, customTitle = null) {
        if (!this.playlistRef) {
            return { success: false, error: 'Playlist referansı yok' };
        }

        try {
            const newPlaylistItem = {
                id: video.id,
                title: customTitle || video.title,
                url: `https://youtu.be/${video.id}`,
                channel: video.channel,
                thumbnail: video.thumbnail,
                addedBy: this.botName,
                addedByUser: this.currentUser?.name || 'Bot',
                timestamp: Date.now(),
                botAdded: true
            };

            await this.playlistRef.push(newPlaylistItem);
            
            this.playHistory.push(newPlaylistItem);
            if (this.playHistory.length > 100) {
                this.playHistory.shift();
            }

            return { success: true, data: newPlaylistItem };
        } catch (error) {
            console.error('Playlist ekleme hatası:', error);
            return { success: false, error: 'Playlist\'e eklenemedi.' };
        }
    }

    async handleCommand(command, args, user) {
        if (!this.isActive && command !== 'botbaslat') {
            this.sendBotMessage(`🤖 Bot şu anda durduruldu. !botbaslat yazarak aktifleştirebilirsiniz.`);
            return;
        }

        this.currentUser = user;

        switch(command) {
            case 'video':
            case 'ara':
                await this.handleSearchCommand(args.join(' '));
                break;
                
            case 'eğlenceli':
            case 'eğlence':
            case 'fun':
                await this.handleFunVideos();
                break;
                
            case 'müzik':
            case 'music':
                await this.handleMusicVideos(args[0]);
                break;
                
            case 'trend':
            case 'popüler':
                await this.handleTrendingVideos();
                break;
                
            case 'rastgele':
            case 'random':
                await this.handleRandomVideo();
                break;
                
            case 'ekle':
                await this.handleAddCommand(args[0]);
                break;
                
            case 'botbilgi':
            case 'botinfo':
                this.showBotInfo();
                break;
                
            case 'botyardım':
            case 'bothelp':
                this.showBotHelp();
                break;
                
            case 'botdurdur':
                if (this.isAdmin(user)) {
                    this.isActive = false;
                    this.sendBotMessage('🤖 YouTube Bot durduruldu. !botbaslat ile tekrar başlatabilirsiniz.');
                } else {
                    this.sendBotMessage('⛔ Bu komutu kullanma yetkiniz yok!');
                }
                break;
                
            case 'botbaslat':
                if (!this.isActive) {
                    this.isActive = true;
                    this.sendBotMessage('🤖 YouTube Bot yeniden başlatıldı!');
                } else {
                    this.sendBotMessage('🤖 YouTube Bot zaten aktif!');
                }
                break;
        }
    }

    async handleSearchCommand(query) {
        if (!query) {
            this.sendBotMessage('❌ Lütfen bir arama terimi girin. Örnek: !video komik kedi');
            return;
        }

        this.sendBotMessage(`🔍 YouTube'da "${query}" aranıyor...`);

        const result = await this.searchYouTube(query, 5);
        
        if (!result.success) {
            if (result.cooldown) {
                this.sendBotMessage(`⏳ ${result.error}`);
            } else {
                this.sendBotMessage(`❌ ${result.error}`);
            }
            return;
        }

        const videos = result.data;
        this.lastSearchResults = videos;
        
        let message = `🎬 **"${query}" için sonuçlar:**\n\n`;
        
        for (let i = 0; i < Math.min(videos.length, 5); i++) {
            const v = videos[i];
            message += `${i+1}. **${v.title}**\n`;
            message += `   📺 ${v.channel}\n`;
            message += `   🔗 https://youtu.be/${v.id}\n\n`;
        }
        
        message += `📥 Eklemek için: !ekle [sıra_no]`;
        
        this.sendBotMessage(message);
    }

    async handleFunVideos() {
        const funKeywords = ['komik videolar', 'eğlenceli anlar', 'funny videos', 'komedi', 'şaka'];
        const randomKeyword = funKeywords[Math.floor(Math.random() * funKeywords.length)];
        
        this.sendBotMessage('😄 Eğlenceli videolar aranıyor...');
        
        const result = await this.searchYouTube(randomKeyword, 3);
        
        if (!result.success) {
            this.sendBotMessage(`❌ ${result.error}`);
            return;
        }

        const videos = result.data;
        this.lastSearchResults = videos;
        
        let message = `🎉 **Eğlenceli videolar bulundu!**\n\n`;
        
        for (let i = 0; i < videos.length; i++) {
            const v = videos[i];
            message += `${i+1}. **${v.title}**\n`;
            message += `   📺 ${v.channel}\n\n`;
        }
        
        message += `📥 Eklemek için: !ekle [sıra_no] (1-${videos.length})`;
        
        this.sendBotMessage(message);
    }

    async handleMusicVideos(genre) {
        const musicKeywords = {
            'pop': 'pop music',
            'rock': 'rock music',
            'rap': 'rap music',
            'arabesk': 'arabesk şarkılar'
        };

        let keyword = 'müzik video';
        if (genre && musicKeywords[genre]) {
            keyword = musicKeywords[genre];
        }
        
        this.sendBotMessage(`🎵 Müzik videoları aranıyor...`);
        
        const result = await this.searchYouTube(keyword, 2);
        
        if (!result.success) {
            this.sendBotMessage(`❌ ${result.error}`);
            return;
        }

        const videos = result.data;
        this.lastSearchResults = videos;
        
        let message = `🎧 **Müzik videoları**\n\n`;
        
        for (let i = 0; i < videos.length; i++) {
            const v = videos[i];
            message += `${i+1}. **${v.title}**\n`;
            message += `   📺 ${v.channel}\n\n`;
        }
        
        message += `📥 Eklemek için: !ekle [sıra_no]`;
        
        this.sendBotMessage(message);
    }

    async handleTrendingVideos() {
        this.sendBotMessage('📈 Popüler videolar aranıyor...');
        
        try {
            const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&chart=mostPopular&maxResults=5&regionCode=TR&key=${this.apiKey}`;
            
            const response = await fetch(url);
            const data = await response.json();

            if (!data.items || data.items.length === 0) {
                this.sendBotMessage('❌ Trend video bulunamadı.');
                return;
            }

            const videos = data.items.map(item => ({
                id: item.id,
                title: item.snippet.title,
                channel: item.snippet.channelTitle,
                thumbnail: item.snippet.thumbnails?.medium?.url
            }));

            this.lastSearchResults = videos;
            
            let message = `🔥 **Trend Videolar**\n\n`;
            
            for (let i = 0; i < videos.length; i++) {
                const v = videos[i];
                message += `${i+1}. **${v.title}**\n`;
                message += `   📺 ${v.channel}\n\n`;
            }
            
            message += `📥 Eklemek için: !ekle [sıra_no]`;
            
            this.sendBotMessage(message);

        } catch (error) {
            this.sendBotMessage('❌ Trend videolar alınamadı.');
        }
    }

    async handleRandomVideo() {
        const keywords = ['video', 'vlog', 'eğlence', 'müzik'];
        const randomKeyword = keywords[Math.floor(Math.random() * keywords.length)];
        
        this.sendBotMessage(`🎲 Rastgele video aranıyor...`);
        
        const result = await this.searchYouTube(randomKeyword, 1);
        
        if (!result.success) {
            this.sendBotMessage(`❌ ${result.error}`);
            return;
        }

        const video = result.data[0];
        this.lastSearchResults = [video];
        
        const message = `🎲 **Rastgele Video:**\n\n` +
            `**${video.title}**\n` +
            `📺 ${video.channel}\n` +
            `🔗 https://youtu.be/${video.id}\n\n` +
            `📥 Eklemek için: !ekle`;
        
        this.sendBotMessage(message);
    }

    async handleAddCommand(index) {
        if (!this.lastSearchResults || this.lastSearchResults.length === 0) {
            this.sendBotMessage('❌ Önce bir arama yapın (!video [arama])');
            return;
        }

        let videoToAdd;
        
        if (index === undefined) {
            videoToAdd = this.lastSearchResults[Math.floor(Math.random() * this.lastSearchResults.length)];
        } else {
            const idx = parseInt(index) - 1;
            if (isNaN(idx) || idx < 0 || idx >= this.lastSearchResults.length) {
                this.sendBotMessage(`❌ Geçersiz sıra numarası. 1-${this.lastSearchResults.length} arasında bir sayı girin.`);
                return;
            }
            videoToAdd = this.lastSearchResults[idx];
        }

        if (!videoToAdd) {
            this.sendBotMessage('❌ Video bulunamadı.');
            return;
        }

        this.sendBotMessage(`📥 **${videoToAdd.title}** playlist'e ekleniyor...`);
        
        const result = await this.addToPlaylist(videoToAdd);
        
        if (result.success) {
            this.sendBotMessage(`✅ **${videoToAdd.title}** playlist'e eklendi!`);
        } else {
            this.sendBotMessage(`❌ ${result.error}`);
        }
    }

    showBotInfo() {
        const info = `🤖 **${this.botName} YouTube Bot Bilgileri**\n\n` +
            `📊 **İstatistikler:**\n` +
            `• Toplam Eklenen Video: ${this.playHistory.length}\n` +
            `• Durum: ${this.isActive ? '🟢 Aktif' : '🔴 Durduruldu'}\n\n` +
            `📋 **Komutlar için:** !botyardım`;
        
        this.sendBotMessage(info);
    }

    showBotHelp() {
        const help = `🤖 **${this.botName} YouTube Bot Komutları**\n\n` +
            `🔍 **Arama Komutları:**\n` +
            `• !video [arama] - YouTube'da video ara\n` +
            `• !ara [arama] - Aynı işlem\n` +
            `• !eğlenceli - Eğlenceli videolar bul\n` +
            `• !müzik [tür] - Müzik videoları (pop, rock, rap)\n` +
            `• !trend - Trend videoları göster\n` +
            `• !rastgele - Rastgele video\n\n` +
            `📥 **Playlist Komutları:**\n` +
            `• !ekle [sıra_no] - Aramadaki videoyu playlist'e ekle\n` +
            `• !ekle - Rastgele bir videoyu ekle\n\n` +
            `⚙️ **Bot Yönetimi:**\n` +
            `• !botbilgi - Bot istatistikleri\n` +
            `• !botyardım - Bu menü`;
        
        this.sendBotMessage(help);
    }

    isAdmin(user) {
        if (!user) return false;
        const adminList = window.adminList || [];
        const defaultAdmins = window.SECURE_CONFIG?.DEFAULT_ADMINS || [];
        return adminList.includes(user.name) || 
               defaultAdmins.includes(user.name) || 
               user.role === 'admin' || 
               user.role === 'owner';
    }
}

// Global bot instance
let youtubeBot = null;

// Bot'u başlat
function initYoutubeBot(database, playlistRef, messagesRef, currentUser) {
    if (!youtubeBot) {
        youtubeBot = new YoutubeBot({
            botName: 'cetcety',
            botAvatar: 'https://i.imgur.com/6H0Y7qU.png'
        });
    }
    return youtubeBot.init(database, playlistRef, messagesRef, currentUser);
}