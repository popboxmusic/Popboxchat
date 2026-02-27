// ========== GİRİŞ ==========
async function handleLogin() {
    const nickInput = document.getElementById('loginNick');
    const passInput = document.getElementById('loginPassword');
    const nick = nickInput.value.trim();
    const pass = passInput.value.trim();
    
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
            const isValid = await verifyOwner(pass);
            if (!isValid) {
                alert('Owner şifresi hatalı!');
                return;
            }
        }
        
        currentUser = {
            id: userId,
            ...userData
        };
    } else {
        // Yeni kullanıcı
        if (normNick === 'mateky') {
            const isValid = await verifyOwner(pass);
            if (!isValid) {
                alert('Owner şifresi hatalı!');
                return;
            }
        }
        
        const newUser = {
            name: nick,
            nameLower: normNick,
            role: normNick === 'mateky' ? 'owner' : 'user',
            roleLevel: normNick === 'mateky' ? 5 : 1,
            subscribedChannels: ['genel'],
            myChannel: null,
            joinDate: Date.now(),
            avatar: nick.charAt(0).toUpperCase(),
            avatarData: null,
            password: pass || '',
            privateMode: 'all',
            blockedNicks: [],
            lastSeen: Date.now(),
            isOnline: true,
            currentChannel: 'genel'
        };
        
        const newRef = await db.users.push(newUser);
        userId = newRef.key;
        currentUser = { id: userId, ...newUser };
    }
    
    // Giriş başarılı
    await updateOnlineStatus(true);
    await addToChannel('genel');
    
    // Local'e kaydet (oturum için)
    localStorage.setItem('cetcety_current_user', JSON.stringify({
        id: currentUser.id,
        name: currentUser.name,
        role: currentUser.role
    }));
    
    // UI'ı göster
    document.getElementById('loginOverlay').classList.add('hidden');
    document.getElementById('app').style.display = 'flex';
    
    // Profil avatarını güncelle
    updateAvatar();
    
    // Sol paneli aç
    loadLeftPanel('subscriptions');
    
    // Bildirim rozetlerini güncelle
    updateAllBadges();
    
    // YouTube'u başlat
    if (typeof YT !== 'undefined' && YT.Player) {
        initYouTubePlayer();
    }
    
    // Hoş geldin mesajı
    addSystemMessage(`👋 Hoş geldin, ${currentUser.name}!`);
    
    // Admin kanalına ekle
    if (currentUser.role === 'owner' || currentUser.role === 'admin') {
        if (!currentUser.subscribedChannels.includes('admin')) {
            currentUser.subscribedChannels.push('admin');
            await db.users.child(currentUser.id).child('subscribedChannels').set(currentUser.subscribedChannels);
        }
        await addToChannel('admin');
        addAdminMessage(`👑 ${currentUser.name} giriş yaptı.`);
    }
    
    // Owner özel takip
    if (currentUser.role === 'owner') {
        checkPrivateSpyStatus();
    }
}

// ========== ONLINE DURUM ==========
async function updateOnlineStatus(isOnline) {
    if (!currentUser) return;
    
    await db.users.child(currentUser.id).update({
        isOnline: isOnline,
        lastSeen: Date.now(),
        currentChannel: isOnline ? currentChannel : null
    });
}

// ========== ÇIKIŞ ==========
async function logout() {
    if (currentUser) {
        // Kanaldan çıkar
        await removeFromChannel(currentChannel);
        
        // Online durumunu güncelle
        await db.users.child(currentUser.id).update({
            isOnline: false,
            lastSeen: Date.now()
        });
        
        // Owner takibi varsa durdur
        if (currentUser.role === 'owner' && document.getElementById('privateSpyIndicator')) {
            document.getElementById('privateSpyIndicator').remove();
        }
    }
    
    // Local'i temizle
    localStorage.removeItem('cetcety_current_user');
    
    // Sayfayı yenile
    location.reload();
}

// ========== OTOMATİK GİRİŞ ==========
async function autoLogin() {
    const saved = localStorage.getItem('cetcety_current_user');
    if (!saved) return false;
    
    try {
        const userInfo = JSON.parse(saved);
        const snapshot = await db.users.child(userInfo.id).once('value');
        const userData = snapshot.val();
        
        if (userData) {
            currentUser = {
                id: userInfo.id,
                ...userData
            };
            
            await updateOnlineStatus(true);
            await addToChannel(currentUser.currentChannel || 'genel');
            currentChannel = currentUser.currentChannel || 'genel';
            
            document.getElementById('loginOverlay').classList.add('hidden');
            document.getElementById('app').style.display = 'flex';
            
            updateAvatar();
            loadLeftPanel('subscriptions');
            updateAllBadges();
            
            if (typeof YT !== 'undefined' && YT.Player) {
                initYouTubePlayer();
            }
            
            addSystemMessage(`👋 Tekrar hoş geldin, ${currentUser.name}!`);
            
            if (currentUser.role === 'owner') {
                checkPrivateSpyStatus();
            }
            
            return true;
        }
    } catch (e) {
        console.log('Otomatik giriş hatası:', e);
    }
    
    return false;
}

// ========== KANALA EKLE ==========
async function addToChannel(channelName) {
    const snapshot = await db.channels.child(channelName).once('value');
    let channel = snapshot.val();
    
    if (!channel) {
        // Varsayılan kanal oluştur
        channel = {
            name: channelName,
            owner: 'MateKy',
            ownerRole: 'owner',
            coAdmins: [],
            subscribers: 1,
            isHidden: false,
            isSuperHidden: false,
            youtube: {
                currentVideo: 'jfKfPfyJRdk',
                currentTitle: 'CETCETY Radio',
                currentArtist: 'MateKy',
                playlist: [{
                    id: 'jfKfPfyJRdk',
                    title: 'CETCETY Radio',
                    addedBy: 'MateKy',
                    role: 'owner'
                }]
            },
            onlineUsers: {}
        };
    }
    
    if (!channel.onlineUsers) channel.onlineUsers = {};
    channel.onlineUsers[currentUser.id] = {
        name: currentUser.name,
        role: currentUser.role,
        joinedAt: Date.now()
    };
    channel.onlineCount = Object.keys(channel.onlineUsers).length;
    
    await db.channels.child(channelName).set(channel);
}

// ========== KANALDAN ÇIKAR ==========
async function removeFromChannel(channelName) {
    const snapshot = await db.channels.child(channelName).once('value');
    const channel = snapshot.val();
    
    if (channel && channel.onlineUsers) {
        delete channel.onlineUsers[currentUser.id];
        channel.onlineCount = Object.keys(channel.onlineUsers).length;
        await db.channels.child(channelName).set(channel);
    }
}

// ========== KANALA KATIL ==========
async function joinChannel(channelName) {
    const snapshot = await db.channels.child(channelName).once('value');
    const channel = snapshot.val();
    
    if (!channel) {
        addSystemMessage('❌ Kanal bulunamadı!');
        return;
    }
    
    // Süper gizli kontrol
    if (channel.isSuperHidden && currentUser.role !== 'owner') {
        addSystemMessage('❌ Bu kanala erişim yetkiniz yok!');
        return;
    }
    
    // Admin kanalı kontrol
    if (channelName === 'admin' && currentUser.role !== 'owner' && currentUser.role !== 'admin') {
        addSystemMessage('❌ Admin kanalına erişim yetkiniz yok!');
        return;
    }
    
    // Eski kanaldan ayrıl
    await removeFromChannel(currentChannel);
    
    // Yeni kanala katıl
    currentChannel = channelName;
    await addToChannel(channelName);
    await db.users.child(currentUser.id).update({ currentChannel: channelName });
    
    // UI'ı güncelle
    document.getElementById('currentChannelName').textContent = channelName;
    document.getElementById('channelUserCount').textContent = channel.onlineCount || 1;
    document.getElementById('channelSubscribers').textContent = formatNumber(channel.subscribers || 1);
    
    // Abone butonunu güncelle
    updateSubscribeButton();
    
    // YouTube'u güncelle
    updateYoutubeInfo(channel);
    
    // Mesaj dinleyicisini başlat
    startMessageListener();
    
    addSystemMessage(`📢 #${channelName} kanalına katıldın!`);
}

// ========== ABONE BUTONU ==========
function updateSubscribeButton() {
    const btn = document.getElementById('subscribeChannelBtn');
    if (!btn) return;
    
    if (currentUser.subscribedChannels && currentUser.subscribedChannels.includes(currentChannel)) {
        btn.innerHTML = '<i class="fas fa-check"></i> Abone Olundu';
        btn.classList.add('subscribed');
    } else {
        btn.innerHTML = '<i class="fas fa-plus"></i> Abone Ol';
        btn.classList.remove('subscribed');
    }
}

// ========== ABONE OL/ÇIK ==========
async function toggleChannelSubscribe() {
    if (!currentUser.subscribedChannels) {
        currentUser.subscribedChannels = [];
    }
    
    if (currentUser.subscribedChannels.includes(currentChannel)) {
        // Abonelikten çık
        currentUser.subscribedChannels = currentUser.subscribedChannels.filter(ch => ch !== currentChannel);
        
        // Kanal abone sayısını azalt
        const snapshot = await db.channels.child(currentChannel).once('value');
        const channel = snapshot.val();
        if (channel) {
            channel.subscribers = Math.max(1, (channel.subscribers || 1) - 1);
            await db.channels.child(currentChannel).set(channel);
        }
        
        addSystemMessage(`❌ #${currentChannel} abonelikten çıkıldı.`);
    } else {
        // Abone ol
        currentUser.subscribedChannels.push(currentChannel);
        
        // Kanal abone sayısını artır
        const snapshot = await db.channels.child(currentChannel).once('value');
        const channel = snapshot.val();
        if (channel) {
            channel.subscribers = (channel.subscribers || 1) + 1;
            await db.channels.child(currentChannel).set(channel);
        }
        
        addSystemMessage(`✅ #${currentChannel} abone olundu.`);
    }
    
    // Kullanıcıyı güncelle
    await db.users.child(currentUser.id).child('subscribedChannels').set(currentUser.subscribedChannels);
    
    // Butonu güncelle
    updateSubscribeButton();
}

// ========== AVATAR GÜNCELLEME ==========
function updateAvatar() {
    const avatarSpan = document.getElementById('avatarText');
    const avatarImg = document.getElementById('avatarImage');
    
    if (currentUser.avatarData) {
        avatarSpan.style.display = 'none';
        avatarImg.style.display = 'block';
        avatarImg.src = currentUser.avatarData;
    } else {
        avatarSpan.style.display = 'block';
        avatarImg.style.display = 'none';
        avatarSpan.textContent = currentUser.avatar || currentUser.name.charAt(0).toUpperCase();
    }
}

// ========== PROFİL RESMİ YÜKLEME ==========
function openAvatarModal() {
    document.getElementById('avatarFileInput').value = '';
    document.getElementById('avatarPreviewText').style.display = 'block';
    document.getElementById('avatarPreviewImage').style.display = 'none';
    document.getElementById('avatarPreviewText').textContent = currentUser.avatar || currentUser.name.charAt(0).toUpperCase();
    openModal('avatarModal');
}

function previewAvatar(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('avatarPreviewText').style.display = 'none';
            document.getElementById('avatarPreviewImage').style.display = 'block';
            document.getElementById('avatarPreviewImage').src = e.target.result;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

async function uploadAvatar() {
    const fileInput = document.getElementById('avatarFileInput');
    if (!fileInput.files || !fileInput.files[0]) {
        alert('Lütfen bir resim seçin!');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        currentUser.avatarData = e.target.result;
        currentUser.avatar = currentUser.name.charAt(0).toUpperCase();
        
        await db.users.child(currentUser.id).update({
            avatarData: e.target.result,
            avatar: currentUser.name.charAt(0).toUpperCase()
        });
        
        updateAvatar();
        closeModal('avatarModal');
        addSystemMessage('✅ Profil resmi güncellendi.');
    };
    reader.readAsDataURL(fileInput.files[0]);
}
