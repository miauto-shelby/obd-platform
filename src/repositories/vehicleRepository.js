class VehicleRepository {
  constructor(database) {
    this.collection = database.collection("vehicles");
  }

  async ensureIndexes() {
    const duplicatePlate = await this.collection
      .aggregate([
        {
          $group: {
            _id: "$plateNormalized",
            vehicleIds: { $push: "$_id" },
            count: { $sum: 1 },
          },
        },
        { $match: { _id: { $ne: null }, count: { $gt: 1 } } },
        { $limit: 1 },
      ])
      .next();

    if (duplicatePlate) {
      throw new Error(
        `Cannot enforce globally unique plates until duplicate vehicles are reviewed: ${duplicatePlate.vehicleIds.join(", ")}`
      );
    }

    await this.collection.createIndex(
      { plateNormalized: 1 },
      { unique: true, name: "plateNormalized_unique" }
    );
    try {
      await this.collection.dropIndex("userId_1_plateNormalized_1");
    } catch (error) {
      if (error.codeName !== "IndexNotFound") {
        throw error;
      }
    }
    await this.collection.createIndex({ userId: 1, updatedAt: -1 });
  }

  async create(vehicle) {
    await this.collection.insertOne({ ...vehicle, _id: vehicle.id });
    return this.toVehicle(vehicle);
  }

  async listByUserId(userId) {
    const documents = await this.collection
      .find({ userId })
      .sort({ updatedAt: -1, createdAt: -1 })
      .toArray();
    return documents.map((document) => this.toVehicle(document));
  }

  async findByIdAndUserId(vehicleId, userId) {
    const document = await this.collection.findOne({ _id: vehicleId, userId });
    return this.toVehicle(document);
  }

  async findById(vehicleId) {
    return this.toVehicle(await this.collection.findOne({ _id: vehicleId }));
  }

  async updateVinByIdAndUserId(vehicleId, userId, vin, updatedAt) {
    const result = await this.collection.findOneAndUpdate(
      { _id: vehicleId, userId },
      { $set: { vin, updatedAt } },
      { returnDocument: "after" }
    );
    return this.toVehicle(result);
  }

  async updateProfileByIdAndUserId(vehicleId, userId, changes, updatedAt) {
    const result = await this.collection.findOneAndUpdate(
      { _id: vehicleId, userId },
      { $set: { ...changes, updatedAt } },
      { returnDocument: "after" }
    );
    return this.toVehicle(result);
  }

  async updatePlateById(vehicleId, plate, plateNormalized, auditEntry, updatedAt) {
    const result = await this.collection.findOneAndUpdate(
      { _id: vehicleId },
      {
        $set: { plate, plateNormalized, updatedAt },
        $push: { plateChangeHistory: auditEntry },
      },
      { returnDocument: "after" }
    );
    return this.toVehicle(result);
  }

  toVehicle(document) {
    if (!document) {
      return null;
    }

    return {
      vehicleId: document._id,
      nickname: document.nickname,
      plate: document.plate,
      vin: document.vin,
      brand: document.brand,
      model: document.model,
      year: document.year,
      engine: document.engine,
      fuelType: document.fuelType,
      transmission: document.transmission,
      currentMileage: document.currentMileage,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }
}

module.exports = { VehicleRepository };
