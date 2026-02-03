const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*", // Tüm origin'lere izin ver
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.static('.')); // Dosyaları sun

const rooms = new Map();
const users = new Map();

const ROLES = {
    OWNER: { level: 100, name: 'Kurucu', symbol: '~' },
    ADMIN: { level: 80, name: 'Admin', symbol: '&' },
    MOD: { level: 60, name: 'Mod', symbol: '@' },
    HALFOP: { level: 40, name: 'Yardımcı', symbol: '%' },
    VOICE: { level: 20, name: 'Sesli', symbol: '+' },
    USER: { level: 0, name: 'Kullanıcı', symbol: '' }
};

io.on('connection', (socket) => {
    console.log('✅ Yeni bağlantı:', socket.id);
    
    let currentUser = {
        id: socket.id,
        nickname: `Kullanıcı${Math.floor(Math.random() * 1000)}`,
        role: ROLES.USER,
        room: 'main'
    };
    
    users.set(socket.id, currentUser);
    
    // Oda yoksa oluştur
    if (!rooms.has('main')) {
        rooms.set('main', {
            users: new Map(),
            messages: []
        });
    }
    
    const room = rooms.get('main');
    
    socket.emit('welcome', {
        message: 'YouTube Live Chat\'e hoş geldin!',
        yourNick: currentUser.nickname
    });
    
    // ODAYA KATIL
    socket.on('join', (data) => {
        const { nickname } = data;
        
        if (nickname && nickname.trim()) {
            currentUser.nickname = nickname.trim();
            users.set(socket.id, currentUser);
        }
        
        // Odaya ekle
        room.users.set(socket.id, {
            id: socket.id,
            nickname: currentUser.nickname,
            role: currentUser.role
        });
        
        // İlk kullanıcıya admin yetkisi ver
        if (room.users.size === 1) {
            currentUser.role = ROLES.ADMIN;
            room.users.get(socket.id).role = ROLES.ADMIN;
        }
        
        socket.join('main');
        
        // Kullanıcı listesini güncelle
        updateUserList();
        
        // Sisteme mesaj ekle
        io.to('main').emit('system-message', {
            message: `${currentUser.nickname} sohbete katıldı!`
        });
        
        console.log(`👤 ${currentUser.nickname} katıldı`);
    });
    
    // MESAJ AL
    socket.on('message', (data) => {
        const { message } = data;
        
        if (!message || !message.trim()) return;
        
        const chatMessage = {
            user: currentUser.nickname,
            message: message.trim(),
            role: currentUser.role,
            time: new Date().toISOString()
        };
        
        // Mesaj geçmişine ekle (max 100)
        room.messages.push(chatMessage);
        if (room.messages.length > 100) {
            room.messages.shift();
        }
        
        // Herkese gönder
        io.to('main').emit('message', chatMessage);
        
        // Konsola log
        console.log(`💬 ${currentUser.nickname}: ${message}`);
    });
    
    // RESİM MESAJI
    socket.on('image-message', (data) => {
        const { image, filename } = data;
        
        if (!image) return;
        
        // Base64 kontrolü
        if (typeof image === 'string' && image.startsWith('data:image')) {
            const imageMessage = {
                user: currentUser.nickname,
                message: `📷 Resim gönderdi: ${filename || 'image'}`,
                image: image,
                role: currentUser.role,
                time: new Date().toISOString()
            };
            
            io.to('main').emit('message', imageMessage);
            console.log(`📷 ${currentUser.nickname} resim gönderdi`);
        }
    });
    
    // KOMUT İŞLE
    socket.on('command', (data) => {
        const { command, args } = data;
        
        switch(command.toLowerCase()) {
            case 'nick':
                if (!args || !args[0]) {
                    socket.emit('system-message', { message: 'Kullanım: /nick [yeni_nick]' });
                    return;
                }
                
                const newNick = args[0].trim();
                const oldNick = currentUser.nickname;
                
                // Nick değiştir
                currentUser.nickname = newNick;
                users.set(socket.id, currentUser);
                
                if (room.users.has(socket.id)) {
                    room.users.get(socket.id).nickname = newNick;
                }
                
                // Herkese duyur
                io.to('main').emit('system-message', {
                    message: `${oldNick} artık ${newNick} olarak biliniyor.`
                });
                
                updateUserList();
                break;
                
            case 'msg':
                if (!args || args.length < 2) {
                    socket.emit('system-message', { message: 'Kullanım: /msg [kullanıcı] [mesaj]' });
                    return;
                }
                
                const targetUser = args[0];
                const privateMsg = args.slice(1).join(' ');
                
                // Kullanıcıyı bul
                const target = Array.from(room.users.values())
                    .find(u => u.nickname === targetUser);
                
                if (target) {
                    // Gönderene
                    socket.emit('private-message', {
                        from: currentUser.nickname,
                        message: privateMsg,
                        to: targetUser
                    });
                    
                    // Alıcıya
                    io.to(target.id).emit('private-message', {
                        from: currentUser.nickname,
                        message: privateMsg,
                        to: targetUser
                    });
                } else {
                    socket.emit('system-message', { message: `Kullanıcı bulunamadı: ${targetUser}` });
                }
                break;
                
            case 'me':
                if (!args || args.length === 0) {
                    socket.emit('system-message', { message: 'Kullanım: /me [aksiyon]' });
                    return;
                }
                
                const action = args.join(' ');
                io.to('main').emit('message', {
                    user: '•',
                    message: `${currentUser.nickname} ${action}`,
                    role: currentUser.role
                });
                break;
                
            case 'op':
                if (currentUser.role.level < ROLES.ADMIN.level) {
                    socket.emit('system-message', { message: 'Bu komut için yetkiniz yok!' });
                    return;
                }
                
                if (!args || args.length < 2) {
                    socket.emit('system-message', { message: 'Kullanım: /op [kullanıcı] [admin/mod/voice]' });
                    return;
                }
                
                const opUser = args[0];
                const roleType = args[1].toUpperCase();
                
                if (!ROLES[roleType]) {
                    socket.emit('system-message', { message: 'Geçersiz rol!' });
                    return;
                }
                
                const userToOp = Array.from(room.users.values())
                    .find(u => u.nickname === opUser);
                
                if (userToOp) {
                    userToOp.role = ROLES[roleType];
                    
                    // Tüm kullanıcıları güncelle
                    updateUserList();
                    
                    io.to('main').emit('system-message', {
                        message: `${opUser} artık ${ROLES[roleType].name} oldu.`
                    });
                }
                break;
                
            default:
                socket.emit('system-message', { message: `Bilinmeyen komut: ${command}` });
        }
    });
    
    // BAĞLANTI KESİLİNCE
    socket.on('disconnect', () => {
        console.log('❌ Bağlantı kesildi:', currentUser.nickname);
        
        // Odadan çıkar
        if (room.users.has(socket.id)) {
            room.users.delete(socket.id);
            
            // Kullanıcı listesini güncelle
            updateUserList();
            
            // Sisteme mesaj ekle
            io.to('main').emit('system-message', {
                message: `${currentUser.nickname} ayrıldı.`
            });
        }
        
        users.delete(socket.id);
    });
    
    // YARDIMCI FONKSİYON
    function updateUserList() {
        const userList = Array.from(room.users.values()).map(user => ({
            nickname: user.nickname,
            role: user.role.name.toLowerCase()
        }));
        
        io.to('main').emit('user-list', userList);
    }
    
    // İlk bağlanınca kullanıcı listesini gönder
    updateUserList();
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server: http://localhost:${PORT}`);
    console.log(`📡 YouTube Live + IRC Chat aktif!`);
});
