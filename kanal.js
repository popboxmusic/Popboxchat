// ========== KANAL.JS - PANEL FONKSİYONLARI ==========

// Destek paneli
function loadSupportPanel(panel) {
    panel.innerHTML = `
        <div class="panel-header">
            <h3><i class="fas fa-headset" style="color:#7289da;"></i> Destek</h3>
            <div class="panel-close" onclick="closeLeftPanel()"><i class="fas fa-times"></i></div>
        </div>
        <div class="panel-content">
            <div class="info-box">
                <p><i class="fas fa-info-circle"></i> Canlı destek talebiniz #admin kanalına iletilir.</p>
            </div>
            <div style="background:#1a1a1a; border-radius:8px; padding:16px; margin-bottom:16px;">
                <h4 style="color:#fff; margin-bottom:12px;">📋 Sık Sorulan Sorular</h4>
                <div onclick="addSystemMessage('📌 Kanal açmak için sol menüde + ikonuna tıklayın.')" 
                     style="cursor:pointer; padding:12px; background:#2a2a2a; border-radius:8px; margin-bottom:8px;">
                    <i class="fas fa-question-circle" style="color:#7289da; margin-right:8px;"></i>
                    Kanal nasıl açarım?
                </div>
                <div onclick="addSystemMessage('📌 Özel sohbetlerde resim/video gönderebilirsiniz.')" 
                     style="cursor:pointer; padding:12px; background:#2a2a2a; border-radius:8px;">
                    <i class="fas fa-question-circle" style="color:#7289da; margin-right:8px;"></i>
                    Özel sohbet özellikleri
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">Destek Talebi</label>
                <textarea id="supportMessage" class="form-input" placeholder="Sorununuzu yazın..." rows="3"></textarea>
            </div>
            <button class="form-button" style="background:#7289da;" onclick="sendSupportTicket()">Gönder</button>
        </div>
    `;
}

// Bildirimler paneli
function loadNotificationsPanel(panel) {
    panel.innerHTML = `
        <div class="panel-header">
            <h3><i class="fas fa-bell" style="color:#ff4444;"></i> Bildirimler</h3>
            <div class="panel-close" onclick="closeLeftPanel()"><i class="fas fa-times"></i></div>
        </div>
        <div class="panel-content">
            <div style="display:flex; align-items:center; gap:12px; padding:12px; background:#1a1a1a; border-radius:8px; margin-bottom:8px;">
                <i class="fas fa-info-circle" style="color:#6495ed;"></i>
                <div style="flex:1;">
                    <div style="font-size:13px; color:#fff;">#rock kanalında yeni video eklendi</div>
                    <div style="font-size:10px; color:#aaa;">5 dk önce</div>
                </div>
            </div>
            <div style="display:flex; align-items:center; gap:12px; padding:12px; background:#1a1a1a; border-radius:8px; margin-bottom:8px;">
                <i class="fas fa-envelope" style="color:#ffd700;"></i>
                <div style="flex:1;">
                    <div style="font-size:13px; color:#fff;">Mehmet sana özel mesaj gönderdi</div>
                    <div style="font-size:10px; color:#aaa;">12 dk önce</div>
                </div>
            </div>
            <div style="display:flex; align-items:center; gap:12px; padding:12px; background:#1a1a1a; border-radius:8px;">
                <i class="fas fa-fire" style="color:#ff4444;"></i>
                <div style="flex:1;">
                    <div style="font-size:13px; color:#fff;">#arabesk kanalı popüler oldu!</div>
                    <div style="font-size:10px; color:#aaa;">1 saat önce</div>
                </div>
            </div>
        </div>
    `;
}

// Profil paneli
function loadProfilePanel(panel) {
    const user = ACTIVE_USER || { name: 'Misafir', role: 'user' };
    panel.innerHTML = `
        <div class="panel-header">
            <h3><i class="fas fa-user" style="color:#ff0000;"></i> Profil</h3>
            <div class="panel-close" onclick="closeLeftPanel()"><i class="fas fa-times"></i></div>
        </div>
        <div class="panel-content">
            <div style="display:flex; flex-direction:column; align-items:center; padding:20px 0;">
                <div class="profile-avatar-panel" style="width:80px; height:80px; font-size:32px; margin-bottom:12px;">
                    ${user.name.charAt(0).toUpperCase()}
                </div>
                <h2 style="font-size:20px; font-weight:700; color:#fff; margin-bottom:4px;">${user.name}</h2>
                <span class="badge ${user.role === 'owner' ? 'badge-owner' : 'badge-user'}">
                    ${user.role === 'owner' ? '👑 Kurucu' : '👤 Kullanıcı'}
                </span>
            </div>
            <div style="display:flex; justify-content:space-around; padding:16px 0; border-top:1px solid #2a2a2a; border-bottom:1px solid #2a2a2a; margin:16px 0;">
                <div style="text-align:center;">
                    <div style="font-size:18px; font-weight:700; color:#fff;">${user.subscribedChannels?.length || 0}</div>
                    <div style="font-size:11px; color:#aaa;">Abonelik</div>
                </div>
                <div style="text-align:center;">
                    <div style="font-size:18px; font-weight:700; color:#fff;">0</div>
                    <div style="font-size:11px; color:#aaa;">Kanalım</div>
                </div>
            </div>
            <button class="form-button" onclick="logout()" style="margin-top:16px;">Çıkış Yap</button>
        </div>
    `;
}

// Kanal aç paneli
function loadCreateChannelPanel(panel) {
    panel.innerHTML = `
        <div class="panel-header">
            <h3><i class="fas fa-plus-circle" style="color:#ff0000;"></i> Kanal Aç</h3>
            <div class="panel-close" onclick="closeLeftPanel()"><i class="fas fa-times"></i></div>
        </div>
        <div class="panel-content">
            <div class="form-group">
                <label class="form-label">Kanal Adı</label>
                <input type="text" id="newChannelName" class="form-input" placeholder="örnek: teknoloji" maxlength="20">
            </div>
            <div class="form-group">
                <label class="form-label">Açıklama</label>
                <input type="text" id="newChannelDesc" class="form-input" placeholder="Kanalın konusu...">
            </div>
            <button class="form-button" onclick="createChannel()">Kanalı Oluştur</button>
        </div>
    `;
}

// Abonelikler paneli
function loadSubscriptionsPanel(panel) {
    const subs = ACTIVE_USER?.subscribedChannels || ['genel', 'rock', 'arabesk'];
    let html = `
        <div class="panel-header">
            <h3><i class="fas fa-bell" style="color:#ffd700;"></i> Abonelikler</h3>
            <span class="subscription-count">${subs.length}</span>
            <div class="panel-close" onclick="closeLeftPanel()"><i class="fas fa-times"></i></div>
        </div>
        <div class="panel-content">
    `;
    
    subs.forEach(ch => {
        html += `
            <div class="subscription-item" onclick="joinChannel('${ch}')">
                <div class="subscription-avatar"><i class="fas fa-hashtag"></i></div>
                <div class="subscription-info">
                    <div class="subscription-name">${ch}</div>
                    <div class="subscription-meta">Kanal</div>
                </div>
            </div>
        `;
    });
    
    html += `</div>`;
    panel.innerHTML = html;
}

// Kanallar paneli
function loadChannelsPanel(panel) {
    let html = `
        <div class="panel-header">
            <h3><i class="fas fa-list-ul" style="color:#ff0000;"></i> Tüm Kanallar</h3>
            <span class="subscription-count">${Object.keys(channels).length}</span>
            <div class="panel-close" onclick="closeLeftPanel()"><i class="fas fa-times"></i></div>
        </div>
        <div class="panel-content">
    `;
    
    Object.values(channels).forEach(ch => {
        if (!ch.isHidden) {
            html += `
                <div class="channel-item" onclick="joinChannel('${ch.name}')">
                    <div class="channel-avatar"><i class="fas fa-hashtag"></i></div>
                    <div class="channel-info">
                        <div class="channel-name">${ch.name}</div>
                        <div class="channel-meta">${ch.subscribers?.toLocaleString() || 0} abone</div>
                    </div>
                </div>
            `;
        }
    });
    
    html += `</div>`;
    panel.innerHTML = html;
}

// Yardımcı fonksiyonlar
function sendSupportTicket() {
    const msg = document.getElementById('supportMessage')?.value.trim();
    if (msg) {
        addSystemMessage(`🛟 Destek talebiniz iletildi: "${msg}"`);
        closeLeftPanel();
    }
}

function createChannel() {
    const name = document.getElementById('newChannelName')?.value.trim().toLowerCase();
    if (!name) { alert('Kanal adı girin!'); return; }
    if (channels[name]) { alert('Bu kanal adı zaten var!'); return; }
    
    channels[name] = {
        name: name,
        owner: ACTIVE_USER.name,
        subscribers: 1,
        onlineUsers: [ACTIVE_USER.name],
        isHidden: false
    };
    
    saveChannels();
    addSystemMessage(`✅ #${name} kanalı oluşturuldu!`);
    joinChannel(name);
    closeLeftPanel();
}
