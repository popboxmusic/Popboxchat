const ADMIN_DEFAULT = {
  nick: "popbox",
  pass: "kumsal07",
  role: "admin"
};

let nick = "";
let role = "user";
let currentPM = null;

const firebaseConfig = {
  apiKey: "AIzaSyCrn_tXJZCAlKhem45aXxj4f0h26EPOQ70",
  authDomain: "popboxmusicchat.firebaseapp.com",
  projectId: "popboxmusicchat"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// 🔹 Admin otomatik oluştur
async function ensureAdmin() {
  const ref = db.collection("users").doc(ADMIN_DEFAULT.nick);
  const doc = await ref.get();
  if (!doc.exists) {
    await ref.set({
      nick: ADMIN_DEFAULT.nick,
      pass: ADMIN_DEFAULT.pass,
      role: "admin",
      online: false
    });
  }
}
ensureAdmin();

// 🔹 KAYIT
async function register() {
  const nickVal = nickInput.value.trim();
  const passVal = passInput.value.trim();
  if (!nickVal || !passVal) return;

  const userRef = db.collection("users").doc(nickVal);
  const doc = await userRef.get();

  if (doc.exists) {
    info.innerText = "Bu nick kayıtlı!";
  } else {
    await userRef.set({
      nick: nickVal,
      pass: passVal,
      role: "user",
      online: true
    });
    nick = nickVal;
    enterChat();
  }
}

// 🔹 GİRİŞ
async function login() {
  const nickVal = nickInput.value.trim();
  const passVal = passInput.value.trim();
  if (!nickVal || !passVal) return;

  const userRef = db.collection("users").doc(nickVal);
  const doc = await userRef.get();

  if (!doc.exists) {
    info.innerText = "Nick bulunamadı!";
    return;
  }

  if (doc.data().pass !== passVal) {
    info.innerText = "Şifre yanlış!";
    return;
  }

  nick = nickVal;
  role = doc.data().role;
  await userRef.update({ online: true });
  enterChat();
}

// 🔹 CHAT GİRİŞ
function enterChat() {
  document.getElementById("login").style.display = "none";
  document.getElementById("app").style.display = "flex";
}

// 🔹 Enter ile gönderme
document.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    if (currentPM) sendPM();
    else sendMsg();
  }
});

// 🔹 GENEL MESAJ
function renderMsg(d) {
  const chat = document.getElementById("chat");
  chat.innerHTML += `
  <div class="msg">
    <span class="user" onclick="openPM('${d.nick}')">
      ${d.nick}:
    </span> ${d.text}
  </div>`;
  chat.scrollTop = chat.scrollHeight;
}

function sendMsg() {
  const text = document.getElementById("msg").value;
  if (!text) return;
  db.collection("messages").add({ nick, text, time: Date.now() });
  document.getElementById("msg").value = "";
}

db.collection("messages").orderBy("time")
.onSnapshot(snapshot => {
  document.getElementById("chat").innerHTML = "";
  snapshot.forEach(doc => renderMsg(doc.data()));
});

// 🔹 PM
function openPM(user) {
  currentPM = user;
  document.getElementById("pmUser").innerText = user;
  document.getElementById("pmPanel").style.display = "flex";
  loadPM();
}

function closePM() {
  currentPM = null;
  document.getElementById("pmPanel").style.display = "none";
}

function loadPM() {
  db.collection("pm").orderBy("time")
  .onSnapshot(snapshot => {
    const box = document.getElementById("pmChat");
    box.innerHTML = "";
    snapshot.forEach(doc => {
      const d = doc.data();
      if (
        (d.from === nick && d.to === currentPM) ||
        (d.to === nick && d.from === currentPM)
      ) {
        if (d.img) {
          box.innerHTML += `<div><b>${d.from}:</b><br><img src="${d.img}" width="150"/></div>`;
        } else {
          box.innerHTML += `<div><b>${d.from}:</b> ${d.text}</div>`;
        }
        box.scrollTop = box.scrollHeight;
      }
    });
  });
}

function sendPM() {
  const text = document.getElementById("pmMsg").value;
  const file = document.getElementById("imgUpload").files[0];

  if (file) {
    const reader = new FileReader();
    reader.onload = e => {
      db.collection("pm").add({
        from: nick,
        to: currentPM,
        img: e.target.result,
        time: Date.now()
      });
    };
    reader.readAsDataURL(file);
    imgUpload.value = "";
  } else if (text) {
    db.collection("pm").add({
      from: nick,
      to: currentPM,
      text,
      time: Date.now()
    });
    pmMsg.value = "";
  }
}

// 🔹 Çıkınca offline
window.addEventListener("beforeunload", async () => {
  if (nick) {
    await db.collection("users").doc(nick).update({ online: false });
  }
});
