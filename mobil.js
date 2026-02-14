// ========== MOBIL.JS - CETCETY Sade Mobil Görünüm (Görseldeki Gibi) ==========
console.log('%c📱 CETCETY Mobil başlatılıyor...', 'color: #00ff00; font-size: 14px; font-weight: bold;');

class CETCETYMobil {
    constructor() {
        this.isMobile = window.innerWidth <= 768;
        this.solMenuAcik = false;
        this.sagMenuAcik = false;
        this.videoAcik = false;
        
        if (this.isMobile) {
            this.mobilGorunum();
            this.mobilOlaylar();
        }
        
        // Pencere boyutu değişince kontrol et
        window.addEventListener('resize', () => {
            this.isMobile = window.innerWidth <= 768;
            if (this.isMobile) {
                this.mobilGorunum();
            } else {
                this.masaustuGorunum();
            }
        });
        
        console.log('%c✅ Mobil görünüm hazır!', 'color: #4caf50;');
    }

    mobilGorunum() {
        document.body.classList.add('mobil-gorunum');
        document.body.classList.remove('masaustu-gorunum');
        this.stilleriEkle();
        this.butonlariEkle();
        this.duzenle();
        this.mesajlariGuncelle();
    }

    masaustuGorunum() {
        document.body.classList.remove('mobil-gorunum');
        document.body.classList.add('masaustu-gorunum');
        
        // Masaüstünde normal görünüme dön
        const iconPanel = document.querySelector('.icon-panel');
        if (iconPanel) iconPanel.style.position = 'relative';
        
        const mediaPanel = document.querySelector('.media-panel');
        if (mediaPanel) mediaPanel.style.display = 'flex';
        
        // Ekstra mobil elementleri temizle
        document.querySelectorAll('.mobil-ekstra').forEach(el => el.remove());
    }

    stilleriEkle() {
        const style = document.createElement('style');
        style.textContent = `
            /* ========== MOBİL GÖRÜNÜM - GÖRSELDEKİ GİBİ ========== */
            .mobil-gorunum {
                --header-yukseklik: 60px;
                --input-yukseklik: 80px;
            }

            /* Mobilde app dikey */
            .mobil-gorunum .app {
                flex-direction: column;
                height: 100vh;
                overflow: hidden;
            }

            /* ========== SOL İKON PANELİ - Hamburger Menü ========== */
            .mobil-gorunum .icon-panel {
                position: fixed;
                left: -280px;
                top: 0;
                width: 280px;
                height: 100vh;
                background: #0a0a0a;
                z-index: 1000;
                transition: left 0.3s ease;
                padding-top: 60px;
                border-right: 1px solid #2a2a2a;
                box-shadow: 2px 0 10px rgba(0,0,0,0.3);
            }

            .mobil-gorunum .icon-panel.acik {
                left: 0;
            }

            /* ========== SAĞ PANEL - Online & Sohbetler ========== */
            .mobil-gorunum .sag-panel {
                position: fixed;
                right: -300px;
                top: 0;
                width: 300px;
                height: 100vh;
                background: #0a0a0a;
                z-index: 1000;
                transition: right 0.3s ease;
                border-left: 1px solid #2a2a2a;
                display: flex;
                flex-direction: column;
            }

            .mobil-gorunum .sag-panel.acik {
                right: 0;
            }

            /* Sağ panel sekmeler */
            .mobil-gorunum .sag-sekmeler {
                display: flex;
                padding: 16px;
                gap: 12px;
                border-bottom: 1px solid #2a2a2a;
                background: #0a0a0a;
            }

            .mobil-gorunum .sag-sekme {
                flex: 1;
                padding: 12px;
                text-align: center;
                background: #1a1a1a;
                border-radius: 8px;
                color: #aaa;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
                transition: 0.2s;
            }

            .mobil-gorunum .sag-sekme.aktif {
                background: #ff0000;
                color: white;
            }

            .mobil-gorunum .sag-sekme i {
                margin-right: 6px;
            }

            /* Sağ panel içerik */
            .mobil-gorunum .sag-icerik {
                flex: 1;
                overflow-y: auto;
                padding: 16px;
                background: #0a0a0a;
            }

            /* Online liste */
            .mobil-gorunum .online-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px;
                background: #1a1a1a;
                border-radius: 12px;
                margin-bottom: 8px;
                cursor: pointer;
            }

            .mobil-gorunum .online-avatar {
                width: 48px;
                height: 48px;
                border-radius: 50%;
                background: #0a5c36;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                color: white;
                font-weight: 600;
            }

            .mobil-gorunum .online-info {
                flex: 1;
            }

            .mobil-gorunum .online-name {
                font-weight: 600;
                color: #fff;
                margin-bottom: 4px;
            }

            .mobil-gorunum .online-status {
                font-size: 11px;
                color: #2ecc71;
            }

            /* Sohbetler listesi */
            .mobil-gorunum .sohbet-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px;
                background: #1a1a1a;
                border-radius: 12px;
                margin-bottom: 8px;
                cursor: pointer;
                position: relative;
            }

            .mobil-gorunum .sohbet-avatar {
                width: 48px;
                height: 48px;
                border-radius: 50%;
                background: #ff0000;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                color: white;
                font-weight: 600;
            }

            .mobil-gorunum .sohbet-info {
                flex: 1;
            }

            .mobil-gorunum .sohbet-name {
                font-weight: 600;
                color: #fff;
                margin-bottom: 4px;
            }

            .mobil-gorunum .sohbet-son-mesaj {
                font-size: 12px;
                color: #aaa;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: 150px;
            }

            .mobil-gorunum .sohbet-bildirim {
                position: absolute;
                top: 8px;
                right: 8px;
                background: #ff4444;
                color: white;
                border-radius: 20px;
                padding: 4px 8px;
                font-size: 11px;
                font-weight: 600;
                min-width: 20px;
                text-align: center;
            }

            /* ========== CHAT PANELİ - TAM EKRAN ========== */
            .mobil-gorunum .chat-container {
                width: 100%;
                height: 100vh;
                display: flex;
                flex-direction: column;
                background: #0f0f0f;
            }

            /* Header - Görseldeki gibi "Canlı sohbet" */
            .mobil-gorunum .chat-header {
                padding: 12px 16px;
                border-bottom: 1px solid #2a2a2a;
                display: flex;
                align-items: center;
                justify-content: space-between;
                background: #0a0a0a;
                height: var(--header-yukseklik);
            }

            .mobil-gorunum .chat-title {
                font-size: 18px;
                font-weight: 600;
                color: #fff;
            }

            .mobil-gorunum .chat-title i {
                color: #ff0000;
                margin-right: 8px;
            }

            .mobil-gorunum .header-butonlar {
                display: flex;
                gap: 12px;
            }

            .mobil-gorunum .header-buton {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: #1a1a1a;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #fff;
                cursor: pointer;
                font-size: 18px;
                transition: 0.2s;
            }

            .mobil-gorunum .header-buton:active {
                background: #ff0000;
            }

            /* MESAJLAR ALANI - Görseldeki gibi */
            .mobil-gorunum .messages {
                flex: 1;
                overflow-y: auto;
                padding: 16px;
                background: #0f0f0f;
            }

            /* POPBOX mesajı - Görseldeki gibi */
            .mobil-gorunum .popbox-mesaj {
                background: #1a1a1a;
                border-radius: 16px;
                padding: 16px;
                margin-bottom: 16px;
                border-left: 4px solid #ff0000;
            }

            .mobil-gorunum .popbox-title {
                color: #ff0000;
                font-weight: 700;
                font-size: 16px;
                margin-bottom: 8px;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .mobil-gorunum .popbox-title i {
                font-size: 20px;
            }

            .mobil-gorunum .popbox-icerik {
                color: #fff;
                font-size: 14px;
                line-height: 1.5;
                margin-bottom: 12px;
            }

            .mobil-gorunum .popbox-alt {
                color: #aaa;
                font-size: 12px;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            /* Normal mesajlar */
            .mobil-gorunum .message {
                max-width: 100%;
                margin-bottom: 12px;
            }

            .mobil-gorunum .kullanici-mesaj {
                background: #1a1a1a;
                border-radius: 16px;
                padding: 12px 16px;
            }

            .mobil-gorunum .kullanici-adi {
                color: #6495ed;
                font-weight: 600;
                font-size: 14px;
                margin-bottom: 4px;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .mobil-gorunum .kullanici-adi i {
                font-size: 12px;
                color: #ffd700;
            }

            .mobil-gorunum .mesaj-metni {
                color: #fff;
                font-size: 14px;
                line-height: 1.5;
                word-break: break-word;
            }

            .mobil-gorunum .mesaj-zamani {
                font-size: 10px;
                color: #aaa;
                margin-top: 4px;
                text-align: right;
            }

            /* Sistem mesajı */
            .mobil-gorunum .system-message {
                background: #1a1a1a;
                border-radius: 30px;
                padding: 12px 20px;
                color: #aaa;
                font-size: 13px;
                text-align: center;
                margin: 16px auto;
                max-width: 90%;
                border: 1px solid #2a2a2a;
            }

            /* MESAJ GİRİŞ ALANI - Altta sabit */
            .mobil-gorunum .message-input-container {
                padding: 12px 16px;
                background: #0a0a0a;
                border-top: 1px solid #2a2a2a;
                height: var(--input-yukseklik);
            }

            .mobil-gorunum .input-wrapper {
                display: flex;
                align-items: center;
                gap: 12px;
                background: #1a1a1a;
                border-radius: 30px;
                padding: 4px 4px 4px 20px;
                border: 1px solid #2a2a2a;
            }

            .mobil-gorunum .message-input {
                flex: 1;
                background: transparent;
                border: none;
                color: #fff;
                font-size: 16px;
                padding: 12px 0;
                outline: none;
            }

            .mobil-gorunum .message-input::placeholder {
                color: #666;
            }

            .mobil-gorunum .send-btn {
                width: 48px;
                height: 48px;
                border-radius: 50%;
                background: #ff0000;
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                font-size: 18px;
                transition: 0.2s;
                border: none;
            }

            .mobil-gorunum .send-btn:active {
                background: #cc0000;
                transform: scale(0.95);
            }

            /* ========== VİDEO PANELİ - Ayrı sayfa ========== */
            .mobil-gorunum .media-panel {
                position: fixed;
                top: 100%;
                left: 0;
                right: 0;
                bottom: 0;
                background: #000;
                z-index: 1200;
                transition: top 0.3s ease;
                display: flex;
                flex-direction: column;
            }

            .mobil-gorunum .media-panel.acik {
                top: 0;
            }

            .mobil-gorunum .video-header {
                padding: 16px;
                background: #0a0a0a;
                display: flex;
                align-items: center;
                justify-content: space-between;
                border-bottom: 1px solid #2a2a2a;
            }

            .mobil-gorunum .video-title {
                font-size: 18px;
                font-weight: 600;
                color: #fff;
            }

            .mobil-gorunum .video-title i {
                color: #ff0000;
                margin-right: 8px;
            }

            .mobil-gorunum .video-kapat {
                width: 44px;
                height: 44px;
                border-radius: 50%;
                background: #ff0000;
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                font-size: 20px;
            }

            .mobil-gorunum .youtube-player {
                width: 100%;
                aspect-ratio: 16/9;
                background: #000;
            }

            .mobil-gorunum .video-actions {
                display: flex;
                gap: 12px;
                padding: 16px;
                background: #0a0a0a;
                overflow-x: auto;
                white-space: nowrap;
            }

            .mobil-gorunum .video-action-btn {
                padding: 12px 20px;
                background: #1a1a1a;
                border: 1px solid #2a2a2a;
                border-radius: 30px;
                color: #fff;
                font-size: 14px;
                display: inline-flex;
                align-items: center;
                gap: 8px;
                cursor: pointer;
            }

            .mobil-gorunum .video-action-btn i {
                font-size: 16px;
            }

            .mobil-gorunum .video-action-btn:active {
                background: #ff0000;
            }

            .mobil-gorunum .playlist-container {
                flex: 1;
                overflow-y: auto;
                padding: 16px;
                background: #0f0f0f;
            }

            /* ========== ÖZEL SOHBET - Tam ekran ========== */
            .mobil-gorunum .private-chat-panel {
                position: fixed;
                top: 100%;
                left: 0;
                right: 0;
                bottom: 0;
                background: #0a0a0a;
                z-index: 1300;
                transition: top 0.3s ease;
                display: flex;
                flex-direction: column;
            }

            .mobil-gorunum .private-chat-panel.active {
                top: 0;
            }

            .mobil-gorunum .private-chat-header {
                padding: 16px;
                background: #0a0a0a;
                border-bottom: 1px solid #2a2a2a;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }

            .mobil-gorunum .private-chat-user {
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .mobil-gorunum .private-chat-avatar {
                width: 48px;
                height: 48px;
                border-radius: 50%;
                background: #ff0000;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                color: white;
            }

            .mobil-gorunum .private-chat-name {
                font-weight: 600;
                color: #fff;
                font-size: 16px;
            }

            .mobil-gorunum .private-chat-status {
                font-size: 12px;
                color: #2ecc71;
            }

            .mobil-gorunum .private-chat-close {
                width: 44px;
                height: 44px;
                border-radius: 50%;
                background: #1a1a1a;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #fff;
                cursor: pointer;
                font-size: 20px;
            }

            .mobil-gorunum .private-chat-messages {
                flex: 1;
                overflow-y: auto;
                padding: 16px;
                background: #0f0f0f;
            }

            .mobil-gorunum .private-message {
                max-width: 90%;
                margin-bottom: 12px;
            }

            .mobil-gorunum .private-message.right {
                margin-left: auto;
            }

            .mobil-gorunum .private-message-text {
                padding: 12px 16px;
                background: #1a1a1a;
                border-radius: 20px;
                color: #fff;
                font-size: 14px;
            }

            .mobil-gorunum .private-message.right .private-message-text {
                background: #ff0000;
            }

            .mobil-gorunum .private-input-container {
                padding: 12px 16px;
                background: #0a0a0a;
                border-top: 1px solid #2a2a2a;
            }

            .mobil-gorunum .private-input-wrapper {
                display: flex;
                gap: 12px;
                background: #1a1a1a;
                border-radius: 30px;
                padding: 4px 4px 4px 20px;
            }

            .mobil-gorunum .private-input {
                flex: 1;
                background: transparent;
                border: none;
                color: #fff;
                font-size: 16px;
                padding: 12px 0;
                outline: none;
            }

            .mobil-gorunum .private-send-btn {
                width: 48px;
                height: 48px;
                border-radius: 50%;
                background: #ff0000;
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
            }

            /* OVERLAY */
            .mobil-gorunum .mobil-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                backdrop-filter: blur(3px);
                z-index: 900;
                display: none;
            }

            .mobil-gorunum .mobil-overlay.acik {
                display: block;
            }

            /* KAYDIRMA GÖSTERGESİ */
            .mobil-gorunum .swipe-indicator {
                position: absolute;
                top: 10px;
                left: 50%;
                transform: translateX(-50%);
                width: 40px;
                height: 4px;
                background: #333;
                border-radius: 2px;
                z-index: 10;
            }
        `;
        document.head.appendChild(style);
    }

    butonlariEkle() {
        // Overlay
        if (!document.querySelector('.mobil-overlay')) {
            const overlay = document.createElement('div');
            overlay.className = 'mobil-overlay';
            overlay.onclick = () => this.menuleriKapat();
            document.body.appendChild(overlay);
        }

        // Header butonlarını düzenle
        const header = document.querySelector('.chat-header');
        if (header) {
            header.innerHTML = `
                <div class="chat-title">
                    <i class="fas fa-comment"></i> Canlı sohbet
                </div>
                <div class="header-butonlar">
                    <div class="header-buton" onclick="window.mobilManager.toggleSolMenu()">
                        <i class="fas fa-bars"></i>
                    </div>
                    <div class="header-buton" onclick="window.mobilManager.toggleSagMenu()">
                        <i class="fas fa-ellipsis-vertical"></i>
                    </div>
                </div>
            `;
        }

        // Sağ panel
        if (!document.querySelector('.sag-panel')) {
            const sagPanel = document.createElement('div');
            sagPanel.className = 'sag-panel mobil-ekstra';
            sagPanel.innerHTML = `
                <div class="sag-sekmeler">
                    <div class="sag-sekme aktif" data-sekme="online" onclick="window.mobilManager.sagSekmeDegistir('online')">
                        <i class="fas fa-users"></i> Çevrimiçi
                    </div>
                    <div class="sag-sekme" data-sekme="sohbetler" onclick="window.mobilManager.sagSekmeDegistir('sohbetler')">
                        <i class="fas fa-comment"></i> Sohbetler
                    </div>
                </div>
                <div class="sag-icerik" id="sagPanelIcerik">
                    <!-- İçerik doldurulacak -->
                </div>
            `;
            document.body.appendChild(sagPanel);
        }

        // Video panelini düzenle
        const mediaPanel = document.querySelector('.media-panel');
        if (mediaPanel) {
            mediaPanel.innerHTML = `
                <div class="video-header">
                    <div class="video-title">
                        <i class="fab fa-youtube"></i> Video
                    </div>
                    <div class="video-kapat" onclick="window.mobilManager.videoKapat()">
                        <i class="fas fa-times"></i>
                    </div>
                </div>
                <div class="youtube-player">
                    <div id="youtubeContainer"></div>
                </div>
                <div class="video-actions">
                    <div class="video-action-btn" onclick="window.mediaManager?.showAddVideoModal()">
                        <i class="fas fa-plus"></i> Video ekle
                    </div>
                    <div class="video-action-btn" onclick="window.mediaManager?.showLiveStreamModal()">
                        <i class="fas fa-video"></i> Canlı yayın
                    </div>
                    <div class="video-action-btn" onclick="window.mediaManager?.showReportModal()">
                        <i class="fas fa-flag"></i> Şikayet
                    </div>
                    <div class="video-action-btn" onclick="window.mediaManager?.toggleChannelHidden()">
                        <i class="fas fa-eye-slash"></i> Gizle
                    </div>
                </div>
                <div class="playlist-container">
                    <div class="playlist-header">
                        <span class="playlist-title">📋 Playlist</span>
                        <span class="playlist-count" id="playlistCount">0</span>
                    </div>
                    <div id="playlistItems" class="playlist-items"></div>
                </div>
            `;
        }
    }

    duzenle() {
        // İkon panelini body'e taşı
        const iconPanel = document.querySelector('.icon-panel');
        if (iconPanel) document.body.appendChild(iconPanel);

        // Media paneli gizle (video butonuyla açılacak)
        const mediaPanel = document.querySelector('.media-panel');
        if (mediaPanel) mediaPanel.classList.remove('acik');

        // Örnek POPBOX mesajı ekle (görseldeki gibi)
        this.ornekMesajEkle();
        
        // Sağ panel içeriğini doldur
        this.sagPanelDoldur('online');
    }

    ornekMesajEkle() {
        const messagesDiv = document.getElementById('messages');
        if (!messagesDiv) return;

        // Görseldeki gibi POPBOX mesajı
        const popbox = document.createElement('div');
        popbox.className = 'popbox-mesaj';
        popbox.innerHTML = `
            <div class="popbox-title">
                <i class="fas fa-gift"></i> POPBOX
            </div>
            <div class="popbox-icerik">
                Sevgili ziyaretci.. gününüz aydın dilek!..
            </div>
            <div class="popbox-alt">
                <i class="fas fa-user"></i> @AylinRustemli-i7t5k
                <i class="fas fa-circle" style="font-size: 4px; color: #666;"></i>
                <span>salam</span>
            </div>
        `;

        // Sistem mesajı
        const systemMsg = document.createElement('div');
        systemMsg.className = 'system-message';
        systemMsg.innerHTML = `
            <i class="fas fa-info-circle"></i> 
            Canlı sohbete hoş geldiniz! Gizliliğinizi korumayı ve topluluk kurallarımıza uymayı ihmal etmeyin.
        `;

        // Daha fazla bilgi butonu
        const infoBtn = document.createElement('div');
        infoBtn.className = 'system-message';
        infoBtn.style.background = '#ff0000';
        infoBtn.style.color = 'white';
        infoBtn.style.cursor = 'pointer';
        infoBtn.innerHTML = `
            <i class="fas fa-arrow-right"></i> Daha fazla bilgi
        `;
        infoBtn.onclick = () => alert('Topluluk kuralları...');

        messagesDiv.appendChild(popbox);
        messagesDiv.appendChild(systemMsg);
        messagesDiv.appendChild(infoBtn);
    }

    sagPanelDoldur(sekme) {
        const container = document.getElementById('sagPanelIcerik');
        if (!container) return;

        const aktifUser = JSON.parse(localStorage.getItem('cetcety_active_user'));
        const channels = JSON.parse(localStorage.getItem('cetcety_channels')) || {};
        const currentCh = channels[currentChannel] || { onlineUsers: ['MateKy', 'Mehmet', 'Ahmet', 'Ayşe'] };

        if (sekme === 'online') {
            // Çevrimiçi listesi
            let html = '';
            currentCh.onlineUsers.forEach(user => {
                html += `
                    <div class="online-item" onclick="openPrivateChat('${user}')">
                        <div class="online-avatar">${user.charAt(0)}</div>
                        <div class="online-info">
                            <div class="online-name">${user}</div>
                            <div class="online-status"><i class="fas fa-circle" style="font-size: 8px; color: #2ecc71;"></i> çevrimiçi</div>
                        </div>
                    </div>
                `;
            });
            container.innerHTML = html;
        } else {
            // Sohbetler listesi
            const privates = JSON.parse(localStorage.getItem('cetcety_private_chats')) || {};
            const sohbetler = [];

            Object.keys(privates).forEach(chatId => {
                const ids = chatId.split('_');
                const karsiId = ids[0] == aktifUser?.id ? ids[1] : ids[0];
                const sonMesaj = privates[chatId][privates[chatId].length - 1];
                const okunmamis = privates[chatId].filter(m => m.senderId != aktifUser?.id && !m.read).length;

                sohbetler.push({
                    id: karsiId,
                    sonMesaj: sonMesaj?.content || '...',
                    okunmamis: okunmamis
                });
            });

            if (sohbetler.length === 0) {
                container.innerHTML = '<div style="color: #aaa; text-align: center; padding: 20px;">📭 Henüz sohbet yok</div>';
                return;
            }

            let html = '';
            sohbetler.forEach(sohbet => {
                html += `
                    <div class="sohbet-item" onclick="openPrivateChat('${sohbet.id}')">
                        <div class="sohbet-avatar">${sohbet.id.charAt(0)}</div>
                        <div class="sohbet-info">
                            <div class="sohbet-name">${sohbet.id}</div>
                            <div class="sohbet-son-mesaj">${sohbet.sonMesaj}</div>
                        </div>
                        ${sohbet.okunmamis > 0 ? `<div class="sohbet-bildirim">${sohbet.okunmamis}</div>` : ''}
                    </div>
                `;
            });
            container.innerHTML = html;
        }
    }

    sagSekmeDegistir(sekme) {
        // Sekme stillerini güncelle
        document.querySelectorAll('.sag-sekme').forEach(el => {
            el.classList.remove('aktif');
            if (el.dataset.sekme === sekme) {
                el.classList.add('aktif');
            }
        });

        // İçeriği doldur
        this.sagPanelDoldur(sekme);
    }

    toggleSolMenu() {
        const iconPanel = document.querySelector('.icon-panel');
        const overlay = document.querySelector('.mobil-overlay');
        
        if (iconPanel) {
            iconPanel.classList.toggle('acik');
            overlay.classList.toggle('acik');
            this.solMenuAcik = iconPanel.classList.contains('acik');
            
            // Sağ menü açıksa kapat
            if (this.sagMenuAcik) {
                document.querySelector('.sag-panel').classList.remove('acik');
                this.sagMenuAcik = false;
            }
        }
    }

    toggleSagMenu() {
        const sagPanel = document.querySelector('.sag-panel');
        const overlay = document.querySelector('.mobil-overlay');
        
        if (sagPanel) {
            sagPanel.classList.toggle('acik');
            overlay.classList.toggle('acik');
            this.sagMenuAcik = sagPanel.classList.contains('acik');
            
            // Sol menü açıksa kapat
            if (this.solMenuAcik) {
                document.querySelector('.icon-panel').classList.remove('acik');
                this.solMenuAcik = false;
            }
            
            // İçeriği güncelle
            if (this.sagMenuAcik) {
                this.sagPanelDoldur('online');
            }
        }
    }

    videoAc() {
        const mediaPanel = document.querySelector('.media-panel');
        if (mediaPanel) {
            mediaPanel.classList.add('acik');
            this.videoAcik = true;
        }
    }

    videoKapat() {
        const mediaPanel = document.querySelector('.media-panel');
        if (mediaPanel) {
            mediaPanel.classList.remove('acik');
            this.videoAcik = false;
        }
    }

    menuleriKapat() {
        document.querySelector('.icon-panel')?.classList.remove('acik');
        document.querySelector('.sag-panel')?.classList.remove('acik');
        document.querySelector('.mobil-overlay')?.classList.remove('acik');
        this.solMenuAcik = false;
        this.sagMenuAcik = false;
    }

    mobilOlaylar() {
        // Kaydırarak kapatma (özel sohbet için)
        let touchStartY = 0;
        let touchStartX = 0;

        document.addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].clientY;
            touchStartX = e.touches[0].clientX;
        });

        document.addEventListener('touchend', (e) => {
            const touchEndY = e.changedTouches[0].clientY;
            const touchEndX = e.changedTouches[0].clientX;
            const diffY = touchEndY - touchStartY;
            const diffX = touchEndX - touchStartX;

            // Özel sohbeti kapat (aşağı kaydırma)
            const privateChat = document.getElementById('privateChatPanel');
            if (privateChat?.classList.contains('active') && diffY > 100) {
                privateChat.classList.remove('active');
                currentPrivateChat = null;
            }

            // Video panelini kapat (aşağı kaydırma)
            const mediaPanel = document.querySelector('.media-panel');
            if (mediaPanel?.classList.contains('acik') && diffY > 100) {
                this.videoKapat();
            }

            // Menüleri kapat (sağa/sola kaydırma)
            if (Math.abs(diffX) > 100) {
                this.menuleriKapat();
            }
        });

        // Video butonunu ekle
        const videoBtn = document.createElement('div');
        videoBtn.className = 'header-buton';
        videoBtn.innerHTML = '<i class="fas fa-video"></i>';
        videoBtn.onclick = () => this.videoAc();
        videoBtn.title = 'Video';
        
        const headerButtons = document.querySelector('.header-butonlar');
        if (headerButtons) {
            headerButtons.appendChild(videoBtn);
        }
    }
}

// Global mobil yöneticisini başlat
window.mobilManager = new CETCETYMobil();

// Storage değişikliklerini dinle
window.addEventListener('storage', (e) => {
    if (e.key === 'cetcety_private_chats' && window.mobilManager?.sagMenuAcik) {
        const aktifSekme = document.querySelector('.sag-sekme.aktif')?.dataset.sekme || 'online';
        window.mobilManager.sagPanelDoldur(aktifSekme);
    }
});

// openPrivateChat fonksiyonunu güncelle (mobil için)
const originalOpenPrivateChat = window.openPrivateChat;
window.openPrivateChat = function(username) {
    if (window.mobilManager?.isMobile) {
        originalOpenPrivateChat(username);
        
        // Mobilde özel sohbeti düzenle
        const privateChat = document.getElementById('privateChatPanel');
        if (privateChat) {
            privateChat.classList.add('active');
            
            // Kapatma butonu ekle (yoksa)
            if (!privateChat.querySelector('.private-chat-close')) {
                const header = privateChat.querySelector('.private-chat-header');
                if (header) {
                    const closeBtn = document.createElement('div');
                    closeBtn.className = 'private-chat-close';
                    closeBtn.innerHTML = '<i class="fas fa-times"></i>';
                    closeBtn.onclick = () => {
                        privateChat.classList.remove('active');
                        currentPrivateChat = null;
                    };
                    header.appendChild(closeBtn);
                }
            }
        }
    } else {
        originalOpenPrivateChat(username);
    }
};