import { BaseRepository } from './BaseRepository.js';

export class PurchaseOrderRepository extends BaseRepository {
  constructor(pool) { super(pool, 'purchase_orders'); }

  async findAllForTenant(tenantId) {
    const [rows] = await this.pool.execute(
      'SELECT * FROM purchase_orders WHERE deleted_at IS NULL AND tenant_id = ? ORDER BY created_at DESC',
      [tenantId]
    );
    return rows;
  }

  async findPendingByCategory(tenantId, categoryId) {
    const [rows] = await this.pool.execute(
      "SELECT id FROM purchase_orders WHERE category_id = ? AND status = 'pending' AND deleted_at IS NULL AND tenant_id = ?",
      [categoryId, tenantId]
    );
    return rows[0] ?? null;
  }

  async create({ id, category_id, category_name, quantity_suggested, notes, tenant_id }) {
    await this.pool.execute(
      'INSERT INTO purchase_orders (id, category_id, category_name, quantity_suggested, status, notes, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, category_id, category_name ?? '', Number(quantity_suggested) || 1, 'pending', notes ?? null, tenant_id]
    );
  }

  async update(id, { status, notes }) {
    await this.pool.execute(
      'UPDATE purchase_orders SET status = ?, notes = ? WHERE id = ?',
      [status, notes ?? null, id]
    );
  }
}
