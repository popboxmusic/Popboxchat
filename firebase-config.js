// ========== FIREBASE - GERÇEK ZAMANLI ==========
const firebaseConfig = {
    apiKey: "AIzaSyCrn_tXJZCAlKhem45aXxj4f0h26EPOQ70",
    authDomain: "popboxmusicchat.firebaseapp.com",
    databaseURL: "https://popboxmusicchat-default-rtdb.firebaseio.com",
    projectId: "popboxmusicchat",
    storageBucket: "popboxmusicchat.appspot.com",
    messagingSenderId: "206625719024",
    appId: "1:206625719024:web:d28f478a2c96d10412f835"
};

// Firebase başlat
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

console.log('🔥 GERÇEK FIREBASE başlatıldı!');

// ========== KULLANICI GİRİŞ YAPINCA ==========
window.userJoined = function(user) {
    if (!user) return;
    console.log(`📡 Kullanıcı giriş yaptı:`, user.name);
    
    const channel = window.currentChannel || 'genel';
    
    // Firebase'e ekle
    database.ref(`online/${channel}/${user.id}`).set({
        name: user.name,
        role: user.role,
        lastSeen: Date.now()
    });
    
    // Çıkışta otomatik sil
    database.ref(`online/${channel}/${user.id}`).onDisconnect().remove();
};

// ========== KANAL DEĞİŞTİRİNCE ==========
window.changeChannel = function(channelName) {
    console.log(`📡 Kanal değişiyor: ${channelName}`);
    
    if (!window.ACTIVE_USER) return;
    
    const eskiKanal = window.currentChannel || 'genel';
    
    // Eski kanaldan çıkar
    database.ref(`online/${eskiKanal}/${window.ACTIVE_USER.id}`).remove();
    
    // Yeni kanala ekle
    database.ref(`online/${channelName}/${window.ACTIVE_USER.id}`).set({
        name: window.ACTIVE_USER.name,
        role: window.ACTIVE_USER.role
    });
};

// ========== MESAJ GÖNDER ==========
window.sendFirebaseMessage = function(channel, message, sender) {
    database.ref(`chats/${channel}`).push({
        sender: sender,
        text: message,
        time: new Date().toLocaleTimeString('tr-TR'),
        timestamp: Date.now()
    });
};

// ========== ÖZEL MESAJ GÖNDER ==========
window.sendPrivateMessageToFirebase = function(senderId, senderName, receiverId, message, type, content) {
    const chatId = [senderId, receiverId].sort().join('_');
    
    database.ref(`private/${chatId}`).push({
        from: senderId,
        fromName: senderName,
        text: message,
        content: content,
        type: type || 'text',
        time: new Date().toLocaleTimeString('tr-TR'),
        timestamp: Date.now()
    });
};

// ========== KANAL BİLGİLERİNİ GÜNCELLE ==========
window.syncChannelToFirebase = function(channelName) {
    if (!window.channels || !window.channels[channelName]) return;
    
    const channel = window.channels[channelName];
    
    // Playlist'i güncelle
    database.ref(`playlist/${channelName}`).set(channel.playlist || []);
    
    // Şu an oynayanı güncelle
    if (channel.currentVideo) {
        database.ref(`nowplaying/${channelName}`).set({
            id: channel.currentVideo,
            title: channel.currentTitle
        });
    }
};

// ========== STORAGE DEĞİŞİKLİKLERİNİ DİNLE (local yedek) ==========
window.addEventListener('storage', function(e) {
    if (e.key === 'cetcety_last_message' || 
        e.key === 'cetcety_last_private' || 
        e.key === 'cetcety_last_channel_update') {
        
        console.log('🔄 Storage güncellendi');
    }
});

// ========== ONLINE KULLANICILARI DİNLE ==========
function listenOnlineUsers(channel) {
    database.ref(`online/${channel}`).on('value', (snap) => {
        const users = snap.val();
        const count = users ? Object.keys(users).length : 0;
        
        const countEl = document.getElementById('channelUserCount');
        if (countEl) countEl.textContent = count;
        
        // Online listeyi güncelle
        if (document.getElementById('tabOnline')?.classList.contains('active')) {
            let html = '';
            if (users) {
                Object.values(users).forEach(u => {
                    if (u.name !== window.ACTIVE_USER?.name) {
                        html += `<div class="online-item" onclick="openPrivateChat('${u.name}')">🟢 ${u.name}</div>`;
                    }
                });
            }
            const container = document.getElementById('chatPanelContent');
            if (container) container.innerHTML = html || 'Kimse yok';
        }
    });
}

// ========== KANAL MESAJLARINI DİNLE ==========
function listenChannelMessages(channel) {
    database.ref(`chats/${channel}`).off();
    database.ref(`chats/${channel}`).on('child_added', (snap) => {
        const msg = snap.val();
        if (msg.sender !== window.ACTIVE_USER?.name) {
            // Mesajı göster
            const container = document.getElementById('messages');
            const div = document.createElement('div');
            div.className = 'message';
            div.innerHTML = `<div class="message-text">${msg.sender}: ${msg.text}</div>`;
            container.appendChild(div);
            container.scrollTop = container.scrollHeight;
        }
    });
}

// ========== PLAYLIST'İ DİNLE ==========
function listenPlaylist(channel) {
    database.ref(`playlist/${channel}`).on('value', (snap) => {
        const playlist = snap.val() || [];
        if (window.channels && window.channels[channel]) {
            window.channels[channel].playlist = playlist;
            if (window.updatePlaylist) window.updatePlaylist();
        }
    });
}

// ========== ŞU AN OYNAYANI DİNLE ==========
function listenNowPlaying(channel) {
    database.ref(`nowplaying/${channel}`).on('value', (snap) => {
        const video = snap.val();
        if (video && window.ytPlayer) {
            window.ytPlayer.loadVideoById(video.id);
            document.getElementById('nowPlayingTitle').textContent = video.title;
        }
    });
}

// ========== ÖZEL MESAJLARI DİNLE (owner için) ==========
if (window.ACTIVE_USER?.role === 'owner') {
    database.ref('private').on('child_added', (snap) => {
        snap.ref.on('child_added', (msgSnap) => {
            const msg = msgSnap.val();
            if (msg.from !== window.ACTIVE_USER?.id) {
                database.ref('chats/owner/messages').push({
                    sender: `🔒 ${msg.fromName}`,
                    text: msg.type === 'text' ? msg.text : (msg.type === 'image' ? '📸 Resim' : '🎥 Video'),
                    time: msg.time
                });
            }
        });
    });
}

console.log('✅ GERÇEK FIREBASE aktif - Tüm kullanıcılar arasında eşzamanlılık sağlanıyor!');

// Global yap
window.database = database;
window.listenOnlineUsers = listenOnlineUsers;
window.listenChannelMessages = listenChannelMessages;
window.listenPlaylist = listenPlaylist;
window.listenNowPlaying = listenNowPlaying;
