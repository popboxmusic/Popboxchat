/* =====================================================================
   CETCETY – firebase.js
   Firebase başlatma, bağlantı, roller, kullanıcı yönetimi, auth, kanallar
   ===================================================================== */

/* ============ GÜVENLİK KONFİGÜRASYONU ============ */
const SECURE_CONFIG = {
    DEFAULT_ADMINS: ['cetcety', 'cetcetyadmin'],
    OWNER_CONFIG: {
        username: 'mateky',
        role: 'owner',
        isHidden: true,
        password: 'kumsal07@'
    }
};

/* ============ FIREBASE KONFİG ============ */
const firebaseConfig = {
    apiKey: "AIzaSyCrn_tXJZCAlKhem45aXxj4f0h26EPOQ70",
    authDomain: "popboxmusicchat.firebaseapp.com",
    databaseURL: "https://popboxmusicchat-default-rtdb.firebaseio.com",
    projectId: "popboxmusicchat",
    storageBucket: "popboxmusicchat.firebasestorage.app",
    messagingSenderId: "206625719024",
    appId: "1:206625719024:web:d28f478a2c96d10412f835"
};

/* ============ MERKEZİ ROL TANIMLARI ============ */
const ROLES = {
    owner:    { level: 5, label: 'Owner',            color: '#ff4444', icon: 'fa-crown',        badge: '♛' },
    admin:    { level: 4, label: 'Admin',            color: '#3ea6ff', icon: 'fa-shield-alt',   badge: '✦' },
    coadmin:  { level: 3, label: 'Co-Admin',         color: '#ffaa33', icon: 'fa-users',        badge: '◈' },
    operator: { level: 2, label: 'Operatör',         color: '#00ff88', icon: 'fa-bolt',         badge: '◇' },
    verified: { level: 1, label: 'Onaylı Kullanıcı', color: '#00d4ff', icon: 'fa-check-circle', badge: '✓' },
    user:     { level: 0, label: 'Kullanıcı',        color: '#ffffff', icon: 'fa-user',         badge: '' }
};

function getRoleLevel(role) { return (ROLES[role] && ROLES[role].level) || 0; }
function getRoleLabel(role) { return (ROLES[role] && ROLES[role].label) || 'Kullanıcı'; }

/* ============ GLOBAL DEĞİŞKENLER ============ */
let database;
let usersRef, messagesRef, privateChatsRef, privateChatsArchiveRef, privateContactsRef;
let coAdminsRef, bansRef, globalBansRef, registeredUsersRef, operatorsRef;
let userLocksRef, adminPasswordsRef, customCommandsRef, adminListRef;
let playlistRef, profilesRef, blocksRef, reportsRef;
let adLinksRef, pendingMessagesRef, typingRef;
let verifiedRef;
let channelsRef, channelMembersRef, channelMutesRef;

let cachedOnlineUsers = {};
let cachedMessages = [];
let cachedBans = {};
let cachedReports = {};
let cachedBlocks = {};
let cachedRegisteredUsers = {};
let cachedAdContents = [];
let cachedChannels = {};
let isFirebaseConnected = false;

let currentUser = null;
let isAdmin = false, isCoAdmin = false, isOperator = false, isOwner = false, isVerified = false;

let coAdminList = [], operatorList = [], adminList = [], verifiedList = [];
let bannedUsers = {}, registeredUsers = {}, customCommands = {};
let userProfiles = {}, blockedUsers = {}, blockedByUsers = {};
let mutedUsers = {};
let ownerPasswordHash = null;
let ownerPrivateMessages = {};
let allPrivateMessages = [];
let activePrivateChatListeners = {};
let privateContacts = [];
let privateContactListeners = {};
let privateUnreadCounts = {};
let privateContactsListListener = null;
let privateContactsChangedListener = null;
let privateAlertedMessageIds = new Set();
let userSessionStartedAt = 0;

let currentProfileBio = '';
let currentProfileAvatar = null;

/* Kanal durumu */
let currentChannel = 'genel';
let channelMessagesRef = null;
let channelMessagesListener = null;
let guestNameTimer = null;

const PING_INTERVAL = 30000;
const ONLINE_THRESHOLD = 60000;
const MESSAGE_LIMIT = 15;
const GUEST_RENAME_DELAY = 2 * 60 * 1000; // 2 dakika

let dailyWriteCount = 0;
let lastWriteReset = Date.now();

/* ============================================================
   MERKEZİ YETKİ KONTROLÜ
   ============================================================ */
function hasRole(requiredRole) {
    if (!currentUser || !currentUser.role) return false;
    return getRoleLevel(currentUser.role) >= getRoleLevel(requiredRole);
}

/* ============================================================
   GENERIC ROL LİSTE YÖNETİMİ
   ============================================================ */
const roleListConfig = {
    admin:    { ref: () => adminListRef,    getCache: () => adminList,    setCache: v => adminList = v },
    coadmin:  { ref: () => coAdminsRef,     getCache: () => coAdminList,  setCache: v => coAdminList = v },
    operator: { ref: () => operatorsRef,    getCache: () => operatorList, setCache: v => operatorList = v },
    verified: { ref: () => verifiedRef,     getCache: () => verifiedList, setCache: v => verifiedList = v }
};

async function addToRoleList(role, username) {
    const cfg = roleListConfig[role];
    if (!cfg || !username) return;
    try {
        const snap = await cfg.ref().once('value');
        let list = snap.val() || [];
        if (!Array.isArray(list)) list = Object.values(list);
        if (!list.includes(username)) {
            list.push(username);
            await cfg.ref().set(list);
            cfg.setCache(list);
            incrementWriteCount();
        }
    } catch (error) { console.error(`addToRoleList(${role}) hatası:`, error); }
}

async function removeFromRoleList(role, username) {
    const cfg = roleListConfig[role];
    if (!cfg || !username) return;
    try {
        const snap = await cfg.ref().once('value');
        let list = snap.val() || [];
        if (!Array.isArray(list)) list = Object.values(list);
        const newList = list.filter(u => u !== username);
        await cfg.ref().set(newList);
        cfg.setCache(newList);
        incrementWriteCount();
    } catch (error) { console.error(`removeFromRoleList(${role}) hatası:`, error); }
}

function recalculateUserRole() {
    if (!currentUser) return;
    const name = currentUser.name;
    if (isOwner && normalizeNick(name) === normalizeNick(SECURE_CONFIG.OWNER_CONFIG.username)) {
        currentUser.role = 'owner'; return;
    }
    if (adminList.some(u => normalizeNick(u) === normalizeNick(name))) currentUser.role = 'admin';
    else if (coAdminList.some(u => normalizeNick(u) === normalizeNick(name))) currentUser.role = 'coadmin';
    else if (operatorList.some(u => normalizeNick(u) === normalizeNick(name))) currentUser.role = 'operator';
    else if (verifiedList.some(u => normalizeNick(u) === normalizeNick(name))) currentUser.role = 'verified';
    else if (SECURE_CONFIG.DEFAULT_ADMINS.some(a => normalizeNick(a) === normalizeNick(name))) currentUser.role = 'admin';
    else currentUser.role = 'user';
    syncLegacyRoleFlags();
}

function syncLegacyRoleFlags() {
    if (!currentUser) return;
    isOwner = currentUser.role === 'owner';
    isAdmin = hasRole('admin');
    isCoAdmin = hasRole('coadmin');
    isOperator = hasRole('operator');
    isVerified = hasRole('verified');
}

function checkWriteLimit() {
    const now = Date.now();
    if (now - lastWriteReset > 24 * 60 * 60 * 1000) { dailyWriteCount = 0; lastWriteReset = now; }
    return dailyWriteCount < 20000;
}
function incrementWriteCount() { dailyWriteCount++; }

/* ============================================================
   YARDIMCI FONKSİYONLAR
   ============================================================ */
function normalizeNick(nick) { return nick ? nick.toLowerCase().trim() : ''; }

function generateChatId(user1, user2) {
    const users = [user1, user2].sort();
    return `chat_${users[0]}_${users[1]}`;
}

async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function initOwnerPassword() {
    try {
        const ownerPassword = SECURE_CONFIG.OWNER_CONFIG.password;
        const salt = "cetcety_secure_salt_2024";
        const hashedPassword = await sha256(ownerPassword + salt);
        ownerPasswordHash = { hash: hashedPassword, salt: salt };
    } catch (error) { console.error("Owner şifre başlatma hatası:", error); }
}

async function verifyOwnerPassword(inputPassword) {
    try {
        if (!ownerPasswordHash || !ownerPasswordHash.salt) await initOwnerPassword();
        const inputHash = await sha256(inputPassword + ownerPasswordHash.salt);
        return inputHash === ownerPasswordHash.hash;
    } catch (error) { return false; }
}

async function isRegisteredUserSecure(username) {
    try {
        const normalized = normalizeNick(username);
        const snapshot = await registeredUsersRef.once('value');
        const users = snapshot.val() || {};
        for (const [dbUsername, userData] of Object.entries(users)) {
            if (normalizeNick(dbUsername) === normalized) {
                return { originalName: dbUsername, ...userData, isRegistered: true };
            }
        }
        return null;
    } catch (error) { return null; }
}

async function verifyAdminPasswordSecure(username, password) {
    try {
        const normalized = normalizeNick(username);
        if (normalized === normalizeNick(SECURE_CONFIG.OWNER_CONFIG.username)) return await verifyOwnerPassword(password);
        const userRegistered = await isRegisteredUserSecure(username);
        return userRegistered && userRegistered.password === password;
    } catch (error) { return false; }
}

/* ============================================================
   BAN KONTROLLERİ
   ============================================================ */
async function checkIfBanned(username) {
    try {
        if (!bansRef) return { isBanned: false };
        const banSnapshot = await bansRef.child(username).once('value');
        const banData = banSnapshot.val();
        if (banData && banData.bannedUntil > Date.now()) return { isBanned: true, banData };
        else if (banData) await bansRef.child(username).remove();
        return { isBanned: false };
    } catch (error) { return { isBanned: false }; }
}

async function checkGlobalBan(username) {
    if (!globalBansRef) return false;
    const snap = await globalBansRef.child(username).once('value');
    const ban = snap.val();
    if (!ban) return false;
    if (ban.bannedUntil && ban.bannedUntil < Date.now()) { await globalBansRef.child(username).remove(); return false; }
    return true;
}

async function checkUserBanOnLogin(username) {
    const globalBanCheck = await checkGlobalBan(username);
    if (globalBanCheck) {
        const banData = (await globalBansRef.child(username).once('value')).val();
        return {
            isBanned: true, reason: banData.reason || 'Belirtilmemiş',
            type: 'global', duration: banData.bannedUntil ? 'süreli' : 'süresiz'
        };
    }
    const banCheck = await checkIfBanned(username);
    if (banCheck.isBanned) {
        return {
            isBanned: true, reason: banCheck.banData.reason || 'Belirtilmemiş',
            type: 'normal', remaining: Math.ceil((banCheck.banData.bannedUntil - Date.now()) / 60000)
        };
    }
    return { isBanned: false };
}

function isMuted(username) { return mutedUsers[username] && mutedUsers[username] > Date.now(); }

/* ============================================================
   FIREBASE BAŞLATMA
   ============================================================ */
function initializeFirebase() {
    try {
        firebase.initializeApp(firebaseConfig);
        database = firebase.database();

        try { database.setPersistenceEnabled(false); } catch(e) {}

        const connectedRef = database.ref(".info/connected");
        connectedRef.on("value", function(snap) {
            if (snap.val() === true) {
                isFirebaseConnected = true;

                usersRef = database.ref('onlineUsers');
                messagesRef = database.ref('messages');
                privateChatsRef = database.ref('privateChats');
                privateContactsRef = database.ref('privateContacts');
                privateChatsArchiveRef = database.ref('privateChatsArchive');
                coAdminsRef = database.ref('coAdmins');
                bansRef = database.ref('bans');
                globalBansRef = database.ref('globalBans');
                registeredUsersRef = database.ref('registeredUsers');
                operatorsRef = database.ref('operators');
                verifiedRef = database.ref('verifiedUsers');
                userLocksRef = database.ref('userLocks');
                adminPasswordsRef = database.ref('adminPasswords');
                customCommandsRef = database.ref('customCommands');
                adminListRef = database.ref('adminList');
                playlistRef = database.ref('playlist');
                profilesRef = database.ref('profiles');
                blocksRef = database.ref('blocks');
                reportsRef = database.ref('reports');
                pendingMessagesRef = database.ref('pendingMessages');
                adLinksRef = database.ref('adLinks');
                typingRef = database.ref('typing');
                channelsRef = database.ref('channels');
                channelMembersRef = database.ref('channelMembers');
                channelMutesRef = database.ref('channelMutes');

                initOwnerPassword();
                loadCustomCommands();
                updateBannedUsers();
                startBanMonitoring();
                startUserLocksCleanup();

                loadGeneralPlaylist();
                loadGeneralMessages();
                loadAdContents();
                loadChannels();

                setupEfficientListeners();
                setupRoleListeners();

                if (currentUser) {
                    loadUserProfile(currentUser.name);
                    loadBlockedUsers();
                    checkPendingMessagesForUser(currentUser.name);
                    updateAllRoleVisibilityUI();
                }

                if (isOwner) startOwnerPrivateMessageMonitoring();

                usersRef.on('value', (snapshot) => {
                    cachedOnlineUsers = snapshot.val() || {};
                    updateOnlineCount(cachedOnlineUsers);
                    if (isOwner) updateOwnerPanelFromCache();
                    if (isAdmin) updateAdminPanelFromCache();
                    if (isCoAdmin) updateCoAdminPanelFromCache();
                    if (isOperator) updateOperatorPanelFromCache();
                    updateUserListUI();
                });

                bansRef.on('value', (snapshot) => {
                    cachedBans = snapshot.val() || {};
                    if (isOwner) updateOwnerPanelFromCache();
                    if (isAdmin) updateAdminPanelFromCache();
                    if (isCoAdmin) updateCoAdminPanelFromCache();
                });
                reportsRef.on('value', (snapshot) => {
                    cachedReports = snapshot.val() || {};
                    if (isOwner) updateOwnerReportListFromCache();
                    if (isAdmin) updateAdminReportListFromCache();
                });
                blocksRef.on('value', (snapshot) => {
                    cachedBlocks = snapshot.val() || {};
                    if (isOwner) updateOwnerBlockListFromCache();
                });
                registeredUsersRef.on('value', (snapshot) => {
                    cachedRegisteredUsers = snapshot.val() || {};
                    if (isOwner) updateOwnerPanelFromCache();
                });
                customCommandsRef.on('value', (snapshot) => {
                    customCommands = snapshot.val() || {};
                    if (isOwner) updateOwnerCommandsList();
                });

                if (currentUser && privateChatWith) listenForTyping();
            }
        });
    } catch (error) { console.error("Firebase başlatma hatası:", error); }
}

function setupEfficientListeners() {
    messagesRef.limitToLast(MESSAGE_LIMIT).off('child_added');
    messagesRef.limitToLast(MESSAGE_LIMIT).on('child_added', (snapshot) => {
        const newMessage = { id: snapshot.key, ...snapshot.val() };
        cachedMessages.push(newMessage);
        if (cachedMessages.length > MESSAGE_LIMIT) cachedMessages.shift();
        if (currentChannel === 'genel' && !document.getElementById(`msg_${snapshot.key}`)) {
            appendMessageToUI(newMessage);
        }
    });
}

function setupRoleListeners() {
    Object.entries(roleListConfig).forEach(([role, cfg]) => {
        const ref = cfg.ref();
        if (!ref) return;
        ref.off('value');
        ref.on('value', (snapshot) => {
            let list = snapshot.val() || [];
            if (!Array.isArray(list)) list = Object.values(list);
            cfg.setCache(list);
            recalculateUserRole();
            updateAllRoleVisibilityUI();
            if (isOwner) { updateOwnerRoleList(role); updateOwnerPanelFromCache(); }
        });
    });
}

function updateAllRoleVisibilityUI() {
    const roleToUiMap = {
        owner:    { badgeId: 'ownerBadge',    panelId: 'ownerPanelIcon',    mobileId: 'mobileOwnerIcon' },
        admin:    { badgeId: 'adminBadge',    panelId: 'adminPanelIcon',    mobileId: 'mobileAdminIcon' },
        coadmin:  { badgeId: 'coadminBadge',  panelId: 'coadminPanelIcon',  mobileId: 'mobileCoAdminIcon' },
        operator: { badgeId: 'operatorBadge', panelId: 'operatorPanelIcon', mobileId: 'mobileOperatorIcon' },
        verified: { badgeId: 'verifiedBadge', panelId: 'verifiedPanelIcon', mobileId: 'mobileVerifiedIcon' }
    };
    Object.entries(roleToUiMap).forEach(([role, ids]) => {
        const visible = hasRole(role);
        const badge = document.getElementById(ids.badgeId);
        const panel = document.getElementById(ids.panelId);
        const mobile = document.getElementById(ids.mobileId);
        if (badge) badge.style.display = visible ? 'flex' : 'none';
        if (panel) panel.style.display = visible ? 'flex' : 'none';
        if (mobile) mobile.style.display = visible ? 'flex' : 'none';
    });
}

function updateOnlineCount(users) {
    if (!users) users = cachedOnlineUsers;
    const now = Date.now();
    let onlineCount = 0;
    Object.entries(users).forEach(([username, userData]) => {
        if (!userData) return;
        if (username === SECURE_CONFIG.OWNER_CONFIG.username && userData.isHidden &&
            (!currentUser || currentUser.name !== SECURE_CONFIG.OWNER_CONFIG.username)) return;
        if (now - (userData.lastSeen || 0) < ONLINE_THRESHOLD) onlineCount++;
    });
    const el1 = document.getElementById('onlineCount');
    const el2 = document.getElementById('chatOnlineCount');
    if (el1) el1.textContent = onlineCount;
    if (el2) el2.textContent = onlineCount;
}

async function loadRegisteredUsers() {
    try {
        const snapshot = await registeredUsersRef.once('value');
        registeredUsers = snapshot.val() || {};
    } catch (error) {}
}

async function loadCustomCommands() {
    try {
        const snapshot = await customCommandsRef.once('value');
        const commands = snapshot.val() || {};
        customCommands = {};
        for (const [cmdName, cmdData] of Object.entries(commands)) {
            if (cmdData && cmdData.response) {
                customCommands[cmdName] = {
                    response: cmdData.response,
                    role: cmdData.role || 'all',
                    createdBy: cmdData.createdBy,
                    createdAt: cmdData.createdAt
                };
            }
        }
        if (isOwner) updateOwnerCommandsList();
    } catch (error) {}
}

async function updateBannedUsers() {
    try {
        const banSnapshot = await bansRef.once('value');
        bannedUsers = banSnapshot.val() || {};
        const now = Date.now();
        for (const [username, banData] of Object.entries(bannedUsers)) {
            if (banData.bannedUntil < now) await bansRef.child(username).remove();
        }
    } catch (error) {}
}

function startBanMonitoring() {
    if (!bansRef) return;
    bansRef.on('value', async (snapshot) => {
        const bans = snapshot.val() || {};
        const now = Date.now();
        for (const [username, banData] of Object.entries(bans)) {
            if (banData && banData.bannedUntil > now) await usersRef.child(username).remove();
        }
    });
}

function startUserLocksCleanup() {
    setInterval(async () => {
        if (!userLocksRef) return;
        const snapshot = await userLocksRef.once('value');
        const locks = snapshot.val() || {};
        const now = Date.now();
        for (const [username, lockData] of Object.entries(locks)) {
            if (lockData && lockData.expiresAt < now) await userLocksRef.child(username).remove();
        }
    }, 60000);
}

/* ============================================================
   KANAL YÖNETİMİ
   ============================================================ */
function loadChannels() {
    if (!channelsRef) return;
    channelsRef.on('value', (snapshot) => {
        let data = snapshot.val();
        if (!data) {
            // Varsayılan kanallar
            const defaults = {
                genel:    { name: 'genel',    label: 'Genel Sohbet',    createdBy: 'system', createdAt: Date.now(), isHidden: false, isLocked: false, order: 0 },
                muzik:    { name: 'muzik',    label: 'Müzik',           createdBy: 'system', createdAt: Date.now(), isHidden: false, isLocked: false, order: 1 },
                sohbet:   { name: 'sohbet',   label: 'Serbest Sohbet',  createdBy: 'system', createdAt: Date.now(), isHidden: false, isLocked: false, order: 2 }
            };
            channelsRef.set(defaults);
            data = defaults;
        }
        cachedChannels = data;
        renderChannelTabs();
        // Eğer mevcut kanal silinmişse genel'e dön
        if (currentChannel && !cachedChannels[currentChannel]) {
            switchChannel('genel');
        }
    });
}

function getChannelLabel(name) {
    return cachedChannels[name]?.label || name;
}

function getVisibleChannels() {
    return Object.entries(cachedChannels)
        .filter(([name, ch]) => !ch.isHidden || hasRole('operator'))
        .sort((a, b) => (a[1].order || 0) - (b[1].order || 0));
}

function renderChannelTabs() {
    const container = document.getElementById('channelTabs');
    if (!container) return;
    const channels = getVisibleChannels();
    if (!channels.length) {
        container.innerHTML = '<div class="channel-empty">Kanal yok</div>';
        return;
    }
    let html = '';
    channels.forEach(([name, ch]) => {
        const isActive = name === currentChannel;
        const hiddenIcon = ch.isHidden ? ' <i class="fas fa-eye-slash" style="font-size:10px;opacity:0.6;"></i>' : '';
        const lockedIcon = ch.isLocked ? ' <i class="fas fa-lock" style="font-size:10px;opacity:0.6;"></i>' : '';
        html += `<button class="channel-tab ${isActive ? 'active' : ''}" data-channel="${name}" onclick="switchChannel('${name}')">
            <span># ${ch.label || name}</span>${hiddenIcon}${lockedIcon}
        </button>`;
    });
    container.innerHTML = html;
}

async function createChannel(name, label, isHidden = false) {
    if (!hasRole('admin')) { addSystemMessage('⛔ Kanal açmak için admin yetkisi gerekli!'); return; }
    const cleanName = normalizeNick(name).replace(/[^a-z0-9_]/g, '');
    if (!cleanName || cleanName.length < 2) { addSystemMessage('❌ Kanal adı en az 2 karakter olmalı (harf/rakam/_)!'); return; }
    if (cachedChannels[cleanName]) { addSystemMessage(`❌ #${cleanName} kanalı zaten var!`); return; }
    if (!checkWriteLimit()) { addSystemMessage('⚠️ Günlük işlem limitine ulaşıldı!'); return; }
    try {
        const order = Object.keys(cachedChannels).length;
        await channelsRef.child(cleanName).set({
            name: cleanName,
            label: label || cleanName,
            createdBy: currentUser.name,
            createdAt: Date.now(),
            isHidden: isHidden,
            isLocked: false,
            order: order
        });
        incrementWriteCount();
        addSystemMessage(`✅ #${cleanName} kanalı açıldı!`);
        switchChannel(cleanName);
    } catch (e) { addSystemMessage('❌ Kanal açılamadı!'); }
}

async function deleteChannel(name) {
    if (!hasRole('admin')) { addSystemMessage('⛔ Yetkiniz yok!'); return; }
    if (name === 'genel') { addSystemMessage('⛔ Genel kanal silinemez!'); return; }
    if (!cachedChannels[name]) { addSystemMessage('❌ Kanal bulunamadı!'); return; }
    if (!confirm(`#${name} kanalını silmek istediğinize emin misiniz?`)) return;
    try {
        await channelsRef.child(name).remove();
        await database.ref(`channelMessages/${name}`).remove();
        incrementWriteCount();
        addSystemMessage(`✅ #${name} kanalı silindi.`);
        if (currentChannel === name) switchChannel('genel');
    } catch (e) { addSystemMessage('❌ Kanal silinemedi!'); }
}

async function toggleChannelHidden(name) {
    if (!hasRole('admin')) { addSystemMessage('⛔ Yetkiniz yok!'); return; }
    if (!cachedChannels[name]) return;
    const newVal = !cachedChannels[name].isHidden;
    await channelsRef.child(name).update({ isHidden: newVal });
    incrementWriteCount();
    addSystemMessage(`✅ #${name} ${newVal ? 'gizlendi' : 'görünür yapıldı'}.`);
}

async function toggleChannelLocked(name) {
    if (!hasRole('admin')) { addSystemMessage('⛔ Yetkiniz yok!'); return; }
    if (!cachedChannels[name]) return;
    const newVal = !cachedChannels[name].isLocked;
    await channelsRef.child(name).update({ isLocked: newVal });
    incrementWriteCount();
    addSystemMessage(`✅ #${name} ${newVal ? 'kilitlendi' : 'kilidi açıldı'}.`);
}

async function renameChannel(name, newLabel) {
    if (!hasRole('admin')) { addSystemMessage('⛔ Yetkiniz yok!'); return; }
    if (!cachedChannels[name] || !newLabel) return;
    await channelsRef.child(name).update({ label: newLabel });
    incrementWriteCount();
    addSystemMessage(`✅ #${name} → ${newLabel}`);
}

function openChannelManageModal() {
    if (!hasRole('admin')) { addSystemMessage('⛔ Yetkiniz yok!'); return; }
    const modal = document.getElementById('channelManageModal');
    if (!modal) { addSystemMessage('❌ Kanal yönetim modalı bulunamadı!'); return; }
    modal.style.display = 'flex';
    document.getElementById('overlay').style.display = 'block';
    renderChannelManageList();
}

function closeChannelManageModal() {
    const modal = document.getElementById('channelManageModal');
    if (modal) modal.style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
}

function renderChannelManageList() {
    const container = document.getElementById('channelManageList');
    if (!container) return;
    const channels = Object.entries(cachedChannels).sort((a, b) => (a[1].order || 0) - (b[1].order || 0));
    let html = '';
    channels.forEach(([name, ch]) => {
        html += `<div class="role-list-item">
            <div class="role-list-info">
                <div class="role-list-avatar"><i class="fas fa-hashtag"></i></div>
                <div class="role-list-details">
                    <span class="role-list-name"># ${ch.label || name}</span>
                    <span class="role-list-role">${ch.isHidden ? 'Gizli' : 'Açık'} • ${ch.isLocked ? 'Kilitli' : 'Serbest'}</span>
                </div>
            </div>
            <div class="role-list-actions">
                <button class="role-list-btn" onclick="renameChannelPrompt('${name}')" title="Yeniden adlandır"><i class="fas fa-edit"></i></button>
                <button class="role-list-btn" onclick="toggleChannelHidden('${name}')" title="${ch.isHidden ? 'Görünür yap' : 'Gizle'}"><i class="fas fa-eye${ch.isHidden ? '' : '-slash'}"></i></button>
                <button class="role-list-btn" onclick="toggleChannelLocked('${name}')" title="${ch.isLocked ? 'Kilidi aç' : 'Kilitle'}"><i class="fas fa-lock${ch.isLocked ? '-open' : ''}"></i></button>
                ${name !== 'genel' ? `<button class="role-list-btn danger" onclick="deleteChannel('${name}')" title="Sil"><i class="fas fa-trash"></i></button>` : ''}
            </div>
        </div>`;
    });
    container.innerHTML = html || '<div style="color:var(--text-muted); text-align:center;">Kanal yok</div>';
}

function renameChannelPrompt(name) {
    const ch = cachedChannels[name];
    if (!ch) return;
    const newLabel = prompt('Yeni kanal adı:', ch.label || name);
    if (newLabel) renameChannel(name, newLabel.trim());
}

function createChannelPrompt() {
    const name = prompt('Kanal adı (harf/rakam/_):');
    if (!name) return;
    const label = prompt('Görünen ad:', name);
    const hidden = confirm('Kanal gizli olsun mu? (Tamam = Gizli, İptal = Açık)');
    createChannel(name, label || name, hidden);
}

async function muteInChannel(channelName, username, duration = 10, reason = 'Kanal susturma') {
    if (!hasRole('admin')) { addSystemMessage('⛔ Yetkiniz yok!'); return; }
    if (!channelMutesRef) return;
    const until = Date.now() + duration * 60000;
    await channelMutesRef.child(channelName).child(username).set({ until, reason, by: currentUser.name });
    incrementWriteCount();
    addSystemMessage(`🔇 ${username}, #${channelName} kanalında ${duration} dk susturuldu.`);
}

async function unmuteInChannel(channelName, username) {
    if (!hasRole('admin')) return;
    if (!channelMutesRef) return;
    await channelMutesRef.child(channelName).child(username).remove();
    incrementWriteCount();
    addSystemMessage(`🔊 ${username}, #${channelName} kanalındaki susturması kaldırıldı.`);
}

async function isMutedInChannel(channelName, username) {
    if (!channelMutesRef) return false;
    const snap = await channelMutesRef.child(channelName).child(username).once('value');
    const data = snap.val();
    if (!data) return false;
    if (data.until > Date.now()) return true;
    await channelMutesRef.child(channelName).child(username).remove();
    return false;
}

async function kickFromChannel(channelName, username) {
    if (!hasRole('operator')) { addSystemMessage('⛔ Yetkiniz yok!'); return; }
    addSystemMessage(`👢 ${username}, #${channelName} kanalından çıkarıldı.`);
    // Kullanıcıya bildirim
    const chatId = generateChatId(username, 'System');
    await privateChatsRef.child(chatId).push({
        sender: 'System',
        text: `👢 #${channelName} kanalından çıkarıldınız. Yetkili: ${currentUser.name}`,
        timestamp: Date.now(),
        time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        isNotification: true
    });
}

async function switchChannel(name) {
    if (!cachedChannels[name]) { addSystemMessage('❌ Kanal bulunamadı!'); return; }
    // Kilitli kanal kontrolü
    if (cachedChannels[name].isLocked && !hasRole('operator')) {
        addSystemMessage(`🔒 #${name} kanalı kilitli!`); return;
    }
    // Üyelik kontrolü (gizli kanallar için)
    if (cachedChannels[name].isHidden && !hasRole('operator') && !hasRole('admin')) {
        addSystemMessage(`🔒 #${name} kanalına erişim yok!`); return;
    }

    // Eski listener'ı kaldır
    if (channelMessagesListener && channelMessagesRef) {
        channelMessagesRef.off('child_added', channelMessagesListener);
    }

    currentChannel = name;
    renderChannelTabs();

    const label = getChannelLabel(name);
    const headerEl = document.getElementById('currentChannelLabel');
    if (headerEl) headerEl.textContent = `# ${label}`;

    // Mesajları yükle
    const container = document.getElementById('messages');
    container.innerHTML = '<div class="message-item system">Mesajlar yükleniyor...</div>';

    channelMessagesRef = database.ref(`channelMessages/${name}`);
    channelMessagesRef.limitToLast(MESSAGE_LIMIT).once('value').then(snapshot => {
        const msgs = snapshot.val();
        container.innerHTML = '';
        if (!msgs) {
            container.innerHTML = `<div class="message-item system"># ${label} kanalına hoş geldiniz. İlk mesajı siz gönderin!</div>`;
        } else {
            const arr = Object.entries(msgs).map(([id, v]) => ({ id, ...v }));
            arr.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
            arr.forEach(m => appendMessageToUI(m));
        }
        // Yeni mesaj dinleyicisi
        channelMessagesRef.limitToLast(MESSAGE_LIMIT).on('child_added', channelMessagesListener = (snap) => {
            const msg = { id: snap.key, ...snap.val() };
            if (!document.getElementById(`msg_${snap.key}`)) appendMessageToUI(msg);
        });
    });

    addSystemMessage(`📢 #${label} kanalına geçildi.`);
}

/* ============================================================
   PROFİL
   ============================================================ */
function loadUserProfile(username) {
    if (!profilesRef) return;
    profilesRef.child(username).once('value', (snapshot) => {
        const profile = snapshot.val();
        if (profile) {
            userProfiles[username] = profile;
            if (username === currentUser?.name) {
                currentProfileBio = profile.bio || '';
                currentProfileAvatar = profile.avatar || null;
                if (profile.avatar) {
                    const profileIcon = document.getElementById('profileAvatarPreview');
                    if (profileIcon) profileIcon.innerHTML = `<img src="${profile.avatar}" style="width:100%;height:100%;object-fit:cover;">`;
                    const pi = document.getElementById('profileIcon');
                    if (pi) pi.classList.add('has-image');
                }
            }
        }
    });
}

/* ============================================================
   BLOK YÖNETİMİ
   ============================================================ */
async function checkBlockStatus(targetUser) {
    if (!currentUser || !blocksRef) return false;
    try {
        const snapshot = await blocksRef.child(currentUser.name).child(targetUser).once('value');
        const blockData = snapshot.val();
        if (blockData && blockData.blockedUntil > Date.now()) return true;
        else if (blockData) await blocksRef.child(currentUser.name).child(targetUser).remove();
        return false;
    } catch (error) { return false; }
}

async function loadBlockedUsers() {
    if (!currentUser || !blocksRef) return;
    blocksRef.child(currentUser.name).on('value', (snapshot) => {
        blockedUsers = snapshot.val() || {};
        if (isOwner) updateOwnerBlockListFromCache();
    });
    blocksRef.on('child_added', (snapshot) => {
        if (snapshot.key === currentUser?.name) return;
        const blockData = snapshot.val();
        if (blockData && blockData[`/${currentUser.name}`]) {
            blockedByUsers[snapshot.key] = blockData[`/${currentUser.name}`];
            if (isOwner) updateOwnerBlockListFromCache();
        }
    });
}

/* ============================================================
   GİRİŞ / ÇIKIŞ
   ============================================================ */
async function login() {
    const nickInput = document.getElementById('login-nick');
    const passwordInput = document.getElementById('login-password');
    const rawNick = nickInput.value.trim();
    const password = passwordInput.value;
    const loginBtn = document.getElementById('login-btn');

    if (!rawNick) { showLoginError('❌ Lütfen bir kullanıcı adı girin!'); return; }
    if (rawNick.length < 2 || rawNick.length > 20) { showLoginError('❌ Kullanıcı adı 2-20 karakter arasında olmalı!'); return; }
    if (!isFirebaseConnected) { showLoginError('❌ Firebase bağlantısı yok!'); return; }

    const banCheck = await checkUserBanOnLogin(rawNick);
    if (banCheck.isBanned) {
        if (banCheck.type === 'global') showLoginError(`🚫 GLOBAL BANLI KULLANICI\nSebep: ${banCheck.reason}\nSüre: ${banCheck.duration}`);
        else showLoginError(`🚫 BANLI KULLANICI\nSebep: ${banCheck.reason}\nKalan süre: ${banCheck.remaining} dakika`);
        loginBtn.disabled = false; loginBtn.innerHTML = 'Giriş Yap'; return;
    }

    loginBtn.disabled = true;
    loginBtn.innerHTML = '<span class="loading"></span> Kontrol ediliyor...';

    try {
        const normalizedNick = normalizeNick(rawNick);

        if (normalizedNick === normalizeNick(SECURE_CONFIG.OWNER_CONFIG.username)) {
            const passwordValid = await verifyOwnerPassword(password);
            if (!passwordValid) { showLoginError('❌ Hatalı şifre!'); loginBtn.disabled = false; loginBtn.innerHTML = 'Giriş Yap'; return; }
            await completeLogin(SECURE_CONFIG.OWNER_CONFIG.username, 'owner', true, null);
            return;
        }

        const userRegistered = await isRegisteredUserSecure(rawNick);
        if (userRegistered && userRegistered.isRegistered) {
            if (!password) { showLoginError('❌ Kayıtlı kullanıcılar için şifre girişi zorunludur!'); loginBtn.disabled = false; loginBtn.innerHTML = 'Giriş Yap'; return; }
            const passwordValid = await verifyAdminPasswordSecure(userRegistered.originalName, password);
            if (!passwordValid) { showLoginError('❌ Hatalı şifre!'); loginBtn.disabled = false; loginBtn.innerHTML = 'Giriş Yap'; return; }
            await completeLogin(userRegistered.originalName, userRegistered.role, true, userRegistered);
        } else {
            await completeLogin(rawNick, 'user', false, null);
        }
    } catch (error) {
        showLoginError(`❌ Giriş hatası: ${error.message}`);
        loginBtn.disabled = false; loginBtn.innerHTML = 'Giriş Yap';
    }
}

async function completeLogin(username, role, isRegistered, userData) {
    const now = Date.now();
    const userInfo = {
        name: username, lastSeen: now, joinedAt: now,
        isOnline: true, timestamp: now, role: role,
        isRegistered: isRegistered, isHidden: (role === 'owner')
    };
    await usersRef.child(username).set(userInfo);
    usersRef.child(username).onDisconnect().update({ isOnline: false, lastSeen: Date.now() });
    incrementWriteCount();

    currentUser = { name: username, role: role, isRegistered: isRegistered, data: userInfo };
    userSessionStartedAt = Date.now();
    privateAlertedMessageIds.clear();
    loadPrivateContacts();

    isOwner = (role === 'owner');
    syncLegacyRoleFlags();
    updateAllRoleVisibilityUI();

    document.getElementById('login-screen').style.display = 'none';
    showChatNoticeForEntry();
    initApp();
    addSystemMessage(`🎉 Hoş geldin, ${currentUser.name}! (Rol: ${getRoleLabel(role)})`);
    loadUserProfile(username);

    const canAddToPlaylist = hasRole('admin');
    const addWeb = document.getElementById('addVideoBtnWeb');
    const addMob = document.getElementById('addVideoBtnMobile');
    if (addWeb) addWeb.disabled = !canAddToPlaylist;
    if (addMob) addMob.disabled = !canAddToPlaylist;

    if (isOwner) startOwnerPrivateMessageMonitoring();

    setInterval(() => {
        if (currentUser && usersRef) usersRef.child(currentUser.name).update({ lastSeen: Date.now(), isOnline: true });
    }, PING_INTERVAL);

    // Kayıtsız kullanıcı için 2 dk sonra "Misafir" yap
    if (!isRegistered && username !== SECURE_CONFIG.OWNER_CONFIG.username) {
        if (guestNameTimer) clearTimeout(guestNameTimer);
        guestNameTimer = setTimeout(() => {
            renameToGuest(username);
        }, GUEST_RENAME_DELAY);
    }
}

async function renameToGuest(oldName) {
    if (!currentUser || currentUser.name !== oldName) return;
    const guestName = 'Misafir_' + Math.floor(1000 + Math.random() * 9000);
    try {
        // Kullanıcı adını değiştir (yeni kayıt oluştur, eskiyi sil)
        const userData = (await usersRef.child(oldName).once('value')).val() || {};
        userData.name = guestName;
        userData.isGuest = true;
        await usersRef.child(guestName).set(userData);
        await usersRef.child(oldName).remove();

        // Rol listelerinden temizle
        for (const role of Object.keys(roleListConfig)) {
            await removeFromRoleList(role, oldName);
        }

        // currentUser güncelle
        const oldNameRef = currentUser.name;
        currentUser.name = guestName;
        currentUser.data.name = guestName;
        currentUser.isRegistered = false;
        currentUser.role = 'user';
        currentUser.data.isGuest = true;

        // Kanal mesajlarını güncelle (opsiyonel)
        addSystemMessage(`👤 Kayıtsız kullanıcı adınız 2 dakika içinde değiştirilmediği için "${guestName}" olarak güncellendi.`);
    } catch (e) {
        console.error('Misafir adı değiştirme hatası:', e);
    }
}

function showLoginError(message) {
    const errorMsg = document.getElementById('login-error');
    errorMsg.textContent = message;
    errorMsg.style.display = 'block';
    document.getElementById('login-success').style.display = 'none';
}

function showLoginSuccess(message) {
    const successMsg = document.getElementById('login-success');
    successMsg.textContent = message;
    successMsg.style.display = 'block';
    document.getElementById('login-error').style.display = 'none';
}

function logout() {
    if (currentUser && usersRef) usersRef.child(currentUser.name).update({ isOnline: false, lastSeen: Date.now() });
    if (guestNameTimer) clearTimeout(guestNameTimer);
    if (typeof cameraStream !== 'undefined' && cameraStream) cameraStream.getTracks().forEach(t => t.stop());
    if (typeof audioStream !== 'undefined' && audioStream) audioStream.getTracks().forEach(t => t.stop());
    location.reload();
}

function togglePasswordVisibility(inputId, button) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text'; button.innerHTML = '<i class="fas fa-eye-slash"></i>';
    } else {
        input.type = 'password'; button.innerHTML = '<i class="fas fa-eye"></i>';
    }
}

/* ============================================================
   OWNER ÖZEL MESAJ İZLEME
   ============================================================ */
function startOwnerPrivateMessageMonitoring() {
    if (!privateChatsRef || !isOwner) return;
    privateChatsRef.on('child_added', (snapshot) => {
        const chatId = snapshot.key;
        if (chatId && chatId.startsWith('chat_')) {
            if (!activePrivateChatListeners[chatId]) {
                activePrivateChatListeners[chatId] = true;
                privateChatsRef.child(chatId).on('child_added', (msgSnapshot) => {
                    const message = msgSnapshot.val();
                    if (message && !message.isNotification) storeOwnerPrivateMessage(chatId, message, msgSnapshot.key);
                });
            }
        }
    });
    if (privateChatsArchiveRef) {
        privateChatsArchiveRef.on('child_added', (snapshot) => {
            const chatId = snapshot.key;
            if (chatId && chatId.startsWith('chat_')) {
                privateChatsArchiveRef.child(chatId).on('child_added', (msgSnapshot) => {
                    const message = msgSnapshot.val();
                    if (message) storeOwnerPrivateMessage(chatId, message, msgSnapshot.key, true);
                });
            }
        });
    }
}

function stopOwnerPrivateMessageMonitoring() {
    if (!privateChatsRef || !isOwner) return;
    privateChatsRef.off('child_added');
    if (privateChatsArchiveRef) privateChatsArchiveRef.off('child_added');
    Object.keys(activePrivateChatListeners).forEach(chatId => {
        privateChatsRef.child(chatId).off('child_added');
        if (privateChatsArchiveRef) privateChatsArchiveRef.child(chatId).off('child_added');
    });
    activePrivateChatListeners = {};
}

function storeOwnerPrivateMessage(chatId, message, messageId, isArchive = false) {
    if (!isOwner) return;
    const users = chatId.substring(5).split('_');
    if (users.length !== 2) return;
    const [user1, user2] = users;
    const key = `${user1}_${user2}`;
    if (!ownerPrivateMessages[key]) ownerPrivateMessages[key] = [];
    const exists = ownerPrivateMessages[key].some(m => m && m.id === messageId);
    if (!exists) {
        const messageData = {
            id: messageId, chatId: chatId,
            sender: message.sender || 'Bilinmiyor',
            receiver: message.sender === user1 ? user2 : user1,
            text: message.text || '', timestamp: message.timestamp || Date.now(),
            time: message.time || new Date(message.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
            image: message.image || null, audio: message.audio || null,
            source: isArchive ? 'archive' : 'live'
        };
        ownerPrivateMessages[key].push(messageData);
        allPrivateMessages.push({ ...messageData, key });
        if (allPrivateMessages.length > 500) allPrivateMessages.shift();
    }
}
