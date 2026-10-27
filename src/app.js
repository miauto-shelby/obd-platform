const http = require("http");
const { config } = require("./config");
const { createAuthService } = require("./services/authService");
const { UserRepository } = require("./repositories/userRepository");
const { SessionRepository } = require("./repositories/sessionRepository");
const { VehicleRepository } = require("./repositories/vehicleRepository");
const { connectToMongo } = require("./repositories/mongo");
const { createRouter } = require("./router");
const { VehicleService } = require("./services/vehicleService");
const { handleError } = require("./utils/http");

async function createApp() {
  if (config.usesDevelopmentJwtSecret) {
    throw new Error("JWT_SECRET is required. Configure a unique secret in .env before starting the backend.");
  }

  const mongo = await connectToMongo(config);
  const authService = createAuthService({
    config,
    userRepository: new UserRepository(mongo.database),
    sessionRepository: new SessionRepository(mongo.database),
  });
  const vehicleService = new VehicleService({
    authService,
    vehicleRepository: new VehicleRepository(mongo.database),
  });
  await Promise.all([
    authService.userRepository.ensureIndexes(),
    authService.sessionRepository.ensureIndexes(),
    vehicleService.vehicleRepository.ensureIndexes(),
  ]);

  const router = createRouter(authService, vehicleService);

  const server = http.createServer(async (req, res) => {
    try {
      await router(req, res);
    } catch (error) {
      handleError(res, error);
    }
  });

  return { server, close: () => mongo.client.close() };
}

module.exports = { createApp };
