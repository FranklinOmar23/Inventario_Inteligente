import { BaseRepository } from './BaseRepository.js';

export class DepartmentRepository extends BaseRepository {
  constructor(pool) { super(pool, 'departments'); }

  async findAllForTenant(tenantId, sucursalId = null) {
    let sql = 'SELECT * FROM departments WHERE deleted_at IS NULL AND tenant_id = ?';
    const p = [tenantId];
    if (sucursalId) { sql += ' AND sucursal_id = ?'; p.push(sucursalId); }
    sql += ' ORDER BY sucursal_name, name';
    const [rows] = await this.pool.execute(sql, p);
    return rows;
  }

  async create({ id, name, description, manager, sucursal_id, sucursal_name, tenant_id }) {
    await this.pool.execute(
      'INSERT INTO departments (id, name, description, manager, sucursal_id, sucursal_name, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, name, description ?? '', manager ?? '', sucursal_id ?? null, sucursal_name ?? '', tenant_id]
    );
  }

  async update(id, { name, description, manager, sucursal_id, sucursal_name }) {
    await this.pool.execute(
      'UPDATE departments SET name = ?, description = ?, manager = ?, sucursal_id = ?, sucursal_name = ? WHERE id = ?',
      [name, description ?? '', manager ?? '', sucursal_id ?? null, sucursal_name ?? '', id]
    );
  }
}
