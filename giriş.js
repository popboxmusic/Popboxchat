// performLogin fonksiyonuna EKLE:
function performLogin(nickname, password) {
    // ... mevcut kodlar ...
    
    // Owner girişi yaptıysa admin atama butonlarını göster
    if (isOwner) {
        setTimeout(() => {
            const adminInput = document.getElementById('adminUsername');
            if (adminInput) adminInput.style.display = 'block';
        }, 2000);
    }
    
    // Yetki logu
    if (database) {
        database.ref('loginLogs').push({
            user: currentUser.name,
            role: currentUser.role,
            ip: 'Gizli',
            timestamp: Date.now()
        });
    }
}