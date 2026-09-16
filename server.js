const { createApp } = require("./src/app");
const { config } = require("./src/config");

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
  console.error(`Unable to start backend: ${error.message}`);
  process.exit(1);
});
