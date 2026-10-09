const { createApp } = require("./src/app");
const { config } = require("./src/config");
const { safeErrorSummary } = require("./src/utils/safeLogging");

async function start() {
  const { server, close } = await createApp();
  server.listen(config.port, () => {
    console.log(`OBD Platform backend listening on http://localhost:${config.port}`);
    console.log("Waiting for app requests...");
  });

  const shutdown = async () => {
    server.close(async () => {
      await close();
      process.exit(0);
    });
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

start().catch((error) => {
  console.error(`[SERVER] Unable to start backend: ${safeErrorSummary(error)}`);
  process.exit(1);
});
