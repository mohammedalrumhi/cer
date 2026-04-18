const { createApp } = require('./app');
const { closeStorage, initStorage } = require('./storage');

const PORT = process.env.PORT || 4000;

async function startServer() {
  const storage = await initStorage();
  const app = createApp({ storage });
  const server = app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });

  const shutdown = async () => {
    server.close(async () => {
      await closeStorage();
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  return server;
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  startServer,
};
