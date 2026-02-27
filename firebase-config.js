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
    connected: database.ref('.info/connected')
};

// ========== BAĞLANTI DURUMU ==========
db.connected.on('value', (snap) => {
    if (snap.val() === true) {
        console.log('✅ Firebase bağlı');
        if (currentUser) updateOnlineStatus(true);
    }
});

// ========== GLOBAL DEĞİŞKENLER ==========
let currentUser = null;
let currentChannel = 'genel';
let currentPrivateChat = null;
let BANNED_WORDS = [];
let CUSTOM_COMMANDS = [];

// ========== OWNER ŞİFRESİ (GİZLİ) ==========
const OWNER_PASSWORD = 'Sahi17407@SCM';
let ownerHash = null;

async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function initOwner() {
    const salt = 'cetcety_2024';
    ownerHash = await sha256(OWNER_PASSWORD + salt);
}

async function verifyOwner(password) {
    if (!ownerHash) await initOwner();
    const input = await sha256(password + 'cetcety_2024');
    return input === ownerHash;
}
