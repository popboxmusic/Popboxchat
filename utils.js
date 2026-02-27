// ========== MODAL FONKSİYONLARI ==========
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function openKvkkModal() {
    openModal('kvkkModal');
}

function openTermsModal() {
    openModal('termsModal');
}

// ========== MESAJ FONKSİYONLARI ==========
function addSystemMessage(text) {
    const container = document.getElementById('messages');
    const div = document.createElement('div');
    div.className = 'system-message';
    div.innerHTML = `<i class="fas fa-info-circle"></i> ${escapeHTML(text)}`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function addAdminMessage(text) {
    const container = document.getElementById('messages');
    const div = document.createElement('div');
    div.className = 'admin-system-message';
    div.innerHTML = `<i class="fas fa-shield-alt"></i> ${escapeHTML(text)}`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

// ========== TEXTAREA BOYUTLANDIRMA ==========
function autoResize(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 80) + 'px';
}

// ========== ZAMAN FORMATLAMA ==========
function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('tr-TR', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// ========== SAYI FORMATLAMA ==========
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

// ========== YASAKLI KELİME KONTROLÜ ==========
function checkBannedWords(text) {
    if (!text || !BANNED_WORDS.length) return false;
    const lower = text.toLowerCase();
    for (let word of BANNED_WORDS) {
        if (lower.includes(word.toLowerCase())) {
            return word;
        }
    }
    return false;
}

// ========== DEBOUNCE ==========
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ========== KANAL ADI KONTROLÜ ==========
function isValidChannelName(name) {
    return /^[a-z0-9-]+$/.test(name);
}

// ========== CHAT ID OLUŞTURMA ==========
function generateChatId(user1, user2) {
    const users = [user1, user2].sort();
    return `chat_${users[0]}_${users[1]}`;
}

// ========== RASTGELE ID ==========
function generateUserId() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function generateMessageId() {
    return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// ========== IP ADRESİ (fake) ==========
function generateFakeIP() {
    return `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

// ========== YOUTUBE URL'DEN ID ÇIKARMA ==========
function extractYoutubeId(url) {
    if (!url) return null;
    
    // youtube.com/watch?v=...
    if (url.includes('youtube.com/watch?v=')) {
        const match = url.split('v=')[1];
        return match ? match.split('&')[0] : null;
    }
    
    // youtu.be/...
    if (url.includes('youtu.be/')) {
        const match = url.split('youtu.be/')[1];
        return match ? match.split('?')[0] : null;
    }
    
    // direkt ID (11 karakter)
    if (url.match(/^[a-zA-Z0-9_-]{11}$/)) {
        return url;
    }
    
    return null;
}

// ========== DOSYA BOYUT KONTROLÜ ==========
function isValidFileSize(file, maxSizeMB = 5) {
    return file.size <= maxSizeMB * 1024 * 1024;
}

function isValidImageType(file) {
    return file.type.startsWith('image/');
}

function isValidVideoType(file) {
    return file.type.startsWith('video/');
}

// ========== BİLDİRİM ==========
function playNotificationSound() {
    try {
        const sound = document.getElementById('notificationSound');
        if (sound) {
            sound.currentTime = 0;
            sound.play().catch(e => console.log('Ses çalınamadı:', e));
        }
    } catch (e) {
        console.log('Ses hatası:', e);
    }
}

function updatePageTitle(count) {
    const originalTitle = document.title.replace(/^\(\d+\)\s*/, '');
    if (count > 0) {
        document.title = `(${count}) ${originalTitle}`;
    } else {
        document.title = originalTitle;
    }
}

// ========== PANEL İŞLEMLERİ ==========
function closeAllPanels() {
    // Özel sohbet panelini kapat
    if (document.getElementById('privateChatPanel').classList.contains('active')) {
        closePrivateChat();
    }
    
    // Modal'ları kapat
    closeModal('youtubeModal');
    closeModal('avatarModal');
    closeModal('privateSpyModal');
    closeModal('kvkkModal');
    closeModal('termsModal');
    
    // Sol paneli kapat (mobilde)
    const leftPanel = document.getElementById('leftPanel');
    if (leftPanel.classList.contains('active')) {
        leftPanel.classList.remove('active');
    }
}

// ========== ESC İLE KAPATMA ==========
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeAllPanels();
    }
    
    // Enter ile mesaj gönderme
    if (e.key === 'Enter' && !e.shiftKey) {
        const activeElement = document.activeElement;
        if (activeElement && activeElement.id === 'messageInput') {
            e.preventDefault();
            sendMessage();
        } else if (activeElement && activeElement.id === 'privateMessageInput') {
            e.preventDefault();
            sendPrivateMessage();
        }
    }
});

// ========== TIKLAMA DIŞI KAPATMA ==========
document.addEventListener('click', function(e) {
    // Sol panel (mobil)
    const leftPanel = document.getElementById('leftPanel');
    const menuBtns = document.querySelectorAll('.icon-item');
    let clickedMenuBtn = false;
    
    menuBtns.forEach(btn => {
        if (btn.contains(e.target)) clickedMenuBtn = true;
    });
    
    if (leftPanel.classList.contains('active') && 
        !leftPanel.contains(e.target) && 
        !clickedMenuBtn) {
        leftPanel.classList.remove('active');
    }
});
