const test = require("node:test");
const assert = require("node:assert/strict");

const { config } = require("../src/config");
const { createAuthService } = require("../src/services/authService");
const { ApiError } = require("../src/errors/apiError");

class MemoryUserRepository {
  constructor() {
    this.users = new Map();
  }

  async upsertGoogleUser(user) {
    const stored = this.users.get(user.providerUserId) || { ...user, disabled: false };
    const next = { ...stored, ...user };
    this.users.set(user.providerUserId, next);
    return next;
  }

  async findById(id) {
    return [...this.users.values()].find((user) => user.id === id) || null;
  }
}

class MemorySessionRepository {
  constructor() {
    this.sessions = new Map();
  }

  async create(session) {
    this.sessions.set(session.sessionId, { ...session });
    return session;
  }

  async findById(sessionId) {
    return this.sessions.get(sessionId) || null;
  }

  async rotate(update) {
    const session = await this.findById(update.sessionId);
    if (!session || session.revoked || session.currentRefreshJti !== update.currentRefreshJti) {
      return null;
    }
    Object.assign(session, {
      previousRefreshJti: update.currentRefreshJti,
      currentRefreshJti: update.nextRefreshJti,
      refreshTokenHash: update.refreshTokenHash,
      accessJti: update.accessJti,
      appVersion: update.appVersion,
    });
    return session;
  }

  async revoke(sessionId) {
    const session = await this.findById(sessionId);
    if (!session || session.revoked) {
      return null;
    }
    session.revoked = true;
    return session;
  }
}

function createService(payload = defaultGooglePayload()) {
  return createAuthService({
    config,
    userRepository: new MemoryUserRepository(),
    sessionRepository: new MemorySessionRepository(),
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

  const refreshed = await service.refresh({
    refreshToken: login.refreshToken,
    appVersion: "1.0.1",
  });

  assert.ok(refreshed.accessToken);
  assert.ok(refreshed.refreshToken);
  assert.equal(refreshed.tokenType, "Bearer");

  await assert.rejects(
    () =>
      service.refresh({
        refreshToken: login.refreshToken,
        appVersion: "1.0.1",
      }),
    (error) => error instanceof ApiError && error.code === "REFRESH_TOKEN_REUSED"
  );
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

  const me = await service.me(login.accessToken);

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

  const result = await service.logout(login.accessToken);
  assert.equal(result.message, "Sesi\u00F3n cerrada correctamente.");

  await assert.rejects(
    () => service.me(login.accessToken),
    (error) => error instanceof ApiError && error.code === "INVALID_ACCESS_TOKEN"
  );
});
