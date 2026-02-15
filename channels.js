// ========== channels.js ==========
// KANAL İŞLEMLERİ

const Channels = {
    // Abone ol/çık
    toggleSubscribe: function(channelName) {
        if (!App.currentUser) return;
        
        const index = App.currentUser.subscribedChannels.indexOf(channelName);
        
        if (index === -1) {
            // Abone ol
            App.currentUser.subscribedChannels.push(channelName);
            App.channels[channelName].subscribers = (App.channels[channelName].subscribers || 0) + 1;
            Utils.addSystemMessage(`✅ #${channelName} abone olundu!`);
        } else {
            // Abonelikten çık
            App.currentUser.subscribedChannels.splice(index, 1);
            App.channels[channelName].subscribers = Math.max(0, (App.channels[channelName].subscribers || 1) - 1);
            Utils.addSystemMessage(`❌ #${channelName} abonelikten çıkıldı.`);
        }
        
        // Kaydet
        localStorage.setItem('cetcety_user', JSON.stringify(App.currentUser));
        
        // UI'ı güncelle
        UI.updateChannelList();
        UI.loadLeftPanel('channels');
    }
};

window.Channels = Channels;
console.log('✅ Channels.js yüklendi');