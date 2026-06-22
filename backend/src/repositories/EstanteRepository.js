import { BaseRepository } from './BaseRepository.js';

export class EstanteRepository extends BaseRepository {
  constructor(pool) { super(pool, 'estantes'); }

  async findAllForTenant(tenantId, sucursalId = null) {
    let sql = `
      SELECT e.*,
        (SELECT COUNT(*) FROM inventory_items i WHERE i.shelf_id = e.id AND i.deleted_at IS NULL) AS item_count
      FROM estantes e
      WHERE e.deleted_at IS NULL AND e.tenant_id = ?
    `;
    const p = [tenantId];
    if (sucursalId) { sql += ' AND e.sucursal_id = ?'; p.push(sucursalId); }
    sql += ' ORDER BY e.sucursal_name, e.name';
    const [rows] = await this.pool.execute(sql, p);
    return rows;
  }

  async create({ id, name, description, sucursal_id, sucursal_name, type, tenant_id }) {
    await this.pool.execute(
      'INSERT INTO estantes (id, name, description, sucursal_id, sucursal_name, type, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, name, description ?? null, sucursal_id ?? null, sucursal_name ?? '', type ?? 'estante', tenant_id]
    );
  }

  async update(id, { name, description, sucursal_id, sucursal_name, type }) {
    await this.pool.execute(
      'UPDATE estantes SET name = ?, description = ?, sucursal_id = ?, sucursal_name = ?, type = ? WHERE id = ? AND deleted_at IS NULL',
      [name, description ?? null, sucursal_id ?? null, sucursal_name ?? '', type ?? 'estante', id]
    );
  }

  async deleteWithCleanup(id) {
    await this.pool.execute(
      'UPDATE inventory_items SET shelf_id = NULL, shelf_name = "" WHERE shelf_id = ?',
      [id]
    );
    await this.pool.execute('UPDATE estantes SET deleted_at = NOW() WHERE id = ?', [id]);
  }
}
