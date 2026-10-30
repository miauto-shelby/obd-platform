class VehicleBrandRepository {
  constructor(database) {
    this.collection = database.collection("vehicleBrands");
  }

  async ensureIndexes() {
    await this.collection.createIndex({ name: 1 }, { unique: true, name: "vehicle_brand_name_unique" });
  }

  async seed(names) {
    await Promise.all(
      names.map((name) =>
        this.collection.updateOne(
          { name },
          { $setOnInsert: { _id: name, name, active: true, createdAt: new Date(), updatedAt: new Date() } },
          { upsert: true }
        )
      )
    );
  }

  async listActive() {
    return this.collection.find({ active: true }).sort({ name: 1 }).toArray();
  }

  async findActiveByName(name) {
    return this.collection.findOne({ name, active: true });
  }

  async upsert(name, updatedAt) {
    const result = await this.collection.findOneAndUpdate(
      { name },
      { $set: { name, active: true, updatedAt }, $setOnInsert: { _id: name, createdAt: updatedAt } },
      { upsert: true, returnDocument: "after" }
    );
    return result;
  }

  async update(brandId, changes, updatedAt) {
    return this.collection.findOneAndUpdate(
      { _id: brandId },
      { $set: { ...changes, updatedAt } },
      { returnDocument: "after" }
    );
  }
}

module.exports = { VehicleBrandRepository };
