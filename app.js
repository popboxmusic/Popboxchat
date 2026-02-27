// ========== YOUTUBE PLAYER ==========
let ytPlayer = null;
let ytPlayerReady = false;
let isMuted = false;

function initYouTubePlayer() {
    db.channels.child(currentChannel).once('value', (snapshot) => {
        const channel = snapshot.val();
        if (!channel || !document.getElementById('youtubeContainer')) return;
        
        try {
            ytPlayer = new YT.Player('youtubeContainer', {
                height: '100%',
                width: '100%',
                videoId: channel.youtube.currentVideo,
                playerVars: {
                    autoplay: 1,
                    controls: 0,
                    modestbranding: 1,
                    rel: 0,
                    playsinline: 1,
                    playlist: channel.youtube.playlist.map(v => v.id).join(',')
                },
                events: {
                    onReady: (event) => {
                        console.log('YouTube player hazır');
                        ytPlayerReady = true;
                        event.target.playVideo();
                    },
                    onStateChange: (event) => {
                        const icon = document.getElementById('playPauseIcon');
                        if (icon) {
                            icon.className = event.data === YT.PlayerState.PLAYING ? 
                                'fas fa-pause' : 'fas fa-play';
                        }
                        if (event.data === YT.PlayerState.ENDED) {
                            playNextVideo();
                        }
                    },
                    onError: (event) => {
                        console.log('YouTube hata:', event.data);
                        if (event.data === 101 || event.data === 150) {
                            playNextVideo();
                        }
                    }
                }
            });
        } catch (e) {
            console.log('YouTube player hatası:', e);
        }
    });
}

function onYouTubeIframeAPIReady() {
    initYouTubePlayer();
}

function toggleMute() {
    if (!ytPlayer || !ytPlayerReady) return;
    
    if (isMuted) {
        ytPlayer.unMute();
        document.getElementById('muteIcon').className = 'fas fa-volume-up';
    } else {
        ytPlayer.mute();
        document.getElementById('muteIcon').className = 'fas fa-volume-mute';
    }
    isMuted = !isMuted;
}

function togglePlayPause() {
    if (!ytPlayer || !ytPlayerReady) return;
    
    const state = ytPlayer.getPlayerState();
    if (state === YT.PlayerState.PLAYING) {
        ytPlayer.pauseVideo();
    } else {
        ytPlayer.playVideo();
    }
}

async function playNextVideo() {
    const snapshot = await db.channels.child(currentChannel).once('value');
    const channel = snapshot.val();
    
    if (!channel || !channel.youtube.playlist || channel.youtube.playlist.length === 0) return;
    
    const currentIndex = channel.youtube.playlist.findIndex(v => v.id === channel.youtube.currentVideo);
    const nextIndex = (currentIndex + 1) % channel.youtube.playlist.length;
    const nextVideo = channel.youtube.playlist[nextIndex];
    
    await playYoutubeVideo(nextVideo.id, nextVideo.title, nextVideo.addedBy, nextVideo.role);
}

async function playYoutubeVideo(videoId, title, addedBy, role) {
    const snapshot = await db.channels.child(currentChannel).once('value');
    const channel = snapshot.val();
    
    channel.youtube.currentVideo = videoId;
    channel.youtube.currentTitle = title;
    channel.youtube.currentArtist = addedBy;
    
    await db.channels.child(currentChannel).set(channel);
    
    if (ytPlayer && ytPlayerReady) {
        ytPlayer.loadVideoById({
            videoId: videoId,
            playlist: channel.youtube.playlist.map(v => v.id)
        });
    }
    
    updateYoutubeInfo(channel);
}

function updateYoutubeInfo(channel) {
    document.getElementById('youtubeNowPlayingTitle').textContent = channel.youtube.currentTitle;
    document.getElementById('youtubeNowPlayingOwner').textContent = channel.youtube.currentArtist;
    
    updateYoutubePlaylist(channel);
}

function updateYoutubePlaylist(channel) {
    const container = document.getElementById('youtubePlaylistItems');
    if (!container) return;
    
    let html = '';
    channel.youtube.playlist.forEach((item, index) => {
        const isActive = item.id === channel.youtube.currentVideo ? 'active' : '';
        const roleIcon = item.role === 'owner' ? '👑' : item.role === 'admin' ? '⚡' : '🔧';
        const roleClass = item.role === 'owner' ? 'badge-owner' : 
                         item.role === 'admin' ? 'badge-admin' : 'badge-coadmin';
        
        const canDelete = currentUser && (
            currentUser.role === 'owner' || 
            currentUser.role === 'admin' || 
            (channel.coAdmins && channel.coAdmins.includes(currentUser.name) && item.addedBy === currentUser.name)
        );
        
        html += `
            <div class="media-playlist-item ${isActive}" onclick="playYoutubeVideo('${item.id}', '${escapeHTML(item.title)}', '${escapeHTML(item.addedBy)}', '${item.role}')">
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
                        <div class="media-playlist-action" onclick="event.stopPropagation(); removeFromPlaylist(${index})">
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
    
    container.innerHTML = html;
    document.getElementById('youtubePlaylistCount').textContent = `${channel.youtube.playlist.length} video`;
}

async function removeFromPlaylist(index) {
    if (!confirm('Bu videoyu playlistten kaldırmak istediğinize emin misiniz?')) return;
    
    const snapshot = await db.channels.child(currentChannel).once('value');
    const channel = snapshot.val();
    const removed = channel.youtube.playlist.splice(index, 1)[0];
    
    if (removed.id === channel.youtube.currentVideo && channel.youtube.playlist.length > 0) {
        const next = channel.youtube.playlist[0];
        await playYoutubeVideo(next.id, next.title, next.addedBy, next.role);
    }
    
    await db.channels.child(currentChannel).set(channel);
    updateYoutubePlaylist(channel);
    addSystemMessage(`🗑️ "${removed.title}" kaldırıldı.`);
}

function reportVideo(videoId) {
    const reason = prompt('Bu videoyu neden şikayet ediyorsunuz?', '');
    if (reason) {
        const msg = `🚩 ${currentUser.name} bir videoyu şikayet etti. Video ID: ${videoId}, Sebep: ${reason}`;
        addSystemMessage(msg);
        // Admin kanalına bildir
        db.messages.child('admin').push({
            senderId: 'system',
            senderName: '🔔 ŞİKAYET',
            text: msg,
            time: formatTime(Date.now()),
            timestamp: Date.now()
        });
    }
}

function reportMedia() {
    const reason = prompt('Bu medyayı neden şikayet ediyorsunuz?', '');
    if (reason) {
        const msg = `🚩 ${currentUser.name}, #${currentChannel} kanalındaki medyayı şikayet etti. Sebep: ${reason}`;
        addSystemMessage(msg);
        // Admin kanalına bildir
        db.messages.child('admin').push({
            senderId: 'system',
            senderName: '🔔 ŞİKAYET',
            text: msg,
            time: formatTime(Date.now()),
            timestamp: Date.now()
        });
    }
}

function openAddYoutubeModal() {
    db.channels.child(currentChannel).once('value', (snapshot) => {
        const channel = snapshot.val();
        const canEdit = currentUser.role === 'owner' || 
                       currentUser.role === 'admin' || 
                       (channel.coAdmins && channel.coAdmins.includes(currentUser.name));
        
        if (!canEdit) {
            addSystemMessage('❌ Video ekleme yetkiniz yok!');
            return;
        }
        
        document.getElementById('youtubeUrlInput').value = '';
        document.getElementById('youtubeTitleInput').value = '';
        openModal('youtubeModal');
    });
}

async function addYoutubeVideo() {
    const url = document.getElementById('youtubeUrlInput').value.trim();
    const title = document.getElementById('youtubeTitleInput').value.trim();
    
    if (!url) {
        addSystemMessage('❌ Video URL/ID girin!');
        return;
    }
    
    const videoId = extractYoutubeId(url);
    if (!videoId) {
        addSystemMessage('❌ Geçersiz YouTube URL/ID!');
        return;
    }
    
    const snapshot = await db.channels.child(currentChannel).once('value');
    const channel = snapshot.val();
    
    channel.youtube.playlist.push({
        id: videoId,
        title: title || `Video ${channel.youtube.playlist.length + 1}`,
        addedBy: currentUser.name,
        role: currentUser.role === 'owner' ? 'owner' : 
              currentUser.role === 'admin' ? 'admin' : 'coadmin',
        addedAt: Date.now()
    });
    
    await db.channels.child(currentChannel).set(channel);
    updateYoutubePlaylist(channel);
    closeModal('youtubeModal');
    addSystemMessage(`✅ "${title || 'Video'}" eklendi!`);
}

async function toggleChannelHidden() {
    const snapshot = await db.channels.child(currentChannel).once('value');
    const channel = snapshot.val();
    
    const canHide = currentUser.role === 'owner' || 
                   currentUser.role === 'admin' || 
                   (channel.coAdmins && channel.coAdmins.includes(currentUser.name));
    
    if (!canHide) {
        addSystemMessage('❌ Bu kanalı gizleme yetkiniz yok!');
        return;
    }
    
    channel.isHidden = !channel.isHidden;
    await db.channels.child(currentChannel).set(channel);
    
    document.getElementById('hideYoutubeIcon').className = channel.isHidden ? 
        'fas fa-eye-slash' : 'fas fa-eye';
    
    addSystemMessage(`👁️ #${currentChannel} ${channel.isHidden ? 'gizlendi' : 'gösteriliyor'}.`);
}

// ========== MESAJLAR ==========
let messageListener = null;

function startMessageListener() {
    if (messageListener) {
        db.messages.child(currentChannel).off();
    }
    
    messageListener = db.messages.child(currentChannel)
        .limitToLast(50)
        .on('child_added', (snapshot) => {
            const msg = snapshot.val();
            if (msg) {
                appendMessage(msg, msg.senderId === currentUser?.id);
            }
        });
}

function appendMessage(msg, isMe) {
    const container = document.getElementById('messages');
    const div = document.createElement('div');
    div.className = `message ${isMe ? 'right' : ''}`;
    div.innerHTML = `
        <div class="message-header" style="${isMe ? 'justify-content:flex-end;' : ''}">
            <span class="message-time">${msg.time || ''}</span>
            <span class="message-sender" onclick="openPrivateChat('${msg.senderName}')">
                ${escapeHTML(msg.senderName)}
            </span>
        </div>
        <div class="message-text">${escapeHTML(msg.text)}</div>
    `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

async function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    
    if (!text) return;
    
    // Komut kontrolü
    if (text.startsWith('/')) {
        handleCommand(text);
        input.value = '';
        autoResize(input);
        return;
    }
    
    // Yasaklı kelime kontrolü
    const banned = checkBannedWords(text);
    if (banned) {
        addSystemMessage(`🚫 Yasaklı kelime tespit edildi: "${banned}"`);
        input.value = '';
        return;
    }
    
    const msg = {
        senderId: currentUser.id,
        senderName: currentUser.name,
        text: text,
        time: formatTime(Date.now()),
        timestamp: Date.now()
    };
    
    await db.messages.child(currentChannel).push(msg);
    input.value = '';
    autoResize(input);
}

// ========== BİLDİRİM ROZETLERİ ==========
function updateAllBadges() {
    if (!currentUser) return;
    
    document.getElementById('subscriptionBadge').textContent = 
        currentUser.subscribedChannels?.length || 0;
    
    db.channels.once('value', (snapshot) => {
        const channels = snapshot.val() || {};
        document.getElementById('channelCountBadge').textContent = 
            Object.keys(channels).length;
    });
    
    updateUnreadBadge();
}

function updateUnreadBadge() {
    // Özel sohbetlerde okunmamış mesaj sayısı
    let total = 0;
    
    db.privateChats.once('value', (snapshot) => {
        const chats = snapshot.val() || {};
        for (let chatId in chats) {
            if (chatId.includes(currentUser?.id)) {
                const msgs = Object.values(chats[chatId] || {});
                total += msgs.filter(m => m.senderId !== currentUser?.id && !m.read).length;
            }
        }
        document.getElementById('chatListBadge').textContent = total || 0;
    });
}

// ========== SAYFA YÜKLENDİĞİNDE ==========
window.addEventListener('load', async () => {
    await initOwnerHash();
    
    // Otomatik giriş dene
    const autoLoginSuccess = await autoLogin();
    
    if (!autoLoginSuccess) {
        document.getElementById('loginOverlay').classList.remove('hidden');
    }
    
    // YouTube API'yi yükle
    if (typeof YT === 'undefined' || !YT.Player) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        document.getElementsByTagName('script')[0].parentNode.insertBefore(tag, document.getElementsByTagName('script')[0]);
    }
});

// ========== PANEL FONKSİYONLARI ==========
function openPlaylistPanel() {
    document.getElementById('playlistPanel').classList.add('active');
}

function closePlaylistPanel() {
    document.getElementById('playlistPanel').classList.remove('active');
}

function openMorePanel() {
    document.getElementById('morePanel').classList.add('active');
}

function closeMorePanel() {
    document.getElementById('morePanel').classList.remove('active');
}

function openProfilePanel() {
    openMorePanel();
    loadLeftPanel('profile');
}

function openSearch() {
    addSystemMessage('🔍 Arama yakında...');
}

function goHome() {
    joinChannel('genel');
}

function openShareSheet() {
    addSystemMessage('📤 Paylaş yakında...');
}

function switchToGeneralChat() {
    closePrivateChat();
}

function openNotificationsPanel() {
    addSystemMessage('🔔 Bildirimler yakında...');
}

function openSubscriptions() {
    loadLeftPanel('subscriptions');
}

function openChannelPanel() {
    loadLeftPanel('channels');
}

function openChatListPanel() {
    loadLeftPanel('chatlist');
}

function openNotificationPanel() {
    loadLeftPanel('notifications');
}
