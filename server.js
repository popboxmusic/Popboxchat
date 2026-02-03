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

const CONFIG = {
    ADMIN_USERNAME: "popbox",
    ADMIN_PASSWORD: "kumsal07@"
};

const users = new Map();

io.on('connection', (socket) => {
    console.log('🔗 Bağlantı:', socket.id);
    
    socket.on('join', (data) => {
        const username = data.username || `Kullanıcı_${socket.id.substring(0, 5)}`;
        
        users.set(socket.id, {
            id: socket.id,
            username: username,
            role: 'user'
        });
        
        socket.emit('system-message', { message: `Hoş geldin, ${username}!` });
        socket.broadcast.emit('system-message', { message: `${username} katıldı!` });
        
        updateUserList();
        console.log(`👤 ${username} katıldı`);
    });
    
    socket.on('send-message', (data) => {
        const user = users.get(socket.id);
        if (!user) return;
        
        const messageData = {
            username: user.username,
            message: data.message,
            role: user.role
        };
        
        io.emit('chat-message', messageData);
        console.log(`💬 ${user.username}: ${data.message}`);
    });
    
    socket.on('admin-login', (data) => {
        const user = users.get(socket.id);
        if (!user) return;
        
        if (data.username === CONFIG.ADMIN_USERNAME && data.password === CONFIG.ADMIN_PASSWORD) {
            user.role = 'admin';
            socket.emit('admin-login-success');
            io.emit('system-message', { message: `${user.username} artık Admin!` });
            updateUserList();
            console.log(`👑 Admin girişi: ${user.username}`);
        } else {
            socket.emit('admin-login-failed');
        }
    });
    
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
    
    socket.on('disconnect', () => {
        const user = users.get(socket.id);
        if (user) {
            users.delete(socket.id);
            io.emit('system-message', { message: `${user.username} ayrıldı.` });
            updateUserList();
            console.log(`👋 ${user.username} ayrıldı`);
        }
    });
    
    function updateUserList() {
        const userList = Array.from(users.values()).map(user => ({
            username: user.username,
            role: user.role
        }));
        io.emit('user-list', userList);
    }
});

app.use(express.static('.'));
app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));

const PORT = 3000;
server.listen(PORT, () => {
    console.log('========================================');
    console.log('🚀 POPBOX CHAT SERVER');
    console.log(`📡 http://localhost:${PORT}`);
    console.log(`🔐 Admin: ${CONFIG.ADMIN_USERNAME}`);
    console.log(`🔑 Şifre: ${CONFIG.ADMIN_PASSWORD}`);
    console.log('========================================');
});
