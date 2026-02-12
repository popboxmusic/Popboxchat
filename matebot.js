// ========== 🤖 MATE BOT - OWNER GOD MODU v1.0 ==========
// Tüm hakları MateKy'ye aittir. Popbox için özel geliştirilmiştir.

// ========== GLOBAL DEĞİŞKENLER ==========
let mateBot = {
    // Spam koruma
    spamProtection: 'medium',
    bannedWords: ['küfür', 'reklam', 'spam', 'reklam', 'discord', 'instagram', 'facebook', 'twitter'],
    linkBlocking: 'except',
    messageCooldown: 2,
    messageHistory: {},
    warnings: {},
    blockedIPs: [],
    
    // Owner özel mesaj arşivi
    ownerPrivateArchive: {},
    ownerPrivateMessages: {},
    
    // Duyurular
    announcements: [],
    
    // Komutlar
    customCommands: {},
    
    // Bildirimler
    notifications: [],
    
    // İstatistikler
    stats: {
        messagesToday: 0,
        warningsGiven: 0,
        blocksToday: 0,
        commandsUsed: 0,
        lastReset: Date.now()
    }
};

// ========== 👑 OWNER GOD MODU ==========
// Owner tüm özel mesajları görür, siler, yönetir
class OwnerGodMode {
    constructor(ownerName = 'MateKy') {
        this.owner = ownerName;
        this.isActive = true;
    }
    
    // Tüm özel mesajları getir
    getAllPrivateMessages() {
        if (!currentUser || !isOwner) return [];
        
        const allMessages = [];
        const users = Object.keys(privateChats || {});
        
        users.forEach(user => {
            if (privateChats[user]) {
                privateChats[user].forEach(msg => {
                    allMessages.push({
                        ...msg,
                        chatUser: user
                    });
                });
            }
        });
        
        return allMessages.sort((a, b) => b.timestamp - a.timestamp);
    }
    
    // Kullanıcının tüm mesajlarını getir
    getUserPrivateMessages(username) {
        if (!isOwner) return [];
        return privateChats[username] || [];
    }
    
    // Özel mesaj sil (tek tek)
    deletePrivateMessage(username, timestamp) {
        if (!isOwner) return false;
        
        if (privateChats[username]) {
            privateChats[username] = privateChats[username].filter(
                msg => msg.timestamp !== timestamp
            );
            return true;
        }
        return false;
    }
    
    // Kullanıcının tüm mesajlarını sil
    clearUserMessages(username) {
        if (!isOwner) return false;
        
        if (privateChats[username]) {
            privateChats[username] = [];
            
            if (activePrivateChat === username) {
                renderPrivateMessages(username);
            }
            
            addSystemMessage(`🗑️ ${username} kullanıcısının tüm özel mesajları silindi.`);
            return true;
        }
        return false;
    }
    
    // Tüm özel mesajları sil
    clearAllPrivateMessages() {
        if (!isOwner) return false;
        
        privateChats = {};
        unreadPrivateMessages = {};
        
        if (activePrivateChat) {
            activePrivateChat = null;
            document.getElementById('currentChannel').textContent = 'genel';
            document.getElementById('privateChatControls').style.display = 'none';
            document.getElementById('mediaUploadBtn').style.display = 'none';
        }
        
        addSystemMessage('🗑️ TÜM özel mesajlar Owner tarafından silindi!');
        return true;
    }
    
    // Medya mesajlarını filtrele
    getMediaMessages() {
        if (!isOwner) return [];
        
        const mediaMessages = [];
        const users = Object.keys(privateChats || {});
        
        users.forEach(user => {
            if (privateChats[user]) {
                privateChats[user].forEach(msg => {
                    if (msg.mediaUrl) {
                        mediaMessages.push({
                            ...msg,
                            chatUser: user
                        });
                    }
                });
            }
        });
        
        return mediaMessages.sort((a, b) => b.timestamp - a.timestamp);
    }
}

// ========== 👑 OWNER PANEL ==========
let activeUserSelect = null;

function openOwnerPanel() {
    if (!isOwner) {
        alert('Bu panel sadece Owner içindir!');
        return;
    }
    
    // Modal varsa kaldır
    const oldModal = document.getElementById('ownerPanelModal');
    if (oldModal) oldModal.remove();
    
    // Yeni modal oluştur
    const modalHtml = `
        <div id="ownerPanelModal" class="modal active" style="display: flex;">
            <div class="modal-content" style="width: 900px; max-width: 95%; max-height: 80vh; overflow-y: auto;">
                <div class="modal-header">
                    <h3><i class="fas fa-crown" style="color: #ffd700;"></i> MATE • Owner Paneli</h3>
                    <button class="modal-close" onclick="closeOwnerPanel()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <!-- SEKMELER -->
                <div style="display: flex; gap: 10px; border-bottom: 1px solid #2a2a2a; padding: 0 20px;">
                    <button onclick="switchOwnerTab('dashboard')" id="tabDashboard" style="padding: 12px 20px; background: transparent; border: none; color: #fff; cursor: pointer; border-bottom: 3px solid #ffd700;">📊 Dashboard</button>
                    <button onclick="switchOwnerTab('private')" id="tabPrivate" style="padding: 12px 20px; background: transparent; border: none; color: #fff; cursor: pointer;">🔒 Özel Mesajlar</button>
                    <button onclick="switchOwnerTab('announcement')" id="tabAnnouncement" style="padding: 12px 20px; background: transparent; border: none; color: #fff; cursor: pointer;">📢 Duyuru</button>
                    <button onclick="switchOwnerTab('commands')" id="tabCommands" style="padding: 12px 20px; background: transparent; border: none; color: #fff; cursor: pointer;">⚙️ Komutlar</button>
                </div>
                
                <!-- İÇERİK -->
                <div id="ownerTabContent" style="padding: 20px;">
                    ${renderDashboard()}
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function closeOwnerPanel() {
    const modal = document.getElementById('ownerPanelModal');
    if (modal) modal.remove();
}

function switchOwnerTab(tab) {
    // Sekme stillerini güncelle
    document.querySelectorAll('[id^="tab"]').forEach(el => {
        el.style.borderBottom = 'none';
    });
    
    const activeTab = document.getElementById(`tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`);
    if (activeTab) {
        activeTab.style.borderBottom = '3px solid #ffd700';
    }
    
    // İçeriği yükle
    const content = document.getElementById('ownerTabContent');
    if (!content) return;
    
    switch(tab) {
        case 'dashboard':
            content.innerHTML = renderDashboard();
            break;
        case 'private':
            content.innerHTML = renderPrivateMessages();
            break;
        case 'announcement':
            content.innerHTML = renderAnnouncement();
            break;
        case 'commands':
            content.innerHTML = renderCommands();
            break;
    }
}

function renderDashboard() {
    return `
        <div>
            <h4 style="color: #ffd700; margin-bottom: 20px;"><i class="fas fa-chart-line"></i> Anlık İstatistik</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <div style="background: #0f0f0f; padding: 16px; border-radius: 12px;">
                    <div style="color: #aaa; font-size: 12px;">Online Kullanıcı</div>
                    <div style="font-size: 32px; font-weight: 700; color: #fff;" id="statOnlineUsers">${onlineUsers?.length || 0}</div>
                </div>
                <div style="background: #0f0f0f; padding: 16px; border-radius: 12px;">
                    <div style="color: #aaa; font-size: 12px;">Özel Mesaj</div>
                    <div style="font-size: 32px; font-weight: 700; color: #fff;" id="statPrivateMessages">${Object.keys(privateChats || {}).length || 0}</div>
                </div>
            </div>
        </div>
    `;
}

function renderPrivateMessages() {
    const godMode = new OwnerGodMode();
    const allMessages = godMode.getAllPrivateMessages();
    
    return `
        <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h4 style="color: #ffd700;"><i class="fas fa-lock"></i> Özel Mesajlar</h4>
                <button onclick="clearAllPrivateMessages()" style="background: #ff4444; color: white; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer;">
                    <i class="fas fa-trash"></i> Tümünü Sil
                </button>
            </div>
            
            <div style="max-height: 500px; overflow-y: auto;">
                ${allMessages.map(msg => `
                    <div style="background: #0f0f0f; padding: 12px; border-radius: 8px; margin-bottom: 8px;">
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: #ffd700;">@${msg.chatUser}</span>
                            <span style="color: #aaa; font-size: 11px;">${new Date(msg.timestamp).toLocaleString('tr-TR')}</span>
                        </div>
                        <div style="margin-top: 4px;">
                            <span style="color: ${msg.sender === currentUser?.name ? '#ff4444' : '#fff'}; font-weight: 600;">${msg.sender}:</span>
                            <span style="color: #ddd; margin-left: 8px;">${msg.text || ''}</span>
                        </div>
                        ${msg.mediaUrl ? `
                            <div style="margin-top: 8px;">
                                ${msg.mediaType?.startsWith('image/') ? 
                                    `<img src="${msg.mediaUrl}" style="max-width: 200px; max-height: 150px; border-radius: 8px;">` : 
                                    `<video src="${msg.mediaUrl}" style="max-width: 200px; max-height: 150px; border-radius: 8px;" controls></video>`
                                }
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function renderAnnouncement() {
    return `
        <div>
            <h4 style="color: #ffd700; margin-bottom: 20px;"><i class="fas fa-bullhorn"></i> Duyuru Yayınla</h4>
            
            <div style="background: #0f0f0f; border-radius: 12px; padding: 20px;">
                <div style="margin-bottom: 16px;">
                    <input type="text" id="announcementTitle" class="modal-input" placeholder="Duyuru başlığı">
                </div>
                <div style="margin-bottom: 16px;">
                    <textarea id="announcementContent" class="modal-input" rows="3" placeholder="Duyuru içeriği..."></textarea>
                </div>
                <button onclick="publishAnnouncement()" style="background: #ffd700; color: #000; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; width: 100%;">
                    <i class="fas fa-bullhorn"></i> Duyuruyu Yayınla
                </button>
            </div>
        </div>
    `;
}

function renderCommands() {
    return `
        <div>
            <h4 style="color: #ffd700; margin-bottom: 20px;"><i class="fas fa-terminal"></i> Komutlar</h4>
            <p style="color: #aaa;">Yakında gelecek...</p>
        </div>
    `;
}

function publishAnnouncement() {
    const title = document.getElementById('announcementTitle')?.value;
    const content = document.getElementById('announcementContent')?.value;
    
    if (!title || !content) {
        alert('Başlık ve içerik gerekli!');
        return;
    }
    
    addSystemMessage(`📢 **${title}** - ${content}`);
    
    document.getElementById('announcementTitle').value = '';
    document.getElementById('announcementContent').value = '';
    
    addSystemMessage('✅ Duyuru yayınlandı!');
}

function clearAllPrivateMessages() {
    if (!isOwner) return;
    if (confirm('TÜM özel mesajları silmek istediğinize emin misiniz?')) {
        const godMode = new OwnerGodMode();
        godMode.clearAllPrivateMessages();
    }
}

function checkOwnerButton() {
    const ownerBtn = document.getElementById('ownerPanelBtn');
    if (ownerBtn) {
        ownerBtn.style.display = isOwner ? 'flex' : 'none';
    }
}

// ========== SPAM KONTROL ==========
function checkSpam(user, text) {
    if (!mateBot.spamProtection || mateBot.spamProtection === 'off') return true;
    if (isOwner || isAdmin) return true;
    
    const now = Date.now();
    if (!mateBot.messageHistory[user]) {
        mateBot.messageHistory[user] = [];
    }
    
    mateBot.messageHistory[user] = mateBot.messageHistory[user].filter(t => now - t < 10000);
    
    let limit = 5;
    if (mateBot.spamProtection === 'medium') limit = 3;
    if (mateBot.spamProtection === 'high') limit = 2;
    
    if (mateBot.messageHistory[user].length >= limit) {
        mateBot.warnings[user] = (mateBot.warnings[user] || 0) + 1;
        if (mateBot.warnings[user] >= 3) {
            addSystemMessage(`⚠️ ${user} spam yaptığı için 5 dakika susturuldu.`);
            return false;
        }
        addSystemMessage(`⚠️ ${user}, lütfen spam yapmayın! (Uyarı: ${mateBot.warnings[user]}/3)`);
        return false;
    }
    
    mateBot.messageHistory[user].push(now);
    return true;
}

function checkBannedWords(text) {
    if (!text || isOwner || isAdmin) return true;
    const lowerText = text.toLowerCase();
    for (let word of mateBot.bannedWords) {
        if (lowerText.includes(word.toLowerCase())) {
            return false;
        }
    }
    return true;
}

function checkLink(text) {
    if (mateBot.linkBlocking === 'off') return true;
    if (isOwner || isAdmin) return true;
    if (mateBot.linkBlocking === 'except' && (isCoAdmin || isOperator)) return true;
    
    const linkRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    return !linkRegex.test(text);
}

// ========== SAYFA YÜKLENİNCE ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Mate Bot yüklendi!');
    setTimeout(checkOwnerButton, 1000);
});

// ========== GLOBAL FONKSİYONLAR ==========
window.openOwnerPanel = openOwnerPanel;
window.closeOwnerPanel = closeOwnerPanel;
window.switchOwnerTab = switchOwnerTab;
window.clearAllPrivateMessages = clearAllPrivateMessages;
window.publishAnnouncement = publishAnnouncement;
window.checkOwnerButton = checkOwnerButton;
window.checkSpam = checkSpam;
window.checkBannedWords = checkBannedWords;
window.checkLink = checkLink;
