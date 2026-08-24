const crypto = require("crypto");
const { ApiError } = require("../errors/apiError");

function base64UrlEncode(value) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signJwt(payload, secret) {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("base64url");

  return `${data}.${signature}`;
}

function verifyJwt(token, secret, kind) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) {
    throw new ApiError(
      kind === "refresh" ? "REFRESH_TOKEN_INVALID" : "INVALID_ACCESS_TOKEN",
      kind === "refresh"
        ? "El token no existe o fue alterado."
        : "El Access Token no es valido.",
      401
    );
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const data = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("base64url");

  if (signature.length !== expectedSignature.length) {
    throw new ApiError(
      kind === "refresh" ? "REFRESH_TOKEN_INVALID" : "INVALID_ACCESS_TOKEN",
      kind === "refresh"
        ? "El token no existe o fue alterado."
        : "El Access Token no es valido.",
      401
    );
  }

  if (
    !crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  ) {
    throw new ApiError(
      kind === "refresh" ? "REFRESH_TOKEN_INVALID" : "INVALID_ACCESS_TOKEN",
      kind === "refresh"
        ? "El token no existe o fue alterado."
        : "El Access Token no es valido.",
      401
    );
  }

  const payload = JSON.parse(base64UrlDecode(encodedPayload));
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === "number" && payload.exp <= now) {
    throw new ApiError(
      kind === "refresh" ? "REFRESH_TOKEN_EXPIRED" : "TOKEN_EXPIRED",
      kind === "refresh"
        ? "El Refresh Token expir\u00F3."
        : "El Access Token ha expirado.",
      401
    );
  }

  return payload;
}

function createToken(payload, secret, expiresInSeconds) {
  const now = Math.floor(Date.now() / 1000);
  return signJwt(
    {
      ...payload,
      iat: now,
      exp: now + expiresInSeconds,
    },
    secret
  );
}

module.exports = {
  createToken,
  verifyJwt,
};
