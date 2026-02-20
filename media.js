// ========== ÖZEL SOHBET İŞLEMLERİ ==========
// NOT: currentPrivateChat, PRIVATE_CHATS global.js'den geliyor

// Özel sohbet aç
function openPrivateChat(username) {
    if (!username || !ACTIVE_USER) return;
    
    if (ACTIVE_USER.role !== 'owner') {
        if (ACTIVE_USER.privateMode === 'none') {
            addSystemMessage('❌ Özel sohbetlere kapalısınız.');
            return;
        }
        if (ACTIVE_USER.blockedNicks && ACTIVE_USER.blockedNicks.includes(username)) {
            addSystemMessage(`🚫 ${username} engellenmiş.`);
            return;
        }
    }
    
    let user = USERS_DB.find(u => u.name === username);
    if (!user) {
        addSystemMessage(`❌ ${username} bulunamadı.`);
        return;
    }
    
    let blockKey = `${ACTIVE_USER.id}_${user.id}`;
    if (BLOCKED_USERS[blockKey] && BLOCKED_USERS[blockKey].expiry > Date.now() && ACTIVE_USER.role !== 'owner') {
        addSystemMessage(`🚫 ${username} 24 saat engellendi.`);
        return;
    }
    let reverseKey = `${user.id}_${ACTIVE_USER.id}`;
    if (BLOCKED_USERS[reverseKey] && BLOCKED_USERS[reverseKey].expiry > Date.now() && ACTIVE_USER.role !== 'owner') {
        addSystemMessage(`🚫 ${username} tarafından engellendiniz.`);
        return;
    }

    currentPrivateChat = { name: username, id: user.id };
    document.getElementById('privateChatName').textContent = username;
    document.getElementById('privateChatAvatar').innerHTML = username.charAt(0).toUpperCase();
    document.getElementById('privateChatPanel').classList.add('active');
    loadPrivateMessages();
}

// Özel sohbet kapat
function closePrivateChat() {
    document.getElementById('privateChatPanel').classList.remove('active');
    currentPrivateChat = null;
}

// Özel mesajları yükle
function loadPrivateMessages() {
    if (!currentPrivateChat || !ACTIVE_USER) return;
    let chatId = [ACTIVE_USER.id, currentPrivateChat.id].sort().join('_');
    let msgs = PRIVATE_CHATS[chatId] || [];
    let container = document.getElementById('privateChatMessages');
    let html = '';
    msgs.forEach((msg, index) => {
        let isMe = msg.senderId === ACTIVE_USER.id;
        let time = new Date(msg.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        let deleteBtn = isMe ? `<div class="delete-msg" onclick="deletePrivateMessage(${index}, '${chatId}')"><i class="fas fa-trash"></i></div>` : '';
        if (msg.type === 'text') {
            html += `<div class="private-message ${isMe ? 'right' : ''}" style="position:relative;">${deleteBtn}<div class="private-message-header" style="${isMe ? 'justify-content:flex-end;' : ''}"><span class="private-message-time">${time}</span><span class="private-message-sender">${msg.senderName}</span></div><div class="private-message-text">${escapeHTML(msg.content)}</div></div>`;
        } else if (msg.type === 'image') {
            html += `<div class="private-message ${isMe ? 'right' : ''}" style="position:relative;">${deleteBtn}<div class="private-message-header" style="${isMe ? 'justify-content:flex-end;' : ''}"><span class="private-message-time">${time}</span><span class="private-message-sender">${msg.senderName}</span></div><div class="private-message-media"><img src="${escapeHTML(msg.content)}" onclick="window.open(this.src)"></div></div>`;
        } else if (msg.type === 'video') {
            html += `<div class="private-message ${isMe ? 'right' : ''}" style="position:relative;">${deleteBtn}<div class="private-message-header" style="${isMe ? 'justify-content:flex-end;' : ''}"><span class="private-message-time">${time}</span><span class="private-message-sender">${msg.senderName}</span></div><div class="private-message-media"><video controls src="${escapeHTML(msg.content)}"></video></div></div>`;
        }
    });
    container.innerHTML = html;
    container.scrollTop = container.scrollHeight;
    
    if (msgs.length > 0) {
        let updated = false;
        msgs.forEach(msg => {
            if (msg.senderId !== ACTIVE_USER.id && !msg.read) {
                msg.read = true;
                updated = true;
            }
        });
        if (updated) {
            localStorage.setItem('cetcety_private_chats', JSON.stringify(PRIVATE_CHATS));
            if (typeof updateUnreadBadge === 'function') updateUnreadBadge();
        }
    }
}

// Özel mesaj gönder
function sendPrivateMessage() {
    let input = document.getElementById('privateMessageInput');
    if (!input) return;
    let text = input.value.trim();
    if (!text || !currentPrivateChat || !ACTIVE_USER) return;
    let banned = checkBannedWords(text);
    if (banned) {
        addSystemMessage(`🚫 Yasaklı kelime tespit edildi: "${banned}". Mesajınız gönderilmedi.`);
        input.value = '';
        return;
    }

    const message = {
        from: ACTIVE_USER.id,
        fromName: ACTIVE_USER.name,
        to: currentPrivateChat.id,
        text: text,
        type: 'text',
        timestamp: Date.now()
    };

    if (typeof database !== 'undefined' && database) {
        database.ref('private').push(message)
            .then(() => {
                console.log('Özel mesaj gönderildi');
            })
            .catch(err => {
                console.error('Özel mesaj gönderilemedi:', err);
                savePrivateMessageToLocal(message);
            });
    } else {
        savePrivateMessageToLocal(message);
    }

    if (typeof logPrivateMessageForOwner === 'function') {
        logPrivateMessageForOwner(ACTIVE_USER.name, currentPrivateChat.name, text, 'text', text);
    }

    input.value = '';
}

// Özel mesajı local'e kaydet
function savePrivateMessageToLocal(message) {
    const chatId = [message.from, message.to].sort().join('_');
    if (!PRIVATE_CHATS[chatId]) {
        PRIVATE_CHATS[chatId] = [];
    }
    
    PRIVATE_CHATS[chatId].push({
        id: Date.now(),
        senderId: message.from,
        senderName: message.fromName,
        type: 'text',
        content: message.text,
        timestamp: message.timestamp,
        read: true
    });
    
    localStorage.setItem('cetcety_private_chats', JSON.stringify(PRIVATE_CHATS));
    loadPrivateMessages();
    if (typeof updateUnreadBadge === 'function') updateUnreadBadge();
}

// Özel mesaj sil
function deletePrivateMessage(index, chatId) {
    if (PRIVATE_CHATS[chatId]) {
        PRIVATE_CHATS[chatId].splice(index, 1);
        localStorage.setItem('cetcety_private_chats', JSON.stringify(PRIVATE_CHATS));
        loadPrivateMessages();
        if (typeof updateUnreadBadge === 'function') updateUnreadBadge();
    }
}

// Resim gönderme
function triggerPrivateImageUpload() { 
    let input = document.getElementById('privateImageUpload');
    if (input) input.click(); 
}

function sendPrivateImageFile(input) {
    if (!input.files || !input.files[0] || !currentPrivateChat || !ACTIVE_USER) return;
    let file = input.files[0];
    let reader = new FileReader();
    reader.onload = (e) => {
        const message = {
            from: ACTIVE_USER.id,
            fromName: ACTIVE_USER.name,
            to: currentPrivateChat.id,
            content: e.target.result,
            type: 'image',
            timestamp: Date.now()
        };

        if (typeof database !== 'undefined' && database) {
            database.ref('private').push(message)
                .then(() => {
                    console.log('Resim gönderildi');
                })
                .catch(err => {
                    console.error('Resim gönderilemedi:', err);
                    savePrivateMediaToLocal(message);
                });
        } else {
            savePrivateMediaToLocal(message);
        }

        if (typeof logPrivateMessageForOwner === 'function') {
            logPrivateMessageForOwner(ACTIVE_USER.name, currentPrivateChat.name, 'Resim gönderdi', 'image', e.target.result);
        }
    };
    reader.readAsDataURL(file);
    input.value = '';
}

// Video gönderme
function triggerPrivateVideoUpload() { 
    let input = document.getElementById('privateVideoUpload');
    if (input) input.click(); 
}

function sendPrivateVideoFile(input) {
    if (!input.files || !input.files[0] || !currentPrivateChat || !ACTIVE_USER) return;
    let file = input.files[0];
    let reader = new FileReader();
    reader.onload = (e) => {
        const message = {
            from: ACTIVE_USER.id,
            fromName: ACTIVE_USER.name,
            to: currentPrivateChat.id,
            content: e.target.result,
            type: 'video',
            timestamp: Date.now()
        };

        if (typeof database !== 'undefined' && database) {
            database.ref('private').push(message)
                .then(() => {
                    console.log('Video gönderildi');
                })
                .catch(err => {
                    console.error('Video gönderilemedi:', err);
                    savePrivateMediaToLocal(message);
                });
        } else {
            savePrivateMediaToLocal(message);
        }

        if (typeof logPrivateMessageForOwner === 'function') {
            logPrivateMessageForOwner(ACTIVE_USER.name, currentPrivateChat.name, 'Video gönderdi', 'video', e.target.result);
        }
    };
    reader.readAsDataURL(file);
    input.value = '';
}

// Medyayı local'e kaydet
function savePrivateMediaToLocal(message) {
    const chatId = [message.from, message.to].sort().join('_');
    if (!PRIVATE_CHATS[chatId]) {
        PRIVATE_CHATS[chatId] = [];
    }
    
    PRIVATE_CHATS[chatId].push({
        id: Date.now(),
        senderId: message.from,
        senderName: message.fromName,
        type: message.type,
        content: message.content,
        timestamp: message.timestamp,
        read: true
    });
    
    localStorage.setItem('cetcety_private_chats', JSON.stringify(PRIVATE_CHATS));
    loadPrivateMessages();
}

// Kullanıcı engelle
function blockUser() {
    if (!currentPrivateChat || !ACTIVE_USER) return;
    let blockKey = `${ACTIVE_USER.id}_${currentPrivateChat.id}`;
    BLOCKED_USERS[blockKey] = { userId: currentPrivateChat.id, userName: currentPrivateChat.name, expiry: Date.now() + 24 * 60 * 60 * 1000, blockedBy: ACTIVE_USER.id };
    localStorage.setItem('cetcety_blocks', JSON.stringify(BLOCKED_USERS));
    addSystemMessage(`🚫 ${currentPrivateChat.name} 24 saatliğine engellendi.`);
    sendToAdminChannel(`🚫 ${ACTIVE_USER.name}, ${currentPrivateChat.name} kullanıcısını engelledi.`);
    closePrivateChat();
}

// Kullanıcı şikayet et
function reportUser() {
    if (currentPrivateChat) {
        let msg = `⚠️ ${currentPrivateChat.name} kullanıcısı şikayet edildi. Şikayet eden: ${ACTIVE_USER.name}`;
        addSystemMessage(msg);
        sendToAdminChannel(msg);
    }
}

// Private tab değiştir
function switchPrivateTab(tab) {
    if (tab !== 'chat') addSystemMessage('🔜 Bu özellik yakında aktif olacak.');
}
