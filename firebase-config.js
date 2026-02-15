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
try {
    firebase.initializeApp(firebaseConfig);
    const database = firebase.database();
    
    console.log('🔥 Firebase başlatıldı!');
    console.log('✅ Database hazır:', !!database);
    
    // Global yap
    window.database = database;
    window.db = database;
    
    // Test
    database.ref('test').set({ test: 'ok', time: Date.now() })
        .then(() => console.log('✅ Test başarılı'))
        .catch(err => console.error('❌ Test hatası:', err));
        
} catch (error) {
    console.error('❌ Firebase başlatılamadı:', error);
}
