class SessionRepository {
  constructor() {
    this.sessionsById = new Map();
  }

  create(session) {
    this.sessionsById.set(session.sessionId, session);
    return session;
  }

  findById(sessionId) {
    return this.sessionsById.get(sessionId) || null;
  }

  revoke(sessionId) {
    const session = this.findById(sessionId);
    if (!session) {
      return null;
    }

    session.revoked = true;
    return session;
  }
}

module.exports = { SessionRepository };
