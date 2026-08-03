require('dotenv').config({ path: '../backend/.env' });
const pool = require('../backend/db');

async function checkUsers() {
    try {
        const res = await pool.query('SELECT id, name, email, role, status, created_at FROM users ORDER BY id DESC LIMIT 20');
        console.log('Total users count:', res.rows.length);
        console.log('Users in database:', JSON.stringify(res.rows, null, 2));
    } catch (e) {
        console.error('Error querying users:', e);
    } finally {
        process.exit(0);
    }
}

checkUsers();
