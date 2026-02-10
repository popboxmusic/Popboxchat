// firebase-config.js - PROJE BİLGİLERİNLE GÜNCELLE
console.log("🔥 Firebase Config yükleniyor...");

const firebaseConfig = {
    apiKey: "AIzaSyCrn_tXJZCAlKhem45aXjX4f0h26EPOQ70",
    authDomain: "popboxmusicchat.firebaseapp.com",
    databaseURL: "https://popboxmusicchat-default-rtdb.firebaseio.com",
    projectId: "popboxmusicchat",
    storageBucket: "popboxmusicchat.firebasestorage.app",
    messagingSenderId: "206625719024",
    appId: "1:206625719024:web:d28f478a2c96d10412f835",
    measurementId: "G-SB1K22FLEX"
};

// Global erişim için
window.firebaseConfig = firebaseConfig;
console.log("✅ Firebase Config hazır!");
