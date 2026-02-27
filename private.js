// ========== ÖZEL SOHBET LİSTESİ ==========
async function loadPrivateList() {
    const snap = await db.privateChats.once('value');
    const chats = snap.val() || {};
    
    let list = [];
    let unreadCount = 0;
    
    for (let chatId in chats) {
        if (chatId.includes(currentUser.id)) {
            const ids = chatId.replace('chat_', '').split('_');
            const otherId = ids[0] === currentUser.id ? ids[1] : ids[0];
            
            const userSnap = await db.users.child(otherId).once('value');
            const user = userSnap.val();
            if (user) {
                const messages = Object.values(chats[chatId] || {});
                const lastMsg = messages[messages.length - 1];
                const unread = messages.filter(m => m.senderId !== currentUser.id && !m.read).length;
                unreadCount += unread;
                
                list.push({
                    id: otherId,
                    name: user.name,
                    lastMsg: lastMsg ? (lastMsg.type === 'text' ? lastMsg.content : '📎 medya') : '...',
                    time: lastMsg ? formatTime(lastMsg.timestamp) : '',
                    unread: unread
                });
            }
        }
    }
    
    document.getElementById('privateBadge').textContent = unreadCount || '';
    
    let html = '';
    list.sort((a, b) => b.unread - a.unread).forEach(item => {
        html += `
            <div class="private-item" onclick="openPrivateChat('${item.name}')">
                <div class="private-avatar">${item.name.charAt(0)}</div>
                <div class="private-info">
                    <div class="private-name">${item.name}</div>
                    <div class="private-meta">${escapeHTML(item.lastMsg)} • ${item.time}</div>
                </div>
                ${item.unread ? `<div class="badge" style="position:static;">${item.unread}</div>` : ''}
            </div>
        `;
    });
    
    document.getElementById('privateList').innerHTML = html || '<div style="padding:20px; text-align:center;">Henüz özel sohbet yok</div>';
}

// ========== ÖZEL SOHBET AÇ ==========
async function openPrivateChat(username) {
    if (username === currentUser.name) {
        addSystemMessage('❌ Kendinize mesaj gönderemezsiniz!');
        return;
    }
    
    const snap = await db.users.orderByChild('nameLower').equalTo(username.toLowerCase()).once('value');
    let targetUser = null;
    let targetId = null;
    
    snap.forEach(child => {
        targetUser = child.val();
        targetId = child.key;
    });
    
    if (!targetUser) {
        addSystemMessage('❌ Kullanıcı bulunamadı');
        return;
    }
    
    currentPrivateChat = { id: targetId, name: targetUser.name };
    
    document.getElementById('privateName').textContent = targetUser.name;
    document.getElementById('privateChat').classList.add('active');
    
    await loadPrivateMessages(targetId);
}

// ========== ÖZEL MESAJLARI YÜKLE ==========
async function loadPrivateMessages(targetId) {
    const chatId = generateChatId(currentUser.id, targetId);
    const snap = await db.privateChats.child(chatId).orderByChild('timestamp').limitToLast(50).once('value');
    const messages = snap.val() || {};
    
    const container = document.getElementById('privateMessages');
    container.innerHTML = '';
    
    Object.values(messages)
        .sort((a, b) => a.timestamp - b.timestamp)
        .forEach(msg => appendPrivateMessage(msg));
}

// ========== ÖZEL MESAJ EKLE ==========
function appendPrivateMessage(msg) {
    const container = document.getElementById('privateMessages');
    const isMe = msg.senderId === currentUser.id;
    
    const div = document.createElement('div');
    div.className = `private-message ${isMe ? 'right' : ''}`;
    
    if (msg.type === 'text') {
        div.innerHTML = `<div class="private-message-text">${escapeHTML(msg.content)}</div>`;
    } else if (msg.type === 'image') {
        div.innerHTML = `<img src="${escapeHTML(msg.content)}" onclick="window.open(this.src)">`;
    } else if (msg.type === 'video') {
        div.innerHTML = `<video controls src="${escapeHTML(msg.content)}"></video>`;
    }
    
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

// ========== ÖZEL MESAJ GÖNDER ==========
async function sendPrivate() {
    const input = document.getElementById('privateInput');
    const text = input.value.trim();
    
    if (!text || !currentPrivateChat) return;
    
    const chatId = generateChatId(currentUser.id, currentPrivateChat.id);
    
    const msg = {
        senderId: currentUser.id,
        senderName: currentUser.name,
        receiverId: currentPrivateChat.id,
        receiverName: currentPrivateChat.name,
        type: 'text',
        content: text,
        timestamp: Date.now()
    };
    
    await db.privateChats.child(chatId).push(msg);
    input.value = '';
}

// ========== ÖZEL SOHBETİ KAPAT ==========
function closePrivateChat() {
    document.getElementById('privateChat').classList.remove('active');
    currentPrivateChat = null;
}

// ========== RESİM GÖNDER ==========
function uploadPrivateImage() {
    document.getElementById('privateImage').click();
}

document.getElementById('privateImage').addEventListener('change', async (e) => {
    if (!e.target.files?.[0] || !currentPrivateChat) return;
    
    const reader = new FileReader();
    reader.onload = async (ev) => {
        const chatId = generateChatId(currentUser.id, currentPrivateChat.id);
        await db.privateChats.child(chatId).push({
            senderId: currentUser.id,
            senderName: currentUser.name,
            receiverId: currentPrivateChat.id,
            receiverName: currentPrivateChat.name,
            type: 'image',
            content: ev.target.result,
            timestamp: Date.now()
        });
    };
    reader.readAsDataURL(e.target.files[0]);
    e.target.value = '';
});

// ========== VİDEO GÖNDER ==========
function uploadPrivateVideo() {
    document.getElementById('privateVideo').click();
}

document.getElementById('privateVideo').addEventListener('change', async (e) => {
    if (!e.target.files?.[0] || !currentPrivateChat) return;
    
    const reader = new FileReader();
    reader.onload = async (ev) => {
        const chatId = generateChatId(currentUser.id, currentPrivateChat.id);
        await db.privateChats.child(chatId).push({
            senderId: currentUser.id,
            senderName: currentUser.name,
            receiverId: currentPrivateChat.id,
            receiverName: currentPrivateChat.name,
            type: 'video',
            content: ev.target.result,
            timestamp: Date.now()
        });
    };
    reader.readAsDataURL(e.target.files[0]);
    e.target.value = '';
});
