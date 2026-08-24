const { ApiError } = require("../errors/apiError");

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function sendNoContent(res) {
  res.statusCode = 204;
  res.end();
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";

    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(
          new ApiError(
            "VALIDATION_ERROR",
            "La solicitud contiene datos invalidos o faltantes.",
            400
          )
        );
        req.destroy();
      }
    });

    req.on("end", () => {
      if (!raw.trim()) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(
          new ApiError(
            "VALIDATION_ERROR",
            "La solicitud contiene datos invalidos o faltantes.",
            400
          )
        );
      }
    });

    req.on("error", reject);
  });
}

function getBearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization;
  if (!header || typeof header !== "string") {
    return null;
  }

  const [type, token] = header.split(" ");
  if (type !== "Bearer" || !token) {
    return null;
  }

  return token.trim();
}

function handleError(res, error) {
  if (error instanceof ApiError) {
    sendJson(res, error.status, { code: error.code, message: error.message });
    return;
  }

  sendJson(res, 500, {
    code: "INTERNAL_ERROR",
    message: "Ocurrio un error interno.",
  });
}

module.exports = {
  handleError,
  getBearerToken,
  readJsonBody,
  sendJson,
  sendNoContent,
};
