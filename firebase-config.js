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
            loadPrivateChats();
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
    
    // ===== ONLINE LİSTE =====
    database.ref(`channels/${channelName}/onlineUsers`).on('value', (snapshot) => {
        const users = snapshot.val();
        const onlineCount = users ? Object.keys(users).length : 0;
        document.getElementById('channelUserCount').textContent = onlineCount;
        
        // SAĞ MENÜDEKİ ONLINE LİSTEYİ GÜNCELLE (sadece online sekmesi aktifse)
        const aktifSekme = document.querySelector('.sag-menu-sekme.aktif')?.dataset.sekme;
        if (aktifSekme === 'online') {
            updateOnlineList(users);
        }
    });
    
    // ===== VİDEO =====
    database.ref(`channels/${channelName}/currentVideo`).on('value', (snapshot) => {
        const videoData = snapshot.val();
        if (videoData && window.mediaManager) {
            if (window.mediaManager.ytPlayer && window.mediaManager.playerReady) {
                window.mediaManager.ytPlayer.loadVideoById(videoData.id);
            } else {
                window.mediaManager.pendingVideo = videoData.id;
            }
            document.getElementById('nowPlayingTitle').textContent = videoData.title;
            document.getElementById('nowPlayingOwner').innerHTML = videoData.artist;
        }
    });
    
    // ===== PLAYLİST =====
    database.ref(`channels/${channelName}/playlist`).on('value', (snapshot) => {
        const playlistData = snapshot.val();
        
        const playlist = [];
        if (playlistData) {
            Object.keys(playlistData).forEach(key => {
                playlist.push({
                    ...playlistData[key],
                    firebaseKey: key
                });
            });
        }
        
        const channels = JSON.parse(localStorage.getItem('cetcety_channels')) || {};
        if (!channels[channelName]) channels[channelName] = {};
        channels[channelName].playlist = playlist;
        localStorage.setItem('cetcety_channels', JSON.stringify(channels));
        
        if (window.mediaManager) {
            window.mediaManager.updatePlaylist();
        }
    });
    
    // ===== MESAJLAR =====
    database.ref(`channels/${channelName}/messages`).off();
    database.ref(`channels/${channelName}/messages`).on('child_added', (snapshot) => {
        const msg = snapshot.val();
        if (msg && msg.sender !== currentUser.name) {
            displayRealtimeMessage(msg);
        }
    });
}

// ========== ONLINE LİSTE GÜNCELLE ==========
function updateOnlineList(users) {
    const container = document.getElementById('sagMenuIcerik');
    if (!container) return;
    
    let html = '';
    if (users && Object.keys(users).length > 0) {
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
    } else {
        html = '<div style="color: #666; text-align: center; padding: 20px;">👥 Çevrimiçi kimse yok</div>';
    }
    
    container.innerHTML = html;
}

// ========== ÖZEL SOHBETLERİ YÜKLE ==========
function loadPrivateChats() {
    if (!database || !currentUser) return;
    
    database.ref('privateChats').on('value', (snapshot) => {
        const allChats = snapshot.val() || {};
        const myChats = [];
        
        Object.keys(allChats).forEach(chatId => {
            if (chatId.includes(currentUser.id)) {
                const messages = Object.values(allChats[chatId]);
                const sonMesaj = messages[messages.length - 1];
                const okunmamis = messages.filter(m => m.senderId !== currentUser.id && !m.read).length;
                
                const ids = chatId.split('_');
                const otherId = ids[0] == currentUser.id ? ids[1] : ids[0];
                
                // Karşı kullanıcının adını bul
                let otherName = sonMesaj?.senderName || 'Kullanıcı';
                
                myChats.push({
                    chatId: chatId,
                    otherId: otherId,
                    otherName: otherName,
                    sonMesaj: sonMesaj?.text || '...',
                    sonZaman: sonMesaj?.timestamp || Date.now(),
                    okunmamis: okunmamis
                });
            }
        });
        
        // Sohbet listesini güncelle (sadece sohbetler sekmesi aktifse)
        const aktifSekme = document.querySelector('.sag-menu-sekme.aktif')?.dataset.sekme;
        if (aktifSekme === 'sohbetler') {
            updateChatList(myChats);
        }
        
        // Toplam okunmamış sayısını badge'e yaz
        const totalUnread = myChats.reduce((sum, chat) => sum + chat.okunmamis, 0);
        document.getElementById('chatListBadge').textContent = totalUnread;
    });
}

// ========== SOHBET LİSTESİNİ GÜNCELLE ==========
function updateChatList(chats) {
    const container = document.getElementById('sagMenuIcerik');
    if (!container) return;
    
    let html = '';
    if (chats.length > 0) {
        chats.sort((a, b) => b.sonZaman - a.sonZaman);
        
        chats.forEach(chat => {
            html += `
                <div class="sohbet-item" onclick="openPrivateChat('${chat.otherName}')">
                    <div class="sohbet-avatar">${chat.otherName.charAt(0)}</div>
                    <div style="flex:1;">
                        <div style="font-weight: 600;">${chat.otherName}</div>
                        <div style="font-size: 12px; color: #aaa; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px;">
                            ${chat.sonMesaj}
                        </div>
                    </div>
                    ${chat.okunmamis > 0 ? `<div class="sohbet-bildirim">${chat.okunmamis}</div>` : ''}
                </div>
            `;
        });
    } else {
        html = '<div style="color: #666; text-align: center; padding: 20px;">💬 Henüz özel sohbet yok</div>';
    }
    
    container.innerHTML = html;
}

// ========== SEKMELERİ GÜNCELLE ==========
function updateSagMenu(sekme) {
    if (!database) return;
    
    if (sekme === 'online') {
        database.ref(`channels/${currentChannelFirebase}/onlineUsers`).once('value', (snapshot) => {
            updateOnlineList(snapshot.val());
        });
    } else {
        loadPrivateChats(); // Bu zaten listener'ı tetikleyecek
    }
}

// ========== ÖZEL SOHBET MESAJI GÖNDER ==========
function sendPrivateMessageFirebase(toUserId, text, fromUser, fromUserId) {
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

// ========== ÖZEL SOHBET MESAJLARINI DİNLE ==========
function listenPrivateChat(otherUserId) {
    if (!database || !currentUser) return;
    
    const chatId = [currentUser.id, otherUserId].sort().join('_');
    
    database.ref(`privateChats/${chatId}`).off(); // Önceki dinleyicileri temizle
    database.ref(`privateChats/${chatId}`).on('child_added', (snapshot) => {
        const msg = snapshot.val();
        if (msg && msg.senderId !== currentUser.id) {
            displayPrivateMessage(msg);
            snapshot.ref.update({ read: true });
        }
    });
}

// ========== ÖZEL MESAJ GÖSTER ==========
function displayPrivateMessage(msg) {
    const container = document.getElementById('privateChatMessages');
    if (!container) return;
    
    const msgDiv = document.createElement('div');
    msgDiv.className = `private-message ${msg.senderId === currentUser.id ? 'right' : ''}`;
    msgDiv.innerHTML = `<div class="private-message-text">${escapeHTML(msg.text)}</div>`;
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
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

// ========== VİDEO GÜNCELLE ==========
function updateVideo(channelName, videoId, title, artist) {
    if (!database) return;
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
    database.ref(`channels/${channelName}/playlist/${firebaseKey}`).remove();
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

// ========== MEDYA YÖNETİCİSİNİ YAKALA ==========
if (window.mediaManager) {
    const originalPlayVideo = window.mediaManager.playVideo;
    window.mediaManager.playVideo = function(videoId, title, addedBy, role) {
        originalPlayVideo.call(this, videoId, title, addedBy, role);
        
        if (window.updateVideo) {
            const artist = `${role === 'owner' ? '👑' : role === 'admin' ? '⚡' : role === 'coadmin' ? '🔧' : '🛠️'} ${addedBy}`;
            window.updateVideo(this.currentChannel, videoId, title, artist);
        }
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

// ========== ÖZEL MESAJ GÖNDERMEYİ YAKALA ==========
if (window.sendPrivateMessage) {
    const originalSendPrivate = window.sendPrivateMessage;
    window.sendPrivateMessage = function() {
        const inp = document.getElementById('privateMessageInput');
        const txt = inp.value.trim();
        
        if (txt && window.currentPrivateChat && currentUser) {
            window.sendPrivateMessageFirebase(
                window.currentPrivateChat.id,
                txt,
                currentUser.name,
                currentUser.id
            );
        }
        
        originalSendPrivate();
    };
}

// ========== ÖZEL SOHBET AÇMAYI YAKALA ==========
if (window.openPrivateChat) {
    const originalOpenPrivate = window.openPrivateChat;
    window.openPrivateChat = function(username) {
        originalOpenPrivate(username);
        if (currentUser) {
            // Karşı kullanıcının ID'sini bulmamız lazım
            // Şimdilik username ile id'yi aynı kabul ediyoruz
            window.listenPrivateChat(username);
        }
    };
}

// ========== SEKMELERİ YAKALA ==========
function setupTabListeners() {
    const onlineSekme = document.querySelector('.sag-menu-sekme[data-sekme="online"]');
    const sohbetSekme = document.querySelector('.sag-menu-sekme[data-sekme="sohbetler"]');
    
    if (onlineSekme) {
        onlineSekme.addEventListener('click', () => updateSagMenu('online'));
    }
    
    if (sohbetSekme) {
        sohbetSekme.addEventListener('click', () => updateSagMenu('sohbetler'));
    }
}

// ========== GLOBAL YAP ==========
window.database = database;
window.initFirebase = initFirebase;
window.updateVideo = updateVideo;
window.addToPlaylist = addToPlaylist;
window.removeFromPlaylist = removeFromPlaylist;
window.sendFirebaseMessage = sendFirebaseMessage;
window.sendPrivateMessageFirebase = sendPrivateMessageFirebase;
window.listenPrivateChat = listenPrivateChat;
window.updateSagMenu = updateSagMenu;

// Sayfa yüklendiğinde başlat
document.addEventListener('DOMContentLoaded', function() {
    if (typeof initFirebase === 'function') {
        initFirebase();
    }
    setTimeout(setupTabListeners, 1000);
});
