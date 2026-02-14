// ========== MOBIL.JS - CETCETY Mobil Görünüm ==========
console.log('%c📱 CETCETY Mobil başlatılıyor...', 'color: #00ff00;');

class CETCETYMobil {
    constructor() {
        this.isMobile = window.innerWidth <= 768;
        console.log('📱 Mobil mod:', this.isMobile ? 'AKTİF' : 'PASİF');
    }
}

window.mobilManager = new CETCETYMobil();
