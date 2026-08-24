const { createApp } = require("./src/app");
const { config } = require("./src/config");

const app = createApp();

app.listen(config.port, () => {
  console.log(`OBD Platform backend listening on http://localhost:${config.port}`);
  console.log("Waiting for app requests...");
});
