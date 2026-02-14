// ========== ADMIN.JS - CETCETY Yönetici Paneli ==========
console.log('%c👑 CETCETY Yönetici Sistemi başlatılıyor...', 'color: #ff0000; font-size: 14px; font-weight: bold;');

class CETCETYAdmin {
    constructor() {
        this.owner = {
            name: 'MateKy',
            password: 'Sahi17407@SCM',
            role: 'owner',
            level: 5
        };
        this.admins = [];
        this.loadAdmins();
        console.log('%c✅ Yönetici sistemi hazır!', 'color: #4caf50; font-size: 12px;');
    }

    // ========== YÖNETİCİLERİ YÜKLE ==========
    loadAdmins() {
        const users = JSON.parse(localStorage.getItem('cetcety_users')) || [];
        
        // Tüm adminları bul (owner hariç)
        this.admins = users.filter(u => u.role === 'admin');
        
        this.saveAdminList();
        console.log(`📋 ${this.admins.length} yönetici yüklendi`);
    }

    // ========== YÖNETİCİ LİSTESİNİ KAYDET ==========
    saveAdminList() {
        const adminData = this.admins.map(a => ({
            name: a.name,
            role: a.role,
            level: a.level,
            addedAt: a.addedAt || Date.now(),
            addedBy: a.addedBy,
            lastActive: a.lastActive
        }));
        localStorage.setItem('cetcety_admins', JSON.stringify(adminData));
    }

    // ========== YENİ YÖNETİCİ EKLE (SADECE OWNER) ==========
    addAdmin(adder, newAdminName, password) {
        // Sadece owner ekleyebilir
        if (adder !== this.owner.name) {
            this.addSystemMessage('🚫 Sadece OWNER yönetici ekleyebilir!');
            return false;
        }

        const users = JSON.parse(localStorage.getItem('cetcety_users')) || [];
        let user = users.find(u => u.name === newAdminName);
        
        if (!user) {
            // Yeni kullanıcı oluştur
            user = {
                id: Date.now(),
                name: newAdminName,
                role: 'admin',
                level: 4,
                password: password || '',
                subscribedChannels: ['genel', 'admin'],
                joinDate: new Date().toISOString(),
                addedBy: adder,
                addedAt: Date.now()
            };
            users.push(user);
        } else {
            // Mevcut kullanıcıyı admin yap
            user.role = 'admin';
            user.level = 4;
            if (!user.subscribedChannels?.includes('admin')) {
                if (!user.subscribedChannels) user.subscribedChannels = ['genel'];
                user.subscribedChannels.push('admin');
            }
            user.addedBy = adder;
            user.addedAt = Date.now();
        }
        
        localStorage.setItem('cetcety_users', JSON.stringify(users));
        
        // Admin listesini güncelle
        this.loadAdmins();
        
        // Admin kanalına mesaj gönder
        this.addAdminMessage(`🎉 Yeni admin: ${newAdminName} (Owner tarafından eklendi)`);
        this.addSystemMessage(`✅ ${newAdminName} admin yapıldı!`);
        
        return true;
    }

    // ========== YÖNETİCİ SİL (SADECE OWNER) ==========
    removeAdmin(remover, adminName) {
        if (remover !== this.owner.name) {
            this.addSystemMessage('🚫 Sadece OWNER yönetici silebilir!');
            return false;
        }

        if (adminName === this.owner.name) {
            this.addSystemMessage('🚫 Owner silinemez!');
            return false;
        }

        const users = JSON.parse(localStorage.getItem('cetcety_users')) || [];
        const userIndex = users.findIndex(u => u.name === adminName);
        
        if (userIndex > -1 && users[userIndex].role === 'admin') {
            // Admin yetkisini al
            users[userIndex].role = 'user';
            users[userIndex].level = 1;
            
            // Admin kanalından çıkar
            if (users[userIndex].subscribedChannels) {
                const subIndex = users[userIndex].subscribedChannels.indexOf('admin');
                if (subIndex > -1) {
                    users[userIndex].subscribedChannels.splice(subIndex, 1);
                }
            }
            
            localStorage.setItem('cetcety_users', JSON.stringify(users));
            
            // Admin listesini güncelle
            this.loadAdmins();
            
            this.addAdminMessage(`👋 Admin yetkisi alındı: ${adminName} (Owner tarafından)`);
            this.addSystemMessage(`✅ ${adminName} admin yetkisi alındı!`);
            return true;
        }
        
        this.addSystemMessage(`❌ ${adminName} bulunamadı!`);
        return false;
    }

    // ========== YÖNETİCİ KONTROLÜ ==========
    isAdmin(username) {
        return this.admins.some(a => a.name === username);
    }

    isOwner(username) {
        return username === this.owner.name;
    }

    // ========== YÖNETİCİ PANELİ HTML ==========
    getAdminPanelHTML(currentUser) {
        const isOwner = currentUser === this.owner.name;
        
        let html = `
        <div class="panel-header">
            <h3><i class="fas fa-crown" style="color:#ffd700;"></i> Yönetici Paneli</h3>
            <div class="panel-close" onclick="closeLeftPanel()"><i class="fas fa-times"></i></div>
        </div>
        <div class="panel-content">
            <div style="margin-bottom: 20px; padding: 16px; background: #1a1a1a; border-radius: 8px; border-left: 4px solid #ffd700;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 48px; height: 48px; border-radius: 50%; background: #ffd700; display: flex; align-items: center; justify-content: center; font-size: 24px;">
                        👑
                    </div>
                    <div>
                        <div style="font-weight: 600; color: #ffd700;">${this.owner.name}</div>
                        <div style="font-size: 12px; color: #aaa;">Kurucu & Owner</div>
                    </div>
                </div>
            </div>
            
            <h4 style="margin: 20px 0 10px; color: #fff; display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-shield-alt" style="color: #ff6b6b;"></i> 
                Aktif Yöneticiler (${this.admins.length})
            </h4>
        `;

        // Admin listesi
        if (this.admins.length === 0) {
            html += `<div style="color: #aaa; text-align: center; padding: 20px;">📭 Henüz admin yok</div>`;
        } else {
            this.admins.forEach(admin => {
                html += `
                <div style="
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px;
                    background: #1a1a1a;
                    border-radius: 8px;
                    margin-bottom: 8px;
                    border-left: 3px solid #ff6b6b;
                ">
                    <div style="width: 36px; height: 36px; border-radius: 50%; background: #ff6b6b; display: flex; align-items: center; justify-content: center;">
                        ⚡
                    </div>
                    <div style="flex: 1;">
                        <div style="font-weight: 600; color: #fff;">${admin.name}</div>
                        <div style="font-size: 11px; color: #aaa;">
                            ${admin.addedAt ? 'Ekleme: ' + new Date(admin.addedAt).toLocaleDateString('tr-TR') : ''}
                            ${admin.addedBy ? ' • ' + admin.addedBy + ' tarafından' : ''}
                        </div>
                    </div>
                    ${isOwner ? `
                        <button onclick="window.adminSystem.removeAdminPrompt('${admin.name}')" 
                            style="
                                padding: 6px 12px;
                                background: #6d0000;
                                border: none;
                                border-radius: 6px;
                                color: white;
                                font-size: 11px;
                                cursor: pointer;
                            ">Sil</button>
                    ` : ''}
                </div>
                `;
            });
        }

        // Yeni admin ekleme formu (SADECE OWNER GÖRÜR)
        if (isOwner) {
            html += `
                <h4 style="margin: 20px 0 10px; color: #fff;">➕ Yeni Admin Ekle</h4>
                <div style="background: #1a1a1a; border-radius: 8px; padding: 16px;">
                    <div style="margin-bottom: 12px;">
                        <input type="text" id="newAdminName" placeholder="Kullanıcı adı" 
                            style="
                                width: 100%;
                                padding: 12px;
                                background: #2a2a2a;
                                border: 1px solid #3f3f3f;
                                border-radius: 6px;
                                color: #fff;
                                margin-bottom: 8px;
                            ">
                        <input type="password" id="newAdminPassword" placeholder="Şifre (opsiyonel)" 
                            style="
                                width: 100%;
                                padding: 12px;
                                background: #2a2a2a;
                                border: 1px solid #3f3f3f;
                                border-radius: 6px;
                                color: #fff;
                            ">
                    </div>
                    <button onclick="window.adminSystem.addAdminFromPanel()" 
                        style="
                            width: 100%;
                            padding: 12px;
                            background: #ffd700;
                            border: none;
                            border-radius: 6px;
                            color: #000;
                            font-weight: 600;
                            cursor: pointer;
                        ">Admin Yap</button>
                </div>

                <h4 style="margin: 20px 0 10px; color: #fff;">🔐 Owner Şifre</h4>
                <div style="background: #1a1a1a; border-radius: 8px; padding: 16px;">
                    <div style="margin-bottom: 12px;">
                        <input type="password" id="ownerPassword" placeholder="Mevcut şifre" 
                            style="
                                width: 100%;
                                padding: 12px;
                                background: #2a2a2a;
                                border: 1px solid #3f3f3f;
                                border-radius: 6px;
                                color: #fff;
                                margin-bottom: 8px;
                            ">
                        <input type="password" id="newOwnerPassword" placeholder="Yeni şifre" 
                            style="
                                width: 100%;
                                padding: 12px;
                                background: #2a2a2a;
                                border: 1px solid #3f3f3f;
                                border-radius: 6px;
                                color: #fff;
                            ">
                    </div>
                    <button onclick="window.adminSystem.changeOwnerPassword()" 
                        style="
                            width: 100%;
                            padding: 12px;
                            background: #ff0000;
                            border: none;
                            border-radius: 6px;
                            color: white;
                            font-weight: 600;
                            cursor: pointer;
                        ">Şifre Değiştir</button>
                </div>
            `;
        }

        html += `
            <div style="margin-top: 20px; padding: 12px; background: #1a1a1a; border-radius: 8px; font-size: 12px; color: #aaa;">
                <i class="fas fa-info-circle"></i> 
                Yöneticiler tüm kanalları görebilir, kullanıcıları yönetebilir.<br>
                <span style="color: #ffd700;">👑 Owner</span> yeni admin ekleyebilir/silebilir.
            </div>
        </div>
        `;

        return html;
    }

    // ========== PANEL FONKSİYONLARI ==========
    addAdminFromPanel() {
        const name = document.getElementById('newAdminName')?.value.trim();
        const password = document.getElementById('newAdminPassword')?.value.trim();
        
        if (!name) {
            alert('Kullanıcı adı girin!');
            return;
        }
        
        if (this.addAdmin(this.owner.name, name, password)) {
            document.getElementById('newAdminName').value = '';
            document.getElementById('newAdminPassword').value = '';
            this.refreshPanel();
        }
    }

    removeAdminPrompt(adminName) {
        if (confirm(`${adminName} admin yetkisini almak istediğinize emin misiniz?`)) {
            if (this.removeAdmin(this.owner.name, adminName)) {
                this.refreshPanel();
            }
        }
    }

    changeOwnerPassword() {
        const currentPwd = document.getElementById('ownerPassword')?.value.trim();
        const newPwd = document.getElementById('newOwnerPassword')?.value.trim();
        
        if (!currentPwd || !newPwd) {
            alert('Şifreleri girin!');
            return;
        }
        
        if (currentPwd !== this.owner.password) {
            alert('Mevcut şifre yanlış!');
            return;
        }
        
        this.owner.password = newPwd;
        alert('✅ Owner şifresi değiştirildi!');
        
        document.getElementById('ownerPassword').value = '';
        document.getElementById('newOwnerPassword').value = '';
    }

    refreshPanel() {
        const activeUser = JSON.parse(localStorage.getItem('cetcety_active_user'));
        const panel = document.getElementById('leftPanel');
        if (panel && activeUser) {
            panel.innerHTML = this.getAdminPanelHTML(activeUser.name);
        }
    }

    // ========== ADMIN KANALINA MESAJ ==========
    addAdminMessage(text) {
        const channelMessages = JSON.parse(localStorage.getItem('cetcety_channel_messages')) || {};
        if (!channelMessages['admin']) channelMessages['admin'] = [];
        
        channelMessages['admin'].push({
            sender: '📢 Admin Sistemi',
            text: text,
            time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
            timestamp: Date.now()
        });
        
        localStorage.setItem('cetcety_channel_messages', JSON.stringify(channelMessages));
    }

    // ========== SİSTEM MESAJI ==========
    addSystemMessage(text) {
        const messagesDiv = document.getElementById('messages');
        if (!messagesDiv) return;
        
        const msgDiv = document.createElement('div');
        msgDiv.className = 'system-message';
        msgDiv.innerHTML = `<i class="fas fa-info-circle"></i> 👑 ${this.escapeHTML(text)}`;
        messagesDiv.appendChild(msgDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    // ========== OTOMATİK GÜNCELLEME ==========
    autoUpdate() {
        // Her 30 saniyede bir admin listesini güncelle
        setInterval(() => {
            this.loadAdmins();
        }, 30000);
    }

    escapeHTML(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Global admin sistemini başlat
window.adminSystem = new CETCETYAdmin();
window.adminSystem.autoUpdate();

// Storage değişikliklerini dinle
window.addEventListener('storage', (e) => {
    if (e.key === 'cetcety_users') {
        window.adminSystem.loadAdmins();
    }
});