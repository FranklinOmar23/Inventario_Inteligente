import { ValidationError, NotFoundError, ForbiddenError } from '../errors/AppError.js';

export class SucursalService {
  constructor(sucursalRepo, departmentRepo, tenantRepo) {
    this.sucursalRepo   = sucursalRepo;
    this.departmentRepo = departmentRepo;
    this.tenantRepo     = tenantRepo;
  }

  async list(tenantId, user) {
    const forced = user.role !== 'admin' ? user.sucursal_id : null;
    return this.sucursalRepo.findAllForTenant(tenantId, forced);
  }

  async getById(id, tenantId) {
    const row = await this.sucursalRepo.findById(id, tenantId);
    if (!row) throw new NotFoundError('Sucursal no encontrada');
    return row;
  }

  async create(tenantId, { name, address, manager, phone }) {
    if (!name) throw new ValidationError('Nombre requerido');

    const tenant = await this.tenantRepo.findByIdRaw(tenantId);
    const cnt    = await this.sucursalRepo.count({ tenantId });
    if (tenant && cnt >= tenant.max_sucursales) {
      throw new ForbiddenError(`Tu plan permite hasta ${tenant.max_sucursales} sucursal(es). Mejora tu plan para agregar más.`);
    }

    const id = crypto.randomUUID();
    await this.sucursalRepo.create({ id, name, address, manager, phone, tenant_id: tenantId });
    await this.departmentRepo.create({ id: crypto.randomUUID(), name: 'General', description: '', manager: '', sucursal_id: id, sucursal_name: name, tenant_id: tenantId });

    return this.sucursalRepo.findById(id);
  }

  async update(id, tenantId, { name, address, manager, phone }) {
    const existing = await this.sucursalRepo.findById(id, tenantId);
    if (!existing) throw new NotFoundError('Sucursal no encontrada');
    await this.sucursalRepo.update(id, { name, address, manager, phone });
    if (name) await this.sucursalRepo.propagateNameChange(id, name);
    return this.sucursalRepo.findById(id);
  }

  async remove(id, tenantId) {
    const existing = await this.sucursalRepo.findById(id, tenantId);
    if (!existing) throw new NotFoundError('Sucursal no encontrada');
    await this.sucursalRepo.softDelete(id);
  }
}
