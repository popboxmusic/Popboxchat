import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore, collection, addDoc, onSnapshot,
  query, orderBy, setDoc, doc, getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCrn_tXJZCAlKhem45aXxj4f0h26EPOQ70",
  authDomain: "popboxmusicchat.firebaseapp.com",
  projectId: "popboxmusicchat",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let currentNick, activePM=null;
const ADMIN=["popboxmusic","popbox"];

loginBtn.onclick = async ()=>{
  const n=nick.value.trim();
  const p=pass.value.trim();
  if(!n||!p) return;

  const ref=doc(db,"users",n);
  const snap=await getDoc(ref);

  if(snap.exists()){
    if(snap.data().pass!==p) return alert("Şifre yanlış");
  }else{
    await setDoc(ref,{pass:p,role:ADMIN.includes(n)?"admin":"user"});
  }

  currentNick=n;
  login.style.display="none";
  appDiv.style.display="block";
  baslat();
};

async function baslat(){
  await setDoc(doc(db,"online",currentNick),{nick:currentNick});

  send.onclick=gonder;
  msg.addEventListener("keypress",e=>{if(e.key==="Enter")gonder();});

  const q=query(collection(db,"messages"),orderBy("time"));
  onSnapshot(q,s=>{
    chat.innerHTML="";
    s.forEach(d=>{
      const m=d.data();
      chat.innerHTML+=`<div><b onclick="pm('${m.nick}')">${m.nick}</b>: ${m.text}</div>`;
    });
  });

  onSnapshot(collection(db,"online"),s=>{
    users.innerHTML="<b>Online</b><br>";
    s.forEach(d=>{
      users.innerHTML+=`<div onclick="pm('${d.data().nick}')">${d.data().nick}</div>`;
    });
  });
}

async function gonder(){
  if(!msg.value) return;
  await addDoc(collection(db,"messages"),{
    nick:currentNick,text:msg.value,time:Date.now()
  });
  msg.value="";
}

window.pm=(n)=>{
  if(n===currentNick) return;
  activePM=n;
  pmBox.style.display="flex";
  pmTitle.innerText=n;
};

pmSend.onclick=async ()=>{
  if(!pmMsg.value && !imgSend.files[0]) return;
  await addDoc(collection(db,"pm"),{
    from:currentNick,to:activePM,
    text:pmMsg.value,time:Date.now()
  });
  pmMsg.value="";
};
