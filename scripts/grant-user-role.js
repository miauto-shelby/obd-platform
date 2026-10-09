const { config } = require("../src/config");
const { connectToMongo } = require("../src/repositories/mongo");
const { UserRepository } = require("../src/repositories/userRepository");

const email = String(process.argv[2] || "").trim().toLowerCase();
const role = String(process.argv[3] || "ADMIN").trim().toUpperCase();
const changedBy = String(process.env.ROLE_CHANGE_ACTOR || "").trim().toLowerCase();

async function main() {
  if (process.env.ADMIN_ROLE_MAINTENANCE !== "true") {
    throw new Error(
      "ADMIN_ROLE_MAINTENANCE=true is required for an intentional local role change."
    );
  }
  if (!email || !email.includes("@")) {
    throw new Error("Usage: npm run admin:grant-role -- user@example.com ADMIN");
  }
  if (!changedBy || !changedBy.includes("@")) {
    throw new Error("ROLE_CHANGE_ACTOR must identify the administrator making the change.");
  }

  const mongo = await connectToMongo(config);
  try {
    const user = await new UserRepository(mongo.database).grantRoleByEmail(
      email,
      role,
      changedBy
    );
    if (!user) {
      throw new Error(
        "No user exists for that email. The person must sign in once before receiving a role."
      );
    }
    console.log(`Role ${role} is now active for ${user.email}.`);
  } finally {
    await mongo.client.close();
  }
}

main().catch((error) => {
  console.error(
    "[ADMIN] Unable to change role. Verify the local configuration and the user email."
  );
  process.exit(1);
});
