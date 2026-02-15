// ========== COMMANDS.JS ==========
const Commands = {
    handle: function(cmd) {
        const parts = cmd.substring(1).split(' ');
        const main = parts[0].toLowerCase();
        
        if (main === 'help') {
            Utils.addSystemMessage('📋 /join #kanal, /nick list, /ping, /temizle');
        }
        else if (main === 'ping') {
            Utils.addSystemMessage('🏓 Pong!');
        }
        else if (main === 'temizle' || main === 'clear') {
            document.getElementById('messages').innerHTML = '';
            Utils.addSystemMessage('✅ Sohbet temizlendi');
        }
        else if (main === 'nick' && parts[1] === 'list') {
            Utils.addSystemMessage('👥 Çevrimiçi: ' + (Auth.currentUser?.name || ''));
        }
        else if (main === 'join') {
            const ch = parts[1]?.replace('#', '');
            if (ch) Channels.join(ch);
        }
        else {
            Utils.addSystemMessage(`❌ Bilinmeyen komut: ${cmd}`);
        }
    }
};

window.Commands = Commands;
console.log('✅ Commands.js yüklendi');