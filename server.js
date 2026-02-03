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

// Static dosyalar
app.use(express.static('.'));
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Kullanıcı verisi
const users = new Map(); // socket.id -> {name, role, room}

io.on('connection', (socket) => {
    console.log('Yeni bağlantı:', socket.id);
    
    socket.on('join', (data) => {
        const { name, role = 'user' } = data;
        
        users.set(socket.id, {
            id: socket.id,
            name: name || 'Anon',
            role: role,
            room: 'main'
        });
        
        // Hoş geldin mesajı
        socket.emit('system', `Hoş geldin, ${name}!`);
        
        // Diğer kullanıcılara bildir
        socket.broadcast.emit('system', `${name} sohbete katıldı!`);
        
        // Kullanıcı listesini güncelle
        updateUserList();
    });
    
    socket.on('message', (data) => {
        const user = users.get(socket.id);
        if (!user) return;
        
        console.log(`Mesaj: ${user.name}: ${data.message}`);
        
        // Herkese gönder
        io.emit('chat', {
            user: user.name,
            message: data.message,
            role: user.role,
            time: new Date().toISOString()
        });
    });
    
    socket.on('image', (data) => {
        const user = users.get(socket.id);
        if (!user) return;
        
        console.log(`Resim: ${user.name} gönderdi`);
        
        // Base64 resmi herkese gönder
        io.emit('chat', {
            user: user.name,
            message: '[Resim]',
            image: data.image,
            role: user.role
        });
    });
    
    socket.on('role-change', (data) => {
        const user = users.get(socket.id);
        if (user && data.role) {
            user.role = data.role;
            io.emit('system', `${user.name} artık ${data.role} oldu.`);
            updateUserList();
        }
    });
    
    socket.on('admin-action', (data) => {
        const admin = users.get(socket.id);
        
        // Sadece admin veya coadmin işlem yapabilir
        if (!admin || (admin.role !== 'admin' && admin.role !== 'coadmin')) {
            socket.emit('system', 'Yetkiniz yok!');
            return;
        }
        
        // Hedef kullanıcıyı bul
        const target = Array.from(users.values()).find(u => u.name === data.target);
        
        if (target) {
            if (data.action === 'coadmin' && admin.role === 'admin') {
                target.role = 'coadmin';
                io.emit('system', `${target.name} artık Co-Admin oldu.`);
            }
            else if (data.action === 'operator') {
                target.role = 'operator';
                io.emit('system', `${target.name} artık Operator oldu.`);
            }
            else if (data.action === 'kick') {
                // Kullanıcıyı at
                io.to(target.id).emit('system', 'Atıldınız!');
                users.delete(target.id);
                io.sockets.sockets.get(target.id)?.disconnect();
                io.emit('system', `${target.name} atıldı.`);
            }
            
            updateUserList();
        }
    });
    
    socket.on('disconnect', () => {
        const user = users.get(socket.id);
        if (user) {
            console.log('Bağlantı kesildi:', user.name);
            users.delete(socket.id);
            io.emit('system', `${user.name} ayrıldı.`);
            updateUserList();
        }
    });
    
    function updateUserList() {
        const userList = Array.from(users.values()).map(u => ({
            name: u.name,
            role: u.role
        }));
        
        io.emit('users', userList);
    }
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`🚀 Sunucu: http://localhost:${PORT}`);
    console.log('📡 YouTube Live Chat aktif!');
    console.log('🔐 Varsayılan admin şifresi: admin123');
});
