// ========== FIREBASE KONFİGÜRASYONU ==========
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

// Firebase referansları
let database;
let usersRef;
let messagesRef;
let privateChatsRef;
let coAdminsRef;
let bansRef;
let registeredUsersRef;
let operatorsRef;
let userLocksRef;
let adminPasswordsRef;
let customCommandsRef;
let adminListRef;
let isFirebaseConnected = false;

// ========== FIREBASE BAŞLATMA ==========
function initializeFirebase() {
    try {
        console.log("🔥 Firebase başlatılıyor...");
        
        firebase.initializeApp(firebaseConfig);
        database = firebase.database();
        
        const connectedRef = database.ref(".info/connected");
        connectedRef.on("value", function(snap) {
            if (snap.val() === true) {
                console.log("✅ Firebase'e BAĞLANDI!");
                isFirebaseConnected = true;
                
                usersRef = database.ref('onlineUsers');
                messagesRef = database.ref('messages');
                privateChatsRef = database.ref('privateChats');
                coAdminsRef = database.ref('coAdmins');
                bansRef = database.ref('bans');
                registeredUsersRef = database.ref('registeredUsers');
                operatorsRef = database.ref('operators');
                userLocksRef = database.ref('userLocks');
                adminPasswordsRef = database.ref('adminPasswords');
                customCommandsRef = database.ref('customCommands');
                adminListRef = database.ref('adminList');
                
                // Firebase bağlantısı kurulduğunda callback
                if (window.onFirebaseConnected) {
                    window.onFirebaseConnected();
                }
            } else {
                console.log("❌ Firebase bağlantısı KESİLDİ");
                isFirebaseConnected = false;
            }
        });
        
    } catch (error) {
        console.error("❌ Firebase başlatma hatası:", error);
    }
}

// ========== FIREBASE VERİ YÖNETİMİ ==========
const FirebaseDB = {
    // Kullanıcı işlemleri
    users: {
        async getAll() {
            if (!usersRef) return {};
            const snapshot = await usersRef.once('value');
            return snapshot.val() || {};
        },
        
        async get(username) {
            if (!usersRef) return null;
            const snapshot = await usersRef.child(username).once('value');
            return snapshot.val();
        },
        
        async set(username, userData) {
            if (!usersRef) return false;
            await usersRef.child(username).set(userData);
            return true;
        },
        
        async update(username, userData) {
            if (!usersRef) return false;
            await usersRef.child(username).update(userData);
            return true;
        },
        
        async remove(username) {
            if (!usersRef) return false;
            await usersRef.child(username).remove();
            return true;
        },
        
        onValue(callback) {
            if (!usersRef) return;
            usersRef.on('value', (snapshot) => {
                callback(snapshot.val() || {});
            });
        }
    },
    
    // Mesaj işlemleri
    messages: {
        async send(messageData) {
            if (!messagesRef) return null;
            const ref = await messagesRef.push(messageData);
            return ref.key;
        },
        
        async getLast(limit = 50) {
            if (!messagesRef) return [];
            const snapshot = await messagesRef.limitToLast(limit).once('value');
            const messages = snapshot.val() || {};
            return Object.entries(messages).map(([id, msg]) => ({ id, ...msg }));
        },
        
        async delete(messageId) {
            if (!messagesRef) return false;
            await messagesRef.child(messageId).remove();
            return true;
        },
        
        async clearAll() {
            if (!messagesRef) return false;
            await messagesRef.remove();
            return true;
        },
        
        onNewMessage(callback) {
            if (!messagesRef) return;
            messagesRef.limitToLast(1).on('child_added', (snapshot) => {
                callback({
                    id: snapshot.key,
                    ...snapshot.val()
                });
            });
        },
        
        onMessages(callback) {
            if (!messagesRef) return;
            messagesRef.limitToLast(50).on('value', (snapshot) => {
                const messages = snapshot.val() || {};
                const messagesArray = Object.entries(messages).map(([id, msg]) => ({
                    id,
                    ...msg
                })).sort((a, b) => a.timestamp - b.timestamp);
                callback(messagesArray);
            });
        }
    },
    
    // Özel sohbet işlemleri
    privateChats: {
        async send(chatId, messageData) {
            if (!privateChatsRef) return null;
            const ref = await privateChatsRef.child(chatId).push(messageData);
            return ref.key;
        },
        
        async getMessages(chatId, limit = 50) {
            if (!privateChatsRef) return [];
            const snapshot = await privateChatsRef.child(chatId).limitToLast(limit).once('value');
            const messages = snapshot.val() || {};
            return Object.entries(messages).map(([id, msg]) => ({ id, ...msg }));
        },
        
        onMessages(chatId, callback) {
            if (!privateChatsRef) return;
            privateChatsRef.child(chatId).limitToLast(50).on('value', (snapshot) => {
                const messages = snapshot.val() || {};
                const messagesArray = Object.entries(messages).map(([id, msg]) => ({
                    id,
                    ...msg
                })).sort((a, b) => a.timestamp - b.timestamp);
                callback(messagesArray);
            });
        },
        
        onNewMessage(chatId, callback) {
            if (!privateChatsRef) return;
            privateChatsRef.child(chatId).limitToLast(1).on('child_added', (snapshot) => {
                callback({
                    id: snapshot.key,
                    ...snapshot.val()
                });
            });
        },
        
        async deleteMessage(chatId, messageId) {
            if (!privateChatsRef) return false;
            await privateChatsRef.child(chatId).child(messageId).remove();
            return true;
        },
        
        async clearAll() {
            if (!privateChatsRef) return false;
            await privateChatsRef.remove();
            return true;
        }
    },
    
    // Kayıtlı kullanıcı işlemleri
    registeredUsers: {
        async getAll() {
            if (!registeredUsersRef) return {};
            const snapshot = await registeredUsersRef.once('value');
            return snapshot.val() || {};
        },
        
        async get(username) {
            if (!registeredUsersRef) return null;
            const snapshot = await registeredUsersRef.child(username).once('value');
            return snapshot.val();
        },
        
        async register(username, userData) {
            if (!registeredUsersRef) return false;
            await registeredUsersRef.child(username).set({
                ...userData,
                registeredAt: Date.now(),
                isRegistered: true
            });
            return true;
        },
        
        async unregister(username) {
            if (!registeredUsersRef) return false;
            await registeredUsersRef.child(username).remove();
            return true;
        },
        
        async update(username, userData) {
            if (!registeredUsersRef) return false;
            await registeredUsersRef.child(username).update(userData);
            return true;
        }
    },
    
    // Co-Admin işlemleri
    coAdmins: {
        async getAll() {
            if (!coAdminsRef) return [];
            const snapshot = await coAdminsRef.once('value');
            return snapshot.val() || [];
        },
        
        async add(username) {
            if (!coAdminsRef) return false;
            const snapshot = await coAdminsRef.once('value');
            let coAdmins = snapshot.val() || [];
            if (!Array.isArray(coAdmins)) coAdmins = [];
            if (!coAdmins.includes(username)) {
                coAdmins.push(username);
                await coAdminsRef.set(coAdmins);
            }
            return true;
        },
        
        async remove(username) {
            if (!coAdminsRef) return false;
            const snapshot = await coAdminsRef.once('value');
            let coAdmins = snapshot.val() || [];
            if (!Array.isArray(coAdmins)) coAdmins = [];
            const index = coAdmins.indexOf(username);
            if (index > -1) {
                coAdmins.splice(index, 1);
                await coAdminsRef.set(coAdmins);
            }
            return true;
        },
        
        onValue(callback) {
            if (!coAdminsRef) return;
            coAdminsRef.on('value', (snapshot) => {
                callback(snapshot.val() || []);
            });
        }
    },
    
    // Operatör işlemleri
    operators: {
        async getAll() {
            if (!operatorsRef) return [];
            const snapshot = await operatorsRef.once('value');
            return snapshot.val() || [];
        },
        
        async add(username) {
            if (!operatorsRef) return false;
            const snapshot = await operatorsRef.once('value');
            let operators = snapshot.val() || [];
            if (!Array.isArray(operators)) operators = [];
            if (!operators.includes(username)) {
                operators.push(username);
                await operatorsRef.set(operators);
            }
            return true;
        },
        
        async remove(username) {
            if (!operatorsRef) return false;
            const snapshot = await operatorsRef.once('value');
            let operators = snapshot.val() || [];
            if (!Array.isArray(operators)) operators = [];
            const index = operators.indexOf(username);
            if (index > -1) {
                operators.splice(index, 1);
                await operatorsRef.set(operators);
            }
            return true;
        },
        
        onValue(callback) {
            if (!operatorsRef) return;
            operatorsRef.on('value', (snapshot) => {
                callback(snapshot.val() || []);
            });
        }
    },
    
    // Admin listesi işlemleri
    adminList: {
        async getAll() {
            if (!adminListRef) return [];
            const snapshot = await adminListRef.once('value');
            return snapshot.val() || [];
        },
        
        async add(username) {
            if (!adminListRef) return false;
            const snapshot = await adminListRef.once('value');
            let admins = snapshot.val() || [];
            if (!Array.isArray(admins)) admins = [];
            if (!admins.includes(username)) {
                admins.push(username);
                await adminListRef.set(admins);
            }
            return true;
        },
        
        async remove(username) {
            if (!adminListRef) return false;
            const snapshot = await adminListRef.once('value');
            let admins = snapshot.val() || [];
            if (!Array.isArray(admins)) admins = [];
            const index = admins.indexOf(username);
            if (index > -1) {
                admins.splice(index, 1);
                await adminListRef.set(admins);
            }
            return true;
        },
        
        onValue(callback) {
            if (!adminListRef) return;
            adminListRef.on('value', (snapshot) => {
                callback(snapshot.val() || []);
            });
        }
    },
    
    // Ban işlemleri
    bans: {
        async getAll() {
            if (!bansRef) return {};
            const snapshot = await bansRef.once('value');
            return snapshot.val() || {};
        },
        
        async get(username) {
            if (!bansRef) return null;
            const snapshot = await bansRef.child(username).once('value');
            return snapshot.val();
        },
        
        async add(username, banData) {
            if (!bansRef) return false;
            await bansRef.child(username).set(banData);
            return true;
        },
        
        async remove(username) {
            if (!bansRef) return false;
            await bansRef.child(username).remove();
            return true;
        },
        
        onValue(callback) {
            if (!bansRef) return;
            bansRef.on('value', (snapshot) => {
                callback(snapshot.val() || {});
            });
        }
    },
    
    // Kullanıcı kilidi işlemleri
    userLocks: {
        async get(username) {
            if (!userLocksRef) return null;
            const snapshot = await userLocksRef.child(username).once('value');
            return snapshot.val();
        },
        
        async set(username, lockData) {
            if (!userLocksRef) return false;
            await userLocksRef.child(username).set(lockData);
            return true;
        },
        
        async remove(username) {
            if (!userLocksRef) return false;
            await userLocksRef.child(username).remove();
            return true;
        },
        
        async cleanup() {
            if (!userLocksRef) return;
            const snapshot = await userLocksRef.once('value');
            const locks = snapshot.val() || {};
            const now = Date.now();
            for (const [username, lockData] of Object.entries(locks)) {
                if (lockData && lockData.expiresAt < now) {
                    await userLocksRef.child(username).remove();
                }
            }
        }
    },
    
    // Admin şifreleri işlemleri
    adminPasswords: {
        async get(username) {
            if (!adminPasswordsRef) return null;
            const snapshot = await adminPasswordsRef.child(username).once('value');
            return snapshot.val();
        },
        
        async set(username, password) {
            if (!adminPasswordsRef) return false;
            await adminPasswordsRef.child(username).set(password);
            return true;
        },
        
        async remove(username) {
            if (!adminPasswordsRef) return false;
            await adminPasswordsRef.child(username).remove();
            return true;
        }
    },
    
    // Özel komutlar işlemleri
    customCommands: {
        async getAll() {
            if (!customCommandsRef) return {};
            const snapshot = await customCommandsRef.once('value');
            return snapshot.val() || {};
        },
        
        async get(command) {
            if (!customCommandsRef) return null;
            const snapshot = await customCommandsRef.child(command).once('value');
            return snapshot.val();
        },
        
        async set(command, commandData) {
            if (!customCommandsRef) return false;
            await customCommandsRef.child(command).set(commandData);
            return true;
        },
        
        async remove(command) {
            if (!customCommandsRef) return false;
            await customCommandsRef.child(command).remove();
            return true;
        },
        
        onValue(callback) {
            if (!customCommandsRef) return;
            customCommandsRef.on('value', (snapshot) => {
                callback(snapshot.val() || {});
            });
        }
    },
    
    // Bağlantı durumu
    isConnected() {
        return isFirebaseConnected;
    },
    
    // Firebase'i temizle (çıkışta)
    cleanup() {
        if (usersRef) usersRef.off();
        if (messagesRef) messagesRef.off();
        if (privateChatsRef) privateChatsRef.off();
        if (coAdminsRef) coAdminsRef.off();
        if (operatorsRef) operatorsRef.off();
        if (adminListRef) adminListRef.off();
        if (bansRef) bansRef.off();
        if (customCommandsRef) customCommandsRef.off();
    }
};

// Firebase'i global olarak kullanılabilir yap
window.FirebaseDB = FirebaseDB;
window.initializeFirebase = initializeFirebase;
