import { app } from './app';
import { connectDatabaseWithRetry, disconnectDatabase, env } from './config/env';

async function start() {
  await connectDatabaseWithRetry();

  const server = app.listen(env.PORT, '0.0.0.0', () => {
    console.log(`API listening on port ${env.PORT}`);
  });

  const shutdown = () => {
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  };

  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

void start().catch(() => {
  console.error('API could not connect to the database after multiple attempts');
  process.exit(1);
});
