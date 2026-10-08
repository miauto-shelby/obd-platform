const crypto = require("crypto");
const { config } = require("../src/config");
const { connectToMongo } = require("../src/repositories/mongo");
const { UserRepository } = require("../src/repositories/userRepository");
const { SessionRepository } = require("../src/repositories/sessionRepository");
const { createToken } = require("../src/utils/jwt");

const email = String(process.argv[2] || "").trim().toLowerCase();

async function main() {
  if (process.env.POSTMAN_TEST_MODE !== "true") {
    throw new Error(
      "POSTMAN_TEST_MODE=true is required. Add it only to your local .env before generating a test token."
    );
  }

  if (!email || !email.includes("@")) {
    throw new Error(
      "Usage: npm run postman:token -- your-email@example.com"
    );
  }

  const mongo = await connectToMongo(config);

  try {
    const userRepository = new UserRepository(mongo.database);
    const sessionRepository = new SessionRepository(mongo.database);
    const user = await userRepository.findByEmail(email);

    if (!user) {
      throw new Error(
        "No user exists for that email. Log in to the mobile app once with that Google account, then try again."
      );
    }

    const sessionId = crypto.randomUUID();
    const accessJti = crypto.randomUUID();
    const expiresAt = new Date(
      Date.now() + config.accessTokenTtlSeconds * 1000
    );

    await sessionRepository.create({
      sessionId,
      userId: user.id,
      deviceId: "postman-local-validation",
      deviceName: "Postman local validation",
      platform: "POSTMAN",
      appVersion: "local",
      accessJti,
      currentRefreshJti: null,
      previousRefreshJti: null,
      refreshTokenHash: null,
      revoked: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt,
    });

    const accessToken = createToken(
      {
        sid: sessionId,
        sub: user.id,
        email: user.email,
        typ: "access",
        jti: accessJti,
      },
      config.jwtSecret,
      config.accessTokenTtlSeconds
    );

    console.log("Postman test token created. It expires in 1 hour.");
    console.log("Copy only the token below into the Postman accessToken variable:");
    console.log(accessToken);
  } finally {
    await mongo.client.close();
  }
}

main().catch((error) => {
  console.error(`Unable to create Postman test token: ${error.message}`);
  process.exit(1);
});
