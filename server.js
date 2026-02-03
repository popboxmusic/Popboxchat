const io = require('socket.io')(3000);  
const rooms = new Map();  
  
io.on('connection', (socket) => {  
  console.log('Yeni bağlantı:', socket.id);  
    
  socket.on('join', (data) => {  
    const { nickname, room } = data;  
    socket.join(room);  
    socket.nickname = nickname;  
      
    // Kullanıcıyı odaya ekle  
    if (!rooms.has(room)) rooms.set(room, new Set());  
    rooms.get(room).add({ id: socket.id, nickname });  
      
    // Herkese duyur  
    socket.to(room).emit('user-joined', nickname);  
  });  
    
  socket.on('message', (data) => {  
    const { room, message, image, isPrivate } = data;  
      
    if (isPrivate) {  
      // Özel mesaj  
      io.to(data.to).emit('private-message', {  
        from: socket.nickname,  
        message,  
        image  
      });  
    } else {  
      // Odaya mesaj  
      io.to(room).emit('message', {  
        user: socket.nickname,  
        message,  
        image,  
        timestamp: new Date()  
      });  
    }  
  });  
});  
