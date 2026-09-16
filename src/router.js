const { ApiError } = require("./errors/apiError");
const {
  getBearerToken,
  readJsonBody,
  sendJson,
  sendNoContent,
} = require("./utils/http");

function createRouter(authService, vehicleService) {
  return async function router(req, res) {
    const url = new URL(req.url, "http://localhost");
    console.log(`[HTTP] ${req.method} ${url.pathname}`);

    if (req.method === "OPTIONS") {
      sendNoContent(res);
      return;
    }

    if (req.method === "GET" && url.pathname === "/health") {
      sendJson(res, 200, { status: "ok" });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/v1/auth/google") {
      const body = await readJsonBody(req);
      sendJson(res, 200, await authService.loginWithGoogle(body));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/v1/auth/refresh") {
      const body = await readJsonBody(req);
      sendJson(res, 200, await authService.refresh(body));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/v1/auth/logout") {
      const token = getBearerToken(req);
      if (!token) {
        throw new ApiError(
          "INVALID_ACCESS_TOKEN",
          "El Access Token no es valido.",
          401
        );
      }

      sendJson(res, 200, await authService.logout(token));
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/v1/auth/me") {
      const token = getBearerToken(req);
      if (!token) {
        throw new ApiError(
          "INVALID_ACCESS_TOKEN",
          "El Access Token no es valido.",
          401
        );
      }

      sendJson(res, 200, await authService.me(token));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/v1/vehicles") {
      const token = getBearerToken(req);
      if (!token) {
        throw new ApiError("INVALID_ACCESS_TOKEN", "El Access Token no es valido.", 401);
      }

      const body = await readJsonBody(req);
      sendJson(res, 201, await vehicleService.create(token, body));
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/v1/vehicles") {
      const token = getBearerToken(req);
      if (!token) {
        throw new ApiError("INVALID_ACCESS_TOKEN", "El Access Token no es valido.", 401);
      }

      sendJson(res, 200, { items: await vehicleService.list(token) });
      return;
    }

    throw new ApiError("NOT_FOUND", "Ruta no encontrada.", 404);
  };
}

module.exports = { createRouter };
