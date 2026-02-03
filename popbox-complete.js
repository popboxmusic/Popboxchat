// ========== SUNUCU KISMI ==========  
const express = require('express');  
const http = require('http');  
const socketIo = require('socket.io');  
  
const app = express();  
const server = http.createServer(app);  
const io = socketIo(server, { cors: { origin: "*" } });  
  
app.use(express.static('.'));  
app.get('/', (req, res) => res.send(`  
<!DOCTYPE html>  
<html>  
<head>  
    <title>Popbox Chat</title>  
    <script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>  
    <script src="https://www.youtube.com/iframe_api"></script>  
    <style>  
        body { margin:0; padding:20px; background:#1a1a2e; color:white; }  
        .container { display:flex; gap:20px; }  
        .player { flex:3; background:#000; border-radius:10px; height:400px; }  
        .chat { flex:1; background:#2d2d44; border-radius:10px; padding:15px; }  
        #messages { height:300px; overflow-y:auto; }  
        .message { background:#3d3d5c; padding:8px; margin:5px 0; border-radius:5px; }  
    </style>  
</head>  
<body>  
    <div class="container">  
        <div class="player"><div id="youtube-player"></div></div>  
        <div class="chat">  
            <h3>Popbox Chat</h3>  
            <div id="messages"></div>  
            <input id="messageInput" placeholder="Mesaj..." style="width:100%; padding:10px; margin-top:10px;">  
            <button onclick="sendMessage()" style="width:100%; padding:10px; margin-top:10px;">Gönder</button>  
            <button onclick="adminLogin()" style="width:100%; padding:10px; margin-top:10px; background:#ff5555;">Admin Giriş</button>  
        </div>  
    </div>  
      
    <script>  
        // ========== İSTEMCİ KISMI ==========  
        let socket;  
        let player;  
          
        // YouTube  
        function onYouTubeIframeAPIReady() {  
            player = new YT.Player('youtube-player', {  
                height: '100%', width: '100%',  
                videoId: 'dQw4w9WgXcQ'  
            });  
        }  
          
        // Socket Bağlantısı  
        window.onload = function() {  
            socket = io();  
              
            socket.on('connect', () => {  
                console.log('✅ Bağlandı!');  
                addMessage('Sistem', 'Sunucuya bağlandı!');  
                  
                const name = prompt('Adınız:', 'Kullanıcı_' + Math.floor(Math.random() * 1000));  
                if (name) socket.emit('join', { username: name });  
            });  
              
            socket.on('message', (data) => {  
                addMessage(data.user, data.text);  
            });  
              
            socket.on('system', (msg) => {  
                addMessage('Sistem', msg);  
            });  
        };  
          
        function sendMessage() {  
            const input = document.getElementById('messageInput');  
            const msg = input.value;  
            if (msg) {  
                socket.emit('message', { text: msg });  
                input.value = '';  
            }  
        }  
          
        function adminLogin() {  
            socket.emit('admin-login', {   
                username: 'popbox',   
                password: 'kumsal07@'   
            });  
        }  
          
        function addMessage(user, text) {  
            const div = document.createElement('div');  
            div.className = 'message';  
            div.innerHTML = `<strong>${user}:</strong> ${text}`;  
            document.getElementById('messages').appendChild(div);  
        }  
    </script>  
</body>  
</html>  
`));  
  
// ========== SOCKET İŞLEMLERİ ==========  
io.on('connection', (socket) => {  
    console.log('✅ Yeni bağlantı:', socket.id);  
      
    socket.on('join', (data) => {  
        const user = data.username || 'Anon';  
        console.log(`👤 ${user} katıldı`);  
        socket.emit('system', `Hoş geldin ${user}!`);  
        socket.broadcast.emit('system', `${user} katıldı`);  
    });  
      
    socket.on('message', (data) => {  
        console.log('💬 Mesaj:', data.text);  
        io.emit('message', { user: 'Kullanıcı', text: data.text });  
    });  
      
    socket.on('admin-login', (data) => {  
        if (data.username === 'popbox' && data.password === 'kumsal07@') {  
            console.log('👑 Admin girişi BAŞARILI');  
            socket.emit('system', '✅ Admin oldunuz!');  
        } else {  
            socket.emit('system', '❌ Admin girişi başarısız');  
        }  
    });  
});  
  
// ========== SUNUCUYU BAŞLAT ==========  
const PORT = 3000;  
server.listen(PORT, () => {  
    console.log('='.repeat(50));  
    console.log('🚀 POPBOX CHAT ÇALIŞIYOR!');  
    console.log(`📡 http://localhost:${PORT}`);  
    console.log('🔐 Admin: popbox / kumsal07@');  
    console.log('='.repeat(50));  
});  
