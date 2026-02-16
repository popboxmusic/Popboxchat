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
    
    // Video oynat (playlist'ten tıklayınca)
    playVideo: function(videoId, title) {
        if (!this.ytPlayer) return;
        this.ytPlayer.loadVideoById(videoId);
        document.getElementById('nowPlayingTitle').textContent = title || 'Video';
        document.getElementById('nowPlayingOwner').innerHTML = `🎬 ${Auth.currentUser?.name || 'Misafir'}`;
    },
    
    // Video ekle (filtreli ve playlist'e ekler)
    addWithFilter: function() {
        const url = document.getElementById('videoUrl').value.trim();
        let title = document.getElementById('videoTitle').value.trim();
        
        if (!url) {
            alert('YouTube URL girin!');
            return;
        }
        
        // YouTube ID çıkar
        let videoId = '';
        if (url.includes('youtube.com/watch?v=')) {
            videoId = url.split('v=')[1]?.split('&')[0];
        } else if (url.includes('youtu.be/')) {
            videoId = url.split('youtu.be/')[1]?.split('?')[0];
        } else {
            videoId = url;
        }
        
        if (!videoId || videoId.length < 5) {
            alert('Geçersiz YouTube URL!');
            return;
        }
        
        if (!title) {
            title = `Video ${videoId.substring(0, 6)}`;
        }
        
        // Playlist'e ekle (localStorage'a kaydet)
        const playlist = this.getPlaylist();
        playlist.push({
            id: videoId,
            title: title,
            addedBy: Auth.currentUser?.name || 'Misafir',
            date: new Date().toLocaleDateString()
        });
        this.savePlaylist(playlist);
        
        // Playlist'i güncelle
        this.updatePlaylistUI();
        
        // Modal'ı kapat ve inputları temizle
        document.getElementById('videoUrl').value = '';
        document.getElementById('videoTitle').value = '';
        this.closeModals();
        
        Utils.addSystemMessage(`✅ Video eklendi: ${title}`);
    },
    
    // Playlist'i localStorage'dan al
    getPlaylist: function() {
        const saved = localStorage.getItem('cetcety_playlist');
        return saved ? JSON.parse(saved) : [];
    },
    
    // Playlist'i localStorage'a kaydet
    savePlaylist: function(playlist) {
        localStorage.setItem('cetcety_playlist', JSON.stringify(playlist));
    },
    
    // Playlist UI'ını güncelle
    updatePlaylistUI: function() {
        const playlist = this.getPlaylist();
        const container = document.getElementById('playlistItems');
        
        if (!container) return;
        
        let html = '';
        playlist.forEach((item, index) => {
            html += `
                <div class="playlist-item" onclick="Media.playVideo('${item.id}', '${item.title}')">
                    <div class="playlist-thumb"><i class="fab fa-youtube"></i></div>
                    <div class="playlist-info">
                        <div class="playlist-song">${Utils.escapeHTML(item.title)}</div>
                        <div class="playlist-artist">${Utils.escapeHTML(item.addedBy)}</div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html || '<div style="color:#aaa; text-align:center; padding:20px;">Henüz video eklenmemiş</div>';
        document.getElementById('playlistCount').textContent = `${playlist.length} video`;
    },
    
    // Canlı yayın başlat (kamera ile)
    startLive: function() {
        const title = document.getElementById('streamTitle')?.value || 'CETCETY Canlı Yayın';
        
        // Tarayıcı kamera izni iste
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ video: true, audio: true })
                .then(function(stream) {
                    console.log('📹 Kamera başlatıldı');
                    
                    // Kamerayı durdurmak için stream'i sakla
                    window.localStream = stream;
                    
                    // Butonu değiştir
                    const liveBtn = document.getElementById('liveStreamBtn');
                    liveBtn.innerHTML = '<i class="fas fa-stop-circle"></i>';
                    liveBtn.onclick = function() {
                        if (window.localStream) {
                            window.localStream.getTracks().forEach(track => track.stop());
                        }
                        liveBtn.innerHTML = '<i class="fas fa-video"></i>';
                        liveBtn.onclick = () => Media.openLiveModal();
                        Utils.addSystemMessage('📹 Canlı yayın sona erdi');
                    };
                    
                    // YouTube'da test videosu oynat
                    if (Media.ytPlayer) {
                        Media.ytPlayer.loadVideoById('jfKfPfyJRdk');
                        document.getElementById('nowPlayingTitle').textContent = `🔴 CANLI: ${title}`;
                    }
                    
                    Utils.addSystemMessage(`📹 ${Auth.currentUser?.name} canlı yayın başlattı: ${title}`);
                })
                .catch(function(err) {
                    console.error('Kamera hatası:', err);
                    alert('Kamera başlatılamadı! İzin vermemiş olabilirsiniz.');
                });
        } else {
            alert('Tarayıcınız kamera desteği sunmuyor.');
        }
        
        this.closeModals();
    }
};

window.Media = Media;
console.log('✅ Media.js yüklendi');
