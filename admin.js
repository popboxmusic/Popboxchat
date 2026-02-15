// ========== admin.js ==========
// YÖNETİCİ İŞLEMLERİ

const Admin = {
    ban: function() {
        const user = document.getElementById('adminTargetUser').value;
        const duration = document.getElementById('banDuration').value;
        const reason = document.getElementById('banReason').value;
        Utils.addSystemMessage(`🚫 ${user} ${duration} süreyle yasaklandı: ${reason}`);
        UI.toggleAdminPanel();
    },
    
    kick: function() {
        const user = document.getElementById('adminTargetUser').value;
        const reason = document.getElementById('kickReason').value;
        Utils.addSystemMessage(`👢 ${user} kanaldan atıldı: ${reason}`);
        UI.toggleAdminPanel();
    },
    
    unban: function() {
        const user = document.getElementById('adminTargetUser').value;
        Utils.addSystemMessage(`✅ ${user} yasağı kaldırıldı`);
        UI.toggleAdminPanel();
    },
    
    add: function() {
        const user = document.getElementById('adminTargetUser').value;
        Utils.addSystemMessage(`✅ ${user} admin yapıldı`);
        UI.toggleAdminPanel();
    },
    
    remove: function() {
        const user = document.getElementById('adminTargetUser').value;
        Utils.addSystemMessage(`✅ ${user} admin yetkisi alındı`);
        UI.toggleAdminPanel();
    },
    
    addCoAdmin: function() {
        const user = document.getElementById('adminTargetUser').value;
        Utils.addSystemMessage(`🔧 ${user} co-admin yapıldı`);
        UI.toggleAdminPanel();
    },
    
    removeCoAdmin: function() {
        const user = document.getElementById('adminTargetUser').value;
        Utils.addSystemMessage(`🔨 ${user} co-admin yetkisi alındı`);
        UI.toggleAdminPanel();
    },
    
    addOperator: function() {
        const user = document.getElementById('adminTargetUser').value;
        Utils.addSystemMessage(`🛠️ ${user} operator yapıldı`);
        UI.toggleAdminPanel();
    },
    
    removeOperator: function() {
        const user = document.getElementById('adminTargetUser').value;
        Utils.addSystemMessage(`🔨 ${user} operator yetkisi alındı`);
        UI.toggleAdminPanel();
    }
};

window.Admin = Admin;
console.log('✅ Admin.js yüklendi');