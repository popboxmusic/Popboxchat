// ========== GİRİŞ ==========
async function handleLogin() {
    const nick = document.getElementById('loginNick').value.trim();
    const pass = document.getElementById('loginPassword').value.trim();
    
    if (!nick) {
        alert('Kullanıcı adı girin!');
        return;
    }

    const normNick = normalizeNick(nick);
    
    // Kullanıcı var mı kontrol et
    const snapshot = await db.users.orderByChild('nameLower').equalTo(normNick).once('value');
    let userData = null;
    let userId = null;
    
    snapshot.forEach(child => {
        userData = child.val();
        userId = child.key;
    });

    if (userData) {
        // Kayıtlı kullanıcı
        if (userData.password && userData.password !== pass) {
            alert('Hatalı şifre!');
            return;
        }
        
        // Owner kontrolü
        if (normNick === 'mateky') {
            const valid = await verifyOwner(pass);
            if (!valid) {
                alert('Owner şifresi hatalı!');
                return;
            }
        }
        
        currentUser = { id: userId, ...userData };
    } else {
        // Yeni kullanıcı
        if (normNick === 'mateky') {
            const valid = await verifyOwner(pass);
            if (!valid) {
                alert('Owner şifresi hatalı!');
                return;
            }
        }
        
        const newUser = {
            name: nick,
            nameLower: normNick,
            role: normNick === 'mateky' ? 'owner' : 'user',
            subscribed: ['genel'],
            myChannel: null,
            joined: Date.now(),
            avatar: nick.charAt(0).toUpperCase(),
            avatarData: null,
            password: pass || '',
            privateMode: 'all',
            blocked: [],
            lastSeen: Date.now(),
            online: true
        };
        
        const newRef = await db.users.push(newUser);
        userId = newRef.key;
        currentUser = { id: userId, ...newUser };
    }

    // Giriş başarılı
    await updateOnlineStatus(true);
    await joinChannel('genel');

    document.getElementById('loginOverlay').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    
    updateAvatar();
    loadChannels();
    loadBannedWords();
    loadCustomCommands();
    
    addSystemMessage(`👋 Hoş geldin, ${currentUser.name}!`);

    // Admin kanalına ekle
    if (currentUser.role === 'owner' || currentUser.role === 'admin') {
        if (!currentUser.subscribed.includes('admin')) {
            currentUser.subscribed.push('admin');
            await db.users.child(userId).child('subscribed').set(currentUser.subscribed);
        }
    }
}

// ========== ONLINE DURUM ==========
async function updateOnlineStatus(online) {
    if (!currentUser) return;
    await db.users.child(currentUser.id).update({
        online: online,
        lastSeen: Date.now(),
        currentChannel: online ? currentChannel : null
    });
}

// ========== ÇIKIŞ ==========
async function logout() {
    if (currentUser) {
        await db.users.child(currentUser.id).update({
            online: false,
            lastSeen: Date.now()
        });
    }
    location.reload();
}

// ========== AVATAR ==========
function updateAvatar() {
    const span = document.getElementById('avatarText');
    if (currentUser.avatarData) {
        span.innerHTML = `<img src="${currentUser.avatarData}" style="width:100%; height:100%; border-radius:50%;">`;
    } else {
        span.textContent = currentUser.avatar;
    }
}

// ========== YASAKLI KELİMELER ==========
async function loadBannedWords() {
    const snap = await db.bannedWords.once('value');
    BANNED_WORDS = snap.val() || [];
}

// ========== ÖZEL KOMUTLAR ==========
async function loadCustomCommands() {
    const snap = await db.customCommands.once('value');
    CUSTOM_COMMANDS = snap.val() || [];
}
