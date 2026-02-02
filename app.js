// Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// KENDİ firebase configin burada olacak
const firebaseConfig = {
  apiKey: "BURAYA",
  authDomain: "BURAYA",
  projectId: "BURAYA",
  storageBucket: "BURAYA",
  messagingSenderId: "BURAYA",
  appId: "BURAYA"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// TEK ODA — HERKES BURAYA YAZAR
const chatRef = collection(db, "GLOBAL_CHAT");

const chatBox = document.getElementById("chat");
const input = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");

let nick = localStorage.getItem("nick");

sendBtn.addEventListener("click", sendMessage);
input.addEventListener("keydown", e => {
  if (e.key === "Enter") sendMessage();
});

async function sendMessage() {
  const text = input.value.trim();
  if (!text) return;

  await addDoc(chatRef, {
    nick: nick,
    text: text,
    time: serverTimestamp()
  });

  input.value = "";
}

// HERKES AYNI YERİ DİNLER
const q = query(chatRef, orderBy("time"));
onSnapshot(q, snapshot => {
  chatBox.innerHTML = "";
  snapshot.forEach(doc => {
    const data = doc.data();
    chatBox.innerHTML += `
      <div>
        <b>${data.nick}:</b> ${data.text}
      </div>
    `;
  });
});
