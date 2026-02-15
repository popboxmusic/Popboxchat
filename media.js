// ========== media.js ==========
// MEDYA İŞLEMLERİ - YouTube, Playlist, Video

const Media = {
    ytPlayer: null,
    isMuted: false,
    isPlaying: true,
    
    // YouTube API hazır
    init: function() {
        if (!window.YT) {
            setTimeout(() => this.init(), 500);
            return;
        }
        
        const ch = App.channels[App.currentChannel];
        if (!ch) return;
        
        this.ytPlayer = new YT.Player('youtubeContainer', {
            height: '100%',
            width: '100%',
            videoId: ch.currentVideo || 'jfKfPfyJRdk',
            playerVars: {
                autoplay: 1,
                controls: 0,
                modestbranding: 1,
                rel: 0,
                disablekb: 1,
                fs: 0,
                iv_load_policy: 3,
                playsinline: 1
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
    
    // Video oynat
    playVideo: function(videoId, title, addedBy) {
        if (!this.ytPlayer) return;
        
        this.ytPlayer.loadVideoById(videoId);
        document.getElementById('nowPlayingTitle').textContent = title || 'Video';
        document.getElementById('nowPlayingOwner').innerHTML = addedBy ? `👤 ${addedBy}` : '👑 MateKy';
        
        // Firebase'e kaydet
        if (database) {
            database.ref(`nowplaying/${App.currentChannel}`).set({
                id: videoId,
                title: title,
                addedBy: addedBy
            });
        }
    },
    
    // Video ekleme modalı
    openAddMediaModal: function() {
        if (!App.hasPermission('coadmin', App.currentChannel)) {
            alert('Video ekleme yetkiniz yok!');
            return;
        }
        
        const url = prompt('YouTube URL/ID girin:');
        if (!url) return;
        
        let videoId = '';
        if (url.includes('youtube.com/watch?v=')) {
            videoId = url.split('v=')[1]?.split('&')[0];
        } else if (url.includes('youtu.be/')) {
            videoId = url.split('youtu.be/')[1]?.split('?')[0];
        } else {
            videoId = url;
        }
        
        if (!videoId) {
            alert('Geçersiz URL!');
            return;
        }
        
        const title = prompt('Video başlığı:', 'Yeni video');
        if (!title) return;
        
        // Playlist'e ekle
        if (!App.channels[App.currentChannel].playlist) {
            App.channels[App.currentChannel].playlist = [];
        }
        
        App.channels[App.currentChannel].playlist.push({
            id: videoId,
            title: title,
            addedBy: App.currentUser.name,
            timestamp: Date.now()
        });
        
        this.updatePlaylist();
        Utils.addSystemMessage(`✅ "${title}" eklendi!`);
    },
    
    // Playlist güncelle
    updatePlaylist: function() {
        const ch = App.channels[App.currentChannel];
        if (!ch || !ch.playlist) return;
        
        const container = document.getElementById('playlistItems');
        let html = '';
        
        ch.playlist.forEach((item, index) => {
            html += `
                <div class="playlist-item" onclick="Media.playVideo('${item.id}', '${Utils.escapeHTML(item.title)}', '${Utils.escapeHTML(item.addedBy)}')">
                    <div class="playlist-thumb"><i class="fab fa-youtube"></i></div>
                    <div class="playlist-info">
                        <div class="playlist-song">${Utils.escapeHTML(item.title)}</div>
                        <div class="playlist-artist">${Utils.escapeHTML(item.addedBy)}</div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        document.getElementById('playlistCount').textContent = `${ch.playlist.length} video`;
    },
    
    // Canlı yayın
    openLiveStreamModal: function() {
        if (!App.hasPermission('coadmin', App.currentChannel)) {
            alert('Canlı yayın başlatma yetkiniz yok!');
            return;
        }
        
        const streamKey = prompt('YouTube Canlı Yayın Anahtarı:');
        if (streamKey) {
            Utils.addSystemMessage(`📹 ${App.currentUser.name} canlı yayın başlattı!`);
            this.playVideo('jfKfPfyJRdk', '🔴 CANLI YAYIN', App.currentUser.name);
        }
    }
};

window.Media = Media;
console.log('✅ Media.js yüklendi');
