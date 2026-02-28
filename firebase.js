// ========== FIREBASE.JS - GERÇEK ZAMANLI VERİ TABANI ==========
// Tüm veriler Firebase'de saklanır, localStorage sadece yedek

const firebaseConfig = {
    apiKey: "AIzaSyCrn_tXJZCAlKhem45aXxj4f0h26EPOQ70",
    authDomain: "popboxmusicchat.firebaseapp.com",
    databaseURL: "https://popboxmusicchat-default-rtdb.firebaseio.com",
    projectId: "popboxmusicchat",
    storageBucket: "popboxmusicchat.firebasestorage.app",
    messagingSenderId: "206625719024",
    appId: "1:206625719024:web:d28f478a2c96d10412f835"
};

// Firebase'i başlat
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const storage = firebase.storage();

// ========== FIREBASE REFERANSLARI ==========
const db = {
    users: database.ref('users'),
    channels: database.ref('channels'),
    messages: database.ref('messages'),
    privateChats: database.ref('privateChats'),
    bannedWords: database.ref('bannedWords'),
    customCommands: database.ref('customCommands'),
    blocked: database.ref('blocked'),
    superHidden: database.ref('superHidden'),
    privateSpy: database.ref('privateSpy'),
    connected: database.ref('.info/connected')
};

// ========== BAĞLANTI DURUMU ==========
db.connected.on('value', (snap) => {
    const statusEl = document.getElementById('connectionStatus');
    const statusText = document.getElementById('statusText');
    
    if (snap.val() === true) {
        statusEl.className = 'connection-status connected';
        statusText.textContent = 'Firebase Bağlı';
        console.log('✅ Firebase bağlantısı kuruldu');
        
        // localStorage'daki verileri Firebase'e aktar (ilk çalıştırmada)
        migrateLocalStorageToFirebase();
    } else {
        statusEl.className = 'connection-status disconnected';
        statusText.textContent = 'Bağlantı Yok';
        console.log('❌ Firebase bağlantısı kesildi');
    }
});

// ========== VERİ AKTARIMI (localStorage -> Firebase) ==========
async function migrateLocalStorageToFirebase() {
    // Kullanıcıları aktar
    const localUsers = localStorage.getItem('cetcety_users');
    if (localUsers) {
        const users = JSON.parse(localUsers);
        users.forEach(async (user) => {
            const snapshot = await db.users.orderByChild('nameLower').equalTo(user.name.toLowerCase()).once('value');
            if (!snapshot.exists()) {
                await db.users.push(user);
            }
        });
    }
    
    // Kanalları aktar
    const localChannels = localStorage.getItem('cetcety_channels');
    if (localChannels) {
        const channels = JSON.parse(localChannels);
        Object.keys(channels).forEach(async (key) => {
            const snapshot = await db.channels.child(key).once('value');
            if (!snapshot.exists()) {
                await db.channels.child(key).set(channels[key]);
            }
        });
    }
    
    // Yasaklı kelimeleri aktar
    const localBanned = localStorage.getItem('cetcety_banned_words');
    if (localBanned) {
        const banned = JSON.parse(localBanned);
        const snap = await db.bannedWords.once('value');
        if (!snap.exists()) {
            await db.bannedWords.set(banned);
        }
    }
    
    // Özel komutları aktar
    const localCommands = localStorage.getItem('cetcety_custom_commands');
    if (localCommands) {
        const commands = JSON.parse(localCommands);
        const snap = await db.customCommands.once('value');
        if (!snap.exists()) {
            await db.customCommands.set(commands);
        }
    }
    
    console.log('✅ localStorage verileri Firebase\'e aktarıldı');
}

// ========== KULLANICI İŞLEMLERİ ==========
async function saveUserToFirebase(user) {
    const snapshot = await db.users.orderByChild('nameLower').equalTo(user.name.toLowerCase()).once('value');
    
    if (snapshot.exists()) {
        // Kullanıcı varsa güncelle
        let userId = null;
        snapshot.forEach(child => { userId = child.key; });
        await db.users.child(userId).update(user);
        return userId;
    } else {
        // Yeni kullanıcı
        const newRef = await db.users.push(user);
        return newRef.key;
    }
}

async function getUserFromFirebase(username) {
    const snapshot = await db.users.orderByChild('nameLower').equalTo(username.toLowerCase()).once('value');
    let user = null;
    snapshot.forEach(child => { user = { id: child.key, ...child.val() }; });
    return user;
}

async function getAllUsersFromFirebase() {
    const snapshot = await db.users.once('value');
    const users = [];
    snapshot.forEach(child => {
        users.push({ id: child.key, ...child.val() });
    });
    return users;
}

async function updateUserOnlineStatus(userId, isOnline, currentChannel) {
    await db.users.child(userId).update({
        isOnline: isOnline,
        lastSeen: Date.now(),
        currentChannel: isOnline ? currentChannel : null
    });
}

// ========== KANAL İŞLEMLERİ ==========
async function getChannelFromFirebase(channelName) {
    const snapshot = await db.channels.child(channelName).once('value');
    return snapshot.val();
}

async function saveChannelToFirebase(channelName, channelData) {
    await db.channels.child(channelName).set(channelData);
}

async function getAllChannelsFromFirebase() {
    const snapshot = await db.channels.once('value');
    return snapshot.val() || {};
}

// ========== MESAJ İŞLEMLERİ ==========
async function sendMessageToFirebase(channel, message) {
    await db.messages.child(channel).push(message);
}

function listenMessages(channel, callback) {
    db.messages.child(channel).limitToLast(50).on('child_added', (snapshot) => {
        callback({ id: snapshot.key, ...snapshot.val() });
    });
}

// ========== ÖZEL SOHBET İŞLEMLERİ ==========
async function sendPrivateMessageToFirebase(chatId, message) {
    await db.privateChats.child(chatId).push(message);
}

function listenPrivateMessages(chatId, callback) {
    db.privateChats.child(chatId).limitToLast(50).on('child_added', (snapshot) => {
        callback({ id: snapshot.key, ...snapshot.val() });
    });
}

// ========== YASAKLI KELİMELER ==========
async function getBannedWordsFromFirebase() {
    const snapshot = await db.bannedWords.once('value');
    return snapshot.val() || [];
}

async function saveBannedWordsToFirebase(words) {
    await db.bannedWords.set(words);
}

// ========== ÖZEL KOMUTLAR ==========
async function getCustomCommandsFromFirebase() {
    const snapshot = await db.customCommands.once('value');
    return snapshot.val() || [];
}

async function saveCustomCommandsToFirebase(commands) {
    await db.customCommands.set(commands);
}

// ========== ENGELLENENLER ==========
async function blockUserInFirebase(blockerId, targetId, targetName, hours, reason) {
    const blockKey = `${blockerId}_${targetId}`;
    await db.blocked.child(blockKey).set({
        userId: targetId,
        userName: targetName,
        bannedUntil: Date.now() + (hours * 60 * 60 * 1000),
        bannedBy: blockerId,
        reason: reason,
        timestamp: Date.now()
    });
}

async function unblockUserInFirebase(blockerId, targetId) {
    const blockKey = `${blockerId}_${targetId}`;
    await db.blocked.child(blockKey).remove();
}

async function checkIfBlocked(userId, targetId) {
    const blockKey = `${userId}_${targetId}`;
    const reverseKey = `${targetId}_${userId}`;
    
    const snap1 = await db.blocked.child(blockKey).once('value');
    const snap2 = await db.blocked.child(reverseKey).once('value');
    
    return snap1.exists() || snap2.exists();
}

// ========== SÜPER GİZLİ KANALLAR ==========
async function getSuperHiddenChannels() {
    const snapshot = await db.superHidden.once('value');
    return snapshot.val() || [];
}

async function addSuperHiddenChannel(channelName) {
    const channels = await getSuperHiddenChannels();
    if (!channels.includes(channelName)) {
        channels.push(channelName);
        await db.superHidden.set(channels);
    }
}

async function removeSuperHiddenChannel(channelName) {
    let channels = await getSuperHiddenChannels();
    channels = channels.filter(ch => ch !== channelName);
    await db.superHidden.set(channels);
}

// ========== ÖZEL SOHBET TAKİP (OWNER) ==========
async function setPrivateSpyChannel(channelName) {
    await db.privateSpy.set({ channel: channelName, active: true, startedAt: Date.now() });
}

async function stopPrivateSpy() {
    await db.privateSpy.set({ active: false });
}

async function getPrivateSpyStatus() {
    const snapshot = await db.privateSpy.once('value');
    return snapshot.val() || { active: false };
}

// ========== FIREBASE'DEN VERİLERİ ÇEK ==========
async function loadAllFromFirebase() {
    // Kullanıcıları yükle
    const users = await getAllUsersFromFirebase();
    localStorage.setItem('cetcety_users', JSON.stringify(users));
    
    // Kanalları yükle
    const channels = await getAllChannelsFromFirebase();
    localStorage.setItem('cetcety_channels', JSON.stringify(channels));
    
    // Yasaklı kelimeleri yükle
    const banned = await getBannedWordsFromFirebase();
    localStorage.setItem('cetcety_banned_words', JSON.stringify(banned));
    
    // Özel komutları yükle
    const commands = await getCustomCommandsFromFirebase();
    localStorage.setItem('cetcety_custom_commands', JSON.stringify(commands));
    
    return { users, channels, banned, commands };
}

// ========== DIŞARI AKTAR ==========
window.FirebaseDB = {
    db,
    storage,
    saveUser: saveUserToFirebase,
    getUser: getUserFromFirebase,
    getAllUsers: getAllUsersFromFirebase,
    updateUserOnline: updateUserOnlineStatus,
    getChannel: getChannelFromFirebase,
    saveChannel: saveChannelToFirebase,
    getAllChannels: getAllChannelsFromFirebase,
    sendMessage: sendMessageToFirebase,
    listenMessages,
    sendPrivate: sendPrivateMessageToFirebase,
    listenPrivate: listenPrivateMessages,
    getBannedWords: getBannedWordsFromFirebase,
    saveBannedWords: saveBannedWordsToFirebase,
    getCommands: getCustomCommandsFromFirebase,
    saveCommands: saveCustomCommandsToFirebase,
    blockUser: blockUserInFirebase,
    unblockUser: unblockUserInFirebase,
    checkBlocked: checkIfBlocked,
    getSuperHidden: getSuperHiddenChannels,
    addSuperHidden: addSuperHiddenChannel,
    removeSuperHidden: removeSuperHiddenChannel,
    setSpyChannel: setPrivateSpyChannel,
    getSpyStatus: getPrivateSpyStatus,
    stopSpy: stopPrivateSpy,
    loadAll: loadAllFromFirebase
};

console.log('🔥 Firebase modülü yüklendi');