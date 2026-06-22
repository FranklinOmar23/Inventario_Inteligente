import { ValidationError, NotFoundError } from '../errors/AppError.js';

export class DepartmentService {
  constructor(departmentRepo) {
    this.repo = departmentRepo;
  }

  async list(tenantId, user, sucursalId) {
    const forced = user.role !== 'admin' ? user.sucursal_id : sucursalId;
    return this.repo.findAllForTenant(tenantId, forced);
  }

  async getById(id, tenantId) {
    const row = await this.repo.findById(id, tenantId);
    if (!row) throw new NotFoundError('Departamento no encontrado');
    return row;
  }

  async create(tenantId, { name, description, manager, sucursal_id, sucursal_name }) {
    if (!name) throw new ValidationError('Nombre requerido');
    const id = crypto.randomUUID();
    await this.repo.create({ id, name, description, manager, sucursal_id, sucursal_name, tenant_id: tenantId });
    return this.repo.findById(id);
  }

  async update(id, tenantId, data) {
    const existing = await this.repo.findById(id, tenantId);
    if (!existing) throw new NotFoundError('Departamento no encontrado');
    await this.repo.update(id, data);
    return this.repo.findById(id);
  }

  async remove(id, tenantId) {
    const existing = await this.repo.findById(id, tenantId);
    if (!existing) throw new NotFoundError('Departamento no encontrado');
    await this.repo.softDelete(id);
  }
}
