// ========== ADMIN/OWNER ÖZEL İŞLEMLERİ ==========

let PRIVATE_SPY_CHANNELS = JSON.parse(localStorage.getItem('cetcety_private_spy')) || {};
let PRIVATE_SPY_ACTIVE = false;
let PRIVATE_SPY_CURRENT_CHANNEL = null;
let SUPER_HIDDEN_CHANNELS = JSON.parse(localStorage.getItem('cetcety_super_hidden')) || [];

// Private spy kanallarını kaydet
function savePrivateSpyChannels() {
    localStorage.setItem('cetcety_private_spy', JSON.stringify(PRIVATE_SPY_CHANNELS));
}

// Süper gizli kanalları kaydet
function saveSuperHiddenChannels() {
    localStorage.setItem('cetcety_super_hidden', JSON.stringify(SUPER_HIDDEN_CHANNELS));
}

// Admin kanalına mesaj gönder
function sendToAdminChannel(message, type = 'system') {
    if (!channels.admin) return;
    
    let time = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    let adminMsg = {
        sender: '🔔 SİSTEM',
        text: message,
        time: time,
        timestamp: Date.now(),
        isHtml: true
    };
    
    if (!CHANNEL_MESSAGES.admin) {
        CHANNEL_MESSAGES.admin = [];
    }
    CHANNEL_MESSAGES.admin.push(adminMsg);
    localStorage.setItem('cetcety_channel_messages', JSON.stringify(CHANNEL_MESSAGES));
    
    if (currentChannel === 'admin') {
        let container = document.getElementById('messages');
        if (container) {
            let msgDiv = document.createElement('div');
            msgDiv.className = 'admin-system-message';
            msgDiv.innerHTML = `<i class="fas fa-shield-alt"></i> ${escapeHTML(message)}`;
            container.appendChild(msgDiv);
            container.scrollTop = container.scrollHeight;
        }
    }
}

// Owner özel takip durumunu kontrol et
function checkPrivateSpyStatus() {
    if (ACTIVE_USER.role === 'owner' && Object.keys(PRIVATE_SPY_CHANNELS).length > 0) {
        PRIVATE_SPY_ACTIVE = true;
        PRIVATE_SPY_CURRENT_CHANNEL = Object.keys(PRIVATE_SPY_CHANNELS)[0];
        let indicator = document.createElement('div');
        indicator.id = 'privateSpyIndicator';
        indicator.className = 'owner-spy-indicator';
        indicator.innerHTML = `<i class="fas fa-eye"></i> Özel Sohbet Takibi Aktif: #${PRIVATE_SPY_CURRENT_CHANNEL} <button onclick="stopPrivateSpy()" style="background:transparent; border:none; color:white; margin-left:10px; cursor:pointer;"><i class="fas fa-times"></i></button>`;
        document.body.appendChild(indicator);
    }
}

// Özel sohbet takibi başlat
function startPrivateSpy(channelName) {
    if (ACTIVE_USER.role !== 'owner') {
        addSystemMessage('❌ Bu komutu sadece owner kullanabilir!');
        return;
    }
    
    if (!channels[channelName]) {
        addSystemMessage(`❌ #${channelName} kanalı bulunamadı!`);
        return;
    }
    
    PRIVATE_SPY_ACTIVE = true;
    PRIVATE_SPY_CURRENT_CHANNEL = channelName;
    PRIVATE_SPY_CHANNELS = { [channelName]: true };
    savePrivateSpyChannels();
    
    let oldIndicator = document.getElementById('privateSpyIndicator');
    if (oldIndicator) oldIndicator.remove();
    
    let indicator = document.createElement('div');
    indicator.id = 'privateSpyIndicator';
    indicator.className = 'owner-spy-indicator';
    indicator.innerHTML = `<i class="fas fa-eye"></i> Özel Sohbet Takibi Aktif: #${channelName} <button onclick="stopPrivateSpy()" style="background:transparent; border:none; color:white; margin-left:10px; cursor:pointer;"><i class="fas fa-times"></i></button>`;
    document.body.appendChild(indicator);
    
    document.getElementById('spyChannelName').textContent = `#${channelName}`;
    document.getElementById('spyMessages').innerHTML = '<div style="color:#aaa; text-align:center;">Özel mesajlar burada görünecek...</div>';
    openModal('privateSpyModal');
    
    addSystemMessage(`👁️ #${channelName} kanalında özel sohbet takibi başlatıldı.`);
}

// Özel sohbet takibini durdur
function stopPrivateSpy() {
    PRIVATE_SPY_ACTIVE = false;
    PRIVATE_SPY_CURRENT_CHANNEL = null;
    PRIVATE_SPY_CHANNELS = {};
    savePrivateSpyChannels();
    
    let indicator = document.getElementById('privateSpyIndicator');
    if (indicator) indicator.remove();
    
    closeModal('privateSpyModal');
    addSystemMessage('👁️ Özel sohbet takibi durduruldu.');
}

// Owner için özel mesaj logla
function logPrivateMessageForOwner(sender, receiver, message, type, content) {
    if (ACTIVE_USER.role === 'owner' && PRIVATE_SPY_ACTIVE && PRIVATE_SPY_CURRENT_CHANNEL) {
        let time = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        let msgHtml = '';
        
        if (type === 'text') {
            msgHtml = `<div style="margin-bottom:10px; padding:8px; background:#2a2a2a; border-radius:8px;">
                <span style="color:#ffd700;">${time}</span> 
                <span style="color:#fff;">${sender} → ${receiver}:</span>
                <div style="color:#ddd; margin-top:4px;">${escapeHTML(content)}</div>
            </div>`;
        } else if (type === 'image') {
            msgHtml = `<div style="margin-bottom:10px; padding:8px; background:#2a2a2a; border-radius:8px;">
                <span style="color:#ffd700;">${time}</span> 
                <span style="color:#fff;">${sender} → ${receiver}:</span>
                <div style="margin-top:4px;"><i class="fas fa-image"></i> Resim gönderildi</div>
                <img src="${escapeHTML(content)}" style="max-width:100%; max-height:150px; margin-top:8px; border-radius:4px;">
            </div>`;
        } else if (type === 'video') {
            msgHtml = `<div style="margin-bottom:10px; padding:8px; background:#2a2a2a; border-radius:8px;">
                <span style="color:#ffd700;">${time}</span> 
                <span style="color:#fff;">${sender} → ${receiver}:</span>
                <div style="margin-top:4px;"><i class="fas fa-video"></i> Video gönderildi</div>
                <video src="${escapeHTML(content)}" controls style="max-width:100%; max-height:150px; margin-top:8px;"></video>
            </div>`;
        }
        
        let spyContainer = document.getElementById('spyMessages');
        if (spyContainer) {
            if (spyContainer.innerHTML === '<div style="color:#aaa; text-align:center;">Özel mesajlar burada görünecek...</div>') {
                spyContainer.innerHTML = '';
            }
            spyContainer.innerHTML += msgHtml;
            spyContainer.scrollTop = spyContainer.scrollHeight;
        }
    }
}

// Süper gizli kanal oluştur
function createSuperHiddenChannel(channelName) {
    if (ACTIVE_USER.role !== 'owner') {
        addSystemMessage('❌ Bu komutu sadece owner kullanabilir!');
        return;
    }
    
    if (channels[channelName]) {
        addSystemMessage(`❌ #${channelName} kanalı zaten mevcut!`);
        return;
    }
    
    channels[channelName] = {
        name: channelName,
        owner: 'MateKy',
        ownerRole: 'owner',
        coAdmins: [],
        subscribers: 1,
        online: 1,
        isHidden: true,
        isSuperHidden: true,
        youtube: {
            currentVideo: 'jfKfPfyJRdk',
            currentTitle: 'Süper Gizli Kanal',
            currentArtist: 'MateKy',
            playlist: [{ 
                id: 'jfKfPfyJRdk', 
                title: 'Süper Gizli Kanal', 
                addedBy: 'MateKy', 
                role: 'owner' 
            }]
        },
        onlineUsers: [ACTIVE_USER.name]
    };
    
    SUPER_HIDDEN_CHANNELS.push(channelName);
    saveChannels();
    saveSuperHiddenChannels();
    
    if (!ACTIVE_USER.subscribedChannels.includes(channelName)) {
        ACTIVE_USER.subscribedChannels.push(channelName);
        localStorage.setItem('cetcety_active_user', JSON.stringify(ACTIVE_USER));
    }
    
    addSystemMessage(`🔒 Süper gizli #${channelName} kanalı oluşturuldu! Sadece owner görebilir.`);
    joinChannel(channelName);
}

// Süper gizli kanal sil
function deleteSuperHiddenChannel(channelName) {
    if (ACTIVE_USER.role !== 'owner') {
        addSystemMessage('❌ Bu komutu sadece owner kullanabilir!');
        return;
    }
    
    if (!channels[channelName]) {
        addSystemMessage(`❌ #${channelName} kanalı bulunamadı!`);
        return;
    }
    
    delete channels[channelName];
    SUPER_HIDDEN_CHANNELS = SUPER_HIDDEN_CHANNELS.filter(ch => ch !== channelName);
    saveChannels();
    saveSuperHiddenChannels();
    
    addSystemMessage(`🗑️ #${channelName} kanalı silindi.`);
    
    if (currentChannel === channelName) {
        joinChannel('genel');
    }
}
