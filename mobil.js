<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=yes">
    <title>CETCETY • Mobil</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    
    <!-- JS DOSYALARI -->
    <script src="./medya.js" defer></script>
    <script src="./kanal.js" defer></script>
    <script src="./admin.js" defer></script>
    <script src="./matebot.js" defer></script>
    <script src="./sistem-komutlari.js" defer></script>
    <script src="./owner.js" defer></script>
    
    <style>
        /* ========== RESET ========== */
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Inter', sans-serif; }
        body { background: #0f0f0f; color: #fff; overflow: hidden; height: 100vh; }
        
        /* ========== MOBİL ANA YAPI ========== */
        .app-mobil {
            display: flex;
            flex-direction: column;
            height: 100vh;
            width: 100vw;
            position: relative;
            background: #0f0f0f;
        }
        
        /* ========== VİDEO PANELİ ========== */
        .video-panel {
            width: 100%;
            background: #000;
            position: relative;
            z-index: 10;
        }
        
        .video-player {
            width: 100%;
            aspect-ratio: 16/9;
            background: #000;
            position: relative;
        }
        
        #youtubeContainer {
            width: 100%;
            height: 100%;
        }
        
        /* Video üstü iconlar */
        .video-overlay-icons {
            position: absolute;
            top: 10px;
            right: 10px;
            display: flex;
            gap: 8px;
            z-index: 15;
        }
        
        .video-icon-btn {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: rgba(0,0,0,0.7);
            backdrop-filter: blur(5px);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
            cursor: pointer;
            font-size: 18px;
            border: 1px solid rgba(255,255,255,0.2);
        }
        
        /* Hayalet playlist butonu */
        .ghost-playlist-btn {
            position: absolute;
            top: 10px;
            left: 10px;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: rgba(0,0,0,0.7);
            backdrop-filter: blur(5px);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
            cursor: pointer;
            font-size: 18px;
            border: 1px solid rgba(255,255,255,0.2);
            z-index: 15;
        }
        
        /* Hayalet playlist paneli */
        .ghost-playlist {
            position: absolute;
            top: 60px;
            left: 10px;
            right: 10px;
            background: rgba(20,20,20,0.95);
            backdrop-filter: blur(10px);
            border-radius: 16px;
            border: 1px solid #333;
            padding: 16px;
            z-index: 20;
            display: none;
            max-height: 300px;
            overflow-y: auto;
        }
        
        .ghost-playlist.acik {
            display: block;
        }
        
        /* ========== ÜST HEADER ========== */
        .mobil-header {
            height: 56px;
            background: #1a1a1a;
            border-bottom: 1px solid #333;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 12px;
            z-index: 5;
        }
        
        .mobil-header-sol, .mobil-header-sag {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .mobil-header-buton {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: #2a2a2a;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
            cursor: pointer;
            font-size: 18px;
        }
        
        .mobil-baslik {
            font-size: 16px;
            font-weight: 600;
            color: #fff;
        }
        
        .mobil-baslik i {
            color: #ff0000;
            margin-right: 4px;
        }
        
        /* ========== KANAL BİLGİSİ ========== */
        .kanal-bilgi {
            height: 48px;
            background: #1a1a1a;
            border-bottom: 1px solid #333;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 16px;
            font-size: 14px;
        }
        
        .kanal-adi {
            font-weight: 600;
            color: #fff;
        }
        
        .kanal-stats {
            display: flex;
            gap: 16px;
            color: #aaa;
        }
        
        /* ========== CHAT PANELİ - YOUTUBE TARZI KAYDIRMALI ========== */
        .chat-wrapper {
            flex: 1;
            position: relative;
            overflow: hidden;
            background: #0f0f0f;
        }
        
        .chat-container {
            height: 100%;
            overflow-y: auto;
            padding: 16px;
            padding-bottom: 80px;
            scroll-behavior: smooth;
        }
        
        .messages {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        
        /* POPBOX mesajı */
        .popbox-mesaj {
            background: #1a1a1a;
            border-radius: 16px;
            padding: 16px;
            margin-bottom: 16px;
            border-left: 4px solid #ff0000;
        }
        
        .popbox-title {
            color: #ff0000;
            font-weight: 700;
            font-size: 16px;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .popbox-icerik {
            color: #fff;
            font-size: 14px;
            line-height: 1.5;
            margin-bottom: 12px;
        }
        
        .popbox-alt {
            color: #aaa;
            font-size: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        /* Normal mesajlar */
        .message {
            max-width: 85%;
        }
        
        .message.right {
            align-self: flex-end;
        }
        
        .message-header {
            display: flex;
            align-items: center;
            gap: 6px;
            margin-bottom: 4px;
            font-size: 12px;
        }
        
        .message-sender {
            font-weight: 600;
            color: #aaa;
        }
        
        .message.right .message-sender {
            color: #ff0000;
        }
        
        .message-time {
            color: #666;
        }
        
        .message-text {
            background: #2a2a2a;
            border-radius: 16px;
            padding: 10px 14px;
            color: #fff;
            font-size: 14px;
        }
        
        .message.right .message-text {
            background: #ff0000;
        }
        
        .system-message {
            background: #1a1a1a;
            border-radius: 20px;
            padding: 10px 16px;
            color: #aaa;
            text-align: center;
            font-size: 13px;
            margin: 8px 0;
        }
        
        /* "Daha fazla bilgi" butonu */
        .info-button {
            background: #2a2a2a;
            border-radius: 30px;
            padding: 12px 20px;
            color: #fff;
            text-align: center;
            font-size: 14px;
            margin: 16px 0;
            cursor: pointer;
            border: 1px solid #333;
        }
        
        /* ========== KANAL LİSTESİ - YOUTUBE VİDEO LİSTESİ GİBİ ========== */
        .kanal-listesi-alani {
            background: #1a1a1a;
            border-top: 1px solid #333;
            margin-top: 20px;
            padding: 16px;
            border-radius: 16px 16px 0 0;
        }
        
        .kanal-listesi-baslik {
            color: #aaa;
            font-size: 14px;
            font-weight: 600;
            margin: 16px 0 10px;
        }
        
        .kanal-listesi-baslik:first-child {
            margin-top: 0;
        }
        
        .kanal-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px;
            background: #2a2a2a;
            border-radius: 12px;
            margin-bottom: 8px;
            cursor: pointer;
        }
        
        .kanal-avatar {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: #404040;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
        }
        
        .kanal-info {
            flex: 1;
        }
        
        .kanal-name {
            font-weight: 600;
            color: #fff;
            font-size: 15px;
            margin-bottom: 4px;
        }
        
        .kanal-meta {
            font-size: 12px;
            color: #aaa;
        }
        
        .kanal-subscribe-btn {
            padding: 8px 16px;
            background: #ff0000;
            border: none;
            border-radius: 20px;
            color: white;
            font-size: 12px;
            cursor: pointer;
        }
        
        .kanal-subscribe-btn.subscribed {
            background: #2a2a2a;
            color: #aaa;
        }
        
        /* ========== MESAJ GİRİŞ ========== */
        .message-input-container {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: 70px;
            background: #1a1a1a;
            border-top: 1px solid #333;
            padding: 10px 12px;
            z-index: 30;
        }
        
        .input-wrapper {
            display: flex;
            align-items: center;
            gap: 10px;
            background: #2a2a2a;
            border-radius: 30px;
            padding: 4px 4px 4px 16px;
        }
        
        .message-input {
            flex: 1;
            background: transparent;
            border: none;
            color: #fff;
            font-size: 15px;
            padding: 12px 0;
            outline: none;
        }
        
        .send-btn {
            width: 46px;
            height: 46px;
            border-radius: 50%;
            background: #ff0000;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            cursor: pointer;
            font-size: 18px;
        }
        
        /* ========== SOL MENÜ ========== */
        .sol-menu {
            position: fixed;
            left: -100%;
            top: 0;
            width: 85%;
            max-width: 320px;
            height: 100vh;
            background: #1a1a1a;
            z-index: 200;
            transition: left 0.3s ease;
            overflow-y: auto;
            padding: 20px 0;
        }
        
        .sol-menu.acik {
            left: 0;
            box-shadow: 2px 0 10px rgba(0,0,0,0.5);
        }
        
        .sol-menu-header {
            padding: 0 20px 20px;
            border-bottom: 1px solid #333;
            margin-bottom: 10px;
        }
        
        .profile-avatar {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: #ff0000;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            color: white;
            margin-bottom: 10px;
        }
        
        .sol-menu-item {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 16px 20px;
            color: #aaa;
            cursor: pointer;
            border-bottom: 1px solid #2a2a2a;
        }
        
        .sol-menu-item:active {
            background: #2a2a2a;
            color: #fff;
        }
        
        .sol-menu-item i {
            width: 24px;
            font-size: 20px;
        }
        
        .sol-menu-badge {
            background: #ff4444;
            color: white;
            border-radius: 20px;
            padding: 2px 8px;
            font-size: 11px;
            margin-left: auto;
        }
        
        /* ========== SAĞ MENÜ ========== */
        .sag-menu {
            position: fixed;
            right: -100%;
            top: 0;
            width: 85%;
            max-width: 320px;
            height: 100vh;
            background: #1a1a1a;
            z-index: 200;
            transition: right 0.3s ease;
            display: flex;
            flex-direction: column;
        }
        
        .sag-menu.acik {
            right: 0;
            box-shadow: -2px 0 10px rgba(0,0,0,0.5);
        }
        
        .sag-menu-sekmeler {
            display: flex;
            padding: 16px;
            gap: 12px;
            border-bottom: 1px solid #333;
        }
        
        .sag-menu-sekme {
            flex: 1;
            padding: 12px;
            text-align: center;
            background: #2a2a2a;
            border-radius: 30px;
            color: #aaa;
            cursor: pointer;
            font-size: 14px;
        }
        
        .sag-menu-sekme.aktif {
            background: #ff0000;
            color: white;
        }
        
        .sag-menu-icerik {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
        }
        
        .online-item, .sohbet-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px;
            background: #2a2a2a;
            border-radius: 12px;
            margin-bottom: 8px;
            cursor: pointer;
        }
        
        .online-avatar, .sohbet-avatar {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: #404040;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            color: #fff;
        }
        
        .sohbet-bildirim {
            background: #ff4444;
            color: white;
            border-radius: 20px;
            padding: 2px 8px;
            font-size: 11px;
            margin-left: auto;
        }
        
        /* ========== ÖZEL SOHBET ========== */
        .private-chat-panel {
            position: fixed;
            top: 100%;
            left: 0;
            right: 0;
            bottom: 0;
            background: #1a1a1a;
            z-index: 300;
            transition: top 0.3s ease;
            display: flex;
            flex-direction: column;
        }
        
        .private-chat-panel.active {
            top: 0;
        }
        
        .private-chat-header {
            height: 60px;
            background: #1a1a1a;
            border-bottom: 1px solid #333;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 16px;
        }
        
        .private-chat-user {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .private-chat-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: #404040;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
        }
        
        .private-chat-close {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: #ff0000;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            cursor: pointer;
        }
        
        .private-chat-messages {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
        }
        
        .private-message {
            margin-bottom: 12px;
            max-width: 85%;
        }
        
        .private-message.right {
            margin-left: auto;
        }
        
        .private-message-text {
            padding: 10px 14px;
            background: #2a2a2a;
            border-radius: 16px;
            color: #fff;
            font-size: 14px;
        }
        
        .private-message.right .private-message-text {
            background: #ff0000;
        }
        
        .private-media-actions {
            display: flex;
            gap: 12px;
            padding: 8px 16px;
        }
        
        .private-media-btn {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: #2a2a2a;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
            cursor: pointer;
        }
        
        .private-input-container {
            padding: 12px;
            background: #1a1a1a;
            border-top: 1px solid #333;
        }
        
        .private-text-input {
            display: flex;
            gap: 10px;
            background: #2a2a2a;
            border-radius: 30px;
            padding: 4px 4px 4px 16px;
        }
        
        .private-input {
            flex: 1;
            background: transparent;
            border: none;
            color: #fff;
            font-size: 14px;
            padding: 12px 0;
            outline: none;
        }
        
        .private-send-btn {
            width: 46px;
            height: 46px;
            border-radius: 50%;
            background: #ff0000;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            cursor: pointer;
        }
        
        /* ========== OVERLAY ========== */
        .mobil-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.7);
            z-index: 150;
            display: none;
        }
        
        .mobil-overlay.acik {
            display: block;
        }
        
        /* ========== GİRİŞ EKRANI ========== */
        .login-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.95);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        }
        
        .login-overlay.hidden {
            display: none;
        }
        
        .login-panel {
            width: 85%;
            max-width: 360px;
            background: #1a1a1a;
            border-radius: 20px;
            padding: 24px;
        }
        
        .login-panel h2 {
            color: #fff;
            text-align: center;
            margin-bottom: 20px;
            font-size: 24px;
        }
        
        .login-panel input {
            width: 100%;
            padding: 14px;
            background: #2a2a2a;
            border: none;
            border-radius: 12px;
            color: #fff;
            margin-bottom: 12px;
            font-size: 15px;
        }
        
        .login-panel button {
            width: 100%;
            padding: 14px;
            background: #ff0000;
            border: none;
            border-radius: 12px;
            color: white;
            font-weight: 600;
            font-size: 16px;
            cursor: pointer;
        }
        
        /* Responsive ayarlar - tüm ekranlarda çalışır */
        @media (max-width: 360px) {
            .mobil-header-buton { width: 36px; height: 36px; font-size: 16px; }
            .video-icon-btn { width: 36px; height: 36px; font-size: 16px; }
            .kanal-avatar { width: 40px; height: 40px; font-size: 18px; }
        }
        
        @media (min-width: 768px) {
            .sol-menu, .sag-menu { max-width: 360px; }
        }
    </style>
</head>
<body>
    <!-- GİRİŞ EKRANI -->
    <div id="loginOverlay" class="login-overlay">
        <div class="login-panel">
            <h2>CETCETY</h2>
            <input type="text" id="loginNick" placeholder="Kullanıcı adı">
            <input type="password" id="loginPassword" placeholder="Şifre">
            <button onclick="handleLogin()">Giriş Yap</button>
        </div>
    </div>

    <!-- ANA UYGULAMA -->
    <div id="app" class="app-mobil" style="display: none;">
        <!-- VİDEO PANELİ -->
        <div class="video-panel">
            <div class="video-player">
                <div id="youtubeContainer"></div>
                
                <!-- Hayalet playlist butonu -->
                <div class="ghost-playlist-btn" onclick="toggleGhostPlaylist()">
                    <i class="fas fa-list"></i>
                </div>
                
                <!-- Hayalet playlist paneli -->
                <div class="ghost-playlist" id="ghostPlaylist">
                    <div style="font-weight: 600; margin-bottom: 10px;">📋 Kanal Playlist</div>
                    <div id="ghostPlaylistItems"></div>
                </div>
                
                <!-- Video üstü iconlar -->
                <div class="video-overlay-icons">
                    <div class="video-icon-btn" onclick="window.mediaManager?.showAddVideoModal()" title="Video Ekle">
                        <i class="fas fa-plus"></i>
                    </div>
                    <div class="video-icon-btn" onclick="window.mediaManager?.showLiveStreamModal()" title="Canlı Yayın">
                        <i class="fas fa-video"></i>
                    </div>
                    <div class="video-icon-btn" onclick="window.mediaManager?.showReportModal()" title="Şikayet Et">
                        <i class="fas fa-flag"></i>
                    </div>
                    <div class="video-icon-btn" onclick="window.mediaManager?.toggleChannelHidden()" title="Kanalı Gizle">
                        <i class="fas fa-eye-slash"></i>
                    </div>
                </div>
            </div>
        </div>

        <!-- ÜST HEADER -->
        <div class="mobil-header">
            <div class="mobil-header-sol">
                <div class="mobil-header-buton" onclick="toggleSolMenu()">
                    <i class="fas fa-bars"></i>
                </div>
                <div class="mobil-baslik">
                    <i class="fas fa-hashtag"></i> <span id="currentChannelName">genel</span>
                </div>
            </div>
            <div class="mobil-header-sag">
                <div class="mobil-header-buton" onclick="toggleSagMenu()">
                    <i class="fas fa-ellipsis-vertical"></i>
                </div>
            </div>
        </div>

        <!-- KANAL BİLGİSİ -->
        <div class="kanal-bilgi">
            <div class="kanal-adi" id="mobilKanalAdi">#genel</div>
            <div class="kanal-stats">
                <span><i class="fas fa-user"></i> <span id="mobilOnlineCount">0</span></span>
                <span><i class="fas fa-users"></i> <span id="mobilSubscriberCount">0</span></span>
            </div>
        </div>

        <!-- CHAT WRAPPER - YouTube tarzı kaydırmalı -->
        <div class="chat-wrapper">
            <div class="chat-container" id="chatContainer">
                <div class="messages" id="messages">
                    <!-- POPBOX mesajı -->
                    <div class="popbox-mesaj">
                        <div class="popbox-title">
                            <i class="fas fa-gift"></i> POPBOX
                        </div>
                        <div class="popbox-icerik">
                            Sevgili ziyaretci.. gününüz aydın dilek!..
                        </div>
                        <div class="popbox-alt">
                            <i class="fas fa-user"></i> @AylinRustemli-i7t5k
                            <i class="fas fa-circle" style="font-size: 4px;"></i>
                            <span>salam</span>
                        </div>
                    </div>
                    
                    <!-- Sistem mesajı -->
                    <div class="system-message">
                        <i class="fas fa-info-circle"></i> Canlı sohbete hoş geldiniz! Gizliliğinizi korumayı ve topluluk kurallarımıza uymayı ihmal etmeyin.
                    </div>
                    
                    <!-- Daha fazla bilgi butonu -->
                    <div class="info-button" onclick="alert('Topluluk kuralları...')">
                        Daha fazla bilgi <i class="fas fa-arrow-right"></i>
                    </div>
                    
                    <!-- KANAL LİSTESİ - YouTube video listesi gibi -->
                    <div class="kanal-listesi-alani">
                        <div class="kanal-listesi-baslik">📢 ABONE OLUNAN KANALLAR</div>
                        <div id="aboneliklerListesi"></div>
                        
                        <div class="kanal-listesi-baslik">🔥 POPÜLER KANALLAR</div>
                        <div id="populerKanallarListesi"></div>
                        
                        <div class="kanal-listesi-baslik">🔍 DİĞER KANALLAR</div>
                        <div id="digerKanallarListesi"></div>
                    </div>
                </div>
            </div>
        </div>

        <!-- MESAJ GİRİŞ -->
        <div class="message-input-container">
            <div class="input-wrapper">
                <input type="text" id="messageInput" class="message-input" placeholder="Mesaj yazın...">
                <div class="send-btn" onclick="sendMessage()">
                    <i class="fas fa-paper-plane"></i>
                </div>
            </div>
        </div>

        <!-- SOL MENÜ -->
        <div class="sol-menu" id="solMenu">
            <div class="sol-menu-header">
                <div class="profile-avatar" id="mobilAvatar">?</div>
                <div style="font-weight: 600; font-size: 18px;" id="mobilUserName">Misafir</div>
            </div>
            <div class="sol-menu-item" onclick="openSubscriptions()">
                <i class="fas fa-bell"></i>
                <span>Abonelikler</span>
                <span class="sol-menu-badge" id="subscriptionBadge">0</span>
            </div>
            <div class="sol-menu-item" onclick="openChannelPanel()">
                <i class="fas fa-list-ul"></i>
                <span>Kanallar</span>
                <span class="sol-menu-badge" id="channelCountBadge">0</span>
            </div>
            <div class="sol-menu-item" onclick="openChatListPanel()">
                <i class="fas fa-comment"></i>
                <span>Sohbetlerim</span>
                <span class="sol-menu-badge" id="chatListBadge">0</span>
            </div>
            <div class="sol-menu-item" onclick="openCreateChannelPanel()">
                <i class="fas fa-plus-circle"></i>
                <span>Kanal Aç</span>
            </div>
            <div class="sol-menu-item" onclick="openNotificationPanel()">
                <i class="fas fa-bell"></i>
                <span>Bildirimler</span>
                <span class="sol-menu-badge" id="notificationBadge">0</span>
            </div>
            <div class="sol-menu-item" onclick="openSupportPanel()">
                <i class="fas fa-headset"></i>
                <span>Destek</span>
            </div>
            <div class="sol-menu-item" onclick="toggleTheme()">
                <i class="fas fa-moon"></i>
                <span>Tema</span>
            </div>
            <div class="sol-menu-item" onclick="openProfilePanel()">
                <i class="fas fa-user"></i>
                <span>Profil</span>
            </div>
        </div>

        <!-- SAĞ MENÜ -->
        <div class="sag-menu" id="sagMenu">
            <div class="sag-menu-sekmeler">
                <div class="sag-menu-sekme aktif" onclick="sagMenuDegistir('online', this)">Çevrimiçi</div>
                <div class="sag-menu-sekme" onclick="sagMenuDegistir('sohbetler', this)">Sohbetlerim</div>
            </div>
            <div class="sag-menu-icerik" id="sagMenuIcerik"></div>
        </div>

        <!-- ÖZEL SOHBET -->
        <div id="privateChatPanel" class="private-chat-panel">
            <div class="private-chat-header">
                <div class="private-chat-user">
                    <div class="private-chat-avatar" id="privateChatAvatar">👤</div>
                    <div>
                        <div class="private-chat-name" id="privateChatName">Kullanıcı</div>
                        <div style="font-size: 12px; color: #4caf50;">çevrimiçi</div>
                    </div>
                </div>
                <div class="private-chat-close" onclick="closePrivateChat()">
                    <i class="fas fa-times"></i>
                </div>
            </div>
            <div class="private-chat-messages" id="privateChatMessages"></div>
            <div class="private-input-container">
                <div class="private-media-actions">
                    <div class="private-media-btn" onclick="triggerPrivateImageUpload()">
                        <i class="fas fa-image"></i>
                    </div>
                    <div class="private-media-btn" onclick="triggerPrivateVideoUpload()">
                        <i class="fas fa-video"></i>
                    </div>
                    <input type="file" id="privateImageUpload" accept="image/*" style="display:none;">
                    <input type="file" id="privateVideoUpload" accept="video/*" style="display:none;">
                </div>
                <div class="private-text-input">
                    <input type="text" id="privateMessageInput" class="private-input" placeholder="Mesaj yazın...">
                    <div class="private-send-btn" onclick="sendPrivateMessage()">
                        <i class="fas fa-paper-plane"></i>
                    </div>
                </div>
            </div>
        </div>

        <!-- OVERLAY -->
        <div class="mobil-overlay" id="mobilOverlay" onclick="tumMenuleriKapat()"></div>
    </div>

    <script>
        // ========== GLOBAL ==========
        let ACTIVE_USER = null;
        let currentChannel = 'genel';
        let currentPrivateChat = null;
        let ghostPlaylistAcik = false;
        
        // Kanal verileri
        let channels = JSON.parse(localStorage.getItem('cetcety_channels')) || {
            'genel': { 
                name:'genel', 
                owner:'MateKy', 
                subscribers:15000000, 
                onlineUsers:['MateKy','Mehmet','Ahmet'],
                isHidden: false,
                currentVideo: 'jfKfPfyJRdk',
                playlist: [
                    {id:'jfKfPfyJRdk', title:'CETCETY Radio', addedBy:'MateKy'},
                    {id:'tAGnKpE4NCI', title:'Metallica', addedBy:'Mehmet'}
                ]
            },
            'rock': { 
                name:'rock', 
                owner:'Mehmet', 
                subscribers:1200000, 
                onlineUsers:['MateKy','Mehmet','Ahmet','Ali'],
                isHidden: false,
                currentVideo: 'tAGnKpE4NCI',
                playlist: [
                    {id:'tAGnKpE4NCI', title:'Metallica', addedBy:'Mehmet'}
                ]
            },
            'arabesk': { 
                name:'arabesk', 
                owner:'Ahmet', 
                subscribers:892000, 
                onlineUsers:['MateKy','Ahmet','Ayşe'],
                isHidden: false,
                currentVideo: 'GrAchTdFqVg',
                playlist: [
                    {id:'GrAchTdFqVg', title:'Ferdi Tayfur', addedBy:'Ahmet'}
                ]
            },
            'teknoloji': { 
                name:'teknoloji', 
                owner:'Ali', 
                subscribers:500000, 
                onlineUsers:['Ali','Veli'],
                isHidden: false
            },
            'muzik': { 
                name:'muzik', 
                owner:'Ayşe', 
                subscribers:750000, 
                onlineUsers:['Ayşe','Fatma'],
                isHidden: false
            }
        };

        // ========== GİRİŞ ==========
        function handleLogin() {
            const nick = document.getElementById('loginNick').value.trim();
            if (!nick) { alert('Kullanıcı adı girin!'); return; }

            ACTIVE_USER = {
                id: Date.now(),
                name: nick,
                role: nick.toLowerCase() === 'mateky' ? 'owner' : 'user',
                subscribedChannels: ['genel', 'rock', 'arabesk', 'teknoloji', 'muzik']
            };
            
            localStorage.setItem('cetcety_active_user', JSON.stringify(ACTIVE_USER));
            
            document.getElementById('loginOverlay').classList.add('hidden');
            document.getElementById('app').style.display = 'flex';
            
            document.getElementById('mobilUserName').textContent = nick;
            document.getElementById('mobilAvatar').textContent = nick.charAt(0).toUpperCase();
            
            kanalGuncelle('genel');
            tumKanallariGuncelle();
            sagMenuDoldur('online');
            ghostPlaylistGuncelle();
        }

        // ========== KANAL İŞLEMLERİ ==========
        function kanalGuncelle(kanalAdi) {
            currentChannel = kanalAdi;
            const kanal = channels[kanalAdi];
            
            document.getElementById('currentChannelName').textContent = kanalAdi;
            document.getElementById('mobilKanalAdi').textContent = '#' + kanalAdi;
            document.getElementById('mobilOnlineCount').textContent = kanal.onlineUsers?.length || 0;
            document.getElementById('mobilSubscriberCount').textContent = formatSayi(kanal.subscribers || 0);
            
            if (window.mediaManager) {
                window.mediaManager.setChannel(kanalAdi);
            }
            
            ghostPlaylistGuncelle();
            tumMenuleriKapat();
        }
        
        function tumKanallariGuncelle() {
            // Abonelikler
            const aboneliklerDiv = document.getElementById('aboneliklerListesi');
            let abonelikHtml = '';
            
            (ACTIVE_USER?.subscribedChannels || ['genel', 'rock', 'arabesk']).forEach(kanalAdi => {
                const kanal = channels[kanalAdi];
                if (kanal && !kanal.isHidden) {
                    abonelikHtml += `
                        <div class="kanal-item" onclick="kanalGuncelle('${kanalAdi}')">
                            <div class="kanal-avatar"><i class="fas fa-hashtag"></i></div>
                            <div class="kanal-info">
                                <div class="kanal-name">${kanalAdi}</div>
                                <div class="kanal-meta">${formatSayi(kanal.subscribers || 0)} abone • ${kanal.onlineUsers?.length || 0} çevrimiçi</div>
                            </div>
                        </div>
                    `;
                }
            });
            aboneliklerDiv.innerHTML = abonelikHtml || '<div style="color: #666; padding: 16px;">Abonelik yok</div>';
            
            // Popüler kanallar
            const populerDiv = document.getElementById('populerKanallarListesi');
            let populerHtml = '';
            
            Object.values(channels)
                .filter(k => !k.isHidden)
                .sort((a,b) => (b.subscribers||0) - (a.subscribers||0))
                .slice(0,3)
                .forEach(kanal => {
                    const isSub = ACTIVE_USER?.subscribedChannels?.includes(kanal.name);
                    populerHtml += `
                        <div class="kanal-item" onclick="kanalGuncelle('${kanal.name}')">
                            <div class="kanal-avatar"><i class="fas fa-fire" style="color: #ff4444;"></i></div>
                            <div class="kanal-info">
                                <div class="kanal-name">${kanal.name}</div>
                                <div class="kanal-meta">${formatSayi(kanal.subscribers || 0)} abone</div>
                            </div>
                            <button class="kanal-subscribe-btn ${isSub ? 'subscribed' : ''}" onclick="event.stopPropagation(); toggleSubscribe('${kanal.name}')">
                                <i class="fas ${isSub ? 'fa-check' : 'fa-plus'}"></i>
                            </button>
                        </div>
                    `;
                });
            populerDiv.innerHTML = populerHtml;
            
            // Diğer kanallar
            const digerDiv = document.getElementById('digerKanallarListesi');
            let digerHtml = '';
            
            Object.values(channels)
                .filter(k => !k.isHidden && !ACTIVE_USER?.subscribedChannels?.includes(k.name))
                .sort((a,b) => (b.subscribers||0) - (a.subscribers||0))
                .slice(0,5)
                .forEach(kanal => {
                    digerHtml += `
                        <div class="kanal-item" onclick="kanalGuncelle('${kanal.name}')">
                            <div class="kanal-avatar"><i class="fas fa-hashtag"></i></div>
                            <div class="kanal-info">
                                <div class="kanal-name">${kanal.name}</div>
                                <div class="kanal-meta">${formatSayi(kanal.subscribers || 0)} abone</div>
                            </div>
                            <button class="kanal-subscribe-btn" onclick="event.stopPropagation(); subscribeChannel('${kanal.name}')">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                    `;
                });
            digerDiv.innerHTML = digerHtml || '<div style="color: #666; padding: 16px;">Diğer kanal yok</div>';
        }
        
        function toggleSubscribe(kanalAdi) {
            if (ACTIVE_USER?.subscribedChannels?.includes(kanalAdi)) {
                unsubscribeChannel(kanalAdi);
            } else {
                subscribeChannel(kanalAdi);
            }
        }
        
        function subscribeChannel(kanalAdi) {
            if (!ACTIVE_USER?.subscribedChannels?.includes(kanalAdi)) {
                ACTIVE_USER.subscribedChannels.push(kanalAdi);
                localStorage.setItem('cetcety_active_user', JSON.stringify(ACTIVE_USER));
                tumKanallariGuncelle();
            }
        }
        
        function unsubscribeChannel(kanalAdi) {
            const index = ACTIVE_USER?.subscribedChannels?.indexOf(kanalAdi);
            if (index > -1) {
                ACTIVE_USER.subscribedChannels.splice(index, 1);
                localStorage.setItem('cetcety_active_user', JSON.stringify(ACTIVE_USER));
                tumKanallariGuncelle();
            }
        }
        
        // ========== HAYALET PLAYLIST ==========
        function toggleGhostPlaylist() {
            const playlist = document.getElementById('ghostPlaylist');
            ghostPlaylistAcik = !ghostPlaylistAcik;
            playlist.classList.toggle('acik', ghostPlaylistAcik);
        }
        
        function ghostPlaylistGuncelle() {
            const container = document.getElementById('ghostPlaylistItems');
            const kanal = channels[currentChannel];
            
            let html = '';
            (kanal?.playlist || []).forEach(item => {
                html += `
                    <div class="playlist-item" onclick="window.mediaManager?.playVideo('${item.id}')">
                        <i class="fab fa-youtube" style="color: #ff0000;"></i>
                        <div style="flex:1;">
                            <div style="font-size:13px; font-weight:500;">${item.title}</div>
                            <div style="font-size:11px; color:#aaa;">${item.addedBy}</div>
                        </div>
                    </div>
                `;
            });
            container.innerHTML = html || '<div style="color:#666; padding:10px; text-align:center;">📭 Video yok</div>';
        }
        
        // ========== MENÜ FONKSİYONLARI ==========
        function toggleSolMenu() {
            document.getElementById('solMenu').classList.add('acik');
            document.getElementById('mobilOverlay').classList.add('acik');
        }
        
        function toggleSagMenu() {
            document.getElementById('sagMenu').classList.add('acik');
            document.getElementById('mobilOverlay').classList.add('acik');
            sagMenuDoldur('online');
        }
        
        function tumMenuleriKapat() {
            document.getElementById('solMenu').classList.remove('acik');
            document.getElementById('sagMenu').classList.remove('acik');
            document.getElementById('mobilOverlay').classList.remove('acik');
        }
        
        function sagMenuDegistir(sekme, element) {
            document.querySelectorAll('.sag-menu-sekme').forEach(el => {
                el.classList.remove('aktif');
            });
            element.classList.add('aktif');
            sagMenuDoldur(sekme);
        }
        
        function sagMenuDoldur(sekme) {
            const container = document.getElementById('sagMenuIcerik');
            const kanal = channels[currentChannel];
            
            if (sekme === 'online') {
                let html = '';
                (kanal?.onlineUsers || ['MateKy', 'Mehmet', 'Ahmet']).forEach(user => {
                    html += `
                        <div class="online-item" onclick="openPrivateChat('${user}')">
                            <div class="online-avatar">${user.charAt(0)}</div>
                            <div style="flex:1;">
                                <div style="font-weight: 600;">${user}</div>
                                <div style="font-size: 12px; color: #4caf50;">● çevrimiçi</div>
                            </div>
                        </div>
                    `;
                });
                container.innerHTML = html;
            } else {
                // Sohbetler listesi
                container.innerHTML = '<div style="color: #666; text-align: center; padding: 20px;">💬 Sohbetler yükleniyor...</div>';
            }
        }
        
        // ========== MESAJLAR ==========
        function sendMessage() {
            const input = document.getElementById('messageInput');
            const text = input.value.trim();
            if (!text) return;
            
            const time = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
            
            const msgDiv = document.createElement('div');
            msgDiv.className = 'message right';
            msgDiv.innerHTML = `
                <div class="message-header">
                    <span class="message-time">${time}</span>
                    <span class="message-sender">${ACTIVE_USER?.name || 'Ben'}</span>
                </div>
                <div class="message-text">${text}</div>
            `;
            
            document.getElementById('messages').appendChild(msgDiv);
            document.getElementById('chatContainer').scrollTop = document.getElementById('chatContainer').scrollHeight;
            input.value = '';
        }
        
        // ========== ÖZEL SOHBET ==========
        function openPrivateChat(username) {
            currentPrivateChat = { name: username, id: username };
            document.getElementById('privateChatName').textContent = username;
            document.getElementById('privateChatAvatar').innerHTML = username.charAt(0).toUpperCase();
            document.getElementById('privateChatPanel').classList.add('active');
            tumMenuleriKapat();
        }
        
        function closePrivateChat() {
            document.getElementById('privateChatPanel').classList.remove('active');
            currentPrivateChat = null;
        }
        
        function sendPrivateMessage() {
            const input = document.getElementById('privateMessageInput');
            const text = input.value.trim();
            if (!text || !currentPrivateChat) return;
            
            const msgDiv = document.createElement('div');
            msgDiv.className = 'private-message right';
            msgDiv.innerHTML = `<div class="private-message-text">${text}</div>`;
            
            document.getElementById('privateChatMessages').appendChild(msgDiv);
            document.getElementById('privateChatMessages').scrollTop = document.getElementById('privateChatMessages').scrollHeight;
            input.value = '';
        }
        
        // ========== RESİM/VIDEO GÖNDERME ==========
        function triggerPrivateImageUpload() {
            document.getElementById('privateImageUpload').click();
        }
        
        function triggerPrivateVideoUpload() {
            document.getElementById('privateVideoUpload').click();
        }
        
        document.getElementById('privateImageUpload').onchange = function(e) {
            if (!e.target.files || !e.target.files[0] || !currentPrivateChat) return;
            
            const file = e.target.files[0];
            const reader = new FileReader();
            
            reader.onload = function(event) {
                const msgDiv = document.createElement('div');
                msgDiv.className = 'private-message right';
                msgDiv.innerHTML = `
                    <div class="private-message-media">
                        <img src="${event.target.result}" style="max-width: 200px; border-radius: 12px;">
                    </div>
                `;
                document.getElementById('privateChatMessages').appendChild(msgDiv);
                document.getElementById('privateChatMessages').scrollTop = document.getElementById('privateChatMessages').scrollHeight;
            };
            
            reader.readAsDataURL(file);
            e.target.value = '';
        };
        
        document.getElementById('privateVideoUpload').onchange = function(e) {
            if (!e.target.files || !e.target.files[0] || !currentPrivateChat) return;
            
            const file = e.target.files[0];
            const reader = new FileReader();
            
            reader.onload = function(event) {
                const msgDiv = document.createElement('div');
                msgDiv.className = 'private-message right';
                msgDiv.innerHTML = `
                    <div class="private-message-media">
                        <video src="${event.target.result}" controls style="max-width: 200px; border-radius: 12px;"></video>
                    </div>
                `;
                document.getElementById('privateChatMessages').appendChild(msgDiv);
                document.getElementById('privateChatMessages').scrollTop = document.getElementById('privateChatMessages').scrollHeight;
            };
            
            reader.readAsDataURL(file);
            e.target.value = '';
        };
        
        // ========== PANEL FONKSİYONLARI ==========
        function openSubscriptions() { 
            alert('Abonelikler paneli'); 
            tumMenuleriKapat();
        }
        function openChannelPanel() { 
            alert('Kanallar paneli'); 
            tumMenuleriKapat();
        }
        function openChatListPanel() { 
            alert('Sohbetlerim paneli'); 
            tumMenuleriKapat();
        }
        function openCreateChannelPanel() { 
            alert('Kanal açma paneli'); 
            tumMenuleriKapat();
        }
        function openNotificationPanel() { 
            alert('Bildirimler paneli'); 
            tumMenuleriKapat();
        }
        function openSupportPanel() { 
            alert('Destek paneli'); 
            tumMenuleriKapat();
        }
        function openProfilePanel() { 
            alert('Profil paneli'); 
            tumMenuleriKapat();
        }
        function toggleTheme() { 
            document.body.classList.toggle('light-theme'); 
        }
        
        // ========== YARDIMCI ==========
        function formatSayi(sayi) {
            if (sayi >= 1000000) return (sayi/1000000).toFixed(1) + 'M';
            if (sayi >= 1000) return (sayi/1000).toFixed(1) + 'K';
            return sayi;
        }
        
        // ========== BAŞLANGIÇ ==========
        document.addEventListener('DOMContentLoaded', function() {
            ACTIVE_USER = JSON.parse(localStorage.getItem('cetcety_active_user'));
            if (ACTIVE_USER) {
                document.getElementById('loginOverlay').classList.add('hidden');
                document.getElementById('app').style.display = 'flex';
                document.getElementById('mobilUserName').textContent = ACTIVE_USER.name;
                document.getElementById('mobilAvatar').textContent = ACTIVE_USER.name.charAt(0).toUpperCase();
                kanalGuncelle('genel');
                tumKanallariGuncelle();
                sagMenuDoldur('online');
                ghostPlaylistGuncelle();
            }
        });
    </script>
</body>
</html>
