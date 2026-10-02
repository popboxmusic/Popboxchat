/* =====================================================================
   CETCETY – admin.js
   Paneller, moderasyon, ban/mute, rol atama, komutlar, reklamlar
   ===================================================================== */

/* ============ ROL ATAMA ============ */
function openAdminRegisterModal() {
    if (!hasRole('admin')) { addSystemMessage("⛔ Sadece adminler kullanıcı kaydedebilir!"); return; }
    document.getElementById('adminRegisterModal').style.display = 'block';
    document.getElementById('overlay').style.display = 'block';
}
function closeAdminModal() {
    document.getElementById('adminRegisterModal').style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
}

async function registerUser() {
    if (!hasRole('admin')) { addSystemMessage("⛔ Sadece adminler kullanıcı kaydedebilir!"); return; }
    const username = document.getElementById('reg-username').value.trim();
    const password = document.getElementById('reg-password').value.trim();
    const role = document.getElementById('reg-role').value;
    if (!username || !password) { addSystemMessage("❌ Kullanıcı adı ve şifre gerekli!"); return; }
    if (!checkWriteLimit()) { addSystemMessage('⚠️ Günlük işlem limitine ulaşıldı!'); return; }
    if (role === 'admin' && !isOwner) { addSystemMessage("⛔ Sadece Owner admin atayabilir!"); return; }
    if (normalizeNick(username) === normalizeNick(SECURE_CONFIG.OWNER_CONFIG.username)) { addSystemMessage("⛔ Owner kullanıcısı oluşturulamaz!"); return; }
    const existingUser = await isRegisteredUserSecure(username);
    if (existingUser) { addSystemMessage(`❌ '${existingUser.originalName}' ismi zaten kayıtlı!`); return; }
    try {
        await registeredUsersRef.child(username).set({
            password, role, registeredBy: currentUser.name,
            registeredAt: Date.now(), isRegistered: true
        });
        incrementWriteCount();
        if (role !== 'user' && roleListConfig[role]) await addToRoleList(role, username);
        addSystemMessage(`✅ ${username} kullanıcısı ${getRoleLabel(role)} rolü ile kaydedildi!`);
        closeAdminModal();
        if (isOwner) updateOwnerPanelFromCache();
    } catch (error) { addSystemMessage("❌ Kullanıcı kaydedilemedi!"); }
}

async function unregisterUser() {
    if (!hasRole('admin')) { addSystemMessage("⛔ Sadece adminler kullanıcı silebilir!"); return; }
    const username = document.getElementById('reg-username').value.trim();
    if (!username) { addSystemMessage("❌ Silinecek kullanıcı adı girin!"); return; }
    if (!checkWriteLimit()) { addSystemMessage('⚠️ Günlük işlem limitine ulaşıldı!'); return; }
    if (normalizeNick(username) === normalizeNick(SECURE_CONFIG.OWNER_CONFIG.username)) { addSystemMessage("⛔ Owner silinemez!"); return; }
    if (!confirm(`${username} kullanıcısını silmek istediğinize emin misiniz?`)) return;
    try {
        const userSnapshot = await registeredUsersRef.once('value');
        const users = userSnapshot.val() || {};
        for (const [dbUsername, userData] of Object.entries(users)) {
            if (normalizeNick(dbUsername) === normalizeNick(username)) {
                if (userData.role !== 'user' && roleListConfig[userData.role]) await removeFromRoleList(userData.role, dbUsername);
                await registeredUsersRef.child(dbUsername).remove();
                await usersRef.child(dbUsername).remove();
                addSystemMessage(`✅ ${dbUsername} kullanıcısı silindi!`);
                incrementWriteCount();
                break;
            }
        }
        closeAdminModal();
        if (isOwner) updateOwnerPanelFromCache();
    } catch (error) { addSystemMessage("❌ Kullanıcı silinemedi!"); }
}

/* ============ MODERASYON ============ */
async function kickUser(username, duration = 5, reason = "Kick komutu") {
    if (!hasRole('operator')) { addSystemMessage("⛔ Yetkiniz yok!"); return; }
    if (!username) { addSystemMessage("❌ Kullanıcı adı belirtin!"); return; }
    if (username === currentUser.name) { addSystemMessage("❌ Kendinizi banlayamazsınız!"); return; }
    const normalizedUsername = normalizeNick(username);
    if (normalizedUsername === normalizeNick(SECURE_CONFIG.OWNER_CONFIG.username)) { addSystemMessage("⛔ Owner banlanamaz!"); return; }
    const targetRegistered = await isRegisteredUserSecure(username);
    if (targetRegistered && getRoleLevel(targetRegistered.role) >= getRoleLevel(currentUser.role)) {
        addSystemMessage("⛔ Sizden yüksek veya eşit rütbeli kullanıcıyı banlayamazsınız!"); return;
    }
    try {
        const durationNum = parseInt(duration) || 5;
        const banUntil = Date.now() + (durationNum * 60000);
        await bansRef.child(username).set({
            bannedUntil: banUntil, bannedBy: currentUser.name,
            reason: reason, timestamp: Date.now(), duration: durationNum
        });
        incrementWriteCount();
        await usersRef.child(username).remove();
        const chatId = generateChatId(username, 'System');
        await privateChatsRef.child(chatId).push({
            sender: 'System',
            text: `🚫 **${durationNum} dakika** süreyle banlandınız!\nSebep: ${reason}\nYetkili: ${currentUser.name}`,
            timestamp: Date.now(),
            time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
            isNotification: true
        });
        incrementWriteCount();
        addBanMessage(`🚫 ${username} kullanıcısı ${durationNum} dakika banlandı! Sebep: ${reason}`);
        if (isOwner) updateOwnerPanelFromCache();
        if (isAdmin) updateAdminPanelFromCache();
        if (isCoAdmin) updateCoAdminPanelFromCache();
    } catch (error) { addSystemMessage("❌ Ban işlemi başarısız!"); }
}

async function globalBanUser(username, duration = 0, reason = "Global ban") {
    if (!hasRole('admin')) { addSystemMessage("⛔ Yetkiniz yok!"); return; }
    if (!username) return;
    if (normalizeNick(username) === normalizeNick(SECURE_CONFIG.OWNER_CONFIG.username)) { addSystemMessage("⛔ Owner global banlanamaz!"); return; }
    try {
        const banUntil = duration > 0 ? Date.now() + (duration * 60000) : null;
        await globalBansRef.child(username).set({
            bannedUntil: banUntil, bannedBy: currentUser.name,
            reason: reason, timestamp: Date.now(), isPermanent: duration === 0
        });
        incrementWriteCount();
        await usersRef.child(username).remove();
        const chatId = generateChatId(username, 'System');
        await privateChatsRef.child(chatId).push({
            sender: 'System',
            text: `🌍 **GLOBAL BAN** uygulandı!\nSüre: ${duration > 0 ? duration + ' dakika' : 'Süresiz'}\nSebep: ${reason}\nYetkili: ${currentUser.name}`,
            timestamp: Date.now(),
            time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
            isNotification: true
        });
        incrementWriteCount();
        addSystemMessage(`🚫 ${username} ${duration>0?duration+' dakika':'süresiz'} global banlandı! Sebep: ${reason}`);
        if (isOwner) updateOwnerPanelFromCache();
    } catch (error) { addSystemMessage("❌ Global ban uygulanamadı!"); }
}

async function showBanList() {
    try {
        const banSnapshot = await bansRef.once('value');
        const bans = banSnapshot.val() || {};
        const globalBanSnapshot = await globalBansRef.once('value');
        const globalBans = globalBanSnapshot.val() || {};
        if (Object.keys(bans).length === 0 && Object.keys(globalBans).length === 0) { addBanMessage("✅ Aktif banlı kullanıcı yok!"); return; }
        let banList = "🚫 <strong>AKTİF BANLAR:</strong><br><br>";
        const now = Date.now();
        Object.entries(bans).forEach(([username, banData]) => {
            if (banData.bannedUntil > now) {
                const remaining = Math.ceil((banData.bannedUntil - now) / 60000);
                banList += `<strong>${username}</strong> - ${remaining} dakika kaldı - Sebep: ${banData.reason}<br>`;
            }
        });
        banList += "<br><strong>🌍 GLOBAL BANLAR:</strong><br>";
        Object.entries(globalBans).forEach(([username, banData]) => {
            if (!banData.bannedUntil || banData.bannedUntil > now) {
                const remaining = banData.bannedUntil ? Math.ceil((banData.bannedUntil - now) / 60000) : 'Süresiz';
                banList += `<strong>${username}</strong> - ${remaining} - Sebep: ${banData.reason}<br>`;
            }
        });
        addBanMessage(banList);
    } catch (error) { addBanMessage("❌ Ban listesi getirilemedi!"); }
}

async function unbanUser(username) {
    if (!hasRole('operator')) { addSystemMessage("⛔ Yetkiniz yok!"); return; }
    try {
        const bansSnapshot = await bansRef.once('value');
        const bans = bansSnapshot.val() || {};
        let found = false;
        for (const [bannedUser, banData] of Object.entries(bans)) {
            if (normalizeNick(bannedUser) === normalizeNick(username)) {
                await bansRef.child(bannedUser).remove();
                incrementWriteCount(); found = true; break;
            }
        }
        if (found) {
            addSystemMessage(`✅ ${username} kullanıcısının banı kaldırıldı!`);
            if (isOwner) updateOwnerPanelFromCache();
            if (isAdmin) updateAdminPanelFromCache();
            if (isCoAdmin) updateCoAdminPanelFromCache();
        } else addSystemMessage(`❌ ${username} kullanıcısı banlı değil!`);
    } catch (error) { addSystemMessage("❌ Ban kaldırma işlemi başarısız!"); }
}

async function removeGlobalBan(username) {
    if (!hasRole('admin')) return;
    try {
        await globalBansRef.child(username).remove();
        incrementWriteCount();
        addSystemMessage(`✅ ${username} global banı kaldırıldı.`);
        if (isOwner) updateOwnerPanelFromCache();
    } catch (error) { addSystemMessage("❌ Global ban kaldırılamadı!"); }
}

async function muteUser(username, duration = 10, reason = "Mute") {
    if (!hasRole('admin')) { addSystemMessage("⛔ Yetkiniz yok!"); return; }
    const until = Date.now() + duration * 60000;
    mutedUsers[username] = until;
    addSystemMessage(`🔇 ${username} ${duration} dakika susturuldu. Sebep: ${reason}`);
}

async function unmuteUser(username) {
    delete mutedUsers[username];
    addSystemMessage(`🔊 ${username} susturulması kaldırıldı.`);
}

/* ============ PROMPT'LAR ============ */
function kickUserPrompt() {
    const username = prompt('Banlanacak kullanıcı adı:');
    if (!username) return;
    const duration = prompt('Ban süresi (dakika):', '5'); if (!duration) return;
    const reason = prompt('Ban sebebi:', 'Kural ihlali'); if (!reason) return;
    kickUser(username, duration, reason);
}
function muteUserPrompt() {
    const username = prompt('Susturulacak kullanıcı adı:'); if (!username) return;
    const duration = prompt('Süre (dakika):', '10'); if (!duration) return;
    const reason = prompt('Sebep:', 'Mute'); if (!reason) return;
    muteUser(username, parseInt(duration), reason);
}
function unmuteUserPrompt() {
    const username = prompt('Susturması kaldırılacak kullanıcı adı:');
    if (username) unmuteUser(username);
}
function openGlobalBanPanel() {
    const username = prompt('Global banlanacak kullanıcı:'); if (!username) return;
    const duration = prompt('Ban süresi (dakika, 0 = süresiz):', '0'); if (duration === null) return;
    const reason = prompt('Ban sebebi:', 'Global kural ihlali'); if (!reason) return;
    globalBanUser(username, parseInt(duration), reason);
}
function promptUnban() {
    const username = prompt('Banı kaldırılacak kullanıcı adı:');
    if (username) unbanUser(username);
}
function promptAddVerified() {
    if (!hasRole('admin')) { addSystemMessage('⛔ Yetkiniz yok!'); return; }
    const username = prompt('Onaylı yapılacak kullanıcı adı:');
    if (!username) return;
    addToRoleList('verified', username).then(() => addSystemMessage(`✅ ${username} onaylı kullanıcı yapıldı!`));
}
function openUnregisterModal() {
    const username = prompt('Silinecek kullanıcı adı:');
    if (!username) return;
    document.getElementById('reg-username').value = username;
    unregisterUser();
}
function clearAllMessagesPrompt() {
    if (!hasRole('coadmin')) { addSystemMessage("⛔ Yetkiniz yok!"); return; }
    if (confirm('Tüm mesajları silmek istediğinize emin misiniz?')) {
        messagesRef.remove();
        addSystemMessage('✅ Tüm mesajlar temizlendi!');
    }
}

/* ============ ROL YÜKSELTME ============ */
function promoteToCoAdmin() {
    if (!hasRole('admin')) { addSystemMessage('⛔ Yetkiniz yok!'); return; }
    const username = prompt('Co-Admin yapılacak kullanıcı adı:'); if (!username) return;
    addToRoleList('coadmin', username).then(() => addSystemMessage(`✅ ${username} co-admin yapıldı!`));
}
function promoteToOperator() {
    if (!hasRole('admin')) { addSystemMessage('⛔ Yetkiniz yok!'); return; }
    const username = prompt('Operatör yapılacak kullanıcı adı:'); if (!username) return;
    addToRoleList('operator', username).then(() => addSystemMessage(`✅ ${username} operatör yapıldı!`));
}
function promoteToVerified() {
    if (!hasRole('admin')) { addSystemMessage('⛔ Yetkiniz yok!'); return; }
    const username = prompt('Onaylı kullanıcı yapılacak kullanıcı adı:'); if (!username) return;
    addToRoleList('verified', username).then(() => addSystemMessage(`✅ ${username} onaylı kullanıcı yapıldı!`));
}

/* ============ KOMUTLAR ============ */
function openCommandModal() {
    if (!isOwner) { addSystemMessage("⛔ Bu komutu sadece Owner kullanabilir!"); return; }
    document.getElementById('commandModal').style.display = 'block';
    document.getElementById('overlay').style.display = 'block';
}
function closeCommandModal() {
    document.getElementById('commandModal').style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
}
async function saveCustomCommand() {
    if (!isOwner) return;
    const cmdName = document.getElementById('cmd-name').value.trim().toLowerCase();
    const cmdResponse = document.getElementById('cmd-response').value.trim();
    const cmdRole = document.getElementById('cmd-role').value;
    if (!cmdName || !cmdResponse) { addSystemMessage("❌ Komut adı ve yanıtı gerekli!"); return; }
    if (!checkWriteLimit()) { addSystemMessage('⚠️ Günlük işlem limitine ulaşıldı!'); return; }
    try {
        const commandData = { response: cmdResponse, role: cmdRole, createdBy: currentUser.name, createdAt: Date.now() };
        await customCommandsRef.child(cmdName).set(commandData);
        incrementWriteCount();
        customCommands[cmdName] = commandData;
        addSystemMessage(`✅ /${cmdName} komutu oluşturuldu!`);
        closeCommandModal();
        updateOwnerCommandsList();
    } catch (error) { addSystemMessage("❌ Komut oluşturulamadı!"); }
}
async function deleteCustomCommand() {
    if (!isOwner) return;
    const cmdName = document.getElementById('cmd-name').value.trim().toLowerCase();
    if (!cmdName) { addSystemMessage("❌ Silinecek komut adı girin!"); return; }
    if (!confirm(`/${cmdName} komutunu silmek istediğinize emin misiniz?`)) return;
    try {
        await customCommandsRef.child(cmdName).remove();
        incrementWriteCount();
        delete customCommands[cmdName];
        addSystemMessage(`✅ /${cmdName} komutu silindi!`);
        closeCommandModal();
        updateOwnerCommandsList();
    } catch (error) { addSystemMessage("❌ Komut silinemedi!"); }
}

/* ============ PANEL AÇ/KAPA ============ */
function toggleOwnerPanel() {
    const panel = document.getElementById('ownerPanel');
    panel.classList.toggle('active');
    if (panel.classList.contains('active')) {
        updateOwnerPanelFromCache();
        if (!ownerPrivateListenerActive) { startOwnerPrivateMessageMonitoring(); ownerPrivateListenerActive = true; }
        if (document.querySelector('#ownerAdsTab').classList.contains('active')) updateAdContentsList();
    } else {
        if (ownerPrivateListenerActive) { stopOwnerPrivateMessageMonitoring(); ownerPrivateListenerActive = false; }
    }
}
function toggleAdminPanel() {
    const panel = document.getElementById('adminPanel');
    panel.classList.toggle('active');
    if (panel.classList.contains('active')) updateAdminPanelFromCache();
}
function toggleCoAdminPanel() {
    const panel = document.getElementById('coadminPanel');
    panel.classList.toggle('active');
    if (panel.classList.contains('active')) updateCoAdminPanelFromCache();
}
function toggleOperatorPanel() {
    const panel = document.getElementById('operatorPanel');
    panel.classList.toggle('active');
    if (panel.classList.contains('active')) updateOperatorPanelFromCache();
}
function toggleVerifiedPanel() {
    const panel = document.getElementById('verifiedPanel');
    panel.classList.toggle('active');
}

/* ============ SEKME GEÇİŞLERİ ============ */
function switchOwnerTab(tabName) {
    document.querySelectorAll('#ownerPanel .role-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('#ownerPanel .role-tab-content').forEach(c => c.classList.remove('active'));
    document.querySelector(`#ownerPanel .role-tab[onclick*="${tabName}"]`).classList.add('active');
    document.getElementById('owner' + tabName.charAt(0).toUpperCase() + tabName.slice(1) + 'Tab').classList.add('active');
    if (tabName === 'ads') updateAdContentsList();
}
function switchAdminTab(tabName) {
    document.querySelectorAll('#adminPanel .role-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('#adminPanel .role-tab-content').forEach(c => c.classList.remove('active'));
    document.querySelector(`#adminPanel .role-tab[onclick*="${tabName}"]`).classList.add('active');
    document.getElementById('admin' + tabName.charAt(0).toUpperCase() + tabName.slice(1) + 'Tab').classList.add('active');
}
function switchCoAdminTab(tabName) {
    document.querySelectorAll('#coadminPanel .role-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('#coadminPanel .role-tab-content').forEach(c => c.classList.remove('active'));
    document.querySelector(`#coadminPanel .role-tab[onclick*="${tabName}"]`).classList.add('active');
    document.getElementById('coadmin' + tabName.charAt(0).toUpperCase() + tabName.slice(1) + 'Tab').classList.add('active');
}
function switchOperatorTab(tabName) {
    document.querySelectorAll('#operatorPanel .role-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('#operatorPanel .role-tab-content').forEach(c => c.classList.remove('active'));
    document.querySelector(`#operatorPanel .role-tab[onclick*="${tabName}"]`).classList.add('active');
    document.getElementById('operator' + tabName.charAt(0).toUpperCase() + tabName.slice(1) + 'Tab').classList.add('active');
}
function switchVerifiedTab(tabName) {
    document.querySelectorAll('#verifiedPanel .role-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('#verifiedPanel .role-tab-content').forEach(c => c.classList.remove('active'));
    document.querySelector(`#verifiedPanel .role-tab[onclick*="${tabName}"]`).classList.add('active');
    document.getElementById('verified' + tabName.charAt(0).toUpperCase() + tabName.slice(1) + 'Tab').classList.add('active');
}

/* ============ PANEL GÜNCELLEMELERİ ============ */
function updateOwnerPanelFromCache() {
    if (!isOwner) return;
    const now = Date.now();
    let onlineCount = 0;
    Object.values(cachedOnlineUsers).forEach(user => {
        if (user && user.lastSeen && (now - user.lastSeen) < ONLINE_THRESHOLD) onlineCount++;
    });
    document.getElementById('ownerTotalUsers').textContent = Object.keys(cachedOnlineUsers).length;
    document.getElementById('ownerOnlineUsers').textContent = onlineCount;
    document.getElementById('ownerRegisteredUsers').textContent = Object.keys(cachedRegisteredUsers).length;
    document.getElementById('ownerMessages').textContent = cachedMessages.length;
    document.getElementById('ownerCommands').textContent = Object.keys(customCommands).length;
    const verifiedCountEl = document.getElementById('ownerVerifiedUsers');
    if (verifiedCountEl) verifiedCountEl.textContent = verifiedList.length;
    updateOwnerRoleList('admin');
    updateOwnerRoleList('coadmin');
    updateOwnerRoleList('operator');
    updateOwnerRoleList('verified');
    updateOwnerCommandsList();
    updateOwnerReportListFromCache();
    updateOwnerBlockListFromCache();
}

function updateAdminPanelFromCache() {
    if (!isAdmin && !isOwner) return;
    const now = Date.now();
    let onlineCount = 0;
    Object.values(cachedOnlineUsers).forEach(user => {
        if (user && user.lastSeen && (now - user.lastSeen) < ONLINE_THRESHOLD) onlineCount++;
    });
    let activeBans = 0;
    Object.values(cachedBans).forEach(ban => { if (ban.bannedUntil > now) activeBans++; });
    document.getElementById('adminTotalUsers').textContent = Object.keys(cachedOnlineUsers).length;
    document.getElementById('adminOnlineUsers').textContent = onlineCount;
    document.getElementById('adminMessages').textContent = cachedMessages.length;
    document.getElementById('adminBans').textContent = activeBans;
    updateAdminReportListFromCache();
}

function updateCoAdminPanelFromCache() {
    if (!isCoAdmin && !isOwner) return;
    const now = Date.now();
    let onlineCount = 0;
    Object.values(cachedOnlineUsers).forEach(user => {
        if (user && user.lastSeen && (now - user.lastSeen) < ONLINE_THRESHOLD) onlineCount++;
    });
    let activeBans = 0;
    Object.values(cachedBans).forEach(ban => { if (ban.bannedUntil > now) activeBans++; });
    document.getElementById('coadminOnline').textContent = onlineCount;
    document.getElementById('coadminBans').textContent = activeBans;
}

function updateOperatorPanelFromCache() { /* ileride kullanılabilir */ }

function updateOwnerRoleList(role) {
    const containerMap = { admin:'ownerAdminList', coadmin:'ownerCoAdminList', operator:'ownerOperatorList', verified:'ownerVerifiedList' };
    const containerId = containerMap[role];
    if (!containerId) return;
    const container = document.getElementById(containerId);
    if (!container) return;
    const list = roleListConfig[role].getCache();
    let html = '';
    list.forEach(username => {
        html += `
            <div class="role-list-item">
                <div class="role-list-info">
                    <div class="role-list-avatar"><i class="fas fa-user"></i></div>
                    <div class="role-list-details">
                        <span class="role-list-name">${username}</span>
                        <span class="role-list-role">${getRoleLabel(role)}</span>
                    </div>
                </div>
                <div class="role-list-actions">
                    <button class="role-list-btn danger" onclick="removeFromRoleList('${role}', '${username}')"><i class="fas fa-times"></i></button>
                </div>
            </div>`;
    });
    if (list.length === 0) html = `<div style="color:var(--text-muted); text-align:center;">${getRoleLabel(role)} yok</div>`;
    container.innerHTML = html;
}

function updateOwnerCommandsList() {
    const container = document.getElementById('ownerCommandsList');
    if (!container) return;
    let html = '';
    Object.entries(customCommands).forEach(([cmd, data]) => {
        html += `
            <div class="role-list-item">
                <div class="role-list-info">
                    <div class="role-list-avatar"><i class="fas fa-terminal"></i></div>
                    <div class="role-list-details">
                        <span class="role-list-name">/${cmd}</span>
                        <span class="role-list-role">${data.role}</span>
                    </div>
                </div>
                <div class="role-list-actions">
                    <button class="role-list-btn danger" onclick="deleteCustomCommandByName('${cmd}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>`;
    });
    if (Object.keys(customCommands).length === 0) html = '<div style="color:var(--text-muted); text-align:center;">Özel komut yok</div>';
    container.innerHTML = html;
}

function deleteCustomCommandByName(cmdName) {
    if (!confirm(`/${cmdName} komutunu silmek istediğinize emin misiniz?`)) return;
    customCommandsRef.child(cmdName).remove();
    delete customCommands[cmdName];
    updateOwnerCommandsList();
    addSystemMessage(`✅ /${cmdName} komutu silindi.`);
}

function updateOwnerReportListFromCache() {
    const container = document.getElementById('ownerReportList');
    if (!container) return;
    let html = '';
    Object.entries(cachedReports).slice(-10).reverse().forEach(([id, report]) => {
        html += `
            <div class="role-list-item" style="flex-direction:column; align-items:flex-start;">
                <div style="width:100%; margin-bottom:5px;"><strong>${report.reportedUser}</strong> - ${report.reason}</div>
                <div style="font-size:11px;">Şikayet Eden: ${report.reporter}</div>
                ${report.description ? `<div style="font-size:11px;">${report.description}</div>` : ''}
                <button class="role-list-btn danger" onclick="deleteReport('${id}')" style="margin-top:5px;">Sil</button>
            </div>`;
    });
    if (Object.keys(cachedReports).length === 0) html = '<div style="color:var(--text-muted);">Şikayet yok</div>';
    container.innerHTML = html;
}

function updateAdminReportListFromCache() {
    const container = document.getElementById('adminReportList');
    if (!container) return;
    let html = '';
    Object.entries(cachedReports).slice(-10).reverse().forEach(([id, report]) => {
        html += `
            <div class="role-list-item" style="flex-direction:column; align-items:flex-start;">
                <div><strong>${report.reportedUser}</strong> - ${report.reason}</div>
                <div style="font-size:11px;">${report.reporter}</div>
                <button class="role-list-btn danger" onclick="deleteReport('${id}')">Sil</button>
            </div>`;
    });
    if (Object.keys(cachedReports).length === 0) html = '<div style="color:var(--text-muted);">Şikayet yok</div>';
    container.innerHTML = html;
}

function updateOwnerBlockListFromCache() {
    const container = document.getElementById('ownerBlockList');
    if (!container) return;
    const now = Date.now();
    let html = '';
    Object.entries(cachedBlocks).forEach(([blocker, blockedData]) => {
        Object.entries(blockedData).forEach(([blocked, data]) => {
            if (data.blockedUntil > now) {
                const remaining = Math.ceil((data.blockedUntil - now) / 60000);
                html += `<div class="role-list-item"><div>${blocker} ⮕ ${blocked} (${remaining} dk)</div><button class="role-list-btn danger" onclick="adminUnblock('${blocker}', '${blocked}')">Kaldır</button></div>`;
            }
        });
    });
    if (html === '') html = '<div style="color:var(--text-muted);">Aktif engelleme yok</div>';
    container.innerHTML = html;
}

async function deleteReport(reportId) {
    if (!isAdmin && !isOwner) return;
    if (confirm('Bu şikayeti silmek istediğinize emin misiniz?')) {
        await reportsRef.child(reportId).remove();
        delete cachedReports[reportId];
        if (isOwner) updateOwnerReportListFromCache();
        if (isAdmin) updateAdminReportListFromCache();
        addSystemMessage('✅ Şikayet silindi.');
    }
}

async function adminUnblock(blocker, blocked) {
    if (!isOwner) return;
    if (confirm(`${blocker} ile ${blocked} arasındaki engellemeyi kaldırmak istiyor musunuz?`)) {
        await blocksRef.child(blocker).child(blocked).remove();
        await blocksRef.child(blocked).child(blocker).remove();
        delete cachedBlocks[blocker]?.[blocked];
        delete cachedBlocks[blocked]?.[blocker];
        updateOwnerBlockListFromCache();
        addSystemMessage(`✅ Engelleme kaldırıldı.`);
    }
}

/* ============ REKLAM YÖNETİMİ ============ */
let adTimerInterval = null;
let adSkipTime = 30;
let adCycleInterval = null;
let adCycleActive = true;

const DEFAULT_AD_CONTENTS = [
    { type: 'image', content: 'https://via.placeholder.com/854x480.png?text=Reklam+Banner+1' },
    { type: 'image', content: 'https://via.placeholder.com/854x480.png?text=Reklam+Banner+2' },
    { type: 'video', content: 'dQw4w9WgXcQ' }
];

function extractVideoId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

function renderAdContent(adItem) {
    const adContentDiv = document.getElementById('adContent');
    if (!adContentDiv) return;
    adContentDiv.innerHTML = '';
    if (adItem.type === 'image') {
        const img = document.createElement('img');
        img.src = adItem.content; img.alt = 'Reklam';
        adContentDiv.appendChild(img);
    } else if (adItem.type === 'video') {
        const iframe = document.createElement('iframe');
        iframe.src = `https://www.youtube.com/embed/${adItem.content}?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3`;
        iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
        iframe.allowFullscreen = false;
        iframe.setAttribute('frameborder', '0');
        adContentDiv.appendChild(iframe);
    } else {
        adContentDiv.innerHTML = `<div style="display:flex; align-items:center; justify-content:center; height:100%; color:white; background:#333;">Reklam İçeriği Geçersiz</div>`;
    }
}

function getRandomAdContent() {
    if (cachedAdContents && cachedAdContents.length > 0) {
        return cachedAdContents[Math.floor(Math.random() * cachedAdContents.length)];
    }
    return DEFAULT_AD_CONTENTS[Math.floor(Math.random() * DEFAULT_AD_CONTENTS.length)];
}

function showAd(adContent = null, duration = 30) {
    const adOverlay = document.getElementById('adOverlay');
    const adTimerSpan = document.getElementById('adTimerSeconds');
    const adSkipBtn = document.getElementById('adSkipBtn');
    if (adOverlay.classList.contains('active')) closeAd();
    const contentToShow = adContent === null ? getRandomAdContent() : adContent;
    renderAdContent(contentToShow);
    adSkipTime = duration;
    adTimerSpan.textContent = adSkipTime;
    adSkipBtn.disabled = true;
    adOverlay.classList.add('active');
    if (adTimerInterval) clearInterval(adTimerInterval);
    adTimerInterval = setInterval(() => {
        adSkipTime--;
        adTimerSpan.textContent = adSkipTime;
        if (adSkipTime <= 0) {
            clearInterval(adTimerInterval); adTimerInterval = null;
            adSkipBtn.disabled = false;
            adTimerSpan.textContent = "0";
        }
    }, 1000);
}

function closeAd() {
    const adOverlay = document.getElementById('adOverlay');
    const adSkipBtn = document.getElementById('adSkipBtn');
    const adTimerSpan = document.getElementById('adTimerSeconds');
    if (adTimerInterval) { clearInterval(adTimerInterval); adTimerInterval = null; }
    adOverlay.classList.remove('active');
    adSkipBtn.disabled = true;
    adTimerSpan.textContent = '30';
}

function startAdCycle() {
    if (adCycleInterval) clearInterval(adCycleInterval);
    setTimeout(() => { if (adCycleActive) showAd(null, 30); }, 10000);
    adCycleInterval = setInterval(() => { if (adCycleActive) showAd(null, 30); }, 600000);
}

function toggleAdCycle() {
    adCycleActive = !adCycleActive;
    const btn = document.getElementById('adCycleBtn');
    const statusText = document.getElementById('adStatusText');
    if (adCycleActive) {
        btn.innerHTML = '<i class="fas fa-stop"></i> Döngüyü Durdur';
        statusText.textContent = 'Aktif (10 dk)';
        startAdCycle();
    } else {
        btn.innerHTML = '<i class="fas fa-play"></i> Döngüyü Başlat';
        statusText.textContent = 'Durduruldu';
        if (adCycleInterval) { clearInterval(adCycleInterval); adCycleInterval = null; }
    }
}

function showAdManually() { showAd(null, 30); }

function loadAdContents() {
    if (!adLinksRef) return;
    adLinksRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            cachedAdContents = Array.isArray(data) ? data : Object.values(data);
        } else {
            cachedAdContents = [...DEFAULT_AD_CONTENTS];
            const adContentsObj = {};
            DEFAULT_AD_CONTENTS.forEach((item, index) => { adContentsObj[index.toString()] = item; });
            adLinksRef.set(adContentsObj);
        }
        if (isOwner) updateAdContentsList();
    });
}

function updateAdContentsList() {
    const container = document.getElementById('adLinksList');
    if (!container) return;
    if (!cachedAdContents || cachedAdContents.length === 0) {
        container.innerHTML = '<div style="color:var(--text-muted); text-align:center;">Hiç reklam içeriği yok.</div>';
        return;
    }
    let html = '';
    cachedAdContents.forEach((item, index) => {
        const displayContent = item.type === 'image' ? (item.content.substring(0, 30) + '...') : ('Video ID: ' + item.content);
        const typeIcon = item.type === 'image' ? '🖼️' : '🎬';
        html += `
            <div class="role-list-item" data-index="${index}">
                <div class="role-list-info" style="flex:1; overflow:hidden;">
                    <span class="role-list-name" style="font-size:11px;">${typeIcon} ${displayContent}</span>
                </div>
                <div class="role-list-actions">
                    <button class="role-list-btn" onclick="moveAdContentUp(${index})" ${index === 0 ? 'disabled style="opacity:0.3;"' : ''}><i class="fas fa-arrow-up"></i></button>
                    <button class="role-list-btn" onclick="moveAdContentDown(${index})" ${index === cachedAdContents.length - 1 ? 'disabled style="opacity:0.3;"' : ''}><i class="fas fa-arrow-down"></i></button>
                    <button class="role-list-btn" onclick="editAdContent(${index})"><i class="fas fa-edit"></i></button>
                    <button class="role-list-btn danger" onclick="deleteAdContent(${index})"><i class="fas fa-trash"></i></button>
                </div>
            </div>`;
    });
    container.innerHTML = html;
}

function addAdContent() {
    const newType = document.getElementById('newAdType').value;
    const newContentInput = document.getElementById('newAdContentInput').value.trim();
    if (!newContentInput) { alert('Lütfen bir içerik girin!'); return; }
    let contentToStore = newContentInput;
    if (newType === 'video') {
        const videoId = extractVideoId(newContentInput);
        if (!videoId) { alert('Geçersiz YouTube linki!'); return; }
        contentToStore = videoId;
    } else {
        if (!newContentInput.startsWith('http')) { alert('Lütfen geçerli bir resim URL\'si girin.'); return; }
    }
    cachedAdContents.push({ type: newType, content: contentToStore });
    saveAdContentOrder();
    document.getElementById('newAdContentInput').value = '';
}

function deleteAdContent(index) {
    if (index >= 0 && index < cachedAdContents.length) {
        cachedAdContents.splice(index, 1);
        saveAdContentOrder();
    }
}

function editAdContent(index) {
    const item = cachedAdContents[index];
    if (!item) return;
    const newType = prompt("Yeni tip (image/video):", item.type);
    if (newType !== 'image' && newType !== 'video') { alert('Tip "image" veya "video" olmalıdır.'); return; }
    let newContent = prompt("Yeni içerik:", item.type === 'video' ? `https://youtu.be/${item.content}` : item.content);
    if (!newContent) return;
    let contentToStore = newContent;
    if (newType === 'video') {
        const videoId = extractVideoId(newContent);
        if (!videoId) { alert('Geçersiz YouTube linki!'); return; }
        contentToStore = videoId;
    } else {
        if (!newContent.startsWith('http')) { alert('Geçerli bir resim URL\'si girin.'); return; }
    }
    cachedAdContents[index] = { type: newType, content: contentToStore };
    saveAdContentOrder();
}

function moveAdContentUp(index) {
    if (index > 0) {
        [cachedAdContents[index - 1], cachedAdContents[index]] = [cachedAdContents[index], cachedAdContents[index - 1]];
        saveAdContentOrder();
    }
}

function moveAdContentDown(index) {
    if (index < cachedAdContents.length - 1) {
        [cachedAdContents[index], cachedAdContents[index + 1]] = [cachedAdContents[index + 1], cachedAdContents[index]];
        saveAdContentOrder();
    }
}

function saveAdContentOrder() {
    const adContentsObj = {};
    cachedAdContents.forEach((item, index) => { adContentsObj[index.toString()] = item; });
    adLinksRef.set(adContentsObj)
        .then(() => addSystemMessage('✅ Reklam sırası kaydedildi.'))
        .catch(err => { console.error("Reklam sırası kaydedilemedi:", err); addSystemMessage('❌ Reklam sırası kaydedilemedi!'); });
}