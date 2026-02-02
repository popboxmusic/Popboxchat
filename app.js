import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore, collection, addDoc, onSnapshot,
  query, orderBy, deleteDoc, doc, getDocs, setDoc
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

let currentNick = localStorage.getItem("nick");
let activePrivate = null;

const ADMIN_NICKS = ["popboxmusic", "popbox"];

if (!currentNick) {
  const n = prompt("Nick gir");
  localStorage.setItem("nick", n);
  currentNick = n;
}

document.getElementById("nickLabel").innerText = currentNick;

const chat = document.getElementById("chat");
const usersDiv = document.getElementById("users");

async function temizleEskiMesajlar() {
  const now = Date.now();
  const snap = await getDocs(collection(db, "messages"));
  snap.forEach(async (d) => {
    if (now - d.data().time > 86400000) {
      await deleteDoc(doc(db, "messages", d.id));
    }
  });
}
temizleEskiMesajlar();

function renderMessage(d, id) {
  const div = document.createElement("div");
  div.className = "msg";

  let delBtn = "";
  if (d.nick === currentNick || ADMIN_NICKS.includes(currentNick)) {
    delBtn = `<span onclick="silMesaj('${id}')" class="del">🗑</span>`;
  }

  div.innerHTML = `<b onclick="ozelBaslat('${d.nick}')">${d.nick}</b>: ${d.text} ${delBtn}`;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

window.silMesaj = async (id) => {
  await deleteDoc(doc(db, "messages", id));
};

window.gonder = async () => {
  const input = document.getElementById("msg");
  const text = input.value.trim();
  if (!text) return;

  await addDoc(collection(db, "messages"), {
    nick: currentNick,
    text,
    time: Date.now()
  });

  input.value = "";
};

document.getElementById("msg").addEventListener("keypress", e => {
  if (e.key === "Enter") gonder();
});

const q = query(collection(db, "messages"), orderBy("time"));
onSnapshot(q, (s) => {
  chat.innerHTML = "";
  s.forEach(doc => renderMessage(doc.data(), doc.id));
});

async function kullaniciKaydet() {
  await setDoc(doc(db, "online", currentNick), {
    nick: currentNick,
    time: Date.now()
  });
}
kullaniciKaydet();

onSnapshot(collection(db, "online"), (s) => {
  usersDiv.innerHTML = "";
  s.forEach(d => {
    const el = document.createElement("div");
    el.innerText = d.data().nick;
    el.onclick = () => ozelBaslat(d.data().nick);
    usersDiv.appendChild(el);
  });
});

window.ozelBaslat = (nick) => {
  if (nick === currentNick) return;
  activePrivate = nick;
  document.getElementById("privateBox").style.display = "block";
  document.getElementById("privateTitle").innerText = nick;
};

window.ozelGonder = async () => {
  const input = document.getElementById("privateMsg");
  const text = input.value.trim();
  if (!text) return;

  await addDoc(collection(db, "private"), {
    from: currentNick,
    to: activePrivate,
    text,
    time: Date.now()
  });

  input.value = "";
};

const pq = query(collection(db, "private"), orderBy("time"));
onSnapshot(pq, (s) => {
  const box = document.getElementById("privateChat");
  box.innerHTML = "";
  s.forEach(d => {
    const m = d.data();
    if (
      (m.from === currentNick && m.to === activePrivate) ||
      (m.from === activePrivate && m.to === currentNick)
    ) {
      box.innerHTML += `<div><b>${m.from}:</b> ${m.text}</div>`;
    }
  });
});
