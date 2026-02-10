// firebase-config.js - SEN BUNU DOLDUR
console.log("🔥 Firebase Config yükleniyor...");

const firebaseConfig = {
    apiKey: "AIzaSyABCDEFGHIJKLMNOPQRSTUVWXYZ123456",
    authDomain: "popbox-elite.firebaseapp.com",
    databaseURL: "https://popbox-elite-default-rtdb.firebaseio.com",
    projectId: "popbox-elite",
    storageBucket: "popbox-elite.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef1234567890",
    measurementId: "G-ABCDEFGHIJ"
};

// Firebase v9 compat kullanımı için
window.firebaseConfig = firebaseConfig;
console.log("✅ Firebase Config hazır!");
