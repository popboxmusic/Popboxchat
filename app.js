const ADMIN_NICK = "cemal";
let nick = "";
let currentPM = null;

const firebaseConfig = {
apiKey: "AIzaSyCrn_tXJZCAlKhem45aXxj4f0h26EPOQ70",
authDomain: "popboxmusicchat.firebaseapp.com",
projectId: "popboxmusicchat"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

function enterChat(){
nick = document.getElementById("nickInput").value;
if(!nick) return alert("Nick yaz");
document.getElementById("login").style.display="none";
document.getElementById("app").style.display="flex";
}

document.addEventListener("keydown",e=>{
if(e.key==="Enter"){
if(currentPM){ sendPM(); }
else{ sendMsg(); }
}
});

function renderMsg(d){
const chat=document.getElementById("chat");
chat.innerHTML += `
<div class="msg">
<span class="user ${d.nick==ADMIN_NICK?'admin':''}" onclick="openPM('${d.nick}')">
${d.nick}:</span> ${d.text}
</div>`;
chat.scrollTop=chat.scrollHeight;
}

function sendMsg(){
const text=document.getElementById("msg").value;
if(!text) return;
db.collection("messages").add({nick,text,time:Date.now()});
document.getElementById("msg").value="";
}

db.collection("messages").orderBy("time")
.onSnapshot(s=>{
document.getElementById("chat").innerHTML="";
s.forEach(doc=>renderMsg(doc.data()));
});

function openPM(user){
currentPM=user;
document.getElementById("pmUser").innerText=user;
document.getElementById("pmPanel").style.display="flex";
loadPM();
}

function closePM(){
currentPM=null;
document.getElementById("pmPanel").style.display="none";
}

function loadPM(){
db.collection("pm").orderBy("time")
.onSnapshot(s=>{
const box=document.getElementById("pmChat");
box.innerHTML="";
s.forEach(doc=>{
const d=doc.data();
if((d.from==nick && d.to==currentPM) || (d.to==nick && d.from==currentPM)){
if(d.img){
box.innerHTML+=`<div><b>${d.from}:</b><br><img src="${d.img}" width="150"/></div>`;
}else{
box.innerHTML+=`<div><b>${d.from}:</b> ${d.text}</div>`;
}
box.scrollTop=box.scrollHeight;
}
});
});
}

function sendPM(){
const text=document.getElementById("pmMsg").value;
const file=document.getElementById("imgUpload").files[0];

if(file){
const reader=new FileReader();
reader.onload=e=>{
db.collection("pm").add({
from:nick,to:currentPM,img:e.target.result,time:Date.now()
});
};
reader.readAsDataURL(file);
document.getElementById("imgUpload").value="";
}else if(text){
db.collection("pm").add({
from:nick,to:currentPM,text,time:Date.now()
});
document.getElementById("pmMsg").value="";
}
}
