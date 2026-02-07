// js/core/auth.js  
  
import { auth, db, usersRef, push, set, serverTimestamp } from './firebase.js';  
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';  
  
// Owner bilgileri (client tarafında basit kontrol için, üretimde sunucu tarafına taşı)  
const OWNER_NICK = "mateky";  
const OWNER_PASSWORD = "sahil7407@SCM"; // ← Gerçek kullanımda bunu client'tan kaldır, cloud function ile doğrula  
  
// Giriş yapma fonksiyonu  
async function login(email, password, nick) {  
  try {  
    let userCredential;  
  
    // Eğer nick "mateky" ve şifre doğruysa owner olarak işaretle  
    if (nick === OWNER_NICK && password === OWNER_PASSWORD) {  
      // Owner için özel işlem (örneğin admin rolü ata)  
      userCredential = await signInWithEmailAndPassword(auth, email, password);  
    } else {  
      // Normal kullanıcı girişi  
      userCredential = await signInWithEmailAndPassword(auth, email, password);  
    }  
  
    const user = userCredential.user;  
    console.log("Giriş başarılı:", user.uid);  
  
    // Veritabanına kullanıcıyı kaydet / güncelle  
    const userRef = ref(db, `users/${user.uid}`);  
    await set(userRef, {  
      nick: nick || user.email.split('@')[0],  
      email: user.email,  
      role: nick === OWNER_NICK ? "admin" : "user",  
      lastLogin: serverTimestamp(),  
      createdAt: serverTimestamp()  
    });  
  
    return user;  
  } catch (error) {  
    console.error("Giriş hatası:", error.message);  
    throw error;  
  }  
}  
  
// Kayıt olma (yeni kullanıcı)  
async function register(email, password, nick) {  
  try {  
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);  
    const user = userCredential.user;  
  
    // Veritabanına kaydet  
    await set(ref(db, `users/${user.uid}`), {  
      nick,  
      email,  
      role: "user",  
      createdAt: serverTimestamp()  
    });  
  
    console.log("Kayıt başarılı:", user.uid);  
    return user;  
  } catch (error) {  
    console.error("Kayıt hatası:", error.message);  
    throw error;  
  }  
}  
  
// Çıkış yapma  
async function logout() {  
  try {  
    await signOut(auth);  
    console.log("Çıkış yapıldı");  
  } catch (error) {  
    console.error("Çıkış hatası:", error);  
  }  
}  
  
// Giriş durumu değişimini dinle (sayfa yüklendiğinde çalışır)  
onAuthStateChanged(auth, (user) => {  
  if (user) {  
    console.log("Kullanıcı girişli:", user.uid, user.email);  
    // UI'yi güncelle (örneğin giriş ekranını gizle, sohbeti göster)  
    document.getElementById('login-screen')?.classList.add('hidden');  
    document.getElementById('main-content')?.classList.remove('hidden');  
  } else {  
    console.log("Kullanıcı çıkış yapmış veya giriş yapmamış");  
    document.getElementById('login-screen')?.classList.remove('hidden');  
    document.getElementById('main-content')?.classList.add('hidden');  
  }  
});  
  
// Dışarıya export et  
export { login, register, logout };  
