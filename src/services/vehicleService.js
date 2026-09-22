const crypto = require("crypto");
const { ApiError } = require("../errors/apiError");

class VehicleService {
  constructor({ authService, vehicleRepository }) {
    this.authService = authService;
    this.vehicleRepository = vehicleRepository;
  }

  async create(accessToken, request) {
    const user = await this.authService.getAuthenticatedUser(accessToken);
    if (Object.hasOwn(request || {}, "currentMileage")) {
      throw new ApiError(
        "VALIDATION_ERROR",
        "El kilometraje solo puede llegar desde una lectura OBD2.",
        400
      );
    }
    const vehicle = this.normalizeCreateRequest(request);

    try {
      return await this.vehicleRepository.create({
        id: crypto.randomUUID(),
        userId: user.id,
        ...vehicle,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (error) {
      if (error && error.code === 11000) {
        throw new ApiError(
          "VEHICLE_ALREADY_EXISTS",
          "Ya existe un vehículo con esa placa en tu cuenta.",
          409
        );
      }
      throw error;
    }
  }

  async list(accessToken) {
    const user = await this.authService.getAuthenticatedUser(accessToken);
    return this.vehicleRepository.listByUserId(user.id);
  }

  async get(accessToken, vehicleId) {
    const user = await this.authService.getAuthenticatedUser(accessToken);
    return this.findOwnedVehicle(vehicleId, user.id);
  }

  async updateVin(accessToken, vehicleId, request) {
    const user = await this.authService.getAuthenticatedUser(accessToken);
    await this.findOwnedVehicle(vehicleId, user.id);
    return this.vehicleRepository.updateVinByIdAndUserId(
      vehicleId,
      user.id,
      this.optionalVin(request?.vin),
      new Date()
    );
  }

  async updateProfile(accessToken, vehicleId, request) {
    const user = await this.authService.getAuthenticatedUser(accessToken);
    await this.findOwnedVehicle(vehicleId, user.id);
    const changes = this.normalizeProfileUpdateRequest(request);
    return this.vehicleRepository.updateProfileByIdAndUserId(
      vehicleId,
      user.id,
      changes,
      new Date()
    );
  }

  async findOwnedVehicle(vehicleId, userId) {
    if (!vehicleId || typeof vehicleId !== "string") {
      throw new ApiError("VEHICLE_NOT_FOUND", "El vehículo no fue encontrado.", 404);
    }
    const vehicle = await this.vehicleRepository.findByIdAndUserId(vehicleId, userId);
    if (!vehicle) {
      throw new ApiError("VEHICLE_NOT_FOUND", "El vehículo no fue encontrado.", 404);
    }
    return vehicle;
  }

  normalizeCreateRequest(request) {
    const plate = String(request?.plate || "").trim().toUpperCase();
    const brand = String(request?.brand || "").trim();
    const model = String(request?.model || "").trim();
    const year = Number(request?.year);
    const currentYear = new Date().getUTCFullYear();

    if (!plate || plate.length > 12 || !/^[A-Z0-9 -]+$/.test(plate)) {
      throw new ApiError("VALIDATION_ERROR", "La placa no es válida.", 400);
    }
    if (!brand || brand.length > 60 || !model || model.length > 80) {
      throw new ApiError(
        "VALIDATION_ERROR",
        "La marca y el modelo son obligatorios.",
        400
      );
    }
    if (!Number.isInteger(year) || year < 1886 || year > currentYear + 1) {
      throw new ApiError("VALIDATION_ERROR", "El año no es válido.", 400);
    }
    return {
      plate,
      plateNormalized: plate.replace(/[^A-Z0-9]/g, ""),
      brand,
      model,
      year,
      currentMileage: null,
      nickname: this.optionalText(request?.nickname, 60),
      vin: this.optionalVin(request?.vin),
      engine: this.optionalText(request?.engine, 40),
      fuelType: this.optionalText(request?.fuelType, 32, true),
      transmission: this.optionalText(request?.transmission, 32, true),
    };
  }

  optionalText(value, maxLength, uppercase = false) {
    const text = String(value || "").trim();
    if (!text) return null;
    if (text.length > maxLength) {
      throw new ApiError("VALIDATION_ERROR", "Uno de los datos del vehículo es demasiado largo.", 400);
    }
    return uppercase ? text.toUpperCase() : text;
  }

  normalizeProfileUpdateRequest(request) {
    if (!request || typeof request !== "object" || Array.isArray(request)) {
      throw new ApiError("VALIDATION_ERROR", "Los datos del vehículo no son válidos.", 400);
    }

    const allowedFields = new Set([
      "nickname",
      "brand",
      "model",
      "engine",
      "fuelType",
      "transmission",
    ]);
    const suppliedFields = Object.keys(request);
    if (!suppliedFields.length || suppliedFields.some((field) => !allowedFields.has(field))) {
      throw new ApiError("VALIDATION_ERROR", "No hay campos permitidos para actualizar.", 400);
    }

    const changes = {};
    if (Object.hasOwn(request, "nickname")) {
      changes.nickname = this.optionalText(request.nickname, 60);
    }
    if (Object.hasOwn(request, "brand")) {
      changes.brand = this.requiredText(request.brand, 60, "La marca es obligatoria.");
    }
    if (Object.hasOwn(request, "model")) {
      changes.model = this.requiredText(request.model, 80, "El modelo es obligatorio.");
    }
    if (Object.hasOwn(request, "engine")) {
      changes.engine = this.optionalText(request.engine, 40);
    }
    if (Object.hasOwn(request, "fuelType")) {
      changes.fuelType = this.optionalText(request.fuelType, 32, true);
    }
    if (Object.hasOwn(request, "transmission")) {
      changes.transmission = this.optionalText(request.transmission, 32, true);
    }
    return changes;
  }

  requiredText(value, maxLength, message) {
    const text = String(value || "").trim();
    if (!text || text.length > maxLength) {
      throw new ApiError("VALIDATION_ERROR", message, 400);
    }
    return text;
  }

  optionalVin(value) {
    const vin = this.optionalText(value, 17, true);
    if (vin && !/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) {
      throw new ApiError("VALIDATION_ERROR", "El VIN no es válido.", 400);
    }
    return vin;
  }
}

module.exports = { VehicleService };
