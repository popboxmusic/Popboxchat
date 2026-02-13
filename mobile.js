// ========== MOBİL DÜZENLEME ==========
// YouTube tarzı mobil görünüm

function initMobileView() {
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
        document.body.classList.add('mobile-view');
        
        // Mobil butonları ekle
        addMobileButtons();
    }
}

function addMobileButtons() {
    // Mobil sohbet butonu
    const chatBtn = document.createElement('div');
    chatBtn.className = 'mobile-chat-btn';
    chatBtn.innerHTML = '<i class="fas fa-comment"></i>';
    chatBtn.onclick = toggleMobileChat;
    
    // Mobil kullanıcı butonu
    const usersBtn = document.createElement('div');
    usersBtn.className = 'mobile-users-btn';
    usersBtn.innerHTML = '<i class="fas fa-users"></i>';
    usersBtn.onclick = toggleMobileUsers;
    
    document.body.appendChild(chatBtn);
    document.body.appendChild(usersBtn);
}

window.initMobileView = initMobileView;