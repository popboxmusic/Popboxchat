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

// Firebase başlat
firebase.initializeApp(FIREBASE_CONFIG);
const database = firebase.database();
console.log('🔥 Firebase başlatıldı!');

let currentUser = null;

// ========== KULLANICI GİRİŞ YAPINCA ==========
function userJoined(user) {
    if (!user) return;
    
    currentUser = user;
    
    setTimeout(() => {
        const channel = (window.currentChannel && typeof window.currentChannel === 'string') 
            ? window.currentChannel 
            : 'genel';
        
        console.log(`📡 Kullanıcı ${channel} kanalına katıldı:`, user.name);
        
        // Online kullanıcılara ekle
        const userRef = database.ref(`online/${channel}/${user.id}`);
        userRef.set({
            name: user.name,
            lastSeen: Date.now(),
            joined: Date.now()
        });
        
        // Çıkışta sil
        userRef.onDisconnect().remove();
        
        // Online listeyi dinle
        database.ref(`online/${channel}`).on('value', (snapshot) => {
            const users = snapshot.val();
            const onlineCount = users ? Object.keys(users).length : 0;
            
            // Online sayısını güncelle
            const countEl = document.getElementById('channelUserCount');
            if (countEl) countEl.textContent = onlineCount;
            
            // Sağ paneldeki online listeyi güncelle
            updateOnlineList(users);
            
            // Eğer online sekmesi açıksa göster
            const tabOnline = document.getElementById('tabOnline');
            if (tabOnline && tabOnline.classList.contains('active')) {
                showOnlineTabFromFirebase(users);
            }
        });
        
        // Kanal bilgilerini dinle (playlist, video)
        listenChannelInfo(channel);
        
        // Kanal mesajlarını dinle
        listenMessages(channel);
        
        // Kanal bilgilerini gönder (mevcut kanal bilgileri)
        setTimeout(() => {
            syncChannelToFirebase(channel);
        }, 1000);
        
    }, 500);
}

// ========== ONLINE LİSTEYİ GÜNCELLE ==========
function updateOnlineList(users) {
    const container = document.getElementById('chatPanelContent');
    if (!container) return;
    
    const tabOnline = document.getElementById('tabOnline');
    if (!tabOnline || !tabOnline.classList.contains('active')) return;
    
    let html = '';
    if (users) {
        const userList = Object.values(users).sort((a, b) => a.name.localeCompare(b.name));
        userList.forEach(user => {
            html += `
                <div class="online-item" onclick="openPrivateChat('${user.name}')">
                    <div class="online-avatar">${user.name.charAt(0)}</div>
                    <div class="online-info">
                        <div class="online-name">${user.name}<span class="online-status"></span></div>
                        <div class="online-meta">● çevrimiçi</div>
                    </div>
                </div>
            `;
        });
    }
    container.innerHTML = html || '<div style="color:#aaa; text-align:center; padding:20px;">👥 Çevrimiçi kimse yok</div>';
}

// ========== ONLINE SEKMESİNİ GÖSTER ==========
function showOnlineTabFromFirebase(users) {
    const container = document.getElementById('chatPanelContent');
    if (!container) return;
    
    let html = '';
    if (users) {
        const userList = Object.values(users).sort((a, b) => a.name.localeCompare(b.name));
        userList.forEach(user => {
            html += `
                <div class="online-item" onclick="openPrivateChat('${user.name}')">
                    <div class="online-avatar">${user.name.charAt(0)}</div>
                    <div class="online-info">
                        <div class="online-name">${user.name}<span class="online-status"></span></div>
                        <div class="online-meta">● çevrimiçi</div>
                    </div>
                </div>
            `;
        });
    }
    container.innerHTML = html || '<div style="color:#aaa; text-align:center; padding:20px;">👥 Çevrimiçi kimse yok</div>';
}

// ========== KANAL BİLGİLERİNİ FIREBASE'E GÖNDER ==========
function syncChannelToFirebase(channelName) {
    if (!window.channels || !window.channels[channelName]) return;
    
    const channelData = window.channels[channelName];
    
    database.ref(`channels/${channelName}/info`).set({
        name: channelName,
        owner: channelData.owner || 'Sistem',
        ownerRole: channelData.ownerRole || 'admin',
        subscribers: channelData.subscribers || 0,
        currentVideo: channelData.currentVideo || 'jfKfPfyJRdk',
        currentTitle: channelData.currentTitle || 'CETCETY Radio',
        currentArtist: channelData.currentArtist || '👑 CETCETY',
        playlist: channelData.playlist || []
    });
}

// ========== KANAL BİLGİLERİNİ DİNLE ==========
function listenChannelInfo(channelName) {
    database.ref(`channels/${channelName}/info`).off();
    database.ref(`channels/${channelName}/info`).on('value', (snapshot) => {
        const info = snapshot.val();
        if (!info) return;
        
        console.log('📡 Kanal bilgisi güncellendi:', info);
        
        // localStorage'ı güncelle
        if (!window.channels) window.channels = {};
        if (!window.channels[channelName]) window.channels[channelName] = {};
        
        window.channels[channelName] = {
            ...window.channels[channelName],
            ...info
        };
        
        localStorage.setItem('cetcety_channels', JSON.stringify(window.channels));
        
        // UI'ı güncelle
        if (window.currentChannel === channelName) {
            // Abone sayısını güncelle
            const sub = info.subscribers || 0;
            const fmt = sub >= 1000000 ? (sub/1000000).toFixed(1)+'M' : sub >= 1000 ? (sub/1000).toFixed(1)+'K' : sub;
            document.getElementById('channelSubscribers').textContent = fmt;
            
            // Şu an oynayan videoyu güncelle
            if (info.currentVideo) {
                document.getElementById('nowPlayingTitle').textContent = info.currentTitle || 'CETCETY Radio';
                document.getElementById('nowPlayingOwner').innerHTML = `${info.ownerRole === 'owner' ? '👑' : '👤'} ${info.owner}`;
                
                // medya.js'deki player'ı güncelle
                if (window.mediaManager && window.mediaManager.ytPlayer) {
                    const currentVideoId = window.mediaManager.ytPlayer.getVideoData()?.video_id;
                    if (currentVideoId !== info.currentVideo) {
                        window.mediaManager.loadVideo(info.currentVideo);
                    }
                }
            }
            
            // Playlist'i güncelle
            if (info.playlist && window.mediaManager && window.mediaManager.updatePlaylist) {
                window.mediaManager.updatePlaylist(info.playlist);
            }
        }
    });
}

// ========== KANAL DEĞİŞTİRİNCE ==========
function changeChannel(channelName) {
    if (!database || !currentUser) return;
    
    console.log(`📡 Kanal değişiyor: ${channelName}`);
    
    const eskiKanal = (window.currentChannel && typeof window.currentChannel === 'string') 
        ? window.currentChannel 
        : 'genel';
    
    if (eskiKanal !== channelName) {
        database.ref(`online/${eskiKanal}/${currentUser.id}`).remove();
    }
    
    // Yeni kanala ekle
    database.ref(`online/${channelName}/${currentUser.id}`).set({
        name: currentUser.name,
        lastSeen: Date.now()
    });
    
    // Yeni kanalın online listesini dinle
    database.ref(`online/${eskiKanal}`).off();
    database.ref(`online/${channelName}`).on('value', (snapshot) => {
        const users = snapshot.val();
        const onlineCount = users ? Object.keys(users).length : 0;
        
        const countEl = document.getElementById('channelUserCount');
        if (countEl) countEl.textContent = onlineCount;
        
        updateOnlineList(users);
    });
    
    // Yeni kanalın bilgilerini dinle
    database.ref(`channels/${eskiKanal}/info`).off();
    listenChannelInfo(channelName);
    
    // Yeni kanalın mesajlarını dinle
    database.ref(`channels/${eskiKanal}/messages`).off();
    listenMessages(channelName);
    
    // Kanal bilgilerini senkronize et
    setTimeout(() => {
        syncChannelToFirebase(channelName);
    }, 500);
}

// ========== MESAJ GÖNDER ==========
function sendFirebaseMessage(channelName, text, sender) {
    if (!database) return;
    
    database.ref(`channels/${channelName}/messages`).push({
        sender: sender,
        text: text,
        time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now()
    });
}

// ========== MESAJLARI DİNLE ==========
function listenMessages(channelName) {
    if (!database) return;
    
    console.log(`📡 Mesajlar dinleniyor: ${channelName}`);
    
    database.ref(`channels/${channelName}/messages`).off();
    database.ref(`channels/${channelName}/messages`).on('child_added', (snapshot) => {
        const msg = snapshot.val();
        if (msg && msg.sender !== currentUser?.name) {
            displayRealtimeMessage(msg);
        }
    });
}

// ========== GERÇEK ZAMANLI MESAJ GÖSTER ==========
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

// ========== PLAYLIST GÜNCELLEME ==========
function updatePlaylistInFirebase(channelName, playlist) {
    database.ref(`channels/${channelName}/info/playlist`).set(playlist);
}

function updateCurrentVideoInFirebase(channelName, videoId, title) {
    database.ref(`channels/${channelName}/info`).update({
        currentVideo: videoId,
        currentTitle: title
    });
}

// ========== HTML ESCAPE ==========
function escapeHTML(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========== GLOBAL FONKSİYONLAR ==========
window.database = database;
window.userJoined = userJoined;
window.changeChannel = changeChannel;
window.sendFirebaseMessage = sendFirebaseMessage;
window.listenMessages = listenMessages;
window.updatePlaylistInFirebase = updatePlaylistInFirebase;
window.updateCurrentVideoInFirebase = updateCurrentVideoInFirebase;
window.syncChannelToFirebase = syncChannelToFirebase;

// ========== HTML'DEKİ FONKSİYONLARI YAKALA ==========
const originalJoinChannel = window.joinChannel;
window.joinChannel = function(ch) {
    if (originalJoinChannel) originalJoinChannel(ch);
    changeChannel(ch);
};

// medya.js'deki video ekleme fonksiyonunu yakala
document.addEventListener('DOMContentLoaded', () => {
    // medya.js yüklendikten sonra
    setTimeout(() => {
        if (window.mediaManager) {
            const originalAddVideo = window.mediaManager.addVideo;
            if (originalAddVideo) {
                window.mediaManager.addVideo = function(videoData) {
                    originalAddVideo.call(this, videoData);
                    
                    // Firebase'i güncelle
                    const channel = window.currentChannel || 'genel';
                    setTimeout(() => {
                        syncChannelToFirebase(channel);
                    }, 100);
                };
            }
            
            const originalPlayVideo = window.mediaManager.playVideo;
            if (originalPlayVideo) {
                window.mediaManager.playVideo = function(index) {
                    originalPlayVideo.call(this, index);
                    
                    // Firebase'i güncelle
                    const channel = window.currentChannel || 'genel';
                    setTimeout(() => {
                        syncChannelToFirebase(channel);
                    }, 100);
                };
            }
        }
    }, 2000);
});

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('cetcety_active_user'));
    if (user) {
        setTimeout(() => {
            userJoined(user);
        }, 1000);
    }
    
    if (window.joinChannel) {
        window.originalJoinChannel = window.joinChannel;
    }
});

console.log('✅ Firebase config tam sürüm aktif - tüm eşzamanlılık özellikleri eklendi');
