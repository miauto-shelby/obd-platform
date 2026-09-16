class UserRepository {
  constructor(database) {
    this.collection = database.collection("users");
  }

  async ensureIndexes() {
    await Promise.all([
      this.collection.createIndex({ provider: 1, providerUserId: 1 }, { unique: true }),
      this.collection.createIndex({ email: 1 }),
    ]);
  }

  async findByGoogleIdentity(providerUserId) {
    return this.toUser(
      await this.collection.findOne({ provider: "google", providerUserId })
    );
  }

  async findById(id) {
    return this.toUser(await this.collection.findOne({ _id: id }));
  }

  async upsertGoogleUser(user) {
    const now = new Date();
    const document = await this.collection.findOneAndUpdate(
      { provider: "google", providerUserId: user.providerUserId },
      {
        $set: {
          firstName: user.firstName,
          lastName: user.lastName,
          email: String(user.email).toLowerCase(),
          photoUrl: user.photoUrl,
          updatedAt: now,
        },
        $setOnInsert: {
          _id: user.id,
          provider: "google",
          providerUserId: user.providerUserId,
          createdAt: now,
          disabled: false,
        },
      },
      { upsert: true, returnDocument: "after", includeResultMetadata: false }
    );
    return this.toUser(document);
  }

  toUser(document) {
    if (!document) {
      return null;
    }

    return { ...document, id: document._id };
  }
}

module.exports = { UserRepository };
