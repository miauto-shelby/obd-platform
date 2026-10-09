const test = require("node:test");
const assert = require("node:assert/strict");

const { UserRepository, normalizeRoles } = require("../src/repositories/userRepository");

class MemoryUsersCollection {
  constructor(document) {
    this.document = { ...document };
  }

  async findOne(query) {
    if (query.email && query.email !== this.document.email) return null;
    if (query._id && query._id !== this.document._id) return null;
    return { ...this.document };
  }

  async findOneAndUpdate(query, update) {
    assert.equal(query._id, this.document._id);
    Object.assign(this.document, update.$set);
    this.document.roleChangeHistory = [
      ...(this.document.roleChangeHistory || []),
      update.$push.roleChangeHistory,
    ];
    return { ...this.document };
  }
}

test("legacy users receive the normal USER role when read", () => {
  assert.deepEqual(normalizeRoles(undefined), ["USER"]);
  assert.deepEqual(normalizeRoles(["user", "ADMIN", "ADMIN"]), ["USER", "ADMIN"]);
});

test("granting ADMIN persists a role and an audit entry", async () => {
  const collection = new MemoryUsersCollection({
    _id: "user-1",
    email: "admin@example.com",
    roles: ["USER"],
    roleChangeHistory: [],
  });
  const repository = new UserRepository({ collection: () => collection });

  const user = await repository.grantRoleByEmail(
    "admin@example.com",
    "ADMIN",
    "operator@example.com"
  );

  assert.deepEqual(user.roles, ["USER", "ADMIN"]);
  assert.equal(collection.document.roleChangeHistory.length, 1);
  assert.equal(collection.document.roleChangeHistory[0].role, "ADMIN");
  assert.equal(collection.document.roleChangeHistory[0].changedBy, "operator@example.com");
});
