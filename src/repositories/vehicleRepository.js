class VehicleRepository {
  constructor(database) {
    this.collection = database.collection("vehicles");
  }

  async ensureIndexes() {
    await this.collection.createIndex(
      { userId: 1, plateNormalized: 1 },
      { unique: true }
    );
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
