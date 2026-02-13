// ========== POPBOX ANA SİSTEM ==========
// YouTube, Medya, Sohbet, Kullanıcı, Firebase bağlantıları

// Global değişkenler
let currentUser = null;
let isOwner = false;
let isAdmin = false;
let isCoAdmin = false;
let isOperator = false;

let globalMediaState = {
    activeTab: 'youtube',
    youtubeId: 'jfKfPfyJRdk',
    youtubeTitle: 'Popbox Radio • 24/7 Canlı Müzik',
    spotifyId: '37i9dQZF1DXcBWIGoYBM5M',
    spotifyTitle: 'Popbox Spotify • Günün Hitleri',
    liveActive: false,
    liveTitle: '',
    startedBy: 'MateKy',
    startedByRole: 'owner',
    timestamp: Date.now()
};

// ... TÜM ANA FONKSİYONLAR ...
// (handleLogin, sendMessage, playVideo, playSpotify, startLiveStream, etc.)