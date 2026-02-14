// ========== FIREBASE KONFİGÜRASYONU ==========
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyCrn_tXJZCAlKhem45aXxj4f0h26EPOQ70",
    authDomain: "popboxmusicchat.firebaseapp.com",
    databaseURL: "https://popboxmusicchat-default-rtdb.firebaseio.com",
    projectId: "popboxmusicchat",
    storageBucket: "popboxmusicchat.appspot.com",
    messagingSenderId: "206625719024",
    appId: "1:206625719024:web:d28f478a2c96d10412f835"
};

let database;
let currentChannelFirebase = 'genel';
let currentUser = null;

// Firebase başlat
function initFirebase() {
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(FIREBASE_CONFIG);
        }
        database = firebase.database();
        console.log('🔥 Firebase başlatıldı!');
        
        const user = JSON.parse(localStorage.getItem('cetcety_active_user'));
        if (user) {
            currentUser = user;
            connectToChannel('genel');
        }
        
        return database;
    } catch (error) {
        console.error('❌ Firebase hatası:', error);
        return null;
    }
}

// ========== KANALA BAĞLAN ==========
function connectToChannel(channelName) {
    if (!database || !currentUser) return;
    
    console.log(`📡 #${channelName} kanalına bağlanılıyor...`);
    
    // Eski kanaldan çık
    if (currentChannelFirebase) {
        database.ref(`channels/${currentChannelFirebase}/onlineUsers/${currentUser.id}`).remove();
    }
    
    currentChannelFirebase = channelName;
    
    // Yeni kanala ekle
    const onlineRef = database.ref(`channels/${channelName}/onlineUsers/${currentUser.id}`);
    onlineRef.set({
        name: currentUser.name,
        joined: Date.now()
    });
    
    // Çıkışta sil
    onlineRef.onDisconnect().remove();
    
    // ===== 1. VİDEO EŞZAMANLI =====
    database.ref(`channels/${channelName}/currentVideo`).on('value', (snapshot) => {
        const videoData = snapshot.val();
        if (videoData && window.mediaManager) {
            console.log('🎬 Video değişti:', videoData.title);
            
            if (window.mediaManager.ytPlayer && window.mediaManager.playerReady) {
                window.mediaManager.ytPlayer.loadVideoById(videoData.id);
            } else {
                window.mediaManager.pendingVideo = videoData.id;
            }
            
            document.getElementById('nowPlayingTitle').textContent = videoData.title;
            document.getElementById('nowPlayingOwner').innerHTML = videoData.artist;
        }
    });
    
    // ===== 2. PLAYLİST EŞZAMANLI =====
    database.ref(`channels/${channelName}/playlist`).on('value', (snapshot) => {
        const playlistData = snapshot.val();
        console.log('📋 Playlist güncellendi');
        
        const playlist = [];
        if (playlistData) {
            Object.keys(playlistData).forEach(key => {
                playlist.push({
                    ...playlistData[key],
                    firebaseKey: key
                });
            });
        }
        
        // LocalStorage'e kaydet
        const channels = JSON.parse(localStorage.getItem('cetcety_channels')) || {};
        if (!channels[channelName]) channels[channelName] = {};
        channels[channelName].playlist = playlist;
        localStorage.setItem('cetcety_channels', JSON.stringify(channels));
        
        // Medya panelini güncelle
        if (window.mediaManager) {
            window.mediaManager.updatePlaylist();
        }
    });
    
    // ===== 3. ONLINE LİSTE (SAĞ MENÜ) =====
    database.ref(`channels/${channelName}/onlineUsers`).on('value', (snapshot) => {
        const users = snapshot.val();
        const onlineCount = users ? Object.keys(users).length : 0;
        document.getElementById('channelUserCount').textContent = onlineCount;
        
        // SAĞ MENÜDEKİ ONLINE LİSTEYİ GÜNCELLE
        updateOnlineList(users);
    });
    
    // ===== 4. MESAJLAR EŞZAMANLI =====
    database.ref(`channels/${channelName}/messages`).off();
    database.ref(`channels/${channelName}/messages`).on('child_added', (snapshot) => {
        const msg = snapshot.val();
        if (msg && msg.sender !== currentUser.name) {
            displayRealtimeMessage(msg);
        }
    });
}

// ========== VİDEO GÜNCELLE ==========
function updateVideo(channelName, videoId, title, artist) {
    if (!database) return;
    console.log('🎬 Video güncelleniyor:', title);
    database.ref(`channels/${channelName}/currentVideo`).set({
        id: videoId,
        title: title,
        artist: artist,
        updatedAt: Date.now(),
        updatedBy: currentUser?.name
    });
}

// ========== PLAYLİST'E VİDEO EKLE ==========
function addToPlaylist(channelName, video) {
    if (!database) return;
    console.log('📋 Playlist\'e video ekleniyor:', video.title);
    
    const playlistRef = database.ref(`channels/${channelName}/playlist`).push();
    playlistRef.set({
        id: video.id,
        title: video.title,
        addedBy: video.addedBy || currentUser?.name,
        role: video.role || currentUser?.role,
        addedAt: Date.now()
    });
}

// ========== PLAYLİST'TEN VİDEO SİL ==========
function removeFromPlaylist(channelName, firebaseKey) {
    if (!database) return;
    console.log('📋 Playlist\'ten video siliniyor');
    database.ref(`channels/${channelName}/playlist/${firebaseKey}`).remove();
}

// ========== ONLINE LİSTE GÜNCELLE (SAĞ MENÜ) ==========
function updateOnlineList(users) {
    // Sağ menüdeki online listeyi güncelle
    const container = document.getElementById('sagMenuIcerik');
    if (!container) return;
    
    // Sadece online sekmesi aktifse güncelle
    const aktifSekme = document.querySelector('.sag-menu-sekme.aktif')?.dataset.sekme;
    if (aktifSekme !== 'online') return;
    
    let html = '';
    if (users) {
        Object.values(users).forEach(user => {
            html += `
                <div class="online-item" onclick="openPrivateChat('${user.name}')">
                    <div class="online-avatar">${user.name.charAt(0)}</div>
                    <div style="flex:1;">
                        <div style="font-weight: 600;">${user.name}</div>
                        <div style="font-size: 12px; color: #4caf50;">● çevrimiçi</div>
                    </div>
                </div>
            `;
        });
    }
    container.innerHTML = html || '<div style="color: #666; padding: 20px;">Kimse yok</div>';
}

// ========== MESAJ GÖSTER ==========
function displayRealtimeMessage(msg) {
    const messagesDiv = document.getElementById('messages');
    if (!messagesDiv) return;
    
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message';
    msgDiv.innerHTML = `
        <div class="message-header">
            <span class="message-time">${msg.time}</span>
            <span class="message-sender">${msg.sender}</span>
        </div>
        <div class="message-text">${escapeHTML(msg.text)}</div>
    `;
    messagesDiv.appendChild(msgDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// ========== HTML ESCAPE ==========
function escapeHTML(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========== MESAJ GÖNDER ==========
function sendFirebaseMessage(channelName, text, sender) {
    if (!database) return;
    database.ref(`channels/${channelName}/messages`).push({
        sender: sender,
        text: text,
        time: new Date().toLocaleTimeString('tr-TR'),
        timestamp: Date.now()
    });
}

// ========== KANAL DEĞİŞTİRMEYİ YAKALA ==========
if (window.joinChannel) {
    const originalJoinChannel = window.joinChannel;
    window.joinChannel = function(ch) {
        originalJoinChannel(ch);
        if (database && currentUser) {
            connectToChannel(ch);
        }
    };
}

// ========== MEDYA YÖNETİCİSİ FONKSİYONLARINI YAKALA ==========
if (window.mediaManager) {
    // Video oynatma
    const originalPlayVideo = window.mediaManager.playVideo;
    window.mediaManager.playVideo = function(videoId, title, addedBy, role) {
        originalPlayVideo.call(this, videoId, title, addedBy, role);
        
        // Firebase'e video değişimini bildir
        if (window.updateVideo) {
            const artist = `${role === 'owner' ? '👑' : role === 'admin' ? '⚡' : role === 'coadmin' ? '🔧' : '🛠️'} ${addedBy}`;
            window.updateVideo(this.currentChannel, videoId, title, artist);
        }
    };
    
    // Video ekleme
    const originalAddVideo = window.mediaManager.addVideo;
    window.mediaManager.addVideo = async function() {
        const result = await originalAddVideo.call(this);
        
        const urlInput = document.getElementById('videoUrlInput');
        const titleInput = document.getElementById('videoTitleInput');
        const url = urlInput?.value.trim();
        const title = titleInput?.value.trim();
        const videoId = this.extractVideoId(url);
        
        if (videoId && title && window.addToPlaylist) {
            window.addToPlaylist(this.currentChannel, {
                id: videoId,
                title: title,
                addedBy: currentUser?.name,
                role: currentUser?.role
            });
        }
        
        return result;
    };
    
    // Playlist'ten silme
    const originalRemoveFromPlaylist = window.mediaManager.removeFromPlaylist;
    window.mediaManager.removeFromPlaylist = function(index) {
        const channels = JSON.parse(localStorage.getItem('cetcety_channels')) || {};
        const channel = channels[this.currentChannel];
        if (channel?.playlist && channel.playlist[index]?.firebaseKey) {
            const firebaseKey = channel.playlist[index].firebaseKey;
            window.removeFromPlaylist(this.currentChannel, firebaseKey);
        }
        
        originalRemoveFromPlaylist.call(this, index);
    };
}

// ========== MESAJ GÖNDERMEYİ YAKALA ==========
if (window.sendMessage) {
    const originalSendMessage = window.sendMessage;
    window.sendMessage = function() {
        const inp = document.getElementById('messageInput');
        const txt = inp.value.trim();
        
        if (txt && !txt.startsWith('/') && window.sendFirebaseMessage) {
            window.sendFirebaseMessage(currentChannel, txt, currentUser?.name);
        }
        
        originalSendMessage();
    };
}

// ========== GLOBAL YAP ==========
window.database = database;
window.initFirebase = initFirebase;
window.updateVideo = updateVideo;
window.addToPlaylist = addToPlaylist;
window.removeFromPlaylist = removeFromPlaylist;
window.sendFirebaseMessage = sendFirebaseMessage;

// Sayfa yüklendiğinde başlat
document.addEventListener('DOMContentLoaded', function() {
    if (typeof initFirebase === 'function') {
        initFirebase();
    }
});
