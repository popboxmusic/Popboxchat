// ========== SOHBET.JS - GENEL VE ÖZEL SOHBET ==========
// Tüm mesajlaşma işlemleri: genel sohbet, özel sohbet, mesaj gönderme/silme, resim/video paylaşımı

// ========== GLOBAL SOHBET DEĞİŞKENLERİ ==========
let currentUser = null;
let currentChannel = 'genel';
let currentPrivateChat = null;
let messageListener = null;
let privateMessageListeners = {};

let CHANNEL_MESSAGES = JSON.parse(localStorage.getItem('cetcety_channel_messages')) || {};
let PRIVATE_CHATS = JSON.parse(localStorage.getItem('cetcety_private_chats')) || {};
let BANNED_WORDS = JSON.parse(localStorage.getItem('cetcety_banned_words')) || ['spam', 'reklam', 'şiddet', 'hakaret'];
let BLOCKED_USERS = JSON.parse(localStorage.getItem('cetcety_blocks')) || {};

// ========== GENEL SOHBET ==========

// Kanal mesajlarını başlat
function initChannelMessages(channel) {
    if (!CHANNEL_MESSAGES[channel]) {
        CHANNEL_MESSAGES[channel] = [];
    }
}

// Mesaj dinleyicisini başlat
function startMessageListener() {
    if (messageListener) {
        // Eski dinleyiciyi temizle
    }
    
    // localStorage'dan mesajları oku (Firebase yoksa)
    loadChannelMessages(currentChannel);
    
    // Storage değişikliklerini dinle (çoklu sekme için)
    window.addEventListener('storage', function(e) {
        if (e.key === 'cetcety_channel_messages') {
            const newMessages = JSON.parse(e.newValue);
            if (newMessages && newMessages[currentChannel]) {
                const lastMsg = newMessages[currentChannel].slice(-1)[0];
                const currentLast = CHANNEL_MESSAGES[currentChannel]?.slice(-1)[0];
                
                if (lastMsg && (!currentLast || lastMsg.timestamp > currentLast.timestamp)) {
                    appendMessageToChat(lastMsg, lastMsg.sender === currentUser?.name);
                }
            }
            CHANNEL_MESSAGES = newMessages || {};
        }
    });
}

// Kanal mesajlarını yükle
function loadChannelMessages(channel) {
    const container = document.getElementById('messages');
    if (!container) return;
    
    container.innerHTML = '';
    addSystemMessage(`📢 #${channel} kanalına katıldın!`);
    
    initChannelMessages(channel);
    if (CHANNEL_MESSAGES[channel]) {
        CHANNEL_MESSAGES[channel].forEach(msg => {
            if (msg.isHtml) {
                let msgDiv = document.createElement('div');
                msgDiv.className = msg.sender === '🔔 SİSTEM' ? 'admin-system-message' : 'system-message';
                msgDiv.innerHTML = `<i class="fas fa-copy"></i> ${msg.text}`;
                container.appendChild(msgDiv);
            } else {
                let isMe = msg.sender === currentUser?.name;
                appendMessageToChat(msg, isMe);
            }
        });
    }
    container.scrollTop = container.scrollHeight;
}

// Mesaj gönder
function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    if (!text) return;
    
    // Komut kontrolü
    if (text.startsWith('/')) {
        handleCommand(text);
        input.value = '';
        autoResize(input);
        return;
    }
    
    // Yasaklı kelime kontrolü
    const banned = checkBannedWords(text);
    if (banned) {
        addSystemMessage(`🚫 Yasaklı kelime tespit edildi: "${banned}". Mesajınız gönderilmedi.`);
        input.value = '';
        autoResize(input);
        return;
    }
    
    const time = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const msg = {
        sender: currentUser.name,
        text: text,
        time: time,
        timestamp: Date.now()
    };
    
    initChannelMessages(currentChannel);
    CHANNEL_MESSAGES[currentChannel].push(msg);
    localStorage.setItem('cetcety_channel_messages', JSON.stringify(CHANNEL_MESSAGES));
    
    appendMessageToChat(msg, true);
    
    input.value = '';
    autoResize(input);
}

// Mesaj ekle (UI)
function appendMessageToChat(msg, isMe) {
    const container = document.getElementById('messages');
    if (!container) return;
    
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${isMe ? 'right' : ''}`;
    
    let senderName = msg.sender;
    if (msg.role === 'owner') senderName = '👑 ' + senderName;
    else if (msg.role === 'admin') senderName = '⚡ ' + senderName;
    else if (msg.role === 'coadmin') senderName = '🔧 ' + senderName;
    
    msgDiv.innerHTML = `
        <div class="message-header" style="${isMe ? 'justify-content: flex-end;' : ''}">
            <span class="message-time">${msg.time || ''}</span>
            <span class="message-sender" onclick="openPrivateChat('${msg.sender}')">${escapeHTML(senderName)}</span>
        </div>
        <div class="message-text">${escapeHTML(msg.text)}</div>
    `;
    
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
}

// Sistem mesajı ekle
function addSystemMessage(text) {
    const container = document.getElementById('messages');
    if (!container) return;
    
    const div = document.createElement('div');
    div.className = 'system-message';
    div.innerHTML = `<i class="fas fa-info-circle"></i> ${escapeHTML(text)}`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

// Admin mesajı ekle
function addAdminMessage(text) {
    const container = document.getElementById('messages');
    if (!container) return;
    
    const div = document.createElement('div');
    div.className = 'admin-system-message';
    div.innerHTML = `<i class="fas fa-shield-alt"></i> ${escapeHTML(text)}`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

// Mesaj sil (genel sohbet)
function deleteMessage(messageId) {
    // Bu fonksiyon admin.js'de olacak
}

// ========== ÖZEL SOHBET ==========

// Özel sohbet aç
function openPrivateChat(username) {
    if (!username || !currentUser) return;
    
    if (username === currentUser.name) {
        addSystemMessage('❌ Kendinize mesaj gönderemezsiniz!');
        return;
    }
    
    // Gizlilik kontrolü
    if (currentUser.role !== 'owner') {
        if (currentUser.privateMode === 'none') {
            addSystemMessage('❌ Özel sohbetlere kapalısınız.');
            return;
        }
        if (currentUser.blockedNicks && currentUser.blockedNicks.includes(username)) {
            addSystemMessage(`🚫 ${username} engellenmiş.`);
            return;
        }
    }
    
    // Engelleme kontrolü
    const blockKey = `${currentUser.id}_${username}`;
    const reverseKey = `${username}_${currentUser.id}`;
    
    if (BLOCKED_USERS[blockKey] && BLOCKED_USERS[blockKey].expiry > Date.now() && currentUser.role !== 'owner') {
        addSystemMessage(`🚫 ${username} 24 saat engellendi.`);
        return;
    }
    
    if (BLOCKED_USERS[reverseKey] && BLOCKED_USERS[reverseKey].expiry > Date.now() && currentUser.role !== 'owner') {
        addSystemMessage(`🚫 ${username} tarafından engellendiniz.`);
        return;
    }
    
    // Kullanıcıyı bul (USERS_DB'den)
    const targetUser = USERS_DB.find(u => u.name.toLowerCase() === username.toLowerCase());
    if (!targetUser) {
        addSystemMessage('❌ Kullanıcı bulunamadı.');
        return;
    }
    
    currentPrivateChat = {
        id: targetUser.id,
        name: targetUser.name
    };
    
    document.getElementById('privateChatName').textContent = targetUser.name;
    document.getElementById('privateChatAvatar').innerHTML = targetUser.name.charAt(0).toUpperCase();
    document.getElementById('privateChatPanel').classList.add('active');
    
    loadPrivateMessages(targetUser.id);
    startPrivateMessageListener(targetUser.id);
}

// Özel sohbeti kapat
function closePrivateChat() {
    document.getElementById('privateChatPanel').classList.remove('active');
    
    if (currentPrivateChat) {
        stopPrivateMessageListener(currentPrivateChat.id);
        currentPrivateChat = null;
    }
}

// Özel mesaj dinleyicisini başlat
function startPrivateMessageListener(targetId) {
    const chatId = [currentUser.id, targetId].sort().join('_');
    
    // Eski dinleyiciyi temizle
    if (privateMessageListeners[chatId]) {
        clearInterval(privateMessageListeners[chatId]);
    }
    
    // Her 2 saniyede bir yeni mesajları kontrol et
    privateMessageListeners[chatId] = setInterval(() => {
        checkNewPrivateMessages(chatId, targetId);
    }, 2000);
}

// Özel mesaj dinleyicisini durdur
function stopPrivateMessageListener(targetId) {
    const chatId = [currentUser.id, targetId].sort().join('_');
    if (privateMessageListeners[chatId]) {
        clearInterval(privateMessageListeners[chatId]);
        delete privateMessageListeners[chatId];
    }
}

// Yeni özel mesajları kontrol et
function checkNewPrivateMessages(chatId, targetId) {
    const lastMsg = PRIVATE_CHATS[chatId] ? PRIVATE_CHATS[chatId].slice(-1)[0] : null;
    const lastTimestamp = lastMsg ? lastMsg.timestamp : 0;
    
    // localStorage'dan oku (gerçek uygulamada Firebase'den okunacak)
    const stored = JSON.parse(localStorage.getItem('cetcety_private_chats')) || {};
    const messages = stored[chatId] || [];
    
    const newMessages = messages.filter(m => m.timestamp > lastTimestamp);
    newMessages.forEach(msg => {
        if (msg.senderId !== currentUser.id) {
            appendPrivateMessage(msg);
            
            // Okunmamış işaretle
            msg.read = false;
            
            // Bildirim
            playNotificationSound();
            updateUnreadBadge();
        }
    });
    
    if (newMessages.length > 0) {
        PRIVATE_CHATS[chatId] = messages;
    }
}

// Özel mesajları yükle
function loadPrivateMessages(targetId) {
    const chatId = [currentUser.id, targetId].sort().join('_');
    const messages = PRIVATE_CHATS[chatId] || [];
    const container = document.getElementById('privateChatMessages');
    
    container.innerHTML = '';
    
    messages.sort((a, b) => a.timestamp - b.timestamp).forEach(msg => {
        appendPrivateMessage(msg);
    });
    
    container.scrollTop = container.scrollHeight;
}

// Özel mesaj ekle (UI)
function appendPrivateMessage(msg) {
    const container = document.getElementById('privateChatMessages');
    if (!container) return;
    
    const isMe = msg.senderId === currentUser.id;
    const time = new Date(msg.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    
    const div = document.createElement('div');
    div.className = `private-message ${isMe ? 'right' : ''}`;
    div.id = `private_msg_${msg.id || Date.now()}`;
    
    let deleteBtn = isMe ? `<div class="delete-msg" onclick="deletePrivateMessage('${msg.id}', '${chatId}')"><i class="fas fa-trash"></i></div>` : '';
    
    if (msg.type === 'text') {
        div.innerHTML = `
            ${deleteBtn}
            <div class="private-message-header" style="${isMe ? 'justify-content:flex-end;' : ''}">
                <span class="private-message-time">${time}</span>
                <span class="private-message-sender">${escapeHTML(msg.senderName)}</span>
            </div>
            <div class="private-message-text">${escapeHTML(msg.content)}</div>
        `;
    } else if (msg.type === 'image') {
        div.innerHTML = `
            ${deleteBtn}
            <div class="private-message-header" style="${isMe ? 'justify-content:flex-end;' : ''}">
                <span class="private-message-time">${time}</span>
                <span class="private-message-sender">${escapeHTML(msg.senderName)}</span>
            </div>
            <div class="private-message-media">
                <img src="${escapeHTML(msg.content)}" onclick="window.open(this.src)">
            </div>
        `;
    } else if (msg.type === 'video') {
        div.innerHTML = `
            ${deleteBtn}
            <div class="private-message-header" style="${isMe ? 'justify-content:flex-end;' : ''}">
                <span class="private-message-time">${time}</span>
                <span class="private-message-sender">${escapeHTML(msg.senderName)}</span>
            </div>
            <div class="private-message-media">
                <video controls src="${escapeHTML(msg.content)}"></video>
            </div>
        `;
    }
    
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

// Özel mesaj gönder (text)
function sendPrivateMessage() {
    const input = document.getElementById('privateMessageInput');
    const text = input.value.trim();
    
    if (!text || !currentPrivateChat) return;
    
    // Yasaklı kelime kontrolü
    const banned = checkBannedWords(text);
    if (banned) {
        addSystemMessage(`🚫 Yasaklı kelime tespit edildi: "${banned}"`);
        input.value = '';
        return;
    }
    
    const chatId = [currentUser.id, currentPrivateChat.id].sort().join('_');
    
    if (!PRIVATE_CHATS[chatId]) PRIVATE_CHATS[chatId] = [];
    
    const newMsg = {
        id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        senderId: currentUser.id,
        senderName: currentUser.name,
        receiverId: currentPrivateChat.id,
        receiverName: currentPrivateChat.name,
        type: 'text',
        content: text,
        timestamp: Date.now(),
        read: true
    };
    
    PRIVATE_CHATS[chatId].push(newMsg);
    localStorage.setItem('cetcety_private_chats', JSON.stringify(PRIVATE_CHATS));
    
    appendPrivateMessage(newMsg);
    input.value = '';
    
    // Owner takip varsa bildir
    if (window.logPrivateMessageForOwner) {
        window.logPrivateMessageForOwner(currentUser.name, currentPrivateChat.name, text, 'text', text);
    }
}

// Özel resim gönder
function triggerPrivateImageUpload() {
    document.getElementById('privateImageUpload').click();
}

function sendPrivateImageFile(input) {
    if (!input.files || !input.files[0] || !currentPrivateChat) return;
    
    const file = input.files[0];
    
    // Boyut kontrolü (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('Resim çok büyük! Maksimum 5MB.');
        input.value = '';
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const chatId = [currentUser.id, currentPrivateChat.id].sort().join('_');
        
        if (!PRIVATE_CHATS[chatId]) PRIVATE_CHATS[chatId] = [];
        
        const newMsg = {
            id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            senderId: currentUser.id,
            senderName: currentUser.name,
            receiverId: currentPrivateChat.id,
            receiverName: currentPrivateChat.name,
            type: 'image',
            content: e.target.result,
            timestamp: Date.now(),
            read: true
        };
        
        PRIVATE_CHATS[chatId].push(newMsg);
        localStorage.setItem('cetcety_private_chats', JSON.stringify(PRIVATE_CHATS));
        
        appendPrivateMessage(newMsg);
        
        // Owner takip varsa bildir
        if (window.logPrivateMessageForOwner) {
            window.logPrivateMessageForOwner(currentUser.name, currentPrivateChat.name, 'Resim gönderdi', 'image', e.target.result);
        }
    };
    
    reader.readAsDataURL(file);
    input.value = '';
}

// Özel video gönder
function triggerPrivateVideoUpload() {
    document.getElementById('privateVideoUpload').click();
}

function sendPrivateVideoFile(input) {
    if (!input.files || !input.files[0] || !currentPrivateChat) return;
    
    const file = input.files[0];
    
    // Boyut kontrolü (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
        alert('Video çok büyük! Maksimum 10MB.');
        input.value = '';
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const chatId = [currentUser.id, currentPrivateChat.id].sort().join('_');
        
        if (!PRIVATE_CHATS[chatId]) PRIVATE_CHATS[chatId] = [];
        
        const newMsg = {
            id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            senderId: currentUser.id,
            senderName: currentUser.name,
            receiverId: currentPrivateChat.id,
            receiverName: currentPrivateChat.name,
            type: 'video',
            content: e.target.result,
            timestamp: Date.now(),
            read: true
        };
        
        PRIVATE_CHATS[chatId].push(newMsg);
        localStorage.setItem('cetcety_private_chats', JSON.stringify(PRIVATE_CHATS));
        
        appendPrivateMessage(newMsg);
        
        // Owner takip varsa bildir
        if (window.logPrivateMessageForOwner) {
            window.logPrivateMessageForOwner(currentUser.name, currentPrivateChat.name, 'Video gönderdi', 'video', e.target.result);
        }
    };
    
    reader.readAsDataURL(file);
    input.value = '';
}

// Özel mesaj sil
function deletePrivateMessage(messageId, chatId) {
    if (!PRIVATE_CHATS[chatId]) return;
    
    const index = PRIVATE_CHATS[chatId].findIndex(m => m.id === messageId);
    if (index === -1) return;
    
    PRIVATE_CHATS[chatId].splice(index, 1);
    localStorage.setItem('cetcety_private_chats', JSON.stringify(PRIVATE_CHATS));
    
    const msgDiv = document.getElementById(`private_msg_${messageId}`);
    if (msgDiv) {
        msgDiv.remove();
    }
}

// ========== ÖZEL SOHBET LİSTESİ ==========
function loadPrivateChatList() {
    const container = document.getElementById('privateList');
    if (!container) return;
    
    let chats = [];
    
    for (let chatId in PRIVATE_CHATS) {
        if (!PRIVATE_CHATS[chatId] || !currentUser) continue;
        
        if (chatId.includes(currentUser.id)) {
            const ids = chatId.split('_').filter(id => id !== 'chat');
            const otherId = ids[0] == currentUser.id ? ids[1] : ids[0];
            
            const otherUser = USERS_DB.find(u => u.id == otherId) || { name: 'Kullanıcı' };
            const messages = PRIVATE_CHATS[chatId];
            const lastMsg = messages[messages.length - 1];
            const unread = messages.filter(m => m.senderId != currentUser.id && !m.read).length;
            
            chats.push({
                id: otherId,
                name: otherUser.name,
                lastMsg: lastMsg ? (lastMsg.type === 'text' ? lastMsg.content : '📎 medya') : '...',
                time: lastMsg ? new Date(lastMsg.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '',
                unread: unread
            });
        }
    }
    
    let html = '';
    if (chats.length === 0) {
        html = '<div style="color:#aaa; padding:20px; text-align:center;">Henüz özel sohbet yok.</div>';
    } else {
        chats.sort((a, b) => b.unread - a.unread).forEach(chat => {
            html += `
                <div class="chat-item" onclick="openPrivateChat('${chat.name}')">
                    <div class="chat-avatar"><span>${chat.name.charAt(0)}</span></div>
                    <div class="chat-info">
                        <div class="chat-name">
                            ${chat.name}
                            ${chat.unread > 0 ? '<span class="subscription-notification"></span>' : ''}
                        </div>
                        <div class="chat-meta">
                            <span>${escapeHTML(chat.lastMsg)}</span>
                            <span>• ${chat.time}</span>
                        </div>
                    </div>
                    ${chat.unread > 0 ? `<div class="subscription-stats" style="color:#ff4444;">${chat.unread}</div>` : ''}
                </div>
            `;
        });
    }
    
    container.innerHTML = html;
    updateUnreadBadge();
}

// Okunmamış mesaj rozetini güncelle
function updateUnreadBadge() {
    let total = 0;
    
    for (let chatId in PRIVATE_CHATS) {
        if (PRIVATE_CHATS[chatId] && currentUser) {
            total += PRIVATE_CHATS[chatId].filter(m => m.senderId != currentUser.id && !m.read).length;
        }
    }
    
    const badge = document.getElementById('chatListBadge');
    if (badge) {
        badge.textContent = total || '0';
        badge.style.display = total > 0 ? 'flex' : 'none';
    }
}

// ========== ENGELLE ==========
function blockUser() {
    if (!currentPrivateChat || !currentUser) return;
    
    const blockKey = `${currentUser.id}_${currentPrivateChat.id}`;
    BLOCKED_USERS[blockKey] = {
        userId: currentPrivateChat.id,
        userName: currentPrivateChat.name,
        expiry: Date.now() + 24 * 60 * 60 * 1000,
        blockedBy: currentUser.id
    };
    
    localStorage.setItem('cetcety_blocks', JSON.stringify(BLOCKED_USERS));
    
    addSystemMessage(`🚫 ${currentPrivateChat.name} 24 saatliğine engellendi.`);
    sendToAdminChannel(`🚫 ${currentUser.name}, ${currentPrivateChat.name} kullanıcısını engelledi.`);
    
    closePrivateChat();
}

// ========== ŞİKAYET ==========
function reportUser() {
    if (!currentPrivateChat) return;
    
    const msg = `⚠️ ${currentPrivateChat.name} kullanıcısı şikayet edildi. Şikayet eden: ${currentUser.name}`;
    addSystemMessage(msg);
    sendToAdminChannel(msg);
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

// ========== BİLDİRİM SESİ ==========
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

// ========== TAB DEĞİŞTİRME ==========
function switchChatTab(tab) {
    const tabChats = document.getElementById('tabChats');
    const tabOnline = document.getElementById('tabOnline');
    const content = document.getElementById('chatPanelContent');
    
    if (tab === 'chats') {
        tabChats.classList.add('active');
        tabOnline.classList.remove('active');
        loadPrivateChatList();
    } else {
        tabChats.classList.remove('active');
        tabOnline.classList.add('active');
        showOnlineUsers();
    }
}

function showOnlineUsers() {
    const container = document.getElementById('chatPanelContent');
    if (!container) return;
    
    const onlineUsers = channels[currentChannel]?.onlineUsers || [];
    
    if (onlineUsers.length === 0) {
        container.innerHTML = '<div style="color:#aaa; padding:20px; text-align:center;">Çevrimiçi kullanıcı yok.</div>';
        return;
    }
    
    let html = '';
    onlineUsers.forEach(user => {
        html += `
            <div class="online-item" onclick="openPrivateChat('${user}')">
                <div class="online-avatar"><span>${user.charAt(0)}</span></div>
                <div class="online-info">
                    <div class="online-name">${user}</div>
                    <div class="online-meta"><span>#${currentChannel}</span></div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ========== YARDIMCI ==========
function autoResize(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 80) + 'px';
}

function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ========== DIŞARI AKTAR ==========
window.Chat = {
    setUser: (user) => { currentUser = user; },
    setChannel: (channel) => { 
        currentChannel = channel; 
        startMessageListener();
        loadChannelMessages(channel);
    },
    sendMessage: sendMessage,
    openPrivate: openPrivateChat,
    closePrivate: closePrivateChat,
    sendPrivate: sendPrivateMessage,
    uploadImage: triggerPrivateImageUpload,
    uploadVideo: triggerPrivateVideoUpload,
    blockUser: blockUser,
    reportUser: reportUser,
    switchTab: switchChatTab,
    loadPrivateList: loadPrivateChatList,
    updateUnreadBadge: updateUnreadBadge
};

// ========== GLOBAL DEĞİŞKENLER (admin.js'den gelecek) ==========
let USERS_DB = [];
let channels = {};

// Bu fonksiyonlar admin.js'den enjekte edilecek
window.sendToAdminChannel = window.sendToAdminChannel || function() {};
window.logPrivateMessageForOwner = window.logPrivateMessageForOwner || function() {};