const test = require("node:test");
const assert = require("node:assert/strict");
const { ApiError } = require("../src/errors/apiError");
const { VehicleService } = require("../src/services/vehicleService");

class MemoryVehicleRepository {
  constructor() {
    this.vehicles = [];
  }

  async create(vehicle) {
    if (this.vehicles.some((item) => item.plateNormalized === vehicle.plateNormalized)) {
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

  async findById(vehicleId) {
    return this.toVehicle(this.vehicles.find((vehicle) => vehicle.id === vehicleId));
  }

  async updateVinByIdAndUserId(vehicleId, userId, vin, updatedAt) {
    const vehicle = this.vehicles.find((item) => item.id === vehicleId && item.userId === userId);
    if (!vehicle) return null;
    vehicle.vin = vin;
    vehicle.updatedAt = updatedAt;
    return this.toVehicle(vehicle);
  }

  async updateProfileByIdAndUserId(vehicleId, userId, changes, updatedAt) {
    const vehicle = this.vehicles.find((item) => item.id === vehicleId && item.userId === userId);
    if (!vehicle) return null;
    Object.assign(vehicle, changes, { updatedAt });
    return this.toVehicle(vehicle);
  }

  async updatePlateById(vehicleId, plate, plateNormalized, auditEntry, updatedAt) {
    const vehicle = this.vehicles.find((item) => item.id === vehicleId);
    if (!vehicle) return null;
    if (this.vehicles.some((item) => item.id !== vehicleId && item.plateNormalized === plateNormalized)) {
      const error = new Error("duplicate key");
      error.code = 11000;
      throw error;
    }
    vehicle.plate = plate;
    vehicle.plateNormalized = plateNormalized;
    vehicle.plateChangeHistory = [...(vehicle.plateChangeHistory || []), auditEntry];
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

function createService(userId = "user-1", email = "user@example.com", vehicleRepository) {
  return new VehicleService({
    authService: { getAuthenticatedUser: async () => ({ id: userId, email }) },
    vehicleRepository: vehicleRepository || new MemoryVehicleRepository(),
  });
}

function validRequest() {
  return { plate: "abc 123", brand: "Chevrolet", model: "Onix", year: 2022 };
}

test("creates and lists vehicles only for the authenticated user", async () => {
  const service = createService();
  const vehicle = await service.create("access-token", validRequest());

  assert.equal(vehicle.plate, "ABC 123");
  assert.equal(vehicle.currentMileage, null);
  assert.equal(vehicle.nickname, null);
  assert.equal(vehicle.vin, null);
  assert.deepEqual(await service.list("access-token"), [vehicle]);
});

test("rejects duplicate plates anywhere in the platform", async () => {
  const service = createService();
  await service.create("access-token", validRequest());

  const anotherUserService = createService(
    "user-2",
    "other@example.com",
    service.vehicleRepository
  );

  await assert.rejects(
    () => anotherUserService.create("access-token", validRequest()),
    (error) => error instanceof ApiError && error.code === "VEHICLE_ALREADY_EXISTS" && error.status === 409
  );
});

test("allows only administrators to correct a plate and keeps an internal audit", async () => {
  const ownerService = createService();
  const vehicle = await ownerService.create("access-token", validRequest());

  const nonAdminService = createService(
    "user-2",
    "user-2@example.com",
    ownerService.vehicleRepository
  );
  await assert.rejects(
    () =>
      nonAdminService.updatePlateAsAdmin("access-token", vehicle.vehicleId, {
        plate: "XYZ789",
        reason: "Error de digitación.",
      }),
    (error) => error instanceof ApiError && error.code === "ADMIN_ACCESS_REQUIRED" && error.status === 403
  );

  const adminService = new VehicleService({
    authService: { getAuthenticatedUser: async () => ({ id: "admin-1", email: "admin@example.com" }) },
    vehicleRepository: ownerService.vehicleRepository,
    adminEmails: ["admin@example.com"],
  });
  const updated = await adminService.updatePlateAsAdmin("access-token", vehicle.vehicleId, {
    plate: "xyz 789",
    reason: "Error de digitación registrado durante la creación.",
  });

  assert.equal(updated.plate, "XYZ 789");
  const storedVehicle = ownerService.vehicleRepository.vehicles[0];
  assert.equal(storedVehicle.plateChangeHistory.length, 1);
  assert.equal(storedVehicle.plateChangeHistory[0].previousPlate, "ABC 123");
  assert.equal(storedVehicle.plateChangeHistory[0].newPlate, "XYZ 789");

  await assert.rejects(
    () =>
      adminService.updatePlateAsAdmin("access-token", vehicle.vehicleId, {
        plate: "XYZ789",
        reason: "No debe permitir la misma placa.",
      }),
    (error) => error instanceof ApiError && error.code === "VALIDATION_ERROR" && error.status === 400
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
    () => service.create("access-token", { ...validRequest(), brand: "" }),
    (error) => error instanceof ApiError && error.code === "VALIDATION_ERROR" && error.status === 400
  );
  await assert.rejects(
    () => service.create("access-token", { ...validRequest(), currentMileage: 48500 }),
    (error) => error instanceof ApiError && error.code === "VALIDATION_ERROR" && error.status === 400
  );
});

test("updates the basic profile without accepting manual mileage", async () => {
  const service = createService();
  const vehicle = await service.create("access-token", validRequest());

  const updated = await service.updateProfile("access-token", vehicle.vehicleId, {
    nickname: "Auto familiar",
    engine: "1.0 Turbo",
    fuelType: "gasoline",
    transmission: null,
  });
  assert.equal(updated.nickname, "Auto familiar");
  assert.equal(updated.engine, "1.0 Turbo");
  assert.equal(updated.fuelType, "GASOLINE");
  assert.equal(updated.transmission, null);
  assert.equal(updated.currentMileage, null);

  await assert.rejects(
    () => service.updateProfile("access-token", vehicle.vehicleId, { currentMileage: 50000 }),
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
