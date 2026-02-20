// ========== FIREBASE KONFİGÜRASYONU ==========
const firebaseConfig = {
    apiKey: "AIzaSyCrn_tXJZCAlKhem45aXxj4f0h26EPOQ70",
    authDomain: "popboxmusicchat.firebaseapp.com",
    databaseURL: "https://popboxmusicchat-default-rtdb.firebaseio.com",
    projectId: "popboxmusicchat",
    storageBucket: "popboxmusicchat.appspot.com",
    messagingSenderId: "206625719024",
    appId: "1:206625719024:web:d28f478a2c96d10412f835"
};

// Firebase başlat
let database = null;
let firebaseListeners = {};

try {
    firebase.initializeApp(firebaseConfig);
    database = firebase.database();
    console.log('🔥 Firebase başlatıldı!');
    if (typeof updateConnectionStatus === 'function') {
        updateConnectionStatus('connected', 'Firebase Aktif');
    }
} catch (error) {
    console.error('❌ Firebase başlatılamadı:', error);
    if (typeof updateConnectionStatus === 'function') {
        updateConnectionStatus('disconnected', 'Yerel Mod');
    }
}
