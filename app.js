import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
getFirestore, collection, addDoc, onSnapshot,
query, orderBy, doc, updateDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
apiKey:"AIzaSyCrn_tXJZCAlKhem45aXxj4f0h26EPOQ70",
authDomain:"popboxmusicchat.firebaseapp.com",
projectId:"popboxmusicchat"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const nick = localStorage.getItem("nick");
let currentPM = null;

const chat = document.getElementById("chat");
const onlineList = document.getElementById("onlineList");

function checkVideo(text){
if(text.includes("youtu")){
let id=text.split("v=")[1];
if(id) document.getElementById("video").src=
"https://www.youtube.com/embed/"+id+"&autoplay=1";
}
}

window.sendMessage = async ()=>{
const text=messageInput.value.trim();
if(!text) return;

await addDoc(collection(db,"messages"),{
nick,text,time:Date.now()
});
messageInput.value="";
};

onSnapshot(query(collection(db,"messages"),orderBy("time")),snap=>{
chat.innerHTML="";
snap.forEach(d=>{
const data=d.data();
const div=document.createElement("div");
div.innerHTML=`<span class="user" onclick="openPM('${data.nick}')">${data.nick}</span>: ${data.text}
${data.nick===nick?`<button onclick="delMsg('${d.id}')">x</button>`:""}`;
chat.appendChild(div);
checkVideo(data.text);
});
});

window.delMsg=async(id)=>{
await deleteDoc(doc(db,"messages",id));
};

// ONLINE
onSnapshot(collection(db,"users"),snap=>{
onlineList.innerHTML="";
snap.forEach(d=>{
if(d.data().online){
onlineList.innerHTML+=`<div class="user" onclick="openPM('${d.id}')">${d.id}</div>`;
}
});
});

window.openPM=(u)=>{
currentPM=u;
pmBox.style.display="flex";
loadPM();
};

function loadPM(){
onSnapshot(query(collection(db,"pm"),orderBy("time")),snap=>{
pmChat.innerHTML="";
snap.forEach(d=>{
const x=d.data();
if((x.from===nick && x.to===currentPM)||(x.to===nick && x.from===currentPM)){
pmChat.innerHTML+=`<div>${x.from}: ${x.text||""}
<button onclick="delPM('${d.id}')">x</button></div>`;
}
});
});
}

window.sendPM=async()=>{
const t=pmText.value.trim();
if(!t) return;
await addDoc(collection(db,"pm"),{
from:nick,to:currentPM,text:t,time:Date.now()
});
pmText.value="";
};

window.delPM=async(id)=>{
await deleteDoc(doc(db,"pm",id));
};
