// ========== MOBIL.JS - CETCETY Mobil Görünüm (ÇALIŞAN VERSİYON) ==========
console.log('%c📱 CETCETY Mobil başlatılıyor...', 'color: #00ff00; font-size: 14px; font-weight: bold;');

(function() {
    // Sayfa yüklendiğinde çalıştır
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(() => {
            new CETCETYMobil();
        }, 500); // Diğer JS'lerin yüklenmesini bekle
    });
})();

class CETCETYMobil {
    constructor() {
        this.isMobile = window.innerWidth <= 768;
        this.solMenuAcik = false;
        this.sagMenuAcik = false;
        this.videoAcik = false;
        
        console.log('📱 Mobil mod:', this.isMobile ? 'AKTİF' : 'PASİF');
        
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
    }

    mobilGorunum() {
        console.log('📱 Mobil görünüm aktif ediliyor...');
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
        if (iconPanel) {
            iconPanel.style.position = 'relative';
            iconPanel.style.left = '0';
            iconPanel.classList.remove('acik');
        }
        
        const mediaPanel = document.querySelector('.media-panel');
        if (mediaPanel) {
            mediaPanel.style.display = 'flex';
            mediaPanel.classList.remove('acik');
        }
        
        // Ekstra mobil elementleri temizle
        document.querySelectorAll('.mobil-ekstra').forEach(el => el.remove());
    }

    stilleriEkle() {
        // Daha önce eklendiyse tekrar ekleme
        if (document.getElementById('mobil-stiller')) return;
        
        const style = document.createElement('style');
        style.id = 'mobil-stiller';
        style.textContent = `
            /* ========== MOBİL GÖRÜNÜM ========== */
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

            /* SOL İKON PANELİ - Hamburger Menü */
            .mobil-gorunum .icon-panel {
                position: fixed !important;
                left: -280px !important;
                top: 0 !important;
                width: 280px !important;
                height: 100vh !important;
                background: #0a0a0a !important;
                z-index: 1000 !important;
                transition: left 0.3s ease !important;
                padding-top: 60px !important;
                border-right: 1px solid #2a2a2a !important;
                display: flex !important;
                flex-direction: column !important;
            }

            .mobil-gorunum .icon-panel.acik {
                left: 0 !important;
            }

            /* SAĞ PANEL - Online & Sohbetler */
            .mobil-gorunum .sag-panel {
                position: fixed !important;
                right: -300px !important;
                top: 0 !important;
                width: 300px !important;
                height: 100vh !important;
                background: #0a0a0a !important;
                z-index: 1000 !important;
                transition: right 0.3s ease !important;
                border-left: 1px solid #2a2a2a !important;
                display: flex !important;
                flex-direction: column !important;
            }

            .mobil-gorunum .sag-panel.acik {
                right: 0 !important;
            }

            /* Sağ panel sekmeler */
            .mobil-gorunum .sag-sekmeler {
                display: flex !important;
                padding: 16px !important;
                gap: 12px !important;
                border-bottom: 1px solid #2a2a2a !important;
                background: #0a0a0a !important;
            }

            .mobil-gorunum .sag-sekme {
                flex: 1 !important;
                padding: 12px !important;
                text-align: center !important;
                background: #1a1a1a !important;
                border-radius: 8px !important;
                color: #aaa !important;
                cursor: pointer !important;
                font-size: 14px !important;
            }

            .mobil-gorunum .sag-sekme.aktif {
                background: #ff0000 !important;
                color: white !important;
            }

            .mobil-gorunum .sag-icerik {
                flex: 1 !important;
                overflow-y: auto !important;
                padding: 16px !important;
            }

            /* Chat container tam ekran */
            .mobil-gorunum .chat-container {
                width: 100% !important;
                height: 100vh !important;
                display: flex !important;
                flex-direction: column !important;
            }

            /* Header düzenleme */
            .mobil-gorunum .chat-header {
                padding: 12px 16px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: space-between !important;
                background: #0a0a0a !important;
                border-bottom: 1px solid #2a2a2a !important;
            }

            .mobil-gorunum .chat-title {
                font-size: 18px !important;
                font-weight: 600 !important;
                color: #fff !important;
            }

            .mobil-gorunum .header-butonlar {
                display: flex !important;
                gap: 12px !important;
            }

            .mobil-gorunum .header-buton {
                width: 40px !important;
                height: 40px !important;
                border-radius: 50% !important;
                background: #1a1a1a !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                color: #fff !important;
                cursor: pointer !important;
                font-size: 18px !important;
            }

            /* Media paneli - video sayfası */
            .mobil-gorunum .media-panel {
                position: fixed !important;
                top: 100% !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                background: #000 !important;
                z-index: 1200 !important;
                transition: top 0.3s ease !important;
                display: flex !important;
                flex-direction: column !important;
                width: 100% !important;
            }

            .mobil-gorunum .media-panel.acik {
                top: 0 !important;
            }

            .mobil-gorunum .video-header {
                padding: 16px !important;
                background: #0a0a0a !important;
                display: flex !important;
                align-items: center !important;
                justify-content: space-between !important;
            }

            .mobil-gorunum .video-kapat {
                width: 40px !important;
                height: 40px !important;
                border-radius: 50% !important;
                background: #ff0000 !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                color: white !important;
                cursor: pointer !important;
            }

            /* Özel sohbet */
            .mobil-gorunum .private-chat-panel {
                position: fixed !important;
                top: 100% !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                background: #0a0a0a !important;
                z-index: 1300 !important;
                transition: top 0.3s ease !important;
                display: flex !important;
                flex-direction: column !important;
            }

            .mobil-gorunum .private-chat-panel.active {
                top: 0 !important;
            }

            .mobil-gorunum .private-chat-close {
                width: 40px !important;
                height: 40px !important;
                border-radius: 50% !important;
                background: #1a1a1a !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                cursor: pointer !important;
            }

            /* Overlay */
            .mobil-gorunum .mobil-overlay {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                background: rgba(0,0,0,0.5) !important;
                z-index: 900 !important;
                display: none !important;
            }

            .mobil-gorunum .mobil-overlay.acik {
                display: block !important;
            }

            /* Masaüstünde medya paneli görünsün */
            .masaustu-gorunum .media-panel {
                display: flex !important;
                position: relative !important;
                width: 420px !important;
            }
        `;
        document.head.appendChild(style);
    }

    butonlariEkle() {
        // Overlay ekle
        if (!document.querySelector('.mobil-overlay')) {
            const overlay = document.createElement('div');
            overlay.className = 'mobil-overlay';
            overlay.onclick = () => this.menuleriKapat();
            document.body.appendChild(overlay);
        }

        // Header'ı düzenle
        const header = document.querySelector('.chat-header');
        if (header) {
            // Eski butonları temizle
            const mevcutButonlar = header.querySelector('.header-butonlar');
            if (mevcutButonlar) mevcutButonlar.remove();

            // Yeni butonlar ekle
            const butonDiv = document.createElement('div');
            butonDiv.className = 'header-butonlar';
            butonDiv.innerHTML = `
                <div class="header-buton" onclick="window.mobilManager?.toggleSolMenu()">
                    <i class="fas fa-bars"></i>
                </div>
                <div class="header-buton" onclick="window.mobilManager?.toggleSagMenu()">
                    <i class="fas fa-ellipsis-vertical"></i>
                </div>
                <div class="header-buton" onclick="window.mobilManager?.videoAc()">
                    <i class="fas fa-video"></i>
                </div>
            `;
            header.appendChild(butonDiv);
        }

        // Sağ panel ekle
        if (!document.querySelector('.sag-panel')) {
            const sagPanel = document.createElement('div');
            sagPanel.className = 'sag-panel mobil-ekstra';
            sagPanel.innerHTML = `
                <div class="sag-sekmeler">
                    <div class="sag-sekme aktif" data-sekme="online" onclick="window.mobilManager?.sagSekmeDegistir('online')">
                        <i class="fas fa-users"></i> Çevrimiçi
                    </div>
                    <div class="sag-sekme" data-sekme="sohbetler" onclick="window.mobilManager?.sagSekmeDegistir('sohbetler')">
                        <i class="fas fa-comment"></i> Sohbetler
                    </div>
                </div>
                <div class="sag-icerik" id="sagPanelIcerik"></div>
            `;
            document.body.appendChild(sagPanel);
        }
    }

    duzenle() {
        // İkon panelini body'e taşı
        const iconPanel = document.querySelector('.icon-panel');
        if (iconPanel) {
            document.body.appendChild(iconPanel);
        }

        // Media panelini hazırla
        const mediaPanel = document.querySelector('.media-panel');
        if (mediaPanel) {
            mediaPanel.classList.remove('acik');
            
            // Video header ekle
            const videoHeader = document.createElement('div');
            videoHeader.className = 'video-header';
            videoHeader.innerHTML = `
                <div><i class="fab fa-youtube" style="color: #ff0000;"></i> Video</div>
                <div class="video-kapat" onclick="window.mobilManager?.videoKapat()">
                    <i class="fas fa-times"></i>
                </div>
            `;
            mediaPanel.prepend(videoHeader);
        }

        // Sağ panel içeriğini doldur
        setTimeout(() => {
            this.sagPanelDoldur('online');
        }, 100);
    }

    sagPanelDoldur(sekme) {
        const container = document.getElementById('sagPanelIcerik');
        if (!container) return;

        if (sekme === 'online') {
            // Çevrimiçi listesi
            const channels = JSON.parse(localStorage.getItem('cetcety_channels')) || {};
            const currentCh = channels[currentChannel] || { onlineUsers: ['MateKy', 'Mehmet', 'Ahmet'] };
            
            let html = '';
            currentCh.onlineUsers.forEach(user => {
                html += `
                    <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: #1a1a1a; border-radius: 8px; margin-bottom: 8px; cursor: pointer;" onclick="openPrivateChat('${user}')">
                        <div style="width: 40px; height: 40px; border-radius: 50%; background: #0a5c36; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600;">${user.charAt(0)}</div>
                        <div>
                            <div style="font-weight: 600; color: #fff;">${user}</div>
                            <div style="font-size: 11px; color: #2ecc71;"><i class="fas fa-circle" style="font-size: 8px;"></i> çevrimiçi</div>
                        </div>
                    </div>
                `;
            });
            container.innerHTML = html;
        } else {
            // Sohbetler listesi
            container.innerHTML = '<div style="color: #aaa; text-align: center; padding: 20px;">Sohbetler yükleniyor...</div>';
            
            // Gerçek sohbetleri yükle
            setTimeout(() => {
                const privates = JSON.parse(localStorage.getItem('cetcety_private_chats')) || {};
                const aktifUser = JSON.parse(localStorage.getItem('cetcety_active_user'));
                
                let html = '';
                Object.keys(privates).forEach(chatId => {
                    const ids = chatId.split('_');
                    const karsiId = ids[0] == aktifUser?.id ? ids[1] : ids[0];
                    const sonMesaj = privates[chatId][privates[chatId].length - 1];
                    
                    html += `
                        <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: #1a1a1a; border-radius: 8px; margin-bottom: 8px; cursor: pointer;" onclick="openPrivateChat('${karsiId}')">
                            <div style="width: 40px; height: 40px; border-radius: 50%; background: #ff0000; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600;">${karsiId.charAt(0)}</div>
                            <div>
                                <div style="font-weight: 600; color: #fff;">${karsiId}</div>
                                <div style="font-size: 11px; color: #aaa;">${sonMesaj?.content || '...'}</div>
                            </div>
                        </div>
                    `;
                });
                
                if (html === '') {
                    html = '<div style="color: #aaa; text-align: center; padding: 20px;">📭 Henüz sohbet yok</div>';
                }
                
                container.innerHTML = html;
            }, 100);
        }
    }

    sagSekmeDegistir(sekme) {
        document.querySelectorAll('.sag-sekme').forEach(el => {
            el.classList.remove('aktif');
            if (el.dataset.sekme === sekme) {
                el.classList.add('aktif');
            }
        });
        this.sagPanelDoldur(sekme);
    }

    toggleSolMenu() {
        const iconPanel = document.querySelector('.icon-panel');
        const overlay = document.querySelector('.mobil-overlay');
        
        if (iconPanel) {
            iconPanel.classList.toggle('acik');
            overlay.classList.toggle('acik');
            this.solMenuAcik = iconPanel.classList.contains('acik');
            
            if (this.solMenuAcik) {
                document.querySelector('.sag-panel')?.classList.remove('acik');
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
            
            if (this.sagMenuAcik) {
                document.querySelector('.icon-panel')?.classList.remove('acik');
                this.solMenuAcik = false;
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

    mesajlariGuncelle() {
        // Örnek POPBOX mesajı ekle
        const messagesDiv = document.getElementById('messages');
        if (!messagesDiv) return;

        // Sadece boşsa ekle
        if (messagesDiv.children.length <= 1) {
            const popbox = document.createElement('div');
            popbox.className = 'system-message';
            popbox.style.background = '#1a1a1a';
            popbox.style.borderLeft = '4px solid #ff0000';
            popbox.style.textAlign = 'left';
            popbox.style.padding = '16px';
            popbox.innerHTML = `
                <div style="color: #ff0000; font-weight: 700; margin-bottom: 8px;">
                    <i class="fas fa-gift"></i> POPBOX
                </div>
                <div style="margin-bottom: 8px;">Sevgili ziyaretci.. gününüz aydın dilek!..</div>
                <div style="color: #aaa; font-size: 12px;">
                    <i class="fas fa-user"></i> @AylinRustemli-i7t5k • salam
                </div>
            `;
            messagesDiv.appendChild(popbox);
        }
    }

    mobilOlaylar() {
        // Kaydırarak kapatma
        let touchStartY = 0;
        
        document.addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].clientY;
        });

        document.addEventListener('touchend', (e) => {
            const touchEndY = e.changedTouches[0].clientY;
            const diffY = touchEndY - touchStartY;

            // Özel sohbeti kapat (aşağı kaydırma)
            const privateChat = document.getElementById('privateChatPanel');
            if (privateChat?.classList.contains('active') && diffY > 100) {
                privateChat.classList.remove('active');
                if (window.currentPrivateChat) window.currentPrivateChat = null;
            }

            // Video panelini kapat
            const mediaPanel = document.querySelector('.media-panel');
            if (mediaPanel?.classList.contains('acik') && diffY > 100) {
                this.videoKapat();
            }
        });
    }
}

// Global mobil manager'ı window'a ekle
window.mobilManager = new CETCETYMobil();
