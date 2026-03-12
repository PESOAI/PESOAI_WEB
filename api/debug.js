import pool from './db.js';
import bcrypt from 'bcrypt';

const result = await pool.query("SELECT password FROM admins WHERE username = 'superadmin'");
const hash = result.rows[0].password;
console.log('Hash length:', hash.length);
console.log('Hash:', hash);
const match = await bcrypt.compare('MainAdmin@2026', hash);
console.log('Password match:', match);
await pool.end();