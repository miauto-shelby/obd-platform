const DEFAULT_USER = {
  id: "c8d2f4c1-3f8e-4b72-9d4d-1d3c1d8a8e11",
  firstName: "Juan",
  lastName: "Fajardo",
  email: "juan@gmail.com",
  photoUrl: "https://lh3.googleusercontent.com/",
};

class UserRepository {
  constructor() {
    this.usersById = new Map();
    this.usersByEmail = new Map();
  }

  getOrCreateDefaultUser() {
    return this.save(DEFAULT_USER);
  }

  findByEmail(email) {
    if (!email) {
      return null;
    }

    const key = String(email).toLowerCase();
    const userId = this.usersByEmail.get(key);
    if (!userId) {
      return null;
    }

    return this.usersById.get(userId) || null;
  }

  findById(id) {
    return this.usersById.get(id) || null;
  }

  save(user) {
    const stored = {
      ...user,
      email: String(user.email).toLowerCase(),
    };

    this.usersById.set(stored.id, stored);
    this.usersByEmail.set(stored.email, stored.id);
    return stored;
  }
}

module.exports = { UserRepository, DEFAULT_USER };
