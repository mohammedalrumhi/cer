const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const { createApp } = require("./app");
const { closeStorage, initStorage } = require("./storage");

const envFiles = [
  path.resolve(__dirname, "../../.env"),
  path.resolve(__dirname, "../.env"),
];

for (const envFile of envFiles) {
  if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile, override: false });
  }
}

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

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

startServer().catch((error) => {
  console.error(error);
  process.exit(1);
});
