// ========== FIREBASE KONFİGÜRASYONU ==========
// 🔐 BU DOSYAYI KİMSEYLE PAYLAŞMA!
// 🔐 GITHUB'A YÜKLERKEN GİZLİ TUT!

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
let database;
let storage;

function initFirebase() {
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(FIREBASE_CONFIG);
        }
        database = firebase.database();
        storage = firebase.storage();
        console.log('✅ Firebase başlatıldı!');
        
        // Eşzamanlı işlemleri başlat
        initRealtimeFeatures();
        
        return { database, storage };
    } catch (error) {
        console.error('❌ Firebase hatası:', error);
        return { database: null, storage: null };
    }
}

// ========== EŞZAMANLI ÖZELLİKLER ==========
function initRealtimeFeatures() {
    const user = JSON.parse(localStorage.getItem('cetcety_active_user'));
    if (!user || !database) return;
    
    const currentChannel = 'genel'; // Varsayılan
    const userId = user.id;
    const userName = user.name;
    
    // 1. ONLINE KULLANICILAR
    const onlineRef = database.ref(`channels/${currentChannel}/onlineUsers/${userId}`);
    onlineRef.set({
        name: userName,
        joined: Date.now()
    });
    
    // Çıkışta sil
    onlineRef.onDisconnect().remove();
    
    // Online listeyi dinle
    database.ref(`channels/${currentChannel}/onlineUsers`).on('value', (snapshot) => {
        const users = snapshot.val();
        const onlineCount = users ? Object.keys(users).length : 0;
        document.getElementById('channelUserCount').textContent = onlineCount;
        
        // Online listeyi güncelle (varsa)
        updateOnlineList(users);
    });
    
    // 2. VİDEO EŞZAMANLI
    database.ref(`channels/${currentChannel}/currentVideo`).on('value', (snapshot) => {
        const videoId = snapshot.val();
        if (videoId && window.mediaManager) {
            window.mediaManager.playVideo(videoId);
        }
    });
    
    // 3. MESAJLAR EŞZAMANLI
    database.ref(`channels/${currentChannel}/messages`).on('child_added', (snapshot) => {
        const msg = snapshot.val();
        if (msg && msg.sender !== userName) {
            displayRealtimeMessage(msg);
        }
    });
}

// ========== YARDIMCI FONKSİYONLAR ==========
function updateOnlineList(users) {
    // Sağ menüde online listeyi güncelle
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

// ========== VİDEO GÜNCELLEME ==========
function updateVideo(channelName, videoId, title, artist) {
    if (!database) return;
    database.ref(`channels/${channelName}`).update({
        currentVideo: videoId,
        currentTitle: title,
        currentArtist: artist,
        updatedAt: Date.now()
    });
}

// ========== MESAJ GÖNDERME ==========
function sendRealtimeMessage(channelName, text, sender) {
    if (!database) return;
    database.ref(`channels/${channelName}/messages`).push({
        sender: sender,
        text: text,
        time: new Date().toLocaleTimeString('tr-TR'),
        timestamp: Date.now()
    });
}

// Global yap
window.database = database;
window.storage = storage;
window.initFirebase = initFirebase;
window.updateVideo = updateVideo;
window.sendRealtimeMessage = sendRealtimeMessage;

// Sayfa yüklendiğinde Firebase'i başlat
document.addEventListener('DOMContentLoaded', function() {
    // Firebase script'ini yükle
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
});
