const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'server', 'db.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

console.log("--- DB STATUS ---");
console.log(`Users: ${db.users.length}`);
const admin = db.users.find(u => u.email === 'zeeben59@gmail.com');
console.log("Admin exists:", !!admin, admin ? `Role: ${admin.role}` : "");
console.log("Settings:", db.settings);
console.log(`Audit Logs: ${db.audit_logs?.length || 0}`);
console.log(`Security Logs: ${db.security_logs?.length || 0}`);
