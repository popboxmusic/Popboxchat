// ========== GERÇEK FIREBASE KONFİGÜRASYONU ==========
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
try {
    firebase.initializeApp(firebaseConfig);
    const database = firebase.database();
    
    console.log('🔥 GERÇEK FIREBASE başlatıldı!');
    console.log('✅ Veritabanı hazır');
    
    // Global yap
    window.database = database;
    window.db = database;
    
    // Test
    database.ref('test').set({ 
        status: 'aktif', 
        time: Date.now() 
    }).then(() => {
        console.log('✅ Firebase test başarılı');
    }).catch(err => {
        console.error('❌ Firebase test hatası:', err);
    });
    
} catch (error) {
    console.error('❌ Firebase başlatılamadı:', error);
}

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

console.log('✅ Tüm Firebase fonksiyonları hazır!');
