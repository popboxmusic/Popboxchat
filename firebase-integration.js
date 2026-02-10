// firebase-integration.js
console.log("🚀 Firebase Integration yükleniyor...");

// ==================== FIREBASE ENTEGRASYONU ====================

// Firebase yapılandırması
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyCrn_tXJZCAlKhem45aXjX4f0h26EPOQ70",
    authDomain: "popboxmusicchat.firebaseapp.com",
    databaseURL: "https://popboxmusicchat-default-rtdb.firebaseio.com",
    projectId: "popboxmusicchat",
    storageBucket: "popboxmusicchat.firebasestorage.app",
    messagingSenderId: "206625719024",
    appId: "1:206625719024:web:d28f478a2c96d10412f835",
    measurementId: "G-SB1K22FLEX"
};

// Firebase değişkenleri
let firebaseApp;
let database;
let usersRef;
let messagesRef;
let privateChatsRef;
let coAdminsRef;
let bansRef;
let registeredUsersRef;
let customCommandsRef;
let adminListRef;
let storiesRef;

let isFirebaseConnected = false;
let currentFirebaseUser = null;
let userPrivateChats = []; // Kullanıcının özel sohbetlerini takip et

// ==================== TEMEL FONKSİYONLAR ====================

// Firebase başlatma
function initializeFirebase() {
    console.log("🔧 Firebase başlatılıyor...");
    
    if (typeof firebase === 'undefined') {
        console.error("❌ Firebase SDK yüklenmedi!");
        return false;
    }
    
    try {
        firebaseApp = firebase.initializeApp(FIREBASE_CONFIG);
        database = firebase.database();
        
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
    coAdminsRef = database.ref('coAdmins');
    bansRef = database.ref('bans');
    registeredUsersRef = database.ref('registeredUsers');
    customCommandsRef = database.ref('customCommands');
    adminListRef = database.ref('adminList');
    storiesRef = database.ref('stories');
    
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
        
        // Kullanıcının özel sohbetlerini temizleme handler'ı
        setupUserCleanup(username);
        
        return true;
    } catch (error) {
        console.error("Firebase giriş hatası:", error);
        return false;
    }
}

// ==================== ÖZEL SOHBET TEMİZLEME SİSTEMİ ====================

// Kullanıcı çıkış yaptığında özel sohbetleri temizle
async function clearUserPrivateChats(username) {
    if (!privateChatsRef) return;
    
    try {
        console.log(`🧹 ${username} kullanıcısının özel sohbetleri temizleniyor...`);
        
        // Kullanıcının tüm özel sohbetlerini bul
        const snapshot = await privateChatsRef.once('value');
        const allChats = snapshot.val() || {};
        
        const promises = [];
        
        Object.keys(allChats).forEach(chatId => {
            // Chat ID formatı: user1_user2
            if (chatId.includes(username)) {
                console.log(`🗑️ Özel sohbet siliniyor: ${chatId}`);
                promises.push(privateChatsRef.child(chatId).remove());
                userPrivateChats = userPrivateChats.filter(id => id !== chatId);
            }
        });
        
        await Promise.all(promises);
        console.log(`✅ ${username} kullanıcısının ${promises.length} özel sohbeti temizlendi`);
        
    } catch (error) {
        console.error("Özel sohbet temizleme hatası:", error);
    }
}

// Kullanıcı için cleanup handler kur
function setupUserCleanup(username) {
    // Sayfadan çıkıldığında temizle
    window.addEventListener('beforeunload', function() {
        clearUserPrivateChats(username);
        usersRef.child(username).remove();
    });
    
    // Çıkış butonuna tıklandığında temizle
    const originalLogout = window.handleLogout;
    window.handleLogout = function() {
        clearUserPrivateChats(username);
        usersRef.child(username).remove();
        if (originalLogout) originalLogout();
    };
    
    // Firebase disconnect handler
    usersRef.child(username).onDisconnect().update({
        isOnline: false,
        lastSeen: Date.now()
    });
    
    // Disconnect olduğunda özel sohbetleri de temizle
    database.ref(".info/connected").on("value", function(snap) {
        if (snap.val() === false) {
            clearUserPrivateChats(username);
        }
    });
}

// Özel sohbet oluştur
function createPrivateChat(user1, user2) {
    const chatId = generateChatId(user1, user2);
    
    // Bu sohbeti takip listesine ekle
    if (!userPrivateChats.includes(chatId)) {
        userPrivateChats.push(chatId);
    }
    
    return chatId;
}

// Chat ID oluşturma
function generateChatId(user1, user2) {
    const users = [user1, user2].sort();
    return `${users[0]}_${users[1]}`;
}

// Özel mesaj gönder
async function sendPrivateMessageFirebase(sender, receiver, message, imageData = null) {
    if (!isFirebaseConnected || !privateChatsRef) return false;
    
    try {
        const chatId = createPrivateChat(sender, receiver);
        
        const messageData = {
            sender: sender,
            text: message,
            timestamp: Date.now(),
            time: new Date().toLocaleTimeString('tr-TR', { 
                hour: '2-digit', 
                minute: '2-digit' 
            })
        };
        
        if (imageData) {
            messageData.image = imageData;
            messageData.text = '📸 Resim';
        }
        
        await privateChatsRef.child(chatId).push(messageData);
        return true;
        
    } catch (error) {
        console.error("Özel mesaj gönderme hatası:", error);
        return false;
    }
}

// Özel mesajları dinle
function listenPrivateChats(username, callback) {
    if (!privateChatsRef) return;
    
    // Kullanıcının tüm özel sohbetlerini dinle
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

// ==================== GENEL MESAJ SİSTEMİ ====================

// Mesaj gönder
async function sendMessageFirebase(sender, message, imageData = null) {
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
        
        if (imageData) {
            messageData.image = imageData;
            messageData.text = '📸 Resim';
        }
        
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

// Hata göster
function showFirebaseError(message) {
    console.error("Firebase Error:", message);
    if (typeof window.showError === 'function') {
        window.showError(message);
    }
}

// Başarı göster
function showFirebaseSuccess(message) {
    console.log("Firebase Success:", message);
}

// ==================== GLOBAL EXPORT ====================

// Global olarak kullanılabilir hale getir
window.firebaseIntegration = {
    initialize: initializeFirebase,
    login: firebaseUserLogin,
    sendMessage: sendMessageFirebase,
    sendPrivateMessage: sendPrivateMessageFirebase,
    listenPrivateChats: listenPrivateChats,
    clearUserPrivateChats: clearUserPrivateChats,
    checkConnection: checkFirebaseConnection,
    isConnected: () => isFirebaseConnected,
    getUser: () => currentFirebaseUser,
    showError: showFirebaseError,
    showSuccess: showFirebaseSuccess
};

// Sayfa yüklendiğinde otomatik başlat
window.addEventListener('load', function() {
    setTimeout(() => {
        initializeFirebase();
    }, 1000);
});

console.log("✅ Firebase Integration hazır!");