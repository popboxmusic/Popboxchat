// ========== ANA UYGULAMA BAŞLANGICI ==========

// Global değişkenler (diğer dosyalarda da kullanılacak)
let ytPlayer = null;
let ytPlayerReady = false;
let isMuted = false;
let isPlaying = true;
let USERS_DB = JSON.parse(localStorage.getItem('cetcety_users')) || [];
let ACTIVE_USER = null;
let BLOCKED_USERS = JSON.parse(localStorage.getItem('cetcety_blocks')) || {};
let PRIVATE_CHATS = JSON.parse(localStorage.getItem('cetcety_private_chats')) || {};
let BANNED_WORDS = JSON.parse(localStorage.getItem('cetcety_banned_words')) || ['spam', 'reklam', 'şiddet', 'hakaret'];
let CUSTOM_COMMANDS = JSON.parse(localStorage.getItem('cetcety_custom_commands')) || [];
let CHANNEL_MESSAGES = JSON.parse(localStorage.getItem('cetcety_channel_messages')) || {};
let currentChannel = 'genel';

// Kanallar
let channels = JSON.parse(localStorage.getItem('cetcety_channels')) || {
    'genel': { 
        name:'genel', 
        owner:'MateKy', 
        ownerRole:'owner', 
        coAdmins:[], 
        subscribers:1, 
        online:1, 
        isHidden:false,
        isSuperHidden: false,
        youtube: { 
            currentVideo:'jfKfPfyJRdk', 
            currentTitle:'CETCETY Radio', 
            currentArtist:'MateKy', 
            playlist:[{id:'jfKfPfyJRdk', title:'CETCETY Radio', addedBy:'MateKy', role:'owner'}]
        },
        onlineUsers:[]
    },
    'admin': { 
        name:'admin', 
        owner:'MateKy', 
        ownerRole:'owner', 
        coAdmins:[], 
        subscribers:1, 
        online:1, 
        isHidden:false,
        isSuperHidden: false,
        youtube: { 
            currentVideo:'jfKfPfyJRdk', 
            currentTitle:'Admin Kanalı', 
            currentArtist:'MateKy', 
            playlist:[{id:'jfKfPfyJRdk', title:'Admin Kanalı', addedBy:'MateKy', role:'owner'}]
        },
        onlineUsers:[]
    }
};

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
            saveChannels();
        }
        document.getElementById('loginOverlay').classList.add('hidden');
        document.getElementById('app').style.display = 'flex';
        updateUIForUser();
        loadLeftPanel('subscriptions');
        updateAllBadges();
        updateMediaDisplay();
        addSystemMessage(`👋 Tekrar hoş geldin, ${ACTIVE_USER.name}!`);
        
        // 20 dakikada bir eski mesajları temizle
        setInterval(cleanupOldMessages, 5 * 60 * 1000);
        
        if (ACTIVE_USER.role === 'owner' || ACTIVE_USER.role === 'admin') {
            if (!ACTIVE_USER.subscribedChannels.includes('admin')) ACTIVE_USER.subscribedChannels.push('admin');
            if (!channels.admin.onlineUsers.includes(ACTIVE_USER.name)) channels.admin.onlineUsers.push(ACTIVE_USER.name);
            saveChannels();
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
        closeModal('youtubeModal');
        closeModal('avatarModal');
        closeModal('privateSpyModal');
        closeModal('kvkkModal');
        closeModal('termsModal');
        const panelHeader = document.querySelector('.panel-header h3');
        if (panelHeader && !panelHeader.innerText.includes('Abonelikler') && typeof closeLeftPanel === 'function') {
            closeLeftPanel();
        }
    }
});

// Sayfa kapatılırken online durumunu temizle
window.addEventListener('beforeunload', function() {
    if (ACTIVE_USER && typeof updateUserOnlineStatus === 'function' && database) {
        updateUserOnlineStatus(ACTIVE_USER, currentChannel, 'offline');
    }
});
