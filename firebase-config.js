// ========== FIREBASE KONFİGÜRASYONU ==========
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

// ========== FIREBASE REFERANSLARI ==========
const db = {
    // Ana referanslar
    root: firebase.database(),
    
    // Kullanıcılar
    users: firebase.database().ref('users'),
    
    // Kanallar
    channels: firebase.database().ref('channels'),
    
    // Mesajlar
    messages: firebase.database().ref('messages'),
    
    // Özel sohbetler
    privateChats: firebase.database().ref('privateChats'),
    
    // Yasaklı kelimeler
    bannedWords: firebase.database().ref('bannedWords'),
    
    // Özel komutlar
    customCommands: firebase.database().ref('customCommands'),
    
    // Engellenenler
    blocked: firebase.database().ref('blocked'),
    
    // Süper gizli kanallar
    superHidden: firebase.database().ref('superHidden'),
    
    // Özel sohbet takip (owner için)
    privateSpy: firebase.database().ref('privateSpy'),
    
    // Bağlantı durumu
    connected: firebase.database().ref('.info/connected')
};

// Storage (resim/video yükleme için)
const storage = firebase.storage();

// ========== YARDIMCI FONKSİYONLAR ==========
function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function normalizeNick(nick) {
    return nick ? nick.toLowerCase().trim() : '';
}

// ========== SHA-256 (owner şifresi için) ==========
async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ========== OWNER ŞİFRE SİSTEMİ (GİZLİ) ==========
const OWNER_PASSWORD = 'Sahi17407@SCM';
let ownerHash = null;

async function initOwnerHash() {
    const salt = 'cetcety_2024';
    ownerHash = await sha256(OWNER_PASSWORD + salt);
}

async function verifyOwner(password) {
    if (!ownerHash) await initOwnerHash();
    const input = await sha256(password + 'cetcety_2024');
    return input === ownerHash;
}

// ========== GLOBAL DEĞİŞKENLER ==========
let currentUser = null;
let currentChannel = 'genel';
let currentPrivateChat = null;
let BANNED_WORDS = [];
let CUSTOM_COMMANDS = [];

// ========== BAĞLANTI DURUMU ==========
db.connected.on('value', (snap) => {
    const statusEl = document.getElementById('connectionStatus');
    const statusText = document.getElementById('statusText');
    
    if (snap.val() === true) {
        statusEl.className = 'connection-status connected';
        statusText.textContent = 'Firebase bağlı';
        if (currentUser) updateOnlineStatus(true);
    } else {
        statusEl.className = 'connection-status disconnected';
        statusText.textContent = 'Bağlantı yok';
    }
});
