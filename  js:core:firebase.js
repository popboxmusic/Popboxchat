// js/core/firebase.js  
  
// Firebase SDK'ları (modül olarak import ediyoruz)  
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';  
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';  
import { getDatabase, ref, onValue, set, push, remove, update, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js';  
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js';  
  
// Firebase config (önceki mesajda oluşturduğun config dosyasından gelecek)  
import { firebaseConfig } from '../firebase-config.js';   // ← dosya yolunu kendi yapına göre ayarla  
  
// Firebase'i başlat  
const app = initializeApp(firebaseConfig);  
  
// Servisler  
const auth = getAuth(app);  
const db = getDatabase(app);  
const storage = getStorage(app);  
  
// Temel veritabanı referansları (senin istediğin yollar)  
const messagesRef      = ref(db, 'messages');               // genel sohbet mesajları  
const usersRef         = ref(db, 'users');                  // kullanıcı bilgileri (uid bazlı)  
const onlineRef        = ref(db, 'online');                 // online kullanıcılar  
const storiesRef       = ref(db, 'stories');                // hikayeler/story'ler  
const reportsRef       = ref(db, 'reports');                // şikayetler  
const privateMessagesRef = ref(db, 'private-messages');    // özel mesajlar (owner erişimi)  
const commandsRef      = ref(db, 'custom-commands');       // owner'ın eklediği özel komutlar  
const channelsRef      = ref(db, 'channels');               // abonelikle açılan kanallar  
  
// Bağlantı durumu takibi (isteğe bağlı ama faydalı)  
const connectedRef = ref(db, '.info/connected');  
onValue(connectedRef, (snap) => {  
  if (snap.val() === true) {  
    console.log('Firebase bağlantısı aktif ✅');  
  } else {  
    console.log('Bağlantı kesildi...');  
  }  
});  
  
// Auth durumu değişikliğini dinle (giriş/çıkış)  
onAuthStateChanged(auth, (user) => {  
  if (user) {  
    console.log('Kullanıcı giriş yaptı:', user.uid, user.email);  
    // Burada online durumunu true yapabilirsin vs.  
  } else {  
    console.log('Kullanıcı çıkış yaptı veya giriş yapmadı');  
  }  
});  
  
// Dışarıya export edilecekler  
export {  
  auth,  
  db,  
  storage,  
  messagesRef,  
  usersRef,  
  onlineRef,  
  storiesRef,  
  reportsRef,  
  privateMessagesRef,  
  commandsRef,  
  channelsRef,  
  push,  
  set,  
  remove,  
  update,  
  serverTimestamp,  
  onValue  
};  
