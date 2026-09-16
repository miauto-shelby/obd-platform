const crypto = require("crypto");
const { ApiError } = require("../errors/apiError");

class VehicleService {
  constructor({ authService, vehicleRepository }) {
    this.authService = authService;
    this.vehicleRepository = vehicleRepository;
  }

  async create(accessToken, request) {
    const user = await this.authService.getAuthenticatedUser(accessToken);
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

  normalizeCreateRequest(request) {
    const plate = String(request?.plate || "").trim().toUpperCase();
    const brand = String(request?.brand || "").trim();
    const model = String(request?.model || "").trim();
    const year = Number(request?.year);
    const currentMileage = Number(request?.currentMileage);
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
    if (!Number.isInteger(currentMileage) || currentMileage < 0 || currentMileage > 2_000_000) {
      throw new ApiError(
        "VALIDATION_ERROR",
        "El kilometraje inicial no es válido.",
        400
      );
    }

    return {
      plate,
      plateNormalized: plate.replace(/[^A-Z0-9]/g, ""),
      brand,
      model,
      year,
      currentMileage,
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

  optionalVin(value) {
    const vin = this.optionalText(value, 17, true);
    if (vin && !/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) {
      throw new ApiError("VALIDATION_ERROR", "El VIN no es válido.", 400);
    }
    return vin;
  }
}

module.exports = { VehicleService };
