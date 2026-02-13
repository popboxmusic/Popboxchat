// ========== TEMA SİSTEMİ ==========
let isDarkTheme = true;

function toggleTheme() {
    const body = document.body;
    const themeIcon = document.getElementById('themeIcon');
    
    if (body.classList.contains('light-theme')) {
        body.classList.remove('light-theme');
        themeIcon.className = 'fas fa-moon';
        isDarkTheme = true;
        localStorage.setItem('popbox-theme', 'dark');
    } else {
        body.classList.add('light-theme');
        themeIcon.className = 'fas fa-sun';
        isDarkTheme = false;
        localStorage.setItem('popbox-theme', 'light');
    }
}

// Kayıtlı temayı yükle
function loadTheme() {
    const savedTheme = localStorage.getItem('popbox-theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        const themeIcon = document.getElementById('themeIcon');
        if (themeIcon) themeIcon.className = 'fas fa-sun';
        isDarkTheme = false;
    }
}

window.toggleTheme = toggleTheme;
window.loadTheme = loadTheme;