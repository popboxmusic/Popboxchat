// Kamera ve Medya Sistemi
class CameraSystem {
    constructor() {
        this.stream = null;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.isRecording = false;
        this.facingMode = 'user';
        this.mediaType = null; // 'image' veya 'video'
        this.init();
    }
    
    init() {
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Kamera butonları
        document.addEventListener('click', (e) => {
            if (e.target.closest('#cameraBtn') || e.target.closest('.btn-pm-camera')) {
                this.openCamera('image');
            }
        });
        
        // Modal butonları
        document.addEventListener('click', (e) => {
            const target = e.target;
            
            if (target.id === 'switchCameraBtn') {
                this.switchCamera();
            } else if (target.id === 'captureImageBtn') {
                this.captureImage();
            } else if (target.id === 'recordVideoBtn') {
                this.startRecording();
            } else if (target.id === 'stopRecordingBtn') {
                this.stopRecording();
            } else if (target.id === 'sendCameraMedia') {
                this.sendMedia();
            } else if (target.id === 'cancelCamera') {
                this.closeCamera();
            } else if (target.id === 'closeCameraModal') {
                this.closeCamera();
            }
        });
    }
    
    async openCamera(type = 'image') {
        this.mediaType = type;
        
        try {
            // Kameraya erişim
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: this.facingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: type === 'video'
            });
            
            // Kamera modalını aç
            this.showCameraModal();
            
            // Preview'u göster
            const preview = document.getElementById('cameraPreview');
            if (preview) {
                preview.srcObject = this.stream;
                await preview.play();
            }
            
            // Butonları güncelle
            this.updateCameraButtons();
            
        } catch (err) {
            console.error('Kamera erişim hatası:', err);
            alert('Kameraya erişilemedi. Lütfen izinleri kontrol edin.');
        }
    }
    
    showCameraModal() {
        // Modal HTML'ini oluştur
        const modalHtml = `
            <div id="cameraModal" class="modal-overlay">
                <div class="modal-content camera-modal">
                    <div class="modal-header">
                        <h3>${this.mediaType === 'image' ? 'Fotoğraf Çek' : 'Video Kaydet'}</h3>
                        <button id="closeCameraModal" class="modal-close">&times;</button>
                    </div>
                    
                    <div class="camera-preview-container">
                        <video id="cameraPreview" class="camera-preview" autoplay playsinline></video>
                        <canvas id="cameraCanvas" style="display: none;"></canvas>
                    </div>
                    
                    <div class="camera-controls">
                        <button id="switchCameraBtn" class="btn btn-warning">
                            <i class="fas fa-sync-alt"></i> Kamera Değiştir
                        </button>
                        
                        ${this.mediaType === 'image' ? `
                            <button id="captureImageBtn" class="btn btn-primary">
                                <i class="fas fa-camera"></i> Fotoğraf Çek
                            </button>
                        ` : `
                            <button id="recordVideoBtn" class="btn btn-danger">
                                <i class="fas fa-video"></i> Video Kaydet
                            </button>
                            <button id="stopRecordingBtn" class="btn btn-danger" style="display: none;">
                                <i class="fas fa-stop"></i> Durdur
                            </button>
                        `}
                    </div>
                    
                    <div id="cameraPreviewArea" style="display: none; margin-top: 20px;"></div>
                    
                    <div class="modal-footer">
                        <button id="cancelCamera" class="btn btn-secondary">İptal</button>
                        <button id="sendCameraMedia" class="btn btn-primary" disabled>
                            <i class="fas fa-paper-plane"></i> Gönder
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Modal'ı ekle
        const container = document.getElementById('modals-container') || document.body;
        container.insertAdjacentHTML('beforeend', modalHtml);
        
        // Modal'ı göster
        document.getElementById('cameraModal').style.display = 'flex';
    }
    
    async switchCamera() {
        if (!this.stream) return;
        
        // Mevcut stream'i durdur
        this.stream.getTracks().forEach(track => track.stop());
        
        // Kamera modunu değiştir
        this.facingMode = this.facingMode === 'user' ? 'environment' : 'user';
        
        // Yeni kamerayı aç
        await this.openCamera(this.mediaType);
    }
    
    captureImage() {
        const preview = document.getElementById('cameraPreview');
        const canvas = document.getElementById('cameraCanvas');
        const previewArea = document.getElementById('cameraPreviewArea');
        
        if (!preview || !canvas || !previewArea) return;
        
        // Canvas boyutlarını ayarla
        canvas.width = preview.videoWidth;
        canvas.height = preview.videoHeight;
        
        // Resmi çek
        const ctx = canvas.getContext('2d');
        ctx.drawImage(preview, 0, 0, canvas.width, canvas.height);
        
        // Preview'u göster
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        
        previewArea.innerHTML = `
            <div style="text-align: center;">
                <h4 style="margin-bottom: 10px;">Önizleme</h4>
                <img src="${dataUrl}" style="max-width: 100%; border-radius: 8px; border: 2px solid var(--accent-blue);">
                <div style="margin-top: 10px; font-size: 12px; color: var(--text-secondary);">
                    ${Math.round(dataUrl.length / 1024)}KB
                </div>
            </div>
        `;
        
        previewArea.style.display = 'block';
        
        // Gönder butonunu aktif et
        document.getElementById('sendCameraMedia').disabled = false;
        
        // Çekilen resmi sakla
        this.capturedMedia = {
            type: 'image',
            dataUrl: dataUrl,
            timestamp: new Date()
        };
    }
    
    async startRecording() {
        if (!this.stream || this.isRecording) return;
        
        try {
            this.recordedChunks = [];
            
            // MediaRecorder oluştur
            this.mediaRecorder = new MediaRecorder(this.stream, {
                mimeType: 'video/webm;codecs=vp9'
            });
            
            // Data event'leri
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.onstop = () => {
                this.processRecording();
            };
            
            // Kaydı başlat
            this.mediaRecorder.start(100); // 100ms'lik chunks
            this.isRecording = true;
            
            // Butonları güncelle
            document.getElementById('recordVideoBtn').style.display = 'none';
            document.getElementById('stopRecordingBtn').style.display = 'inline-block';
            
        } catch (err) {
            console.error('Kayıt başlatma hatası:', err);
            alert('Video kaydı başlatılamadı.');
        }
    }
    
    stopRecording() {
        if (!this.mediaRecorder || !this.isRecording) return;
        
        this.mediaRecorder.stop();
        this.isRecording = false;
        
        // Butonları güncelle
        document.getElementById('recordVideoBtn').style.display = 'inline-block';
        document.getElementById('stopRecordingBtn').style.display = 'none';
    }
    
    processRecording() {
        const previewArea = document.getElementById('cameraPreviewArea');
        if (!previewArea) return;
        
        // Blob oluştur
        const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        
        // Video element'i oluştur
        const video = document.createElement('video');
        video.src = url;
        video.controls = true;
        video.style.maxWidth = '100%';
        video.style.borderRadius = '8px';
        video.style.border = '2px solid var(--accent-blue)';
        
        // Preview'u göster
        previewArea.innerHTML = `
            <div style="text-align: center;">
                <h4 style="margin-bottom: 10px;">Video Önizleme</h4>
                <div id="videoPreview"></div>
                <div style="margin-top: 10px; font-size: 12px; color: var(--text-secondary);">
                    ${Math.round(blob.size / 1024)}KB • ${Math.round(blob.size / this.recordedChunks.length)}ms chunks
                </div>
            </div>
        `;
        
        document.getElementById('videoPreview').appendChild(video);
        previewArea.style.display = 'block';
        
        // Gönder butonunu aktif et
        document.getElementById('sendCameraMedia').disabled = false;
        
        // Kaydedilen videoyu sakla
        this.capturedMedia = {
            type: 'video',
            blob: blob,
            url: url,
            timestamp: new Date()
        };
    }
    
    sendMedia() {
        if (!this.capturedMedia) return;
        
        const app = window.eliteChat;
        if (!app?.currentUser) return;
        
        // Mesaj oluştur
        let messageText = '';
        
        if (this.capturedMedia.type === 'image') {
            messageText = `📸 Fotoğraf gönderildi [${new Date().toLocaleTimeString('tr-TR')}]`;
            
            // Base64 resmi gönderme (gerçek uygulamada sunucuya upload etmeli)
            console.log('Fotoğraf gönderiliyor:', this.capturedMedia.dataUrl.substring(0, 100) + '...');
            
        } else if (this.capturedMedia.type === 'video') {
            messageText = `🎥 Video gönderildi [${new Date().toLocaleTimeString('tr-TR')}]`;
            
            // Video gönderme (gerçek uygulamada sunucuya upload etmeli)
            console.log('Video gönderiliyor:', this.capturedMedia.blob.size, 'bytes');
        }
        
        // Mesajı gönder
        if (app.activePM) {
            // Özel mesaj
            app.sendPrivateMessage(app.activePM, messageText);
        } else {
            // Kanal mesajı
            app.sendChannelMessage(messageText);
        }
        
        // Kamera'ı kapat
        this.closeCamera();
        
        // Bildirim
        app.addSystemMessage?.('✅ Medya gönderildi!');
    }
    
    closeCamera() {
        // Stream'i durdur
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        // MediaRecorder'ı temizle
        if (this.mediaRecorder) {
            this.mediaRecorder = null;
        }
        
        // Kaydedilen chunk'ları temizle
        this.recordedChunks = [];
        this.isRecording = false;
        this.capturedMedia = null;
        
        // Modal'ı kaldır
        const modal = document.getElementById('cameraModal');
        if (modal) {
            modal.remove();
        }
    }
    
    updateCameraButtons() {
        // Kamera destek kontrolü
        const hasMultipleCameras = navigator.mediaDevices && 
            navigator.mediaDevices.enumerateDevices;
        
        const switchBtn = document.getElementById('switchCameraBtn');
        if (switchBtn) {
            switchBtn.style.display = hasMultipleCameras ? 'inline-block' : 'none';
        }
    }
}

// Kamera sistemini başlat
window.cameraSystem = new CameraSystem();