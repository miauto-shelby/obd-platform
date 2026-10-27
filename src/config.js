require("dotenv").config({ quiet: true });

const config = {
  port: Number(process.env.PORT || 8080),
  jwtSecret:
    process.env.JWT_SECRET || "obd-platform-secret-key-for-development-only-123",
  usesDevelopmentJwtSecret: !process.env.JWT_SECRET,
  googleWebClientId:
    process.env.GOOGLE_WEB_CLIENT_ID ||
    process.env.GOOGLE_SERVER_CLIENT_ID ||
    "1001362850388-h14mgg5umq5cdopv2qdbkj3fud4u31th.apps.googleusercontent.com",
  accessTokenTtlSeconds: 60 * 60,
  refreshTokenTtlSeconds: 60 * 60 * 24 * 7,
  mongoUri: process.env.MONGODB_URI || "",
  mongoDatabaseName: process.env.MONGODB_DATABASE || "my_auto",
};

module.exports = { config };
