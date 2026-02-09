// Video Yönetim Sistemi
class VideoSystem {
    constructor() {
        this.currentVideo = null;
        this.videoHistory = [];
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadChannelVideo();
    }
    
    setupEventListeners() {
        // Video değiştirme butonu
        document.getElementById('changeVideoBtn')?.addEventListener('click', () => {
            this.openVideoModal();
        });
        
        // Video manager butonu
        document.getElementById('videoManagerBtn')?.addEventListener('click', () => {
            this.openVideoModal();
        });
        
        // Tam ekran butonu
        document.getElementById('fullscreenBtn')?.addEventListener('click', () => {
            this.toggleFullscreen();
        });
        
        // Modal butonları
        document.addEventListener('click', (e) => {
            if (e.target.id === 'saveVideo' || e.target.closest('#saveVideo')) {
                this.saveVideo();
            }
        });
    }
    
    openVideoModal() {
        // Yetki kontrolü
        const app = window.eliteChat;
        const channelSystem = window.channelSystem;
        
        if (!app?.currentUser || !channelSystem) return;
        
        const channel = channelSystem.channels.get(app.currentChannel);
        if (!channel) return;
        
        // Sahip veya yetkili kontrolü
        if (channel.owner !== app.currentUser.id && 
            !['owner', 'admin', 'coadmin'].includes(app.currentUser.role)) {
            alert('Video değiştirme yetkiniz yok!');
            return;
        }
        
        window.modalSystem?.openModal('videoModal');
        
        // Mevcut video bilgilerini yükle
        const videoUrl = document.getElementById('videoUrl');
        const videoTitle = document.getElementById('videoTitleInput');
        
        if (videoUrl && videoTitle && channel.video) {
            videoUrl.value = `https://youtube.com/watch?v=${channel.video.id}`;
            videoTitle.value = channel.video.title || '';
        }
    }
    
    saveVideo() {
        const urlInput = document.getElementById('videoUrl');
        const titleInput = document.getElementById('videoTitleInput');
        
        if (!urlInput || !titleInput) return;
        
        const url = urlInput.value.trim();
        const title = titleInput.value.trim() || 'YouTube Video';
        
        if (!url) {
            alert('YouTube URL veya Video ID gerekli!');
            return;
        }
        
        // Video ID'yi çıkar
        const videoId = this.extractVideoId(url);
        if (!videoId) {
            alert('Geçerli bir YouTube URL veya Video ID girin!');
            return;
        }
        
        // Kanal videosunu güncelle
        const app = window.eliteChat;
        const channelSystem = window.channelSystem;
        
        if (!app || !channelSystem) return;
        
        const channel = channelSystem.channels.get(app.currentChannel);
        if (!channel) return;
        
        channel.video = {
            id: videoId,
            title: title,
            channel: channel.name.replace('#', '')
        };
        
        // Veritabanını güncelle
        const db = window.eliteChatDatabase;
        if (db) {
            db.saveToStorage('channels');
        }
        
        // Videoyu yükle
        this.loadChannelVideo();
        
        // Sistem mesajı
        if (app.addSystemMessage) {
            app.addSystemMessage(`🎥 ${app.currentUser.name} kanal videosunu değiştirdi: ${title}`);
        }
        
        // Modal'ı kapat
        window.modalSystem?.closeModal('videoModal');
        
        // Geçmişe ekle
        this.videoHistory.push({
            videoId,
            title,
            channel: app.currentChannel,
            changedBy: app.currentUser?.name,
            timestamp: new Date()
        });
    }
    
    extractVideoId(url) {
        try {
            // YouTube URL formatlarını işle
            if (url.includes('youtube.com') || url.includes('youtu.be')) {
                const urlObj = new URL(url.includes('http') ? url : 'https://' + url);
                
                if (urlObj.hostname.includes('youtu.be')) {
                    // youtu.be/VIDEO_ID formatı
                    return urlObj.pathname.substring(1);
                } else {
                    // youtube.com/watch?v=VIDEO_ID formatı
                    const videoId = urlObj.searchParams.get('v');
                    if (videoId) return videoId;
                    
                    // Alternatif formatlar
                    const match = url.match(/v=([^&]+)/);
                    if (match) return match[1];
                }
            }
            
            // Direkt Video ID (11 karakter)
            if (url.length === 11 && /^[a-zA-Z0-9_-]{11}$/.test(url)) {
                return url;
            }
            
            return null;
        } catch (e) {
            console.error('Video ID çıkarma hatası:', e);
            return null;
        }
    }
    
    loadChannelVideo() {
        const app = window.eliteChat;
        const channelSystem = window.channelSystem;
        
        if (!app || !channelSystem) return;
        
        const channel = channelSystem.channels.get(app.currentChannel);
        if (!channel || !channel.video) return;
        
        const player = document.getElementById('youtubePlayer');
        const titleElement = document.getElementById('videoTitle');
        const panelVideoElement = document.getElementById('panelChannelVideo');
        
        if (!player || !titleElement) return;
        
        // YouTube embed URL'i oluştur
        const embedUrl = `https://www.youtube-nocookie.com/embed/${channel.video.id}?autoplay=1&mute=1&rel=0&controls=1&modestbranding=1&playsinline=1`;
        
        player.src = embedUrl;
        titleElement.textContent = channel.video.title;
        
        if (panelVideoElement) {
            panelVideoElement.textContent = channel.video.title;
        }
        
        this.currentVideo = {
            id: channel.video.id,
            title: channel.video.title,
            channel: app.currentChannel
        };
    }
    
    toggleFullscreen() {
        const player = document.getElementById('youtubePlayer');
        if (!player) return;
        
        if (!document.fullscreenElement) {
            if (player.requestFullscreen) {
                player.requestFullscreen();
            } else if (player.webkitRequestFullscreen) {
                player.webkitRequestFullscreen();
            } else if (player.msRequestFullscreen) {
                player.msRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }
    }
    
    // Otomatik izleyici sayısı güncelleme
    startViewerCounter() {
        setInterval(() => {
            this.updateViewerCount();
        }, 30000);
    }
    
    updateViewerCount() {
        const viewerElement = document.getElementById('viewerCount');
        if (!viewerElement) return;
        
        const current = parseInt(viewerElement.textContent.replace(/[^0-9]/g, '')) || 1200;
        const change = Math.floor(Math.random() * 100) - 50;
        const newCount = Math.max(100, current + change);
        
        viewerElement.textContent = newCount >= 1000 ? 
            (newCount/1000).toFixed(1) + 'K' : 
            newCount.toString();
    }
}

// Video sistemini başlat
window.videoSystem = new VideoSystem();

// Sayfa yüklendiğinde başlat
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.videoSystem) {
            window.videoSystem.startViewerCounter();
        }
    }, 1000);
});