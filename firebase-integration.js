// firebase-integration.js - SADECE TEMEL ÖZELLİKLER
console.log("🚀 Firebase Integration yükleniyor...");

// Firebase değişkenleri
let isFirebaseConnected = false;
let currentFirebaseUser = null;
let database = null;
let usersRef = null;
let messagesRef = null;
let privateChatsRef = null;
let connectionRef = null; // Bağlantı referansı için

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
        
        // Firebase zaten başlatılmış mı kontrol et
        if (firebase.apps.length > 0) {
            console.log("ℹ️ Firebase zaten başlatılmış");
            database = firebase.database();
            initializeFirebaseReferences();
            return true;
        }
        
        firebase.initializeApp(window.firebaseConfig);
        database = firebase.database();
        
        // Bağlantı durumunu dinle
        if (connectionRef) {
            connectionRef.off(); // Önceki dinleyiciyi kaldır
        }
        
        connectionRef = database.ref(".info/connected");
        connectionRef.on("value", function(snap) {
            const wasConnected = isFirebaseConnected;
            isFirebaseConnected = snap.val() === true;
            
            if (isFirebaseConnected !== wasConnected) {
                console.log(isFirebaseConnected ? "✅ Firebase bağlandı" : "❌ Firebase bağlantısı kesildi");
            }
            
            if (isFirebaseConnected) {
                initializeFirebaseReferences();
                startFirebaseListeners();
                
                if (typeof window.onFirebaseConnected === 'function') {
                    window.onFirebaseConnected();
                }
            } else {
                // Bağlantı kesildiğinde dinleyicileri temizle
                cleanupListeners();
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
    if (!database) {
        console.error("❌ Database bağlantısı yok!");
        return;
    }
    
    usersRef = database.ref('onlineUsers');
    messagesRef = database.ref('messages');
    privateChatsRef = database.ref('privateChats');
    
    console.log("📡 Firebase referansları başlatıldı");
}

// Dinleyicileri temizle
function cleanupListeners() {
    if (usersRef) {
        usersRef.off();
    }
    if (messagesRef) {
        messagesRef.off();
    }
    if (privateChatsRef) {
        privateChatsRef.off();
    }
}

// Kullanıcı giriş yaptığında
async function firebaseUserLogin(username, userData) {
    try {
        if (!usersRef) {
            console.error("❌ Users referansı başlatılmamış!");
            return false;
        }
        
        currentFirebaseUser = {
            name: username,
            ...userData
        };
        
        const userUpdate = {
            name: username,
            lastSeen: Date.now(),
            joinedAt: Date.now(),
            isOnline: true,
            timestamp: Date.now(),
            role: userData.role || 'user',
            isRegistered: userData.registered || false
        };
        
        // Kullanıcıyı online listeye ekle
        await usersRef.child(username).set(userUpdate);
        
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

// Kullanıcı çıkış yaptığında
async function firebaseUserLogout(username) {
    try {
        if (!usersRef) {
            console.error("❌ Users referansı başlatılmamış!");
            return false;
        }
        
        await usersRef.child(username).update({
            isOnline: false,
            lastSeen: Date.now()
        });
        
        currentFirebaseUser = null;
        
        return true;
    } catch (error) {
        console.error("Firebase çıkış hatası:", error);
        return false;
    }
}

// ==================== MESAJ SİSTEMİ ====================

// Genel mesaj gönder
async function sendMessageFirebase(sender, message) {
    if (!isFirebaseConnected || !messagesRef) {
        console.error("❌ Firebase bağlantısı yok veya messagesRef tanımlı değil!");
        return false;
    }
    
    try {
        const messageData = {
            sender: sender,
            text: message,
            timestamp: Date.now(),
            time: new Date().toLocaleTimeString('tr-TR', { 
                hour: '2-digit', 
                minute: '2-digit' 
            }),
            date: new Date().toLocaleDateString('tr-TR')
        };
        
        const newMessageRef = await messagesRef.push(messageData);
        
        // Online durumu güncelle
        if (usersRef && sender) {
            usersRef.child(sender).update({
                lastSeen: Date.now()
            });
        }
        
        return newMessageRef.key; // Mesaj ID'sini döndür
    } catch (error) {
        console.error("Mesaj gönderme hatası:", error);
        return false;
    }
}

// Özel mesaj gönder
async function sendPrivateMessageFirebase(sender, receiver, message) {
    if (!isFirebaseConnected || !privateChatsRef) {
        console.error("❌ Firebase bağlantısı yok veya privateChatsRef tanımlı değil!");
        return false;
    }
    
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
            }),
            date: new Date().toLocaleDateString('tr-TR')
        };
        
        const newMessageRef = await privateChatsRef.child(chatId).push(messageData);
        return newMessageRef.key;
        
    } catch (error) {
        console.error("Özel mesaj gönderme hatası:", error);
        return false;
    }
}

// Özel mesajları dinle
function listenPrivateChats(username, callback) {
    if (!privateChatsRef || !isFirebaseConnected || !username) {
        console.error("❌ Özel mesaj dinleyicisi için gerekli parametreler eksik!");
        return null;
    }
    
    try {
        // Önceki dinleyicileri temizle
        privateChatsRef.off();
        
        const listener = privateChatsRef.on('child_added', function(snapshot) {
            const chatId = snapshot.key;
            
            // Eğer bu sohbette kullanıcı varsa
            if (chatId && chatId.includes(username)) {
                privateChatsRef.child(chatId).limitToLast(50).on('value', function(chatSnapshot) {
                    const messages = chatSnapshot.val() || {};
                    if (callback && typeof callback === 'function') {
                        callback(chatId, messages);
                    }
                });
            }
        });
        
        return listener;
    } catch (error) {
        console.error("Özel mesaj dinleme hatası:", error);
        return null;
    }
}

// ==================== DİNLEYİCİLER ====================

// Firebase dinleyicilerini başlat
function startFirebaseListeners() {
    if (!isFirebaseConnected) {
        console.error("❌ Firebase bağlantısı yok!");
        return;
    }
    
    // Online kullanıcıları dinle
    if (usersRef) {
        usersRef.off(); // Önceki dinleyiciyi kaldır
        usersRef.on('value', (snapshot) => {
            const users = snapshot.val() || {};
            if (typeof window.updateOnlineUsers === 'function') {
                window.updateOnlineUsers(users);
            }
        }, (error) => {
            console.error("Online kullanıcı dinleme hatası:", error);
        });
    }
    
    // Genel mesajları dinle
    if (messagesRef) {
        messagesRef.off(); // Önceki dinleyiciyi kaldır
        messagesRef.limitToLast(50).on('value', (snapshot) => {
            const messages = snapshot.val() || {};
            if (typeof window.updateMessages === 'function') {
                window.updateMessages(messages);
            }
        }, (error) => {
            console.error("Mesaj dinleme hatası:", error);
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
            const maxWaitTime = 10000; // 10 saniye
            const startTime = Date.now();
            
            const checkInterval = setInterval(() => {
                if (isFirebaseConnected) {
                    clearInterval(checkInterval);
                    resolve(true);
                } else if (Date.now() - startTime > maxWaitTime) {
                    clearInterval(checkInterval);
                    console.error("⏰ Firebase bağlantı zaman aşımı!");
                    resolve(false);
                }
            }, 500);
        }
    });
}

// Temizleme fonksiyonu
function cleanupFirebase() {
    if (connectionRef) {
        connectionRef.off();
        connectionRef = null;
    }
    
    cleanupListeners();
    
    if (currentFirebaseUser && currentFirebaseUser.name && usersRef) {
        firebaseUserLogout(currentFirebaseUser.name).catch(console.error);
    }
    
    isFirebaseConnected = false;
    currentFirebaseUser = null;
    
    console.log("🧹 Firebase temizlendi");
}

// ==================== GLOBAL EXPORT ====================

// Global olarak kullanılabilir hale getir
window.firebaseIntegration = {
    // Core
    initialize: initializeFirebase,
    cleanup: cleanupFirebase,
    isConnected: () => isFirebaseConnected,
    checkConnection: checkFirebaseConnection,
    
    // Auth
    login: firebaseUserLogin,
    logout: firebaseUserLogout,
    getUser: () => currentFirebaseUser,
    
    // Chat
    sendMessage: sendMessageFirebase,
    sendPrivateMessage: sendPrivateMessageFirebase,
    listenPrivateChats: listenPrivateChats,
    
    // References
    getDatabase: () => database,
    getUsersRef: () => usersRef,
    getMessagesRef: () => messagesRef
};

// Sayfa yüklendiğinde otomatik başlat
window.addEventListener('load', function() {
    setTimeout(() => {
        if (typeof firebase !== 'undefined') {
            initializeFirebase();
        } else {
            console.warn("⚠️ Firebase SDK henüz yüklenmedi, 3 saniye sonra tekrar denenecek...");
            setTimeout(initializeFirebase, 3000);
        }
    }, 1000);
});

// Sayfa kapanırken temizle
window.addEventListener('beforeunload', function() {
    cleanupFirebase();
});

console.log("✅ Firebase Integration hazır! Sadece temel özellikler.");
