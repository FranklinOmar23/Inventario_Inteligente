import { BaseRepository } from './BaseRepository.js';

export class SupplierRepository extends BaseRepository {
  constructor(pool) {
    super(pool, 'suppliers');
  }

  async findAllByTenant(tenantId) {
    const [rows] = await this.pool.execute(
      `SELECT * FROM suppliers
       WHERE tenant_id = ? AND deleted_at IS NULL
       ORDER BY name ASC`,
      [tenantId]
    );
    return rows;
  }

  async findByIdAndTenant(id, tenantId) {
    const [[row]] = await this.pool.execute(
      `SELECT * FROM suppliers WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
      [id, tenantId]
    );
    return row ?? null;
  }

  async create(tenantId, data) {
    const id = crypto.randomUUID();
    await this.pool.execute(
      `INSERT INTO suppliers
       (id, tenant_id, rnc, name, business_name, tipo, dgii_status, phone, email, address, contact_name, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, tenantId,
        data.rnc           ?? null,
        data.name,
        data.business_name ?? '',
        data.tipo          ?? '',
        data.dgii_status   ?? '',
        data.phone         ?? '',
        data.email         ?? '',
        data.address       ?? null,
        data.contact_name  ?? '',
        data.notes         ?? null,
      ]
    );
    const [[row]] = await this.pool.execute('SELECT * FROM suppliers WHERE id = ?', [id]);
    return row;
  }

  async update(id, tenantId, data) {
    await this.pool.execute(
      `UPDATE suppliers
       SET rnc=?, name=?, business_name=?, tipo=?, dgii_status=?,
           phone=?, email=?, address=?, contact_name=?, notes=?
       WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
      [
        data.rnc           ?? null,
        data.name,
        data.business_name ?? '',
        data.tipo          ?? '',
        data.dgii_status   ?? '',
        data.phone         ?? '',
        data.email         ?? '',
        data.address       ?? null,
        data.contact_name  ?? '',
        data.notes         ?? null,
        id, tenantId,
      ]
    );
    const [[row]] = await this.pool.execute('SELECT * FROM suppliers WHERE id = ?', [id]);
    return row ?? null;
  }

  async softDeleteByTenant(id, tenantId) {
    const [result] = await this.pool.execute(
      `UPDATE suppliers SET deleted_at = NOW()
       WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
      [id, tenantId]
    );
    return result.affectedRows > 0;
  }
}
