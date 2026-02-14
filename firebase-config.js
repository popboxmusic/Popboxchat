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
// DİKKAT: currentChannel BURADA TANIMLANMADI! HTML'deki currentChannel kullanılacak.

// ========== KULLANICI GİRİŞ YAPINCA ==========
function userJoined(user) {
    if (!user) return;
    
    currentUser = user;
    
    // HTML'deki currentChannel değişkenini kullan
    const channel = window.currentChannel || 'genel';
    
    // Online kullanıcılara ekle
    database.ref(`online/${channel}/${user.id}`).set({
        name: user.name,
        lastSeen: Date.now(),
        joined: Date.now()
    });
    
    // Çıkışta sil
    database.ref(`online/${channel}/${user.id}`).onDisconnect().remove();
    
    // Online listeyi dinle
    database.ref(`online/${channel}`).on('value', (snapshot) => {
        const users = snapshot.val();
        const onlineCount = users ? Object.keys(users).length : 0;
        
        // Online sayısını güncelle
        const countEl = document.getElementById('channelUserCount');
        if (countEl) countEl.textContent = onlineCount;
        
        // Sağ menüdeki online listeyi güncelle (eğer online sekmesi açıksa)
        updateOnlineList(users);
    });
}

// ========== ONLINE LİSTEYİ GÜNCELLE ==========
function updateOnlineList(users) {
    const container = document.getElementById('sagMenuIcerik');
    if (!container) return;
    
    // Sadece online sekmesi aktifse güncelle
    const aktifSekme = document.querySelector('.sag-menu-sekme.aktif')?.dataset.sekme;
    if (aktifSekme !== 'online' && aktifSekme !== undefined) return;
    
    let html = '';
    if (users) {
        // Kullanıcıları isme göre sırala
        const userList = Object.values(users).sort((a, b) => a.name.localeCompare(b.name));
        
        userList.forEach(user => {
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
    
    container.innerHTML = html || '<div style="color:#666; text-align:center; padding:20px;">👥 Çevrimiçi kimse yok</div>';
}

// ========== KANAL DEĞİŞTİRİNCE ==========
function changeChannel(channelName) {
    if (!database || !currentUser) return;
    
    // Eski kanaldan çık
    const eskiKanal = window.currentChannel || 'genel';
    database.ref(`online/${eskiKanal}/${currentUser.id}`).remove();
    
    // Yeni kanala ekle
    database.ref(`online/${channelName}/${currentUser.id}`).set({
        name: currentUser.name,
        lastSeen: Date.now()
    });
    
    // Yeni kanalın online listesini dinle
    database.ref(`online/${channelName}`).on('value', (snapshot) => {
        const users = snapshot.val();
        const onlineCount = users ? Object.keys(users).length : 0;
        document.getElementById('channelUserCount').textContent = onlineCount;
        updateOnlineList(users);
    });
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

// ========== SEKMELERİ YAKALA ==========
function setupTabListeners() {
    const onlineSekme = document.querySelector('.sag-menu-sekme[data-sekme="online"]');
    const sohbetSekme = document.querySelector('.sag-menu-sekme[data-sekme="sohbetler"]');
    
    if (onlineSekme) {
        onlineSekme.addEventListener('click', function() {
            const channel = window.currentChannel || 'genel';
            database.ref(`online/${channel}`).once('value', (snapshot) => {
                updateOnlineList(snapshot.val());
            });
        });
    }
}

// ========== GLOBAL YAP ==========
window.database = database;
window.userJoined = userJoined;
window.changeChannel = changeChannel;
window.sendFirebaseMessage = sendFirebaseMessage;
window.listenMessages = listenMessages;

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('cetcety_active_user'));
    if (user) {
        userJoined(user);
        
        // Mevcut kanalın mesajlarını dinle
        const channel = window.currentChannel || 'genel';
        listenMessages(channel);
    }
    
    // Tab listener'ları kur
    setTimeout(setupTabListeners, 1000);
});
