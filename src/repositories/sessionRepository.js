class SessionRepository {
  constructor(database) {
    this.collection = database.collection("sessions");
  }

  async ensureIndexes() {
    await Promise.all([
      this.collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      this.collection.createIndex({ userId: 1, revoked: 1 }),
    ]);
  }

  async create(session) {
    await this.collection.insertOne({ ...session, _id: session.sessionId });
    return session;
  }

  async findById(sessionId) {
    return this.collection.findOne({ _id: sessionId });
  }

  async rotate({ sessionId, currentRefreshJti, nextRefreshJti, refreshTokenHash, accessJti, appVersion }) {
    const result = await this.collection.findOneAndUpdate(
      { _id: sessionId, revoked: false, currentRefreshJti },
      {
        $set: {
          previousRefreshJti: currentRefreshJti,
          currentRefreshJti: nextRefreshJti,
          refreshTokenHash,
          accessJti,
          appVersion,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after", includeResultMetadata: false }
    );
    return result;
  }

  async revoke(sessionId) {
    return this.collection.findOneAndUpdate(
      { _id: sessionId, revoked: false },
      { $set: { revoked: true, revokedAt: new Date(), updatedAt: new Date() } },
      { returnDocument: "after", includeResultMetadata: false }
    );
  }
}

module.exports = { SessionRepository };
