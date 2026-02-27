// ========== YOUTUBE PLAYER ==========
let ytPlayer = null;
let ytPlayerReady = false;
let isMuted = false;

function initYouTubePlayer() {
    db.channels.child(currentChannel).once('value', (snap) => {
        const channel = snap.val();
        if (!channel || !document.getElementById('youtube-player')) return;
        
        ytPlayer = new YT.Player('youtube-player', {
            height: '100%',
            width: '100%',
            videoId: channel.youtube.current,
            playerVars: {
                autoplay: 1,
                controls: 0,
                modestbranding: 1,
                rel: 0,
                playsinline: 1
            },
            events: {
                onReady: (e) => {
                    ytPlayerReady = true;
                    e.target.playVideo();
                },
                onStateChange: (e) => {
                    if (e.data === YT.PlayerState.ENDED) {
                        playNextVideo();
                    }
                }
            }
        });
    });
}

function onYouTubeIframeAPIReady() {
    initYouTubePlayer();
}

// ========== KONTROLLER ==========
function toggleMute() {
    if (!ytPlayer || !ytPlayerReady) return;
    if (isMuted) {
        ytPlayer.unMute();
        document.querySelector('#muteBtn i').className = 'fas fa-volume-up';
    } else {
        ytPlayer.mute();
        document.querySelector('#muteBtn i').className = 'fas fa-volume-mute';
    }
    isMuted = !isMuted;
}

function togglePlay() {
    if (!ytPlayer || !ytPlayerReady) return;
    const state = ytPlayer.getPlayerState();
    if (state === YT.PlayerState.PLAYING) {
        ytPlayer.pauseVideo();
        document.querySelector('#playBtn i').className = 'fas fa-play';
    } else {
        ytPlayer.playVideo();
        document.querySelector('#playBtn i').className = 'fas fa-pause';
    }
}

// ========== PLAYLIST ==========
async function updatePlaylist() {
    const snap = await db.channels.child(currentChannel).once('value');
    const channel = snap.val();
    if (!channel) return;
    
    let html = '';
    channel.youtube.playlist.forEach((item, index) => {
        const active = item.id === channel.youtube.current ? 'active' : '';
        const canDelete = currentUser.role === 'owner' || 
                         currentUser.role === 'admin' || 
                         (channel.coAdmins?.includes(currentUser.name) && item.addedBy === currentUser.name);
        
        html += `
            <div class="playlist-item ${active}" onclick="playVideo(${index})">
                <div class="playlist-thumb"><i class="fab fa-youtube"></i></div>
                <div class="playlist-info">
                    <div class="playlist-title">${escapeHTML(item.title)}</div>
                    <div class="playlist-added">${escapeHTML(item.addedBy)}</div>
                </div>
                ${canDelete ? `<button class="delete-btn" onclick="event.stopPropagation(); removeVideo(${index})">🗑️</button>` : ''}
            </div>
        `;
    });
    
    document.getElementById('playlistItems').innerHTML = html || '<div style="padding:20px; text-align:center;">Playlist boş</div>';
}

// ========== VİDEO OYNAT ==========
async function playVideo(index) {
    const snap = await db.channels.child(currentChannel).once('value');
    const channel = snap.val();
    const video = channel.youtube.playlist[index];
    
    channel.youtube.current = video.id;
    channel.youtube.title = video.title;
    channel.youtube.artist = video.addedBy;
    
    await db.channels.child(currentChannel).set(channel);
    
    if (ytPlayer && ytPlayerReady) {
        ytPlayer.loadVideoById(video.id);
    }
}

// ========== SIRADAKİ VİDEO ==========
async function playNextVideo() {
    const snap = await db.channels.child(currentChannel).once('value');
    const channel = snap.val();
    if (!channel?.youtube.playlist?.length) return;
    
    const currentIndex = channel.youtube.playlist.findIndex(v => v.id === channel.youtube.current);
    const nextIndex = (currentIndex + 1) % channel.youtube.playlist.length;
    await playVideo(nextIndex);
}

// ========== VİDEO SİL ==========
async function removeVideo(index) {
    if (!confirm('Videoyu silmek istediğinize emin misiniz?')) return;
    
    const snap = await db.channels.child(currentChannel).once('value');
    const channel = snap.val();
    const removed = channel.youtube.playlist.splice(index, 1)[0];
    
    if (removed.id === channel.youtube.current && channel.youtube.playlist.length > 0) {
        channel.youtube.current = channel.youtube.playlist[0].id;
        channel.youtube.title = channel.youtube.playlist[0].title;
        channel.youtube.artist = channel.youtube.playlist[0].addedBy;
        if (ytPlayer && ytPlayerReady) ytPlayer.loadVideoById(channel.youtube.current);
    }
    
    await db.channels.child(currentChannel).set(channel);
    updatePlaylist();
}

// ========== VİDEO EKLE ==========
function openAddVideo() {
    const url = prompt('YouTube video URL veya ID girin:');
    if (!url) return;
    
    const videoId = extractYoutubeId(url);
    if (!videoId) {
        alert('Geçersiz YouTube URL!');
        return;
    }
    
    const title = prompt('Video başlığı (opsiyonel):') || `Video ${Date.now()}`;
    addVideoToPlaylist(videoId, title);
}

async function addVideoToPlaylist(videoId, title) {
    const snap = await db.channels.child(currentChannel).once('value');
    const channel = snap.val();
    
    channel.youtube.playlist.push({
        id: videoId,
        title: title,
        addedBy: currentUser.name,
        role: currentUser.role
    });
    
    await db.channels.child(currentChannel).set(channel);
    updatePlaylist();
}

// ========== PANEL ==========
function openPlaylist() {
    updatePlaylist();
    document.getElementById('playlistPanel').classList.add('active');
}

function closePlaylist() {
    document.getElementById('playlistPanel').classList.remove('active');
}
