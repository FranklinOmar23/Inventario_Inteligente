import { BaseRepository } from './BaseRepository.js';

export class UserRepository extends BaseRepository {
  constructor(pool) { super(pool, 'users'); }

  async findByEmail(email) {
    const [rows] = await this.pool.execute(
      'SELECT * FROM users WHERE email = ? AND deleted_at IS NULL',
      [email]
    );
    return rows[0] ?? null;
  }

  async findAllForTenant(tenantId) {
    const [rows] = await this.pool.execute(
      'SELECT id, email, full_name, role, permissions, sucursal_id, tenant_id, created_at FROM users WHERE tenant_id = ? AND deleted_at IS NULL ORDER BY created_at DESC',
      [tenantId]
    );
    return rows;
  }

  async create({ id, email, password_hash, full_name, role, permissions, sucursal_id, tenant_id }) {
    await this.pool.execute(
      'INSERT INTO users (id, email, password_hash, full_name, role, permissions, sucursal_id, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, email, password_hash, full_name, role, permissions ?? null, sucursal_id ?? null, tenant_id]
    );
  }

  async updateFields(id, fields) {
    if (!Object.keys(fields).length) return;
    const sets   = Object.keys(fields).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(fields), id];
    await this.pool.execute(`UPDATE users SET ${sets} WHERE id = ?`, values);
  }

  async countAdmins(tenantId, excludeId = null) {
    let sql = "SELECT COUNT(*) as cnt FROM users WHERE role = 'admin' AND tenant_id = ? AND deleted_at IS NULL";
    const p = [tenantId];
    if (excludeId) { sql += ' AND id != ?'; p.push(excludeId); }
    const [[{ cnt }]] = await this.pool.execute(sql, p);
    return Number(cnt);
  }
}
