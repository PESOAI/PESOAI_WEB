import 'dotenv/config';
import app from './server.js';
import { initSchema } from './config/db.js';
import seedAdmins from './seed.js';
import { PORT } from './config/index.js';

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