/* =====================================================================
   CETCETY – firebase.js
   Firebase başlatma, bağlantı, roller, kullanıcı yönetimi, auth
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

/* ============ MERKEZİ ROL TANIMLARI (İKONLAR GÜNCELLENDİ) ============ */
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
let verifiedRef, channelsRef;

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

const PING_INTERVAL = 30000;
const ONLINE_THRESHOLD = 60000;
const MESSAGE_LIMIT = 15;
const GUEST_TIMEOUT = 2 * 60 * 1000; // 2 dakika

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

/* ============================================================
   KULLANICI KAYIT KONTROLÜ (case-insensitive)
   ============================================================ */
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
   MİSAFİR NİCK KONTROLÜ (2 DAKİKA)
   ============================================================ */
async function checkGuestNicks() {
    if (!usersRef || !registeredUsersRef || !isFirebaseConnected) return;
    try {
        const usersSnap = await usersRef.once('value');
        const users = usersSnap.val() || {};
        const now = Date.now();

        for (const [username, userData] of Object.entries(users)) {
            if (!userData) continue;
            if (username === SECURE_CONFIG.OWNER_CONFIG.username) continue;
            if (username.startsWith('Misafir_')) continue;

            // Kayıtlı mı?
            const registered = await isRegisteredUserSecure(username);
            if (registered && registered.isRegistered) continue;

            // Kayıtsız ve 2 dakikadan eski mi?
            const joinedAt = userData.joinedAt || userData.timestamp || 0;
            const elapsed = now - joinedAt;

            if (elapsed > GUEST_TIMEOUT && !userData.isGuest) {
                // Misafir olarak işaretle
                const guestSuffix = Math.floor(Math.random() * 9000 + 1000);
                const guestName = `Misafir_${guestSuffix}`;

                await usersRef.child(username).update({
                    isGuest: true,
                    guestSince: now,
                    displayName: guestName
                });

                if (addSystemMessage && typeof addSystemMessage === 'function') {
                    addSystemMessage(`👤 <strong>${username}</strong> kayıtsız olduğu için misafir olarak işaretlendi.`);
                }
            }
        }
    } catch (e) { console.warn('Misafir kontrol hatası:', e); }
}

function startGuestNickMonitoring() {
    setTimeout(() => { checkGuestNicks(); }, 30000);
    setInterval(checkGuestNicks, 30000);
}

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

                initOwnerPassword();
                loadCustomCommands();
                updateBannedUsers();
                startBanMonitoring();
                startUserLocksCleanup();
                startGuestNickMonitoring();

                loadGeneralPlaylist();
                loadGeneralMessages();
                loadAdContents();

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
                channelsRef.on('value', (snapshot) => {
                    cachedChannels = snapshot.val() || {};
                    if (hasRole('admin')) updateChannelList();
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
        if (!document.getElementById(`msg_${snapshot.key}`)) appendMessageToUI(newMessage);
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
                    const pIcon = document.getElementById('profileIcon');
                    if (pIcon) pIcon.classList.add('has-image');
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
        isRegistered: isRegistered, isHidden: (role === 'owner'),
        isGuest: false
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
    const addMobile = document.getElementById('addVideoBtnMobile');
    if (addWeb) addWeb.disabled = !canAddToPlaylist;
    if (addMobile) addMobile.disabled = !canAddToPlaylist;

    if (isOwner) startOwnerPrivateMessageMonitoring();

    setInterval(() => {
        if (currentUser && usersRef) usersRef.child(currentUser.name).update({ lastSeen: Date.now(), isOnline: true });
    }, PING_INTERVAL);
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
