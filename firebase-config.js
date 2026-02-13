// ========== FIREBASE KONFİGÜRASYONU ==========
// 🔐 BU DOSYAYI KİMSEYLE PAYLAŞMA!
// 🔐 GITHUB'A YÜKLERKEN GİZLİ TUT!

const FIREBASE_CONFIG = {
    apiKey: "AIzaSyCrn_tXJZCAlKhem45aXxj4f0h26EPOQ70",
    authDomain: "popboxmusicchat.firebaseapp.com",
    databaseURL: "https://popboxmusicchat-default-rtdb.firebaseio.com",
    projectId: "popboxmusicchat",
    storageBucket: "popboxmusicchat.appspot.com",
    messagingSenderId: "206625719024",
    appId: "1:206625719024:web:d28f478a2c96d10412f835"
};

// Firebase başlat
let database;
let storage;

function initFirebase() {
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(FIREBASE_CONFIG);
        }
        database = firebase.database();
        storage = firebase.storage();
        console.log('✅ Firebase başlatıldı!');
        return { database, storage };
    } catch (error) {
        console.error('❌ Firebase hatası:', error);
        return { database: null, storage: null };
    }
}

// Global yap
window.database = database;
window.storage = storage;
window.initFirebase = initFirebase;