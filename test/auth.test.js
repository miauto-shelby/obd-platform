const test = require("node:test");
const assert = require("node:assert/strict");

const { config } = require("../src/config");
const { createAuthService } = require("../src/services/authService");
const { UserRepository } = require("../src/repositories/userRepository");
const { SessionRepository } = require("../src/repositories/sessionRepository");
const { ApiError } = require("../src/errors/apiError");

function createService(payload = defaultGooglePayload()) {
  return createAuthService({
    config,
    userRepository: new UserRepository(),
    sessionRepository: new SessionRepository(),
    googleTokenVerifier: {
      verifyIdToken: async () => ({
        getPayload: () => payload,
      }),
    },
  });
}

function defaultGooglePayload() {
  return {
    sub: "google-sub-123",
    email: "juan@gmail.com",
    given_name: "Juan",
    family_name: "Fajardo",
    name: "Juan Fajardo",
    picture: "https://lh3.googleusercontent.com/a/default-user",
  };
}

test("login with google returns expected payload", async () => {
  const service = createService();

  const response = await service.loginWithGoogle({
    idToken: "google-id-token",
    deviceId: "device-123",
    deviceName: "Pixel 8",
    platform: "ANDROID",
    appVersion: "1.0.0",
  });

  assert.equal(response.tokenType, "Bearer");
  assert.equal(response.expiresIn, 3600);
  assert.ok(response.accessToken);
  assert.ok(response.refreshToken);
  assert.equal(response.user.name, "Juan");
  assert.equal(response.user.lastName, "Fajardo");
  assert.equal(response.user.email, "juan@gmail.com");
});

test("login rejects invalid google token", async () => {
  const service = createService();
  service.googleTokenVerifier = {
    verifyIdToken: async () => {
      throw new Error("invalid token");
    },
  };

  await assert.rejects(
    async () =>
      service.loginWithGoogle({
        idToken: "invalid-token",
        deviceId: "device-123",
        deviceName: "Pixel 8",
        platform: "ANDROID",
        appVersion: "1.0.0",
      }),
    (error) =>
      error instanceof ApiError &&
      error.code === "INVALID_GOOGLE_TOKEN" &&
      error.status === 401
  );
});

test("refresh rotates the refresh token", async () => {
  const service = createService();
  const login = await service.loginWithGoogle({
    idToken: "google-id-token",
    deviceId: "device-123",
    deviceName: "Pixel 8",
    platform: "ANDROID",
    appVersion: "1.0.0",
  });

  const refreshed = service.refresh({
    refreshToken: login.refreshToken,
    appVersion: "1.0.1",
  });

  assert.ok(refreshed.accessToken);
  assert.ok(refreshed.refreshToken);
  assert.equal(refreshed.tokenType, "Bearer");
});

test("me returns the authenticated user", async () => {
  const service = createService();
  const login = await service.loginWithGoogle({
    idToken: "google-id-token",
    deviceId: "device-123",
    deviceName: "Pixel 8",
    platform: "ANDROID",
    appVersion: "1.0.0",
  });

  const me = service.me(login.accessToken);

  assert.equal(me.firstName, "Juan");
  assert.equal(me.lastName, "Fajardo");
  assert.equal(me.email, "juan@gmail.com");
});

test("logout revokes the session", async () => {
  const service = createService();
  const login = await service.loginWithGoogle({
    idToken: "google-id-token",
    deviceId: "device-123",
    deviceName: "Pixel 8",
    platform: "ANDROID",
    appVersion: "1.0.0",
  });

  const result = service.logout(login.accessToken);
  assert.equal(result.message, "Sesi\u00F3n cerrada correctamente.");

  assert.throws(
    () => service.me(login.accessToken),
    (error) => error instanceof ApiError && error.code === "INVALID_ACCESS_TOKEN"
  );
});
