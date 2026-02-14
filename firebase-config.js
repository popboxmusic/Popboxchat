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
        console.log('✅ Firebase başlatıldı!');
        
        const user = JSON.parse(localStorage.getItem('cetcety_active_user'));
        if (user) {
            currentUser = user;
            connectToChannel('genel');
            loadUserStats();
        }
        
        return database;
    } catch (error) {
        console.error('❌ Firebase hatası:', error);
        return null;
    }
}

// ========== KANAL ==========
function connectToChannel(channelName) {
    if (!database || !currentUser) return;
    
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
    
    // Kanal bilgilerini dinle (abone sayısı dahil)
    database.ref(`channels/${channelName}/info`).on('value', (snapshot) => {
        const info = snapshot.val() || {};
        updateChannelInfo(info);
    });
    
    // Online listeyi dinle
    database.ref(`channels/${channelName}/onlineUsers`).on('value', (snapshot) => {
        const users = snapshot.val();
        const onlineCount = users ? Object.keys(users).length : 0;
        document.getElementById('channelUserCount').textContent = onlineCount;
        updateOnlineList(users);
    });
    
    // Video değişimini dinle
    database.ref(`channels/${channelName}/currentVideo`).on('value', (snapshot) => {
        const videoData = snapshot.val();
        if (videoData && videoData.id && window.mediaManager) {
            window.mediaManager.playVideo(videoData.id, videoData.title, videoData.artist, 'owner');
            document.getElementById('nowPlayingTitle').textContent = videoData.title;
            document.getElementById('nowPlayingOwner').innerHTML = videoData.artist;
            
            // Video görüntülenme sayacını artır
            incrementVideoViews(channelName, videoData.id);
        }
    });
    
    // Playlist değişimini dinle
    database.ref(`channels/${channelName}/playlist`).on('value', (snapshot) => {
        const playlist = snapshot.val() || [];
        updatePlaylist(playlist);
    });
    
    // Mesajları dinle
    database.ref(`channels/${channelName}/messages`).off();
    database.ref(`channels/${channelName}/messages`).on('child_added', (snapshot) => {
        const msg = snapshot.val();
        if (msg && msg.sender !== currentUser.name) {
            displayRealtimeMessage(msg);
        }
        // Toplam mesaj sayacını güncelle
        updateTotalMessages(channelName);
    });
    
    // Özel sohbetleri dinle
    database.ref(`privateChats`).on('child_added', (snapshot) => {
        const chatId = snapshot.key;
        if (chatId.includes(currentUser.id)) {
            updatePrivateChatBadge();
        }
    });
}

// ========== KANAL BİLGİLERİ ==========
function createChannel(channelName, owner) {
    if (!database) return;
    
    const channelRef = database.ref(`channels/${channelName}/info`);
    channelRef.set({
        name: channelName,
        owner: owner,
        createdAt: Date.now(),
        subscribers: 1,
        totalMessages: 0,
        totalVideos: 0,
        totalViews: 0
    });
}

function subscribeToChannel(channelName, userId) {
    if (!database) return;
    
    const subRef = database.ref(`subscriptions/${userId}/${channelName}`);
    subRef.set(Date.now());
    
    // Kanalın abone sayısını artır
    database.ref(`channels/${channelName}/info/subscribers`).transaction((count) => {
        return (count || 0) + 1;
    });
}

function unsubscribeFromChannel(channelName, userId) {
    if (!database) return;
    
    database.ref(`subscriptions/${userId}/${channelName}`).remove();
    
    // Kanalın abone sayısını azalt
    database.ref(`channels/${channelName}/info/subscribers`).transaction((count) => {
        return Math.max(0, (count || 1) - 1);
    });
}

// ========== VİDEO ==========
function addVideoToPlaylist(channelName, video) {
    if (!database) return;
    
    const playlistRef = database.ref(`channels/${channelName}/playlist`).push();
    playlistRef.set({
        id: video.id,
        title: video.title,
        addedBy: video.addedBy,
        role: video.role,
        addedAt: Date.now(),
        views: 0
    });
    
    // Kanalın toplam video sayısını artır
    database.ref(`channels/${channelName}/info/totalVideos`).transaction((count) => {
        return (count || 0) + 1;
    });
}

function incrementVideoViews(channelName, videoId) {
    if (!database) return;
    
    // Playlist'te video var mı bul
    database.ref(`channels/${channelName}/playlist`).once('value', (snapshot) => {
        const playlist = snapshot.val() || {};
        Object.keys(playlist).forEach(key => {
            if (playlist[key].id === videoId) {
                database.ref(`channels/${channelName}/playlist/${key}/views`).transaction((v) => {
                    return (v || 0) + 1;
                });
            }
        });
    });
    
    // Kanalın toplam görüntülenme sayısını artır
    database.ref(`channels/${channelName}/info/totalViews`).transaction((count) => {
        return (count || 0) + 1;
    });
}

// ========== MESAJ ==========
function sendFirebaseMessage(channelName, text, sender) {
    if (!database) return;
    
    const msgRef = database.ref(`channels/${channelName}/messages`).push();
    msgRef.set({
        sender: sender,
        text: text,
        time: new Date().toLocaleTimeString('tr-TR'),
        timestamp: Date.now()
    }).then(() => {
        // Mesaj gönderildikten sonra toplam mesaj sayısını güncelle
        database.ref(`channels/${channelName}/info/totalMessages`).transaction((count) => {
            return (count || 0) + 1;
        });
    });
}

function updateTotalMessages(channelName) {
    database.ref(`channels/${channelName}/messages`).once('value', (snapshot) => {
        const count = snapshot.numChildren();
        database.ref(`channels/${channelName}/info/totalMessages`).set(count);
    });
}

// ========== KULLANICI İSTATİSTİKLERİ ==========
function loadUserStats() {
    if (!database || !currentUser) return;
    
    // Kullanıcının aboneliklerini yükle
    database.ref(`subscriptions/${currentUser.id}`).on('value', (snapshot) => {
        const subs = snapshot.val() || {};
        const subCount = Object.keys(subs).length;
        
        // LocalStorage'e kaydet
        const user = JSON.parse(localStorage.getItem('cetcety_active_user'));
        if (user) {
            user.subscribedChannels = Object.keys(subs);
            localStorage.setItem('cetcety_active_user', JSON.stringify(user));
        }
        
        // Badge'i güncelle
        document.getElementById('subscriptionBadge').textContent = subCount;
    });
    
    // Kullanıcının toplam mesaj sayısını hesapla
    database.ref('channels').once('value', (snapshot) => {
        const channels = snapshot.val() || {};
        let totalUserMessages = 0;
        
        Object.keys(channels).forEach(ch => {
            if (channels[ch].messages) {
                Object.values(channels[ch].messages).forEach(msg => {
                    if (msg.sender === currentUser.name) totalUserMessages++;
                });
            }
        });
        
        // Kullanıcı profiline eklenebilir
        console.log(`📊 ${currentUser.name} toplam ${totalUserMessages} mesaj göndermiş`);
    });
}

// ========== KANAL İSTATİSTİKLERİ ==========
function getChannelStats(channelName) {
    if (!database) return;
    
    database.ref(`channels/${channelName}/info`).once('value', (snapshot) => {
        const stats = snapshot.val() || {};
        console.log(`📊 #${channelName} istatistikleri:`, stats);
        
        // UI'da göstermek için
        const subEl = document.getElementById('channelSubscribers');
        if (subEl && stats.subscribers) {
            subEl.textContent = formatNumber(stats.subscribers);
        }
    });
}

// ========== ONLINE LİSTE GÜNCELLE ==========
function updateOnlineList(users) {
    const container = document.getElementById('sagMenuIcerik');
    if (!container) return;
    
    const aktifSekme = document.querySelector('.sag-menu-sekme.aktif')?.dataset.sekme;
    if (aktifSekme !== 'online') return;
    
    let html = '';
    if (users) {
        Object.values(users).forEach(user => {
            html += `
                <div class="online-item" onclick="openPrivateChat('${user.name}')">
                    <div class="online-avatar">${user.name.charAt(0)}</div>
                    <div>
                        <div style="font-weight: 600;">${user.name}</div>
                        <div style="font-size: 12px; color: #4caf50;">● çevrimiçi</div>
                    </div>
                </div>
            `;
        });
    }
    container.innerHTML = html || '<div style="color: #666; padding: 20px;">Kimse yok</div>';
}

// ========== PLAYLIST GÜNCELLE ==========
function updatePlaylist(playlist) {
    const channels = JSON.parse(localStorage.getItem('cetcety_channels')) || {};
    if (!channels[currentChannelFirebase]) channels[currentChannelFirebase] = {};
    
    // Firebase'deki playlist'i düzenle
    const playlistArray = [];
    Object.keys(playlist).forEach(key => {
        playlistArray.push({
            ...playlist[key],
            firebaseKey: key
        });
    });
    
    channels[currentChannelFirebase].playlist = playlistArray;
    localStorage.setItem('cetcety_channels', JSON.stringify(channels));
    
    if (window.mediaManager) {
        window.mediaManager.updatePlaylist();
    }
    
    // Playlist sayısını güncelle
    document.getElementById('playlistCount').textContent = `${playlistArray.length} video`;
}

// ========== KANAL BİLGİLERİNİ GÜNCELLE ==========
function updateChannelInfo(info) {
    // Abone sayısı
    const subEl = document.getElementById('channelSubscribers');
    if (subEl && info.subscribers) {
        subEl.textContent = formatNumber(info.subscribers);
    }
    
    // Diğer istatistikler (opsiyonel)
    console.log('Kanal bilgileri:', info);
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
        <div class="message-text">${msg.text}</div>
    `;
    messagesDiv.appendChild(msgDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// ========== ÖZEL SOHBET ==========
function sendFirebasePrivateMessage(toUserId, text, fromUser, fromUserId) {
    if (!database) return;
    const chatId = [fromUserId, toUserId].sort().join('_');
    database.ref(`privateChats/${chatId}`).push({
        senderId: fromUserId,
        senderName: fromUser,
        text: text,
        timestamp: Date.now(),
        read: false
    });
}

function updatePrivateChatBadge() {
    if (!database || !currentUser) return;
    
    database.ref('privateChats').once('value', (snapshot) => {
        const chats = snapshot.val() || {};
        let unread = 0;
        
        Object.keys(chats).forEach(chatId => {
            if (chatId.includes(currentUser.id)) {
                const messages = Object.values(chats[chatId]);
                unread += messages.filter(m => m.senderId !== currentUser.id && !m.read).length;
            }
        });
        
        document.getElementById('chatListBadge').textContent = unread;
    });
}

// ========== SAYI FORMATLA ==========
function formatNumber(num) {
    if (num >= 1000000) return (num/1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num/1000).toFixed(1) + 'K';
    return num;
}

// ========== YARDIMCI ==========
function getCurrentUser() {
    return currentUser;
}

// ========== FONKSİYONLARI YAKALA ==========
if (window.subscribeChannel) {
    const originalSubscribe = window.subscribeChannel;
    window.subscribeChannel = function(ch) {
        originalSubscribe(ch);
        if (database && currentUser) {
            subscribeToChannel(ch, currentUser.id);
        }
    };
}

if (window.unsubscribeChannel) {
    const originalUnsubscribe = window.unsubscribeChannel;
    window.unsubscribeChannel = function(ch) {
        originalUnsubscribe(ch);
        if (database && currentUser) {
            unsubscribeFromChannel(ch, currentUser.id);
        }
    };
}

if (window.createChannel) {
    const originalCreateChannel = window.createChannel;
    window.createChannel = function() {
        const result = originalCreateChannel();
        const name = document.getElementById('newChannelName')?.value?.toLowerCase().trim();
        if (name && database && currentUser) {
            createChannel(name, currentUser.name);
        }
        return result;
    };
}

if (window.mediaManager) {
    const originalAddVideo = window.mediaManager.addVideo;
    window.mediaManager.addVideo = async function() {
        const result = await originalAddVideo.call(this);
        
        const urlInput = document.getElementById('videoUrlInput');
        const titleInput = document.getElementById('videoTitleInput');
        const videoId = this.extractVideoId(urlInput?.value.trim());
        
        if (videoId && window.addVideoToPlaylist) {
            window.addVideoToPlaylist(this.currentChannel, {
                id: videoId,
                title: titleInput?.value.trim(),
                addedBy: currentUser?.name,
                role: currentUser?.role
            });
        }
        
        return result;
    };
}

if (window.joinChannel) {
    const originalJoinChannel = window.joinChannel;
    window.joinChannel = function(ch) {
        originalJoinChannel(ch);
        if (database && currentUser) {
            connectToChannel(ch);
            getChannelStats(ch);
        }
    };
}

if (window.sendMessage) {
    const originalSendMessage = window.sendMessage;
    window.sendMessage = function() {
        const inp = document.getElementById('messageInput');
        const txt = inp.value.trim();
        
        if (txt && !txt.startsWith('/')) {
            if (window.sendFirebaseMessage) {
                window.sendFirebaseMessage(currentChannel, txt, currentUser?.name);
            }
        }
        originalSendMessage();
    };
}

// Global yap
window.database = database;
window.initFirebase = initFirebase;
window.sendFirebaseMessage = sendFirebaseMessage;
window.sendFirebasePrivateMessage = sendFirebasePrivateMessage;
window.subscribeToChannel = subscribeToChannel;
window.unsubscribeFromChannel = unsubscribeFromChannel;
window.createChannel = createChannel;
window.addVideoToPlaylist = addVideoToPlaylist;
window.getChannelStats = getChannelStats;
window.getCurrentUser = getCurrentUser;

// Sayfa yüklendiğinde başlat
document.addEventListener('DOMContentLoaded', function() {
    if (typeof initFirebase === 'function') {
        initFirebase();
    }
});
