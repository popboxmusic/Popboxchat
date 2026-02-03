const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// ========== YAPILANDIRMA ==========
const CONFIG = {
    ADMIN_USERNAME: "popbox",
    ADMIN_PASSWORD: "kumsal07",
    MAX_USERS: 500,
    ROOM_NAME: "popbox-live",
    YOUTUBE_VIDEO_ID: "dQw4w9WgXcQ" // Buraya video ID yaz
};

// ========== VERİ YAPILARI ==========
const users = new Map(); // socket.id -> user data
const messages = []; // Son 100 mesaj

// ========== SOCKET.IO ==========
io.on('connection', (socket) => {
    console.log(`🔗 Yeni bağlantı: ${socket.id}`);
    
    // KULLANICI KATILMA
    socket.on('join', (data) => {
        const username = data.username || `Kullanıcı_${socket.id.substring(0, 5)}`;
        
        // Kullanıcıyı kaydet
        users.set(socket.id, {
            id: socket.id,
            username: username,
            role: 'user',
            joinTime: Date.now(),
            isMuted: false
        });
        
        // Hoş geldin mesajı
        socket.emit('system-message', {
            message: `🎉 Popbox Live Chat'e hoş geldin, ${username}!`
        });
        
        // Diğer kullanıcılara bildir
        socket.broadcast.emit('system-message', {
            message: `👤 ${username} sohbete katıldı!`
        });
        
        // Kullanıcı listesini güncelle
        updateUserList();
        
        // Önceki mesajları gönder (son 20 mesaj)
        const recentMessages = messages.slice(-20);
        recentMessages.forEach(msg => {
            socket.emit('chat-message', msg);
        });
        
        console.log(`👤 Kullanıcı katıldı: ${username}`);
    });
    
    // MESAJ GÖNDERME
    socket.on('send-message', (data) => {
        const user = users.get(socket.id);
        
        if (!user) return;
        
        // Mute kontrolü
        if (user.isMuted) {
            socket.emit('system-message', {
                message: '❌ Sessize alındığınız için mesaj gönderemezsiniz!'
            });
            return;
        }
        
        // Flood kontrolü (opsiyonel)
        const now = Date.now();
        if (user.lastMessage && (now - user.lastMessage < 1000)) {
            socket.emit('system-message', {
                message: '⚠️ Çok hızlı mesaj gönderiyorsunuz!'
            });
            return;
        }
        user.lastMessage = now;
        
        // Mesajı hazırla
        const messageData = {
            id: now,
            username: user.username,
            message: data.message,
            role: user.role,
            timestamp: new Date().toISOString(),
            isSystem: false
        };
        
        // Mesaj geçmişine ekle
        messages.push(messageData);
        if (messages.length > 100) {
            messages.shift();
        }
        
        // Herkese gönder
        io.emit('chat-message', messageData);
        
        console.log(`💬 ${user.username}: ${data.message}`);
    });
    
    // ADMIN GİRİŞİ
    socket.on('admin-login', (data) => {
        const user = users.get(socket.id);
        
        if (!user) {
            socket.emit('error', { message: 'Kullanıcı bulunamadı!' });
            return;
        }
        
        // ADMIN KONTROLÜ - GÜVENLİ
        if (data.username === CONFIG.ADMIN_USERNAME && data.password === CONFIG.ADMIN_PASSWORD) {
            // Admin yetkisi ver
            user.role = 'admin';
            
            // Kullanıcıya bildir
            socket.emit('admin-login-success');
            
            // Herkese duyur
            io.emit('system-message', {
                message: `👑 ${user.username} artık Admin oldu!`
            });
            
            // Kullanıcı listesini güncelle
            updateUserList();
            
            console.log(`👑 Admin girişi: ${user.username}`);
        } else {
            socket.emit('admin-login-failed');
            console.log(`❌ Başarısız admin girişi: ${data.username}`);
        }
    });
    
    // ADMIN İŞLEMLERİ
    socket.on('admin-action', (data) => {
        const adminUser = users.get(socket.id);
        
        // YETKİ KONTROLÜ
        if (!adminUser || adminUser.role !== 'admin') {
            socket.emit('error', { message: 'Bu işlem için admin yetkisi gerekiyor!' });
            return;
        }
        
        const targetUsername = data.targetUser;
        const action = data.action;
        
        // Hedef kullanıcıyı bul
        const target = Array.from(users.values()).find(u => u.username === targetUsername);
        
        if (!target) {
            socket.emit('error', { message: 'Kullanıcı bulunamadı!' });
            return;
        }
        
        // İşlemi uygula
        switch(action) {
            case 'coadmin':
                target.role = 'coadmin';
                io.emit('system-message', {
                    message: `⭐ ${target.username} artık Co-Admin oldu!`
                });
                break;
                
            case 'operator':
                target.role = 'operator';
                io.emit('system-message', {
                    message: `🛡️ ${target.username} artık Operator oldu!`
                });
                break;
                
            case 'kick':
                // Kullanıcıyı at
                io.to(target.id).emit('user-kicked');
                users.delete(target.id);
                io.sockets.sockets.get(target.id)?.disconnect();
                io.emit('system-message', {
                    message: `⛔ ${target.username} admin tarafından atıldı!`
                });
                break;
                
            case 'mute':
                target.isMuted = !target.isMuted;
                const status = target.isMuted ? 'sessize alındı' : 'sessizliği kaldırıldı';
                io.emit('system-message', {
                    message: `🔇 ${target.username} ${status}!`
                });
                break;
        }
        
        // Kullanıcı listesini güncelle
        updateUserList();
        
        console.log(`🛠️ Admin işlemi: ${adminUser.username} -> ${target.username} (${action})`);
    });
    
    // KULLANICI LİSTESİ İSTEĞİ
    socket.on('get-users', () => {
        const user = users.get(socket.id);
        
        if (user && user.role === 'admin') {
            const userList = Array.from(users.values()).map(u => ({
                username: u.username,
                role: u.role
            }));
            
            socket.emit('users-for-admin', userList);
        }
    });
    
    // BAĞLANTI KESİLİNCE
    socket.on('disconnect', () => {
        const user = users.get(socket.id);
        
        if (user) {
            users.delete(socket.id);
            
            // Herkese bildir
            io.emit('system-message', {
                message: `👋 ${user.username} ayrıldı.`
            });
            
            // Kullanıcı listesini güncelle
            updateUserList();
            
            console.log(`👋 Kullanıcı ayrıldı: ${user.username}`);
        }
    });
    
    // YARDIMCI FONKSİYON: Kullanıcı listesini güncelle
    function updateUserList() {
        const userList = Array.from(users.values()).map(user => ({
            username: user.username,
            role: user.role
        }));
        
        io.emit('user-list', userList);
    }
});

// ========== HTTP SUNUCU ==========
app.use(express.static('.'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.get('/config', (req, res) => {
    // Güvenlik için şifreyi gizle
    const safeConfig = { ...CONFIG };
    safeConfig.ADMIN_PASSWORD = '***GİZLİ***';
    res.json(safeConfig);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log('========================================');
    console.log('🚀 POPBOX YOUTUBE LIVE CHAT');
    console.log('========================================');
    console.log(`📡 Sunucu: http://localhost:${PORT}`);
    console.log(`🔐 Admin: ${CONFIG.ADMIN_USERNAME}`);
    console.log(`🔑 Şifre: ${CONFIG.ADMIN_PASSWORD}`);
    console.log(`👥 Oda: ${CONFIG.ROOM_NAME}`);
    console.log('========================================');
    console.log('✅ Sistem aktif!');
});
