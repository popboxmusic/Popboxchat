// RESİM + MESAJ + ENTER + SİLME + ÖZEL MESAJ BİLDİRİM  
  
const db = firebase.firestore();  
  
let myNick = localStorage.getItem("nick");  
let activePM = null;  
  
// ENTER ile gönder  
document.addEventListener("keydown", e => {  
  if (e.key === "Enter") sendMessage();  
});  
  
// GENEL MESAJ  
function sendMessage() {  
  const input = document.getElementById("msg");  
  if (!input.value.trim()) return;  
  
  db.collection("messages").add({  
    nick: myNick,  
    text: input.value,  
    time: Date.now()  
  });  
  
  input.value = "";  
}  
  
// RESİM BASE64  
function sendImage(file, toNick=null) {  
  const reader = new FileReader();  
  reader.onload = function(e) {  
    const img64 = e.target.result;  
  
    const data = {  
      nick: myNick,  
      image: img64,  
      time: Date.now()  
    };  
  
    if(toNick){  
      data.to = toNick;  
      db.collection("pm").add(data);  
    } else {  
      db.collection("messages").add(data);  
    }  
  };  
  reader.readAsDataURL(file);  
}  
  
// DOSYA SEÇ  
function imagePick(toNick=null){  
  const inp = document.createElement("input");  
  inp.type = "file";  
  inp.accept = "image/*";  
  inp.onchange = e => sendImage(e.target.files[0], toNick);  
  inp.click();  
}  
  
// MESAJLARI DİNLE  
db.collection("messages").orderBy("time")  
.onSnapshot(snap=>{  
  const area = document.getElementById("chat");  
  area.innerHTML = "";  
  snap.forEach(doc=>{  
    const d = doc.data();  
    let el = document.createElement("div");  
  
    if(d.image){  
      el.innerHTML = `<b>${d.nick}:</b><br><img src="${d.image}" style="max-width:150px;border-radius:8px">`;  
    } else {  
      el.innerHTML = `<b>${d.nick}:</b> ${d.text}`;  
    }  
  
    // kendi mesajını silme  
    if(d.nick === myNick){  
      const del = document.createElement("span");  
      del.innerText = " ❌";  
      del.onclick = ()=> db.collection("messages").doc(doc.id).delete();  
      el.appendChild(del);  
    }  
  
    area.appendChild(el);  
  });  
});  
  
// ÖZEL MESAJ  
function openPM(nick){  
  activePM = nick;  
  document.getElementById("pmBox").style.display="block";  
  listenPM();  
}  
  
function sendPM(){  
  const input = document.getElementById("pmMsg");  
  if(!input.value.trim()) return;  
  
  db.collection("pm").add({  
    nick: myNick,  
    to: activePM,  
    text: input.value,  
    time: Date.now()  
  });  
  
  input.value="";  
}  
  
function listenPM(){  
  db.collection("pm")  
  .where("to","in",[myNick,activePM])  
  .orderBy("time")  
  .onSnapshot(snap=>{  
    const area = document.getElementById("pmChat");  
    area.innerHTML="";  
    snap.forEach(doc=>{  
      const d=doc.data();  
      let el=document.createElement("div");  
  
      if(d.image){  
        el.innerHTML=`<b>${d.nick}:</b><br><img src="${d.image}" style="max-width:120px">`;  
      }else{  
        el.innerHTML=`<b>${d.nick}:</b> ${d.text}`;  
      }  
  
      // herkesden sil  
      const del=document.createElement("span");  
      del.innerText=" ❌";  
      del.onclick=()=>db.collection("pm").doc(doc.id).delete();  
      el.appendChild(del);  
  
      area.appendChild(el);  
    });  
  });  
}  
  
// ================== NICK REGISTER & LOGIN SYSTEM ==================  
  
let currentUser = null;  
  
async function registerOrLogin(nick, pass) {  
  const userRef = db.collection("users").doc(nick);  
  const doc = await userRef.get();  
  
  if (!doc.exists) {  
    // kayıt et  
    await userRef.set({  
      password: pass,  
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),  
      online: true  
    });  
    currentUser = nick;  
    alert("Nick kayıt edildi. Giriş yapıldı.");  
  } else {  
    // giriş yap  
    if (doc.data().password === pass) {  
      await userRef.update({ online: true });  
      currentUser = nick;  
      alert("Giriş başarılı.");  
    } else {  
      alert("Şifre yanlış!");  
      return;  
    }  
  }  
  
  document.getElementById("loginPanel").style.display = "none";  
  document.getElementById("chatArea").style.display = "block";  
}  
  
// giriş paneli oluştur (otomatik)  
const loginDiv = document.createElement("div");  
loginDiv.id = "loginPanel";  
loginDiv.innerHTML = `  
  <div style="  
    position:fixed;  
    inset:0;  
    background:#000;  
    display:flex;  
    flex-direction:column;  
    align-items:center;  
    justify-content:center;  
    z-index:9999;  
  ">  
    <h2 style="color:white;margin-bottom:20px;">Nick Giriş</h2>  
    <input id="nickInput" placeholder="Nick"  
      style="padding:12px;margin:5px;width:220px;font-size:16px;">  
    <input id="passInput" type="password" placeholder="Şifre"  
      style="padding:12px;margin:5px;width:220px;font-size:16px;">  
    <button onclick="startLogin()"  
      style="padding:12px 25px;margin-top:10px;background:#ff3c00;color:white;border:none;font-size:16px;">  
      Giriş / Kayıt  
    </button>  
  </div>  
`;  
document.body.appendChild(loginDiv);  
  
// chat alanını gizle  
window.addEventListener("load", () => {  
  document.getElementById("chatArea").style.display = "none";  
});  
  
function startLogin() {  
  const nick = document.getElementById("nickInput").value.trim();  
  const pass = document.getElementById("passInput").value.trim();  
  if (nick && pass) {  
    registerOrLogin(nick, pass);  
  }  
}  
  
// mesaj gönderirken nick kullan  
const oldSendMessage = sendMessage;  
sendMessage = function () {  
  if (!currentUser) {  
    alert("Önce giriş yapmalısın!");  
    return;  
  }  
  oldSendMessage(currentUser);  
};  
  
// online durum kapatma  
window.addEventListener("beforeunload", async () => {  
  if (currentUser) {  
    await db.collection("users").doc(currentUser).update({ online: false });  
  }  
});  
