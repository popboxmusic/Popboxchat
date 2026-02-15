// ========== utils.js ==========
// YARDIMCI FONKSİYONLAR

const Utils = {
    // HTML escape
    escapeHTML: function(t) {
        if (!t) return '';
        let d = document.createElement('div');
        d.textContent = t;
        return d.innerHTML;
    },
    
    // Textarea otomatik boyutlandır
    autoResize: function(t) {
        t.style.height = 'auto';
        t.style.height = Math.min(t.scrollHeight, 80) + 'px';
    },
    
    // Sistem mesajı ekle
    addSystemMessage: function(t) {
        let d = document.createElement('div');
        d.className = 'system-message';
        d.innerHTML = `<i class="fas fa-info-circle"></i> ${this.escapeHTML(t)}`;
        document.getElementById('messages').appendChild(d);
        document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
    },
    
    // Şifre göster/gizle
    togglePassword: function() {
        const input = document.getElementById('loginPassword');
        const icon = document.getElementById('togglePassword');
        if (input.type === 'password') {
            input.type = 'text';
            icon.className = 'fas fa-eye-slash password-toggle';
        } else {
            input.type = 'password';
            icon.className = 'fas fa-eye password-toggle';
        }
    },
    
    // Tema değiştir
    toggleTheme: function() {
        document.body.classList.toggle('light-theme');
        const i = document.getElementById('themeIcon').querySelector('i');
        i.className = document.body.classList.contains('light-theme') ? 'fas fa-sun' : 'fas fa-moon';
        localStorage.setItem('theme', document.body.classList.contains('light-theme') ? 'light' : 'dark');
    },
    
    // Sayı formatla
    formatNumber: function(num) {
        if (num >= 1000000) return (num/1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num/1000).toFixed(1) + 'K';
        return num;
    }
};

window.Utils = Utils;