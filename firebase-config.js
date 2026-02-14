// ========== FIRESIZ - localStorage ile Eşzamanlılık ==========
console.log('🔥 FIRESIZ sistem başlatıldı!');

// ========== KULLANICI GİRİŞ YAPINCA ==========
window.userJoined = function(user) {
    if (!user) return;
    
    console.log(`📡 Kullanıcı giriş yaptı:`, user.name);
    
    // localStorage'daki online kullanıcıları güncelle
    let onlineUsers = JSON.parse(localStorage.getItem('cetcety_online')) || {};
    const channel = window.currentChannel || 'genel';
    
    if (!onlineUsers[channel]) onlineUsers[channel] = [];
    if (!onlineUsers[channel].includes(user.name)) {
        onlineUsers[channel].push(user.name);
        localStorage.setItem('cetcety_online', JSON.stringify(onlineUsers));
    }
    
    // Online sayısını güncelle
    const countEl = document.getElementById('channelUserCount');
    if (countEl) countEl.textContent = onlineUsers[channel].length;
};

// ========== KANAL DEĞİŞTİRİNCE ==========
window.changeChannel = function(channelName) {
    console.log(`📡 Kanal değişiyor: ${channelName}`);
    
    // Eski kanaldan çıkar
    const eskiKanal = window.currentChannel || 'genel';
    let onlineUsers = JSON.parse(localStorage.getItem('cetcety_online')) || {};
    
    if (onlineUsers[eskiKanal] && window.ACTIVE_USER) {
        onlineUsers[eskiKanal] = onlineUsers[eskiKanal].filter(u => u !== window.ACTIVE_USER.name);
    }
    
    // Yeni kanala ekle
    if (!onlineUsers[channelName]) onlineUsers[channelName] = [];
    if (window.ACTIVE_USER && !onlineUsers[channelName].includes(window.ACTIVE_USER.name)) {
        onlineUsers[channelName].push(window.ACTIVE_USER.name);
    }
    
    localStorage.setItem('cetcety_online', JSON.stringify(onlineUsers));
    
    // Online sayısını güncelle
    const countEl = document.getElementById('channelUserCount');
    if (countEl) countEl.textContent = onlineUsers[channelName]?.length || 0;
};

// ========== MESAJ GÖNDER ==========
window.sendFirebaseMessage = function(channel, message, sender) {
    // localStorage'a kaydet (zaten HTML yapıyor)
    console.log(`📨 Mesaj gönderildi: ${channel} - ${sender}: ${message}`);
    
    // storage event'i tetikle (diğer sekmeler için)
    localStorage.setItem('cetcety_last_message', Date.now().toString());
};

// ========== ÖZEL MESAJ GÖNDER ==========
window.sendPrivateMessageToFirebase = function(senderId, receiverId, message) {
    console.log(`📨 Özel mesaj gönderildi: ${senderId} -> ${receiverId}`);
    
    // storage event'i tetikle
    localStorage.setItem('cetcety_last_private', Date.now().toString());
};

// ========== KANAL BİLGİLERİNİ GÜNCELLE ==========
window.syncChannelToFirebase = function(channelName) {
    if (!window.channels || !window.channels[channelName]) return;
    
    console.log(`📡 Kanal bilgisi güncellendi: ${channelName}`);
    
    // storage event'i tetikle
    localStorage.setItem('cetcety_last_channel_update', Date.now().toString());
};

// ========== STORAGE DEĞİŞİKLİKLERİNİ DİNLE ==========
window.addEventListener('storage', function(e) {
    if (e.key === 'cetcety_last_message' || 
        e.key === 'cetcety_last_private' || 
        e.key === 'cetcety_last_channel_update' ||
        e.key === 'cetcety_online') {
        
        console.log('🔄 Storage güncellendi, UI yenileniyor...');
        
        // Online listeyi güncelle
        if (window.currentChannel) {
            let onlineUsers = JSON.parse(localStorage.getItem('cetcety_online')) || {};
            const countEl = document.getElementById('channelUserCount');
            if (countEl) {
                countEl.textContent = onlineUsers[window.currentChannel]?.length || 0;
            }
            
            // Online sekmesi açıksa güncelle
            if (document.getElementById('tabOnline')?.classList.contains('active') && window.showOnlineTab) {
                window.showOnlineTab();
            }
        }
        
        // Sohbet listesini güncelle
        if (document.querySelector('.panel-header h3')?.innerText.includes('Sohbetlerim') && window.showChatsTab) {
            window.showChatsTab();
        }
    }
});

// ========== PERİYODİK KONTROL ==========
setInterval(function() {
    if (window.ACTIVE_USER && window.currentChannel) {
        // Online listeyi güncelle
        let onlineUsers = JSON.parse(localStorage.getItem('cetcety_online')) || {};
        const countEl = document.getElementById('channelUserCount');
        if (countEl) {
            countEl.textContent = onlineUsers[window.currentChannel]?.length || 0;
        }
    }
}, 2000);

console.log('✅ FIRESIZ sistem aktif - localStorage ile eşzamanlılık sağlanıyor!');
