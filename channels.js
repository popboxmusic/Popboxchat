// ========== KANAL AÇ PANELİ ==========
function loadCreateChannelPanel(panel) {
    let html = `
        <div class="panel-header">
            <h3><i class="fas fa-plus-circle" style="color:#ff0000;"></i> Kanal Aç</h3>
            <div class="panel-close" onclick="closeLeftPanel()"><i class="fas fa-times"></i></div>
        </div>
        <div class="panel-content">
            <div class="info-box">
                <p><i class="fas fa-info-circle"></i> Yeni bir kanal açarak kendi topluluğunu oluşturabilirsin. Kanal sahibi olarak co-admin yetkilerine sahip olursun.</p>
            </div>
    `;
    
    if (currentUser.role !== 'owner' && currentUser.myChannel) {
        html += `
            <div class="info-box" style="border-left-color: #ffaa00;">
                <p><i class="fas fa-exclamation-triangle" style="color:#ffaa00;"></i> 
                Zaten bir kanalınız var: <strong>#${currentUser.myChannel}</strong>. 
                Bir kullanıcı sadece bir kanala sahip olabilir.</p>
            </div>
        `;
    } else {
        html += `
            <div class="form-group">
                <label class="form-label">Kanal Adı</label>
                <input type="text" id="newChannelName" class="form-input" 
                       placeholder="örnek: teknoloji, oyun, müzik" maxlength="20">
                <div style="font-size:11px; color:#aaa; margin-top:4px;">
                    Sadece küçük harf, rakam ve tire kullanabilirsiniz.
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">Kanal Açıklaması</label>
                <textarea id="newChannelDesc" class="form-textarea" 
                          placeholder="Kanalın konusu ve kuralları..."></textarea>
            </div>
            <div class="form-group">
                <label class="form-label">Kategori</label>
                <select id="newChannelCategory" class="form-select">
                    <option value="general">Genel</option>
                    <option value="music">Müzik</option>
                    <option value="gaming">Oyun</option>
                    <option value="technology">Teknoloji</option>
                    <option value="sports">Spor</option>
                </select>
            </div>
            <button class="form-button" onclick="createChannel()">Kanalı Oluştur</button>
        `;
    }
    
    html += `</div>`;
    panel.innerHTML = html;
}

// ========== KANAL OLUŞTUR ==========
async function createChannel() {
    if (currentUser.role !== 'owner' && currentUser.myChannel) {
        alert('Zaten bir kanalınız var!');
        return;
    }
    
    const name = document.getElementById('newChannelName')?.value?.toLowerCase().trim();
    if (!name) {
        alert('Kanal adı girin!');
        return;
    }
    
    if (!isValidChannelName(name)) {
        alert('Kanal adı sadece küçük harf, rakam ve tire içerebilir!');
        return;
    }
    
    // Kanal adı kontrolü
    const snapshot = await db.channels.child(name).once('value');
    if (snapshot.exists()) {
        alert('Bu kanal adı zaten mevcut!');
        return;
    }
    
    const desc = document.getElementById('newChannelDesc')?.value?.trim() || 
                `${currentUser.name} tarafından oluşturuldu.`;
    const category = document.getElementById('newChannelCategory')?.value || 'general';
    
    const newChannel = {
        name: name,
        owner: currentUser.name,
        ownerRole: 'coadmin',
        coAdmins: [currentUser.name],
        subscribers: 1,
        description: desc,
        category: category,
        isHidden: false,
        isSuperHidden: false,
        createdAt: Date.now(),
        youtube: {
            currentVideo: 'jfKfPfyJRdk',
            currentTitle: 'CETCETY Radio',
            currentArtist: currentUser.name,
            playlist: [{
                id: 'jfKfPfyJRdk',
                title: 'CETCETY Radio',
                addedBy: currentUser.name,
                role: 'coadmin',
                addedAt: Date.now()
            }]
        },
        onlineUsers: {},
        onlineCount: 0
    };
    
    await db.channels.child(name).set(newChannel);
    
    // Kullanıcıyı güncelle
    currentUser.myChannel = name;
    if (currentUser.role !== 'owner') currentUser.role = 'coadmin';
    
    if (!currentUser.subscribedChannels.includes(name)) {
        currentUser.subscribedChannels.push(name);
    }
    
    await db.users.child(currentUser.id).update({
        myChannel: name,
        role: currentUser.role,
        subscribedChannels: currentUser.subscribedChannels
    });
    
    addSystemMessage(`✅ #${name} kanalı oluşturuldu!`);
    
    // Admin kanalına bildir
    db.messages.child('admin').push({
        senderId: 'system',
        senderName: '🔔 SİSTEM',
        text: `✅ ${currentUser.name}, #${name} kanalını oluşturdu.`,
        time: formatTime(Date.now()),
        timestamp: Date.now()
    });
    
    await joinChannel(name);
    loadLeftPanel('channels');
}

// ========== KANALI SİL ==========
async function deleteMyChannel() {
    if (!currentUser.myChannel) {
        addSystemMessage('❌ Silinecek bir kanalınız yok!');
        return;
    }
    
    if (!confirm(`#${currentUser.myChannel} kanalını kalıcı olarak silmek istediğinize emin misiniz?`)) {
        return;
    }
    
    const channelName = currentUser.myChannel;
    
    // Kanalı sil
    await db.channels.child(channelName).remove();
    
    // Kullanıcıyı güncelle
    currentUser.myChannel = null;
    if (currentUser.role !== 'owner') currentUser.role = 'user';
    
    await db.users.child(currentUser.id).update({
        myChannel: null,
        role: currentUser.role
    });
    
    addSystemMessage('🗑️ Kanalınız silindi.');
    
    // Admin kanalına bildir
    db.messages.child('admin').push({
        senderId: 'system',
        senderName: '🔔 SİSTEM',
        text: `🗑️ ${currentUser.name}, #${channelName} kanalını sildi.`,
        time: formatTime(Date.now()),
        timestamp: Date.now()
    });
    
    if (currentChannel === channelName) {
        await joinChannel('genel');
    }
    
    loadLeftPanel('profile');
}

// ========== KANAL AYARLARI ==========
async function updateChannelSettings(settings) {
    const snapshot = await db.channels.child(currentChannel).once('value');
    const channel = snapshot.val();
    
    if (!channel) return;
    
    // Yetki kontrolü
    const canEdit = currentUser.role === 'owner' || 
                   currentUser.role === 'admin' || 
                   channel.owner === currentUser.name;
    
    if (!canEdit) {
        addSystemMessage('❌ Bu kanalı düzenleme yetkiniz yok!');
        return;
    }
    
    Object.assign(channel, settings);
    await db.channels.child(currentChannel).set(channel);
    
    addSystemMessage(`✅ #${currentChannel} güncellendi.`);
}

// ========== CO-ADMIN EKLE ==========
async function addCoAdmin(username) {
    const snapshot = await db.channels.child(currentChannel).once('value');
    const channel = snapshot.val();
    
    if (!channel) return;
    
    // Yetki kontrolü
    const canAdd = currentUser.role === 'owner' || 
                  currentUser.role === 'admin' || 
                  channel.owner === currentUser.name;
    
    if (!canAdd) {
        addSystemMessage('❌ Co-admin ekleme yetkiniz yok!');
        return;
    }
    
    // Kullanıcıyı bul
    const userSnapshot = await db.users.orderByChild('nameLower')
        .equalTo(username.toLowerCase()).once('value');
    
    let targetUser = null;
    userSnapshot.forEach(child => {
        targetUser = { id: child.key, ...child.val() };
    });
    
    if (!targetUser) {
        addSystemMessage(`❌ ${username} bulunamadı!`);
        return;
    }
    
    if (!channel.coAdmins) channel.coAdmins = [];
    
    if (!channel.coAdmins.includes(targetUser.name)) {
        channel.coAdmins.push(targetUser.name);
        await db.channels.child(currentChannel).set(channel);
        
        // Kullanıcının rolünü güncelle
        if (targetUser.role === 'user') {
            targetUser.role = 'coadmin';
            await db.users.child(targetUser.id).update({ role: 'coadmin' });
        }
        
        addSystemMessage(`🔧 ${username} artık #${currentChannel} kanalında co-admin.`);
        
        // Admin kanalına bildir
        db.messages.child('admin').push({
            senderId: 'system',
            senderName: '🔔 SİSTEM',
            text: `🔧 ${currentUser.name}, ${username} kullanıcısını #${currentChannel} kanalında co-admin yaptı.`,
            time: formatTime(Date.now()),
            timestamp: Date.now()
        });
    } else {
        addSystemMessage(`ℹ️ ${username} zaten co-admin.`);
    }
}

// ========== CO-ADMIN KALDIR ==========
async function removeCoAdmin(username) {
    const snapshot = await db.channels.child(currentChannel).once('value');
    const channel = snapshot.val();
    
    if (!channel) return;
    
    // Yetki kontrolü
    const canRemove = currentUser.role === 'owner' || 
                     currentUser.role === 'admin' || 
                     channel.owner === currentUser.name;
    
    if (!canRemove) {
        addSystemMessage('❌ Co-admin kaldırma yetkiniz yok!');
        return;
    }
    
    if (channel.coAdmins && channel.coAdmins.includes(username)) {
        channel.coAdmins = channel.coAdmins.filter(u => u !== username);
        await db.channels.child(currentChannel).set(channel);
        
        addSystemMessage(`🔨 ${username} co-admin yetkisi alındı.`);
        
        // Admin kanalına bildir
        db.messages.child('admin').push({
            senderId: 'system',
            senderName: '🔔 SİSTEM',
            text: `🔨 ${currentUser.name}, ${username} kullanıcısının co-admin yetkisini aldı.`,
            time: formatTime(Date.now()),
            timestamp: Date.now()
        });
    } else {
        addSystemMessage(`ℹ️ ${username} co-admin değil.`);
    }
}

// ========== KANAL BİLGİSİ ==========
async function showChannelInfo() {
    const snapshot = await db.channels.child(currentChannel).once('value');
    const channel = snapshot.val();
    
    if (!channel) return;
    
    const subCount = formatNumber(channel.subscribers || 1);
    const onlineCount = channel.onlineCount || 0;
    
    let info = `📢 #${currentChannel}\n`;
    info += `• Sahip: ${channel.owner}\n`;
    info += `• ${subCount} abone\n`;
    info += `• ${onlineCount} çevrimiçi\n`;
    info += `• Kategori: ${channel.category || 'Genel'}\n`;
    info += `• Açıklama: ${channel.description || 'Açıklama yok'}`;
    
    addSystemMessage(info);
}

// ========== KANAL LİSTESİ ==========
async function listChannels() {
    const snapshot = await db.channels.once('value');
    const channels = snapshot.val() || {};
    
    let list = '📋 **TÜM KANALLAR**\n\n';
    let count = 0;
    
    Object.values(channels)
        .filter(ch => {
            if (ch.isSuperHidden && currentUser.role !== 'owner') return false;
            if (ch.name === 'admin' && currentUser.role !== 'owner' && currentUser.role !== 'admin') return false;
            return true;
        })
        .sort((a, b) => (b.subscribers || 0) - (a.subscribers || 0))
        .forEach(ch => {
            count++;
            list += `#${ch.name} - ${formatNumber(ch.subscribers || 1)} abone - ${ch.onlineCount || 0} çevrimiçi\n`;
        });
    
    list += `\nToplam ${count} kanal`;
    addSystemMessage(list);
}
