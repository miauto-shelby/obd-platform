const http = require("http");
const { config } = require("./config");
const { createAuthService } = require("./services/authService");
const { UserRepository } = require("./repositories/userRepository");
const { SessionRepository } = require("./repositories/sessionRepository");
const { createRouter } = require("./router");
const { handleError } = require("./utils/http");

function createApp() {
  const authService = createAuthService({
    config,
    userRepository: new UserRepository(),
    sessionRepository: new SessionRepository(),
  });

  const router = createRouter(authService);

  return http.createServer(async (req, res) => {
    try {
      await router(req, res);
    } catch (error) {
      handleError(res, error);
    }
  });
}

module.exports = { createApp };
