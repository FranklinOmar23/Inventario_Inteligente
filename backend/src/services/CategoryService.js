import { ValidationError, NotFoundError } from '../errors/AppError.js';

export class CategoryService {
  constructor(categoryRepo) {
    this.repo = categoryRepo;
  }

  async list(tenantId) {
    const rows = await this.repo.findAllForTenant(tenantId);
    return rows.map(r => this.repo.toBool(r));
  }

  async getById(id, tenantId) {
    const row = await this.repo.findById(id, tenantId);
    if (!row) throw new NotFoundError('Categoría no encontrada');
    return this.repo.toBool(row);
  }

  async create(tenantId, { name, requires_asset_tag = false, requires_unique_id = false, minimum_stock = 5, parent_id = null }) {
    if (!name) throw new ValidationError('Nombre requerido');
    if (parent_id) {
      const parent = await this.repo.findById(parent_id, tenantId);
      if (!parent) throw new ValidationError('Categoría padre no encontrada');
    }
    const id = crypto.randomUUID();
    await this.repo.create({ id, name, requires_asset_tag, requires_unique_id, minimum_stock, parent_id, tenant_id: tenantId });
    return this.repo.toBool(await this.repo.findById(id));
  }

  async update(id, tenantId, data) {
    if (data.parent_id === id) throw new ValidationError('Una categoría no puede ser su propia categoría padre');
    const existing = await this.repo.findById(id, tenantId);
    if (!existing) throw new NotFoundError('Categoría no encontrada');
    await this.repo.update(id, data);
    return this.repo.toBool(await this.repo.findById(id));
  }

  async remove(id, tenantId) {
    const existing = await this.repo.findById(id, tenantId);
    if (!existing) throw new NotFoundError('Categoría no encontrada');
    await this.repo.softDeleteWithChildren(id);
  }
}
