// ========== MATE BOT - OWNER GOD MODU ==========
// Popbox icin ozel gelistirilmistir.

let mateBot = {
    spamProtection: 'medium',
    bannedWords: ['kufur', 'reklam', 'spam', 'discord', 'instagram', 'facebook', 'twitter'],
    linkBlocking: 'except',
    messageCooldown: 2,
    messageHistory: {},
    warnings: {},
    blockedIPs: [],
    announcements: [],
    customCommands: {},
    notifications: [],
    stats: {
        messagesToday: 0,
        warningsGiven: 0,
        blocksToday: 0,
        commandsUsed: 0,
        lastReset: Date.now()
    }
};

// Owner God Mode
class OwnerGodMode {
    constructor(ownerName = 'MateKy') {
        this.owner = ownerName;
        this.isActive = true;
    }
    
    getAllPrivateMessages() {
        if (!currentUser || !isOwner) return [];
        const allMessages = [];
        const users = Object.keys(privateChats || {});
        users.forEach(user => {
            if (privateChats[user]) {
                privateChats[user].forEach(msg => {
                    allMessages.push({...msg, chatUser: user});
                });
            }
        });
        return allMessages.sort((a, b) => b.timestamp - a.timestamp);
    }
    
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
        addSystemMessage('TUM ozel mesajlar silindi!');
        return true;
    }
}

// Owner Panel
function openOwnerPanel() {
    if (!isOwner) {
        alert('Bu panel sadece Owner icindir!');
        return;
    }
    
    const oldModal = document.getElementById('ownerPanelModal');
    if (oldModal) oldModal.remove();
    
    const modalHtml = `
        <div id="ownerPanelModal" class="modal active" style="display: flex;">
            <div class="modal-content" style="width: 800px; max-width: 95%;">
                <div class="modal-header">
                    <h3><i class="fas fa-crown" style="color: #ffd700;"></i> MATE • Owner Paneli</h3>
                    <button class="modal-close" onclick="closeOwnerPanel()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div style="padding: 20px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
                        <div style="background: #0f0f0f; padding: 16px; border-radius: 12px;">
                            <div style="color: #aaa; font-size: 12px;">Online Kullanici</div>
                            <div style="font-size: 32px; font-weight: 700; color: #fff;">${onlineUsers?.length || 0}</div>
                        </div>
                        <div style="background: #0f0f0f; padding: 16px; border-radius: 12px;">
                            <div style="color: #aaa; font-size: 12px;">Ozel Mesaj</div>
                            <div style="font-size: 32px; font-weight: 700; color: #fff;">${Object.keys(privateChats || {}).length || 0}</div>
                        </div>
                    </div>
                    
                    <button onclick="clearAllPrivateMessages()" class="modal-btn" style="background: #ff4444;">
                        <i class="fas fa-trash-alt"></i> TUM OZEL MESAJLARI SIL
                    </button>
                    
                    <div style="margin-top: 20px;">
                        <h4 style="color: #ffd700; margin-bottom: 10px;">Duyuru Yayinla</h4>
                        <input type="text" id="announcementTitle" class="modal-input" placeholder="Duyuru basligi">
                        <textarea id="announcementContent" class="modal-input" rows="3" placeholder="Duyuru icerigi..."></textarea>
                        <button onclick="publishAnnouncement()" class="modal-btn" style="background: #ffd700; color: #000; margin-top: 10px;">
                            <i class="fas fa-bullhorn"></i> Duyuruyu Yayinla
                        </button>
                    </div>
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

function publishAnnouncement() {
    const title = document.getElementById('announcementTitle')?.value;
    const content = document.getElementById('announcementContent')?.value;
    
    if (!title || !content) {
        alert('Baslik ve icerik gerekli!');
        return;
    }
    
    addSystemMessage('📢 ' + title + ' - ' + content);
    
    document.getElementById('announcementTitle').value = '';
    document.getElementById('announcementContent').value = '';
    closeOwnerPanel();
}

function clearAllPrivateMessages() {
    if (!isOwner) return;
    if (confirm('TUM ozel mesajlari silmek istediginize emin misiniz?')) {
        const godMode = new OwnerGodMode();
        godMode.clearAllPrivateMessages();
        closeOwnerPanel();
    }
}

function checkOwnerButton() {
    const ownerBtn = document.getElementById('ownerPanelBtn');
    if (ownerBtn) {
        ownerBtn.style.display = isOwner ? 'flex' : 'none';
    }
}

// Spam Kontrol
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
            addSystemMessage('⚠️ ' + user + ' spam yaptigi icin 5 dakika susturuldu.');
            return false;
        }
        addSystemMessage('⚠️ ' + user + ', lutfen spam yapmayin! (Uyari: ' + mateBot.warnings[user] + '/3)');
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

// Sayfa yuklenince
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Mate Bot yuklendi!');
    setTimeout(checkOwnerButton, 2000);
});

// Global fonksiyonlar
window.openOwnerPanel = openOwnerPanel;
window.closeOwnerPanel = closeOwnerPanel;
window.clearAllPrivateMessages = clearAllPrivateMessages;
window.publishAnnouncement = publishAnnouncement;
window.checkOwnerButton = checkOwnerButton;
window.checkSpam = checkSpam;
window.checkBannedWords = checkBannedWords;
window.checkLink = checkLink;
