import { BaseRepository } from './BaseRepository.js';

export class MachineRepository extends BaseRepository {
  constructor(pool) {
    super(pool, 'machines');
  }

  async findAllByTenant(tenantId) {
    const [rows] = await this.pool.execute(
      `SELECT * FROM machines
       WHERE tenant_id = ? AND deleted_at IS NULL
       ORDER BY department, section, numero, posicion`,
      [tenantId]
    );
    return rows;
  }

  async softDeleteByTenant(id, tenantId) {
    const [result] = await this.pool.execute(
      `UPDATE machines SET deleted_at = NOW()
       WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
      [id, tenantId]
    );
    return result.affectedRows > 0;
  }

  async create(tenantId, data) {
    const id = crypto.randomUUID();
    await this.pool.execute(
      `INSERT INTO machines (id, tenant_id, department, section, punto_de_red, numero, posicion, ip_address, so, hardware, full_device_name, installed_on, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, tenantId, data.department, data.section ?? null, data.punto_de_red ?? null,
       data.numero ?? null, data.posicion ?? null, data.ip_address ?? null,
       data.so ?? null, data.hardware ?? null, data.full_device_name ?? null,
       data.installed_on ?? null, data.notes ?? null, data.status ?? 'active']
    );
    const [[row]] = await this.pool.execute('SELECT * FROM machines WHERE id = ?', [id]);
    return row;
  }

  async update(id, tenantId, data) {
    await this.pool.execute(
      `UPDATE machines SET department=?, section=?, punto_de_red=?, numero=?, posicion=?,
       ip_address=?, so=?, hardware=?, full_device_name=?, installed_on=?, notes=?, status=?
       WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
      [data.department, data.section ?? null, data.punto_de_red ?? null,
       data.numero ?? null, data.posicion ?? null, data.ip_address ?? null,
       data.so ?? null, data.hardware ?? null, data.full_device_name ?? null,
       data.installed_on ?? null, data.notes ?? null, data.status ?? 'active', id, tenantId]
    );
    const [[row]] = await this.pool.execute('SELECT * FROM machines WHERE id = ?', [id]);
    return row ?? null;
  }

  async toggleStatus(id, tenantId) {
    await this.pool.execute(
      `UPDATE machines
       SET status = IF(status='active','inactive','active')
       WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
      [id, tenantId]
    );
    const [[row]] = await this.pool.execute('SELECT * FROM machines WHERE id = ?', [id]);
    return row ?? null;
  }
}
