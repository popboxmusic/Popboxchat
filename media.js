// ========== MEDIA.JS ==========
const Media = {
    ytPlayer: null,
    isMuted: false,
    isPlaying: true,
    isLive: false,
    
    // YouTube player başlat
    init: function() {
        if (!window.YT) {
            setTimeout(() => this.init(), 500);
            return;
        }
        
        const videoId = this.getCurrentVideo() || 'jfKfPfyJRdk';
        
        this.ytPlayer = new YT.Player('youtubeContainer', {
            height: '100%',
            width: '100%',
            videoId: videoId,
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
    
    // Şu anki videoyu al
    getCurrentVideo: function() {
        const channel = Channels.currentChannel;
        const playlist = this.getPlaylist(channel);
        if (playlist && playlist.length > 0) {
            return playlist[0].id;
        }
        return 'jfKfPfyJRdk';
    },
    
    // Playlist al
    getPlaylist: function(channel) {
        const key = `playlist_${channel}`;
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : [];
    },
    
    // Playlist kaydet
    savePlaylist: function(channel, playlist) {
        const key = `playlist_${channel}`;
        localStorage.setItem(key, JSON.stringify(playlist));
        
        // Firebase'e de kaydet (eşzamanlılık için)
        if (window.database) {
            window.database.ref(`playlists/${channel}`).set(playlist);
        }
        
        this.updatePlaylistUI();
    },
    
    // Playlist UI'ı güncelle
    updatePlaylistUI: function() {
        const channel = Channels.currentChannel;
        const playlist = this.getPlaylist(channel);
        const container = document.getElementById('playlistItems');
        
        if (!container) return;
        
        let html = '';
        playlist.forEach((item, index) => {
            const isActive = item.id === this.getCurrentVideo();
            const canDelete = Auth.hasPermission('coadmin', channel) || 
                             (item.addedBy === Auth.currentUser?.name);
            
            html += `
                <div class="playlist-item ${isActive ? 'active' : ''}" onclick="Media.playVideo('${item.id}', '${item.title}', ${index})">
                    <div class="playlist-thumb"><i class="fab fa-youtube"></i></div>
                    <div class="playlist-info">
                        <div class="playlist-song">${Utils.escapeHTML(item.title)}</div>
                        <div class="playlist-artist">${Utils.escapeHTML(item.addedBy)}</div>
                    </div>
                    ${canDelete ? `<div class="playlist-action" onclick="event.stopPropagation(); Media.removeFromPlaylist(${index})"><i class="fas fa-trash"></i></div>` : ''}
                </div>
            `;
        });
        
        container.innerHTML = html || '<div style="color:#aaa; text-align:center; padding:20px;">Playlist boş</div>';
        document.getElementById('playlistCount').textContent = `${playlist.length} video`;
    },
    
    // Video oynat
    playVideo: function(videoId, title, index) {
        if (!this.ytPlayer) return;
        
        this.ytPlayer.loadVideoById(videoId);
        document.getElementById('nowPlayingTitle').textContent = title || 'Video';
        
        // Şu an oynayanı kaydet
        const channel = Channels.currentChannel;
        localStorage.setItem(`nowplaying_${channel}`, JSON.stringify({
            id: videoId,
            title: title,
            index: index
        }));
        
        // Firebase'e de kaydet
        if (window.database) {
            window.database.ref(`nowplaying/${channel}`).set({
                id: videoId,
                title: title
            });
        }
        
        this.updatePlaylistUI();
    },
    
    // Playlistten sil
    removeFromPlaylist: function(index) {
        const channel = Channels.currentChannel;
        const playlist = this.getPlaylist(channel);
        
        if (index >= 0 && index < playlist.length) {
            playlist.splice(index, 1);
            this.savePlaylist(channel, playlist);
            Utils.addSystemMessage('🗑️ Video kaldırıldı');
        }
    },
    
    // ===== VİDEO FİLTRELEME (DÜZELTİLDİ) =====
    bannedWords: [
        // Şiddet içerenler
        'şiddet', 'violence', 'kan', 'blood', 'ölüm', 'death', 
        'cinayet', 'murder', 'kavga', 'fight', 'dayak', 'beat',
        'işkence', 'torture', 'savaş', 'war', 'katliam', 'massacre',
        
        // Cinsel içerikli
        'cinsel', 'sexual', 'porn', 'xxx', 'sex', 'porno',
        'çıplak', 'nude', '18+', 'yetiskin', 'adult', 'nsfw',
        
        // Küfürlü
        'küfür', 'hakaret', 'swear',
        
        // Diğer yasaklılar
        'terör', 'terror', 'bomba', 'bomb', 'silah', 'gun',
        'uyuşturucu', 'drug', 'eroin', 'kokain'
    ],
    
    // Güvenli kelimeler (yanlış algılamayı önler)
    safeWords: [
        'bölüm', 'chapter', 'part', 'section',
        'ölümsüz', 'immortal', 'deadpool',
        'kanal', 'channel', 'canlı', 'live'
    ],
    
    // Video başlığını kontrol et (DÜZELTİLDİ)
    checkVideoTitle: function(title) {
        if (!title) return { safe: true, bannedWord: null };
        
        const lowerTitle = title.toLowerCase();
        
        // Önce güvenli kelimeleri kontrol et
        for (let safe of this.safeWords) {
            if (lowerTitle.includes(safe)) {
                return { safe: true, bannedWord: null }; // Güvenli kelime varsa engelleme
            }
        }
        
        // Sonra yasaklı kelimeleri kontrol et
        for (let word of this.bannedWords) {
            // Tam kelime eşleşmesi yap (içinde geçmesi değil)
            const regex = new RegExp(`\\b${word}\\b`, 'i');
            if (regex.test(lowerTitle)) {
                return { safe: false, bannedWord: word };
            }
        }
        
        return { safe: true, bannedWord: null };
    },
    
    // Video ekleme modal
    toggleAddModal: function() {
        if (!Auth.hasPermission('coadmin', Channels.currentChannel)) {
            alert('Video ekleme yetkiniz yok!');
            return;
        }
        
        const modal = document.getElementById('addVideoModal');
        const overlay = document.getElementById('modalOverlay');
        modal.classList.toggle('active');
        overlay.classList.toggle('active');
    },
    
    // Filtreli video ekle (DÜZELTİLDİ)
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
        
        // Başlık yoksa video ID'sini kullan
        if (!title) {
            title = `Video ${videoId.substring(0, 6)}`;
        }
        
        // FİLTRE KONTROLÜ (DÜZELTİLDİ)
        const check = this.checkVideoTitle(title);
        if (!check.safe) {
            alert(`🚫 Bu video eklenemez! Yasaklı kelime tespit edildi: "${check.bannedWord}"`);
            Utils.addSystemMessage(`🚫 Video engellendi: "${check.bannedWord}"`);
            return;
        }
        
        // Playlist'e ekle
        const channel = Channels.currentChannel;
        const playlist = this.getPlaylist(channel);
        
        playlist.push({
            id: videoId,
            title: title,
            addedBy: Auth.currentUser.name,
            addedAt: Date.now()
        });
        
        this.savePlaylist(channel, playlist);
        
        // Modal'ı kapat
        document.getElementById('videoUrl').value = '';
        document.getElementById('videoTitle').value = '';
        this.toggleAddModal();
        
        Utils.addSystemMessage(`✅ Video eklendi: ${title}`);
    },
    
    // ===== CANLI YAYIN =====
    toggleLiveModal: function() {
        if (!Auth.hasPermission('coadmin', Channels.currentChannel)) {
            alert('Canlı yayın yetkiniz yok!');
            return;
        }
        
        const modal = document.getElementById('liveStreamModal');
        const overlay = document.getElementById('modalOverlay');
        modal.classList.toggle('active');
        overlay.classList.toggle('active');
    },
    
    // Kamerayı başlat
    startCamera: async function(deviceId = null) {
        try {
            const constraints = {
                video: deviceId ? { deviceId: { exact: deviceId } } : true,
                audio: true
            };
            
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            const videoElement = document.getElementById('cameraPreview');
            if (videoElement) {
                videoElement.srcObject = stream;
            }
            return stream;
        } catch (err) {
            console.error('Kamera hatası:', err);
            alert('Kamera başlatılamadı!');
        }
    },
    
    // Kamerayı durdur
    stopCamera: function(stream) {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    },
    
    // Canlı yayın başlat
    startLive: async function() {
        const title = document.getElementById('streamTitle')?.value || 'CETCETY Canlı Yayın';
        const cameraSelect = document.getElementById('cameraSelect');
        const deviceId = cameraSelect?.value;
        
        // Kamerayı başlat
        const stream = await this.startCamera(deviceId);
        
        // Butonu değiştir
        const liveBtn = document.getElementById('liveStreamBtn');
        liveBtn.innerHTML = '<i class="fas fa-stop-circle"></i>';
        liveBtn.onclick = () => this.stopLive(stream);
        this.isLive = true;
        
        // Yayını başlat (test videosu)
        this.playVideo('jfKfPfyJRdk', `🔴 CANLI: ${title}`);
        
        Utils.addSystemMessage(`📹 ${Auth.currentUser.name} canlı yayın başlattı!`);
        this.toggleLiveModal();
    },
    
    // Canlı yayını durdur
    stopLive: function(stream) {
        this.stopCamera(stream);
        
        const liveBtn = document.getElementById('liveStreamBtn');
        liveBtn.innerHTML = '<i class="fas fa-video"></i>';
        liveBtn.onclick = () => this.toggleLiveModal();
        this.isLive = false;
        
        Utils.addSystemMessage('📹 Canlı yayın sona erdi');
    },
    
       // Kamera listesini al
    getCameras: async function() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            
            const select = document.getElementById('cameraSelect');
            if (select) {
                select.innerHTML = '';
                videoDevices.forEach((device, index) => {
                    const option = document.createElement('option');
                    option.value = device.deviceId;
                    option.text = device.label || `Kamera ${index + 1}`;
                    select.appendChild(option);
                });
            }
        } catch (err) {
            console.error('Kamera listesi alınamadı:', err);
        }
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
    }
};

window.Media = Media;
console.log('✅ Media.js yüklendi');
