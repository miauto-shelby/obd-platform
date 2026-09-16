const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const { ApiError } = require("../errors/apiError");
const { createToken, verifyJwt } = require("../utils/jwt");

class AuthService {
  constructor({
    config,
    userRepository,
    sessionRepository,
    googleTokenVerifier,
  }) {
    this.config = config;
    this.userRepository = userRepository;
    this.sessionRepository = sessionRepository;
    this.googleTokenVerifier =
      googleTokenVerifier ||
      new OAuth2Client(this.config.googleWebClientId);
  }

  async loginWithGoogle(request) {
    this.ensureLoginRequest(request);
    console.log(
      `[AUTH] Google login request device=${request.deviceName} platform=${request.platform} appVersion=${request.appVersion}`
    );

    let payload;
    try {
      const ticket = await this.googleTokenVerifier.verifyIdToken({
        idToken: String(request.idToken),
        audience: this.config.googleWebClientId,
      });
      payload = ticket.getPayload();
    } catch (error) {
      console.log(`[AUTH] Google token verification failed: ${error.message}`);
      throw new ApiError(
        "INVALID_GOOGLE_TOKEN",
        "El token de Google no es v\u00E1lido.",
        401
      );
    }

    if (!payload || !payload.email || !payload.sub) {
      throw new ApiError(
        "INVALID_GOOGLE_TOKEN",
        "El token de Google no es v\u00E1lido.",
        401
      );
    }

    const user = await this.upsertGoogleUser(payload);
    if (user.disabled) {
      throw new ApiError("USER_DISABLED", "El usuario se encuentra deshabilitado en la aplicación.", 403);
    }
    const sessionId = crypto.randomUUID();
    const accessJti = crypto.randomUUID();
    const refreshJti = crypto.randomUUID();

    const refreshToken = this.createRefreshToken(user, sessionId, refreshJti);
    await this.sessionRepository.create({
      sessionId,
      userId: user.id,
      deviceId: String(request.deviceId),
      deviceName: String(request.deviceName),
      platform: String(request.platform),
      appVersion: String(request.appVersion),
      accessJti,
      currentRefreshJti: refreshJti,
      previousRefreshJti: null,
      refreshTokenHash: this.hashToken(refreshToken),
      revoked: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: new Date(Date.now() + this.config.refreshTokenTtlSeconds * 1000),
    });

    const accessToken = this.createAccessToken(user, sessionId, accessJti);
    console.log(`[AUTH] Google login success session=${sessionId}`);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.config.accessTokenTtlSeconds,
      tokenType: "Bearer",
      user: this.toLoginUser(user),
    };
  }

  async upsertGoogleUser(payload) {
    const email = String(payload.email || "").trim().toLowerCase();
    const [firstName, ...rest] = String(
      payload.given_name || payload.name || email.split("@")[0] || "Usuario"
    )
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const lastName = String(payload.family_name || rest.join(" ") || "").trim();

    const user = {
      id: String(payload.sub || crypto.randomUUID()),
      providerUserId: String(payload.sub),
      firstName: firstName || "Usuario",
      lastName,
      email,
      photoUrl: String(payload.picture || "https://lh3.googleusercontent.com/"),
    };

    return this.userRepository.upsertGoogleUser(user);
  }

  async refresh(request) {
    this.ensureRefreshRequest(request);
    console.log(`[AUTH] Refresh request appVersion=${request.appVersion}`);

    const payload = verifyJwt(
      request.refreshToken,
      this.config.jwtSecret,
      "refresh"
    );

    const session = await this.sessionRepository.findById(payload.sid);
    if (!session || session.revoked) {
      throw new ApiError(
        "REFRESH_TOKEN_INVALID",
        "El token no existe o fue alterado.",
        401
      );
    }

    if (session.previousRefreshJti === payload.jti) {
      throw new ApiError(
        "REFRESH_TOKEN_REUSED",
        "Se intento reutilizar un Refresh Token ya rotado.",
        401
      );
    }

    if (session.currentRefreshJti !== payload.jti) {
      throw new ApiError(
        "REFRESH_TOKEN_INVALID",
        "El token no existe o fue alterado.",
        401
      );
    }

    if (session.refreshTokenHash !== this.hashToken(request.refreshToken)) {
      throw new ApiError(
        "REFRESH_TOKEN_INVALID",
        "El token no existe o fue alterado.",
        401
      );
    }

    const user = await this.userRepository.findById(session.userId);
    if (!user) {
      throw new ApiError(
        "REFRESH_TOKEN_INVALID",
        "El token no existe o fue alterado.",
        401
      );
    }

    const nextAccessJti = crypto.randomUUID();
    const nextRefreshJti = crypto.randomUUID();

    const nextRefreshToken = this.createRefreshToken(
      user,
      session.sessionId,
      nextRefreshJti
    );
    const rotatedSession = await this.sessionRepository.rotate({
      sessionId: session.sessionId,
      currentRefreshJti: payload.jti,
      nextRefreshJti,
      refreshTokenHash: this.hashToken(nextRefreshToken),
      accessJti: nextAccessJti,
      appVersion: String(request.appVersion),
    });

    if (!rotatedSession) {
      throw new ApiError(
        "REFRESH_TOKEN_REUSED",
        "Se intentó reutilizar un Refresh Token ya rotado.",
        401
      );
    }

    return {
      accessToken: this.createAccessToken(user, session.sessionId, nextAccessJti),
      refreshToken: nextRefreshToken,
      tokenType: "Bearer",
      expiresIn: this.config.accessTokenTtlSeconds,
    };
  }

  async logout(accessToken) {
    const payload = verifyJwt(accessToken, this.config.jwtSecret, "access");
    const session = await this.sessionRepository.findById(payload.sid);

    if (!session || session.revoked) {
      throw new ApiError(
        "SESSION_NOT_FOUND",
        "No existe una sesi\u00F3n activa para el dispositivo.",
        401
      );
    }

    await this.sessionRepository.revoke(session.sessionId);
    console.log(`[AUTH] Logout success session=${payload.sid}`);
    return { message: "Sesi\u00F3n cerrada correctamente." };
  }

  async me(accessToken) {
    const user = await this.getAuthenticatedUser(accessToken);

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      photoUrl: user.photoUrl,
    };
  }

  async getAuthenticatedUser(accessToken) {
    const payload = verifyJwt(accessToken, this.config.jwtSecret, "access");
    const session = await this.sessionRepository.findById(payload.sid);

    if (!session || session.revoked) {
      throw new ApiError(
        "INVALID_ACCESS_TOKEN",
        "El Access Token no es valido.",
        401
      );
    }

    const user = await this.userRepository.findById(session.userId);
    if (!user) {
      throw new ApiError(
        "INVALID_ACCESS_TOKEN",
        "El Access Token no es valido.",
        401
      );
    }

    return user;
  }

  ensureLoginRequest(request) {
    const required = ["idToken", "deviceId", "deviceName", "platform", "appVersion"];
    const missing = required.some((key) => !String(request?.[key] || "").trim());
    if (missing) {
      throw new ApiError(
        "VALIDATION_ERROR",
        "La solicitud contiene datos invalidos o faltantes.",
        400
      );
    }
  }

  ensureRefreshRequest(request) {
    const required = ["refreshToken", "appVersion"];
    const missing = required.some((key) => !String(request?.[key] || "").trim());
    if (missing) {
      throw new ApiError(
        "VALIDATION_ERROR",
        "La solicitud contiene datos invalidos o faltantes.",
        400
      );
    }
  }

  createAccessToken(user, sessionId, jti) {
    return createToken(
      {
        sid: sessionId,
        sub: user.id,
        email: user.email,
        typ: "access",
        jti,
      },
      this.config.jwtSecret,
      this.config.accessTokenTtlSeconds
    );
  }

  createRefreshToken(user, sessionId, jti) {
    return createToken(
      {
        sid: sessionId,
        sub: user.id,
        email: user.email,
        typ: "refresh",
        jti,
      },
      this.config.jwtSecret,
      this.config.refreshTokenTtlSeconds
    );
  }

  hashToken(token) {
    return crypto.createHash("sha256").update(String(token)).digest("hex");
  }

  toLoginUser(user) {
    return {
      id: user.id,
      name: user.firstName,
      lastName: user.lastName,
      email: user.email,
      photoUrl: user.photoUrl,
    };
  }
}

function createAuthService(dependencies) {
  return new AuthService(dependencies);
}

module.exports = { createAuthService, AuthService };
