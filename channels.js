// ========== channels.js ==========
// KANAL İŞLEMLERİ

const Channels = {
    // Abone ol/çık
    toggleSubscribe: function(channelName) {
        if (!App.currentUser) return;
        
        const index = App.currentUser.subscribedChannels.indexOf(channelName);
        
        if (index === -1) {
            App.currentUser.subscribedChannels.push(channelName);
            Utils.addSystemMessage(`✅ #${channelName} abone olundu!`);
            
            // Butonu güncelle
            const btn = document.getElementById('subscribeChannelBtn');
            if (btn) {
                btn.innerHTML = '<i class="fas fa-check"></i> Abone Olundu';
                btn.classList.add('subscribed');
            }
        } else {
            App.currentUser.subscribedChannels.splice(index, 1);
            Utils.addSystemMessage(`❌ #${channelName} abonelikten çıkıldı.`);
            
            // Butonu güncelle
            const btn = document.getElementById('subscribeChannelBtn');
            if (btn) {
                btn.innerHTML = '<i class="fas fa-plus"></i> Abone Ol';
                btn.classList.remove('subscribed');
            }
        }
        
        localStorage.setItem('cetcety_user', JSON.stringify(App.currentUser));
        UI.updateChannelList();
    },
    
    // Kanal gizle/göster
    toggleHidden: function() {
        Utils.addSystemMessage('👁️ Bu özellik yakında...');
    },
    
    // Şikayet et
    report: function() {
        const reason = prompt('Şikayet sebebi:');
        if (reason) {
            Utils.addSystemMessage(`🚩 #${App.currentChannel} şikayet edildi: ${reason}`);
        }
    }
};

window.Channels = Channels;
console.log('✅ Channels.js yüklendi');
