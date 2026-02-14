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
let storage;
let currentChannelFirebase = 'genel';
let currentUser = null;

function initFirebase() {
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(FIREBASE_CONFIG);
        }
        database = firebase.database();
        storage = firebase.storage();
        console.log('✅ Firebase başlatıldı!');
        
        // Kullanıcı varsa bağlan
        const user = JSON.parse(localStorage.getItem('cetcety_active_user'));
        if (user) {
            currentUser = user;
            connectToChannel('genel');
        }
        
        return { database, storage };
    } catch (error) {
        console.error('❌ Firebase hatası:', error);
        return { database: null, storage: null };
    }
}

// ========== KANALA BAĞLAN ==========
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
        if (videoData && window.mediaManager) {
            window.mediaManager.playVideo(videoData.id);
            document.getElementById('nowPlayingTitle').textContent = videoData.title;
            document.getElementById('nowPlayingOwner').innerHTML = videoData.artist;
        }
    });
    
    // Mesajları dinle
    database.ref(`channels/${channelName}/messages`).limitToLast(50).on('child_added', (snapshot) => {
        const msg = snapshot.val();
        if (msg && msg.sender !== currentUser.name) {
            displayRealtimeMessage(msg);
        }
    });
}

// ========== VİDEO GÜNCELLE ==========
function updateVideo(channelName, videoId, title, artist) {
    if (!database) return;
    database.ref(`channels/${channelName}/currentVideo`).set({
        id: videoId,
        title: title,
        artist: artist,
        updatedAt: Date.now()
    });
}

// ========== MESAJ GÖNDER ==========
function sendRealtimeMessage(channelName, text, sender) {
    if (!database) return;
    database.ref(`channels/${channelName}/messages`).push({
        sender: sender,
        text: text,
        time: new Date().toLocaleTimeString('tr-TR'),
        timestamp: Date.now()
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

// ========== KANAL DEĞİŞTİRME YAKALAMA ==========
// joinChannel fonksiyonunu yakala
const originalJoinChannel = window.joinChannel;
window.joinChannel = function(ch) {
    if (originalJoinChannel) originalJoinChannel(ch);
    if (database && currentUser) {
        connectToChannel(ch);
    }
};

// Global yap
window.database = database;
window.storage = storage;
window.initFirebase = initFirebase;
window.updateVideo = updateVideo;
window.sendRealtimeMessage = sendRealtimeMessage;
window.connectToChannel = connectToChannel;

// Firebase script'lerini yükle
(function loadFirebase() {
    if (window.firebase) {
        initFirebase();
        return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js';
    script.onload = () => {
        const dbScript = document.createElement('script');
        dbScript.src = 'https://www.gstatic.com/firebasejs/8.10.0/firebase-database.js';
        dbScript.onload = () => {
            const storageScript = document.createElement('script');
            storageScript.src = 'https://www.gstatic.com/firebasejs/8.10.0/firebase-storage.js';
            storageScript.onload = initFirebase;
            document.head.appendChild(storageScript);
        };
        document.head.appendChild(dbScript);
    };
    document.head.appendChild(script);
})();
