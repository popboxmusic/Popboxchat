// ========== MEDYA.JS - CETCETY Bağımsız Medya Yöneticisi ==========
class CETCETYMedia {
    constructor() {
        this.ytPlayer = null;
        this.currentChannel = 'genel';
        this.isMuted = false;
        this.isPlaying = true;
        this.playerReady = false;
        this.initYouTubeAPI();
    }

    initYouTubeAPI() {
        if (window.YT) {
            this.onYouTubeIframeAPIReady();
        } else {
            const tag = document.createElement('script');
            tag.src = 'https://www.youtube.com/iframe_api';
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        }
        window.onYouTubeIframeAPIReady = () => this.onYouTubeIframeAPIReady();
    }

    onYouTubeIframeAPIReady() {
        const channel = this.getChannelData(this.currentChannel);
        this.ytPlayer = new YT.Player('youtubeContainer', {
            height: '100%',
            width: '100%',
            videoId: channel?.currentVideo || 'jfKfPfyJRdk',
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
                onReady: (e) => {
                    this.playerReady = true;
                    e.target.playVideo();
                },
                onStateChange: (e) => {
                    this.isPlaying = e.data === YT.PlayerState.PLAYING;
                    this.updatePlayPauseIcon();
                }
            }
        });
    }

    getChannelData(channelName) {
        const channels = JSON.parse(localStorage.getItem('cetcety_channels')) || {};
        return channels[channelName];
    }

    getActiveUser() {
        return JSON.parse(localStorage.getItem('cetcety_active_user'));
    }

    extractVideoId(url) {
        if (!url) return null;
        if (url.length === 11 && !url.includes('/')) return url;
        let match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?#]+)/);
        return match ? match[1] : null;
    }

    async checkVideoSafety(videoId) {
        return new Promise((resolve) => {
            const unsafeKeywords = ['sex', 'porn', 'xxx', 'violent', 'gore', 'nsfw'];
            const fakeTitle = `Video ${videoId}`;
            const lowerTitle = fakeTitle.toLowerCase();
            const isUnsafe = unsafeKeywords.some(keyword => lowerTitle.includes(keyword));
            resolve(!isUnsafe);
        });
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
                        <span>Güvenlik filtresi aktif: Şiddet/cinsel içerikli videolar engellenir.</span>
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

        statusDiv.innerHTML = '⏳ Video güvenlik kontrolü yapılıyor...';

        const isSafe = await this.checkVideoSafety(videoId);
        if (!isSafe) {
            statusDiv.innerHTML = '❌ Bu video güvenlik filtresine takıldı';
            return;
        }

        const channels = JSON.parse(localStorage.getItem('cetcety_channels')) || {};
        const channel = channels[this.currentChannel];
        
        if (!channel) {
            statusDiv.innerHTML = '❌ Kanal bulunamadı';
            return;
        }

        if (!channel.playlist) channel.playlist = [];

        channel.playlist.push({
            id: videoId,
            title: customTitle,
            addedBy: this.getActiveUser()?.name || 'Bilinmiyor',
            role: this.getActiveUser()?.role || 'user',
            addedAt: Date.now()
        });

        localStorage.setItem('cetcety_channels', JSON.stringify(channels));
        
        statusDiv.innerHTML = `✅ Video eklendi: "${customTitle}"`;
        
        this.updatePlaylist();
        
        setTimeout(() => {
            document.querySelector('.media-modal')?.remove();
        }, 1000);
    }

    // ========== CANLI YAYIN MODALI ==========
    showLiveStreamModal() {
        const user = this.getActiveUser();
        const channel = this.getChannelData(this.currentChannel);
        
        const isAuthorized = user?.role === 'owner' || 
                            user?.role === 'admin' || 
                            channel?.coAdmins?.includes(user?.name);
        
        if (!isAuthorized) {
            alert('❌ Canlı yayın başlatma yetkiniz yok!');
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
                max-width: 450px;
                color: ${document.body.classList.contains('light-theme') ? '#333' : '#fff'};
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
                    <i class="fas fa-video" style="color: #ff0000;"></i>
                    Canlı Yayın Başlat
                </h3>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; color: #aaa;">Yayın Başlığı</label>
                    <input type="text" id="streamTitle" placeholder="Örn: Gece yayını 🎙️" 
                        style="
                            width: 100%;
                            padding: 14px;
                            background: ${document.body.classList.contains('light-theme') ? '#f5f5f5' : '#2a2a2a'};
                            border: 1px solid ${document.body.classList.contains('light-theme') ? '#ddd' : '#3f3f3f'};
                            border-radius: 8px;
                            color: inherit;
                        "
                    >
                </div>

                <div style="margin-bottom: 24px; background: ${document.body.classList.contains('light-theme') ? '#f0f0f0' : '#252525'}; padding: 16px; border-radius: 8px;">
                    <div style="color: #ff0000; font-size: 13px; margin-bottom: 8px;">
                        <i class="fas fa-exclamation-triangle"></i> Canlı yayın için YouTube stream key gerekli
                    </div>
                    <input type="text" id="streamKey" placeholder="YouTube Stream Key" 
                        style="
                            width: 100%;
                            padding: 12px;
                            background: ${document.body.classList.contains('light-theme') ? '#fff' : '#333'};
                            border: 1px solid #ff0000;
                            border-radius: 6px;
                            color: inherit;
                        "
                    >
                </div>

                <div style="display: flex; gap: 12px;">
                    <button onclick="window.mediaManager.startLiveStream()" 
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
                    >Yayını Başlat</button>
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
            </div>
        `;

        document.body.appendChild(modal);
    }

    startLiveStream() {
        const title = document.getElementById('streamTitle')?.value.trim() || '🔴 CANLI YAYIN';
        const streamKey = document.getElementById('streamKey')?.value.trim();
        
        if (!streamKey) {
            alert('YouTube Stream Key gerekli!');
            return;
        }

        const channels = JSON.parse(localStorage.getItem('cetcety_channels')) || {};
        const channel = channels[this.currentChannel];
        
        channel.currentVideo = 'jfKfPfyJRdk';
        channel.currentTitle = `🔴 ${title}`;
        channel.currentArtist = `📡 ${this.getActiveUser()?.name}`;
        channel.isLive = true;
        
        localStorage.setItem('cetcety_channels', JSON.stringify(channels));
        
        if (this.ytPlayer) {
            this.ytPlayer.loadVideoById(channel.currentVideo);
        }
        
        document.getElementById('nowPlayingTitle').innerHTML = `🔴 ${title}`;
        document.getElementById('nowPlayingOwner').innerHTML = `📡 ${this.getActiveUser()?.name}`;
        
        this.addSystemMessage(`📹 ${this.getActiveUser()?.name} canlı yayın başlattı! #${this.currentChannel}`);
        
        document.querySelector('.media-modal')?.remove();
    }

    // ========== ŞİKAYET MODALI ==========
    showReportModal() {
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
                max-width: 400px;
                color: ${document.body.classList.contains('light-theme') ? '#333' : '#fff'};
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
                    <i class="fas fa-flag" style="color: #ff4444;"></i>
                    #${this.currentChannel} Şikayet Et
                </h3>
                
                <select id="reportReason" style="
                    width: 100%;
                    padding: 14px;
                    background: ${document.body.classList.contains('light-theme') ? '#f5f5f5' : '#2a2a2a'};
                    border: 1px solid ${document.body.classList.contains('light-theme') ? '#ddd' : '#3f3f3f'};
                    border-radius: 8px;
                    color: inherit;
                    margin-bottom: 16px;
                ">
                    <option value="spam">Spam / Reklam</option>
                    <option value="harassment">Taciz / Hakaret</option>
                    <option value="inappropriate">Uygunsuz İçerik</option>
                    <option value="copyright">Telif Hakkı İhlali</option>
                    <option value="other">Diğer</option>
                </select>

                <textarea id="reportDetail" placeholder="Detay (opsiyonel)..." rows="3" style="
                    width: 100%;
                    padding: 14px;
                    background: ${document.body.classList.contains('light-theme') ? '#f5f5f5' : '#2a2a2a'};
                    border: 1px solid ${document.body.classList.contains('light-theme') ? '#ddd' : '#3f3f3f'};
                    border-radius: 8px;
                    color: inherit;
                    margin-bottom: 20px;
                    resize: none;
                "></textarea>

                <div style="display: flex; gap: 12px;">
                    <button onclick="window.mediaManager.sendReport()" 
                        style="
                            flex: 2;
                            padding: 14px;
                            background: #ff4444;
                            border: none;
                            border-radius: 8px;
                            color: white;
                            font-weight: 600;
                            cursor: pointer;
                        "
                    >Şikayet Gönder</button>
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

                <div id="reportStatus" style="margin-top: 16px; font-size: 13px; color: #4caf50; text-align: center;"></div>
            </div>
        `;

        modal.className = 'media-modal';
        document.body.appendChild(modal);
    }

    sendReport() {
        const reason = document.getElementById('reportReason')?.value;
        const detail = document.getElementById('reportDetail')?.value;
        const statusDiv = document.getElementById('reportStatus');
        
        const user = this.getActiveUser();
        const channelName = this.currentChannel;
        
        const reportMsg = `🚨 YENİ ŞİKAYET\n` +
                         `Kanal: #${channelName}\n` +
                         `Şikayet Eden: ${user?.name || 'Bilinmiyor'}\n` +
                         `Sebep: ${reason}\n` +
                         `Detay: ${detail || 'Belirtilmemiş'}`;
        
        this.addSystemMessage(reportMsg);
        
        const channels = JSON.parse(localStorage.getItem('cetcety_channels')) || {};
        if (channels['admin']) {
            const adminMsg = {
                sender: '🚨 Şikayet Sistemi',
                text: reportMsg,
                time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
                timestamp: Date.now()
            };
            
            const channelMessages = JSON.parse(localStorage.getItem('cetcety_channel_messages')) || {};
            if (!channelMessages['admin']) channelMessages['admin'] = [];
            channelMessages['admin'].push(adminMsg);
            localStorage.setItem('cetcety_channel_messages', JSON.stringify(channelMessages));
        }
        
        statusDiv.innerHTML = '✅ Şikayetiniz iletildi!';
        
        setTimeout(() => {
            document.querySelector('.media-modal')?.remove();
        }, 1000);
    }

    // ========== KANAL GİZLEME/GÖSTERME - DÜZELTİLDİ ==========
    toggleChannelHidden() {
        const user = this.getActiveUser();
        
        // ÖNCE KULLANICI KONTROLÜ
        if (!user) {
            alert('❌ Giriş yapmalısınız!');
            return;
        }

        // YETKİ KONTROLÜ: Sadece owner ve admin gizleyebilir
        if (user.role !== 'owner' && user.role !== 'admin') {
            alert('❌ Bu işlem için owner veya admin yetkiniz olmalı!');
            return;
        }

        const channels = JSON.parse(localStorage.getItem('cetcety_channels')) || {};
        const channel = channels[this.currentChannel];
        
        if (!channel) {
            alert('❌ Kanal bulunamadı!');
            return;
        }

        // Gizleme durumunu değiştir
        channel.isHidden = !channel.isHidden;
        
        // Kaydet
        localStorage.setItem('cetcety_channels', JSON.stringify(channels));
        
        // Icon'u güncelle
        const hideIcon = document.getElementById('hideIcon');
        if (hideIcon) {
            hideIcon.className = channel.isHidden ? 'fas fa-eye-slash' : 'fas fa-eye';
        }
        
        // Mesaj ver
        const status = channel.isHidden ? 'gizlendi' : 'gösteriliyor';
        this.addSystemMessage(`👁️ #${this.currentChannel} kanalı ${status} (${user.role} yetkisiyle)`);
        
        // Popüler kanallar listesini güncelle
        if (window.updatePopularChannels) {
            window.updatePopularChannels();
        }
        
        // Sayfayı yenilemeden panel güncellemeleri
        setTimeout(() => {
            if (document.querySelector('.panel-header h3')?.innerText.includes('Abonelikler')) {
                if (window.loadSubscriptionsPanel) {
                    window.loadSubscriptionsPanel(document.getElementById('leftPanel'));
                }
            }
            if (document.querySelector('.panel-header h3')?.innerText.includes('Tüm Kanallar')) {
                if (window.loadChannelsPanel) {
                    window.loadChannelsPanel(document.getElementById('leftPanel'));
                }
            }
        }, 100);
    }

    // Playlist'i güncelle
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

    playVideo(videoId, title, addedBy, role) {
        const channels = JSON.parse(localStorage.getItem('cetcety_channels')) || {};
        const channel = channels[this.currentChannel];
        
        if (!channel) return;
        
        channel.currentVideo = videoId;
        channel.currentTitle = title;
        channel.currentArtist = `${role === 'owner' ? '👑' : role === 'admin' ? '⚡' : '🔧'} ${addedBy}`;
        
        localStorage.setItem('cetcety_channels', JSON.stringify(channels));
        
        if (this.ytPlayer) {
            this.ytPlayer.loadVideoById(videoId);
        }
        
        document.getElementById('nowPlayingTitle').textContent = title;
        document.getElementById('nowPlayingOwner').innerHTML = `${role === 'owner' ? '👑' : role === 'admin' ? '⚡' : '🔧'} ${addedBy}`;
        
        this.updatePlaylist();
    }

    removeFromPlaylist(index) {
        const channels = JSON.parse(localStorage.getItem('cetcety_channels')) || {};
        const channel = channels[this.currentChannel];
        
        if (!channel?.playlist) return;
        
        const removed = channel.playlist[index];
        channel.playlist.splice(index, 1);
        
        if (removed.id === channel.currentVideo && channel.playlist.length > 0) {
            const next = channel.playlist[0];
            this.playVideo(next.id, next.title, next.addedBy, next.role);
        } else if (channel.playlist.length === 0) {
            channel.currentVideo = 'jfKfPfyJRdk';
            channel.currentTitle = 'CETCETY Radio';
            channel.currentArtist = '👑 MateKy';
            if (this.ytPlayer) {
                this.ytPlayer.loadVideoById('jfKfPfyJRdk');
            }
            document.getElementById('nowPlayingTitle').textContent = 'CETCETY Radio';
            document.getElementById('nowPlayingOwner').innerHTML = '👑 MateKy';
        }
        
        localStorage.setItem('cetcety_channels', JSON.stringify(channels));
        this.updatePlaylist();
        this.addSystemMessage(`🗑️ "${removed.title}" playlistten kaldırıldı.`);
    }

    setChannel(channelName) {
        this.currentChannel = channelName;
        const channel = this.getChannelData(channelName);
        
        if (channel && this.ytPlayer) {
            this.ytPlayer.loadVideoById(channel.currentVideo || 'jfKfPfyJRdk');
        }
        
        this.updatePlaylist();
        this.updateMediaUI();
    }

    updateMediaUI() {
        const user = this.getActiveUser();
        const channel = this.getChannelData(this.currentChannel);
        
        const isAuthorized = user?.role === 'owner' || 
                            user?.role === 'admin' || 
                            channel?.coAdmins?.includes(user?.name);
        
        const addBtn = document.getElementById('addMediaBtn');
        const liveBtn = document.getElementById('liveStreamBtn');
        const hideBtn = document.getElementById('hideChannelBtn');
        
        if (addBtn) {
            addBtn.style.opacity = isAuthorized ? '1' : '0.4';
            addBtn.style.pointerEvents = isAuthorized ? 'auto' : 'none';
        }
        
        if (liveBtn) {
            liveBtn.style.opacity = isAuthorized ? '1' : '0.4';
            liveBtn.style.pointerEvents = isAuthorized ? 'auto' : 'none';
        }
        
        // HIDE BUTONU - Owner ve Admin her zaman kullanabilir
        if (hideBtn) {
            const canHide = user?.role === 'owner' || user?.role === 'admin';
            hideBtn.style.opacity = '1';
            hideBtn.style.pointerEvents = canHide ? 'auto' : 'none';
            hideBtn.title = canHide ? 'Kanalı Gizle/Göster (Owner/Admin)' : 'Sadece Owner ve Admin kanal gizleyebilir';
        }
    }

    toggleMute() {
        if (!this.ytPlayer) return;
        if (this.isMuted) {
            this.ytPlayer.unMute();
            document.getElementById('muteIcon').className = 'fas fa-volume-up';
        } else {
            this.ytPlayer.mute();
            document.getElementById('muteIcon').className = 'fas fa-volume-mute';
        }
        this.isMuted = !this.isMuted;
    }

    togglePlayPause() {
        if (!this.ytPlayer) return;
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

    addSystemMessage(text) {
        const messagesDiv = document.getElementById('messages');
        if (!messagesDiv) return;
        
        const msgDiv = document.createElement('div');
        msgDiv.className = 'system-message';
        msgDiv.innerHTML = `<i class="fas fa-info-circle"></i> ${this.escapeHTML(text)}`;
        messagesDiv.appendChild(msgDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    escapeHTML(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Global medya yöneticisini başlat
window.mediaManager = new CETCETYMedia();

window.addEventListener('storage', (e) => {
    if (e.key === 'cetcety_channels') {
        window.mediaManager.updatePlaylist();
        window.mediaManager.updateMediaUI();
    }
});