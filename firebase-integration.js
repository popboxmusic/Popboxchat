// firebase-integration.js - SADECE TEMEL ÖZELLİKLER
console.log("🚀 Firebase Integration yükleniyor...");

// Firebase değişkenleri
let isFirebaseConnected = false;
let currentFirebaseUser = null;
let database = null;
let usersRef = null;
let messagesRef = null;
let privateChatsRef = null;

// ==================== TEMEL FONKSİYONLAR ====================

// Firebase başlatma
function initializeFirebase() {
    console.log("🔧 Firebase başlatılıyor...");
    
    if (typeof firebase === 'undefined') {
        console.error("❌ Firebase SDK yüklenmedi!");
        return false;
    }
    
    try {
        // window.firebaseConfig kullan (firebase-config.js'den geliyor)
        if (!window.firebaseConfig) {
            console.error("❌ Firebase Config bulunamadı!");
            return false;
        }
        
        firebase.initializeApp(window.firebaseConfig);
        database = firebase.database();
        
        // Bağlantı durumunu dinle
        const connectedRef = database.ref(".info/connected");
        connectedRef.on("value", function(snap) {
            isFirebaseConnected = snap.val() === true;
            console.log(isFirebaseConnected ? "✅ Firebase bağlandı" : "❌ Firebase bağlantısı kesildi");
            
            if (isFirebaseConnected) {
                initializeFirebaseReferences();
                startFirebaseListeners();
                
                if (typeof window.onFirebaseConnected === 'function') {
                    window.onFirebaseConnected();
                }
            }
        });
        
        return true;
    } catch (error) {
        console.error("Firebase başlatma hatası:", error);
        return false;
    }
}

// Firebase referanslarını başlat
function initializeFirebaseReferences() {
    usersRef = database.ref('onlineUsers');
    messagesRef = database.ref('messages');
    privateChatsRef = database.ref('privateChats');
    
    console.log("📡 Firebase referansları başlatıldı");
}

// Kullanıcı giriş yaptığında
async function firebaseUserLogin(username, userData) {
    try {
        currentFirebaseUser = {
            name: username,
            ...userData
        };
        
        // Kullanıcıyı online listeye ekle
        await usersRef.child(username).set({
            name: username,
            lastSeen: Date.now(),
            joinedAt: Date.now(),
            isOnline: true,
            timestamp: Date.now(),
            role: userData.role || 'user',
            isRegistered: userData.registered || false
        });
        
        // Çıkış yapıldığında online durumu güncelle
        usersRef.child(username).onDisconnect().update({
            isOnline: false,
            lastSeen: Date.now()
        });
        
        return true;
    } catch (error) {
        console.error("Firebase giriş hatası:", error);
        return false;
    }
}

// ==================== MESAJ SİSTEMİ ====================

// Genel mesaj gönder
async function sendMessageFirebase(sender, message) {
    if (!isFirebaseConnected || !messagesRef) return false;
    
    try {
        const messageData = {
            sender: sender,
            text: message,
            timestamp: Date.now(),
            time: new Date().toLocaleTimeString('tr-TR', { 
                hour: '2-digit', 
                minute: '2-digit' 
            })
        };
        
        await messagesRef.push(messageData);
        
        // Online durumu güncelle
        if (usersRef) {
            usersRef.child(sender).update({
                lastSeen: Date.now()
            });
        }
        
        return true;
    } catch (error) {
        console.error("Mesaj gönderme hatası:", error);
        return false;
    }
}

// Özel mesaj gönder
async function sendPrivateMessageFirebase(sender, receiver, message) {
    if (!isFirebaseConnected || !privateChatsRef) return false;
    
    try {
        // Chat ID oluştur (alfabetik sıralı)
        const chatId = [sender, receiver].sort().join('_');
        
        const messageData = {
            sender: sender,
            receiver: receiver,
            text: message,
            timestamp: Date.now(),
            time: new Date().toLocaleTimeString('tr-TR', { 
                hour: '2-digit', 
                minute: '2-digit' 
            })
        };
        
        await privateChatsRef.child(chatId).push(messageData);
        return true;
        
    } catch (error) {
        console.error("Özel mesaj gönderme hatası:", error);
        return false;
    }
}

// Özel mesajları dinle
function listenPrivateChats(username, callback) {
    if (!privateChatsRef || !isFirebaseConnected) return;
    
    // Kullanıcıyı ilgilendiren tüm özel sohbetleri dinle
    privateChatsRef.on('child_added', function(snapshot) {
        const chatId = snapshot.key;
        
        // Eğer bu sohbette kullanıcı varsa
        if (chatId.includes(username)) {
            privateChatsRef.child(chatId).limitToLast(50).on('value', function(chatSnapshot) {
                const messages = chatSnapshot.val() || {};
                if (callback && typeof callback === 'function') {
                    callback(chatId, messages);
                }
            });
        }
    });
}

// ==================== DİNLEYİCİLER ====================

// Firebase dinleyicilerini başlat
function startFirebaseListeners() {
    if (!isFirebaseConnected) return;
    
    // Online kullanıcıları dinle
    if (usersRef) {
        usersRef.on('value', (snapshot) => {
            const users = snapshot.val() || {};
            if (typeof window.updateOnlineUsers === 'function') {
                window.updateOnlineUsers(users);
            }
        });
    }
    
    // Genel mesajları dinle
    if (messagesRef) {
        messagesRef.limitToLast(50).on('value', (snapshot) => {
            const messages = snapshot.val() || {};
            if (typeof window.updateMessages === 'function') {
                window.updateMessages(messages);
            }
        });
    }
}

// ==================== UTILITY FONKSİYONLAR ====================

// Firebase bağlantı kontrolü
function checkFirebaseConnection() {
    return new Promise((resolve) => {
        if (isFirebaseConnected) {
            resolve(true);
        } else {
            const checkInterval = setInterval(() => {
                if (isFirebaseConnected) {
                    clearInterval(checkInterval);
                    resolve(true);
                }
            }, 500);
            
            setTimeout(() => {
                clearInterval(checkInterval);
                resolve(false);
            }, 5000);
        }
    });
}

// ==================== GLOBAL EXPORT ====================

// Global olarak kullanılabilir hale getir
window.firebaseIntegration = {
    // Core
    initialize: initializeFirebase,
    isConnected: () => isFirebaseConnected,
    checkConnection: checkFirebaseConnection,
    
    // Auth
    login: firebaseUserLogin,
    getUser: () => currentFirebaseUser,
    
    // Chat
    sendMessage: sendMessageFirebase,
    sendPrivateMessage: sendPrivateMessageFirebase,
    listenPrivateChats: listenPrivateChats
};

// Sayfa yüklendiğinde otomatik başlat
window.addEventListener('load', function() {
    setTimeout(() => {
        initializeFirebase();
    }, 1000);
});

console.log("✅ Firebase Integration hazır! Sadece temel özellikler.");
