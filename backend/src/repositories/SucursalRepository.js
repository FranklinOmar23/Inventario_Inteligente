import { BaseRepository } from './BaseRepository.js';

export class SucursalRepository extends BaseRepository {
  constructor(pool) { super(pool, 'sucursales'); }

  async findAllForTenant(tenantId, forcedId = null) {
    let sql = 'SELECT * FROM sucursales WHERE deleted_at IS NULL AND tenant_id = ?';
    const p = [tenantId];
    if (forcedId) { sql += ' AND id = ?'; p.push(forcedId); }
    sql += ' ORDER BY name';
    const [rows] = await this.pool.execute(sql, p);
    return rows;
  }

  async create({ id, name, address, manager, phone, tenant_id }) {
    await this.pool.execute(
      'INSERT INTO sucursales (id, name, address, manager, phone, tenant_id) VALUES (?, ?, ?, ?, ?, ?)',
      [id, name, address ?? null, manager ?? '', phone ?? '', tenant_id]
    );
  }

  async update(id, { name, address, manager, phone }) {
    await this.pool.execute(
      'UPDATE sucursales SET name = ?, address = ?, manager = ?, phone = ? WHERE id = ?',
      [name, address ?? null, manager ?? '', phone ?? '', id]
    );
  }

  async propagateNameChange(id, name) {
    await this.pool.execute('UPDATE departments SET sucursal_name = ? WHERE sucursal_id = ?', [name, id]);
    await this.pool.execute('UPDATE inventory_items SET sucursal_name = ? WHERE sucursal_id = ? AND deleted_at IS NULL', [name, id]);
  }
}
