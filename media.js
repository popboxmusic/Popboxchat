// ========== YOUTUBE MEDYA İŞLEMLERİ ==========
// NOT: ytPlayer, ytPlayerReady, isMuted, isPlaying global.js'den geliyor

// YouTube player başlat
function initYouTubePlayer() {
    let c = channels[currentChannel];
    if (!c) return;
    
    if (!document.getElementById('youtubeContainer')) return;
    
    try {
        ytPlayer = new YT.Player('youtubeContainer', {
            height: '100%', 
            width: '100%',
            videoId: c.youtube.currentVideo,
            playerVars: { 
                autoplay: 1, 
                controls: 0, 
                modestbranding: 1, 
                rel: 0, 
                disablekb: 1, 
                fs: 0, 
                iv_load_policy: 3, 
                playsinline: 1,
                loop: 0
            },
            events: {
                onReady: function(event) {
                    console.log('YouTube player hazır');
                    ytPlayerReady = true;
                    try {
                        event.target.playVideo();
                    } catch (e) {
                        console.log('YouTube play hatası:', e);
                    }
                },
                onStateChange: function(event) {
                    let icon = document.getElementById('playPauseIcon');
                    if (icon) {
                        icon.className = event.data === YT.PlayerState.PLAYING ? 'fas fa-pause' : 'fas fa-play';
                    }
                    isPlaying = event.data === YT.PlayerState.PLAYING;
                    
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

// YouTube API hazır
function onYouTubeIframeAPIReady() {
    initYouTubePlayer();
}

// Sessize al
function toggleMute() {
    if (!ytPlayer || !ytPlayerReady || typeof ytPlayer.isMuted !== 'function') {
        addSystemMessage('YouTube player henüz hazır değil.');
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

// Oynat/Durdur
function togglePlayPause() {
    if (!ytPlayer || !ytPlayerReady || typeof ytPlayer.getPlayerState !== 'function') {
        addSystemMessage('YouTube player henüz hazır değil.');
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

// Medya görüntüsünü güncelle
function updateMediaDisplay() {
    let c = channels[currentChannel];
    if (!c) return;
    
    document.getElementById('youtubeNowPlayingTitle').textContent = c.youtube.currentTitle;
    document.getElementById('youtubeNowPlayingOwner').textContent = c.youtube.currentArtist;
    
    let youtubeRoleIcon = document.querySelector('#youtubeNowPlayingArtist .role-icon');
    if (c.ownerRole === 'owner') youtubeRoleIcon.className = 'role-icon owner';
    else if (c.ownerRole === 'admin') youtubeRoleIcon.className = 'role-icon admin';
    else if (c.ownerRole === 'coadmin') youtubeRoleIcon.className = 'role-icon coadmin';
    youtubeRoleIcon.innerHTML = c.ownerRole === 'owner' ? '👑' : c.ownerRole === 'admin' ? '⚡' : '🔧';
    
    updateYoutubePlaylist();
    
    if (ytPlayer && ytPlayerReady && c.youtube.currentVideo) {
        try {
            if (typeof ytPlayer.loadVideoById === 'function') {
                ytPlayer.loadVideoById(c.youtube.currentVideo);
            }
        } catch (e) {
            console.log('YouTube player hatası:', e);
        }
    }
    
    updateRoleControls();
}

// Yetki kontrollerini güncelle
function updateRoleControls() {
    let c = channels[currentChannel];
    if (!c || !ACTIVE_USER) return;
    
    let canEdit = ACTIVE_USER.role === 'owner' || ACTIVE_USER.role === 'admin' || c.coAdmins?.includes(ACTIVE_USER.name);
    
    let addYoutubeBtn = document.getElementById('addYoutubeBtn');
    if (addYoutubeBtn) addYoutubeBtn.classList.toggle('disabled', !canEdit);
    
    let hideYoutube = document.getElementById('hideYoutubeBtn');
    if (hideYoutube) {
        if (ACTIVE_USER.role === 'owner' || ACTIVE_USER.role === 'admin' || c.coAdmins?.includes(ACTIVE_USER.name)) {
            hideYoutube.classList.remove('disabled');
        } else {
            hideYoutube.classList.add('disabled');
        }
    }
}

// YouTube playlist güncelle
function updateYoutubePlaylist() {
    let c = channels[currentChannel];
    if (!c) return;
    let cont = document.getElementById('youtubePlaylistItems');
    if (!cont) return;
    
    let html = '';
    c.youtube.playlist.forEach((item, i) => {
        let active = item.id === c.youtube.currentVideo ? 'active' : '';
        let canDel = ACTIVE_USER && (ACTIVE_USER.role === 'owner' || ACTIVE_USER.role === 'admin' || (c.coAdmins?.includes(ACTIVE_USER.name) && item.addedBy === ACTIVE_USER.name));
        
        let roleIcon = item.role === 'owner' ? '👑' : item.role === 'admin' ? '⚡' : '🔧';
        let roleClass = item.role === 'owner' ? 'badge-owner' : item.role === 'admin' ? 'badge-admin' : 'badge-coadmin';
        
        html += `<div class="media-playlist-item youtube ${active}" onclick="playYoutubeVideo('${item.id}','${escapeHTML(item.title)}','${escapeHTML(item.addedBy)}','${item.role}')">
            <div class="media-playlist-thumb youtube"><i class="fab fa-youtube"></i></div>
            <div class="media-playlist-info">
                <div class="media-playlist-song">${escapeHTML(item.title)}</div>
                <div class="media-playlist-artist">
                    <span>${roleIcon} ${escapeHTML(item.addedBy)}</span>
                    <span class="badge ${roleClass}">${item.role}</span>
                </div>
            </div>
            <div class="media-playlist-actions">
                ${canDel ? `<div class="media-playlist-action" onclick="event.stopPropagation(); removeYoutubeFromPlaylist(${i})"><i class="fas fa-trash"></i></div>` : ''}
                <div class="media-playlist-action media-report-btn" onclick="event.stopPropagation(); reportVideo('${item.id}')"><i class="fas fa-flag"></i></div>
            </div>
        </div>`;
    });
    cont.innerHTML = html;
    let countEl = document.getElementById('youtubePlaylistCount');
    if (countEl) countEl.textContent = `${c.youtube.playlist.length} video`;
}

// Video oynat
function playYoutubeVideo(vid, title, by, role) {
    let c = channels[currentChannel];
    c.youtube.currentVideo = vid;
    c.youtube.currentTitle = title;
    c.youtube.currentArtist = by;
    
    if (typeof database !== 'undefined' && database) {
        database.ref(`nowplaying/${currentChannel}`).set({
            id: vid,
            title: title,
            artist: by,
            role: role
        });
    }
    
    saveChannels();
    
    if (ytPlayer && ytPlayerReady && typeof ytPlayer.loadVideoById === 'function') {
        try {
            ytPlayer.loadVideoById(vid);
        } catch (e) {
            console.log('YouTube player hatası:', e);
        }
    }
    
    document.getElementById('youtubeNowPlayingTitle').textContent = title;
    document.getElementById('youtubeNowPlayingOwner').textContent = by;
    
    let roleIcon = document.querySelector('#youtubeNowPlayingArtist .role-icon');
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
    
    updateYoutubePlaylist();
    
    addSystemMessage(`🎬 ${ACTIVE_USER.name} yeni video oynatıyor: ${title}`);
    sendToAdminChannel(`🎬 ${ACTIVE_USER.name}, #${currentChannel} kanalında yeni video oynatıyor: ${title}`);
}

// Sıradaki videoyu oynat
function playNextVideo() {
    let c = channels[currentChannel];
    if (!c || !c.youtube.playlist || c.youtube.playlist.length === 0) return;
    
    let currentIndex = c.youtube.playlist.findIndex(item => item.id === c.youtube.currentVideo);
    let nextIndex = (currentIndex + 1) % c.youtube.playlist.length;
    let nextVideo = c.youtube.playlist[nextIndex];
    
    playYoutubeVideo(nextVideo.id, nextVideo.title, nextVideo.addedBy, nextVideo.role);
    
    addSystemMessage(`⏭️ Sıradaki video: ${nextVideo.title}`);
}

// Videoyu playlistten kaldır
function removeYoutubeFromPlaylist(i) {
    let c = channels[currentChannel];
    let rem = c.youtube.playlist[i];
    c.youtube.playlist.splice(i, 1);
    
    if (typeof database !== 'undefined' && database) {
        database.ref(`playlist/${currentChannel}`).set(c.youtube.playlist);
    }
    
    if (rem.id === c.youtube.currentVideo && c.youtube.playlist.length > 0) {
        let n = c.youtube.playlist[0];
        playYoutubeVideo(n.id, n.title, n.addedBy, n.role);
    }
    saveChannels();
    updateYoutubePlaylist();
    
    addSystemMessage(`🗑️ "${rem.title}" kaldırıldı.`);
    sendToAdminChannel(`🗑️ ${ACTIVE_USER.name}, #${currentChannel} kanalından "${rem.title}" videosunu kaldırdı.`);
}

// Video ekleme modalını aç
function openAddYoutubeModal() {
    let c = channels[currentChannel];
    if (!ACTIVE_USER || !(ACTIVE_USER.role === 'owner' || ACTIVE_USER.role === 'admin' || c.coAdmins?.includes(ACTIVE_USER.name))) {
        addSystemMessage('❌ Video ekleme yetkiniz yok!');
        return;
    }
    document.getElementById('youtubeUrlInput').value = '';
    document.getElementById('youtubeTitleInput').value = '';
    openModal('youtubeModal');
}

// Video ekle
function addYoutubeVideo() {
    let url = document.getElementById('youtubeUrlInput').value.trim();
    let title = document.getElementById('youtubeTitleInput').value.trim();
    if (!url) {
        addSystemMessage('❌ Video URL/ID girin!');
        return;
    }
    
    let vid = '';
    if (url.includes('youtube.com/watch?v=')) {
        vid = url.split('v=')[1]?.split('&')[0];
    } else if (url.includes('youtu.be/')) {
        vid = url.split('youtu.be/')[1]?.split('?')[0];
    } else if (url.match(/^[a-zA-Z0-9_-]{11}$/)) {
        vid = url;
    } else {
        addSystemMessage('❌ Geçersiz YouTube URL/ID!');
        return;
    }
    
    if (!vid) {
        addSystemMessage('❌ Video ID çıkarılamadı!');
        return;
    }
    
    let c = channels[currentChannel];
    if (!title) title = `Video ${c.youtube.playlist.length + 1}`;
    
    c.youtube.playlist.push({
        id: vid,
        title: title,
        addedBy: ACTIVE_USER.name,
        role: ACTIVE_USER.role === 'owner' ? 'owner' : ACTIVE_USER.role === 'admin' ? 'admin' : 'coadmin'
    });
    
    if (typeof database !== 'undefined' && database) {
        database.ref(`playlist/${currentChannel}`).set(c.youtube.playlist);
    }
    
    updateYoutubePlaylist();
    saveChannels();
    closeModal('youtubeModal');
    
    addSystemMessage(`✅ "${title}" eklendi!`);
    sendToAdminChannel(`✅ ${ACTIVE_USER.name}, #${currentChannel} kanalına "${title}" videosunu ekledi.`);
}

// Video şikayet et
function reportVideo(videoId) {
    let reason = prompt('Bu videoyu neden şikayet ediyorsunuz?', '');
    if (reason) {
        let msg = `🚩 ${ACTIVE_USER.name}, bir videoyu şikayet etti. Video ID: ${videoId}, Sebep: ${reason}`;
        addSystemMessage(msg);
        sendToAdminChannel(msg);
    }
}

// Medya şikayet et
function reportMedia() {
    let reason = prompt('Bu medyayı neden şikayet ediyorsunuz?', '');
    if (reason) {
        let msg = `🚩 ${ACTIVE_USER.name}, #${currentChannel} kanalındaki medyayı şikayet etti. Sebep: ${reason}`;
        addSystemMessage(msg);
        sendToAdminChannel(msg);
    }
}
