// ========== firebase.js - Tüm Firebase Konfigürasyonu ve Real-time İşlemler ==========

// Firebase yapılandırması
const firebaseConfig = {
    apiKey: "AIzaSyCrn_tXJZCAlKhem45aXxj4f0h26EPOQ70",
    authDomain: "popboxmusicchat.firebaseapp.com",
    databaseURL: "https://popboxmusicchat-default-rtdb.firebaseio.com",
    projectId: "popboxmusicchat",
    storageBucket: "popboxmusicchat.firebasestorage.app",
    messagingSenderId: "206625719024",
    appId: "1:206625719024:web:d28f478a2c96d10412f835",
    measurementId: "G-SB1K22FLEX"
};

// Firebase servisleri
let database;
let usersRef, messagesRef, privateChatsRef, channelsRef, notificationsRef;

// Bağlantı durumu
let isFirebaseConnected = false;
let connectionListeners = [];

// ========== FIREBASE BAŞLATMA ==========
function initializeFirebase() {
    return new Promise((resolve, reject) => {
        try {
            console.log("🔥 Firebase başlatılıyor...");
            
            firebase.initializeApp(firebaseConfig);
            database = firebase.database();
            
            const connectedRef = database.ref(".info/connected");
            connectedRef.on("value", function(snap) {
                if (snap.val() === true) {
                    console.log("✅ Firebase'e BAĞLANDI!");
                    isFirebaseConnected = true;
                    
                    // Referansları tanımla
                    usersRef = database.ref('onlineUsers');
                    messagesRef = database.ref('messages');
                    privateChatsRef = database.ref('privateChats');
                    channelsRef = database.ref('channels');
                    notificationsRef = database.ref('notifications');
                    
                    // Bağlantı başarılı
                    connectionListeners.forEach(listener => listener(true));
                    resolve(true);
                } else {
                    console.log("❌ Firebase bağlantısı KESİLDİ");
                    isFirebaseConnected = false;
                    connectionListeners.forEach(listener => listener(false));
                }
            });
            
        } catch (error) {
            console.error("❌ Firebase başlatma hatası:", error);
            connectionListeners.forEach(listener => listener(false));
            reject(error);
        }
    });
}

// ========== BAĞLANTI DURUMU DİNLEME ==========
function onConnectionChange(callback) {
    connectionListeners.push(callback);
    return () => {
        connectionListeners = connectionListeners.filter(cb => cb !== callback);
    };
}

// ========== REAL-TIME: ONLINE KULLANICILAR ==========
function listenToOnlineUsers(callback) {
    if (!usersRef) return null;
    
    return usersRef.on('value', (snapshot) => {
        const data = snapshot.val() || {};
        const users = Object.keys(data).map(key => ({
            username: key,
            ...data[key]
        }));
        callback(users);
    });
}

// ========== REAL-TIME: KANAL MESAJLARI ==========
function listenToChannelMessages(channelName, callback) {
    if (!messagesRef) return null;
    
    const query = messagesRef.orderByChild('channel').equalTo(channelName).limitToLast(100);
    
    return query.on('child_added', (snapshot) => {
        const message = snapshot.val();
        callback(message);
    });
}

// ========== REAL-TIME: ÖZEL MESAJLAR ==========
function listenToPrivateMessages(chatId, callback) {
    if (!privateChatsRef) return null;
    
    return privateChatsRef.child(chatId).limitToLast(50).on('child_added', (snapshot) => {
        const message = snapshot.val();
        callback(message);
    });
}

// ========== REAL-TIME: KANAL DEĞİŞİKLİKLERİ ==========
function listenToChannels(callback) {
    if (!channelsRef) return null;
    
    return channelsRef.on('value', (snapshot) => {
        const channels = snapshot.val() || {};
        callback(channels);
    });
}

// ========== REAL-TIME: BİLDİRİMLER ==========
function listenToNotifications(userId, callback) {
    if (!notificationsRef) return null;
    
    return notificationsRef.child(userId).limitToLast(20).on('child_added', (snapshot) => {
        const notification = snapshot.val();
        callback(notification);
    });
}

// ========== MESAJ GÖNDER ==========
async function sendMessage(messageData) {
    if (!messagesRef || !isFirebaseConnected) return false;
    
    try {
        await messagesRef.push({
            ...messageData,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
        return true;
    } catch (error) {
        console.error("Mesaj gönderme hatası:", error);
        return false;
    }
}

// ========== ÖZEL MESAJ GÖNDER ==========
async function sendPrivateMessage(chatId, messageData) {
    if (!privateChatsRef || !isFirebaseConnected) return false;
    
    try {
        await privateChatsRef.child(chatId).push({
            ...messageData,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
        return true;
    } catch (error) {
        console.error("Özel mesaj gönderme hatası:", error);
        return false;
    }
}

// ========== KULLANICI DURUMU GÜNCELLE ==========
async function updateUserOnlineStatus(username, isOnline, channel = 'genel') {
    if (!usersRef || !isFirebaseConnected || !username) return;
    
    try {
        if (isOnline) {
            await usersRef.child(username).set({
                username: username,
                lastSeen: firebase.database.ServerValue.TIMESTAMP,
                currentChannel: channel
            });
        } else {
            await usersRef.child(username).remove();
        }
        return true;
    } catch (error) {
        console.error("Kullanıcı durumu güncelleme hatası:", error);
        return false;
    }
}

// ========== KANAL GÜNCELLE ==========
async function updateChannel(channelName, channelData) {
    if (!channelsRef || !isFirebaseConnected) return false;
    
    try {
        await channelsRef.child(channelName).set(channelData);
        return true;
    } catch (error) {
        console.error("Kanal güncelleme hatası:", error);
        return false;
    }
}

// ========== BİLDİRİM GÖNDER ==========
async function sendNotification(userId, notificationData) {
    if (!notificationsRef || !isFirebaseConnected) return false;
    
    try {
        await notificationsRef.child(userId).push({
            ...notificationData,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            read: false
        });
        return true;
    } catch (error) {
        console.error("Bildirim gönderme hatası:", error);
        return false;
    }
}

// ========== BİLDİRİM OKUNDU İŞARETLE ==========
async function markNotificationAsRead(userId, notificationId) {
    if (!notificationsRef || !isFirebaseConnected) return;
    
    try {
        await notificationsRef.child(userId).child(notificationId).update({ read: true });
    } catch (error) {
        console.error("Bildirim güncelleme hatası:", error);
    }
}

// ========== MESAJ SİL ==========
async function deleteMessage(messageId) {
    if (!messagesRef || !isFirebaseConnected) return false;
    
    try {
        await messagesRef.child(messageId).remove();
        return true;
    } catch (error) {
        console.error("Mesaj silme hatası:", error);
        return false;
    }
}

// ========== ÖZEL MESAJ SİL ==========
async function deletePrivateMessage(chatId, messageId) {
    if (!privateChatsRef || !isFirebaseConnected) return false;
    
    try {
        await privateChatsRef.child(chatId).child(messageId).remove();
        return true;
    } catch (error) {
        console.error("Özel mesaj silme hatası:", error);
        return false;
    }
}
