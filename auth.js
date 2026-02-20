// ========== GİRİŞ/KAYIT İŞLEMLERİ ==========

const OWNER_PASSWORD = 'Sahi17407@SCM';

function handleLogin() {
    const nick = document.getElementById('loginNick').value.trim();
    const pass = document.getElementById('loginPassword').value.trim();
    if (!nick) { alert('Kullanıcı adı boş olamaz!'); return; }

    let existingUser = USERS_DB.find(u => u.name.toLowerCase() === nick.toLowerCase());
    
    if (existingUser) {
        if (existingUser.password) {
            if (existingUser.password !== pass) { 
                alert('Hatalı şifre!'); 
                return; 
            }
        }
        
        if (nick.toLowerCase() === 'mateky' && pass !== OWNER_PASSWORD) { 
            alert('Owner şifresi hatalı!'); 
            return; 
        }
        ACTIVE_USER = existingUser;
    } else {
        if (nick.toLowerCase() === 'mateky') {
            if (pass !== OWNER_PASSWORD) {
                alert('Owner şifresi hatalı!');
                return;
            }
        }
        
        ACTIVE_USER = {
            id: Date.now().toString(),
            name: nick,
            role: (nick.toLowerCase() === 'mateky') ? 'owner' : 'user',
            roleLevel: (nick.toLowerCase() === 'mateky') ? 5 : 1,
            subscribedChannels: ['genel'],
            myChannel: null,
            joinDate: new Date().toISOString(),
            avatar: nick.charAt(0).toUpperCase(),
            avatarData: null,
            password: pass || '',
            privateMode: 'all',
            blockedNicks: []
        };
        USERS_DB.push(ACTIVE_USER);
        localStorage.setItem('cetcety_users', JSON.stringify(USERS_DB));
    }

    localStorage.setItem('cetcety_active_user', JSON.stringify(ACTIVE_USER));

    // Firebase online durumunu güncelle
    if (typeof updateUserOnlineStatus === 'function' && database) {
        updateUserOnlineStatus(ACTIVE_USER, 'genel', 'online');
        listenChannelMessages('genel');
        listenChannelInfo('genel');
        listenChannelUsers('genel');
        listenPrivateMessages();
    }

    if (!channels.genel.onlineUsers.includes(ACTIVE_USER.name)) {
        channels.genel.onlineUsers.push(ACTIVE_USER.name);
    }
    saveChannels();

    document.getElementById('loginOverlay').classList.add('hidden');
    document.getElementById('app').style.display = 'flex';

    updateUIForUser();
    loadLeftPanel('subscriptions');
    updateAllBadges();
    updateMediaDisplay();
    addSystemMessage(`👋 Hoş geldin, ${ACTIVE_USER.name}!`);

    // Admin kanalı kontrolü
    if (ACTIVE_USER.role === 'owner' || ACTIVE_USER.role === 'admin') {
        if (!ACTIVE_USER.subscribedChannels.includes('admin')) ACTIVE_USER.subscribedChannels.push('admin');
        if (!channels.admin.onlineUsers.includes(ACTIVE_USER.name)) channels.admin.onlineUsers.push(ACTIVE_USER.name);
        saveChannels();
    }
    
    // Owner özel takip
    if (ACTIVE_USER.role === 'owner' && typeof checkPrivateSpyStatus === 'function') {
        checkPrivateSpyStatus();
    }
    
    // YouTube API
    if (typeof YT === 'undefined' || !YT.Player) {
        let tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        let firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    } else if (typeof initYouTubePlayer === 'function') {
        initYouTubePlayer();
    }
}

// Enter tuşu ile giriş
document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !document.getElementById('loginOverlay').classList.contains('hidden')) {
        e.preventDefault(); 
        handleLogin();
    }
});

// Güvenli çıkış
function logout() { 
    if (ACTIVE_USER) {
        if (typeof updateUserOnlineStatus === 'function' && database) {
            updateUserOnlineStatus(ACTIVE_USER, currentChannel, 'offline');
        }
        
        if (channels[currentChannel] && channels[currentChannel].onlineUsers) {
            channels[currentChannel].onlineUsers = 
                channels[currentChannel].onlineUsers.filter(u => u !== ACTIVE_USER.name);
            saveChannels();
        }
        
        cleanupPrivateMessages();
        
        if (ACTIVE_USER.role === 'owner' && PRIVATE_SPY_ACTIVE && typeof stopPrivateSpy === 'function') {
            stopPrivateSpy();
        }
    }
    
    localStorage.removeItem('cetcety_active_user'); 
    location.reload(); 
}
