// ========== ADMIN.JS ==========
const Admin = {
    // Ban
    ban: function() {
        const user = document.getElementById('adminTargetUser').value;
        const duration = document.getElementById('banDuration').value;
        const reason = document.getElementById('banReason').value;
        Utils.addSystemMessage(`🚫 ${user} ${duration} süreyle yasaklandı: ${reason}`);
        UI.toggleAdminPanel();
    },
    
    // Kick
    kick: function() {
        const user = document.getElementById('adminTargetUser').value;
        const reason = document.getElementById('kickReason').value;
        Utils.addSystemMessage(`👢 ${user} kanaldan atıldı: ${reason}`);
        UI.toggleAdminPanel();
    },
    
    // Unban
    unban: function() {
        const user = document.getElementById('adminTargetUser').value;
        Utils.addSystemMessage(`✅ ${user} yasağı kaldırıldı`);
        UI.toggleAdminPanel();
    },
    
    // Admin ekle
    add: function() {
        const user = document.getElementById('adminTargetUser').value;
        Utils.addSystemMessage(`✅ ${user} admin yapıldı`);
        UI.toggleAdminPanel();
    },
    
    // Admin çıkar
    remove: function() {
        const user = document.getElementById('adminTargetUser').value;
        Utils.addSystemMessage(`✅ ${user} admin yetkisi alındı`);
        UI.toggleAdminPanel();
    },
    
    // Co-Admin ekle
    addCoAdmin: function() {
        const user = document.getElementById('adminTargetUser').value;
        Utils.addSystemMessage(`🔧 ${user} co-admin yapıldı`);
        UI.toggleAdminPanel();
    },
    
    // Co-Admin çıkar
    removeCoAdmin: function() {
        const user = document.getElementById('adminTargetUser').value;
        Utils.addSystemMessage(`🔨 ${user} co-admin yetkisi alındı`);
        UI.toggleAdminPanel();
    },
    
    // Operator ekle
    addOperator: function() {
        const user = document.getElementById('adminTargetUser').value;
        Utils.addSystemMessage(`🛠️ ${user} operator yapıldı`);
        UI.toggleAdminPanel();
    },
    
    // Operator çıkar
    removeOperator: function() {
        const user = document.getElementById('adminTargetUser').value;
        Utils.addSystemMessage(`🔨 ${user} operator yetkisi alındı`);
        UI.toggleAdminPanel();
    }
};

window.Admin = Admin;
console.log('✅ Admin.js yüklendi');
