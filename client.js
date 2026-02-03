// YouTube player kurulumu  
const tag = document.createElement('script');  
tag.src = "https://www.youtube.com/iframe_api";  
document.head.appendChild(tag);  
  
// Sohbet fonksiyonları  
async function sendMessage() {  
  const message = document.getElementById('message').value;  
  const image = document.getElementById('image').files[0];  
    
  let base64Image = null;  
  if (image) {  
    base64Image = await convertToBase64(image);  
  }  
    
  socket.emit('message', {  
    room: 'main',  
    message,  
    image: base64Image,  
    isPrivate: false  
  });  
}  
