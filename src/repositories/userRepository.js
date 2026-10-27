class UserRepository {
  constructor(database) {
    this.collection = database.collection("users");
  }

  async ensureIndexes() {
    await this.collection.updateMany(
      { roles: { $exists: false } },
      { $set: { roles: ["USER"], roleChangeHistory: [] } }
    );
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

  async findByEmail(email) {
    return this.toUser(
      await this.collection.findOne({ email: String(email).trim().toLowerCase() })
    );
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
          roles: ["USER"],
          roleChangeHistory: [],
        },
      },
      { upsert: true, returnDocument: "after", includeResultMetadata: false }
    );
    return this.toUser(document);
  }

  async grantRoleByEmail(email, role, changedBy) {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedRole = normalizeRole(role);
    const actor = String(changedBy || "").trim().toLowerCase();
    const now = new Date();

    const user = await this.collection.findOne({ email: normalizedEmail });
    if (!user) {
      return null;
    }

    const roles = normalizeRoles(user.roles);
    if (roles.includes(normalizedRole)) {
      return this.toUser(user);
    }

    const result = await this.collection.findOneAndUpdate(
      { _id: user._id },
      {
        $set: { roles: [...roles, normalizedRole], updatedAt: now },
        $push: {
          roleChangeHistory: {
            role: normalizedRole,
            action: "GRANTED",
            changedAt: now,
            changedBy: actor,
          },
        },
      },
      { returnDocument: "after", includeResultMetadata: false }
    );
    return this.toUser(result);
  }

  toUser(document) {
    if (!document) {
      return null;
    }

    return { ...document, id: document._id, roles: normalizeRoles(document.roles) };
  }
}

function normalizeRoles(roles) {
  const values = Array.isArray(roles) ? roles : ["USER"];
  const normalized = values
    .map((role) => String(role || "").trim().toUpperCase())
    .filter(Boolean);
  return normalized.length ? [...new Set(normalized)] : ["USER"];
}

function normalizeRole(role) {
  const normalized = String(role || "").trim().toUpperCase();
  if (normalized !== "ADMIN") {
    throw new Error("Only the ADMIN role can be granted through this command.");
  }
  return normalized;
}

module.exports = { UserRepository, normalizeRoles };
