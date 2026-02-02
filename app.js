import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore, collection, addDoc, onSnapshot,
  query, orderBy, setDoc, doc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCrn_tXJZCAlKhem45aXxj4f0h26EPOQ70",
  authDomain: "popboxmusicchat.firebaseapp.com",
  projectId: "popboxmusicchat",
  storageBucket: "popboxmusicchat.firebasestorage.app",
  messagingSenderId: "206625719024",
  appId: "1:206625719024:web:d28f478a2c96d10412f835"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const nick = localStorage.getItem("nick");
nickLabel.innerText = "Nick: " + nick;

await setDoc(doc(db,"online",nick),{nick});

const chat = document.getElementById("chat");
const users = document.getElementById("users");

function render(d){
  chat.innerHTML += `<div><b onclick="ozelBaslat('${d.nick}')">${d.nick}</b>: ${d.text}</div>`;
  chat.scrollTop = chat.scrollHeight;
}

sendBtn.onclick = async ()=>{
  const text = msg.value.trim();
  if(!text) return;
  await addDoc(collection(db,"messages"),{nick,text,time:Date.now()});
  msg.value="";
};

msg.addEventListener("keypress",e=>{
  if(e.key==="Enter") sendBtn.click();
});

const q = query(collection(db,"messages"),orderBy("time"));
onSnapshot(q,(s)=>{
  chat.innerHTML="";
  s.forEach(d=>render(d.data()));
});

onSnapshot(collection(db,"online"),(s)=>{
  users.innerHTML="<b>Online</b><br>";
  s.forEach(d=>{
    users.innerHTML+=`<div onclick="ozelBaslat('${d.data().nick}')">${d.data().nick}</div>`;
  });
});

window.ozelBaslat=(n)=>{
  privateBox.style.display="flex";
  privateTitle.innerText=n;
};

window.ozelGonder=()=>{
  alert("Özel mesaj sonraki adımda");
};
