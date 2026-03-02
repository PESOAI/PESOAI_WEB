import bcrypt from 'bcrypt';
import pool from './db.js';

const seedAdmins = async () => {
  const admins = [
    { username: 'superadmin', password: 'Admin@1234', role: 'Main Admin' },
    { username: 'staffadmin', password: 'Staff@1234', role: 'Staff Admin' },
  ];

  for (const admin of admins) {
    try {
      const exists = await pool.query('SELECT * FROM admins WHERE username = $1', [admin.username]);
      const hashed = await bcrypt.hash(admin.password, 10);

      if (exists.rows.length === 0) {
        await pool.query(
          'INSERT INTO admins (username, password, role) VALUES ($1, $2, $3)',
          [admin.username, hashed, admin.role]
        );
        console.log(`[SEED] Created: ${admin.username} (${admin.role})`);
      } else {
        await pool.query(
          'UPDATE admins SET password = $1 WHERE username = $2',
          [hashed, admin.username]
        );
        console.log(`[SEED] Password synced: ${admin.username}`);
      }
    } catch (err) {
      console.error(`[SEED ERROR] ${admin.username}:`, err.message);
    }
  }
};

export default seedAdmins;