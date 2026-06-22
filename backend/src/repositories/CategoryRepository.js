import { BaseRepository } from './BaseRepository.js';

export class CategoryRepository extends BaseRepository {
  constructor(pool) { super(pool, 'categories'); }

  async findAllForTenant(tenantId) {
    const [rows] = await this.pool.execute(
      'SELECT * FROM categories WHERE deleted_at IS NULL AND tenant_id = ? ORDER BY name',
      [tenantId]
    );
    return rows;
  }

  async create({ id, name, requires_asset_tag, requires_unique_id, minimum_stock, parent_id, tenant_id }) {
    await this.pool.execute(
      'INSERT INTO categories (id, name, requires_asset_tag, requires_unique_id, minimum_stock, parent_id, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, name, requires_asset_tag ? 1 : 0, requires_unique_id ? 1 : 0,
       Number(minimum_stock) || 5, parent_id ?? null, tenant_id]
    );
  }

  async update(id, { name, requires_asset_tag, requires_unique_id, minimum_stock, parent_id }) {
    await this.pool.execute(
      'UPDATE categories SET name = ?, requires_asset_tag = ?, requires_unique_id = ?, minimum_stock = ?, parent_id = ? WHERE id = ?',
      [name, requires_asset_tag ? 1 : 0, requires_unique_id ? 1 : 0,
       Number(minimum_stock) || 5, parent_id ?? null, id]
    );
  }

  async softDeleteWithChildren(id) {
    await this.pool.execute(
      'UPDATE categories SET deleted_at = NOW() WHERE id = ? OR parent_id = ?',
      [id, id]
    );
  }

  toBool(row) {
    return { ...row, requires_asset_tag: !!row.requires_asset_tag, requires_unique_id: !!row.requires_unique_id };
  }
}
