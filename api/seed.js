// seed.js  –  PESO AI
// Inserts hashed admin accounts + default categories
// Run: node seed.js

import bcrypt from 'bcrypt';
import pool from './db.js';

export default async function seedAdmins() {
  try {
    // Check if already seeded
    const existing = await pool.query('SELECT COUNT(*) FROM admins');
    if (parseInt(existing.rows[0].count) > 0) {
      console.log('⏭️  Admins already seeded, skipping.');
      return;
    }

    // Hash passwords
    const mainAdminHash  = await bcrypt.hash('MainAdmin@2026',  10);
    const staffAdminHash = await bcrypt.hash('StaffAdmin@2026', 10);

    // Insert into admins table
    await pool.query(`
      INSERT INTO admins (username, password, role) VALUES
        ('superadmin', $1, 'Main Admin'),
        ('admin1',     $2, 'Staff Admin'),
        ('admin2',     $2, 'Staff Admin')
    `, [mainAdminHash, staffAdminHash]);

    console.log('✅ Admins seeded');
    console.log('─────────────────────────────────');
    console.log('superadmin  →  MainAdmin@2026   (Main Admin)');
    console.log('admin1      →  StaffAdmin@2026  (Staff Admin)');
    console.log('admin2      →  StaffAdmin@2026  (Staff Admin)');
    console.log('─────────────────────────────────');

    // Insert default global categories
    const catCheck = await pool.query('SELECT COUNT(*) FROM categories');
    if (parseInt(catCheck.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO categories (user_id, name, type, color_hex, icon) VALUES
          (NULL, 'Salary',     'income',  '#22C55E', 'wallet'),
          (NULL, 'Freelance',  'income',  '#3B82F6', 'briefcase'),
          (NULL, 'Business',   'income',  '#8B5CF6', 'trending-up'),
          (NULL, 'Food',       'expense', '#EF4444', 'utensils'),
          (NULL, 'Transport',  'expense', '#3B82F6', 'car'),
          (NULL, 'Bills',      'expense', '#F59E0B', 'file-text'),
          (NULL, 'Shopping',   'expense', '#EC4899', 'shopping-bag'),
          (NULL, 'Healthcare', 'expense', '#14B8A6', 'heart'),
          (NULL, 'Education',  'expense', '#6366F1', 'book'),
          (NULL, 'Recreation', 'expense', '#F97316', 'gamepad')
      `);
      console.log('✅ Default categories seeded');
    }

  } catch (err) {
    console.error('❌ Seed error:', err.message);
  }
}