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
        
        // Kullanıcı varsa bağlan
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

// Kanala bağlan
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
        
        // Sağ menüdeki online listeyi güncelle
        updateOnlineList(users);
    });
    
    // Mesajları dinle
    database.ref(`channels/${channelName}/messages`).off(); // Önceki dinleyicileri temizle
    database.ref(`channels/${channelName}/messages`).on('child_added', (snapshot) => {
        const msg = snapshot.val();
        if (msg && msg.sender !== currentUser.name) {
            displayRealtimeMessage(msg);
        }
    });
}

// Online liste güncelle
function updateOnlineList(users) {
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

// Gerçek zamanlı mesaj göster
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

// MESAJ GÖNDER (index.html'den çağrılacak)
function sendFirebaseMessage(channelName, text, sender) {
    if (!database) return;
    database.ref(`channels/${channelName}/messages`).push({
        sender: sender,
        text: text,
        time: new Date().toLocaleTimeString('tr-TR'),
        timestamp: Date.now()
    });
}

// KANAL DEĞİŞTİR (index.html'den çağrılacak)
function changeFirebaseChannel(channelName) {
    if (!database || !currentUser) return;
    connectToChannel(channelName);
}

// Global yap
window.database = database;
window.initFirebase = initFirebase;
window.sendFirebaseMessage = sendFirebaseMessage;
window.changeFirebaseChannel = changeFirebaseChannel;

// Sayfa yüklendiğinde başlat
document.addEventListener('DOMContentLoaded', function() {
    if (typeof initFirebase === 'function') {
        initFirebase();
    }
});
