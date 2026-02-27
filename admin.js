// ========== ADMIN KOMUTLARI ==========
async function handleCommand(cmd) {
    const parts = cmd.substring(1).split(' ');
    const main = parts[0].toLowerCase();

    // Özel komut kontrolü
    const custom = CUSTOM_COMMANDS.find(c => c.cmd === '/' + main || c.cmd === main);
    if (custom) {
        addSystemMessage(`🤖 ${custom.resp}`);
        return;
    }

    // HELP komutu
    if (main === 'help') {
        let help = '📋 **KOMUTLAR**\n';
        help += '/help - Bu menü\n';
        help += '/join #kanal - Kanala katıl\n';
        help += '/part - Kanaldan ayrıl\n';
        help += '/msg kullanıcı mesaj - Özel mesaj\n';
        help += '/users - Çevrimiçi kullanıcılar\n';
        
        if (currentUser.role === 'coadmin' || currentUser.role === 'admin' || currentUser.role === 'owner') {
            help += '\n🔧 **CO-ADMIN KOMUTLARI**\n';
            help += '/kick kullanıcı - Kullanıcıyı at\n';
            help += '/ban kullanıcı - 24 saat yasakla\n';
            help += '/op kullanıcı - Co-admin yap\n';
            help += '/deop kullanıcı - Co-admin yetkisini al\n';
        }
        
        if (currentUser.role === 'admin' || currentUser.role === 'owner') {
            help += '\n⚡ **ADMIN KOMUTLARI**\n';
            help += '/unban kullanıcı - Yasağı kaldır\n';
        }
        
        if (currentUser.role === 'owner') {
            help += '\n👑 **OWNER KOMUTLARI**\n';
            help += '/addbanned kelime - Yasaklı kelime ekle\n';
            help += '/removebanned kelime - Yasaklı kelime kaldır\n';
            help += '/addcmd komut yanıt - Özel komut ekle\n';
            help += '/removecmd komut - Özel komut sil\n';
        }
        
        addSystemMessage(help);
        return;
    }

    // KICK komutu
    if (main === 'kick' && (currentUser.role === 'coadmin' || currentUser.role === 'admin' || currentUser.role === 'owner')) {
        const target = parts[1];
        if (!target) {
            addSystemMessage('Kullanım: /kick kullanıcı');
            return;
        }
        
        const snap = await db.channels.child(currentChannel).once('value');
        const channel = snap.val();
        if (!channel) return;
        
        let targetId = null;
        for (let uid in channel.online) {
            const userSnap = await db.users.child(uid).once('value');
            if (userSnap.val()?.name === target) {
                targetId = uid;
                break;
            }
        }
        
        if (!targetId) {
            addSystemMessage(`❌ ${target} kanalda değil`);
            return;
        }
        
        delete channel.online[targetId];
        channel.onlineCount = Object.keys(channel.online).length;
        await db.channels.child(currentChannel).set(channel);
        
        addSystemMessage(`👢 ${target} kanaldan atıldı`);
    }

    // BAN komutu
    else if (main === 'ban' && (currentUser.role === 'coadmin' || currentUser.role === 'admin' || currentUser.role === 'owner')) {
        const target = parts[1];
        if (!target) {
            addSystemMessage('Kullanım: /ban kullanıcı');
            return;
        }
        
        const userSnap = await db.users.orderByChild('nameLower').equalTo(target.toLowerCase()).once('value');
        let targetId = null;
        userSnap.forEach(c => { targetId = c.key; });
        
        if (!targetId) {
            addSystemMessage('❌ Kullanıcı bulunamadı');
            return;
        }
        
        await db.blocked.child(targetId).set({
            by: currentUser.id,
            byName: currentUser.name,
            until: Date.now() + 24 * 60 * 60 * 1000,
            reason: parts.slice(2).join(' ') || 'Belirtilmemiş'
        });
        
        addSystemMessage(`🚫 ${target} 24 saat yasaklandı`);
    }

    // UNBAN komutu
    else if (main === 'unban' && (currentUser.role === 'admin' || currentUser.role === 'owner')) {
        const target = parts[1];
        if (!target) {
            addSystemMessage('Kullanım: /unban kullanıcı');
            return;
        }
        
        const userSnap = await db.users.orderByChild('nameLower').equalTo(target.toLowerCase()).once('value');
        let targetId = null;
        userSnap.forEach(c => { targetId = c.key; });
        
        if (targetId) {
            await db.blocked.child(targetId).remove();
            addSystemMessage(`✅ ${target} yasağı kaldırıldı`);
        }
    }

    // OP komutu (co-admin yap)
    else if (main === 'op' && (currentUser.role === 'coadmin' || currentUser.role === 'admin' || currentUser.role === 'owner')) {
        const target = parts[1];
        if (!target) {
            addSystemMessage('Kullanım: /op kullanıcı');
            return;
        }
        
        const snap = await db.channels.child(currentChannel).once('value');
        const channel = snap.val();
        if (!channel) return;
        
        if (!channel.coAdmins) channel.coAdmins = [];
        if (!channel.coAdmins.includes(target)) {
            channel.coAdmins.push(target);
            await db.channels.child(currentChannel).set(channel);
            addSystemMessage(`🔧 ${target} co-admin yapıldı`);
        }
    }

    // DEOP komutu
    else if (main === 'deop' && (currentUser.role === 'coadmin' || currentUser.role === 'admin' || currentUser.role === 'owner')) {
        const target = parts[1];
        if (!target) {
            addSystemMessage('Kullanım: /deop kullanıcı');
            return;
        }
        
        const snap = await db.channels.child(currentChannel).once('value');
        const channel = snap.val();
        if (!channel?.coAdmins) return;
        
        channel.coAdmins = channel.coAdmins.filter(u => u !== target);
        await db.channels.child(currentChannel).set(channel);
        addSystemMessage(`🔨 ${target} co-admin yetkisi alındı`);
    }

    // OWNER komutları
    else if (currentUser.role === 'owner') {
        if (main === 'addbanned') {
            const word = parts.slice(1).join(' ');
            if (!word) return;
            BANNED_WORDS.push(word);
            await db.bannedWords.set(BANNED_WORDS);
            addSystemMessage(`🚫 Yasaklı kelime eklendi: ${word}`);
        }
        
        else if (main === 'removebanned') {
            const word = parts.slice(1).join(' ');
            if (!word) return;
            BANNED_WORDS = BANNED_WORDS.filter(w => w !== word);
            await db.bannedWords.set(BANNED_WORDS);
            addSystemMessage(`✅ Kelime kaldırıldı: ${word}`);
        }
        
        else if (main === 'addcmd') {
            const cmd = parts[1];
            const resp = parts.slice(2).join(' ');
            if (!cmd || !resp) return;
            CUSTOM_COMMANDS.push({ cmd: '/' + cmd, resp: resp });
            await db.customCommands.set(CUSTOM_COMMANDS);
            addSystemMessage(`✅ /${cmd} komutu eklendi`);
        }
        
        else if (main === 'removecmd') {
            const cmd = parts[1];
            if (!cmd) return;
            CUSTOM_COMMANDS = CUSTOM_COMMANDS.filter(c => c.cmd !== '/' + cmd);
            await db.customCommands.set(CUSTOM_COMMANDS);
            addSystemMessage(`🗑️ /${cmd} komutu silindi`);
        }
    }
}

// ========== KULLANICI LİSTESİ ==========
async function showUsers() {
    const snap = await db.channels.child(currentChannel).once('value');
    const channel = snap.val();
    if (!channel?.online) return;
    
    let list = '👥 **Çevrimiçi:**\n';
    for (let uid in channel.online) {
        const userSnap = await db.users.child(uid).once('value');
        const user = userSnap.val();
        if (user) list += `• ${user.name}\n`;
    }
    addSystemMessage(list);
}
