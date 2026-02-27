// ========== MEDYA PANELİ - TAMAMI ==========
// YouTube player, playlist, kontroller, ekleme/silme, şikayet, gizleme

// ========== GLOBAL MEDYA DEĞİŞKENLERİ ==========
let ytPlayer = null;
let ytPlayerReady = false;
let isMuted = false;
let isPlaying = true;
let currentChannel = 'genel';
let currentUser = null;

// ========== YOUTUBE API ==========
function initYouTubePlayer() {
    const channel = getCurrentChannel();
    if (!channel || !document.getElementById('youtube-player')) return;
    
    try {
        ytPlayer = new YT.Player('youtube-player', {
            height: '100%',
            width: '100%',
            videoId: channel.youtube.currentVideo,
            playerVars: {
                autoplay: 1,
                controls: 0,
                modestbranding: 1,
                rel: 0,
                disablekb: 1,
                fs: 0,
                iv_load_policy: 3,
                playsinline: 1,
                loop: 0,
                playlist: channel.youtube.playlist.map(item => item.id).join(',')
            },
            events: {
                onReady: function(event) {
                    console.log('✅ YouTube player hazır');
                    ytPlayerReady = true;
                    try {
                        event.target.playVideo();
                    } catch (e) {
                        console.log('YouTube play hatası:', e);
                    }
                },
                onStateChange: function(event) {
                    updatePlayPauseIcon(event.data);
                    if (event.data === YT.PlayerState.ENDED) {
                        playNextVideo();
                    }
                },
                onError: function(event) {
                    console.log('YouTube player hatası:', event.data);
                    if (event.data === 101 || event.data === 150) {
                        playNextVideo();
                    }
                    ytPlayerReady = false;
                }
            }
        });
    } catch (e) {
        console.log('YouTube player oluşturulamadı:', e);
    }
}

function onYouTubeIframeAPIReady() {
    initYouTubePlayer();
}

// ========== KONTROL FONKSİYONLARI ==========
function toggleMute() {
    if (!ytPlayer || !ytPlayerReady || typeof ytPlayer.isMuted !== 'function') {
        showMessage('YouTube player henüz hazır değil.');
        return;
    }
    try {
        if (isMuted) {
            ytPlayer.unMute();
            document.getElementById('muteIcon').className = 'fas fa-volume-up';
        } else {
            ytPlayer.mute();
            document.getElementById('muteIcon').className = 'fas fa-volume-mute';
        }
        isMuted = !isMuted;
    } catch (e) {
        console.log('Mute hatası:', e);
    }
}

function togglePlayPause() {
    if (!ytPlayer || !ytPlayerReady || typeof ytPlayer.getPlayerState !== 'function') {
        showMessage('YouTube player henüz hazır değil.');
        return;
    }
    try {
        let state = ytPlayer.getPlayerState();
        if (state === YT.PlayerState.PLAYING) {
            ytPlayer.pauseVideo();
        } else {
            ytPlayer.playVideo();
        }
    } catch (e) {
        console.log('Play/Pause hatası:', e);
    }
}

function updatePlayPauseIcon(state) {
    const icon = document.getElementById('playPauseIcon');
    if (!icon) return;
    
    if (state === YT.PlayerState.PLAYING) {
        icon.className = 'fas fa-pause';
    } else {
        icon.className = 'fas fa-play';
    }
    isPlaying = state === YT.PlayerState.PLAYING;
}

// ========== PLAYLIST İŞLEMLERİ ==========
function updateYoutubePlaylist() {
    const channel = getCurrentChannel();
    if (!channel) return;
    
    const container = document.getElementById('youtubePlaylistItems');
    if (!container) return;
    
    let html = '';
    channel.youtube.playlist.forEach((item, index) => {
        const isActive = item.id === channel.youtube.currentVideo ? 'active' : '';
        const canDelete = currentUser && (
            currentUser.role === 'owner' || 
            currentUser.role === 'admin' || 
            (channel.coAdmins && channel.coAdmins.includes(currentUser.name) && item.addedBy === currentUser.name)
        );
        
        const roleIcon = item.role === 'owner' ? '👑' : item.role === 'admin' ? '⚡' : '🔧';
        const roleClass = item.role === 'owner' ? 'badge-owner' : 
                         item.role === 'admin' ? 'badge-admin' : 'badge-coadmin';
        
        html += `
            <div class="media-playlist-item ${isActive}" onclick="playYoutubeVideo(${index})">
                <div class="media-playlist-thumb"><i class="fab fa-youtube"></i></div>
                <div class="media-playlist-info">
                    <div class="media-playlist-song">${escapeHTML(item.title)}</div>
                    <div class="media-playlist-artist">
                        <span>${roleIcon} ${escapeHTML(item.addedBy)}</span>
                        <span class="badge ${roleClass}">${item.role}</span>
                    </div>
                </div>
                <div class="media-playlist-actions">
                    ${canDelete ? `
                        <div class="media-playlist-action" onclick="event.stopPropagation(); removeYoutubeFromPlaylist(${index})">
                            <i class="fas fa-trash"></i>
                        </div>
                    ` : ''}
                    <div class="media-playlist-action media-report-btn" onclick="event.stopPropagation(); reportVideo('${item.id}')">
                        <i class="fas fa-flag"></i>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html || '<div style="padding:20px; text-align:center;">Playlist boş</div>';
    document.getElementById('youtubePlaylistCount').textContent = `${channel.youtube.playlist.length} video`;
}

function playYoutubeVideo(index) {
    const channel = getCurrentChannel();
    const video = channel.youtube.playlist[index];
    
    channel.youtube.currentVideo = video.id;
    channel.youtube.currentTitle = video.title;
    channel.youtube.currentArtist = video.addedBy;
    
    saveChannels();
    
    if (ytPlayer && ytPlayerReady && typeof ytPlayer.loadVideoById === 'function') {
        try {
            ytPlayer.loadVideoById({
                videoId: video.id,
                playlist: channel.youtube.playlist.map(item => item.id)
            });
        } catch (e) {
            console.log('YouTube player hatası:', e);
        }
    }
    
    updateNowPlaying(video.title, video.addedBy, video.role);
    updateYoutubePlaylist();
    
    showMessage(`🎬 ${currentUser?.name || 'Bir kullanıcı'} yeni video oynatıyor: ${video.title}`);
    sendToAdminChannel(`🎬 ${currentUser?.name || 'Bir kullanıcı'}, #${currentChannel} kanalında yeni video oynatıyor: ${video.title}`);
}

function playYoutubeVideoById(id, title, by, role) {
    const channel = getCurrentChannel();
    channel.youtube.currentVideo = id;
    channel.youtube.currentTitle = title;
    channel.youtube.currentArtist = by;
    
    saveChannels();
    
    if (ytPlayer && ytPlayerReady && typeof ytPlayer.loadVideoById === 'function') {
        try {
            ytPlayer.loadVideoById({
                videoId: id,
                playlist: channel.youtube.playlist.map(item => item.id)
            });
        } catch (e) {
            console.log('YouTube player hatası:', e);
        }
    }
    
    updateNowPlaying(title, by, role);
    updateYoutubePlaylist();
}

function playNextVideo() {
    const channel = getCurrentChannel();
    if (!channel || !channel.youtube.playlist || channel.youtube.playlist.length === 0) return;
    
    const currentIndex = channel.youtube.playlist.findIndex(item => item.id === channel.youtube.currentVideo);
    const nextIndex = (currentIndex + 1) % channel.youtube.playlist.length;
    playYoutubeVideo(nextIndex);
}

function updateNowPlaying(title, artist, role) {
    document.getElementById('youtubeNowPlayingTitle').textContent = title;
    document.getElementById('youtubeNowPlayingOwner').textContent = artist;
    
    const roleIcon = document.querySelector('#youtubeNowPlayingArtist .role-icon');
    if (role === 'owner') {
        roleIcon.className = 'role-icon owner';
        roleIcon.innerHTML = '👑';
    } else if (role === 'admin') {
        roleIcon.className = 'role-icon admin';
        roleIcon.innerHTML = '⚡';
    } else {
        roleIcon.className = 'role-icon coadmin';
        roleIcon.innerHTML = '🔧';
    }
}

// ========== VİDEO EKLEME ==========
function openAddYoutubeModal() {
    const channel = getCurrentChannel();
    const canEdit = currentUser && (
        currentUser.role === 'owner' || 
        currentUser.role === 'admin' || 
        (channel.coAdmins && channel.coAdmins.includes(currentUser.name))
    );
    
    if (!canEdit) {
        showMessage('❌ Video ekleme yetkiniz yok!');
        return;
    }
    
    document.getElementById('youtubeUrlInput').value = '';
    document.getElementById('youtubeTitleInput').value = '';
    document.getElementById('youtubeModal').classList.add('active');
}

function closeYoutubeModal() {
    document.getElementById('youtubeModal').classList.remove('active');
}

function addYoutubeVideo() {
    const url = document.getElementById('youtubeUrlInput').value.trim();
    let title = document.getElementById('youtubeTitleInput').value.trim();
    
    if (!url) {
        showMessage('❌ Video URL/ID girin!');
        return;
    }
    
    let videoId = '';
    if (url.includes('youtube.com/watch?v=')) {
        videoId = url.split('v=')[1]?.split('&')[0];
    } else if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split('?')[0];
    } else if (url.match(/^[a-zA-Z0-9_-]{11}$/)) {
        videoId = url;
    } else {
        showMessage('❌ Geçersiz YouTube URL/ID!');
        return;
    }
    
    if (!videoId) {
        showMessage('❌ Video ID çıkarılamadı!');
        return;
    }
    
    const channel = getCurrentChannel();
    if (!title) title = `Video ${channel.youtube.playlist.length + 1}`;
    
    channel.youtube.playlist.push({
        id: videoId,
        title: title,
        addedBy: currentUser.name,
        role: currentUser.role === 'owner' ? 'owner' : 
              currentUser.role === 'admin' ? 'admin' : 'coadmin'
    });
    
    updateYoutubePlaylist();
    saveChannels();
    closeYoutubeModal();
    
    showMessage(`✅ "${title}" eklendi!`);
    sendToAdminChannel(`✅ ${currentUser.name}, #${currentChannel} kanalına "${title}" videosunu ekledi.`);
}

// ========== VİDEO SİLME ==========
function removeYoutubeFromPlaylist(index) {
    const channel = getCurrentChannel();
    const removed = channel.youtube.playlist[index];
    
    if (!confirm(`"${removed.title}" videosunu silmek istediğinize emin misiniz?`)) return;
    
    channel.youtube.playlist.splice(index, 1);
    
    if (removed.id === channel.youtube.currentVideo && channel.youtube.playlist.length > 0) {
        playYoutubeVideo(0);
    } else if (channel.youtube.playlist.length === 0) {
        channel.youtube.currentVideo = '';
        channel.youtube.currentTitle = 'Playlist boş';
        channel.youtube.currentArtist = 'Sistem';
        
        if (ytPlayer && ytPlayerReady) {
            ytPlayer.stopVideo();
        }
        
        updateNowPlaying('Playlist boş', 'Sistem', 'user');
    }
    
    saveChannels();
    updateYoutubePlaylist();
    
    showMessage(`🗑️ "${removed.title}" kaldırıldı.`);
    sendToAdminChannel(`🗑️ ${currentUser.name}, #${currentChannel} kanalından "${removed.title}" videosunu kaldırdı.`);
}

// ========== ŞİKAYET ==========
function reportVideo(videoId) {
    const reason = prompt('Bu videoyu neden şikayet ediyorsunuz?', '');
    if (!reason) return;
    
    const msg = `🚩 ${currentUser?.name || 'Bir kullanıcı'} bir videoyu şikayet etti. Video ID: ${videoId}, Sebep: ${reason}`;
    showMessage(msg);
    sendToAdminChannel(msg);
}

function reportMedia() {
    const reason = prompt('Bu medyayı neden şikayet ediyorsunuz?', '');
    if (!reason) return;
    
    const msg = `🚩 ${currentUser?.name || 'Bir kullanıcı'}, #${currentChannel} kanalındaki medyayı şikayet etti. Sebep: ${reason}`;
    showMessage(msg);
    sendToAdminChannel(msg);
}

// ========== KANAL GİZLEME ==========
function toggleChannelHidden() {
    const channel = getCurrentChannel();
    if (!channel) return;
    
    const canHide = currentUser && (
        currentUser.role === 'owner' || 
        currentUser.role === 'admin' || 
        (channel.coAdmins && channel.coAdmins.includes(currentUser.name))
    );
    
    if (!canHide) {
        showMessage('❌ Bu kanalı gizleme yetkiniz yok!');
        return;
    }
    
    channel.isHidden = !channel.isHidden;
    saveChannels();
    
    document.getElementById('hideYoutubeIcon').className = channel.isHidden ? 
        'fas fa-eye-slash' : 'fas fa-eye';
    
    showMessage(`👁️ #${currentChannel} ${channel.isHidden ? 'gizlendi' : 'gösteriliyor'}.`);
    sendToAdminChannel(`👁️ ${currentUser.name}, #${currentChannel} kanalını ${channel.isHidden ? 'gizledi' : 'gösterdi'}.`);
}

// ========== YARDIMCI FONKSİYONLAR ==========
function getCurrentChannel() {
    // Bu fonksiyon dışarıdan enjekte edilecek
    return window.channels ? window.channels[currentChannel] : null;
}

function saveChannels() {
    // Bu fonksiyon dışarıdan enjekte edilecek
    if (window.saveChannels) window.saveChannels();
}

function showMessage(text) {
    // Bu fonksiyon dışarıdan enjekte edilecek
    if (window.addSystemMessage) window.addSystemMessage(text);
}

function sendToAdminChannel(text) {
    // Bu fonksiyon dışarıdan enjekte edilecek
    if (window.sendToAdminChannel) window.sendToAdminChannel(text);
}

function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ========== DIŞARI AKTAR ==========
window.MediaPlayer = {
    init: initYouTubePlayer,
    setChannel: (channel) => { currentChannel = channel; updateYoutubePlaylist(); },
    setUser: (user) => { currentUser = user; },
    toggleMute: toggleMute,
    togglePlayPause: togglePlayPause,
    openAddModal: openAddYoutubeModal,
    addVideo: addYoutubeVideo,
    playVideo: playYoutubeVideo,
    playNext: playNextVideo,
    report: reportMedia,
    toggleHide: toggleChannelHidden,
    updatePlaylist: updateYoutubePlaylist
};

// YouTube API hazır değilse bekle
if (typeof YT !== 'undefined' && YT.Player) {
    initYouTubePlayer();
} else {
    window.onYouTubeIframeAPIReady = initYouTubePlayer;
}
