import { ValidationError, NotFoundError } from '../errors/AppError.js';

export class EstanteService {
  constructor(estanteRepo, sucursalRepo) {
    this.repo        = estanteRepo;
    this.sucursalRepo = sucursalRepo;
  }

  async list(tenantId, user, sucursalId) {
    const forced = user.role !== 'admin' ? user.sucursal_id : sucursalId;
    return this.repo.findAllForTenant(tenantId, forced);
  }

  async create(tenantId, { name, description, sucursal_id, type = 'estante' }) {
    if (!name) throw new ValidationError('El nombre del estante es requerido');
    let sucursal_name = '';
    if (sucursal_id) {
      const suc = await this.sucursalRepo.findById(sucursal_id);
      sucursal_name = suc?.name ?? '';
    }
    const id = crypto.randomUUID();
    await this.repo.create({ id, name, description, sucursal_id, sucursal_name, type, tenant_id: tenantId });
    return { id, name, description, sucursal_id, sucursal_name, type, item_count: 0 };
  }

  async update(id, { name, description, sucursal_id, type = 'estante' }) {
    let sucursal_name = '';
    if (sucursal_id) {
      const suc = await this.sucursalRepo.findById(sucursal_id);
      sucursal_name = suc?.name ?? '';
    }
    await this.repo.update(id, { name, description, sucursal_id, sucursal_name, type });
  }

  async remove(id) {
    await this.repo.deleteWithCleanup(id);
  }
}
