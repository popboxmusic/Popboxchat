// ========== YARDIMCI FONKSİYONLAR ==========

// Bağlantı durumunu güncelle
function updateConnectionStatus(status, text) {
    const statusEl = document.getElementById('connectionStatus');
    const statusText = document.getElementById('statusText');
    if (statusEl && statusText) {
        statusEl.className = `connection-status ${status}`;
        statusText.textContent = text;
    }
}

// Textarea otomatik boyutlandırma
function autoResize(t) {
    t.style.height = 'auto';
    t.style.height = Math.min(t.scrollHeight, 80) + 'px';
}

// HTML escape
function escapeHTML(t) {
    if (!t) return '';
    let d = document.createElement('div');
    d.textContent = t;
    return d.innerHTML;
}

// Modal aç
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
}

// Modal kapat
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
}

// KVKK ve Terms modal açma
function openKvkkModal() {
    openModal('kvkkModal');
}

function openTermsModal() {
    openModal('termsModal');
}

// FAQ toggle
function toggleFaq(element) {
    let answer = element.parentElement.querySelector('.faq-answer');
    let icon = element.querySelector('i');
    if (answer.style.display === 'none' || !answer.style.display) {
        answer.style.display = 'block';
        icon.className = 'fas fa-chevron-up';
    } else {
        answer.style.display = 'none';
        icon.className = 'fas fa-chevron-down';
    }
}

// Debounce fonksiyonu
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

// 20 dakika sonra eski mesajları temizle
function cleanupOldMessages() {
    const TWENTY_MINUTES = 20 * 60 * 1000;
    const now = Date.now();
    let changed = false;

    for (let channel in CHANNEL_MESSAGES) {
        if (CHANNEL_MESSAGES[channel] && Array.isArray(CHANNEL_MESSAGES[channel])) {
            const originalLength = CHANNEL_MESSAGES[channel].length;
            CHANNEL_MESSAGES[channel] = CHANNEL_MESSAGES[channel].filter(msg => {
                return (now - (msg.timestamp || 0)) < TWENTY_MINUTES;
            });
            if (originalLength !== CHANNEL_MESSAGES[channel].length) {
                changed = true;
                console.log(`${channel} kanalında ${originalLength - CHANNEL_MESSAGES[channel].length} eski mesaj temizlendi`);
            }
        }
    }

    if (changed) {
        localStorage.setItem('cetcety_channel_messages', JSON.stringify(CHANNEL_MESSAGES));
        if (typeof refreshCurrentChannelMessages === 'function') {
            refreshCurrentChannelMessages();
        }
    }
}

// Özel mesajları temizle (çıkışta)
function cleanupPrivateMessages() {
    console.log('Özel mesajlar temizleniyor...');
    if (typeof ACTIVE_USER !== 'undefined' && ACTIVE_USER) {
        for (let chatId in PRIVATE_CHATS) {
            if (chatId.includes(ACTIVE_USER.id)) {
                delete PRIVATE_CHATS[chatId];
            }
        }
        localStorage.setItem('cetcety_private_chats', JSON.stringify(PRIVATE_CHATS));
    }
}

// Nick kontrolü
function isNickTaken(nick) {
    let normalized = nick.toLowerCase();
    return USERS_DB.some(u => u.name.toLowerCase() === normalized);
}

// Yasaklı kelime kontrolü
function checkBannedWords(text) {
    if (!text) return false;
    const lower = text.toLowerCase();
    for (let word of BANNED_WORDS) {
        if (lower.includes(word.toLowerCase())) return word;
    }
    return false;
}

// Sistem mesajı ekle
function addSystemMessage(t) {
    let d = document.createElement('div');
    d.className = 'system-message';
    d.innerHTML = `<i class="fas fa-info-circle"></i> ${escapeHTML(t)}`;
    document.getElementById('messages').appendChild(d);
    document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
}

// Kanal mesajlarını yükle
function loadChannelMessages(channel) {
    let container = document.getElementById('messages');
    if (!container) return;

    container.innerHTML = '';
    addSystemMessage(`📢 #${channel} kanalına katıldın!`);

    if (typeof initChannelMessages === 'function') {
        initChannelMessages(channel);
    }
    
    if (CHANNEL_MESSAGES[channel]) {
        CHANNEL_MESSAGES[channel].forEach(msg => {
            if (msg.isHtml) {
                let msgDiv = document.createElement('div');
                msgDiv.className = msg.sender === '🔔 SİSTEM' ? 'admin-system-message' : 'system-message';
                msgDiv.innerHTML = `<i class="fas fa-copy"></i> ${msg.text}`;
                container.appendChild(msgDiv);
            } else {
                let isMe = msg.sender === ACTIVE_USER?.name;
                if (typeof appendMessageToChat === 'function') {
                    appendMessageToChat(msg, isMe);
                }
            }
        });
    }
    container.scrollTop = container.scrollHeight;
}

// Kanal mesajlarını yenile
function refreshCurrentChannelMessages() {
    loadChannelMessages(currentChannel);
}

// Mesaj göster
function appendMessageToChat(msg, isMe) {
    let container = document.getElementById('messages');
    if (!container) return;

    let msgDiv = document.createElement('div');
    msgDiv.className = `message ${isMe ? 'right' : ''}`;
    msgDiv.setAttribute('data-timestamp', msg.timestamp);
    
    let deleteBtn = '';
    if (isMe) {
        deleteBtn = `<div class="delete-message-btn" onclick="deleteChannelMessage('${currentChannel}', ${msg.timestamp})"><i class="fas fa-trash"></i></div>`;
    }
    
    msgDiv.innerHTML = deleteBtn + `
        <div class="message-header" style="${isMe ? 'justify-content: flex-end;' : ''}">
            <span class="message-time">${msg.time || ''}</span>
            <span class="message-sender">${escapeHTML(msg.sender) || ''}</span>
        </div>
        <div class="message-text">${escapeHTML(msg.text) || ''}</div>`;
    
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
}

// Kanal mesajı sil
function deleteChannelMessage(channel, timestamp) {
    if (!CHANNEL_MESSAGES[channel]) return false;
    
    const messageIndex = CHANNEL_MESSAGES[channel].findIndex(msg => msg.timestamp === timestamp);
    
    if (messageIndex !== -1) {
        const message = CHANNEL_MESSAGES[channel][messageIndex];
        
        if (message.sender === ACTIVE_USER?.name) {
            CHANNEL_MESSAGES[channel].splice(messageIndex, 1);
            localStorage.setItem('cetcety_channel_messages', JSON.stringify(CHANNEL_MESSAGES));
            
            if (typeof database !== 'undefined' && database) {
                database.ref(`chats/${channel}`).orderByChild('timestamp').equalTo(timestamp).once('value', (snapshot) => {
                    snapshot.forEach(childSnapshot => {
                        childSnapshot.ref.remove();
                    });
                });
            }
            
            if (channel === currentChannel) {
                refreshCurrentChannelMessages();
            }
            
            return true;
        }
    }
    return false;
}
