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
let currentPM="";

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
  loadUsers();
};

document.getElementById("msg").addEventListener("keypress",e=>{
  if(e.key==="Enter") sendMsg();
});

async function sendMsg(){
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
  });
}

function loadUsers(){
  onSnapshot(collection(db,"users"),snap=>{
    const list=document.getElementById("userList");
    list.innerHTML="";
    snap.forEach(d=>{
      const div=document.createElement("div");
      div.className="user";
      div.innerText=d.id;
      div.onclick=()=>openPM(d.id,div);
      list.appendChild(div);
    });
  });
}

function openPM(nick,el){
  currentPM=nick;
  document.getElementById("pmNick").innerText=nick;
  document.getElementById("pmBox").style.display="flex";
  el.classList.remove("alert");
  loadPM();
}

window.closePM=function(){
  document.getElementById("pmBox").style.display="none";
};

document.getElementById("pmInput").addEventListener("keypress",e=>{
  if(e.key==="Enter") sendPM();
});

async function sendPM(){
  const text=document.getElementById("pmInput").value;
  await addDoc(collection(db,"private"),{
    from:currentNick,
    to:currentPM,
    text,
    time:Date.now()
  });
  document.getElementById("pmInput").value="";
}

function loadPM(){
  const q=query(collection(db,"private"),orderBy("time"));
  onSnapshot(q,snap=>{
    const box=document.getElementById("pmMessages");
    box.innerHTML="";
    snap.forEach(d=>{
      const m=d.data();
      if((m.from===currentNick && m.to===currentPM) || (m.from===currentPM && m.to===currentNick)){
        box.innerHTML+=`<div>${m.from}: ${m.text}</div>`;
      }
    });
  });
}
