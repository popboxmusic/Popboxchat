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
    
    // Video oynat
    play: function(videoId, title) {
        if (!this.ytPlayer) return;
        this.ytPlayer.loadVideoById(videoId);
        document.getElementById('nowPlayingTitle').textContent = title || 'Video';
    },
    
    // Canlı yayın modal
    toggleLiveModal: function() {
        const modal = document.getElementById('liveStreamModal');
        const overlay = document.getElementById('modalOverlay');
        modal.classList.toggle('active');
        overlay.classList.toggle('active');
    },
    
    // Canlı yayın başlat
    startLive: function() {
        const key = document.getElementById('streamKey').value.trim();
        const title = document.getElementById('streamTitle').value.trim() || 'CETCETY Canlı Yayın';
        
        if (!key) {
            alert('Yayın anahtarı girin!');
            return;
        }
        
        Utils.addSystemMessage(`📹 ${Auth.currentUser.name} canlı yayın başlattı! ${title}`);
        this.play('jfKfPfyJRdk', `🔴 ${title}`);
        this.toggleLiveModal();
    },
    
    // Video ekleme modal
    toggleAddModal: function() {
        const modal = document.getElementById('addVideoModal');
        const overlay = document.getElementById('modalOverlay');
        modal.classList.toggle('active');
        overlay.classList.toggle('active');
    },
    
    // Filtreli video ekle
    addWithFilter: function() {
        const url = document.getElementById('videoUrl').value.trim();
        const title = document.getElementById('videoTitle').value.trim() || 'Yeni Video';
        
        if (!url) {
            alert('URL girin!');
            return;
        }
        
        // YouTube ID çıkar
        let vid = '';
        if (url.includes('youtube.com/watch?v=')) {
            vid = url.split('v=')[1]?.split('&')[0];
        } else if (url.includes('youtu.be/')) {
            vid = url.split('youtu.be/')[1]?.split('?')[0];
        } else {
            vid = url;
        }
        
        if (!vid || vid.length < 5) {
            alert('Geçersiz URL!');
            return;
        }
        
        // Filtre kontrolü
        const bannedWords = ['şiddet', 'cinsel', 'porn', 'sex', 'ölüm', 'kan', 'silah'];
        const lowerTitle = title.toLowerCase();
        for (let word of bannedWords) {
            if (lowerTitle.includes(word)) {
                alert(`🚫 Yasaklı kelime: ${word}`);
                return;
            }
        }
        
        Utils.addSystemMessage(`✅ Video eklendi: ${title}`);
        this.toggleAddModal();
        
        // Inputları temizle
        document.getElementById('videoUrl').value = '';
        document.getElementById('videoTitle').value = '';
    },
    
    // Modal aç (yönlendirme)
    openLiveModal: function() {
        if (!Auth.hasPermission('coadmin', Channels.currentChannel)) {
            alert('Yetkiniz yok!');
            return;
        }
        this.toggleLiveModal();
    },
    
    openAddModal: function() {
        if (!Auth.hasPermission('coadmin', Channels.currentChannel)) {
            alert('Yetkiniz yok!');
            return;
        }
        this.toggleAddModal();
    }
};

window.Media = Media;
console.log('✅ Media.js yüklendi');
