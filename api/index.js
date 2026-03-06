import pool from './db.js';
import seedAdmins from './seed.js';
import app from './server.js';

const PORT = process.env.PORT || 5000;
//  Connect to the database and start the server
pool.connect(async (err) => {
  if (err) {
    console.error('❌ Database connection error:', err.stack);
  } else {
    console.log('✅ Connected to PostgreSQL');
    await seedAdmins();
    app.listen(PORT, () => {
      console.log(`🚀 Server → http://localhost:${PORT}`);
      console.log('─────────────────────────────────────');
    });
  }
});