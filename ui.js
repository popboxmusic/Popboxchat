// ========== SOL PANEL YÜKLEME ==========
function loadLeftPanel(panelName) {
    if (!currentUser) return;
    
    const panel = document.getElementById('leftPanel');
    
    switch(panelName) {
        case 'subscriptions':
            loadSubscriptionsPanel(panel);
            break;
        case 'channels':
            loadChannelsPanel(panel);
            break;
        case 'chatlist':
            loadChatListPanel(panel);
            break;
        case 'notifications':
            loadNotificationsPanel(panel);
            break;
        case 'profile':
            loadProfilePanel(panel);
            break;
        case 'createchannel':
            loadCreateChannelPanel(panel);
            break;
        case 'support':
            loadSupportPanel(panel);
            break;
        default:
            loadSubscriptionsPanel(panel);
    }
    
    setActiveIcon(panelName);
}

function closeLeftPanel() {
    loadLeftPanel('subscriptions');
}

// ========== ABONELİKLER PANELİ ==========
function loadSubscriptionsPanel(panel) {
    let html = `
        <div class="panel-header">
            <h3><i class="fas fa-bell" style="color:#ffd700;"></i> Abonelikler</h3>
            <span class="subscription-count">${currentUser.subscribedChannels?.length || 0}</span>
            <div class="panel-close" onclick="closeLeftPanel()"><i class="fas fa-times"></i></div>
        </div>
        <div class="panel-content">
            <div class="search-container">
                <i class="fas fa-search"></i>
                <input type="text" class="search-input" placeholder="Kanal ara..." id="subscriptionSearch">
            </div>
    `;
    
    if (!currentUser.subscribedChannels || currentUser.subscribedChannels.length === 0) {
        html += '<div style="color:#aaa; padding:16px; text-align:center;">Abone olunan kanal yok.</div>';
    } else {
        currentUser.subscribedChannels.forEach(ch => {
            db.channels.child(ch).once('value', (snapshot) => {
                const c = snapshot.val();
                if (c) {
                    const channelHtml = `
                        <div class="subscription-item ${ch === currentChannel ? 'active' : ''}" 
                             onclick="joinChannel('${ch}')">
                            <div class="subscription-avatar"><i class="fas fa-hashtag"></i></div>
                            <div class="subscription-info">
                                <div class="subscription-name">
                                    ${ch}
                                    ${c.isHidden ? '<span class="badge badge-hidden">GİZLİ</span>' : ''}
                                    ${c.isSuperHidden ? '<span class="badge badge-super-hidden">SÜPER</span>' : ''}
                                </div>
                                <div class="subscription-meta">
                                    <span>${c.owner}</span>
                                    <span>• ${formatNumber(c.subscribers || 1)} abone</span>
                                </div>
                            </div>
                            <div class="subscription-stats">${c.onlineCount || 0}</div>
                        </div>
                    `;
                    document.querySelector('#leftPanel .panel-content').innerHTML += channelHtml;
                }
            });
        });
    }
    
    html += `
        </div>
        <div class="popular-channels">
            <div class="popular-header">
                <i class="fas fa-fire" style="color:#ff4444;"></i> Popüler Kanallar
            </div>
            <div id="popularChannelsList"></div>
        </div>
    `;
    
    panel.innerHTML = html;
    updatePopularChannels();
}

// ========== KANALLAR PANELİ ==========
function loadChannelsPanel(panel) {
    let html = `
        <div class="panel-header">
            <h3><i class="fas fa-list-ul" style="color:#ff0000;"></i> Tüm Kanallar</h3>
            <span class="subscription-count">0</span>
            <div class="panel-close" onclick="closeLeftPanel()"><i class="fas fa-times"></i></div>
        </div>
        <div class="panel-content">
            <div class="search-container">
                <i class="fas fa-search"></i>
                <input type="text" class="search-input" placeholder="Kanal ara..." id="channelSearch">
            </div>
            <div id="channelsList"></div>
        </div>
    `;
    
    panel.innerHTML = html;
    
    db.channels.once('value', (snapshot) => {
        const channels = snapshot.val() || {};
        document.querySelector('#leftPanel .subscription-count').textContent = Object.keys(channels).length;
        
        let channelsHtml = '';
        const channelsArray = Object.values(channels)
            .filter(ch => {
                if (ch.isSuperHidden && currentUser.role !== 'owner') return false;
                if (ch.name === 'admin' && currentUser.role !== 'owner' && currentUser.role !== 'admin') return false;
                return true;
            })
            .sort((a, b) => (b.subscribers || 0) - (a.subscribers || 0));
        
        channelsArray.forEach(ch => {
            const isSubscribed = currentUser.subscribedChannels?.includes(ch.name);
            const subCount = formatNumber(ch.subscribers || 1);
            
            channelsHtml += `
                <div class="channel-item" onclick="joinChannel('${ch.name}')">
                    <div class="channel-avatar"><i class="fas fa-hashtag"></i></div>
                    <div class="channel-info">
                        <div class="channel-name">
                            ${ch.name}
                            ${ch.isHidden ? '<span class="badge badge-hidden">GİZLİ</span>' : ''}
                            ${ch.isSuperHidden ? '<span class="badge badge-super-hidden">SÜPER</span>' : ''}
                        </div>
                        <div class="channel-meta">
                            <span>${ch.owner}</span>
                            <span>• ${subCount} abone</span>
                            <span>• ${ch.onlineCount || 0} çevrimiçi</span>
                        </div>
                    </div>
                    <button class="subscribe-btn ${isSubscribed ? 'subscribed' : ''}" 
                            onclick="event.stopPropagation(); ${isSubscribed ? 'unsubscribeChannel' : 'subscribeChannel'}('${ch.name}')">
                        <i class="fas ${isSubscribed ? 'fa-check' : 'fa-plus'}"></i>
                        ${isSubscribed ? 'Abone' : 'Abone Ol'}
                    </button>
                </div>
            `;
        });
        
        document.getElementById('channelsList').innerHTML = channelsHtml;
    });
}

// ========== SOHBETLERİM PANELİ ==========
function loadChatListPanel(panel) {
    let html = `
        <div class="panel-header">
            <h3><i class="fas fa-comment" style="color:#7289da;"></i> Sohbetlerim</h3>
            <span class="subscription-count" id="chatListCount">0</span>
            <div class="panel-close" onclick="closeLeftPanel()"><i class="fas fa-times"></i></div>
        </div>
        <div class="panel-tabs">
            <div id="tabChats" class="panel-tab active" onclick="switchChatTab('chats')">Sohbetler</div>
            <div id="tabOnline" class="panel-tab" onclick="switchChatTab('online')">Çevrimiçi</div>
        </div>
        <div class="panel-content" id="chatPanelContent"></div>
    `;
    
    panel.innerHTML = html;
    showChatsTab();
}

function switchChatTab(tab) {
    document.getElementById('tabChats').classList.toggle('active', tab === 'chats');
    document.getElementById('tabOnline').classList.toggle('active', tab === 'online');
    
    if (tab === 'chats') {
        showChatsTab();
    } else {
        showOnlineTab();
    }
}

function showChatsTab() {
    const container = document.getElementById('chatPanelContent');
    container.innerHTML = '<div style="color:#aaa; padding:16px; text-align:center;">Yükleniyor...</div>';
    
    db.privateChats.once('value', (snapshot) => {
        const chats = snapshot.val() || {};
        let chatList = [];
        let totalUnread = 0;
        
        for (let chatId in chats) {
            if (chatId.includes(currentUser.id)) {
                const ids = chatId.replace('chat_', '').split('_');
                const otherId = ids[0] === currentUser.id ? ids[1] : ids[0];
                
                db.users.child(otherId).once('value', (userSnap) => {
                    const user = userSnap.val();
                    if (user) {
                        const messages = Object.values(chats[chatId] || {});
                        const lastMsg = messages[messages.length - 1];
                        const unread = messages.filter(m => m.senderId !== currentUser.id && !m.read).length;
                        totalUnread += unread;
                        
                        chatList.push({
                            name: user.name,
                            lastMsg: lastMsg ? (lastMsg.type === 'text' ? lastMsg.content : '📎 medya') : '...',
                            time: lastMsg ? formatTime(lastMsg.timestamp) : '',
                            unread: unread
                        });
                        
                        // Sırala ve göster
                        chatList.sort((a, b) => new Date(b.time) - new Date(a.time));
                        
                        let html = '';
                        if (chatList.length === 0) {
                            html = '<div style="color:#aaa; padding:16px; text-align:center;">Henüz özel sohbet yok.</div>';
                        } else {
                            chatList.forEach(chat => {
                                html += `
                                    <div class="chat-item" onclick="openPrivateChat('${chat.name}')">
                                        <div class="chat-avatar"><span>${chat.name.charAt(0)}</span></div>
                                        <div class="chat-info">
                                            <div class="chat-name">
                                                ${chat.name}
                                                ${chat.unread > 0 ? '<span class="subscription-notification"></span>' : ''}
                                            </div>
                                            <div class="chat-meta">
                                                <span>${escapeHTML(chat.lastMsg)}</span>
                                                <span>• ${chat.time}</span>
                                            </div>
                                        </div>
                                        ${chat.unread > 0 ? `<div class="subscription-stats" style="color:#ff4444;">${chat.unread}</div>` : ''}
                                    </div>
                                `;
                            });
                        }
                        
                        container.innerHTML = html;
                        document.getElementById('chatListCount').textContent = totalUnread;
                    }
                });
            }
        }
        
        if (chatList.length === 0) {
            container.innerHTML = '<div style="color:#aaa; padding:16px; text-align:center;">Henüz özel sohbet yok.</div>';
        }
    });
}

function showOnlineTab() {
    const container = document.getElementById('chatPanelContent');
    
    db.channels.child(currentChannel).once('value', (snapshot) => {
        const channel = snapshot.val();
        const onlineUsers = channel?.onlineUsers ? Object.values(channel.onlineUsers) : [];
        
        if (onlineUsers.length === 0) {
            container.innerHTML = '<div style="color:#aaa; padding:16px; text-align:center;">Çevrimiçi kullanıcı yok.</div>';
            return;
        }
        
        let html = '';
        onlineUsers.forEach(user => {
            html += `
                <div class="online-item" onclick="openPrivateChat('${user.name}')">
                    <div class="online-avatar"><span>${user.name.charAt(0)}</span></div>
                    <div class="online-info">
                        <div class="online-name">${user.name}</div>
                        <div class="online-meta"><span>#${currentChannel}</span></div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    });
}

// ========== BİLDİRİMLER PANELİ ==========
function loadNotificationsPanel(panel) {
    let html = `
        <div class="panel-header">
            <h3><i class="fas fa-bell" style="color:#ff4444;"></i> Bildirimler</h3>
            <span class="subscription-count">0</span>
            <div class="panel-close" onclick="closeLeftPanel()"><i class="fas fa-times"></i></div>
        </div>
        <div class="panel-content">
            <div style="color:#aaa; padding:16px; text-align:center;">Henüz bildirim yok.</div>
        </div>
    `;
    
    panel.innerHTML = html;
}

// ========== POPÜLER KANALLAR ==========
function updatePopularChannels() {
    const container = document.getElementById('popularChannelsList');
    if (!container) return;
    
    db.channels.once('value', (snapshot) => {
        const channels = snapshot.val() || {};
        
        const popular = Object.values(channels)
            .filter(ch => {
                if (ch.isSuperHidden && currentUser.role !== 'owner') return false;
                return !ch.isHidden || currentUser.role === 'owner' || currentUser.role === 'admin';
            })
            .sort((a, b) => (b.subscribers || 0) - (a.subscribers || 0))
            .slice(0, 5);
        
        let html = '';
        popular.forEach(ch => {
            const isSubscribed = currentUser.subscribedChannels?.includes(ch.name);
            html += `
                <div class="popular-item" onclick="joinChannel('${ch.name}')">
                    <div class="popular-info">
                        <div class="popular-name">#${ch.name}</div>
                        <div class="popular-subscribers">${formatNumber(ch.subscribers || 1)} abone</div>
                    </div>
                    <button class="subscribe-btn ${isSubscribed ? 'subscribed' : ''}" 
                            onclick="event.stopPropagation(); ${isSubscribed ? 'unsubscribeChannel' : 'subscribeChannel'}('${ch.name}')">
                        <i class="fas ${isSubscribed ? 'fa-check' : 'fa-plus'}"></i>
                        ${isSubscribed ? 'Abone' : 'Abone Ol'}
                    </button>
                </div>
            `;
        });
        
        container.innerHTML = html;
    });
}

// ========== İKON AKTİF ==========
function setActiveIcon(active) {
    document.querySelectorAll('.icon-item').forEach(el => el.classList.remove('active'));
    
    if (active === 'subscriptions') {
        document.querySelector('.icon-item[onclick="openSubscriptions()"]')?.classList.add('active');
    } else if (active === 'channels') {
        document.querySelector('.icon-item[onclick="openChannelPanel()"]')?.classList.add('active');
    } else if (active === 'chatlist') {
        document.querySelector('.icon-item[onclick="openChatListPanel()"]')?.classList.add('active');
    } else if (active === 'notifications') {
        document.querySelector('.icon-item[onclick="openNotificationPanel()"]')?.classList.add('active');
    } else if (active === 'profile') {
        document.querySelector('.profile-avatar')?.classList.add('active');
    }
}
