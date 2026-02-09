// Modal Yönetim Sistemi
class ModalSystem {
    constructor() {
        this.modals = {};
        this.currentModal = null;
        this.initModals();
    }
    
    initModals() {
        // Video Modalı
        this.createModal('videoModal', {
            title: 'Video Yönetimi',
            content: `
                <div class="modal-section">
                    <label>YouTube URL veya Video ID</label>
                    <input type="text" id="videoUrl" class="modal-input" 
                           placeholder="https://youtube.com/watch?v=VIDEO_ID">
                </div>
                <div class="modal-section">
                    <label>Video Başlığı</label>
                    <input type="text" id="videoTitleInput" class="modal-input" 
                           placeholder="Video başlığı (isteğe bağlı)">
                </div>
            `,
            buttons: [
                { text: 'İptal', class: 'btn-secondary', action: 'cancel' },
                { text: 'Kaydet', class: 'btn-primary', action: 'save' }
            ]
        });
        
        // Kanal Oluşturma Modalı
        this.createModal('channelModal', {
            title: 'Yeni Kanal Oluştur',
            content: `
                <div class="modal-section">
                    <label>Kanal Adı</label>
                    <input type="text" id="channelName" class="modal-input" placeholder="#kanal_adi">
                </div>
                <div class="modal-section">
                    <label>Kanal Türü</label>
                    <select id="channelType" class="modal-input">
                        <option value="public">Public - Herkes katılabilir</option>
                        <option value="private">Private - Sadece davetliler</option>
                        <option value="secret">Secret - Gizli kanal</option>
                    </select>
                </div>
                <div class="modal-section">
                    <label>Kanal Konusu</label>
                    <input type="text" id="channelTopicInput" class="modal-input" placeholder="Kanal konusu">
                </div>
            `,
            buttons: [
                { text: 'İptal', class: 'btn-secondary', action: 'cancel' },
                { text: 'Oluştur', class: 'btn-success', action: 'create' }
            ]
        });
        
        // Ayarlar Modalı
        this.createModal('settingsModal', {
            title: 'Ayarlar',
            content: `
                <div class="modal-section">
                    <label>Kullanıcı Adı</label>
                    <input type="text" id="settingsNick" class="modal-input" value="">
                </div>
                <div class="modal-section">
                    <label>Avatar</label>
                    <div class="avatar-section">
                        <div id="settingsAvatar" class="avatar-display">A</div>
                        <button id="changeAvatarBtn" class="btn btn-secondary">Değiştir</button>
                    </div>
                </div>
                <div class="modal-section">
                    <label>Biyografi</label>
                    <textarea id="settingsBio" class="modal-input" rows="3" placeholder="Kendinizden bahsedin..."></textarea>
                </div>
                <div class="modal-section toggle-section">
                    <div>
                        <div class="toggle-label">Görünmez Mod</div>
                        <div class="toggle-description">Çevrimiçi görünmez olun</div>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="settingsInvisible">
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            `,
            buttons: [
                { text: 'İptal', class: 'btn-secondary', action: 'cancel' },
                { text: 'Kaydet', class: 'btn-primary', action: 'save' }
            ]
        });
        
        // Özel Sohbet Modalı
        this.createModal('newPmModal', {
            title: 'Yeni Özel Sohbet',
            content: `
                <div class="modal-section">
                    <label>Kullanıcı Adı</label>
                    <input type="text" id="pmUserInput" class="modal-input" placeholder="Kullanıcı adı yazın">
                    <div id="pmUserSuggestions" class="suggestions-container"></div>
                </div>
                <div class="modal-section">
                    <label>İlk Mesaj</label>
                    <textarea id="pmFirstMessage" class="modal-input" rows="3" placeholder="İlk mesajınız..."></textarea>
                </div>
            `,
            buttons: [
                { text: 'İptal', class: 'btn-secondary', action: 'cancel' },
                { text: 'Başlat', class: 'btn-primary', action: 'start' }
            ]
        });
    }
    
    createModal(id, config) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = id;
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${config.title}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    ${config.content}
                </div>
                <div class="modal-footer">
                    ${config.buttons.map(btn => 
                        `<button class="btn ${btn.class}" data-action="${btn.action}">${btn.text}</button>`
                    ).join('')}
                </div>
            </div>
        `;
        
        document.getElementById('modals-container').appendChild(modal);
        this.modals[id] = modal;
        
        // Event listener'ları ekle
        modal.querySelector('.modal-close').addEventListener('click', () => this.closeModal(id));
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeModal(id);
        });
        
        config.buttons.forEach(btn => {
            const button = modal.querySelector(`[data-action="${btn.action}"]`);
            if (button) {
                button.addEventListener('click', () => this.handleModalAction(id, btn.action));
            }
        });
    }
    
    openModal(id) {
        if (this.currentModal) {
            this.closeModal(this.currentModal);
        }
        
        const modal = this.modals[id];
        if (modal) {
            modal.style.display = 'flex';
            this.currentModal = id;
            
            // Modal açıldığında yapılacak işlemler
            this.onModalOpen(id);
        }
    }
    
    closeModal(id) {
        const modal = this.modals[id];
        if (modal) {
            modal.style.display = 'none';
            this.currentModal = null;
        }
    }
    
    onModalOpen(id) {
        switch(id) {
            case 'settingsModal':
                this.loadSettings();
                break;
            case 'newPmModal':
                this.setupPMSuggestions();
                break;
        }
    }
    
    handleModalAction(modalId, action) {
        const app = window.eliteChat;
        
        switch(modalId) {
            case 'videoModal':
                if (action === 'save') app.saveChannelVideo();
                else if (action === 'cancel') this.closeModal(modalId);
                break;
                
            case 'channelModal':
                if (action === 'create') app.createNewChannel();
                else if (action === 'cancel') this.closeModal(modalId);
                break;
                
            case 'settingsModal':
                if (action === 'save') app.saveSettings();
                else if (action === 'cancel') this.closeModal(modalId);
                break;
                
            case 'newPmModal':
                if (action === 'start') app.startNewPM();
                else if (action === 'cancel') this.closeModal(modalId);
                break;
        }
    }
    
    loadSettings() {
        const app = window.eliteChat;
        if (!app.currentUser) return;
        
        document.getElementById('settingsNick').value = app.currentUser.name;
        document.getElementById('settingsAvatar').textContent = app.currentUser.avatar;
        document.getElementById('settingsBio').value = app.currentUser.bio || '';
        document.getElementById('settingsInvisible').checked = app.currentUser.invisible || false;
    }
    
    setupPMSuggestions() {
        const input = document.getElementById('pmUserInput');
        const container = document.getElementById('pmUserSuggestions');
        
        input.addEventListener('input', () => {
            const query = input.value.trim().toLowerCase();
            container.innerHTML = '';
            
            if (!query) return;
            
            const db = window.eliteChatDatabase;
            const app = window.eliteChat;
            
            const matches = Array.from(db.users.values())
                .filter(user => 
                    user.id !== app.currentUser?.id &&
                    user.id !== 'mate' &&
                    user.name.toLowerCase().includes(query)
                )
                .slice(0, 5);
            
            if (matches.length === 0) {
                container.innerHTML = '<div class="no-suggestions">Kullanıcı bulunamadı</div>';
                return;
            }
            
            matches.forEach(user => {
                const div = document.createElement('div');
                div.className = 'suggestion-item';
                div.innerHTML = `
                    <div class="suggestion-avatar">${user.avatar}</div>
                    <div class="suggestion-info">
                        <div class="suggestion-name">${user.name}</div>
                        <div class="suggestion-status">${user.online ? '🟢 Çevrimiçi' : '⚫ Çevrimdışı'}</div>
                    </div>
                `;
                
                div.addEventListener('click', () => {
                    input.value = user.name;
                    container.innerHTML = '';
                });
                
                container.appendChild(div);
            });
        });
    }
}

// Modal sistemini başlat
window.modalSystem = new ModalSystem();