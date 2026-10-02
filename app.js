/* =====================================================================
   CETCETY – app.js
   Ana uygulama başlatma, YouTube player, playlist, UI olayları, mobil
   ===================================================================== */

let player = null;
let playlist = [];
let currentVideoId = 'i75BZYOAPl4';
let cameraStream = null;
let mediaRecorder = null;
let recordedChunks = [];
let isRecording = false;
let recordingTimer = null;
let recordingStartTime = null;
let ownerPrivateListenerActive = false;
let originalTitle = document.title;
let currentUserListTab = 'all';

/* ============ INIT ============ */
function initApp() {
    const messageInput = document.getElementById('message-input');
    const privateInput = document.getElementById('private-input');
    if (messageInput) {
        messageInput.removeEventListener('keydown', window.messageInputHandler);
        window.messageInputHandler = (event) => handleEnterKey(event, 'sendMessage');
        messageInput.addEventListener('keydown', window.messageInputHandler);
    }
    if (privateInput) {
        privateInput.removeEventListener('keydown', window.privateInputHandler);
        window.privateInputHandler = (event) => handleEnterKey(event, 'sendPrivateMessage');
        privateInput.addEventListener('keydown', window.privateInputHandler);
    }

    const overlay = document.getElementById('overlay');
    if (overlay) {
        overlay.addEventListener('click', function(e) {
            if (e.target === this) {
                closePrivateChat();
                closeAdminModal();
                closeCommandModal();
                closeOwnerPrivateModal();
                closeCameraModal();
                closeAddOperatorModal();
                closeRemoveOperatorModal();
                closeReportModal();
                closeProfileModal();
                document.getElementById('ownerPanel').classList.remove('active');
                document.getElementById('adminPanel').classList.remove('active');
                document.getElementById('coadminPanel').classList.remove('active');
                document.getElementById('operatorPanel').classList.remove('active');
                document.getElementById('verifiedPanel').classList.remove('active');
            }
        });
    }

    if (typeof YT !== 'undefined') initYouTubePlayer();
    else setTimeout(initYouTubePlayer, 1000);

    if (messagesRef) {
        messagesRef.limitToLast(MESSAGE_LIMIT).off('child_added');
        messagesRef.limitToLast(MESSAGE_LIMIT).on('child_added', (snapshot) => {
            const newMessage = { id: snapshot.key, ...snapshot.val() };
            if (!document.getElementById(`msg_${snapshot.key}`)) appendMessageToUI(newMessage);
        });
    }

    setupRoleListeners();
    loadRegisteredUsers();
    loadCustomCommands();

    window.addEventListener('beforeunload', function() {
        if (currentUser && usersRef) usersRef.child(currentUser.name).update({ isOnline: false, lastSeen: Date.now() });
        if (cameraStream) cameraStream.getTracks().forEach(track => track.stop());
        if (typeof audioStream !== 'undefined' && audioStream) audioStream.getTracks().forEach(track => track.stop());
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closeAllPanelsAndModals();
    });

    startAdCycle();
    initializeMobileChatSheet();
}

/* ============ YOUTUBE ============ */
function initYouTubePlayer() {
    if (typeof YT !== 'undefined' && YT.Player) {
        player = new YT.Player('youtube-player', {
            height: '100%', width: '100%', videoId: currentVideoId,
            playerVars: { 'autoplay': 1, 'controls': 1, 'rel': 0, 'modestbranding': 1 },
            events: {
                'onReady': function(event) {
                    const placeholder = document.querySelector('.video-placeholder');
                    if (placeholder) placeholder.style.display = 'none';
                },
                'onStateChange': function(event) {
                    if (event.data === YT.PlayerState.ENDED) playNextVideo();
                }
            }
        });
    }
}
function playVideo(videoId) {
    if (!videoId) return;
    currentVideoId = videoId;
    if (player && player.loadVideoById) player.loadVideoById(videoId);
    updatePlaylistUIWeb();
    updatePlaylistDrawer();
}
function playNextVideo() {
    if (!playlist || playlist.length === 0) return;
    const currentIndex = playlist.findIndex(item => item.id === currentVideoId);
    if (currentIndex === -1) { playVideo(playlist[0].id); return; }
    const nextIndex = (currentIndex + 1) % playlist.length;
    playVideo(playlist[nextIndex].id);
}

/* ============ PLAYLIST ============ */
function loadGeneralPlaylist() {
    if (!playlistRef) return;
    playlistRef.off();
    playlistRef.on('value', (snapshot) => {
        const data = snapshot.val();
        playlist = data ? Object.values(data).filter(item => item && item.id && item.title) : [];
        updatePlaylistUIWeb();
        updatePlaylistDrawer();
        if (playlist.length > 0 && (!currentVideoId || !playlist.some(item => item.id === currentVideoId))) {
            playVideo(playlist[0].id);
        } else if (playlist.length === 0 && player && player.stopVideo) {
            player.stopVideo(); currentVideoId = null;
        }
    });
}
function updatePlaylistUIWeb() {
    const container = document.getElementById('playlistItemsWeb');
    if (!container) return;
    container.innerHTML = '';
    playlist.forEach(item => {
        if (!item || !item.id) return;
        const div = document.createElement('div');
        div.className = 'playlist-item' + (item.id === currentVideoId ? ' active' : '');
        div.onclick = () => playVideo(item.id);
        div.innerHTML = `
            <div class="playlist-thumb"><i class="fas fa-film"></i></div>
            <div class="playlist-info"><div class="playlist-title">${item.title || 'Başlıksız Video'}</div></div>
            <button class="playlist-delete" onclick="removeFromPlaylist('${item.id}', event)"><i class="fas fa-trash"></i></button>`;
        container.appendChild(div);
    });
}
function updatePlaylistDrawer() {
    const container = document.getElementById('playlistDrawerItems');
    if (!container) return;
    container.innerHTML = '';
    playlist.forEach(item => {
        const div = document.createElement('div');
        div.className = 'playlist-item' + (item.id === currentVideoId ? ' active' : '');
        div.onclick = () => playVideo(item.id);
        div.innerHTML = `
            <div class="playlist-thumb"><i class="fas fa-film"></i></div>
            <div class="playlist-info"><div class="playlist-title">${item.title}</div></div>
            <button class="playlist-delete" onclick="removeFromPlaylist('${item.id}', event)"><i class="fas fa-trash"></i></button>`;
        container.appendChild(div);
    });
}
function removeFromPlaylist(videoId, event) {
    event.stopPropagation();
    if (playlistRef) {
        playlistRef.once('value', (snapshot) => {
            const items = snapshot.val();
            if (items) {
                Object.entries(items).forEach(([key, value]) => {
                    if (value.id === videoId) playlistRef.child(key).remove();
                });
            }
        });
    }
    const index = playlist.findIndex(item => item.id === videoId);
    if (index !== -1) {
        playlist.splice(index, 1);
        updatePlaylistUIWeb(); updatePlaylistDrawer();
        if (playlist.length > 0 && videoId === currentVideoId) playVideo(playlist[0].id);
        else if (playlist.length === 0) { if (player && player.stopVideo) player.stopVideo(); currentVideoId = null; }
    }
}
function addToPlaylistFromWeb() {
    if (!hasRole('admin')) { alert('Bu işlem için yetkiniz yok!'); return; }
    const url = document.getElementById('playlistUrlWeb').value.trim();
    const customTitle = document.getElementById('playlistVideoTitleWeb').value.trim();
    if (!url) return;
    const videoId = extractVideoId(url);
    if (!videoId) { alert('Geçersiz YouTube linki!'); return; }
    const newPlaylistItem = {
        id: videoId, title: customTitle || 'Video ' + (playlist.length + 1),
        url: url, addedBy: currentUser ? currentUser.name : 'Anonim', timestamp: Date.now()
    };
    if (playlistRef) {
        playlistRef.push(newPlaylistItem);
        incrementWriteCount();
        if (playlist.length === 0) setTimeout(() => { if (playlist.length > 0) playVideo(playlist[0].id); }, 500);
    }
    document.getElementById('playlistUrlWeb').value = '';
    document.getElementById('playlistVideoTitleWeb').value = '';
}
function addToPlaylistFromMobile() {
    if (!hasRole('admin')) { alert('Bu işlem için yetkiniz yok!'); return; }
    const url = document.getElementById('playlistUrlMobile').value.trim();
    const customTitle = document.getElementById('playlistVideoTitleMobile').value.trim();
    if (!url) return;
    const videoId = extractVideoId(url);
    if (!videoId) { alert('Geçersiz YouTube linki!'); return; }
    const newPlaylistItem = {
        id: videoId, title: customTitle || 'Video ' + (playlist.length + 1),
        url: url, addedBy: currentUser ? currentUser.name : 'Anonim', timestamp: Date.now()
    };
    if (playlistRef) playlistRef.push(newPlaylistItem);
    document.getElementById('playlistUrlMobile').value = '';
    document.getElementById('playlistVideoTitleMobile').value = '';
}
function togglePlaylistDrawer() {
    const drawer = document.getElementById('playlistDrawer');
    drawer.classList.toggle('active');
    updatePlaylistDrawer();
}
function closePlaylistDrawer() { document.getElementById('playlistDrawer').classList.remove('active'); }

/* ============ PROFİL ============ */
function openProfileModal() {
    if (!currentUser) return;
    document.getElementById('profileUsername').value = currentUser.name;
    document.getElementById('profileRole').value = getRoleLabel(currentUser.role);
    document.getElementById('profileRegistered').value = currentUser.isRegistered ? 'Evet' : 'Hayır';
    document.getElementById('profileBio').value = currentProfileBio || '';
    document.getElementById('passwordChangeField').style.display = currentUser.isRegistered ? 'block' : 'none';
    if (currentProfileAvatar) {
        document.getElementById('avatarPlaceholder').style.display = 'none';
        const img = document.getElementById('avatarImage');
        img.src = currentProfileAvatar; img.style.display = 'block';
        document.getElementById('avatarPreview').classList.add('has-image');
    } else {
        document.getElementById('avatarPlaceholder').style.display = 'block';
        document.getElementById('avatarImage').style.display = 'none';
        document.getElementById('avatarPreview').classList.remove('has-image');
    }
    document.getElementById('profileModal').style.display = 'flex';
    document.getElementById('overlay').style.display = 'block';
}
function closeProfileModal() {
    document.getElementById('profileModal').style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
}
function saveProfile() {
    const bio = document.getElementById('profileBio').value;
    const newPassword = document.getElementById('newPassword').value;
    currentProfileBio = bio;
    if (newPassword && currentUser.isRegistered) {
        registeredUsersRef.child(currentUser.name).update({ password: newPassword });
        incrementWriteCount();
    }
    if (profilesRef && currentUser) {
        profilesRef.child(currentUser.name).set({ bio, avatar: currentProfileAvatar || null, updatedAt: Date.now() });
        incrementWriteCount();
    }
    addSystemMessage('✅ Profil bilgileri güncellendi!');
    closeProfileModal();
}
document.getElementById('avatarUpload').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Lütfen bir resim dosyası seçin!'); return; }
    if (file.size > 2 * 1024 * 1024) { alert('Dosya çok büyük! Maksimum 2MB.'); return; }
    const reader = new FileReader();
    reader.onload = function(event) {
        currentProfileAvatar = event.target.result;
        document.getElementById('avatarPlaceholder').style.display = 'none';
        const img = document.getElementById('avatarImage');
        img.src = currentProfileAvatar; img.style.display = 'block';
        document.getElementById('avatarPreview').classList.add('has-image');
        const profileIcon = document.getElementById('profileAvatarPreview');
        profileIcon.innerHTML = `<img src="${currentProfileAvatar}" style="width:100%;height:100%;object-fit:cover;">`;
        document.getElementById('profileIcon').classList.add('has-image');
    };
    reader.readAsDataURL(file);
});

async function deleteAccount() {
    if (!currentUser) return;
    if (!confirm('⚠️ TÜM HESABINIZI SİLMEK ÜZERESİNİZ!\n\nBu işlem geri alınamaz.\n\nDevam etmek istediğinize emin misiniz?')) return;
    try {
        const username = currentUser.name;
        if (profilesRef) await profilesRef.child(username).remove();
        if (registeredUsersRef) await registeredUsersRef.child(username).remove();
        if (blocksRef) await blocksRef.child(username).remove();
        if (usersRef) await usersRef.child(username).remove();
        if (bansRef) await bansRef.child(username).remove();
        if (globalBansRef) await globalBansRef.child(username).remove();
        for (const role of Object.keys(roleListConfig)) await removeFromRoleList(role, username);
        addSystemMessage('✅ Hesabınız başarıyla silindi. Çıkış yapılıyor...');
        setTimeout(() => logout(), 2000);
    } catch (error) {
        console.error("Hesap silme hatası:", error);
        alert('❌ Hesap silinirken bir hata oluştu!');
    }
}

/* ============ MODAL KAPATMA ============ */
function closeAddOperatorModal() { document.getElementById('addOperatorModal').style.display = 'none'; document.getElementById('overlay').style.display = 'none'; }
function closeRemoveOperatorModal() { document.getElementById('removeOperatorModal').style.display = 'none'; document.getElementById('overlay').style.display = 'none'; }
function closeCameraModal() {
    if (cameraStream) { cameraStream.getTracks().forEach(track => track.stop()); cameraStream = null; }
    document.getElementById('cameraModal').style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
}
function closeOwnerPrivateModal() {
    document.getElementById('ownerPrivateModal').style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
}
function closeAllPanelsAndModals() {
    closePrivateChat();
    closeAdminModal();
    closeCommandModal();
    closeOwnerPrivateModal();
    closeCameraModal();
    closeAddOperatorModal();
    closeRemoveOperatorModal();
    closeProfileModal();
    closeReportModal();
    document.getElementById('ownerPanel').classList.remove('active');
    document.getElementById('adminPanel').classList.remove('active');
    document.getElementById('coadminPanel').classList.remove('active');
    document.getElementById('operatorPanel').classList.remove('active');
    document.getElementById('verifiedPanel').classList.remove('active');
    if (typeof isAudioRecording !== 'undefined' && isAudioRecording) stopAudioRecording();
    document.getElementById('usersSidebar').classList.remove('active');
    document.getElementById('notificationPanel').classList.remove('active');
    document.getElementById('mobileMenu').classList.remove('active');
    closePlaylistDrawer();
}

/* ============ OWNER ÖZEL MESAJ ============ */
function showAllPrivateChats() {
    if (!hasRole('owner')) { addSystemMessage("⛔ Bu komutu sadece Owner kullanabilir!"); return; }
    document.getElementById('ownerPrivateModal').style.display = 'flex';
    document.getElementById('ownerPrivateModal').setAttribute('data-view', 'list');
    document.getElementById('ownerPrivateTitle').innerHTML = '<i class="fas fa-crown"></i> Owner - Özel Mesajlar';
    document.getElementById('overlay').style.display = 'block';
    updateOwnerChatList();
}
function updateOwnerChatList() {
    const container = document.getElementById('ownerPrivateMessages');
    container.innerHTML = '';
    const sortedChats = Object.entries(ownerPrivateMessages || {})
        .sort((a, b) => (b[1][b[1].length - 1]?.timestamp || 0) - (a[1][a[1].length - 1]?.timestamp || 0));
    if (sortedChats.length === 0) { container.innerHTML = '<div style="color:var(--text-secondary); text-align:center; padding:20px;">Henüz özel mesaj yok.</div>'; return; }
    sortedChats.forEach(([key, messages]) => {
        if (messages && messages.length > 0) {
            const [user1, user2] = key.split('_');
            const lastMessage = messages[messages.length - 1];
            let lastMsgText = lastMessage.text || '';
            if (lastMessage.image) lastMsgText = '📸 Fotoğraf';
            else if (lastMessage.audio) lastMsgText = '🎤 Ses Kaydı';
            const liveCount = messages.filter(m => m.source === 'live').length;
            const archiveCount = messages.filter(m => m.source === 'archive').length;
            const chatDiv = document.createElement('div');
            chatDiv.className = 'owner-chat-list';
            chatDiv.onclick = () => openOwnerPrivateMessages(user1, user2);
            chatDiv.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong><i class="fas fa-users"></i> ${user1} ↔ ${user2}</strong>
                    <button class="owner-delete-btn" onclick="deleteAllChatMessages('${key}', event)">Tümünü Sil</button>
                </div>
                <small>Son: ${lastMessage.sender}: ${lastMsgText.length > 30 ? lastMsgText.substring(0, 30) + '...' : lastMsgText}</small><br>
                <small style="color:var(--text-secondary);">${lastMessage.time} (Güncel: ${liveCount} | Arşiv: ${archiveCount} | Toplam: ${messages.length} mesaj)</small>`;
            container.appendChild(chatDiv);
        }
    });
}
async function openOwnerPrivateMessages(user1, user2) {
    if (!isOwner) return;
    const chatId = `chat_${user1}_${user2}`;
    document.getElementById('ownerPrivateModal').style.display = 'flex';
    document.getElementById('ownerPrivateModal').setAttribute('data-view', chatId);
    document.getElementById('ownerPrivateTitle').innerHTML = `<i class="fas fa-crown"></i> ${user1} ↔ ${user2} (Tüm Arşiv)`;
    document.getElementById('overlay').style.display = 'block';
    const container = document.getElementById('ownerPrivateMessages');
    container.innerHTML = '<div style="text-align:center;">Yükleniyor...</div>';
    try {
        const archiveSnapshot = await privateChatsArchiveRef.child(chatId).once('value');
        const archiveMessages = archiveSnapshot.val() || {};
        const liveSnapshot = await privateChatsRef.child(chatId).once('value');
        const liveMessages = liveSnapshot.val() || {};
        let allMessages = [
            ...Object.entries(archiveMessages).map(([id, data]) => ({ id, ...data, source: 'archive' })),
            ...Object.entries(liveMessages).map(([id, data]) => ({ id, ...data, source: 'live' }))
        ];
        allMessages.sort((a, b) => a.timestamp - b.timestamp);
        container.innerHTML = '';
        if (allMessages.length === 0) { container.innerHTML = '<div style="color:var(--text-secondary); text-align:center; padding:20px;">Henüz mesaj yok.</div>'; return; }
        allMessages.forEach(msg => addMessageToOwnerView(msg));
    } catch (error) {
        container.innerHTML = '<div style="color:var(--ban); text-align:center;">Mesajlar yüklenemedi!</div>';
    }
}
function addMessageToOwnerView(message) {
    const container = document.getElementById('ownerPrivateMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message-item';
    messageDiv.style.marginBottom = '10px';
    messageDiv.id = `owner_msg_${message.id}`;
    let content = '';
    if (message.image) content = `<img src="${message.image}" class="message-image" onclick="showImageModal('${message.image}')">`;
    else if (message.audio) content = `<audio src="${message.audio}" controls style="max-width:200px;"></audio>`;
    else content = message.text || '';
    const sourceIcon = message.source === 'archive' ? '📦' : '💬';
    const sourceText = message.source === 'archive' ? 'Arşiv' : 'Güncel';
    messageDiv.innerHTML = `
        <div class="message-header">
            <span class="message-user"><i class="fas fa-user"></i> ${message.sender} → ${message.receiver} <span style="font-size:10px; color:var(--text-muted);">${sourceIcon} ${sourceText}</span></span>
            <div>
                <span class="message-time">${message.time}</span>
                <button class="owner-delete-btn" onclick="deleteOwnerPrivateMessage('${message.chatId}', '${message.id}')"><i class="fas fa-trash"></i></button>
            </div>
        </div>
        <div class="message-content">${content}</div>`;
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
}
async function deleteOwnerPrivateMessage(chatId, messageId) {
    if (!isOwner) return;
    if (!confirm('Bu özel mesajı silmek istediğinize emin misiniz?')) return;
    try {
        await privateChatsRef.child(chatId).child(messageId).remove();
        const archiveSnapshot = await privateChatsArchiveRef.child(chatId).once('value');
        const archiveMessages = archiveSnapshot.val();
        if (archiveMessages) {
            for (const [archId, archMsg] of Object.entries(archiveMessages)) {
                if (archMsg.originalMessageId === messageId || archMsg.id === messageId) { await privateChatsArchiveRef.child(chatId).child(archId).remove(); break; }
            }
        }
        const messageDiv = document.getElementById(`owner_msg_${messageId}`);
        if (messageDiv) messageDiv.remove();
        addSystemMessage('✅ Özel mesaj silindi!');
    } catch (error) { addSystemMessage('❌ Özel mesaj silinemedi!'); }
}
async function deleteAllChatMessages(key, event) {
    event.stopPropagation();
    if (!isOwner) return;
    const [user1, user2] = key.split('_');
    if (!confirm(`"${user1} ↔ ${user2}" arasındaki TÜM mesajları silmek istediğinize emin misiniz?`)) return;
    try {
        const chatId = `chat_${user1}_${user2}`;
        await privateChatsRef.child(chatId).remove();
        await privateChatsArchiveRef.child(chatId).remove();
        delete ownerPrivateMessages[key];
        updateOwnerChatList();
        addSystemMessage(`✅ ${user1} ↔ ${user2} arasındaki tüm mesajlar silindi!`);
    } catch (error) { addSystemMessage('❌ Sohbet silinemedi!'); }
}
async function deleteAllPrivateMessages() {
    if (!isOwner) return;
    if (!confirm('TÜM ÖZEL MESAJLARI silmek istediğinize emin misiniz?')) return;
    try {
        await privateChatsRef.remove();
        await privateChatsArchiveRef.remove();
        ownerPrivateMessages = {}; allPrivateMessages = [];
        document.getElementById('ownerPrivateMessages').innerHTML = '<div style="color:var(--text-secondary); text-align:center; padding:20px;">Tüm özel mesajlar silindi.</div>';
        addSystemMessage('✅ Tüm özel mesajlar silindi!');
    } catch (error) { addSystemMessage('❌ Özel mesajlar silinemedi!'); }
}
function searchPrivateMessages() { addSystemMessage('🔍 Arama fonksiyonu yakında...'); }
function searchPrivateMessagesPrompt() {
    const query = prompt('Aramak istediğiniz kelime:');
    if (query) { document.getElementById('searchQuery').value = query; searchPrivateMessages(); }
}

/* ============ MOBİL FONKSİYONLAR ============ */
function updateMobileUI() {
    const btn = document.querySelector('.mobile-playlist-btn');
    if (btn) btn.style.display = 'none';
}
function toggleMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    menu.classList.toggle('active');
}
function openProfileModalFromMenu() { toggleMobileMenu(); setTimeout(openProfileModal, 50); }
function togglePlaylistDrawerFromMenu() { toggleMobileMenu(); setTimeout(togglePlaylistDrawer, 50); }
function toggleOwnerPanelFromMenu() { toggleMobileMenu(); setTimeout(toggleOwnerPanel, 50); }
function toggleAdminPanelFromMenu() { toggleMobileMenu(); setTimeout(toggleAdminPanel, 50); }
function toggleCoAdminPanelFromMenu() { toggleMobileMenu(); setTimeout(toggleCoAdminPanel, 50); }
function toggleOperatorPanelFromMenu() { toggleMobileMenu(); setTimeout(toggleOperatorPanel, 50); }
function toggleVerifiedPanelFromMenu() { toggleMobileMenu(); setTimeout(toggleVerifiedPanel, 50); }

/* ============ OPERATÖR MODALLARI ============ */
function addChannelOperator() { alert('Bu özellik şimdilik devre dışı.'); }
function removeChannelOperator() { alert('Bu özellik şimdilik devre dışı.'); }

/* ============ KAMERA ============ */
function capturePhoto() { alert('Fotoğraf çekme özelliği yakında...'); }
function startVideoRecording() { alert('Video kayıt özelliği yakında...'); }
function stopVideoRecording() { alert('Video kayıt durduruldu.'); }

/* ============ BAŞLATMA ============ */
window.addEventListener('load', function() {
    originalTitle = document.title;
    if (typeof YT === 'undefined') {
        const checkYT = setInterval(() => {
            if (typeof YT !== 'undefined') { clearInterval(checkYT); initYouTubePlayer(); }
        }, 500);
    }
    initializeFirebase();
    updateMobileUI();
    const nickInput = document.getElementById('login-nick');
    const passInput = document.getElementById('login-password');
    if (nickInput) { nickInput.focus(); nickInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') login(); }); }
    if (passInput) passInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') login(); });
});

/* ============ GLOBAL FONKSİYON ATAMALARI (HTML onclick için) ============ */
window.login = login;
window.logout = logout;
window.togglePasswordVisibility = togglePasswordVisibility;
window.toggleOwnerPanel = toggleOwnerPanel;
window.toggleAdminPanel = toggleAdminPanel;
window.toggleCoAdminPanel = toggleCoAdminPanel;
window.toggleOperatorPanel = toggleOperatorPanel;
window.toggleVerifiedPanel = toggleVerifiedPanel;
window.switchOwnerTab = switchOwnerTab;
window.switchAdminTab = switchAdminTab;
window.switchCoAdminTab = switchCoAdminTab;
window.switchOperatorTab = switchOperatorTab;
window.switchVerifiedTab = switchVerifiedTab;
window.openProfileModal = openProfileModal;
window.closeProfileModal = closeProfileModal;
window.saveProfile = saveProfile;
window.deleteAccount = deleteAccount;
window.toggleUserList = toggleUserList;
window.switchUserListTab = switchUserListTab;
window.toggleNotificationPanel = toggleNotificationPanel;
window.closeNotificationPanel = closeNotificationPanel;
window.clearAllNotifications = clearAllNotifications;
window.handleNotificationClick = handleNotificationClick;
window.sendMessage = sendMessage;
window.sendPrivateMessage = sendPrivateMessage;
window.closePrivateChat = closePrivateChat;
window.openPrivateChat = openPrivateChat;
window.autoResize = autoResize;
window.handleEnterKey = handleEnterKey;
window.toggleChatPopover = toggleChatPopover;
window.insertChatEmoji = insertChatEmoji;
window.showChatRules = showChatRules;
window.refreshChatMessages = refreshChatMessages;
window.closeChatPanel = closeChatPanel;
window.openChatPanel = openChatPanel;
window.showImageModal = showImageModal;
window.deleteMessage = deleteMessage;
window.deletePrivateMessage = deletePrivateMessage;
window.toggleBlockUser = toggleBlockUser;
window.openReportModal = openReportModal;
window.closeReportModal = closeReportModal;
window.submitReport = submitReport;
window.openGallery = openGallery;
window.openCameraDirect = openCameraDirect;
window.startAudioRecording = startAudioRecording;
window.stopAudioRecording = stopAudioRecording;
window.togglePlaylistDrawer = togglePlaylistDrawer;
window.closePlaylistDrawer = closePlaylistDrawer;
window.addToPlaylistFromWeb = addToPlaylistFromWeb;
window.addToPlaylistFromMobile = addToPlaylistFromMobile;
window.removeFromPlaylist = removeFromPlaylist;
window.toggleMobileMenu = toggleMobileMenu;
window.openProfileModalFromMenu = openProfileModalFromMenu;
window.togglePlaylistDrawerFromMenu = togglePlaylistDrawerFromMenu;
window.toggleOwnerPanelFromMenu = toggleOwnerPanelFromMenu;
window.toggleAdminPanelFromMenu = toggleAdminPanelFromMenu;
window.toggleCoAdminPanelFromMenu = toggleCoAdminPanelFromMenu;
window.toggleOperatorPanelFromMenu = toggleOperatorPanelFromMenu;
window.toggleVerifiedPanelFromMenu = toggleVerifiedPanelFromMenu;
window.openAdminRegisterModal = openAdminRegisterModal;
window.closeAdminModal = closeAdminModal;
window.registerUser = registerUser;
window.unregisterUser = unregisterUser;
window.openCommandModal = openCommandModal;
window.closeCommandModal = closeCommandModal;
window.saveCustomCommand = saveCustomCommand;
window.deleteCustomCommand = deleteCustomCommand;
window.closeAddOperatorModal = closeAddOperatorModal;
window.closeRemoveOperatorModal = closeRemoveOperatorModal;
window.addChannelOperator = addChannelOperator;
window.removeChannelOperator = removeChannelOperator;
window.closeCameraModal = closeCameraModal;
window.capturePhoto = capturePhoto;
window.startVideoRecording = startVideoRecording;
window.stopVideoRecording = stopVideoRecording;
window.closeOwnerPrivateModal = closeOwnerPrivateModal;
window.showAllPrivateChats = showAllPrivateChats;
window.openOwnerPrivateMessages = openOwnerPrivateMessages;
window.deleteOwnerPrivateMessage = deleteOwnerPrivateMessage;
window.deleteAllChatMessages = deleteAllChatMessages;
window.deleteAllPrivateMessages = deleteAllPrivateMessages;
window.searchPrivateMessages = searchPrivateMessages;
window.searchPrivateMessagesPrompt = searchPrivateMessagesPrompt;
window.updateOwnerChatList = updateOwnerChatList;
window.addMessageToOwnerView = addMessageToOwnerView;
window.kickUserPrompt = kickUserPrompt;
window.muteUserPrompt = muteUserPrompt;
window.unmuteUserPrompt = unmuteUserPrompt;
window.openGlobalBanPanel = openGlobalBanPanel;
window.showBanList = showBanList;
window.promptUnban = promptUnban;
window.promptAddVerified = promptAddVerified;
window.promoteToCoAdmin = promoteToCoAdmin;
window.promoteToOperator = promoteToOperator;
window.promoteToVerified = promoteToVerified;
window.openUnregisterModal = openUnregisterModal;
window.clearAllMessagesPrompt = clearAllMessagesPrompt;
window.updateOwnerRoleList = updateOwnerRoleList;
window.updateOwnerCommandsList = updateOwnerCommandsList;
window.deleteCustomCommandByName = deleteCustomCommandByName;
window.deleteReport = deleteReport;
window.adminUnblock = adminUnblock;
window.addAdContent = addAdContent;
window.deleteAdContent = deleteAdContent;
window.editAdContent = editAdContent;
window.moveAdContentUp = moveAdContentUp;
window.moveAdContentDown = moveAdContentDown;
window.saveAdContentOrder = saveAdContentOrder;
window.updateAdContentsList = updateAdContentsList;
window.showAdManually = showAdManually;
window.toggleAdCycle = toggleAdCycle;
window.closeAd = closeAd;
window.emitTyping = emitTyping;
window.switchUserListTab = switchUserListTab;
window.hasRole = hasRole;
window.getRoleLabel = getRoleLabel;
window.getRoleLevel = getRoleLevel;
window.addToRoleList = addToRoleList;
window.removeFromRoleList = removeFromRoleList;
window.ROLES = ROLES;