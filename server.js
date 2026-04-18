const { startServer } = require('./backend/src/server');

startServer().catch((error) => {
  console.error(error);
  process.exit(1);
});