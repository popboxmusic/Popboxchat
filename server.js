const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "http://localhost:5500", // HTML dosyanın olduğu adres
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Middleware
app.use(cors());
app.use(express.static('public')); // HTML dosyaları için

// Veri yapıları
const rooms = new Map();
const users = new Map(); // socket.id -> user info

// Default oda
const defaultRoom = 'main';

// Oda verisi yapısı
const initializeRoom = () => ({
    users: new Map(), // socket.id -> {id, nickname, role, joinTime}
    messages: [], // Son 100 mesaj
    settings: {
        name: '#canli-yayin',
        topic: 'YouTube canlı yayın sohbeti',
        maxUsers: 1000,
        allowImages: true,
        requireAuth: false
    }
});

// YouTube stream bilgisi
let streamInfo = {
    isLive: false,
    title: 'YouTube Canlı Yayın',
    viewers: 0,
    status: 'waiting'
};

// IRC tarzı yetki sistemi
const ROLES = {
    OWNER: { symbol: '~', level: 100, name: 'Kurucu' },
    ADMIN: { symbol: '&', level: 80, name: 'Admin' },
    MOD: { symbol: '@', level: 60, name: 'Moderatör' },
    HALFOP: { symbol: '%', level: 40, name: 'Yardımcı' },
    VOICE: { symbol: '+', level: 20, name: 'Sesli' },
    USER: { symbol: '', level: 0, name: 'Kullanıcı' }
};

// Socket.io bağlantıları
io.on('connection', (socket) => {
    console.log('✅ Yeni bağlantı:', socket.id);
    
    let currentUser = {
        id: socket.id,
        nickname: `Kullanıcı${Math.floor(Math.random() * 1000)}`,
        role: ROLES.USER,
        room: defaultRoom,
        joinTime: new Date()
    };
    
    // Kullanıcıyı kaydet
    users.set(socket.id, currentUser);
    
    // İlk mesajlar
    socket.emit('welcome', {
        message: 'Sohbete hoş geldiniz!',
        serverInfo: {
            name: 'YouTube Live Chat',
            version: '1.0.0',
            uptime: Date.now()
        },
        commands: ['/nick', '/msg', '/me', '/help', '/join', '/part']
    });
    
    // 1. ODAYA KATILMA
    socket.on('join', (data) => {
        const { nickname = currentUser.nickname, room = defaultRoom } = data;
        
        // Eski odadan çıkar
        if (currentUser.room) {
            socket.leave(currentUser.room);
            leaveRoom(socket.id, currentUser.room);
        }
        
        // Oda yoksa oluştur
        if (!rooms.has(room)) {
            rooms.set(room, initializeRoom());
            rooms.get(room).settings.name = room;
        }
        
        const roomData = rooms.get(room);
        
        // Nickname kontrolü (aynı odada benzersiz olmalı)
        let finalNickname = nickname;
        let counter = 1;
        while (Array.from(roomData.users.values()).some(u => u.nickname === finalNickname)) {
            finalNickname = `${nickname}${counter}`;
            counter++;
        }
        
        // Kullanıcı bilgilerini güncelle
        currentUser.nickname = finalNickname;
        currentUser.room = room;
        currentUser.role = roomData.users.size === 0 ? ROLES.OWNER : ROLES.USER;
        
        users.set(socket.id, currentUser);
        
        // Odaya ekle
        roomData.users.set(socket.id, {
            id: socket.id,
            nickname: finalNickname,
            role: currentUser.role,
            joinTime: new Date()
        });
        
        // Yeni odaya katıl
        socket.join(room);
        
        // Kullanıcıya oda bilgilerini gönder
        socket.emit('joined', {
            room: room,
            nickname: finalNickname,
            role: currentUser.role,
            roomUsers: Array.from(roomData.users.values()),
            roomSettings: roomData.settings,
            streamInfo: streamInfo,
            recentMessages: roomData.messages.slice(-50) // Son 50 mesaj
        });
        
        // Diğer kullanıcılara duyur
        socket.to(room).emit('user-joined', {
            user: {
                id: socket.id,
                nickname: finalNickname,
                role: currentUser.role
            },
            roomUsers: Array.from(roomData.users.values())
        });
        
        // Genel duyuru (sistem mesajı)
        io.to(room).emit('system-message', {
            type: 'join',
            message: `${finalNickname} odaya katıldı.`,
            timestamp: new Date()
        });
        
        console.log(`👤 ${finalNickname} ${room} odasına katıldı`);
    });
    
    // 2. MESAJ GÖNDERME
    socket.on('message', (data) => {
        const { message, image, isPrivate = false, to = null } = data;
        
        if (!currentUser.room || !rooms.has(currentUser.room)) {
            socket.emit('error', { message: 'Oda bulunamadı!' });
            return;
        }
        
        const roomData = rooms.get(currentUser.room);
        
        // Mesaj boş mu kontrol et
        if (!message && !image) return;
        
        // Flood kontrolü (opsiyonel)
        // if (isFlooding(socket.id)) {
        //     socket.emit('error', { message: 'Çok hızlı mesaj gönderiyorsunuz!' });
        //     return;
        // }
        
        if (isPrivate && to) {
            // ÖZEL MESAJ
            const targetUser = Array.from(roomData.users.values())
                .find(u => u.nickname === to);
            
            if (!targetUser) {
                socket.emit('error', { message: `Kullanıcı bulunamadı: ${to}` });
                return;
            }
            
            const privateMessage = {
                id: generateMessageId(),
                from: currentUser.nickname,
                to: to,
                message: message,
                image: image,
                timestamp: new Date(),
                type: 'private'
            };
            
            // Gönderen ve alıcıya gönder
            socket.emit('private-message-sent', privateMessage);
            io.to(targetUser.id).emit('private-message-received', privateMessage);
            
            // Özel mesajları logla (opsiyonel)
            console.log(`📩 ${currentUser.nickname} -> ${to}: ${message}`);
            
        } else {
            // ODA MESAJI
            const chatMessage = {
                id: generateMessageId(),
                user: {
                    nickname: currentUser.nickname,
                    role: currentUser.role,
                    id: socket.id
                },
                message: message,
                image: image,
                timestamp: new Date(),
                type: 'message'
            };
            
            // Mesajı oda geçmişine ekle (max 100 mesaj)
            roomData.messages.push(chatMessage);
            if (roomData.messages.length > 100) {
                roomData.messages = roomData.messages.slice(-100);
            }
            
            // Odaya gönder
            io.to(currentUser.room).emit('message', chatMessage);
            
            // Konsola logla
            console.log(`💬 ${currentUser.room} - ${currentUser.nickname}: ${message}`);
        }
    });
    
    // 3. RESİM MESAJI (Base64)
    socket.on('image-message', (data) => {
        const { image, filename } = data;
        
        if (!image || !image.startsWith('data:image')) {
            socket.emit('error', { message: 'Geçersiz resim formatı!' });
            return;
        }
        
        // Boyut kontrolü (max 5MB)
        const base64Size = (image.length * 3) / 4 - (image.endsWith('==') ? 2 : image.endsWith('=') ? 1 : 0);
        if (base64Size > 5 * 1024 * 1024) {
            socket.emit('error', { message: 'Resim çok büyük! Maksimum 5MB.' });
            return;
        }
        
        // Mesaj olarak işle
        socket.emit('message', {
            room: currentUser.room,
            message: `Resim gönderdi: ${filename || 'image.png'}`,
            image: image,
            isPrivate: false
        });
    });
    
    // 4. KOMUT İŞLEME
    socket.on('command', (data) => {
        const { command, args } = data;
        const roomData = rooms.get(currentUser.room);
        
        switch(command.toLowerCase()) {
            case 'nick':
                if (!args[0]) {
                    socket.emit('error', { message: 'Kullanım: /nick [yeni_nick]' });
                    return;
                }
                
                const newNick = args[0];
                const oldNick = currentUser.nickname;
                
                // Nickname değiştir
                currentUser.nickname = newNick;
                users.set(socket.id, currentUser);
                
                if (roomData) {
                    const userInRoom = roomData.users.get(socket.id);
                    if (userInRoom) {
                        userInRoom.nickname = newNick;
                    }
                }
                
                // Kullanıcıya bildir
                socket.emit('nick-change', {
                    oldNick: oldNick,
                    newNick: newNick
                });
                
                // Odaya duyur
                io.to(currentUser.room).emit('user-updated', {
                    id: socket.id,
                    oldNick: oldNick,
                    newNick: newNick,
                    role: currentUser.role
                });
                
                // Sistem mesajı
                io.to(currentUser.room).emit('system-message', {
                    type: 'nick',
                    message: `${oldNick} artık ${newNick} olarak biliniyor.`,
                    timestamp: new Date()
                });
                break;
                
            case 'msg':
                if (args.length < 2) {
                    socket.emit('error', { message: 'Kullanım: /msg [kullanıcı] [mesaj]' });
                    return;
                }
                
                const targetUser = args[0];
                const privateMsg = args.slice(1).join(' ');
                
                socket.emit('message', {
                    message: privateMsg,
                    isPrivate: true,
                    to: targetUser
                });
                break;
                
            case 'me':
                const action = args.join(' ');
                io.to(currentUser.room).emit('action', {
                    user: currentUser.nickname,
                    action: action,
                    timestamp: new Date()
                });
                break;
                
            case 'kick':
                if (currentUser.role.level < ROLES.MOD.level) {
                    socket.emit('error', { message: 'Bu komut için yetkiniz yok!' });
                    return;
                }
                
                if (!args[0]) {
                    socket.emit('error', { message: 'Kullanım: /kick [kullanıcı] (sebep)' });
                    return;
                }
                
                const kickUser = args[0];
                const reason = args.slice(1).join(' ') || 'Sebep belirtilmedi';
                
                // Kullanıcıyı bul ve at
                const userToKick = Array.from(roomData.users.values())
                    .find(u => u.nickname === kickUser);
                
                if (userToKick) {
                    io.to(userToKick.id).emit('kicked', {
                        by: currentUser.nickname,
                        reason: reason,
                        room: currentUser.room
                    });
                    
                    // Odadan çıkar
                    leaveRoom(userToKick.id, currentUser.room);
                    io.sockets.sockets.get(userToKick.id)?.leave(currentUser.room);
                    
                    // Odaya duyur
                    io.to(currentUser.room).emit('system-message', {
                        type: 'kick',
                        message: `${kickUser} ${currentUser.nickname} tarafından atıldı. Sebep: ${reason}`,
                        timestamp: new Date()
                    });
                }
                break;
                
            case 'op':
                if (currentUser.role.level < ROLES.ADMIN.level) {
                    socket.emit('error', { message: 'Bu komut için yetkiniz yok!' });
                    return;
                }
                
                if (args.length < 2) {
                    socket.emit('error', { message: 'Kullanım: /op [kullanıcı] [rol] (owner|admin|mod|halfop|voice)' });
                    return;
                }
                
                const opUser = args[0];
                const roleType = args[1].toUpperCase();
                
                if (!ROLES[roleType]) {
                    socket.emit('error', { message: 'Geçersiz rol! owner|admin|mod|halfop|voice' });
                    return;
                }
                
                const userToOp = Array.from(roomData.users.values())
                    .find(u => u.nickname === opUser);
                
                if (userToOp) {
                    userToOp.role = ROLES[roleType];
                    
                    // Tüm kullanıcıları güncelle
                    io.to(currentUser.room).emit('user-updated', {
                        id: userToOp.id,
                        nickname: userToOp.nickname,
                        role: userToOp.role
                    });
                    
                    // Sistem mesajı
                    io.to(currentUser.room).emit('system-message', {
                        type: 'op',
                        message: `${opUser} artık ${ROLES[roleType].name} (${ROLES[roleType].symbol})`,
                        timestamp: new Date()
                    });
                }
                break;
                
            case 'help':
                socket.emit('system-message', {
                    type: 'help',
                    message: 'Komutlar: /nick, /msg, /me, /kick, /op, /ban, /topic, /help',
                    timestamp: new Date()
                });
                break;
                
            default:
                socket.emit('error', { message: `Bilinmeyen komut: ${command}` });
        }
    });
    
    // 5. YOUTUBE STREAM DURUMU
    socket.on('stream-status', (data) => {
        streamInfo = { ...streamInfo, ...data };
        
        // Tüm odalara yayın durumunu ilet
        io.emit('stream-update', streamInfo);
        console.log(`📡 Stream durumu güncellendi: ${data.status || data.title}`);
    });
    
    // 6. TYPING DURUMU
    socket.on('typing', (isTyping) => {
        socket.to(currentUser.room).emit('user-typing', {
            user: currentUser.nickname,
            isTyping: isTyping
        });
    });
    
    // 7. ODA BİLGİSİ İSTEĞİ
    socket.on('room-info', () => {
        if (currentUser.room && rooms.has(currentUser.room)) {
            const roomData = rooms.get(currentUser.room);
            socket.emit('room-info', {
                ...roomData.settings,
                userCount: roomData.users.size,
                messagesCount: roomData.messages.length
            });
        }
    });
    
    // 8. BAĞLANTI KESİLİNCE
    socket.on('disconnect', () => {
        console.log('❌ Bağlantı kesildi:', socket.id, currentUser.nickname);
        
        // Tüm odalardan çıkar
        if (currentUser.room && rooms.has(currentUser.room)) {
            leaveRoom(socket.id, currentUser.room);
            
            // Odaya duyur
            io.to(currentUser.room).emit('user-left', {
                user: {
                    id: socket.id,
                    nickname: currentUser.nickname
                },
                roomUsers: Array.from(rooms.get(currentUser.room).users.values())
            });
            
            // Sistem mesajı
            io.to(currentUser.room).emit('system-message', {
                type: 'leave',
                message: `${currentUser.nickname} ayrıldı.`,
                timestamp: new Date()
            });
        }
        
        // Kullanıcıyı temizle
        users.delete(socket.id);
    });
    
    // 9. PING/PONG
    socket.on('ping', () => {
        socket.emit('pong', { timestamp: Date.now() });
    });
});

// YARDIMCI FONKSİYONLAR

function leaveRoom(socketId, room) {
    if (rooms.has(room)) {
        const roomData = rooms.get(room);
        roomData.users.delete(socketId);
        
        // Oda boşsa temizle (opsiyonel)
        if (roomData.users.size === 0 && room !== defaultRoom) {
            rooms.delete(room);
        }
    }
}

function generateMessageId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function isFlooding(socketId) {
    // Basit flood kontrolü (geliştirilebilir)
    const user = users.get(socketId);
    if (!user.lastMessageTime) {
        user.lastMessageTime = Date.now();
        return false;
    }
    
    const timeDiff = Date.now() - user.lastMessageTime;
    user.lastMessageTime = Date.now();
    
    return timeDiff < 500; // 500ms'den kısa sürede mesaj gönderiyorsa flood
}

// Sunucuyu başlat
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server çalışıyor: http://localhost:${PORT}`);
    console.log(`📡 YouTube Live + IRC Sohbet Sistemi`);
    console.log(`👥 Varsayılan oda: ${defaultRoom}`);
});

// HTTP endpoint'leri
app.get('/api/rooms', (req, res) => {
    const roomsList = Array.from(rooms.keys()).map(roomName => ({
        name: roomName,
        userCount: rooms.get(roomName).users.size,
        settings: rooms.get(roomName).settings
    }));
    res.json(roomsList);
});

app.get('/api/stats', (req, res) => {
    res.json({
        totalUsers: users.size,
        totalRooms: rooms.size,
        streamInfo: streamInfo,
        uptime: process.uptime(),
        timestamp: new Date()
    });
});
