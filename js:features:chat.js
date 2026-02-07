// js/features/chat.js  
  
import { db, messagesRef, auth, push, serverTimestamp, onValue } from '../core/firebase.js';  
import { addMessage, showError } from '../core/ui.js';  
  
// Mesaj gönderme  
async function sendMessage(text) {  
  if (!text.trim()) return;  
  
  const user = auth.currentUser;  
  if (!user) {  
    showError("Önce giriş yapmalısınız!");  
    return;  
  }  
  
  try {  
    const nick = user.displayName || user.email.split('@')[0];  
  
    await push(messagesRef, {  
      text: text.trim(),  
      nick,  
      uid: user.uid,  
      timestamp: serverTimestamp()  
    });  
  
    // Input'u temizle  
    const input = document.getElementById('message-input');  
    if (input) input.value = '';  
  } catch (error) {  
    console.error("Mesaj gönderim hatası:", error);  
    showError("Mesaj gönderilemedi: " + error.message);  
  }  
}  
  
// Mesajları dinle ve ekrana ekle  
function listenMessages() {  
  onValue(messagesRef, (snapshot) => {  
    const messagesDiv = document.getElementById('messages');  
    if (!messagesDiv) return;  
  
    // Her dinlemede temizle ve yeniden çiz (basit yöntem)  
    messagesDiv.innerHTML = '';  
  
    const data = snapshot.val();  
    if (!data) return;  
  
    Object.entries(data).forEach(([key, msg]) => {  
      const isOwn = auth.currentUser && msg.uid === auth.currentUser.uid;  
      addMessage(msg.text, msg.nick, isOwn, msg.timestamp ? msg.timestamp : Date.now());  
    });  
  }, (error) => {  
    console.error("Mesaj dinleme hatası:", error);  
    showError("Sohbet yüklenemedi");  
  });  
}  
  
// Mesaj gönderme butonu ve enter tuşu  
function initChatEvents() {  
  const input = document.getElementById('message-input');  
  const sendBtn = document.getElementById('send-message');  
  
  if (input && sendBtn) {  
    sendBtn.addEventListener('click', () => {  
      sendMessage(input.value);  
    });  
  
    input.addEventListener('keypress', (e) => {  
      if (e.key === 'Enter' && !e.shiftKey) {  
        e.preventDefault();  
        sendMessage(input.value);  
      }  
    });  
  }  
}  
  
// Dışarıya export  
export {  
  sendMessage,  
  listenMessages,  
  initChatEvents  
};  
