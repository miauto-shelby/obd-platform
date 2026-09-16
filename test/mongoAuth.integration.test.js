const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { MongoClient } = require("mongodb");

const { config } = require("../src/config");
const { ApiError } = require("../src/errors/apiError");
const { UserRepository } = require("../src/repositories/userRepository");
const { SessionRepository } = require("../src/repositories/sessionRepository");
const { VehicleRepository } = require("../src/repositories/vehicleRepository");
const { createAuthService } = require("../src/services/authService");
const { VehicleService } = require("../src/services/vehicleService");

const integrationDatabaseName = `${config.mongoDatabaseName}_integration_test`;

function createServices(database, runId) {
  const authService = createAuthService({
    config,
    userRepository: new UserRepository(database),
    sessionRepository: new SessionRepository(database),
    googleTokenVerifier: {
      verifyIdToken: async () => ({
        getPayload: () => ({
          sub: `integration-google-${runId}`,
          email: `integration-${runId}@example.invalid`,
          given_name: "Integration",
          family_name: "Test",
          picture: "https://example.invalid/photo.png",
        }),
      }),
    },
  });
  return {
    authService,
    vehicleService: new VehicleService({
      authService,
      vehicleRepository: new VehicleRepository(database),
    }),
  };
}

async function createRepositories(database) {
  const userRepository = new UserRepository(database);
  const sessionRepository = new SessionRepository(database);
  const vehicleRepository = new VehicleRepository(database);
  await Promise.all([
    userRepository.ensureIndexes(),
    sessionRepository.ensureIndexes(),
    vehicleRepository.ensureIndexes(),
  ]);
}

test("MongoDB persists, rotates, and revokes auth sessions", async () => {
  assert.ok(config.mongoUri, "MONGODB_URI is required for integration tests");
  assert.ok(!config.usesDevelopmentJwtSecret, "JWT_SECRET is required for integration tests");
  assert.match(integrationDatabaseName, /_integration_test$/);

  const runId = crypto.randomUUID();
  let client = new MongoClient(config.mongoUri);

  try {
    await client.connect();
    let database = client.db(integrationDatabaseName);
    await database.dropDatabase();
    await createRepositories(database);

    const services = createServices(database, runId);
    const login = await services.authService.loginWithGoogle({
      idToken: "integration-test-google-token",
      deviceId: "integration-device",
      deviceName: "Integration test device",
      platform: "ANDROID",
      appVersion: "1.0.0-test",
    });

    assert.ok(login.accessToken);
    assert.ok(login.refreshToken);
    assert.equal(await database.collection("users").countDocuments(), 1);
    assert.equal(await database.collection("sessions").countDocuments(), 1);
    const vehicle = await services.vehicleService.create(login.accessToken, {
      plate: "ABC123",
      brand: "Chevrolet",
      model: "Onix",
      year: 2022,
      currentMileage: 48500,
    });
    assert.equal(vehicle.plate, "ABC123");
    assert.equal(await database.collection("vehicles").countDocuments(), 1);

    await client.close();
    client = new MongoClient(config.mongoUri);
    await client.connect();
    database = client.db(integrationDatabaseName);
    await createRepositories(database);

    const restartedServices = createServices(database, runId);
    const meBeforeRefresh = await restartedServices.authService.me(login.accessToken);
    assert.equal(meBeforeRefresh.firstName, "Integration");
    const vehicles = await restartedServices.vehicleService.list(login.accessToken);
    assert.equal(vehicles.length, 1);
    assert.equal(vehicles[0].currentMileage, 48500);

    const refreshed = await restartedServices.authService.refresh({
      refreshToken: login.refreshToken,
      appVersion: "1.0.1-test",
    });
    assert.notEqual(refreshed.refreshToken, login.refreshToken);

    await assert.rejects(
      () =>
        restartedServices.authService.refresh({
          refreshToken: login.refreshToken,
          appVersion: "1.0.1-test",
        }),
      (error) => error instanceof ApiError && error.code === "REFRESH_TOKEN_REUSED"
    );

    const meAfterRefresh = await restartedServices.authService.me(refreshed.accessToken);
    assert.equal(meAfterRefresh.email, `integration-${runId}@example.invalid`);

    const logout = await restartedServices.authService.logout(refreshed.accessToken);
    assert.equal(logout.message, "Sesión cerrada correctamente.");

    await assert.rejects(
      () => restartedServices.authService.me(refreshed.accessToken),
      (error) => error instanceof ApiError && error.code === "INVALID_ACCESS_TOKEN"
    );

    const session = await database.collection("sessions").findOne({});
    assert.equal(session.revoked, true);
  } finally {
    if (client) {
      const database = client.db(integrationDatabaseName);
      await database.dropDatabase();
      await client.close();
    }
  }
});
