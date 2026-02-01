const ADMIN_NICK = "cemal";

const firebaseConfig = {
apiKey: "AIzaSyCrn_tXJZCAlKhem45aXxj4f0h26EPOQ70",
authDomain: "popboxmusicchat.firebaseapp.com",
projectId: "popboxmusicchat"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let currentPM = null;

function render(d){
const chat=document.getElementById("chat");
chat.innerHTML += `
<div>
<span class="user ${d.nick==ADMIN_NICK?'admin':''}" onclick="openPM('${d.nick}')">
${d.nick}:</span> ${d.text}
</div>`;
chat.scrollTop = chat.scrollHeight;
}

function send(){
const nick=document.getElementById("nick").value;
const text=document.getElementById("msg").value;

if(currentPM){
db.collection("pm").add({from:nick,to:currentPM,text,time:Date.now()});
}else{
db.collection("messages").add({nick,text,time:Date.now()});
}

document.getElementById("msg").value="";
}

function openPM(user){
currentPM=user;
const box=document.getElementById("pmBox");
box.style.display="block";
box.innerHTML="<b>Özel mesaj: "+user+"</b><hr>";
}

db.collection("messages").orderBy("time")
.onSnapshot(s=>{
document.getElementById("chat").innerHTML="";
s.forEach(doc=>render(doc.data()));
});

db.collection("pm").orderBy("time")
.onSnapshot(s=>{
const nick=document.getElementById("nick").value;
const box=document.getElementById("pmBox");
s.forEach(doc=>{
const d=doc.data();
if((d.from==nick && d.to==currentPM) || (d.to==nick && d.from==currentPM)){
box.innerHTML+=`<div><b>${d.from}:</b> ${d.text}</div>`;
box.scrollTop=box.scrollHeight;
}
});
});
