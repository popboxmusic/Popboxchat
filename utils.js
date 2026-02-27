// ========== YARDIMCI FONKSİYONLAR ==========
function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

function normalizeNick(nick) {
    return nick ? nick.toLowerCase().trim() : '';
}

function generateChatId(user1, user2) {
    const users = [user1, user2].sort();
    return `chat_${users[0]}_${users[1]}`;
}

function extractYoutubeId(url) {
    if (!url) return null;
    if (url.includes('youtube.com/watch?v=')) {
        const match = url.split('v=')[1];
        return match ? match.split('&')[0] : null;
    }
    if (url.includes('youtu.be/')) {
        const match = url.split('youtu.be/')[1];
        return match ? match.split('?')[0] : null;
    }
    if (url.match(/^[a-zA-Z0-9_-]{11}$/)) return url;
    return null;
}

function autoResize(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 80) + 'px';
}

// ========== MODAL/PANEL FONKSİYONLARI ==========
function openPanel(panelId) {
    document.getElementById(panelId).classList.add('active');
}

function closePanel(panelId) {
    document.getElementById(panelId).classList.remove('active');
}

function closeAllPanels() {
    closePanel('channelsPanel');
    closePanel('privateListPanel');
    closePanel('settingsPanel');
    closePanel('playlistPanel');
    closePrivateChat();
}

// ========== ESC İLE KAPAT ==========
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllPanels();
    
    if (e.key === 'Enter' && !e.shiftKey) {
        if (document.activeElement?.id === 'messageInput') {
            e.preventDefault();
            sendMessage();
        } else if (document.activeElement?.id === 'privateInput') {
            e.preventDefault();
            sendPrivate();
        }
    }
});
