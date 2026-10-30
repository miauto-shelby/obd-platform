const { ApiError } = require("../errors/apiError");

const INITIAL_BRANDS = [
  "ALFA ROMEO", "AUDI", "BMW", "BYD", "CHEVROLET", "CHERY", "CITROEN",
  "CUPRA", "DACIA", "DFSK", "DODGE", "FIAT", "FORD", "GEELY", "HONDA",
  "HYUNDAI", "JAC", "JEEP", "KIA", "MAZDA", "MERCEDES-BENZ", "MG",
  "MITSUBISHI", "NISSAN", "PEUGEOT", "PORSCHE", "RAM", "RENAULT", "SEAT",
  "SKODA", "SUBARU", "SUZUKI", "TESLA", "TOYOTA", "VOLKSWAGEN", "VOLVO",
];

class VehicleBrandService {
  constructor({ authService, vehicleBrandRepository }) {
    this.authService = authService;
    this.vehicleBrandRepository = vehicleBrandRepository;
  }

  async initialize() {
    await this.vehicleBrandRepository.ensureIndexes();
    await this.vehicleBrandRepository.seed(INITIAL_BRANDS);
  }

  async list(accessToken) {
    await this.authService.getAuthenticatedUser(accessToken);
    const items = await this.vehicleBrandRepository.listActive();
    return { items: items.map((item) => ({ brandId: item._id, name: item.name })) };
  }

  async assertActiveBrand(name) {
    const brand = await this.vehicleBrandRepository.findActiveByName(name);
    if (!brand) {
      throw new ApiError("BRAND_NOT_AVAILABLE", "Selecciona una marca disponible en la lista.", 400);
    }
  }

  async createOrActivate(accessToken, request) {
    const admin = await this.authService.getAuthenticatedUser(accessToken);
    this.ensureAdministrator(admin);
    const name = this.normalizeName(request?.name);
    const item = await this.vehicleBrandRepository.upsert(name, new Date());
    return { brandId: item._id, name: item.name, active: item.active };
  }

  async update(accessToken, brandId, request) {
    const admin = await this.authService.getAuthenticatedUser(accessToken);
    this.ensureAdministrator(admin);
    if (!brandId || typeof brandId !== "string") {
      throw new ApiError("BRAND_NOT_FOUND", "La marca no fue encontrada.", 404);
    }
    if (!request || typeof request !== "object" || Array.isArray(request)) {
      throw new ApiError("VALIDATION_ERROR", "Los datos de la marca no son válidos.", 400);
    }
    const changes = {};
    if (Object.hasOwn(request, "active")) {
      if (typeof request.active !== "boolean") {
        throw new ApiError("VALIDATION_ERROR", "El estado de la marca no es válido.", 400);
      }
      changes.active = request.active;
    }
    if (!Object.keys(changes).length) {
      throw new ApiError("VALIDATION_ERROR", "No hay cambios permitidos para la marca.", 400);
    }
    const item = await this.vehicleBrandRepository.update(brandId, changes, new Date());
    if (!item) throw new ApiError("BRAND_NOT_FOUND", "La marca no fue encontrada.", 404);
    return { brandId: item._id, name: item.name, active: item.active };
  }

  normalizeName(value) {
    const name = String(value || "").trim().toUpperCase();
    if (!name || name.length > 60 || !/^[A-Z0-9 .&-]+$/.test(name)) {
      throw new ApiError("VALIDATION_ERROR", "El nombre de la marca no es válido.", 400);
    }
    return name;
  }

  ensureAdministrator(user) {
    const roles = Array.isArray(user?.roles) ? user.roles : [];
    if (!roles.map((role) => String(role).toUpperCase()).includes("ADMIN")) {
      throw new ApiError("ADMIN_ACCESS_REQUIRED", "Solo un administrador puede gestionar marcas.", 403);
    }
  }
}

module.exports = { VehicleBrandService, INITIAL_BRANDS };
