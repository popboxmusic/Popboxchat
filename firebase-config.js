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
let currentChannel = 'genel';

// Kullanıcı giriş yapınca
function userJoined(user) {
    currentUser = user;
    
    // Online kullanıcılara ekle
    database.ref(`online/${currentChannel}/${user.id}`).set({
        name: user.name,
        lastSeen: Date.now()
    });
    
    // Çıkışta sil
    database.ref(`online/${currentChannel}/${user.id}`).onDisconnect().remove();
    
    // Online listeyi dinle
    database.ref(`online/${currentChannel}`).on('value', (snapshot) => {
        const users = snapshot.val();
        const onlineCount = users ? Object.keys(users).length : 0;
        document.getElementById('channelUserCount').textContent = onlineCount;
        
        // SAĞ MENÜDE GÖSTER
        updateOnlineList(users);
    });
}

// Online listeyi güncelle
function updateOnlineList(users) {
    const container = document.getElementById('sagMenuIcerik');
    if (!container) return;
    
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
    container.innerHTML = html || '<div style="color:#666; padding:20px;">Kimse yok</div>';
}

// Global yap
window.userJoined = userJoined;

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('cetcety_active_user'));
    if (user) userJoined(user);
});
