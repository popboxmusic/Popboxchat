const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

let users = {};
let messages = [];

io.on('connection', (socket) => {
    console.log('Yeni kullanıcı bağlandı:', socket.id);

    // Kullanıcı girişi
    socket.on('login', (username) => {
        users[socket.id] = {
            id: socket.id,
            name: username,
            isAdmin: ['popbox', 'popboxmusic'].includes(username.toLowerCase())
        };
        
        // Online kullanıcıları güncelle
        io.emit('updateUsers', Object.values(users));
        
        // Mesaj geçmişini gönder
        socket.emit('messageHistory', messages.slice(-50));
        
        // Hoş geldin mesajı
        const welcomeMsg = {
            id: Date.now(),
            sender: 'Sistem',
            text: `${username} sohbete katıldı!`,
            type: 'system',
            timestamp: Date.now()
        };
        
        messages.push(welcomeMsg);
        io.emit('newMessage', welcomeMsg);
    });

    // Mesaj gönderme
    socket.on('sendMessage', (message) => {
        const user = users[socket.id];
        if (!user) return;

        const newMessage = {
            id: Date.now(),
            sender: user.name,
            text: message.text,
            type: user.isAdmin ? 'admin' : 'user',
            timestamp: Date.now()
        };

        messages.push(newMessage);
        
        // Son 200 mesajı sakla
        if (messages.length > 200) {
            messages.shift();
        }

        io.emit('newMessage', newMessage);
    });

    // Kullanıcı çıkışı
    socket.on('disconnect', () => {
        const user = users[socket.id];
        if (user) {
            delete users[socket.id];
            
            const leaveMsg = {
                id: Date.now(),
                sender: 'Sistem',
                text: `${user.name} ayrıldı.`,
                type: 'system',
                timestamp: Date.now()
            };
            
            messages.push(leaveMsg);
            io.emit('newMessage', leaveMsg);
            io.emit('updateUsers', Object.values(users));
        }
        
        console.log('Kullanıcı ayrıldı:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server ${PORT} portunda çalışıyor`);
});
