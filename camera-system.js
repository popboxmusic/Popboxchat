// Kullanıcı Yönetim Sistemi
class UserSystem {
    constructor() {
        this.currentUser = null;
        this.onlineUsers = new Set();
        this.userColors = new Map();
        this.init();
    }
    
    init() {
        this.loadUserColors();
    }
    
    loadUserColors() {
        // Kullanıcı renklerini yükle
        const colors = [
            '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444',
            '#06b6d4', '#84cc16', '#f97316', '#8b5cf6', '#ec4899'
        ];
        
        const db = window.eliteChatDatabase;
        if (db) {
            let index = 0;
            db.users.forEach((user, userId) => {
                this.userColors.set(userId, colors[index % colors.length]);
                index++;
            });
        }
    }
    
    getUserColor(userId) {
        return this.userColors.get(userId) || '#3b82f6';
    }
    
    updateOnlineList() {
        const container = document.getElementById('userList');
        const countElement = document.getElementById('onlineCount');
        
        if (!container) return;
        
        const app = window.eliteChat;
        const db = window.eliteChatDatabase;
        const channelSystem = window.channelSystem;
        
        if (!app || !db || !channelSystem) return;
        
        // Kanal kullanıcılarını al
        const channel = channelSystem.channels.get(app.currentChannel);
        if (!channel) return;
        
        const channelUsers = Array.from(channel.users)
            .map(userId => db.getUser(userId))
            .filter(user => user && (!user.invisible || user.id === app.currentUser?.id))
            .sort(this.sortUsers.bind(this));
        
        // Online sayısı
        const onlineCount = channelUsers.filter(u => u.online).length;
        if (countElement) {
            countElement.textContent = `(${onlineCount})`;
        }
        
        // Kullanıcı sayısını göster
        const usersElement = document.getElementById('channelUsers');
        if (usersElement) {
            usersElement.textContent = channelUsers.length;
        }
        
        // Kullanıcı listesini güncelle
        container.innerHTML = '';
        
        if (channelUsers.length === 0) {
            container.innerHTML = `
                <div class="empty-users">
                    <i class="fas fa-user-slash"></i>
                    <p>Henüz kullanıcı yok</p>
                </div>
            `;
            return;
        }
        
        channelUsers.forEach(user => {
            this.createUserItem(container, user, app);
        });
    }
    
    createUserItem(container, user, app) {
        const item = document.createElement('div');
        item.className = `user-item ${user.online ? 'online' : 'offline'} 
                         ${app.activePM === user.id ? 'active' : ''}`;
        
        const displayName = user.id === 'mate' ? '🤖Mate' : user.name;
        const userColor = this.getUserColor(user.id);
        
        item.innerHTML = `
            <div class="user-avatar" style="background: ${userColor};">
                ${user.avatar}
                ${user.online ? '<span class="online-dot"></span>' : ''}
            </div>
            <div class="user-info">
                <div class="user-name">
                    ${displayName}
                    ${this.getRoleBadge(user.role)}
                    ${user.registered ? '<i class="fas fa-check-circle verified-icon"></i>' : ''}
                </div>
                <div class="user-status">
                    ${user.online ? '🟢 Çevrimiçi' : '⚫ Çevrimdışı'}
                    ${user.bio ? ' • ' + (user.bio.length > 20 ? user.bio.substring(0, 20) + '...' : user.bio) : ''}
                </div>
            </div>
            ${user.id === app.currentUser?.id ? '<div class="current-user-badge">Siz</div>' : ''}
        `;
        
        // PM için tıklama
        if (user.id !== app.currentUser?.id) {
            item.addEventListener('click', () => {
                const pmSystem = window.pmSystem;
                if (pmSystem) {
                    pmSystem.openPrivateChat(user.id);
                }
            });
            
            item.style.cursor = 'pointer';
        }
        
        // Sağ tık menüsü (gelecek versiyon)
        item.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showUserContextMenu(e, user);
        });
        
        container.appendChild(item);
    }
    
    sortUsers(a, b) {
        // Rol sıralaması
        const roleOrder = {
            'owner': 1,
            'admin': 2,
            'coadmin': 3,
            'operator': 4,
            'voice': 5,
            'user': 6
        };
        
        const roleA = roleOrder[a.role] || 6;
        const roleB = roleOrder[b.role] || 6;
        
        if (roleA !== roleB) {
            return roleA - roleB;
        }
        
        // Online önceliği
        if (a.online !== b.online) {
            return a.online ? -1 : 1;
        }
        
        // İsim sıralaması
        return a.name.localeCompare(b.name);
    }
    
    getRoleBadge(role) {
        const badges = {
            'owner': '<span class="role-badge role-owner" title="Owner">O</span>',
            'admin': '<span class="role-badge role-admin" title="Admin">A</span>',
            'coadmin': '<span class="role-badge role-coadmin" title="Co-Admin">C</span>',
            'operator': '<span class="role-badge role-operator" title="Operator">OP</span>',
            'voice': '<span class="role-badge role-voice" title="Voice">V</span>'
        };
        return badges[role] || '';
    }
    
    showUserContextMenu(e, user) {
        // Context menu oluştur (gelecek versiyon)
        console.log('User context menu:', user.name);
        
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.style.position = 'fixed';
        menu.style.left = e.clientX + 'px';
        menu.style.top = e.clientY + 'px';
        menu.style.background = 'var(--bg-secondary)';
        menu.style.border = '1px solid var(--border-light)';
        menu.style.borderRadius = '8px';
        menu.style.padding = '8px 0';
        menu.style.zIndex = '9999';
        menu.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
        menu.style.minWidth = '180px';
        
        const items = [
            { text: 'Özel Mesaj Gönder', icon: 'fa-comment', action: () => {
                const pmSystem = window.pmSystem;
                if (pmSystem) pmSystem.openPrivateChat(user.id);
            }},
            { text: 'Kullanıcı Bilgisi', icon: 'fa-info-circle', action: () => {
                this.showUserInfo(user);
            }},
            { separator: true },
            { text: 'Kanaldan At', icon: 'fa-user-slash', action: () => {
                this.kickUser(user.id);
            }},
            { text: 'Sustur', icon: 'fa-volume-mute', action: () => {
                this.muteUser(user.id);
            }},
            { text: 'Banla', icon: 'fa-ban', action: () => {
                this.banUser(user.id);
            }}
        ];
        
        items.forEach(item => {
            if (item.separator) {
                const hr = document.createElement('hr');
                hr.style.margin = '4px 0';
                hr.style.border = 'none';
                hr.style.borderTop = '1px solid var(--border-light)';
                menu.appendChild(hr);
            } else {
                const div = document.createElement('div');
                div.className = 'context-menu-item';
                div.style.padding = '8px 16px';
                div.style.cursor = 'pointer';
                div.style.display = 'flex';
                div.style.alignItems = 'center';
                div.style.gap = '10px';
                div.style.fontSize = '14px';
                
                div.innerHTML = `
                    <i class="fas ${item.icon}" style="width: 16px;"></i>
                    <span>${item.text}</span>
                `;
                
                div.addEventListener('click', () => {
                    item.action();
                    menu.remove();
                });
                
                div.addEventListener('mouseenter', () => {
                    div.style.background = 'var(--bg-tertiary)';
                });
                
                div.addEventListener('mouseleave', () => {
                    div.style.background = 'transparent';
                });
                
                menu.appendChild(div);
            }
        });
        
        document.body.appendChild(menu);
        
        // Menüyü kapat
        const closeMenu = () => {
            menu.remove();
            document.removeEventListener('click', closeMenu);
        };
        
        setTimeout(() => {
            document.addEventListener('click', closeMenu);
        }, 100);
    }
    
    showUserInfo(user) {
        const infoHtml = `
            <div style="padding: 20px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <div class="user-avatar-large" style="background: ${this.getUserColor(user.id)};">
                        ${user.avatar}
                    </div>
                    <h3 style="margin: 10px 0 5px 0;">${user.name}</h3>
                    <div style="color: var(--text-secondary); font-size: 14px;">
                        ${this.getRoleName(user.role)} • 
                        ${user.online ? '🟢 Çevrimiçi' : '⚫ Çevrimdışı'}
                    </div>
                </div>
                
                <div style="font-size: 14px;">
                    <div style="margin-bottom: 10px;">
                        <strong>Katılım Tarihi:</strong> 
                        ${new Date(user.joinDate).toLocaleDateString('tr-TR')}
                    </div>
                    
                    ${user.bio ? `
                        <div style="margin-bottom: 10px;">
                            <strong>Biyografi:</strong>
                            <div style="margin-top: 5px; padding: 10px; background: var(--bg-tertiary); border-radius: 6px;">
                                ${user.bio}
                            </div>
                        </div>
                    ` : ''}
                    
                    <div style="margin-bottom: 10px;">
                        <strong>Durum:</strong>
                        ${user.registered ? '✅ Kayıtlı Kullanıcı' : '👤 Misafir'}
                    </div>
                    
                    <div>
                        <strong>Son Görülme:</strong>
                        ${new Date(user.lastSeen).toLocaleString('tr-TR')}
                    </div>
                </div>
            </div>
        `;
        
        // Modal oluştur
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 400px;">
                <div class="modal-header">
                    <h3>Kullanıcı Bilgisi</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    ${infoHtml}
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove()">
                        Tamam
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.style.display = 'flex';
        
        // Kapat butonu
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    getRoleName(role) {
        const names = {
            'owner': 'Owner',
            'admin': 'Admin',
            'coadmin': 'Co-Admin',
            'operator': 'Operator',
            'voice': 'Voice',
            'user': 'Kullanıcı'
        };
        return names[role] || 'Kullanıcı';
    }
    
    kickUser(userId) {
        // Yetki kontrolü
        const app = window.eliteChat;
        if (!app?.currentUser) return;
        
        // Kanal bilgisi
        const channelSystem = window.channelSystem;
        const channel = channelSystem?.channels.get(app.currentChannel);
        if (!channel) return;
        
        // Yetki kontrolü
        if (channel.owner !== app.currentUser.id && 
            !['owner', 'admin'].includes(app.currentUser.role)) {
            alert('Bu işlem için yetkiniz yok!');
            return;
        }
        
        // Kendini atamaz
        if (userId === app.currentUser.id) {
            alert('Kendinizi atamazsınız!');
            return;
        }
        
        // Mate bot'unu atamaz
        if (userId === 'mate') {
            alert('Mate bot\'unu atamazsınız!');
            return;
        }
        
        // Kullanıcıyı kanaldan çıkar
        channel.users.delete(userId);
        
        // Sistem mesajı
        const db = window.eliteChatDatabase;
        const user = db?.getUser(userId);
        if (user) {
            app.addSystemMessage?.(`👢 ${user.name} kanaldan atıldı!`);
        }
        
        // Listeyi güncelle
        this.updateOnlineList();
    }
    
    muteUser(userId) {
        // Mute işlemi (gelecek versiyon)
        console.log('Mute user:', userId);
    }
    
    banUser(userId) {
        // Ban işlemi (gelecek versiyon)
        console.log('Ban user:', userId);
    }
}

// Kullanıcı sistemini başlat
window.userSystem = new UserSystem();
