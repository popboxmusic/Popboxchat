async function sendMessage() {
    if (isSendingMessage) return;
    isSendingMessage = true;
    
    try {
        if (!isFirebaseConnected) { addSystemMessage('❌ Firebase bağlantısı yok!'); return; }
        if (!checkWriteLimit()) { addSystemMessage('⚠️ Günlük mesaj limitine ulaşıldı! Yarın tekrar dene.'); return; }
        
        const input = document.getElementById('message-input');
        const text = input.value.trim();
        if (!text) return;

        // ⬇⬇⬇ SPOR BOTU KOMUT KONTROLÜ — BURAYA EKLEYİN ⬇⬇⬇
        if (window.SporBot && window.SporBot.isCommand(text)) {
            input.value = '';
            autoResize(input);
            window.SporBot.handleCommand(text);
            isSendingMessage = false;
            return;
        }
        // ⬆⬆⬆ SPOR BOTU KOMUT KONTROLÜ — BURAYA KADAR ⬆⬆⬆

        // ... geri kalan mevcut kod aynen devam eder
        const canSend = await checkBanBeforeMessage();
        // ...
    }
}
