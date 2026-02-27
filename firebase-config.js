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

// ========== FIREBASE REFERANSLARI ==========
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
let storiesRef;
let storyLikesRef;
let storyReportsRef;

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
                showLoginSuccess("🔥 Firebase bağlantısı kuruldu!");
                
                // Firebase referanslarını oluştur
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
                storiesRef = database.ref('stories');
                storyLikesRef = database.ref('storyLikes');
                storyReportsRef = database.ref('storyReports');
                
                // Firebase bağlantısı kurulduktan sonra yapılacak işlemler
                initOwnerPassword();
                loadCustomCommands();
                updateBannedUsers();
                startBanMonitoring();
                startUserLocksCleanup();
                popboxBot.startAutoMessages();
                loadStories();
                loadStoryLikes();
                loadStoryReports();
                
            } else {
                console.log("❌ Firebase bağlantısı KESİLDİ");
                isFirebaseConnected = false;
                showLoginError("Firebase bağlantısı kesildi!");
            }
        });
        
    } catch (error) {
        console.error("❌ Firebase başlatma hatası:", error);
        showLoginError("Firebase başlatma hatası!");
    }
}

// ========== FIREBASE BAĞLANTI DURUMU ==========
function checkFirebaseConnection() {
    return isFirebaseConnected;
}

// ========== FIREBASE VERİ OKUMA YAZMA FONKSİYONLARI ==========

// KULLANICILAR
async function getUsers() {
    try {
        const snapshot = await usersRef.once('value');
        return snapshot.val() || {};
    } catch (error) {
        console.error("Kullanıcılar alınamadı:", error);
        return {};
    }
}

async function setUser(username, userData) {
    try {
        await usersRef.child(username).set(userData);
        return true;
    } catch (error) {
        console.error("Kullanıcı kaydedilemedi:", error);
        return false;
    }
}

async function updateUser(username, updates) {
    try {
        await usersRef.child(username).update(updates);
        return true;
    } catch (error) {
        console.error("Kullanıcı güncellenemedi:", error);
        return false;
    }
}

async function removeUser(username) {
    try {
        await usersRef.child(username).remove();
        return true;
    } catch (error) {
        console.error("Kullanıcı silinemedi:", error);
        return false;
    }
}

// MESAJLAR
async function getMessages(limit = 50) {
    try {
        const snapshot = await messagesRef.limitToLast(limit).once('value');
        return snapshot.val() || {};
    } catch (error) {
        console.error("Mesajlar alınamadı:", error);
        return {};
    }
}

async function sendMessage(messageData) {
    try {
        const newMessage = await messagesRef.push(messageData);
        return { success: true, id: newMessage.key };
    } catch (error) {
        console.error("Mesaj gönderilemedi:", error);
        return { success: false, error };
    }
}

async function deleteMessage(messageId) {
    try {
        await messagesRef.child(messageId).remove();
        return true;
    } catch (error) {
        console.error("Mesaj silinemedi:", error);
        return false;
    }
}

async function clearAllMessages() {
    try {
        await messagesRef.remove();
        return true;
    } catch (error) {
        console.error("Mesajlar temizlenemedi:", error);
        return false;
    }
}

// ÖZEL SOHBETLER
async function getPrivateMessages(chatId, limit = 50) {
    try {
        const snapshot = await privateChatsRef.child(chatId).limitToLast(limit).once('value');
        return snapshot.val() || {};
    } catch (error) {
        console.error("Özel mesajlar alınamadı:", error);
        return {};
    }
}

async function sendPrivateMessage(chatId, messageData) {
    try {
        const newMessage = await privateChatsRef.child(chatId).push(messageData);
        return { success: true, id: newMessage.key };
    } catch (error) {
        console.error("Özel mesaj gönderilemedi:", error);
        return { success: false, error };
    }
}

async function deletePrivateMessage(chatId, messageId) {
    try {
        await privateChatsRef.child(chatId).child(messageId).remove();
        return true;
    } catch (error) {
        console.error("Özel mesaj silinemedi:", error);
        return false;
    }
}

async function clearAllPrivateMessages() {
    try {
        await privateChatsRef.remove();
        return true;
    } catch (error) {
        console.error("Özel mesajlar temizlenemedi:", error);
        return false;
    }
}

// BAN SİSTEMİ
async function getBans() {
    try {
        const snapshot = await bansRef.once('value');
        return snapshot.val() || {};
    } catch (error) {
        console.error("Ban listesi alınamadı:", error);
        return {};
    }
}

async function setBan(username, banData) {
    try {
        await bansRef.child(username).set(banData);
        return true;
    } catch (error) {
        console.error("Ban eklenemedi:", error);
        return false;
    }
}

async function removeBan(username) {
    try {
        await bansRef.child(username).remove();
        return true;
    } catch (error) {
        console.error("Ban kaldırılamadı:", error);
        return false;
    }
}

async function checkBan(username) {
    try {
        const snapshot = await bansRef.child(username).once('value');
        const banData = snapshot.val();
        
        if (banData && banData.bannedUntil > Date.now()) {
            return { isBanned: true, banData };
        }
        
        if (banData) {
            await bansRef.child(username).remove();
        }
        
        return { isBanned: false };
    } catch (error) {
        console.error("Ban kontrolü yapılamadı:", error);
        return { isBanned: false };
    }
}

// KAYITLI KULLANICILAR
async function getRegisteredUsers() {
    try {
        const snapshot = await registeredUsersRef.once('value');
        return snapshot.val() || {};
    } catch (error) {
        console.error("Kayıtlı kullanıcılar alınamadı:", error);
        return {};
    }
}

async function registerUser(username, userData) {
    try {
        await registeredUsersRef.child(username).set(userData);
        return true;
    } catch (error) {
        console.error("Kullanıcı kaydedilemedi:", error);
        return false;
    }
}

async function unregisterUser(username) {
    try {
        await registeredUsersRef.child(username).remove();
        return true;
    } catch (error) {
        console.error("Kullanıcı silinemedi:", error);
        return false;
    }
}

async function checkRegisteredUser(username) {
    try {
        const snapshot = await registeredUsersRef.child(username).once('value');
        return snapshot.val();
    } catch (error) {
        console.error("Kayıtlı kullanıcı kontrolü yapılamadı:", error);
        return null;
    }
}

// CO-ADMINLER
async function getCoAdmins() {
    try {
        const snapshot = await coAdminsRef.once('value');
        return snapshot.val() || [];
    } catch (error) {
        console.error("Co-admin listesi alınamadı:", error);
        return [];
    }
}

async function addCoAdmin(username) {
    try {
        const coAdmins = await getCoAdmins();
        if (!Array.isArray(coAdmins)) {
            coAdmins = [];
        }
        if (!coAdmins.includes(username)) {
            coAdmins.push(username);
            await coAdminsRef.set(coAdmins);
            return true;
        }
        return false;
    } catch (error) {
        console.error("Co-admin eklenemedi:", error);
        return false;
    }
}

async function removeCoAdmin(username) {
    try {
        let coAdmins = await getCoAdmins();
        if (!Array.isArray(coAdmins)) {
            coAdmins = [];
        }
        const index = coAdmins.indexOf(username);
        if (index > -1) {
            coAdmins.splice(index, 1);
            await coAdminsRef.set(coAdmins);
            return true;
        }
        return false;
    } catch (error) {
        console.error("Co-admin kaldırılamadı:", error);
        return false;
    }
}

// OPERATÖRLER
async function getOperators() {
    try {
        const snapshot = await operatorsRef.once('value');
        return snapshot.val() || [];
    } catch (error) {
        console.error("Operatör listesi alınamadı:", error);
        return [];
    }
}

async function addOperator(username) {
    try {
        let operators = await getOperators();
        if (!Array.isArray(operators)) {
            operators = [];
        }
        if (!operators.includes(username)) {
            operators.push(username);
            await operatorsRef.set(operators);
            return true;
        }
        return false;
    } catch (error) {
        console.error("Operatör eklenemedi:", error);
        return false;
    }
}

async function removeOperator(username) {
    try {
        let operators = await getOperators();
        if (!Array.isArray(operators)) {
            operators = [];
        }
        const index = operators.indexOf(username);
        if (index > -1) {
            operators.splice(index, 1);
            await operatorsRef.set(operators);
            return true;
        }
        return false;
    } catch (error) {
        console.error("Operatör kaldırılamadı:", error);
        return false;
    }
}

// ADMIN LİSTESİ
async function getAdminList() {
    try {
        const snapshot = await adminListRef.once('value');
        return snapshot.val() || [];
    } catch (error) {
        console.error("Admin listesi alınamadı:", error);
        return [];
    }
}

async function addToAdminList(username) {
    try {
        let adminList = await getAdminList();
        if (!Array.isArray(adminList)) {
            adminList = [];
        }
        if (!adminList.includes(username)) {
            adminList.push(username);
            await adminListRef.set(adminList);
            return true;
        }
        return false;
    } catch (error) {
        console.error("Admin eklenemedi:", error);
        return false;
    }
}

async function removeFromAdminList(username) {
    try {
        let adminList = await getAdminList();
        if (!Array.isArray(adminList)) {
            adminList = [];
        }
        const index = adminList.indexOf(username);
        if (index > -1) {
            adminList.splice(index, 1);
            await adminListRef.set(adminList);
            return true;
        }
        return false;
    } catch (error) {
        console.error("Admin kaldırılamadı:", error);
        return false;
    }
}

// KULLANICI KİLİTLERİ
async function getUserLocks() {
    try {
        const snapshot = await userLocksRef.once('value');
        return snapshot.val() || {};
    } catch (error) {
        console.error("Kullanıcı kilitleri alınamadı:", error);
        return {};
    }
}

async function setUserLock(username, lockData) {
    try {
        await userLocksRef.child(username).set(lockData);
        return true;
    } catch (error) {
        console.error("Kullanıcı kilitlenemedi:", error);
        return false;
    }
}

async function removeUserLock(username) {
    try {
        await userLocksRef.child(username).remove();
        return true;
    } catch (error) {
        console.error("Kullanıcı kilidi kaldırılamadı:", error);
        return false;
    }
}

// ADMIN ŞİFRELERİ
async function getAdminPassword(username) {
    try {
        const snapshot = await adminPasswordsRef.child(username).once('value');
        return snapshot.val();
    } catch (error) {
        console.error("Admin şifresi alınamadı:", error);
        return null;
    }
}

async function setAdminPassword(username, password) {
    try {
        await adminPasswordsRef.child(username).set(password);
        return true;
    } catch (error) {
        console.error("Admin şifresi kaydedilemedi:", error);
        return false;
    }
}

// ÖZEL KOMUTLAR
async function getCustomCommands() {
    try {
        const snapshot = await customCommandsRef.once('value');
        return snapshot.val() || {};
    } catch (error) {
        console.error("Özel komutlar alınamadı:", error);
        return {};
    }
}

async function setCustomCommand(commandName, commandData) {
    try {
        await customCommandsRef.child(commandName).set(commandData);
        return true;
    } catch (error) {
        console.error("Özel komut kaydedilemedi:", error);
        return false;
    }
}

async function removeCustomCommand(commandName) {
    try {
        await customCommandsRef.child(commandName).remove();
        return true;
    } catch (error) {
        console.error("Özel komut silinemedi:", error);
        return false;
    }
}

// STORY'LER
async function getStories() {
    try {
        const snapshot = await storiesRef.once('value');
        return snapshot.val() || {};
    } catch (error) {
        console.error("Story'ler alınamadı:", error);
        return {};
    }
}

async function createStory(storyData) {
    try {
        const newStory = await storiesRef.push(storyData);
        return { success: true, id: newStory.key };
    } catch (error) {
        console.error("Story oluşturulamadı:", error);
        return { success: false, error };
    }
}

async function updateStory(storyId, updates) {
    try {
        await storiesRef.child(storyId).update(updates);
        return true;
    } catch (error) {
        console.error("Story güncellenemedi:", error);
        return false;
    }
}

async function deleteStory(storyId) {
    try {
        await storiesRef.child(storyId).remove();
        return true;
    } catch (error) {
        console.error("Story silinemedi:", error);
        return false;
    }
}

// STORY LİKE'LAR
async function getStoryLikes(storyId) {
    try {
        const snapshot = await storyLikesRef.child(storyId).once('value');
        return snapshot.val() || {};
    } catch (error) {
        console.error("Story like'ları alınamadı:", error);
        return {};
    }
}

async function addStoryLike(storyId, username, likeData) {
    try {
        await storyLikesRef.child(storyId).child(username).set(likeData);
        return true;
    } catch (error) {
        console.error("Story like'ı eklenemedi:", error);
        return false;
    }
}

async function removeStoryLike(storyId, username) {
    try {
        await storyLikesRef.child(storyId).child(username).remove();
        return true;
    } catch (error) {
        console.error("Story like'ı kaldırılamadı:", error);
        return false;
    }
}

// STORY ŞİKAYETLERİ
async function getStoryReports(storyId) {
    try {
        const snapshot = await storyReportsRef.child(storyId).once('value');
        return snapshot.val() || {};
    } catch (error) {
        console.error("Story şikayetleri alınamadı:", error);
        return {};
    }
}

async function addStoryReport(storyId, reportData) {
    try {
        const newReport = await storyReportsRef.child(storyId).push(reportData);
        return { success: true, id: newReport.key };
    } catch (error) {
        console.error("Story şikayeti eklenemedi:", error);
        return { success: false, error };
    }
}

async function updateStoryReport(storyId, reportId, updates) {
    try {
        await storyReportsRef.child(storyId).child(reportId).update(updates);
        return true;
    } catch (error) {
        console.error("Story şikayeti güncellenemedi:", error);
        return false;
    }
}

async function deleteStoryReport(storyId, reportId) {
    try {
        await storyReportsRef.child(storyId).child(reportId).remove();
        return true;
    } catch (error) {
        console.error("Story şikayeti silinemedi:", error);
        return false;
    }
}

// ========== REAL-TIME DİNLEYİCİLER ==========
function listenToUsers(callback) {
    if (!usersRef) return;
    usersRef.on('value', (snapshot) => {
        callback(snapshot.val());
    });
}

function listenToMessages(callback, limit = 50) {
    if (!messagesRef) return;
    messagesRef.limitToLast(limit).on('value', (snapshot) => {
        callback(snapshot.val());
    });
}

function listenToPrivateMessages(chatId, callback, limit = 50) {
    if (!privateChatsRef || !chatId) return;
    privateChatsRef.child(chatId).limitToLast(limit).on('value', (snapshot) => {
        callback(snapshot.val());
    });
}

function listenToCoAdmins(callback) {
    if (!coAdminsRef) return;
    coAdminsRef.on('value', (snapshot) => {
        callback(snapshot.val() || []);
    });
}

function listenToOperators(callback) {
    if (!operatorsRef) return;
    operatorsRef.on('value', (snapshot) => {
        callback(snapshot.val() || []);
    });
}

function listenToAdminList(callback) {
    if (!adminListRef) return;
    adminListRef.on('value', (snapshot) => {
        callback(snapshot.val() || []);
    });
}

function listenToBans(callback) {
    if (!bansRef) return;
    bansRef.on('value', (snapshot) => {
        callback(snapshot.val() || {});
    });
}

function listenToStories(callback) {
    if (!storiesRef) return;
    storiesRef.on('value', (snapshot) => {
        callback(snapshot.val() || {});
    });
}

function listenToStoryLikes(callback) {
    if (!storyLikesRef) return;
    storyLikesRef.on('value', (snapshot) => {
        callback(snapshot.val() || {});
    });
}

function listenToStoryReports(callback) {
    if (!storyReportsRef) return;
    storyReportsRef.on('value', (snapshot) => {
        callback(snapshot.val() || {});
    });
}

// ========== DİNLEYİCİLERİ KALDIRMA ==========
function removeListeners() {
    if (usersRef) usersRef.off();
    if (messagesRef) messagesRef.off();
    if (coAdminsRef) coAdminsRef.off();
    if (operatorsRef) operatorsRef.off();
    if (adminListRef) adminListRef.off();
    if (bansRef) bansRef.off();
    if (storiesRef) storiesRef.off();
    if (storyLikesRef) storyLikesRef.off();
    if (storyReportsRef) storyReportsRef.off();
}

// ========== DISCONNECT İŞLEMLERİ ==========
function setupDisconnect(username) {
    if (!usersRef || !username) return;
    usersRef.child(username).onDisconnect().remove();
}
