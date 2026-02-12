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
        
        // Tarihe göre sırala
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
            
            // Firebase'den de sil
            if (database) {
                database.ref(`privateMessagesArchive/${username}`).push({
                    deletedBy: currentUser.name,
                    deletedAt: Date.now(),
                    messages: privateChats[username]
                });
            }
            return true;
        }
        return false;
    }
    
    // Kullanıcının tüm mesajlarını sil
    clearUserMessages(username) {
        if (!isOwner) return false;
        
        if (privateChats[username]) {
            // Arşivle
            if (database) {
                database.ref(`privateMessagesArchive/${username}`).push({
                    deletedBy: currentUser.name,
                    deletedAt: Date.now(),
                    messages: privateChats[username]
                });
            }
            
            // Temizle
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
        
        const allUsers = Object.keys(privateChats || {});
        
        // Arşivle
        allUsers.forEach(user => {
            if (database && privateChats[user]?.length > 0) {
                database.ref(`privateMessagesArchive/backup_${Date.now()}`).set({
                    deletedBy: currentUser.name,
                    deletedAt: Date.now(),
                    users: allUsers,
                    messages: privateChats
                });
            }
        });
        
        // Temizle
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

// ========== 📋 OWNER PANEL SEKMELERİ ==========
const ownerTabs = {
    currentTab: 'dashboard',
    
    renderDashboard() {
        return `
            <div style="padding: 20px;">
                <h4 style="color: #ffd700; margin-bottom: 20px;"><i class="fas fa-chart-line"></i> Anlık İstatistik</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                    <div style="background: #0f0f0f; padding: 16px; border-radius: 12px;">
                        <div style="color: #aaa; font-size: 12px;">Online Kullanıcı</div>
                        <div style="font-size: 32px; font-weight: 700; color: #fff;" id="statOnlineUsers">0</div>
                    </div>
                    <div style="background: #0f0f0f; padding: 16px; border-radius: 12px;">
                        <div style="color: #aaa; font-size: 12px;">Bugünkü Mesaj</div>
                        <div style="font-size: 32px; font-weight: 700; color: #fff;" id="statMessages">0</div>
                    </div>
                    <div style="background: #0f0f0f; padding: 16px; border-radius: 12px;">
                        <div style="color: #aaa; font-size: 12px;">Özel Mesaj</div>
                        <div style="font-size: 32px; font-weight: 700; color: #fff;" id="statPrivateMessages">0</div>
                    </div>
                    <div style="background: #0f0f0f; padding: 16px; border-radius: 12px;">
                        <div style="color: #aaa; font-size: 12px;">Engellenen</div>
                        <div style="font-size: 32px; font-weight: 700; color: #fff;" id="statBlocked">0</div>
                    </div>
                </div>
            </div>
        `;
    },
    
    renderPrivateMessages() {
        const godMode = new OwnerGodMode();
        const allMessages = godMode.getAllPrivateMessages();
        const mediaMessages = godMode.getMediaMessages();
        
        let html = `
            <div style="padding: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h4 style="color: #ffd700;"><i class="fas fa-lock"></i> Özel Mesaj Arşivi</h4>
                    <div style="display: flex; gap: 8px;">
                        <button onclick="clearSelectedUserMessages()" class="control-btn" style="background: #ff4444;" title="Seçili kullanıcıyı temizle">
                            <i class="fas fa-user-slash"></i>
                        </button>
                        <button onclick="clearAllPrivateMessages()" class="control-btn" style="background: #ff0000;" title="TÜMÜNÜ TEMİZLE">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
                
                <!-- Kullanıcı Listesi -->
                <div style="display: flex; gap: 16px;">
                    <div style="width: 200px; background: #0f0f0f; border-radius: 12px; padding: 12px;">
                        <h5 style="color: #fff; margin-bottom: 12px;">👥 Kullanıcılar</h5>
                        <div style="max-height: 300px; overflow-y: auto;">
                            ${Object.keys(privateChats || {}).map(user => `
                                <div onclick="selectUser('${user}')" id="user-${user}" 
                                     style="padding: 10px; border-radius: 8px; margin-bottom: 4px; cursor: pointer; background: ${activeUserSelect === user ? '#272727' : 'transparent'};"
                                     onmouseover="this.style.background='#1a1a1a'" onmouseout="this.style.background='${activeUserSelect === user ? '#272727' : 'transparent'}'">
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <div class="user-avatar-small">${user.charAt(0).toUpperCase()}</div>
                                        <div>
                                            <div style="font-weight: 600; font-size: 13px;">${user}</div>
                                            <div style="font-size: 11px; color: #aaa;">${privateChats[user]?.length || 0} mesaj</div>
                                        </div>
                                    </div>
                                </div>
                            `).join('') || '<div style="color: #aaa; padding: 10px;">Hiç özel mesaj yok</div>'}
                        </div>
                    </div>
                    
                    <!-- Mesaj Listesi -->
                    <div style="flex: 1; background: #0f0f0f; border-radius: 12px; padding: 12px;">
                        <h5 style="color: #fff; margin-bottom: 12px;">📝 Mesajlar</h5>
                        <div id="privateMessageList" style="max-height: 400px; overflow-y: auto;">
                            ${allMessages.slice(0, 50).map(msg => `
                                <div style="padding: 12px; border-bottom: 1px solid #2a2a2a;">
                                    <div style="display: flex; justify-content: space-between;">
                                        <span style="color: #ffd700;">@${msg.chatUser}</span>
                                        <span style="color: #aaa; font-size: 11px;">${new Date(msg.timestamp).toLocaleString('tr-TR')}</span>
                                    </div>
                                    <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
                                        <span style="color: ${msg.sender === currentUser?.name ? '#ff4444' : '#fff'}; font-weight: 600;">
                                            ${msg.sender}:
                                        </span>
                                        <span style="color: #ddd;">${msg.text || ''}</span>
                                    </div>
                                    ${msg.mediaUrl ? `
                                        <div style="margin-top: 8px;">
                                            ${msg.mediaType?.startsWith('image/') ? 
                                                `<img src="${msg.mediaUrl}" style="max-width: 200px; max-height: 150px; border-radius: 8px;">` : 
                                                `<video src="${msg.mediaUrl}" style="max-width: 200px; max-height: 150px; border-radius: 8px;" controls></video>`
                                            }
                                        </div>
                                    ` : ''}
                                    <div style="margin-top: 8px; display: flex; gap: 8px; justify-content: flex-end;">
                                        <button onclick="deleteSingleMessage('${msg.chatUser}', ${msg.timestamp})" class="control-btn" style="width: 30px; height: 30px;" title="Sil">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
                
                <!-- Medya Galerisi -->
                <div style="margin-top: 24px;">
                    <h5 style="color: #ffd700; margin-bottom: 12px;"><i class="fas fa-images"></i> Paylaşılan Medyalar</h5>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 12px; background: #0f0f0f; border-radius: 12px; padding: 16px;">
                        ${mediaMessages.slice(0, 20).map(media => `
                            <div style="cursor: pointer;" onclick="window.open('${media.mediaUrl}')">
                                ${media.mediaType?.startsWith('image/') ?
                                    `<img src="${media.mediaUrl}" style="width: 100%; height: 100px; object-fit: cover; border-radius: 8px;">` :
                                    `<video src="${media.mediaUrl}" style="width: 100%; height: 100px; object-fit: cover; border-radius: 8px;"></video>`
                                }
                                <div style="font-size: 10px; color: #aaa; margin-top: 4px;">@${media.chatUser}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        return html;
    },
    
    renderAnnouncement() {
        return `
            <div style="padding: 20px;">
                <h4 style="color: #ffd700; margin-bottom: 20px;"><i class="fas fa-bullhorn"></i> Duyuru Yayınla</h4>
                
                <div style="background: #0f0f0f; border-radius: 12px; padding: 20px;">
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; color: #fff; margin-bottom: 8px;">Duyuru Başlığı</label>
                        <input type="text" id="announcementTitle" class="modal-input" placeholder="Örn: Sistem Bakımı">
                    </div>
                    
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; color: #fff; margin-bottom: 8px;">Duyuru İçeriği</label>
                        <textarea id="announcementContent" class="modal-input" rows="4" placeholder="Duyuru metnini yazın..."></textarea>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                        <div>
                            <label style="display: block; color: #fff; margin-bottom: 8px;">Renk</label>
                            <select id="announcementColor" class="modal-input">
                                <option value="#ff4444">Kırmızı</option>
                                <option value="#ffd700">Sarı</option>
                                <option value="#1db954">Yeşil</option>
                                <option value="#3498db">Mavi</option>
                            </select>
                        </div>
                        <div>
                            <label style="display: block; color: #fff; margin-bottom: 8px;">Süre (saniye)</label>
                            <input type="number" id="announcementDuration" class="modal-input" value="30" min="5" max="120">
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 12px;">
                        <button onclick="publishAnnouncement()" class="modal-btn" style="background: #ffd700; color: #000; flex: 1;">
                            <i class="fas fa-bullhorn"></i> Duyuruyu Yayınla
                        </button>
                        <button onclick="scheduleAnnouncement()" class="modal-btn" style="background: #272727; flex: 1;">
                            <i class="fas fa-clock"></i> Zamanla
                        </button>
                    </div>
                </div>
                
                <!-- Geçmiş Duyurular -->
                <div style="margin-top: 24px;">
                    <h5 style="color: #fff; margin-bottom: 12px;">📋 Geçmiş Duyurular</h5>
                    <div style="background: #0f0f0f; border-radius: 12px; padding: 16px; max-height: 200px; overflow-y: auto;">
                        ${mateBot.announcements.map(ann => `
                            <div style="padding: 12px; border-bottom: 1px solid #2a2a2a;">
                                <div style="display: flex; justify-content: space-between;">
                                    <span style="color: ${ann.color}; font-weight: 600;">${ann.title}</span>
                                    <span style="color: #aaa; font-size: 11px;">${new Date(ann.timestamp).toLocaleString('tr-TR')}</span>
                                </div>
                                <div style="margin-top: 4px; color: #ddd;">${ann.content}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    },
    
    renderCommands() {
        return `
            <div style="padding: 20px;">
                <h4 style="color: #ffd700; margin-bottom: 20px;"><i class="fas fa-terminal"></i> Komut Yönetimi</h4>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <!-- Yeni Komut Ekle -->
                    <div style="background: #0f0f0f; border-radius: 12px; padding: 20px;">
                        <h5 style="color: #fff; margin-bottom: 16px;">➕ Yeni Komut Ekle</h5>
                        
                        <div style="margin-bottom: 12px;">
                            <input type="text" id="newCommandName" class="modal-input" placeholder="Komut adı (örn: /yardım)">
                        </div>
                        
                        <div style="margin-bottom: 12px;">
                            <textarea id="newCommandResponse" class="modal-input" rows="3" placeholder="Yanıt mesajı..."></textarea>
                        </div>
                        
                        <div style="margin-bottom: 16px;">
                            <label style="display: block; color: #aaa; margin-bottom: 4px; font-size: 12px;">
                                <input type="checkbox" id="commandForAll"> Tüm kullanıcılar kullanabilsin
                            </label>
                        </div>
                        
                        <button onclick="addCustomCommand()" class="modal-btn" style="background: #1db954;">
                            <i class="fas fa-plus"></i> Komutu Ekle
                        </button>
                    </div>
                    
                    <!-- Mevcut Komutlar -->
                    <div style="background: #0f0f0f; border-radius: 12px; padding: 20px;">
                        <h5 style="color: #fff; margin-bottom: 16px;">📜 Mevcut Komutlar</h5>
                        
                        <div style="max-height: 300px; overflow-y: auto;">
                            ${Object.entries(mateBot.customCommands).map(([cmd, data]) => `
                                <div style="padding: 12px; border-bottom: 1px solid #2a2a2a;">
                                    <div style="display: flex; justify-content: space-between; align-items: center;">
                                        <span style="color: #ffd700; font-weight: 600;">${cmd}</span>
                                        <button onclick="deleteCommand('${cmd}')" class="control-btn" style="width: 30px; height: 30px;">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </div>
                                    <div style="color: #aaa; font-size: 12px; margin-top: 4px;">
                                        ${data.response.substring(0, 50)}${data.response.length > 50 ? '...' : ''}
                                    </div>
                                    <div style="font-size: 10px; color: #666; margin-top: 4px;">
                                        ${data.forAll ? '👥 Herkes' : '👑 Sadece yetkililer'}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
                
                <!-- Bot Ayarları -->
                <div style="margin-top: 24px; background: #0f0f0f; border-radius: 12px; padding: 20px;">
                    <h5 style="color: #fff; margin-bottom: 16px;">⚙️ Bot Ayarları</h5>
                    
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
                        <div>
                            <label style="display: block; color: #aaa; margin-bottom: 4px; font-size: 12px;">Spam Koruma</label>
                            <select id="botSpamLevel" class="modal-input">
                                <option value="off">Kapalı</option>
                                <option value="low" ${mateBot.spamProtection === 'low' ? 'selected' : ''}>Düşük</option>
                                <option value="medium" ${mateBot.spamProtection === 'medium' ? 'selected' : ''}>Orta</option>
                                <option value="high" ${mateBot.spamProtection === 'high' ? 'selected' : ''}>Yüksek</option>
                            </select>
                        </div>
                        
                        <div>
                            <label style="display: block; color: #aaa; margin-bottom: 4px; font-size: 12px;">Link Engelleme</label>
                            <select id="botLinkBlock" class="modal-input">
                                <option value="off">İzin Ver</option>
                                <option value="all" ${mateBot.linkBlocking === 'all' ? 'selected' : ''}>Tüm Linkler</option>
                                <option value="except" ${mateBot.linkBlocking === 'except' ? 'selected' : ''}>Yetkililer hariç</option>
                            </select>
                        </div>
                        
                        <div>
                            <label style="display: block; color: #aaa; margin-bottom: 4px; font-size: 12px;">Mesaj Cooldown</label>
                            <input type="number" id="botCooldown" class="modal-input" value="${mateBot.messageCooldown}" min="1" max="10">
                        </div>
                    </div>
                    
                    <div style="margin-top: 16px;">
                        <label style="display: block; color: #aaa; margin-bottom: 4px; font-size: 12px;">Yasaklı Kelimeler</label>
                        <div style="display: flex; gap: 8px;">
                            <input type="text" id="botBannedWords" class="modal-input" value="${mateBot.bannedWords.join(', ')}" style="flex: 1;">
                            <button onclick="updateBotSettings()" class="modal-btn" style="width: auto; padding: 0 24px; background: #ffd700; color: #000;">
                                <i class="fas fa-save"></i> Kaydet
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },
    
    renderNotifications() {
        return `
            <div style="padding: 20px;">
                <h4 style="color: #ffd700; margin-bottom: 20px;"><i class="fas fa-bell"></i> Bildirim Merkezi</h4>
                
                <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px;">
                    <!-- Bildirim Listesi -->
                    <div style="background: #0f0f0f; border-radius: 12px; padding: 20px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                            <h5 style="color: #fff;">📢 Son Bildirimler</h5>
                            <button onclick="clearAllNotifications()" class="control-btn" style="background: #ff4444;">
                                <i class="fas fa-check-double"></i> Hepsini Okundu İşaretle
                            </button>
                        </div>
                        
                        <div style="max-height: 400px; overflow-y: auto;">
                            ${mateBot.notifications.map(notif => `
                                <div style="padding: 16px; border-bottom: 1px solid #2a2a2a;">
                                    <div style="display: flex; justify-content: space-between;">
                                        <span style="color: ${notif.color || '#ffd700'};">${notif.title}</span>
                                        <span style="color: #aaa; font-size: 11px;">${new Date(notif.timestamp).toLocaleString('tr-TR')}</span>
                                    </div>
                                    <div style="margin-top: 8px; color: #ddd;">${notif.content}</div>
                                    <div style="margin-top: 8px; display: flex; gap: 8px; justify-content: flex-end;">
                                        <button onclick="deleteNotification('${notif.id}')" class="control-btn" style="width: 30px; height: 30px;">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <!-- Hızlı Bildirim Oluştur -->
                    <div style="background: #0f0f0f; border-radius: 12px; padding: 20px;">
                        <h5 style="color: #fff; margin-bottom: 16px;">⚡ Hızlı Bildirim</h5>
                        
                        <div style="margin-bottom: 12px;">
                            <input type="text" id="quickNotifTitle" class="modal-input" placeholder="Başlık">
                        </div>
                        
                        <div style="margin-bottom: 12px;">
                            <textarea id="quickNotifContent" class="modal-input" rows="3" placeholder="Mesaj..."></textarea>
                        </div>
                        
                        <div style="margin-bottom: 16px;">
                            <select id="quickNotifColor" class="modal-input">
                                <option value="#ffd700">Sarı (Bilgi)</option>
                                <option value="#ff4444">Kırmızı (Uyarı)</option>
                                <option value="#1db954">Yeşil (Başarı)</option>
                                <option value="#3498db">Mavi (Duyuru)</option>
                            </select>
                        </div>
                        
                        <button onclick="sendQuickNotification()" class="modal-btn">
                            <i class="fas fa-paper-plane"></i> Bildirimi Gönder
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
};

// ========== OWNER PANELİ RENDER ==========
function renderOwnerPanel() {
    const tab = ownerTabs.currentTab;
    const container = document.getElementById('ownerTabContent');
    
    if (!container) return;
    
    switch(tab) {
        case 'dashboard':
            container.innerHTML = ownerTabs.renderDashboard();
            break;
        case 'private':
            container.innerHTML = ownerTabs.renderPrivateMessages();
            break;
        case 'announcement':
            container.innerHTML = ownerTabs.renderAnnouncement();
            break;
        case 'commands':
            container.innerHTML = ownerTabs.renderCommands();
            break;
        case 'notifications':
            container.innerHTML = ownerTabs.renderNotifications();
            break;
    }
}

// ========== DİĞER FONKSİYONLAR ==========
let activeUserSelect = null;

function selectUser(username) {
    activeUserSelect = username;
    
    // Tüm user item'larını güncelle
    Object.keys(privateChats || {}).forEach(user => {
        const el = document.getElementById(`user-${user}`);
        if (el) {
            el.style.background = user === username ? '#272727' : 'transparent';
        }
    });
    
    // Mesajları göster
    const godMode = new OwnerGodMode();
    const userMessages = godMode.getUserPrivateMessages(username);
    
    const listEl = document.getElementById('privateMessageList');
    if (listEl) {
        listEl.innerHTML = userMessages.map(msg => `
            <div style="padding: 12px; border-bottom: 1px solid #2a2a2a;">
                <div style="display: flex; justify-content: space-between;">
                    <span style="color: #ffd700;">${msg.sender}</span>
                    <span style="color: #aaa; font-size: 11px;">${new Date(msg.timestamp).toLocaleString('tr-TR')}</span>
                </div>
                <div style="margin-top: 4px; color: #ddd;">${msg.text || ''}</div>
                ${msg.mediaUrl ? `
                    <div style="margin-top: 8px;">
                        ${msg.mediaType?.startsWith('image/') ? 
                            `<img src="${msg.mediaUrl}" style="max-width: 200px; max-height: 150px; border-radius: 8px;">` : 
                            `<video src="${msg.mediaUrl}" style="max-width: 200px; max-height: 150px; border-radius: 8px;" controls></video>`
                        }
                    </div>
                ` : ''}
                <div style="margin-top: 8px; display: flex; gap: 8px; justify-content: flex-end;">
                    <button onclick="deleteSingleMessage('${username}', ${msg.timestamp})" class="control-btn" style="width: 30px; height: 30px;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }
}

function deleteSingleMessage(username, timestamp) {
    if (!isOwner) return;
    
    const godMode = new OwnerGodMode();
    godMode.deletePrivateMessage(username, timestamp);
    selectUser(username); // Yenile
    addSystemMessage(`🗑️ Özel mesaj silindi.`);
}

function clearSelectedUserMessages() {
    if (!isOwner || !activeUserSelect) {
        alert('Önce bir kullanıcı seçin!');
        return;
    }
    
    if (confirm(`${activeUserSelect} kullanıcısının TÜM mesajlarını silmek istediğinize emin misiniz?`)) {
        const godMode = new OwnerGodMode();
        godMode.clearUserMessages(activeUserSelect);
        selectUser(activeUserSelect);
    }
}

function clearAllPrivateMessages() {
    if (!isOwner) return;
    
    if confirm('TÜM kullanıcıların TÜM özel mesajlarını silmek istediğinize emin misiniz? Bu işlem GERİ ALINAMAZ!') {
        const godMode = new OwnerGodMode();
        godMode.clearAllPrivateMessages();
        renderOwnerPanel();
    }
}

function publishAnnouncement() {
    const title = document.getElementById('announcementTitle')?.value;
    const content = document.getElementById('announcementContent')?.value;
    const color = document.getElementById('announcementColor')?.value;
    const duration = document.getElementById('announcementDuration')?.value;
    
    if (!title || !content) {
        alert('Başlık ve içerik gerekli!');
        return;
    }
    
    const announcement = {
        id: `ann_${Date.now()}`,
        title: title,
        content: content,
        color: color,
        duration: parseInt(duration),
        timestamp: Date.now(),
        publishedBy: currentUser.name
    };
    
    mateBot.announcements.push(announcement);
    
    // Sisteme duyuru olarak gönder
    addSystemMessage(`📢 **${title}** - ${content}`);
    
    // Modal'ı temizle
    document.getElementById('announcementTitle').value = '';
    document.getElementById('announcementContent').value = '';
    
    addSystemMessage(`✅ Duyuru yayınlandı: ${title}`);
    renderOwnerPanel();
}

function addCustomCommand() {
    const cmdName = document.getElementById('newCommandName')?.value.trim();
    const response = document.getElementById('newCommandResponse')?.value.trim();
    const forAll = document.getElementById('commandForAll')?.checked;
    
    if (!cmdName || !response) {
        alert('Komut adı ve yanıt gerekli!');
        return;
    }
    
    let command = cmdName;
    if (!command.startsWith('/')) {
        command = '/' + command;
    }
    
    mateBot.customCommands[command] = {
        response: response,
        forAll: forAll || false,
        createdBy: currentUser.name,
        timestamp: Date.now()
    };
    
    document.getElementById('newCommandName').value = '';
    document.getElementById('newCommandResponse').value = '';
    document.getElementById('commandForAll').checked = false;
    
    addSystemMessage(`✅ Yeni komut eklendi: ${command}`);
    renderOwnerPanel();
}

function deleteCommand(command) {
    if (!isOwner) return;
    
    if (confirm(`${command} komutunu silmek istediğinize emin misiniz?`)) {
        delete mateBot.customCommands[command];
        addSystemMessage(`🗑️ Komut silindi: ${command}`);
        renderOwnerPanel();
    }
}

function updateBotSettings() {
    mateBot.spamProtection = document.getElementById('botSpamLevel')?.value || 'medium';
    mateBot.linkBlocking = document.getElementById('botLinkBlock')?.value || 'except';
    mateBot.messageCooldown = parseInt(document.getElementById('botCooldown')?.value) || 2;
    
    const bannedWords = document.getElementById('botBannedWords')?.value;
    if (bannedWords) {
        mateBot.bannedWords = bannedWords.split(',').map(w => w.trim());
    }
    
    addSystemMessage('✅ Bot ayarları güncellendi!');
}

function sendQuickNotification() {
    const title = document.getElementById('quickNotifTitle')?.value;
    const content = document.getElementById('quickNotifContent')?.value;
    const color = document.getElementById('quickNotifColor')?.value;
    
    if (!title || !content) {
        alert('Başlık ve mesaj gerekli!');
        return;
    }
    
    const notification = {
        id: `notif_${Date.now()}`,
        title: title,
        content: content,
        color: color,
        timestamp: Date.now(),
        read: false
    };
    
    mateBot.notifications.unshift(notification);
    
    // Sisteme bildirim gönder
    addSystemMessage(`🔔 **${title}** - ${content}`);
    
    document.getElementById('quickNotifTitle').value = '';
    document.getElementById('quickNotifContent').value = '';
    
    renderOwnerPanel();
}

function deleteNotification(id) {
    mateBot.notifications = mateBot.notifications.filter(n => n.id !== id);
    renderOwnerPanel();
}

function clearAllNotifications() {
    mateBot.notifications = [];
    renderOwnerPanel();
}

// ========== EXPORT ==========
window.mateBot = mateBot;
window.OwnerGodMode = OwnerGodMode;
window.ownerTabs = ownerTabs;
window.renderOwnerPanel = renderOwnerPanel;
window.selectUser = selectUser;
window.deleteSingleMessage = deleteSingleMessage;
window.clearSelectedUserMessages = clearSelectedUserMessages;
window.clearAllPrivateMessages = clearAllPrivateMessages;
window.publishAnnouncement = publishAnnouncement;
window.addCustomCommand = addCustomCommand;
window.deleteCommand = deleteCommand;
window.updateBotSettings = updateBotSettings;
window.sendQuickNotification = sendQuickNotification;
window.deleteNotification = deleteNotification;
window.clearAllNotifications = clearAllNotifications;