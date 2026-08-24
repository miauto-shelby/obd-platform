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

    if (!payload || !payload.email) {
      throw new ApiError(
        "INVALID_GOOGLE_TOKEN",
        "El token de Google no es v\u00E1lido.",
        401
      );
    }

    const user = this.upsertGoogleUser(payload);
    const sessionId = crypto.randomUUID();
    const accessJti = crypto.randomUUID();
    const refreshJti = crypto.randomUUID();

    this.sessionRepository.create({
      sessionId,
      userId: user.id,
      deviceId: String(request.deviceId),
      deviceName: String(request.deviceName),
      platform: String(request.platform),
      appVersion: String(request.appVersion),
      accessJti,
      currentRefreshJti: refreshJti,
      previousRefreshJti: null,
      revoked: false,
    });

    const accessToken = this.createAccessToken(user, sessionId, accessJti);
    const refreshToken = this.createRefreshToken(user, sessionId, refreshJti);
    console.log(`[AUTH] Google login success user=${user.email} session=${sessionId}`);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.config.accessTokenTtlSeconds,
      tokenType: "Bearer",
      user: this.toLoginUser(user),
    };
  }

  upsertGoogleUser(payload) {
    const email = String(payload.email || "").trim().toLowerCase();
    const existing = this.userRepository.findByEmail(email);
    const [firstName, ...rest] = String(
      payload.given_name || payload.name || email.split("@")[0] || "Usuario"
    )
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const lastName = String(payload.family_name || rest.join(" ") || "").trim();

    const user = {
      id: existing?.id || String(payload.sub || crypto.randomUUID()),
      firstName: existing?.firstName || firstName || "Usuario",
      lastName: existing?.lastName || lastName,
      email: existing?.email || email,
      photoUrl:
        existing?.photoUrl ||
        String(payload.picture || "https://lh3.googleusercontent.com/"),
    };

    return this.userRepository.save(user);
  }

  refresh(request) {
    this.ensureRefreshRequest(request);
    console.log(`[AUTH] Refresh request appVersion=${request.appVersion}`);

    const payload = verifyJwt(
      request.refreshToken,
      this.config.jwtSecret,
      "refresh"
    );

    const session = this.sessionRepository.findById(payload.sid);
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

    const user = this.userRepository.findById(session.userId);
    if (!user) {
      throw new ApiError(
        "REFRESH_TOKEN_INVALID",
        "El token no existe o fue alterado.",
        401
      );
    }

    const nextAccessJti = crypto.randomUUID();
    const nextRefreshJti = crypto.randomUUID();

    session.previousRefreshJti = session.currentRefreshJti;
    session.currentRefreshJti = nextRefreshJti;
    session.accessJti = nextAccessJti;
    session.appVersion = String(request.appVersion);

    return {
      accessToken: this.createAccessToken(user, session.sessionId, nextAccessJti),
      refreshToken: this.createRefreshToken(user, session.sessionId, nextRefreshJti),
      tokenType: "Bearer",
      expiresIn: this.config.accessTokenTtlSeconds,
    };
  }

  logout(accessToken) {
    const payload = verifyJwt(accessToken, this.config.jwtSecret, "access");
    const session = this.sessionRepository.findById(payload.sid);

    if (!session || session.revoked) {
      throw new ApiError(
        "SESSION_NOT_FOUND",
        "No existe una sesi\u00F3n activa para el dispositivo.",
        401
      );
    }

    session.revoked = true;
    console.log(`[AUTH] Logout success user=${payload.sub} session=${payload.sid}`);
    return { message: "Sesi\u00F3n cerrada correctamente." };
  }

  me(accessToken) {
    const payload = verifyJwt(accessToken, this.config.jwtSecret, "access");
    const session = this.sessionRepository.findById(payload.sid);

    if (!session || session.revoked) {
      throw new ApiError(
        "INVALID_ACCESS_TOKEN",
        "El Access Token no es valido.",
        401
      );
    }

    const user = this.userRepository.findById(session.userId);
    if (!user) {
      throw new ApiError(
        "INVALID_ACCESS_TOKEN",
        "El Access Token no es valido.",
        401
      );
    }

    console.log(`[AUTH] Me request user=${user.email} session=${payload.sid}`);

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      photoUrl: user.photoUrl,
    };
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
