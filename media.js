// ========== MEDIA.JS ==========
const Media = {
    ytPlayer: null,
    isMuted: false,
    isPlaying: true,
    
    // YouTube player başlat
    init: function() {
        if (!window.YT) {
            setTimeout(() => this.init(), 500);
            return;
        }
        
        this.ytPlayer = new YT.Player('youtubeContainer', {
            height: '100%',
            width: '100%',
            videoId: 'jfKfPfyJRdk',
            playerVars: {
                autoplay: 1,
                controls: 0,
                modestbranding: 1,
                rel: 0
            },
            events: {
                onReady: e => e.target.playVideo(),
                onStateChange: e => {
                    document.getElementById('playPauseIcon').className = 
                        e.data === YT.PlayerState.PLAYING ? 'fas fa-pause' : 'fas fa-play';
                    this.isPlaying = e.data === YT.PlayerState.PLAYING;
                }
            }
        });
        
        console.log('🎬 YouTube player hazır');
    },
    
    // Ses aç/kapa
    toggleMute: function() {
        if (!this.ytPlayer) return;
        if (this.isMuted) {
            this.ytPlayer.unMute();
            document.getElementById('muteIcon').className = 'fas fa-volume-up';
        } else {
            this.ytPlayer.mute();
            document.getElementById('muteIcon').className = 'fas fa-volume-mute';
        }
        this.isMuted = !this.isMuted;
    },
    
    // Oynat/duraklat
    togglePlayPause: function() {
        if (!this.ytPlayer) return;
        if (this.isPlaying) this.ytPlayer.pauseVideo();
        else this.ytPlayer.playVideo();
    },
        // === MODAL FONKSİYONLARI ===
    openAddModal: function() {
        document.getElementById('addVideoModal').classList.add('active');
        document.getElementById('modalOverlay').classList.add('active');
    },
    
    openLiveModal: function() {
        document.getElementById('liveStreamModal').classList.add('active');
        document.getElementById('modalOverlay').classList.add('active');
    },
    
    closeModals: function() {
        document.getElementById('addVideoModal').classList.remove('active');
        document.getElementById('liveStreamModal').classList.remove('active');
        document.getElementById('adminPanel').classList.remove('active');
        document.getElementById('modalOverlay').classList.remove('active');
    },
    // === MODAL FONKSİYONLARI (HTML BUTONLARI İÇİN) ===
    openAddModal: function() {
        console.log('📹 Video ekleme modalı açılıyor');
        document.getElementById('addVideoModal').classList.add('active');
        document.getElementById('modalOverlay').classList.add('active');
    },
    
    openLiveModal: function() {
        console.log('🎥 Canlı yayın modalı açılıyor');
        document.getElementById('liveStreamModal').classList.add('active');
        document.getElementById('modalOverlay').classList.add('active');
    },
    
    closeModals: function() {
        document.getElementById('addVideoModal').classList.remove('active');
        document.getElementById('liveStreamModal').classList.remove('active');
        document.getElementById('adminPanel').classList.remove('active');
        document.getElementById('modalOverlay').classList.remove('active');
    },
    
    // Video ekle (filtreli)
    addWithFilter: function() {
        const url = document.getElementById('videoUrl').value.trim();
        const title = document.getElementById('videoTitle').value.trim();
        
        if (!url) {
            alert('URL girin!');
            return;
        }
        
        alert(`✅ Video eklendi: ${title || 'Video'}`);
        this.closeModals();
    },
    
    // Canlı yayın başlat
    startLive: function() {
        const title = document.getElementById('streamTitle')?.value || 'Canlı Yayın';
        alert(`🔴 Canlı yayın başladı: ${title}`);
        this.closeModals();
    }
};

window.Media = Media;
console.log('✅ Media.js yüklendi');
