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
    
    // HTML'deki currentChannel değişkenini GÜVENLİ şekilde al
    // window.currentChannel henüz tanımlı olmayabilir, o yüzden kontrol et
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
            
            // Online listeyi güncelle
            updateOnlineList(users);
        });
        
        // Kanal mesajlarını dinle
        listenMessages(channel);
        
    }, 500); // 500ms bekle, HTML'in yüklenmesini sağla
}

// ========== ONLINE LİSTEYİ GÜNCELLE ==========
function updateOnlineList(users) {
    // Sol paneldeki online listeyi bul (farklı HTML yapısı olabilir)
    const onlineContainer = document.querySelector('#chatPanelContent, .online-list, [data-panel="online"]');
    if (!onlineContainer) return;
    
    let html = '';
    if (users) {
        // Kullanıcıları isme göre sırala
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
    
    onlineContainer.innerHTML = html || '<div style="color:#aaa; text-align:center; padding:20px;">👥 Çevrimiçi kimse yok</div>';
}

// ========== KANAL DEĞİŞTİRİNCE ==========
function changeChannel(channelName) {
    if (!database || !currentUser) return;
    
    console.log(`📡 Kanal değişiyor: ${channelName}`);
    
    // Eski kanaldan çık (window.currentChannel güvenli)
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
    
    // Yeni kanalın online listesini dinle (eski dinleyiciyi kaldır)
    database.ref(`online/${eskiKanal}`).off();
    database.ref(`online/${channelName}`).on('value', (snapshot) => {
        const users = snapshot.val();
        const onlineCount = users ? Object.keys(users).length : 0;
        
        const countEl = document.getElementById('channelUserCount');
        if (countEl) countEl.textContent = onlineCount;
        
        updateOnlineList(users);
    });
    
    // Mesaj dinleyicisini değiştir
    listenMessages(channelName);
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

// ========== HTML'DEKİ joinChannel FONKSİYONUNU YAKALA ==========
// Orijinal joinChannel fonksiyonunu koru ama Firebase'i de güncelle
const originalJoinChannel = window.joinChannel;
window.joinChannel = function(ch) {
    // Orijinal fonksiyonu çağır
    if (originalJoinChannel) originalJoinChannel(ch);
    
    // Firebase'i güncelle
    changeChannel(ch);
};

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('cetcety_active_user'));
    if (user) {
        // Biraz bekle, HTML'deki currentChannel'ın tanımlanmasını sağla
        setTimeout(() => {
            userJoined(user);
        }, 1000);
    }
    
    // Orijinal joinChannel'i sakla
    if (window.joinChannel) {
        window.originalJoinChannel = window.joinChannel;
    }
});

console.log('✅ Firebase config düzeltildi, window.currentChannel hatası giderildi');
