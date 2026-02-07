// js/core/ui.js  
  
// UI elementlerini seç  
const loginScreen = document.getElementById('login-screen');  
const mainContent = document.getElementById('main-content');  
const messageInput = document.getElementById('message-input');  
const messagesContainer = document.getElementById('messages');  
const onlineCountElem = document.getElementById('online-count');  
const themeToggleBtn = document.getElementById('theme-toggle');  
  
// Tema değiştirme (gece/gündüz)  
let currentTheme = localStorage.getItem('theme') || 'light';  
  
function toggleTheme() {  
  if (currentTheme === 'light') {  
    document.body.classList.add('dark-mode');  
    document.body.classList.remove('light-mode');  
    currentTheme = 'dark';  
    themeToggleBtn.textContent = '☀️';  
  } else {  
    document.body.classList.add('light-mode');  
    document.body.classList.remove('dark-mode');  
    currentTheme = 'light';  
    themeToggleBtn.textContent = '🌙';  
  }  
  localStorage.setItem('theme', currentTheme);  
}  
  
// Giriş ekranını göster/gizle  
function showLoginScreen() {  
  if (loginScreen) loginScreen.classList.remove('hidden');  
  if (mainContent) mainContent.classList.add('hidden');  
}  
  
function hideLoginScreen() {  
  if (loginScreen) loginScreen.classList.add('hidden');  
  if (mainContent) mainContent.classList.remove('hidden');  
  if (messageInput) messageInput.focus();  
}  
  
// Mesaj ekleme (genel sohbet)  
function addMessage(text, nick, isOwn = false, timestamp = Date.now()) {  
  const msgDiv = document.createElement('div');  
  msgDiv.className = `message ${isOwn ? 'own' : ''}`;  
    
  const timeStr = new Date(timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});  
    
  msgDiv.innerHTML = `  
    <span class="nick">${nick}</span>  
    <span class="time">${timeStr}</span>  
    <div class="text">${text}</div>  
  `;  
    
  messagesContainer.appendChild(msgDiv);  
  messagesContainer.scrollTop = messagesContainer.scrollHeight;  
}  
  
// Hata mesajı gösterme  
function showError(message, duration = 4000) {  
  const errorDiv = document.createElement('div');  
  errorDiv.className = 'error-message';  
  errorDiv.textContent = message;  
    
  document.body.appendChild(errorDiv);  
    
  setTimeout(() => {  
    errorDiv.remove();  
  }, duration);  
}  
  
// Online sayısını ekrana yaz  
function updateOnlineCount(count) {  
  if (onlineCountElem) {  
    onlineCountElem.textContent = count;  
  }  
}  
  
// Event listener'lar (butonlar vs.)  
if (themeToggleBtn) {  
  themeToggleBtn.addEventListener('click', toggleTheme);  
}  
  
// Sayfa yüklendiğinde tema uygula  
if (currentTheme === 'dark') {  
  document.body.classList.add('dark-mode');  
  themeToggleBtn.textContent = '☀️';  
}  
  
// Dışarıya export  
export {  
  showLoginScreen,  
  hideLoginScreen,  
  addMessage,  
  showError,  
  updateOnlineCount,  
  toggleTheme  
};  
