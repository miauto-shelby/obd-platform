const test = require("node:test");
const assert = require("node:assert/strict");
const { ApiError } = require("../src/errors/apiError");
const { VehicleService } = require("../src/services/vehicleService");

class MemoryVehicleRepository {
  constructor() {
    this.vehicles = [];
  }

  async create(vehicle) {
    if (this.vehicles.some((item) => item.userId === vehicle.userId && item.plateNormalized === vehicle.plateNormalized)) {
      const error = new Error("duplicate key");
      error.code = 11000;
      throw error;
    }
    this.vehicles.push(vehicle);
    return this.toVehicle(vehicle);
  }

  async listByUserId(userId) {
    return this.vehicles.filter((vehicle) => vehicle.userId === userId).map((vehicle) => this.toVehicle(vehicle));
  }

  async findByIdAndUserId(vehicleId, userId) {
    return this.toVehicle(this.vehicles.find((vehicle) => vehicle.id === vehicleId && vehicle.userId === userId));
  }

  async updateVinByIdAndUserId(vehicleId, userId, vin, updatedAt) {
    const vehicle = this.vehicles.find((item) => item.id === vehicleId && item.userId === userId);
    if (!vehicle) return null;
    vehicle.vin = vin;
    vehicle.updatedAt = updatedAt;
    return this.toVehicle(vehicle);
  }

  toVehicle(vehicle) {
    if (!vehicle) return null;
    return {
      vehicleId: vehicle.id,
      nickname: vehicle.nickname,
      plate: vehicle.plate,
      vin: vehicle.vin,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      engine: vehicle.engine,
      fuelType: vehicle.fuelType,
      transmission: vehicle.transmission,
      currentMileage: vehicle.currentMileage,
    };
  }
}

function createService(userId = "user-1") {
  return new VehicleService({
    authService: { getAuthenticatedUser: async () => ({ id: userId }) },
    vehicleRepository: new MemoryVehicleRepository(),
  });
}

function validRequest() {
  return { plate: "abc 123", brand: "Chevrolet", model: "Onix", year: 2022, currentMileage: 48500 };
}

test("creates and lists vehicles only for the authenticated user", async () => {
  const service = createService();
  const vehicle = await service.create("access-token", validRequest());

  assert.equal(vehicle.plate, "ABC 123");
  assert.equal(vehicle.currentMileage, 48500);
  assert.equal(vehicle.nickname, null);
  assert.equal(vehicle.vin, null);
  assert.deepEqual(await service.list("access-token"), [vehicle]);
});

test("rejects duplicate plates for the same user", async () => {
  const service = createService();
  await service.create("access-token", validRequest());

  await assert.rejects(
    () => service.create("access-token", validRequest()),
    (error) => error instanceof ApiError && error.code === "VEHICLE_ALREADY_EXISTS" && error.status === 409
  );
});

test("stores optional vehicle data when it is provided", async () => {
  const service = createService();
  const detailed = await service.create("access-token", {
    ...validRequest(),
    nickname: "Mi Onix",
    vin: "1HGCM82633A004352",
    engine: "1.0 Turbo",
    fuelType: "gasoline",
    transmission: "automatic",
  });

  assert.equal(detailed.nickname, "Mi Onix");
  assert.equal(detailed.vin, "1HGCM82633A004352");
  assert.equal(detailed.fuelType, "GASOLINE");
  assert.equal(detailed.transmission, "AUTOMATIC");
});

test("validates required vehicle data", async () => {
  const service = createService();
  await assert.rejects(
    () => service.create("access-token", { ...validRequest(), currentMileage: -1 }),
    (error) => error instanceof ApiError && error.code === "VALIDATION_ERROR" && error.status === 400
  );
});

test("gets and updates the VIN only for the vehicle owner", async () => {
  const service = createService();
  const vehicle = await service.create("access-token", validRequest());

  assert.deepEqual(await service.get("access-token", vehicle.vehicleId), vehicle);

  const updated = await service.updateVin("access-token", vehicle.vehicleId, {
    vin: "1HGCM82633A004352",
  });
  assert.equal(updated.vin, "1HGCM82633A004352");

  const cleared = await service.updateVin("access-token", vehicle.vehicleId, { vin: null });
  assert.equal(cleared.vin, null);

  await assert.rejects(
    () => service.updateVin("access-token", vehicle.vehicleId, { vin: "NO-VALIDO" }),
    (error) => error instanceof ApiError && error.code === "VALIDATION_ERROR" && error.status === 400
  );

  const otherUserService = new VehicleService({
    authService: { getAuthenticatedUser: async () => ({ id: "other-user" }) },
    vehicleRepository: service.vehicleRepository,
  });
  await assert.rejects(
    () => otherUserService.get("access-token", vehicle.vehicleId),
    (error) => error instanceof ApiError && error.code === "VEHICLE_NOT_FOUND" && error.status === 404
  );
});
