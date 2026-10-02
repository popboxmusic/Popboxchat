/* =====================================================================
   CETCETY – chat.js
   Genel sohbet, özel sohbet, medya, bildirimler, kullanıcı listesi
   ===================================================================== */

let isSendingMessage = false;
let isSendingPrivateMessage = false;
let chatNoticeTimeoutId = null;
let privateChatWith = null;
let currentPrivateChatId = null;

/* ============ GENEL SOHBET ============ */
function showChatNoticeForEntry() {
    const notice = document.querySelector('.chat-notice');
    if (!notice) return;
    if (chatNoticeTimeoutId) clearTimeout(chatNoticeTimeoutId);
    notice.hidden = false;
    chatNoticeTimeoutId = setTimeout(() => { notice.hidden = true; chatNoticeTimeoutId = null; }, 8000);
}
function hideChatNotice() {
    if (chatNoticeTimeoutId) { clearTimeout(chatNoticeTimeoutId); chatNoticeTimeoutId = null; }
    const notice = document.querySelector('.chat-notice');
    if (notice) notice.hidden = true;
}

function autoResize(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
}

function handleEnterKey(event, functionName) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault(); event.stopPropagation();
        if (event.repeat) return;
        if (functionName === 'sendMessage') sendMessage();
        else if (functionName === 'sendPrivateMessage') sendPrivateMessage();
    }
}

async function sendMessage() {
    if (isSendingMessage) return;
    isSendingMessage = true;
    try {
        if (!isFirebaseConnected) { addSystemMessage('❌ Firebase bağlantısı yok!'); return; }
        if (!checkWriteLimit()) { addSystemMessage('⚠️ Günlük mesaj limitine ulaşıldı!'); return; }
        const canSend = await checkBanBeforeMessage(); if (!canSend) return;
        if (await checkGlobalBan(currentUser.name)) { addSystemMessage('🚫 Global banlandınız!'); return; }
        if (isMuted(currentUser.name)) { addSystemMessage('🔇 Susturuldunuz!'); return; }

        const input = document.getElementById('message-input');
        const text = input.value.trim();
        if (!text) return;

        if (text.startsWith('/')) {
            await handleCommand(text);
            input.value = ''; autoResize(input);
            return;
        }

        const messageData = {
            sender: currentUser.name, text: text, type: currentUser.role,
            timestamp: Date.now(),
            time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
            avatar: currentProfileAvatar || null
        };
        await messagesRef.push(messageData);
        incrementWriteCount();
        input.value = ''; autoResize(input);
        if (usersRef) usersRef.child(currentUser.name).update({ lastSeen: Date.now() });
    } finally {
        setTimeout(() => { isSendingMessage = false; }, 300);
    }
}

async function checkBanBeforeMessage() {
    if (!currentUser || !bansRef) return true;
    try {
        const banCheck = await checkIfBanned(currentUser.name);
        if (banCheck.isBanned) { addSystemMessage("🚫 BANLANDINIZ! Mesaj gönderemezsiniz."); return false; }
        if (await checkGlobalBan(currentUser.name)) { addSystemMessage("🚫 GLOBAL BANLANDINIZ!"); return false; }
        return true;
    } catch (error) { return true; }
}

function loadGeneralMessages() {
    if (!messagesRef) return;
    messagesRef.off();
    messagesRef.limitToLast(MESSAGE_LIMIT).on('value', (snapshot) => {
        updateMessages(snapshot.val());
    });
}

function updateMessages(messages) {
    const container = document.getElementById('messages');
    if (!messages) {
        container.innerHTML = '<div class="message-item system">Sohbeti başlatmak için ilk mesajı gönderin.</div>';
        return;
    }
    const messagesArray = Object.entries(messages).map(([id, value]) => ({ id, ...value }));
    messagesArray.sort((a, b) => a.timestamp - b.timestamp);
    container.innerHTML = '';
    messagesArray.slice(-MESSAGE_LIMIT).forEach(msg => appendMessageToUI(msg));
}

function appendMessageToUI(message) {
    const container = document.getElementById('messages');
    if (document.getElementById(`msg_${message.id}`)) return;
    const messageDiv = document.createElement('div');
    messageDiv.className = `message-item ${message.type || 'user'}`;
    messageDiv.id = `msg_${message.id}`;

    let deleteButton = '';
    if (currentUser && (message.sender === currentUser.name || hasRole('operator'))) {
        deleteButton = `<button class="delete-btn" onclick="deleteMessage('${message.id}')"><i class="fas fa-trash"></i></button>`;
    }

    let content = message.text || '';
    if (message.image) content += `<br><img src="${message.image}" class="message-image" onclick="showImageModal('${message.image}')">`;
    if (message.video) content += `<br><video src="${message.video}" controls class="message-video"></video>`;
    if (message.audio) content += `<br><audio src="${message.audio}" controls style="max-width:200px;"></audio>`;

    const userAvatar = message.avatar || (userProfiles[message.sender]?.avatar || null);
    const avatarHtml = userAvatar ? `<img src="${userAvatar}" alt="${message.sender}">` : '';

    const roleInfo = ROLES[message.type] || null;
    const roleBadgeHtml = roleInfo && message.type !== 'user'
        ? `<span class="message-role-badge ${message.type}" title="${roleInfo.label}">${roleInfo.badge}</span>` : '';

    messageDiv.innerHTML = `
        <div class="message-header">
            <div class="message-avatar-column">
                <span class="user-avatar-small">${avatarHtml || '<i class="fas fa-user"></i>'}</span>
            </div>
            <div class="message-body">
                <div class="message-content">
                    <span class="message-user" onclick="openPrivateChat('${message.sender}')">${message.sender}</span>
                    ${roleBadgeHtml}
                    <span class="message-text">${content}</span>
                </div>
            </div>
            <div class="message-meta">
                <span class="message-time">${message.time || '--:--'}</span>
                ${deleteButton}
            </div>
        </div>`;
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
}

async function deleteMessage(messageId) {
    if (!messagesRef || !currentUser) return;
    try {
        const snapshot = await messagesRef.child(messageId).once('value');
        const message = snapshot.val();
        if (!message) return;
        if (message.sender !== currentUser.name && !hasRole('operator')) {
            addSystemMessage('⛔ Sadece kendi mesajlarınızı silebilirsiniz!'); return;
        }
        if (confirm('Bu mesajı silmek istediğinize emin misiniz?')) {
            await messagesRef.child(messageId).remove();
            const messageDiv = document.getElementById(`msg_${messageId}`);
            if (messageDiv) messageDiv.remove();
            incrementWriteCount();
        }
    } catch (error) { addSystemMessage('❌ Mesaj silinemedi!'); }
}

function addSystemMessage(text) {
    const container = document.getElementById('messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message-item system';
    messageDiv.innerHTML = text;
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
}
function addBanMessage(text) { addSystemMessage(text); }

/* ============ ÖZEL SOHBET ============ */
async function openPrivateChat(username) {
    if (username === currentUser.name) { addSystemMessage('Kendinle özel sohbet başlatamazsın!'); return; }
    if (await checkBlockStatus(username)) { addSystemMessage(`⛔ ${username} kullanıcısı sizi engellemiş veya siz engellemişsiniz.`); return; }

    const previousContact = privateChatWith;
    if (privateChatWith && currentPrivateChatId && privateChatsRef) {
        privateChatsRef.child(currentPrivateChatId).off('child_added');
        if (typingRef) typingRef.child(currentPrivateChatId).off('value');
        if (typingTimeout[currentPrivateChatId]) clearTimeout(typingTimeout[currentPrivateChatId]);
    }

    stopPrivateContactListener(username);
    privateChatWith = username;
    currentPrivateChatId = generateChatId(currentUser.name, username);
    document.getElementById('privateWith').innerHTML = `<i class="fas fa-lock"></i> ${username}`;
    document.getElementById('privateModal').style.display = 'flex';
    document.getElementById('overlay').style.display = 'block';
    privateUnreadCounts[username] = 0;
    rememberPrivateContact(username, false);
    if (previousContact && previousContact !== username) startPrivateContactListener(previousContact);
    if (currentUserListTab === 'private') updatePrivateContactListUI();

    const isBlocked = await checkBlockStatus(username);
    const blockBtn = document.getElementById('blockUserBtn');
    blockBtn.innerHTML = isBlocked ? '<i class="fas fa-ban" style="color:var(--online);"></i>' : '<i class="fas fa-ban"></i>';
    blockBtn.title = isBlocked ? 'Engeli Kaldır' : 'Engelle';

    loadPrivateMessages();
    listenForTyping();
}

function loadPrivateMessages() {
    if (!currentPrivateChatId || !privateChatsRef) return;
    const chatId = currentPrivateChatId;
    const chatRef = privateChatsRef.child(chatId);
    const container = document.getElementById('privateMessages');
    container.innerHTML = '<div class="private-empty-state">Yükleniyor...</div>';

    chatRef.limitToLast(10).once('value').then(snapshot => {
        if (currentPrivateChatId !== chatId) return;
        const messages = snapshot.val();
        const existingMessageIds = new Set(Object.keys(messages || {}));
        updatePrivateMessages(messages);

        chatRef.off('child_added');
        chatRef.on('child_added', (snapshot) => {
            if (currentPrivateChatId !== chatId || existingMessageIds.has(snapshot.key)) return;
            existingMessageIds.add(snapshot.key);
            const message = snapshot.val();
            if (message) {
                if (!document.getElementById(`private_msg_${snapshot.key}`)) {
                    if (message.sender !== currentUser.name && !message.isRead) {
                        chatRef.child(snapshot.key).update({ isRead: true, readAt: Date.now() });
                        message.isRead = true;
                    }
                    appendPrivateMessageToUI({ id: snapshot.key, ...message });
                    setTimeout(() => archiveAndTrimPrivateChat(chatId), 100);
                    if (message.sender !== currentUser.name && !message.isNotification && message.sender !== 'System') {
                        notifyIncomingPrivateMessage(privateChatWith, message, snapshot.key);
                    }
                }
            }
        });
    }).catch(error => {
        console.error('Özel mesajlar yüklenemedi:', error);
        container.innerHTML = '<div class="private-empty-state">Mesajlar yüklenemedi.</div>';
    });
}

function updatePrivateMessages(messages) {
    const container = document.getElementById('privateMessages');
    if (!messages) { container.innerHTML = '<div class="private-empty-state">Henüz mesaj yok.</div>'; return; }
    const messagesArray = Object.entries(messages).map(([id, value]) => ({ id, ...value }));
    messagesArray.sort((a, b) => a.timestamp - b.timestamp);
    container.innerHTML = '';
    const now = Date.now();
    const readUpdates = [];
    messagesArray.forEach(msg => {
        if (msg.sender !== currentUser.name && !msg.isRead) {
            readUpdates.push(privateChatsRef.child(currentPrivateChatId).child(msg.id).update({ isRead: true, readAt: now }));
            msg.isRead = true;
        }
        appendPrivateMessageToUI(msg);
    });
    if (readUpdates.length > 0) Promise.all(readUpdates).catch(err => console.warn("Okundu güncelleme hatası:", err));
}

function appendPrivateMessageToUI(message) {
    const container = document.getElementById('privateMessages');
    if (document.getElementById(`private_msg_${message.id}`)) return;
    const emptyState = container.querySelector('.private-empty-state');
    if (emptyState) emptyState.remove();

    const messageDiv = document.createElement('div');
    messageDiv.className = 'message-item private-msg';
    messageDiv.id = `private_msg_${message.id}`;

    let deleteButton = '';
    if (currentUser && message.sender === currentUser.name) {
        deleteButton = `<button class="delete-btn" onclick="deletePrivateMessage('${message.id}', '${currentPrivateChatId}')"><i class="fas fa-trash"></i></button>`;
    }

    let content = message.text || '';
    if (message.image) content += `<br><img src="${message.image}" class="message-image" onclick="showImageModal('${message.image}')">`;
    else if (message.audio) content += `<br><audio src="${message.audio}" controls style="max-width:200px;"></audio>`;

    const userAvatar = message.avatar || (userProfiles[message.sender]?.avatar || null);
    const avatarHtml = userAvatar ? `<img src="${userAvatar}" style="width:20px;height:20px;border-radius:50%;object-fit:cover;">` : '';

    let readStatus = '';
    if (message.sender === currentUser.name) {
        readStatus = message.isRead
            ? ' <span style="color:var(--online); margin-left:4px;"><i class="fas fa-check-double"></i></span>'
            : ' <span style="color:var(--text-muted); margin-left:4px;"><i class="fas fa-check"></i></span>';
    }

    messageDiv.innerHTML = `
        <div class="message-header">
            <span class="message-user">
                ${avatarHtml ? `<span class="user-avatar-small">${avatarHtml}</span>` : '<span class="user-avatar-small"><i class="fas fa-user"></i></span>'}
                ${message.sender}
            </span>
            <div>
                <span class="message-time">${message.time || '--:--'}${readStatus}</span>
                ${deleteButton}
            </div>
        </div>
        <div class="message-content">${content}</div>`;
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
}

async function sendPrivateMessage() {
    if (isSendingPrivateMessage) return;
    isSendingPrivateMessage = true;
    try {
        if (!privateChatWith || !currentPrivateChatId) { alert('❌ Önce bir kullanıcı seçin!'); return; }
        if (!checkWriteLimit()) { addSystemMessage('⚠️ Günlük mesaj limitine ulaşıldı!'); return; }
        if (await checkBlockStatus(privateChatWith)) { alert('Bu kullanıcıya mesaj gönderemezsiniz!'); return; }
        const canSend = await checkBanBeforeMessage(); if (!canSend) return;

        const input = document.getElementById('private-input');
        const text = input.value.trim();
        if (!text) return;

        const messageData = {
            sender: currentUser.name, receiver: privateChatWith, text: text,
            timestamp: Date.now(),
            time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
            avatar: currentProfileAvatar || null, isRead: false
        };
        const sent = await sendPendingMessage(privateChatWith, messageData);
        if (sent) {
            incrementWriteCount();
            input.value = ''; autoResize(input);
            if (typingTimeout[currentPrivateChatId]) clearTimeout(typingTimeout[currentPrivateChatId]);
            if (typingRef) typingRef.child(currentPrivateChatId).child(currentUser.name).remove();
            if (usersRef) usersRef.child(currentUser.name).update({ lastSeen: Date.now() });
            setTimeout(() => archiveAndTrimPrivateChat(currentPrivateChatId), 500);
        }
    } finally { setTimeout(() => { isSendingPrivateMessage = false; }, 300); }
}

function closePrivateChat() {
    const closedContact = privateChatWith;
    if (typeof cameraStream !== 'undefined' && cameraStream) { cameraStream.getTracks().forEach(track => track.stop()); cameraStream = null; }
    if (typeof isAudioRecording !== 'undefined' && isAudioRecording) stopAudioRecording();

    if (privateChatsRef && currentPrivateChatId) privateChatsRef.child(currentPrivateChatId).off('child_added');
    if (typingRef && currentPrivateChatId) typingRef.child(currentPrivateChatId).off('value');
    if (typingTimeout[currentPrivateChatId]) { clearTimeout(typingTimeout[currentPrivateChatId]); delete typingTimeout[currentPrivateChatId]; }

    privateChatWith = null; currentPrivateChatId = null;
    document.getElementById('privateModal').style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
    document.getElementById('private-input').value = '';
    if (closedContact) startPrivateContactListener(closedContact);
    if (currentUserListTab === 'private') updatePrivateContactListUI();
}

/* ============ YAZIYOR GÖSTERGESİ ============ */
let typingTimeout = {};
const TYPING_TIMEOUT_DURATION = 3000;

function emitTyping() {
    if (!currentPrivateChatId || !privateChatWith || !typingRef) return;
    if (typingTimeout[currentPrivateChatId]) clearTimeout(typingTimeout[currentPrivateChatId]);
    typingRef.child(currentPrivateChatId).child(currentUser.name).set(true);
    typingTimeout[currentPrivateChatId] = setTimeout(() => {
        typingRef.child(currentPrivateChatId).child(currentUser.name).remove();
    }, TYPING_TIMEOUT_DURATION);
}

function listenForTyping() {
    if (!currentPrivateChatId || !typingRef) return;
    const privateWithDiv = document.getElementById('privateWith');
    typingRef.child(currentPrivateChatId).off('value');
    typingRef.child(currentPrivateChatId).on('value', (snapshot) => {
        const typingUsers = snapshot.val() || {};
        const isOtherTyping = Object.keys(typingUsers).some(user => user !== currentUser.name);
        const existing = privateWithDiv.querySelector('.private-typing-indicator');
        if (isOtherTyping) {
            if (!existing) {
                const typingSpan = document.createElement('span');
                typingSpan.className = 'private-typing-indicator';
                typingSpan.innerHTML = '<i class="fas fa-ellipsis-h"></i> yazıyor...';
                privateWithDiv.appendChild(typingSpan);
            }
        } else { if (existing) existing.remove(); }
    });
}

/* ============ BEKLEYEN MESAJLAR ============ */
async function sendPendingMessage(toUser, messageData) {
    if (!currentUser || !pendingMessagesRef) return false;
    try {
        await rememberPrivateContact(toUser, true);
        const userSnap = await usersRef.child(toUser).once('value');
        const userData = userSnap.val();
        const isOnline = userData && (Date.now() - (userData.lastSeen || 0) < ONLINE_THRESHOLD);
        if (isOnline) {
            const chatId = generateChatId(currentUser.name, toUser);
            const messageRef = privateChatsRef.child(chatId).push();
            await messageRef.set(messageData);
            await updatePrivateContactMessageIndex(toUser, messageRef.key, messageData);
            return true;
        } else {
            await pendingMessagesRef.child(toUser).child(currentUser.name).push({
                ...messageData, originalTimestamp: messageData.timestamp, isPending: true
            });
            addSystemMessage(`📨 ${toUser} şu an çevrimdışı. Mesajınız kaydedildi.`);
            return true;
        }
    } catch (error) { console.error("Mesaj gönderme hatası:", error); return false; }
}

async function checkPendingMessagesForUser(username) {
    if (!pendingMessagesRef || !username) return;
    const pendingSnap = await pendingMessagesRef.child(username).once('value');
    const pendingData = pendingSnap.val();
    if (pendingData) {
        for (const [sender, messages] of Object.entries(pendingData)) {
            if (messages) {
                for (const [msgId, msgData] of Object.entries(messages)) {
                    const chatId = generateChatId(username, sender);
                    const deliveredMessage = { ...msgData, isPendingDelivered: true, deliveredAt: Date.now() };
                    const deliveredRef = privateChatsRef.child(chatId).push();
                    await deliveredRef.set(deliveredMessage);
                    await pendingMessagesRef.child(username).child(sender).child(msgId).remove();
                    await rememberPrivateContact(sender, false);
                    notifyIncomingPrivateMessage(sender, deliveredMessage, deliveredRef.key);
                }
            }
        }
    }
}

/* ============ ARŞİVLEME ============ */
async function archiveAndTrimPrivateChat(chatId) {
    if (!privateChatsRef || !privateChatsArchiveRef) return;
    try {
        const snapshot = await privateChatsRef.child(chatId).once('value');
        const messages = snapshot.val();
        if (!messages) return;
        const messageArray = Object.entries(messages).map(([id, data]) => ({ id, ...data, timestamp: data.timestamp || Date.now() }));
        messageArray.sort((a, b) => a.timestamp - b.timestamp);
        if (messageArray.length > 10) {
            const messagesToArchive = messageArray.slice(0, messageArray.length - 10);
            for (const oldMessage of messagesToArchive) {
                try {
                    await privateChatsArchiveRef.child(chatId).push({
                        sender: oldMessage.sender, receiver: oldMessage.receiver,
                        text: oldMessage.text || '', image: oldMessage.image || null,
                        audio: oldMessage.audio || null, timestamp: oldMessage.timestamp,
                        time: oldMessage.time, archivedAt: Date.now(),
                        originalMessageId: oldMessage.id
                    });
                    await privateChatsRef.child(chatId).child(oldMessage.id).remove();
                    incrementWriteCount();
                } catch (archiveError) { console.warn("Arşivleme hatası:", archiveError); }
            }
        }
    } catch (error) { console.warn("Arşivleme işlemi sırasında hata:", error); }
}

/* ============ MEDYA ============ */
function openGallery() {
    if (!privateChatWith) { alert('❌ Önce bir kullanıcı ile özel sohbette olmalısınız!'); return; }
    document.getElementById('galleryUpload').click();
}
function openCameraDirect() {
    if (!privateChatWith) { alert('❌ Önce bir kullanıcı ile özel sohbette olmalısınız!'); return; }
    document.getElementById('cameraUpload').click();
}

document.getElementById('galleryUpload').addEventListener('change', handleGalleryUpload);
document.getElementById('cameraUpload').addEventListener('change', handleCameraUpload);

async function handleGalleryUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('❌ Lütfen sadece resim dosyası seçin!'); return; }
    if (!checkWriteLimit()) { addSystemMessage('⚠️ Günlük mesaj limitine ulaşıldı!'); return; }
    if (await checkBlockStatus(privateChatWith)) { alert('Bu kullanıcıya dosya gönderemezsiniz!'); return; }
    const reader = new FileReader();
    reader.onload = async function(event) {
        const imageData = event.target.result;
        try {
            const messageData = {
                sender: currentUser.name, receiver: privateChatWith,
                text: '📸 Resim gönderdi', image: imageData,
                timestamp: Date.now(),
                time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
                isRead: false
            };
            const sent = await sendPendingMessage(privateChatWith, messageData);
            if (sent) {
                incrementWriteCount();
                addNotification(privateChatWith, '📸 Resim gönderdi', 'private');
                await archiveAndTrimPrivateChat(currentPrivateChatId);
            }
        } catch (imageError) { console.error('Resim gönderme hatası:', imageError); alert('❌ Resim gönderilemedi!'); }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
}

async function handleCameraUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('❌ Lütfen sadece resim çekin!'); return; }
    if (!checkWriteLimit()) { addSystemMessage('⚠️ Günlük mesaj limitine ulaşıldı!'); return; }
    if (await checkBlockStatus(privateChatWith)) { alert('Bu kullanıcıya dosya gönderemezsiniz!'); return; }
    const reader = new FileReader();
    reader.onload = async function(event) {
        const imageData = event.target.result;
        try {
            const messageData = {
                sender: currentUser.name, receiver: privateChatWith,
                text: '📸 Kameradan fotoğraf çekti', image: imageData,
                timestamp: Date.now(),
                time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
                isRead: false
            };
            const sent = await sendPendingMessage(privateChatWith, messageData);
            if (sent) { incrementWriteCount(); addNotification(privateChatWith, '📸 Fotoğraf çekti', 'private'); await archiveAndTrimPrivateChat(currentPrivateChatId); }
        } catch (imageError) { console.error('Resim gönderme hatası:', imageError); alert('❌ Resim gönderilemedi!'); }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
}

/* ============ SES KAYDI ============ */
let mediaRecorderAudio = null;
let audioChunks = [];
let audioStream = null;
let isAudioRecording = false;

async function startAudioRecording() {
    if (!privateChatWith) { alert('❌ Önce bir kullanıcı ile özel sohbette olmalısınız!'); return; }
    if (isAudioRecording) { stopAudioRecording(); return; }
    try {
        audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderAudio = new MediaRecorder(audioStream);
        audioChunks = [];
        mediaRecorderAudio.ondataavailable = (event) => { if (event.data.size > 0) audioChunks.push(event.data); };
        mediaRecorderAudio.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
            const reader = new FileReader();
            reader.onload = async function(e) {
                const audioData = e.target.result;
                if (!checkWriteLimit()) { addSystemMessage('⚠️ Günlük mesaj limitine ulaşıldı!'); return; }
                const messageData = {
                    sender: currentUser.name, receiver: privateChatWith,
                    text: '🎤 Sesli mesaj gönderdi', audio: audioData,
                    timestamp: Date.now(),
                    time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
                    isRead: false
                };
                const sent = await sendPendingMessage(privateChatWith, messageData);
                if (sent) { incrementWriteCount(); addNotification(privateChatWith, '🎤 Sesli mesaj gönderdi', 'private'); addSystemMessage('✅ Ses kaydı gönderildi!'); await archiveAndTrimPrivateChat(currentPrivateChatId); }
            };
            reader.readAsDataURL(audioBlob);
            audioStream.getTracks().forEach(track => track.stop());
            isAudioRecording = false;
            const audioBtn = document.querySelector('.audio-record-btn');
            audioBtn.classList.remove('recording');
            audioBtn.innerHTML = '<i class="fas fa-microphone"></i>';
            audioBtn.title = 'Sesli Mesaj Gönder';
        };
        mediaRecorderAudio.start();
        isAudioRecording = true;
        setTimeout(() => { if (isAudioRecording) { stopAudioRecording(); addSystemMessage('⏱️ 5 dakikalık kayıt süresi doldu.'); } }, 300000);
        const audioBtn = document.querySelector('.audio-record-btn');
        audioBtn.classList.add('recording');
        audioBtn.innerHTML = '<i class="fas fa-stop"></i>';
        audioBtn.title = 'Kaydı Durdur';
    } catch (error) { alert('❌ Mikrofona erişilemedi!'); }
}

function stopAudioRecording() {
    if (mediaRecorderAudio && isAudioRecording) { mediaRecorderAudio.stop(); isAudioRecording = false; }
}

/* ============ BLOK ============ */
async function toggleBlockUser() {
    if (!privateChatWith || !currentUser) return;
    const isBlocked = await checkBlockStatus(privateChatWith);
    if (isBlocked) {
        if (confirm(`${privateChatWith} kullanıcısının engelini kaldırmak istiyor musunuz?`)) {
            await blocksRef.child(currentUser.name).child(privateChatWith).remove();
            await blocksRef.child(privateChatWith).child(currentUser.name).remove();
            incrementWriteCount();
            delete cachedBlocks[currentUser.name]?.[privateChatWith];
            delete cachedBlocks[privateChatWith]?.[currentUser.name];
            addSystemMessage(`✅ ${privateChatWith} kullanıcısının engeli kaldırıldı.`);
            const blockBtn = document.getElementById('blockUserBtn');
            blockBtn.innerHTML = '<i class="fas fa-ban"></i>'; blockBtn.title = 'Engelle';
            if (isOwner) updateOwnerBlockListFromCache();
        }
    } else {
        if (confirm(`${privateChatWith} kullanıcısını engellemek istiyor musunuz?`)) {
            const blockUntil = Date.now() + (24 * 60 * 60 * 1000);
            await blocksRef.child(currentUser.name).child(privateChatWith).set({ blockedAt: Date.now(), blockedUntil: blockUntil });
            await blocksRef.child(privateChatWith).child(currentUser.name).set({ blockedAt: Date.now(), blockedUntil: blockUntil });
            incrementWriteCount();
            addSystemMessage(`🚫 ${privateChatWith} kullanıcısı 24 saatliğine engellendi.`);
            const blockBtn = document.getElementById('blockUserBtn');
            blockBtn.innerHTML = '<i class="fas fa-ban" style="color:var(--online);"></i>'; blockBtn.title = 'Engeli Kaldır';
            if (isOwner) updateOwnerBlockListFromCache();
        }
    }
}

function openReportModal() {
    document.getElementById('reportModal').style.display = 'flex';
    document.getElementById('overlay').style.display = 'block';
}
function closeReportModal() {
    document.getElementById('reportModal').style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
}
function submitReport() {
    if (!privateChatWith) { alert('Şikayet edilecek kullanıcı yok!'); return; }
    const reason = document.getElementById('reportReason').value;
    const description = document.getElementById('reportDescription').value.trim();
    reportsRef.push({ reporter: currentUser.name, reportedUser: privateChatWith, reason, description, timestamp: Date.now() });
    incrementWriteCount();
    addSystemMessage(`✅ ${privateChatWith} kullanıcısı şikayet edildi!`);
    closeReportModal();
}

function deletePrivateMessage(messageId, chatId) {
    if (!currentUser) return;
    if (confirm('Bu mesajı silmek istediğinize emin misiniz?')) {
        privateChatsRef.child(chatId).child(messageId).remove();
        incrementWriteCount();
        const msgDiv = document.getElementById(`private_msg_${messageId}`);
        if (msgDiv) msgDiv.remove();
    }
}

/* ============ BİLDİRİMLER ============ */
let notifications = [];
let notificationCount = 0;
let notificationPanelOpen = false;

function toggleNotificationPanel(e) {
    if (e) e.stopPropagation();
    const panel = document.getElementById('notificationPanel');
    notificationPanelOpen = !notificationPanelOpen;
    if (notificationPanelOpen) { panel.classList.add('active'); updateNotificationPanel(); }
    else panel.classList.remove('active');
}
function closeNotificationPanel() {
    document.getElementById('notificationPanel').classList.remove('active');
    notificationPanelOpen = false;
}
function updateNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    if (notificationCount > 0) { badge.textContent = notificationCount > 99 ? '99+' : notificationCount; badge.style.display = 'flex'; }
    else badge.style.display = 'none';
}
function addNotification(sender, message, type = 'private', showToast = false) {
    notificationCount++;
    const notification = {
        id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        sender, message, type,
        time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now(), read: false
    };
    notifications.unshift(notification);
    updateNotificationBadge();
    if (document.hidden || !document.hasFocus()) document.title = `(${notificationCount}) ${originalTitle}`;
    playNotificationSound();
    if (showToast && type === 'private') showPrivateMessageToast(sender, message);
    if (notificationPanelOpen) updateNotificationPanel();
    if (notifications.length > 100) notifications.pop();
}
function updateNotificationPanel() {
    const container = document.getElementById('notificationList');
    if (notifications.length === 0) { container.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted);">Henüz bildirim yok.</div>'; return; }
    let html = '';
    notifications.slice(0, 20).forEach(notif => {
        const icon = notif.type === 'private' ? 'fas fa-lock' : (notif.type === 'admin' ? 'fas fa-exclamation-triangle' : 'fas fa-info-circle');
        html += `<div class="notification-item ${notif.read ? '' : 'unread'}" onclick="handleNotificationClick('${notif.id}')">
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
                <div style="width:24px; height:24px; border-radius:50%; background:var(--bg-tertiary); border:1px solid var(--border-color); display:flex; align-items:center; justify-content:center; font-size:12px;"><i class="${icon}"></i></div>
                <strong style="flex:1; color:${notif.type === 'private' ? '#ff4d4d' : 'inherit'};">${notif.sender}</strong>
                <small style="color:var(--text-muted);">${notif.time}</small>
            </div>
            <div style="font-size:14px;">${notif.message}</div>
        </div>`;
    });
    container.innerHTML = html;
}
function handleNotificationClick(notificationId) {
    const notification = notifications.find(n => n.id === notificationId);
    if (!notification) return;
    notification.read = true;
    if (notification.type === 'private') openPrivateChat(notification.sender);
    updateNotificationPanel();
}
function clearAllNotifications() {
    notifications = []; notificationCount = 0;
    updateNotificationBadge(); updateNotificationPanel();
    document.title = originalTitle;
}
function playNotificationSound() {
    try {
        const sound = document.getElementById('notificationSound');
        sound.currentTime = 0; sound.play().catch(e => {});
    } catch (error) {}
}

function showPrivateMessageToast(sender, message) {
    if (!sender || sender === 'System' || sender === currentUser?.name) return;
    let stack = document.getElementById('privateMessageToastStack');
    if (!stack) {
        stack = document.createElement('div');
        stack.id = 'privateMessageToastStack';
        stack.className = 'private-message-toast-stack';
        stack.setAttribute('aria-live', 'polite');
        document.body.appendChild(stack);
    }
    const toast = document.createElement('button');
    toast.type = 'button'; toast.className = 'private-message-toast';
    toast.setAttribute('aria-label', `Yeni özel mesaj: ${sender}`);
    const senderName = document.createElement('span');
    senderName.className = 'private-message-toast-sender'; senderName.textContent = sender;
    const preview = document.createElement('span');
    preview.className = 'private-message-toast-preview'; preview.textContent = message || 'Yeni özel mesaj';
    toast.append(senderName, preview);
    toast.addEventListener('click', () => { toast.remove(); openPrivateChat(sender); });
    stack.appendChild(toast);
    while (stack.children.length > 3) stack.firstElementChild.remove();
    window.setTimeout(() => toast.remove(), 7000);
}

/* ============ KİŞİ LİSTESİ ============ */
function privateContactsStorageKey() { return currentUser ? `cetcety_private_contacts_${currentUser.name}` : null; }
function savePrivateContactsLocally() {
    const key = privateContactsStorageKey();
    if (!key) return;
    try { localStorage.setItem(key, JSON.stringify(privateContacts)); } catch (error) {}
}
function addPrivateContactToList(username) {
    if (!currentUser || !username || username === currentUser.name) return false;
    if (privateContacts.includes(username)) return false;
    privateContacts.unshift(username);
    savePrivateContactsLocally();
    if (currentUserListTab === 'private') updatePrivateContactListUI();
    return true;
}
function loadPrivateContacts() {
    if (!currentUser) return;
    privateContacts = [];
    try {
        const savedContacts = JSON.parse(localStorage.getItem(privateContactsStorageKey()) || '[]');
        if (Array.isArray(savedContacts)) {
            privateContacts = [...new Set(savedContacts.filter(name => typeof name === 'string' && name && name !== currentUser.name))];
        }
    } catch (error) {}
    if (privateContactsRef) {
        const contactsRef = privateContactsRef.child(currentUser.name);
        if (privateContactsListListener) contactsRef.off('child_added', privateContactsListListener);
        privateContactsListListener = snapshot => {
            if (!snapshot.key || !snapshot.val() || snapshot.key === currentUser.name) return;
            addPrivateContactToList(snapshot.key);
            if (privateChatWith !== snapshot.key) startPrivateContactListener(snapshot.key);
            handlePrivateContactActivity(snapshot.key, snapshot);
        };
        contactsRef.on('child_added', privateContactsListListener, error => console.warn('Özel sohbet listesi okunamadı:', error));
        if (privateContactsChangedListener) contactsRef.off('child_changed', privateContactsChangedListener);
        privateContactsChangedListener = snapshot => { if (snapshot.key) handlePrivateContactActivity(snapshot.key, snapshot); };
        contactsRef.on('child_changed', privateContactsChangedListener, error => console.warn('Özel sohbet güncellemeleri dinlenemedi:', error));
    }
    privateContacts.forEach(username => startPrivateContactListener(username));
    updateUserListUI();
}
async function rememberPrivateContact(username, addToOtherUserList = false) {
    if (!currentUser || !username || username === currentUser.name) return;
    addPrivateContactToList(username);
    const writeTasks = [];
    if (privateContactsRef) {
        const timestamp = Date.now();
        writeTasks.push(upsertPrivateContactRecord(privateContactsRef.child(currentUser.name).child(username), { createdAt: timestamp }));
        if (addToOtherUserList) writeTasks.push(upsertPrivateContactRecord(privateContactsRef.child(username).child(currentUser.name), { createdAt: timestamp }));
    }
    if (writeTasks.length) await Promise.allSettled(writeTasks);
    if (privateChatWith !== username) startPrivateContactListener(username);
}
function upsertPrivateContactRecord(reference, data) {
    return reference.update(data).catch(() => reference.set(data));
}
async function updatePrivateContactMessageIndex(username, messageId, message) {
    if (!privateContactsRef || !currentUser || !username || !messageId) return;
    const activity = { lastMessageId: messageId, lastMessageAt: (message && message.timestamp) || Date.now() };
    const timestamp = Date.now();
    const references = [
        privateContactsRef.child(currentUser.name).child(username),
        privateContactsRef.child(username).child(currentUser.name)
    ];
    await Promise.allSettled(references.map(reference =>
        reference.update(activity).catch(() => reference.set({ createdAt: timestamp, ...activity }))
    ));
}
function notifyIncomingPrivateMessage(username, message, messageId) {
    if (!currentUser || !message || !messageId || message.sender === currentUser.name || message.isNotification || message.sender === 'System') return;
    const chatId = generateChatId(currentUser.name, username);
    const alertId = `${chatId}/${messageId}`;
    if (privateAlertedMessageIds.has(alertId)) return;
    privateAlertedMessageIds.add(alertId);
    if (privateAlertedMessageIds.size > 500) privateAlertedMessageIds.delete(privateAlertedMessageIds.values().next().value);
    if (privateChatWith !== username) {
        privateUnreadCounts[username] = (privateUnreadCounts[username] || 0) + 1;
        if (currentUserListTab === 'private') updatePrivateContactListUI();
    }
    addNotification(message.sender || username, privateMessagePreview(message), 'private', true);
}
function handlePrivateContactActivity(username, snapshot) {
    if (!currentUser || !privateChatsRef || !username || username === currentUser.name) return;
    const contact = snapshot.val();
    if (!contact || !contact.lastMessageId || !contact.lastMessageAt || contact.lastMessageAt < userSessionStartedAt || privateChatWith === username) return;
    const chatId = generateChatId(currentUser.name, username);
    privateChatsRef.child(chatId).child(contact.lastMessageId).once('value').then(messageSnapshot => {
        const message = messageSnapshot.val();
        if (message) notifyIncomingPrivateMessage(username, message, contact.lastMessageId);
    }).catch(error => console.warn('Yeni özel mesaj alınamadı:', error));
}
function privateMessagePreview(message) {
    if (message && message.image) return '📷 Fotoğraf gönderdi';
    if (message && message.audio) return '🎤 Sesli mesaj gönderdi';
    return (message && message.text) || 'Yeni mesaj';
}
function startPrivateContactListener(username) {
    if (!currentUser || !privateChatsRef || !username || username === currentUser.name || username === privateChatWith || privateContactListeners[username]) return;
    const chatId = generateChatId(currentUser.name, username);
    const query = privateChatsRef.child(chatId).limitToLast(1);
    const entry = { query, listener: null };
    privateContactListeners[username] = entry;
    query.once('value').then(snapshot => {
        if (privateContactListeners[username] !== entry || privateChatWith === username) return;
        const initialIds = new Set(Object.keys(snapshot.val() || {}));
        entry.listener = messageSnapshot => {
            if (initialIds.has(messageSnapshot.key)) { initialIds.delete(messageSnapshot.key); return; }
            const message = messageSnapshot.val();
            if (!message || !message.sender || message.sender === currentUser.name || message.isNotification || message.sender === 'System') return;
            notifyIncomingPrivateMessage(username, message, messageSnapshot.key);
        };
        query.on('child_added', entry.listener, error => console.warn('Özel mesaj bildirimi dinlenemedi:', error));
    }).catch(error => { if (privateContactListeners[username] === entry) delete privateContactListeners[username]; });
}
function stopPrivateContactListener(username) {
    const entry = privateContactListeners[username];
    if (!entry) return;
    if (entry.listener) entry.query.off('child_added', entry.listener);
    delete privateContactListeners[username];
}

function updatePrivateContactListUI() {
    const container = document.getElementById('userListContainer');
    if (!container) return;
    const now = Date.now();
    const contacts = [...new Set(privateContacts)]
        .filter(username => username !== currentUser?.name)
        .map(username => {
            const userData = cachedOnlineUsers[username] || null;
            const hiddenOwner = username === SECURE_CONFIG.OWNER_CONFIG.username && userData && userData.isHidden &&
                (!currentUser || currentUser.name !== SECURE_CONFIG.OWNER_CONFIG.username);
            const isOnline = !!userData && now - (userData.lastSeen || 0) < ONLINE_THRESHOLD;
            return { username, userData, hiddenOwner, isOnline };
        })
        .filter(contact => !contact.hiddenOwner)
        .sort((a, b) =>
            Number(b.isOnline) - Number(a.isOnline) ||
            (privateUnreadCounts[b.username] || 0) - (privateUnreadCounts[a.username] || 0) ||
            a.username.localeCompare(b.username)
        );
    container.replaceChildren();
    if (!contacts.length) {
        const empty = document.createElement('div');
        empty.className = 'private-empty-state';
        empty.textContent = 'Henüz özel sohbet yok. Bir kullanıcıya özel mesaj gönderdiğinizde burada görünür.';
        container.appendChild(empty);
        return;
    }
    contacts.forEach(contact => {
        const item = document.createElement('div');
        item.className = 'user-item'; item.setAttribute('role', 'button'); item.tabIndex = 0;
        item.addEventListener('click', () => openPrivateChat(contact.username));
        const identity = document.createElement('div');
        identity.className = 'user-status';
        const dot = document.createElement('span');
        dot.className = `private-contact-dot ${contact.isOnline ? 'online' : 'offline'}`;
        const avatar = document.createElement('div');
        avatar.className = 'user-avatar-sidebar';
        const avatarUrl = userProfiles[contact.username]?.avatar;
        if (avatarUrl) { const image = document.createElement('img'); image.src = avatarUrl; image.alt = ''; avatar.appendChild(image); }
        else { const icon = document.createElement('i'); icon.className = 'fas fa-user'; avatar.appendChild(icon); }
        const name = document.createElement('strong'); name.textContent = contact.username;
        identity.append(dot, avatar, name);
        const meta = document.createElement('div');
        meta.className = 'private-contact-meta';
        const status = document.createElement('span');
        status.textContent = contact.isOnline ? 'Çevrimiçi' : 'Çevrimdışı';
        meta.appendChild(status);
        const unreadCount = privateUnreadCounts[contact.username] || 0;
        if (unreadCount > 0) {
            const badge = document.createElement('span');
            badge.className = 'private-unread-count';
            badge.textContent = unreadCount > 99 ? '99+' : String(unreadCount);
            meta.appendChild(badge);
        }
        item.append(identity, meta);
        container.appendChild(item);
    });
}

function updateUserListUI() {
    const container = document.getElementById('userListContainer');
    if (!container) return;
    if (currentUserListTab === 'private') { updatePrivateContactListUI(); return; }
    const now = Date.now();
    let usersToDisplay = [];
    Object.entries(cachedOnlineUsers).forEach(([username, userData]) => {
        if (!userData) return;
        if (username === SECURE_CONFIG.OWNER_CONFIG.username && userData.isHidden &&
            (!currentUser || currentUser.name !== SECURE_CONFIG.OWNER_CONFIG.username)) return;
        const timeDiff = now - (userData.lastSeen || 0);
        if (timeDiff < ONLINE_THRESHOLD) {
            usersToDisplay.push({ username, userData, isOnline: true, secondsAgo: Math.floor(timeDiff / 1000), rolePriority: getRolePriority(username) });
        }
    });
    usersToDisplay.sort((a, b) => {
        if (a.rolePriority !== b.rolePriority) return a.rolePriority - b.rolePriority;
        return a.secondsAgo - b.secondsAgo;
    });
    if (usersToDisplay.length === 0) { container.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding:20px;">Listelenecek kullanıcı yok.</div>'; return; }
    let html = '';
    usersToDisplay.forEach(user => {
        const isOwnerUser = user.username === SECURE_CONFIG.OWNER_CONFIG.username;
        let badgeHtml = '';
        if (isOwnerUser) badgeHtml = '<span class="badge owner" style="display:flex; width:18px; height:18px; font-size:9px;"><i class="fas fa-crown"></i></span>';
        else if (adminList.includes(user.username) || SECURE_CONFIG.DEFAULT_ADMINS.includes(user.username)) badgeHtml = '<span class="badge admin" style="display:flex; width:18px; height:18px; font-size:9px;"><i class="fas fa-shield-alt"></i></span>';
        else if (coAdminList.includes(user.username)) badgeHtml = '<span class="badge coadmin" style="display:flex; width:18px; height:18px; font-size:9px;"><i class="fas fa-users"></i></span>';
        else if (operatorList.includes(user.username)) badgeHtml = '<span class="badge operator" style="display:flex; width:18px; height:18px; font-size:9px;"><i class="fas fa-bolt"></i></span>';
        else if (verifiedList.includes(user.username)) badgeHtml = '<span class="badge verified" style="display:flex; width:18px; height:18px; font-size:9px;"><i class="fas fa-check-circle"></i></span>';
        const userAvatar = userProfiles[user.username]?.avatar || null;
        const avatarHtml = userAvatar ? `<img src="${userAvatar}" style="width:100%;height:100%;object-fit:cover;">` : '';
        let statusText = user.secondsAgo > 10 ? ` (${user.secondsAgo}sn)` : ' (Şimdi)';
        html += `<div class="user-item" onclick="openPrivateChat('${user.username}')">
            <div class="user-status">
                <span class="status-dot ${user.isOnline ? 'status-online' : 'status-idle'}"></span>
                <div class="user-avatar-sidebar">${avatarHtml || '<i class="fas fa-user"></i>'}</div>
                <strong style="display:flex; align-items:center; gap:4px; flex-wrap:wrap;">${badgeHtml}${user.username}</strong>
            </div>
            <div style="font-size:12px; color:var(--text-muted);">${statusText}</div>
        </div>`;
    });
    container.innerHTML = html;
}

function switchUserListTab(tab) {
    if (tab !== 'all' && tab !== 'private') return;
    currentUserListTab = tab;
    document.querySelectorAll('.users-tab-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.userListTab === tab));
    updateUserListUI();
}
function getRolePriority(username) {
    if (username === SECURE_CONFIG.OWNER_CONFIG.username) return 1;
    if (adminList.includes(username) || SECURE_CONFIG.DEFAULT_ADMINS.includes(username)) return 2;
    if (coAdminList.includes(username)) return 3;
    if (operatorList.includes(username)) return 4;
    if (verifiedList.includes(username)) return 5;
    return 6;
}
function toggleUserList() {
    const sidebar = document.getElementById('usersSidebar');
    sidebar.classList.toggle('active');
    if (sidebar.classList.contains('active')) updateUserListUI();
}

/* ============ KOMUT İŞLEME ============ */
async function handleCommand(cmd) {
    const parts = cmd.substring(1).split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    if (customCommands[command]) {
        const cmdData = customCommands[command];
        let hasPermission = false;
        switch(cmdData.role) {
            case 'all': hasPermission = true; break;
            case 'verified': hasPermission = hasRole('verified'); break;
            case 'operator': hasPermission = hasRole('operator'); break;
            case 'coadmin': hasPermission = hasRole('coadmin'); break;
            case 'admin': hasPermission = hasRole('admin'); break;
            case 'owner': hasPermission = hasRole('owner'); break;
        }
        if (hasPermission) addSystemMessage(cmdData.response);
        else addSystemMessage("⛔ Bu komutu kullanma yetkiniz yok!");
        return;
    }

    switch(command) {
        case 'globalban':
            if (!hasRole('admin')) { addSystemMessage('⛔ Yetkiniz yok!'); return; }
            if (args.length >= 1) await globalBanUser(args[0], args[1] ? parseInt(args[1]) : 0, args.slice(2).join(' ') || 'Belirtilmemiş');
            else addSystemMessage('Kullanım: /globalban [kullanıcı] [dakika(0=süresiz)] [sebep]');
            break;
        case 'removeglobalban':
            if (!hasRole('admin')) return;
            if (args.length === 1) await removeGlobalBan(args[0]);
            break;
        case 'mute':
            if (!hasRole('admin')) { addSystemMessage('⛔ Yetkiniz yok!'); return; }
            if (args.length >= 1) await muteUser(args[0], args[1] ? parseInt(args[1]) : 10, args.slice(2).join(' ') || 'Mute');
            break;
        case 'unmute':
            if (!hasRole('admin')) { addSystemMessage('⛔ Yetkiniz yok!'); return; }
            if (args.length === 1) await unmuteUser(args[0]);
            break;
        case 'temizle':
            if (!hasRole('coadmin')) { addSystemMessage('⛔ Sadece yetkililer tüm mesajları temizleyebilir!'); return; }
            if (confirm('TÜM mesajları temizlemek istediğinize emin misiniz?')) {
                await messagesRef.remove();
                document.getElementById('messages').innerHTML = '<div class="message-item system">✅ Tüm mesajlar temizlendi!</div>';
                addSystemMessage('✅ Tüm mesajlar temizlendi!');
            }
            break;
        case 'ozelokuma': case 'özelokuma':
            if (!hasRole('owner')) { addSystemMessage("⛔ Sadece Owner!"); return; }
            showAllPrivateChats(); break;
        case 'ozelara': case 'özelara':
            if (!hasRole('owner')) { addSystemMessage("⛔ Sadece Owner!"); return; }
            if (args.length === 0) { addSystemMessage("Kullanım: /özelara [kelime]"); return; }
            document.getElementById('searchQuery').value = args.join(' '); searchPrivateMessages(); break;
        case 'ozeltemizle': case 'özeltemizle':
            if (!hasRole('owner')) { addSystemMessage("⛔ Sadece Owner!"); return; }
            deleteAllPrivateMessages(); break;
        case 'komut': openCommandModal(); break;
        case 'komutlar':
            const cmds = Object.entries(customCommands);
            if (cmds.length === 0) { addSystemMessage("🤖 Henüz özel komut yok."); return; }
            let list = "🤖 <strong>ÖZEL KOMUTLAR:</strong><br>";
            cmds.forEach(([cmdName, cmdData]) => { list += `<br><strong>/${cmdName}</strong> - ${cmdData.role}`; });
            addSystemMessage(list); break;
        case 'sikayetler': case 'reports':
            if (!hasRole('admin')) { addSystemMessage("⛔ Sadece adminler!"); return; }
            showReports(); break;
        case 'ownerpanel': case 'op':
            if (!hasRole('owner')) { addSystemMessage("⛔ Sadece owner!"); return; }
            toggleOwnerPanel(); break;
        case 'adminpanel': case 'ap':
            if (!hasRole('admin')) { addSystemMessage("⛔ Sadece adminler!"); return; }
            toggleAdminPanel(); break;
        case 'coadminpanel': case 'cap':
            if (!hasRole('coadmin')) { addSystemMessage("⛔ Sadece co-adminler!"); return; }
            toggleCoAdminPanel(); break;
        case 'operatorpanel': case 'opanel':
            if (!hasRole('operator')) { addSystemMessage("⛔ Sadece operatörler!"); return; }
            toggleOperatorPanel(); break;
        case 'verifiedpanel': case 'vpanel':
            if (!hasRole('verified')) { addSystemMessage("⛔ Sadece onaylı kullanıcılar!"); return; }
            toggleVerifiedPanel(); break;
        case 'info':
            if (!hasRole('coadmin')) { addSystemMessage('⛔ Yetkiniz yok!'); return; }
            if (args.length >= 2) {
                const targetUser = args[0]; const message = args.slice(1).join(' ');
                const chatId = generateChatId(currentUser.name, targetUser);
                await privateChatsRef.child(chatId).push({
                    sender: currentUser.name, receiver: targetUser,
                    text: `📢 Yönetici Bildirimi: ${message}`,
                    timestamp: Date.now(),
                    time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
                    isNotification: true
                });
                addSystemMessage(`✅ ${targetUser} kullanıcısına bildirim gönderildi!`);
            } else addSystemMessage('Kullanım: /info [kullanıcı] [mesaj]');
            break;
        case 'reg': case 'register':
            if (!hasRole('admin')) { addSystemMessage('⛔ Sadece adminler!'); return; }
            openAdminRegisterModal(); break;
        case 'verified': case 'onayla':
            if (!hasRole('admin')) { addSystemMessage('⛔ Sadece adminler!'); return; }
            if (args.length === 1) { await addToRoleList('verified', args[0]); addSystemMessage(`✅ ${args[0]} onaylı yapıldı!`); }
            break;
        case 'unverified': case 'onaykaldir':
            if (!hasRole('admin')) { addSystemMessage('⛔ Sadece adminler!'); return; }
            if (args.length === 1) { await removeFromRoleList('verified', args[0]); addSystemMessage(`✅ ${args[0]} onaylılıktan çıkarıldı!`); }
            break;
        case 'coadmin':
            if (!hasRole('admin')) { addSystemMessage('⛔ Sadece adminler!'); return; }
            if (args.length === 1) {
                await addToRoleList('coadmin', args[0]);
                await registeredUsersRef.child(args[0]).set({ password: 'coadmin123', role: 'coadmin', registeredBy: currentUser.name, registeredAt: Date.now(), isRegistered: true }, { merge: true });
                addSystemMessage(`✅ ${args[0]} co-admin yapıldı!`);
            }
            break;
        case 'removecoadmin':
            if (!hasRole('admin')) { addSystemMessage('⛔ Sadece adminler!'); return; }
            if (args.length === 1) { await removeFromRoleList('coadmin', args[0]); addSystemMessage(`✅ ${args[0]} kaldırıldı!`); }
            break;
        case 'opglobal': case 'operatorglobal':
            if (!hasRole('admin')) { addSystemMessage('⛔ Sadece adminler!'); return; }
            if (args.length === 1) {
                await addToRoleList('operator', args[0]);
                await registeredUsersRef.child(args[0]).set({ password: 'operator123', role: 'operator', registeredBy: currentUser.name, registeredAt: Date.now(), isRegistered: true }, { merge: true });
                addSystemMessage(`✅ ${args[0]} operatör yapıldı!`);
            }
            break;
        case 'deopglobal':
            if (!hasRole('admin')) { addSystemMessage('⛔ Sadece adminler!'); return; }
            if (args.length === 1) { await removeFromRoleList('operator', args[0]); addSystemMessage(`✅ ${args[0]} operatörlükten alındı!`); }
            break;
        case 'kick': case 'süreliban':
            if (!hasRole('operator')) { addSystemMessage('⛔ Yetkiniz yok!'); return; }
            if (args.length >= 1) await kickUser(args[0], args[1] || 5, args.slice(2).join(' ') || "Belirtilmemiş");
            break;
        case 'unban':
            if (!hasRole('operator')) { addSystemMessage('⛔ Yetkiniz yok!'); return; }
            if (args.length === 1) await unbanUser(args[0]);
            break;
        case 'banlist': await showBanList(); break;
        case 'sil':
            if (!hasRole('operator')) { addSystemMessage('⛔ Yetkiniz yok!'); return; }
            if (args.length === 1) await deleteMessage(args[0]);
            break;
        case 'kullanıcılar': case 'users': case 'list': case 'online': showFirebaseUsers(); break;
        case 'yardım': case 'help': showHelp(); break;
        case 'ping': addSystemMessage('🏓 Pong! Bağlantı aktif.'); break;
        case 'çıkış': case 'exit': case 'logout': case 'quit': logout(); break;
        default: addSystemMessage(`❌ Bilinmeyen komut: ${command}`);
    }
}

async function showReports() {
    if (!hasRole('admin')) return;
    try {
        const snapshot = await reportsRef.once('value');
        const reports = snapshot.val() || {};
        if (Object.keys(reports).length === 0) { addSystemMessage('📋 Hiç şikayet yok.'); return; }
        let reportList = '📋 <strong>ŞİKAYETLER:</strong><br><br>';
        Object.entries(reports).forEach(([id, report]) => {
            reportList += `<strong>${report.reportedUser}</strong> - ${report.reason}<br>Şikayet Eden: ${report.reporter}<br>Açıklama: ${report.description || 'Yok'}<br>Tarih: ${new Date(report.timestamp).toLocaleString('tr-TR')}<br><br>`;
        });
        addSystemMessage(reportList);
    } catch (error) { addSystemMessage('❌ Şikayetler alınamadı!'); }
}

function showFirebaseUsers() {
    if (!usersRef) return;
    usersRef.once('value', (snapshot) => {
        const users = snapshot.val() || {};
        let list = '🔥 <strong>Online Kullanıcılar:</strong><br>';
        const now = Date.now();
        Object.entries(users).forEach(([username, userData]) => {
            if (!userData) return;
            if (username === SECURE_CONFIG.OWNER_CONFIG.username && userData.isHidden && (!currentUser || currentUser.name !== SECURE_CONFIG.OWNER_CONFIG.username)) return;
            const timeDiff = now - (userData.lastSeen || 0);
            if (timeDiff < ONLINE_THRESHOLD) {
                const secondsAgo = Math.floor(timeDiff / 1000);
                list += `• ${username} (${getRoleLabel(userData.role || 'user')}, ${secondsAgo}sn önce) <br>`;
            }
        });
        addSystemMessage(list);
    });
}

function showHelp() {
    let help = '🔥 <strong>TÜM KOMUTLAR:</strong><br><br>';
    help += '👑 <strong>OWNER:</strong> /ownerpanel /özelokuma /özelara /özeltemizle /komut<br>';
    help += '⭐️ <strong>ADMIN:</strong> /adminpanel /globalban /removeglobalban /info /reg /verified /unverified /coadmin /removecoadmin /opglobal /deopglobal<br>';
    help += '🔰 <strong>CO-ADMIN:</strong> /coadminpanel /mute /unmute /temizle /kick /unban /banlist /sikayetler<br>';
    help += '⚡️ <strong>OPERATÖR:</strong> /operatorpanel /mute /unmute<br>';
    help += '✅ <strong>ONAYLI:</strong> /verifiedpanel<br>';
    help += '👤 <strong>HERKES:</strong> /kullanıcılar /yardım /ping /çıkış';
    addSystemMessage(help);
}

/* ============ SOHBET GÖRÜNÜM AYARLARI ============ */
function toggleChatPopover(id) {
    const target = document.getElementById(id);
    if (!target) return;
    ['chatRoomPopover', 'chatOverflowMenu', 'chatEmojiPicker'].forEach(popoverId => {
        const popover = document.getElementById(popoverId);
        if (popover && popoverId !== id) popover.hidden = true;
    });
    target.hidden = !target.hidden;
}
function insertChatEmoji(emoji) {
    const input = document.getElementById('message-input');
    if (!input) return;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    input.value = input.value.slice(0, start) + emoji + input.value.slice(end);
    const cursor = start + emoji.length;
    input.focus(); input.setSelectionRange(cursor, cursor); autoResize(input);
    const picker = document.getElementById('chatEmojiPicker');
    if (picker) picker.hidden = true;
}
function showChatRules() {
    document.getElementById('chatOverflowMenu').hidden = true;
    document.getElementById('chatRoomPopover').hidden = true;
    alert('Gizliliğinizi koruyun: telefon numarası, adres ve diğer kişisel bilgilerinizi paylaşmayın. Sohbette saygılı olun ve topluluk kurallarına uyun.');
}
function refreshChatMessages() {
    document.getElementById('chatOverflowMenu').hidden = true;
    loadGeneralMessages();
}
function closeChatPanel() {
    const chat = document.getElementById('chatContainer');
    const input = document.getElementById('message-input');
    if (input && document.activeElement === input) input.blur();
    chat.classList.remove('chat-expanded', 'chat-dragging', 'keyboard-open');
    chat.style.removeProperty('--chat-drag-top');
    chat.style.removeProperty('--chat-drag-height');
    document.body.classList.remove('mobile-chat-keyboard-open');
    chat.classList.add('chat-collapsed');
    document.getElementById('chatReopenButton').classList.add('visible');
    hideChatNotice();
    ['chatRoomPopover', 'chatOverflowMenu', 'chatEmojiPicker'].forEach(id => {
        const popover = document.getElementById(id);
        if (popover) popover.hidden = true;
    });
}
function openChatPanel() {
    document.getElementById('chatContainer').classList.remove('chat-collapsed');
    document.getElementById('chatReopenButton').classList.remove('visible');
    showChatNoticeForEntry();
}

function showImageModal(imageData) {
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.98);z-index:4000;display:flex;justify-content:center;align-items:center;cursor:pointer;';
    const img = document.createElement('img');
    img.src = imageData;
    img.style.cssText = 'max-width:90%;max-height:90%;border-radius:12px;';
    modal.appendChild(img);
    modal.onclick = () => document.body.removeChild(modal);
    document.body.appendChild(modal);
}

/* ============ MOBİL SOHBET SHEET ============ */
function initializeMobileChatSheet() {
    const chat = document.getElementById('chatContainer');
    const handle = document.getElementById('chatDragHandle');
    const input = document.getElementById('message-input');
    if (!chat || !handle || !input) return;

    const mobileQuery = window.matchMedia('(max-width: 768px)');
    const root = document.documentElement;
    let pointerActive = false, pointerStartY = 0, startedExpanded = false;
    let crossedDragThreshold = false, dragTop = 0;
    let keyboardExpandedBeforeFocus = false, manualGestureDuringKeyboard = false;
    let ignoreClickUntil = 0;

    function getMobileViewportHeight() {
        return parseFloat(root.style.getPropertyValue('--mobile-viewport-height')) || window.innerHeight;
    }
    function setExpanded(expanded) {
        if (!mobileQuery.matches) { chat.classList.remove('chat-expanded'); handle.setAttribute('aria-expanded', 'false'); return; }
        chat.classList.toggle('chat-expanded', expanded);
        handle.setAttribute('aria-expanded', String(expanded));
        handle.setAttribute('aria-label', expanded ? 'Sohbeti küçült' : 'Sohbeti tam ekrana al');
    }
    function updateMobileViewport() {
        if (!mobileQuery.matches) {
            root.style.removeProperty('--mobile-viewport-height');
            root.style.removeProperty('--mobile-viewport-offset');
            root.style.removeProperty('--mobile-video-height');
            root.style.removeProperty('--mobile-chat-height');
            chat.classList.remove('chat-expanded', 'chat-dragging', 'keyboard-open');
            chat.style.removeProperty('--chat-drag-top');
            chat.style.removeProperty('--chat-drag-height');
            document.body.classList.remove('mobile-chat-keyboard-open');
            handle.setAttribute('aria-expanded', 'false');
            return;
        }
        const viewport = window.visualViewport;
        const height = Math.max(1, Math.round(viewport ? viewport.height : window.innerHeight));
        const offset = Math.max(0, Math.round(viewport ? viewport.offsetTop : 0));
        root.style.setProperty('--mobile-viewport-height', `${height}px`);
        root.style.setProperty('--mobile-viewport-offset', `${offset}px`);
        root.style.setProperty('--mobile-video-height', `${Math.round(height * 0.36)}px`);
        root.style.setProperty('--mobile-chat-height', `${Math.round(height * 0.64)}px`);
    }
    function onMobileInputFocus() {
        if (!mobileQuery.matches) return;
        keyboardExpandedBeforeFocus = chat.classList.contains('chat-expanded');
        manualGestureDuringKeyboard = false;
        chat.classList.add('keyboard-open');
        document.body.classList.add('mobile-chat-keyboard-open');
        setExpanded(true); updateMobileViewport();
    }
    function onMobileInputBlur() {
        if (!mobileQuery.matches) return;
        window.setTimeout(() => {
            if (document.activeElement === input) return;
            chat.classList.remove('keyboard-open');
            document.body.classList.remove('mobile-chat-keyboard-open');
            if (!manualGestureDuringKeyboard && !chat.classList.contains('chat-collapsed')) setExpanded(keyboardExpandedBeforeFocus);
            manualGestureDuringKeyboard = false;
            updateMobileViewport();
        }, 180);
    }
    handle.addEventListener('pointerdown', event => {
        if (!mobileQuery.matches) return;
        pointerActive = true; crossedDragThreshold = false;
        pointerStartY = event.clientY;
        startedExpanded = chat.classList.contains('chat-expanded');
        if (document.activeElement === input) { manualGestureDuringKeyboard = true; input.blur(); }
        const viewportHeight = getMobileViewportHeight();
        const collapsedTop = viewportHeight * 0.36;
        dragTop = startedExpanded ? 0 : collapsedTop;
        chat.classList.add('chat-dragging');
        chat.style.setProperty('--chat-drag-top', `${Math.round(dragTop)}px`);
        chat.style.setProperty('--chat-drag-height', `${Math.round(viewportHeight - dragTop)}px`);
        try { handle.setPointerCapture(event.pointerId); } catch (_) {}
        event.preventDefault();
    });
    handle.addEventListener('pointermove', event => {
        if (!pointerActive || !mobileQuery.matches) return;
        const movement = event.clientY - pointerStartY;
        if (Math.abs(movement) >= 12) crossedDragThreshold = true;
        const viewportHeight = getMobileViewportHeight();
        const collapsedTop = viewportHeight * 0.36;
        dragTop = Math.max(0, Math.min(collapsedTop, startedExpanded ? movement : collapsedTop + movement));
        chat.style.setProperty('--chat-drag-top', `${Math.round(dragTop)}px`);
        chat.style.setProperty('--chat-drag-height', `${Math.round(viewportHeight - dragTop)}px`);
        event.preventDefault();
    });
    function finishHandleGesture(event) {
        if (!pointerActive) return;
        pointerActive = false;
        if (event && event.type === 'pointerup') {
            if (mobileQuery.matches) {
                const collapsedTop = getMobileViewportHeight() * 0.36;
                const expand = crossedDragThreshold ? dragTop < collapsedTop / 2 : !startedExpanded;
                chat.classList.remove('chat-dragging');
                chat.style.removeProperty('--chat-drag-top');
                chat.style.removeProperty('--chat-drag-height');
                setExpanded(expand);
            }
            ignoreClickUntil = Date.now() + 500;
        } else {
            chat.classList.remove('chat-dragging');
            chat.style.removeProperty('--chat-drag-top');
            chat.style.removeProperty('--chat-drag-height');
            setExpanded(startedExpanded);
        }
    }
    handle.addEventListener('pointerup', finishHandleGesture);
    handle.addEventListener('pointercancel', finishHandleGesture);
    handle.addEventListener('click', event => {
        if (!mobileQuery.matches) return;
        if (Date.now() < ignoreClickUntil) { event.preventDefault(); return; }
        setExpanded(!chat.classList.contains('chat-expanded'));
    });
    input.addEventListener('focus', onMobileInputFocus);
    input.addEventListener('blur', onMobileInputBlur);
    window.addEventListener('resize', updateMobileViewport, { passive: true });
    window.addEventListener('orientationchange', updateMobileViewport, { passive: true });
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', updateMobileViewport, { passive: true });
        window.visualViewport.addEventListener('scroll', updateMobileViewport, { passive: true });
    }
    if (mobileQuery.addEventListener) mobileQuery.addEventListener('change', updateMobileViewport);
    else if (mobileQuery.addListener) mobileQuery.addListener(updateMobileViewport);
    updateMobileViewport();
}

document.addEventListener('click', function(event) {
    if (event.target.closest('.chat-header, .chat-input-area')) return;
    ['chatRoomPopover', 'chatOverflowMenu', 'chatEmojiPicker'].forEach(id => {
        const popover = document.getElementById(id);
        if (popover) popover.hidden = true;
    });
});