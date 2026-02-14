// ========== MEDYA.JS - CETCETY Bağımsız Medya Yöneticisi ==========
console.log('%c🎬 CETCETY Medya Yöneticisi başlatılıyor...', 'color: #ff0000; font-size: 14px; font-weight: bold;');

class CETCETYMedia {
    constructor() {
        console.log('%c📺 Medya Yöneticisi kuruluyor...', 'color: #6495ed; font-size: 12px;');
        this.ytPlayer = null;
        this.currentChannel = 'genel';
        this.isMuted = false;
        this.isPlaying = true;
        this.playerReady = false;
        this.pendingVideo = null;
        this.pendingChannel = null;
        this.initAttempts = 0;
        this.initYouTubeAPI();
        console.log('%c✅ Medya Yöneticisi başarıyla kuruldu', 'color: #4caf50; font-size: 12px;');
    }

    // YouTube API'yi başlat
    initYouTubeAPI() {
        console.log('%c▶️ YouTube API başlatılıyor...', 'color: #ff0000; font-size: 12px;');
        
        if (window.YT && window.YT.Player) {
            this.onYouTubeIframeAPIReady();
            return;
        }

        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        
        window.onYouTubeIframeAPIReady = () => {
            console.log('%c✅ YouTube API yüklendi!', 'color: #4caf50; font-size: 12px;');
            this.onYouTubeIframeAPIReady();
        };
    }

    onYouTubeIframeAPIReady() {
        console.log('%c✅ YouTube API hazır!', 'color: #4caf50; font-size: 12px;');
        
        if (this.ytPlayer) return;
        
        const channel = this.getChannelData(this.currentChannel);
        const videoId = channel?.currentVideo || 'jfKfPfyJRdk';
        
        try {
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
                    playsinline: 1,
                    enablejsapi: 1
                },
                events: {
                    onReady: (e) => {
                        console.log('%c🎥 YouTube Player hazır!', 'color: #4caf50; font-size: 12px;');
                        this.playerReady = true;
                        
                        if (this.pendingVideo) {
                            try {
                                e.target.loadVideoById(this.pendingVideo);
                                console.log('Bekleyen video yüklendi:', this.pendingVideo);
                                this.pendingVideo = null;
                            } catch (err) {
                                console.log('Bekleyen video yüklenemedi:', err);
                            }
                        } else {
                            e.target.playVideo();
                        }
                        
                        if (this.pendingChannel) {
                            this.setChannel(this.pendingChannel);
                            this.pendingChannel = null;
                        }
                    },
                    onStateChange: (e) => {
                        this.isPlaying = e.data === YT.PlayerState.PLAYING;
                        this.updatePlayPauseIcon();
                    },
                    onError: (e) => {
                        console.log('YouTube Player hatası:', e.data);
                    }
                }
            });
            console.log('YouTube player oluşturuldu');
        } catch (error) {
            console.error('YouTube player oluşturma hatası:', error);
            setTimeout(() => this.onYouTubeIframeAPIReady(), 2000);
        }
    }

    // Kanal verilerini al
    getChannelData(channelName) {
        try {
            const channels = JSON.parse(localStorage.getItem('cetcety_channels')) || {};
            return channels[channelName];
        } catch (e) {
            console.log('Kanal verisi alınamadı');
            return null;
        }
    }

    // Aktif kullanıcıyı al
    getActiveUser() {
        try {
            return JSON.parse(localStorage.getItem('cetcety_active_user'));
        } catch (e) {
            return null;
        }
    }

    // YouTube video ID'sini URL'den çıkar
    extractVideoId(url) {
        if (!url) return null;
        if (url.length === 11 && !url.includes('/') && !url.includes('.')) return url;
        
        let match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?#]+)/);
        return match ? match[1] : null;
    }

    // ========== VİDEO EKLEME MODALI ==========
    showAddVideoModal() {
        const user = this.getActiveUser();
        const channel = this.getChannelData(this.currentChannel);
        
        const isAuthorized = user?.role === 'owner' || 
                            user?.role === 'admin' || 
                            channel?.coAdmins?.includes(user?.name);
        
        if (!isAuthorized) {
            alert('❌ Video ekleme yetkiniz yok!');
            return;
        }

        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.8);
            backdrop-filter: blur(5px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;

        modal.innerHTML = `
            <div style="
                background: ${document.body.classList.contains('light-theme') ? '#fff' : '#1a1a1a'};
                border-radius: 16px;
                padding: 32px;
                width: 90%;
                max-width: 500px;
                color: ${document.body.classList.contains('light-theme') ? '#333' : '#fff'};
                box-shadow: 0 20px 60px rgba(0,0,0,0.5);
                position: relative;
            ">
                <div onclick="this.closest('.media-modal').remove()" style="
                    position: absolute;
                    top: 16px;
                    right: 16px;
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: ${document.body.classList.contains('light-theme') ? '#f0f0f0' : '#2a2a2a'};
                    color: #aaa;
                    cursor: pointer;
                    font-size: 18px;
                "><i class="fas fa-times"></i></div>
                
                <h3 style="margin-bottom: 24px; display: flex; align-items: center; gap: 10px;">
                    <i class="fab fa-youtube" style="color: #ff0000;"></i>
                    #${this.currentChannel} - Video Ekle
                </h3>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; color: #aaa; font-size: 13px;">
                        YouTube Video Linki / ID
                    </label>
                    <input type="text" id="videoUrlInput" placeholder="https://youtube.com/watch?v=... veya video ID" 
                        style="
                            width: 100%;
                            padding: 14px;
                            background: ${document.body.classList.contains('light-theme') ? '#f5f5f5' : '#2a2a2a'};
                            border: 1px solid ${document.body.classList.contains('light-theme') ? '#ddd' : '#3f3f3f'};
                            border-radius: 8px;
                            color: inherit;
                            font-size: 14px;
                            margin-bottom: 16px;
                        "
                    >

                    <label style="display: block; margin-bottom: 8px; color: #aaa; font-size: 13px;">
                        Video Başlığı
                    </label>
                    <input type="text" id="videoTitleInput" placeholder="Örn: Metallica - Nothing Else Matters" 
                        style="
                            width: 100%;
                            padding: 14px;
                            background: ${document.body.classList.contains('light-theme') ? '#f5f5f5' : '#2a2a2a'};
                            border: 1px solid ${document.body.classList.contains('light-theme') ? '#ddd' : '#3f3f3f'};
                            border-radius: 8px;
                            color: inherit;
                            font-size: 14px;
                        "
                    >
                </div>

                <div style="margin-bottom: 24px; padding: 12px; background: ${document.body.classList.contains('light-theme') ? '#f0f0f0' : '#252525'}; border-radius: 8px;">
                    <div style="display: flex; align-items: center; gap: 10px; color: #aaa; font-size: 12px;">
                        <i class="fas fa-shield-alt" style="color: #4caf50;"></i>
                        <span>Güvenlik filtresi aktif</span>
                    </div>
                </div>

                <div style="display: flex; gap: 12px;">
                    <button onclick="window.mediaManager.addVideo()" 
                        style="
                            flex: 2;
                            padding: 14px;
                            background: #ff0000;
                            border: none;
                            border-radius: 8px;
                            color: white;
                            font-weight: 600;
                            cursor: pointer;
                        "
                    >Video Ekle</button>
                    <button onclick="this.closest('.media-modal').remove()" 
                        style="
                            flex: 1;
                            padding: 14px;
                            background: ${document.body.classList.contains('light-theme') ? '#ddd' : '#333'};
                            border: none;
                            border-radius: 8px;
                            color: inherit;
                            cursor: pointer;
                        "
                    >İptal</button>
                </div>

                <div id="videoAddStatus" style="margin-top: 16px; font-size: 13px; color: #aaa; text-align: center;"></div>
            </div>
        `;

        modal.className = 'media-modal';
        document.body.appendChild(modal);
    }

    // ========== VİDEO EKLEME İŞLEMİ ==========
    async addVideo() {
        const urlInput = document.getElementById('videoUrlInput');
        const titleInput = document.getElementById('videoTitleInput');
        const statusDiv = document.getElementById('videoAddStatus');
        
        const url = urlInput?.value.trim();
        const customTitle = titleInput?.value.trim();
        
        if (!url) {
            statusDiv.innerHTML = '❌ Lütfen video linki girin';
            return;
        }

        if (!customTitle) {
            statusDiv.innerHTML = '❌ Lütfen video başlığı girin';
            return;
        }

        const videoId = this.extractVideoId(url);
        if (!videoId) {
            statusDiv.innerHTML = '❌ Geçersiz YouTube linki';
            return;
        }

        const channels = JSON.parse(localStorage.getItem('cetcety_channels')) || {};
        const channel = channels[this.currentChannel];
        
        if (!channel) {
            statusDiv.innerHTML = '❌ Kanal bulunamadı';
            return;
        }

        if (!channel.playlist) channel.playlist = [];

        const newVideo = {
            id: videoId,
            title: customTitle,
            addedBy: this.getActiveUser()?.name || 'Bilinmiyor',
            role: this.getActiveUser()?.role || 'user',
            addedAt: Date.now()
        };

        channel.playlist.push(newVideo);
        localStorage.setItem('cetcety_channels', JSON.stringify(channels));
        
        statusDiv.innerHTML = `✅ Video eklendi: "${customTitle}"`;
        
        this.updatePlaylist();
        
        // Firebase'e ekle
        if (window.addToPlaylist) {
            window.addToPlaylist(this.currentChannel, newVideo);
        }
        
        setTimeout(() => {
            document.querySelector('.media-modal')?.remove();
        }, 1000);
    }

    // ========== KANAL DEĞİŞTİR ==========
    setChannel(channelName) {
        console.log('setChannel çağrıldı:', channelName);
        this.currentChannel = channelName;
        const channel = this.getChannelData(channelName);
        
        if (!channel) return;
        
        if (this.ytPlayer && this.playerReady) {
            try {
                const videoId = channel.currentVideo || 'jfKfPfyJRdk';
                console.log('Video yükleniyor:', videoId);
                this.ytPlayer.loadVideoById(videoId);
            } catch (e) {
                console.log('Video yüklenemedi, beklemeye alındı');
                this.pendingVideo = channel.currentVideo || 'jfKfPfyJRdk';
            }
        } else {
            console.log('Player hazır değil, video ID kaydedildi');
            this.pendingVideo = channel.currentVideo || 'jfKfPfyJRdk';
            this.pendingChannel = channelName;
        }
        
        this.updatePlaylist();
        this.updateMediaUI();
    }

    // ========== PLAYLİST GÜNCELLE ==========
    updatePlaylist() {
        const channels = JSON.parse(localStorage.getItem('cetcety_channels')) || {};
        const channel = channels[this.currentChannel];
        const container = document.getElementById('playlistItems');
        const countEl = document.getElementById('playlistCount');
        const user = this.getActiveUser();
        
        if (!container || !channel) return;
        
        let html = '';
        if (channel.playlist && channel.playlist.length > 0) {
            channel.playlist.forEach((item, index) => {
                const isActive = item.id === channel.currentVideo;
                const canDelete = user?.role === 'owner' || 
                                 user?.role === 'admin' || 
                                 (channel.coAdmins?.includes(user?.name) && item.addedBy === user?.name);
                
                html += `
                    <div class="playlist-item ${isActive ? 'active' : ''}" 
                         onclick="window.mediaManager.playVideo('${item.id}', '${this.escapeHTML(item.title)}', '${this.escapeHTML(item.addedBy)}', '${item.role}')"
                         style="cursor: pointer;">
                        <div class="playlist-thumb">
                            <i class="fab fa-youtube"></i>
                        </div>
                        <div class="playlist-info" style="flex: 1;">
                            <div class="playlist-song" style="font-size: 13px; font-weight: 500;">${this.escapeHTML(item.title)}</div>
                            <div class="playlist-artist" style="font-size: 11px; color: #aaa;">
                                <span>${item.role === 'owner' ? '👑' : item.role === 'admin' ? '⚡' : '🔧'} ${this.escapeHTML(item.addedBy)}</span>
                            </div>
                        </div>
                        ${canDelete ? `
                            <div class="playlist-actions" onclick="event.stopPropagation(); window.mediaManager.removeFromPlaylist(${index})">
                                <i class="fas fa-trash" style="color: #ff4444; font-size: 14px;"></i>
                            </div>
                        ` : ''}
                    </div>
                `;
            });
        } else {
            html = '<div style="color: #aaa; text-align: center; padding: 20px;">📭 Henüz video eklenmemiş</div>';
        }
        
        container.innerHTML = html;
        if (countEl) countEl.textContent = `${channel.playlist?.length || 0} video`;
    }

    // ========== VİDEO OYNAT ==========
    playVideo(videoId, title, addedBy, role) {
        const channels = JSON.parse(localStorage.getItem('cetcety_channels')) || {};
        const channel = channels[this.currentChannel];
        
        if (!channel) return;
        
        channel.currentVideo = videoId;
        channel.currentTitle = title;
        channel.currentArtist = `${role === 'owner' ? '👑' : role === 'admin' ? '⚡' : role === 'coadmin' ? '🔧' : '🛠️'} ${addedBy}`;
        
        localStorage.setItem('cetcety_channels', JSON.stringify(channels));
        
        if (this.ytPlayer && this.playerReady) {
            try {
                this.ytPlayer.loadVideoById(videoId);
            } catch (e) {
                console.log('Video oynatılamadı');
            }
        }
        
        document.getElementById('nowPlayingTitle').textContent = title;
        document.getElementById('nowPlayingOwner').innerHTML = channel.currentArtist;
        
        this.updatePlaylist();
        
        // Firebase'e bildir
        if (window.updateVideo) {
            window.updateVideo(this.currentChannel, videoId, title, channel.currentArtist);
        }
    }

    // ========== PLAYLİST'TEN SİL ==========
    removeFromPlaylist(index) {
        const channels = JSON.parse(localStorage.getItem('cetcety_channels')) || {};
        const channel = channels[this.currentChannel];
        
        if (!channel?.playlist) return;
        
        const removed = channel.playlist[index];
        
        // Firebase'den sil
        if (removed.firebaseKey && window.removeFromPlaylist) {
            window.removeFromPlaylist(this.currentChannel, removed.firebaseKey);
        }
        
        channel.playlist.splice(index, 1);
        
        if (removed.id === channel.currentVideo && channel.playlist.length > 0) {
            const next = channel.playlist[0];
            this.playVideo(next.id, next.title, next.addedBy, next.role);
        } else if (channel.playlist.length === 0) {
            channel.currentVideo = 'jfKfPfyJRdk';
            channel.currentTitle = 'CETCETY Radio';
            channel.currentArtist = '👑 MateKy';
            if (this.ytPlayer && this.playerReady) {
                this.ytPlayer.loadVideoById('jfKfPfyJRdk');
            }
            document.getElementById('nowPlayingTitle').textContent = 'CETCETY Radio';
            document.getElementById('nowPlayingOwner').innerHTML = '👑 MateKy';
        }
        
        localStorage.setItem('cetcety_channels', JSON.stringify(channels));
        this.updatePlaylist();
        this.addSystemMessage(`🗑️ "${removed.title}" playlistten kaldırıldı.`);
    }

    // ========== MEDYA UI GÜNCELLE (EKLENDİ) ==========
    updateMediaUI() {
        const user = this.getActiveUser();
        const channel = this.getChannelData(this.currentChannel);
        
        const isAuthorized = user?.role === 'owner' || 
                            user?.role === 'admin' || 
                            channel?.coAdmins?.includes(user?.name);
        
        const addBtn = document.getElementById('addMediaBtn');
        if (addBtn) {
            addBtn.style.opacity = isAuthorized ? '1' : '0.4';
            addBtn.style.pointerEvents = isAuthorized ? 'auto' : 'none';
        }
        
        const liveBtn = document.getElementById('liveStreamBtn');
        if (liveBtn) {
            liveBtn.style.opacity = isAuthorized ? '1' : '0.4';
            liveBtn.style.pointerEvents = isAuthorized ? 'auto' : 'none';
        }
        
        const hideBtn = document.getElementById('hideChannelBtn');
        if (hideBtn) {
            const canHide = user?.role === 'owner' || user?.role === 'admin';
            hideBtn.style.opacity = canHide ? '1' : '0.4';
            hideBtn.style.pointerEvents = canHide ? 'auto' : 'none';
        }
        
        console.log('✅ Medya UI güncellendi');
    }

    // ========== MUTE TOGGLE ==========
    toggleMute() {
        if (!this.ytPlayer || !this.playerReady) return;
        if (this.isMuted) {
            this.ytPlayer.unMute();
            document.getElementById('muteIcon').className = 'fas fa-volume-up';
        } else {
            this.ytPlayer.mute();
            document.getElementById('muteIcon').className = 'fas fa-volume-mute';
        }
        this.isMuted = !this.isMuted;
    }

    // ========== PLAY/PAUSE TOGGLE ==========
    togglePlayPause() {
        if (!this.ytPlayer || !this.playerReady) return;
        if (this.isPlaying) {
            this.ytPlayer.pauseVideo();
        } else {
            this.ytPlayer.playVideo();
        }
    }

    updatePlayPauseIcon() {
        const icon = document.getElementById('playPauseIcon');
        if (icon) {
            icon.className = this.isPlaying ? 'fas fa-pause' : 'fas fa-play';
        }
    }

    // ========== SİSTEM MESAJI ==========
    addSystemMessage(text) {
        const messagesDiv = document.getElementById('messages');
        if (!messagesDiv) return;
        
        const msgDiv = document.createElement('div');
        msgDiv.className = 'system-message';
        msgDiv.innerHTML = `<i class="fas fa-info-circle"></i> ${this.escapeHTML(text)}`;
        messagesDiv.appendChild(msgDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    // ========== HTML ESCAPE ==========
    escapeHTML(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ========== CANLI YAYIN MODALI ==========
    showLiveStreamModal() {
        alert('Canlı yayın özelliği yakında!');
    }

    // ========== ŞİKAYET MODALI ==========
    showReportModal() {
        alert('Şikayet gönderildi!');
    }

    // ========== KANAL GİZLE ==========
    toggleChannelHidden() {
        alert('Kanal gizleme özelliği yakında!');
    }
}

// Global medya yöneticisini başlat
window.mediaManager = new CETCETYMedia();

// Storage değişikliklerini dinle
window.addEventListener('storage', (e) => {
    if (e.key === 'cetcety_channels') {
        if (window.mediaManager) {
            window.mediaManager.updatePlaylist();
        }
    }
});
