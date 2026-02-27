// ========== KANALA KATIL ==========
async function joinChannel(channelName) {
    const snap = await db.channels.child(channelName).once('value');
    const channel = snap.val();
    if (!channel) return;

    // Eski kanaldan ayrıl
    await removeFromChannel(currentChannel);
    
    currentChannel = channelName;
    await addToChannel(channelName);
    await db.users.child(currentUser.id).update({ currentChannel: channelName });

    // UI güncelle
    document.getElementById('currentChannel').textContent = channelName;
    document.getElementById('onlineCount').textContent = channel.onlineCount || 0;
    
    updateSubscribeButton();
    startMessageListener();
    
    addSystemMessage(`📢 #${channelName} kanalına katıldın!`);
}

// ========== KANALA EKLE ==========
async function addToChannel(channelName) {
    const snap = await db.channels.child(channelName).once('value');
    let channel = snap.val() || {
        name: channelName,
        owner: 'MateKy',
        ownerRole: 'owner',
        coAdmins: [],
        subscribers: 1,
        online: {},
        onlineCount: 0,
        youtube: {
            current: 'jfKfPfyJRdk',
            title: 'CETCETY Radio',
            artist: 'MateKy',
            playlist: []
        }
    };
    
    if (!channel.online) channel.online = {};
    channel.online[currentUser.id] = true;
    channel.onlineCount = Object.keys(channel.online).length;
    
    await db.channels.child(channelName).set(channel);
}

// ========== KANALDAN ÇIKAR ==========
async function removeFromChannel(channelName) {
    const snap = await db.channels.child(channelName).once('value');
    const channel = snap.val();
    if (channel?.online) {
        delete channel.online[currentUser.id];
        channel.onlineCount = Object.keys(channel.online).length;
        await db.channels.child(channelName).set(channel);
    }
}

// ========== ABONE BUTONU ==========
function updateSubscribeButton() {
    const btn = document.getElementById('subscribeBtn');
    if (currentUser.subscribed?.includes(currentChannel)) {
        btn.innerHTML = '<i class="fas fa-check"></i> Abone';
        btn.classList.add('subscribed');
    } else {
        btn.innerHTML = '<i class="fas fa-plus"></i> Abone Ol';
        btn.classList.remove('subscribed');
    }
}

// ========== ABONE OL/ÇIK ==========
async function toggleSubscribe() {
    if (!currentUser.subscribed) currentUser.subscribed = [];
    
    if (currentUser.subscribed.includes(currentChannel)) {
        currentUser.subscribed = currentUser.subscribed.filter(c => c !== currentChannel);
        await db.users.child(currentUser.id).child('subscribed').set(currentUser.subscribed);
        addSystemMessage(`❌ #${currentChannel} abonelikten çıkıldı.`);
    } else {
        currentUser.subscribed.push(currentChannel);
        await db.users.child(currentUser.id).child('subscribed').set(currentUser.subscribed);
        addSystemMessage(`✅ #${currentChannel} abone olundu.`);
    }
    updateSubscribeButton();
}

// ========== MESAJ DİNLEYİCİ ==========
let messageListener = null;

function startMessageListener() {
    if (messageListener) db.messages.child(currentChannel).off();
    
    messageListener = db.messages.child(currentChannel)
        .limitToLast(50)
        .on('child_added', (snap) => {
            const msg = snap.val();
            if (msg) appendMessage(msg, msg.senderId === currentUser?.id);
        });
}

// ========== MESAJ EKLE ==========
function appendMessage(msg, isMe) {
    const container = document.getElementById('messages');
    const div = document.createElement('div');
    div.className = `message ${isMe ? 'right' : ''}`;
    div.innerHTML = `
        <div class="message-header">
            <span class="message-time">${msg.time || ''}</span>
            <span class="message-sender" onclick="openPrivateChat('${msg.senderName}')">
                ${escapeHTML(msg.senderName)}
            </span>
        </div>
        <div class="message-text">${escapeHTML(msg.text)}</div>
    `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

// ========== MESAJ GÖNDER ==========
async function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    if (!text) return;

    if (text.startsWith('/')) {
        handleCommand(text);
        input.value = '';
        autoResize(input);
        return;
    }

    // Yasaklı kelime kontrolü
    const lower = text.toLowerCase();
    if (BANNED_WORDS.some(w => lower.includes(w.toLowerCase()))) {
        addSystemMessage('🚫 Yasaklı kelime tespit edildi!');
        input.value = '';
        return;
    }

    const msg = {
        senderId: currentUser.id,
        senderName: currentUser.name,
        text: text,
        time: formatTime(Date.now()),
        timestamp: Date.now()
    };

    await db.messages.child(currentChannel).push(msg);
    input.value = '';
    autoResize(input);
}

// ========== SİSTEM MESAJI ==========
function addSystemMessage(text) {
    const container = document.getElementById('messages');
    const div = document.createElement('div');
    div.className = 'system-message';
    div.innerHTML = `<i class="fas fa-info-circle"></i> ${escapeHTML(text)}`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

// ========== KANAL LİSTESİ ==========
async function loadChannels() {
    const snap = await db.channels.once('value');
    const channels = snap.val() || {};
    
    let html = '';
    Object.values(channels).forEach(ch => {
        if (!ch.isHidden || currentUser.role === 'owner' || currentUser.role === 'admin') {
            html += `
                <div class="channel-item" onclick="joinChannel('${ch.name}')">
                    <div class="channel-avatar"><i class="fas fa-hashtag"></i></div>
                    <div class="channel-info">
                        <div class="channel-name">${ch.name}</div>
                        <div class="channel-meta">
                            <span>${ch.owner}</span> • 
                            <span>${formatNumber(ch.subscribers || 1)} abone</span>
                        </div>
                    </div>
                    <div class="sub-count">${ch.onlineCount || 0}</div>
                </div>
            `;
        }
    });
    
    document.getElementById('channelsList').innerHTML = html;
}

// ========== KANAL AÇ ==========
async function createChannel() {
    const name = prompt('Kanal adı girin (küçük harf, rakam, tire):');
    if (!name) return;
    
    if (!/^[a-z0-9-]+$/.test(name)) {
        alert('Geçersiz kanal adı!');
        return;
    }
    
    const snap = await db.channels.child(name).once('value');
    if (snap.exists()) {
        alert('Bu kanal zaten var!');
        return;
    }
    
    const newChannel = {
        name: name,
        owner: currentUser.name,
        ownerRole: currentUser.role === 'owner' ? 'owner' : 'coadmin',
        coAdmins: [currentUser.name],
        subscribers: 1,
        isHidden: false,
        online: {},
        onlineCount: 0,
        youtube: {
            current: 'jfKfPfyJRdk',
            title: 'CETCETY Radio',
            artist: currentUser.name,
            playlist: []
        }
    };
    
    await db.channels.child(name).set(newChannel);
    addSystemMessage(`✅ #${name} kanalı oluşturuldu!`);
    joinChannel(name);
}