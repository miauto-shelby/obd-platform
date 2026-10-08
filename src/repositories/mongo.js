const { MongoClient } = require("mongodb");

async function connectToMongo(config) {
  if (!config.mongoUri) {
    throw new Error("MONGODB_URI is required. Configure it in .env before starting the backend.");
  }

  const client = new MongoClient(config.mongoUri, {
    serverSelectionTimeoutMS: 5000,
  });

  await client.connect();
  const database = client.db(config.mongoDatabaseName);
  await database.command({ ping: 1 });
  console.log(`[MONGO] Connected to database=${config.mongoDatabaseName}`);
  return { client, database };
}

module.exports = { connectToMongo };
