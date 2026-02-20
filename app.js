// ========== ANA UYGULAMA BAŞLANGICI ==========

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', function() {
    ACTIVE_USER = JSON.parse(localStorage.getItem('cetcety_active_user'));
    
    if (ACTIVE_USER && typeof database !== 'undefined' && database) {
        if (typeof updateUserOnlineStatus === 'function') {
            updateUserOnlineStatus(ACTIVE_USER, 'genel', 'online');
        }
        if (typeof listenChannelMessages === 'function') {
            listenChannelMessages('genel');
            listenChannelInfo('genel');
            listenChannelUsers('genel');
            listenPrivateMessages();
        }
    }
    
    if (ACTIVE_USER) {
        if (!channels.genel.onlineUsers.includes(ACTIVE_USER.name)) {
            channels.genel.onlineUsers.push(ACTIVE_USER.name);
        }
        if (typeof saveChannels === 'function') {
            saveChannels();
        }
        
        document.getElementById('loginOverlay').classList.add('hidden');
        document.getElementById('app').style.display = 'flex';
        
        if (typeof updateUIForUser === 'function') updateUIForUser();
        if (typeof loadLeftPanel === 'function') loadLeftPanel('subscriptions');
        if (typeof updateAllBadges === 'function') updateAllBadges();
        if (typeof updateMediaDisplay === 'function') updateMediaDisplay();
        if (typeof addSystemMessage === 'function') addSystemMessage(`👋 Tekrar hoş geldin, ${ACTIVE_USER.name}!`);
        
        // 20 dakikada bir eski mesajları temizle
        setInterval(cleanupOldMessages, 5 * 60 * 1000);
        
        if (ACTIVE_USER.role === 'owner' || ACTIVE_USER.role === 'admin') {
            if (!ACTIVE_USER.subscribedChannels.includes('admin')) ACTIVE_USER.subscribedChannels.push('admin');
            if (!channels.admin.onlineUsers.includes(ACTIVE_USER.name)) channels.admin.onlineUsers.push(ACTIVE_USER.name);
            if (typeof saveChannels === 'function') saveChannels();
        }
        
        if (ACTIVE_USER.role === 'owner' && typeof checkPrivateSpyStatus === 'function') {
            checkPrivateSpyStatus();
        }
        
        if (typeof YT === 'undefined' || !YT.Player) {
            let tag = document.createElement('script');
            tag.src = 'https://www.youtube.com/iframe_api';
            let firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        } else if (typeof initYouTubePlayer === 'function') {
            initYouTubePlayer();
        }
    }
});

// ESC tuşu ile panelleri kapat
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        if (typeof closePrivateChat === 'function') closePrivateChat();
        if (typeof closeModal === 'function') {
            closeModal('youtubeModal');
            closeModal('avatarModal');
            closeModal('privateSpyModal');
            closeModal('kvkkModal');
            closeModal('termsModal');
        }
        const panelHeader = document.querySelector('.panel-header h3');
        if (panelHeader && !panelHeader.innerText.includes('Abonelikler') && typeof closeLeftPanel === 'function') {
            closeLeftPanel();
        }
    }
});

// Sayfa kapatılırken online durumunu temizle
window.addEventListener('beforeunload', function() {
    if (ACTIVE_USER && typeof updateUserOnlineStatus === 'function' && typeof database !== 'undefined' && database) {
        updateUserOnlineStatus(ACTIVE_USER, currentChannel, 'offline');
    }
});
