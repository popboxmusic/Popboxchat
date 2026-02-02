import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCrn_tXJZCAlKhem45aXxj4f0h26EPOQ70",
  authDomain: "popboxmusicchat.firebaseapp.com",
  projectId: "popboxmusicchat",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let currentNick="";

window.login = async function(){
  const nick = document.getElementById("nick").value.trim();
  const pass = document.getElementById("pass").value.trim();

  const ref = doc(db,"users",nick);
  const snap = await getDoc(ref);

  if(snap.exists()){
    if(snap.data().pass !== pass) return alert("Şifre yanlış");
  } else {
    await setDoc(ref,{pass});
  }

  currentNick = nick;
  document.getElementById("login").style.display="none";
  loadChat();
};

document.getElementById("msg").addEventListener("keypress",e=>{
  if(e.key==="Enter") sendMsg();
});

window.sendMsg = async function(){
  const text=document.getElementById("msg").value;
  if(!text) return;
  await addDoc(collection(db,"messages"),{nick:currentNick,text,time:Date.now()});
  document.getElementById("msg").value="";
}

function loadChat(){
  const q=query(collection(db,"messages"),orderBy("time"));
  onSnapshot(q,snap=>{
    const chat=document.getElementById("chat");
    chat.innerHTML="";
    snap.forEach(d=>{
      const m=d.data();
      chat.innerHTML+=`<div class="msg"><b>${m.nick}:</b> ${m.text}</div>`;
    });
    chat.scrollTop=chat.scrollHeight;
  });
}
