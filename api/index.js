// api/index.js  –  PESO AI  (server entry point)
import 'dotenv/config';
import app from './server.js';
import { initSchema } from './db.js'; // ← was ../db.js
import seedAdmins from './seed.js';

const PORT = process.env.PORT || 5000;

async function start() {
  await initSchema();
  await seedAdmins();

  app.listen(PORT, () => {
    console.log(`🚀  PESO AI API running → http://localhost:${PORT}`);
    console.log('    Routes: /api/auth | /api/logs | /api/users | /api/admin/*');
  });
}

start().catch(err => {
  console.error('❌  Failed to start server:', err);
  process.exit(1);
});