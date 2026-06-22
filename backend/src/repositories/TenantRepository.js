import { BaseRepository } from './BaseRepository.js';

export class TenantRepository extends BaseRepository {
  constructor(pool) { super(pool, 'tenants'); }

  async findByIdRaw(id) {
    const [[row]] = await this.pool.execute('SELECT * FROM tenants WHERE id = ?', [id]);
    return row ?? null;
  }

  async updateFields(id, fields) {
    if (!Object.keys(fields).length) return;
    const sets   = Object.keys(fields).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(fields), id];
    await this.pool.execute(`UPDATE tenants SET ${sets} WHERE id = ?`, values);
  }

  async getEmailConfig(tenantId) {
    const [[row]] = await this.pool.execute(
      'SELECT * FROM tenant_email_config WHERE tenant_id = ?',
      [tenantId]
    );
    return row ?? null;
  }

  async upsertEmailConfig(tenantId, data, updatePassOnly = false) {
    const existing = await this.getEmailConfig(tenantId);
    if (!existing) {
      await this.pool.execute(
        `INSERT INTO tenant_email_config
          (tenant_id, manager_email, manager_name, smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass, smtp_from_name)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [tenantId, data.manager_email, data.manager_name ?? null, data.smtp_host ?? null,
         Number(data.smtp_port) || 587, data.smtp_secure ? 1 : 0,
         data.smtp_user, data.smtp_pass, data.smtp_from_name ?? null]
      );
    } else {
      const fields = ['manager_email = ?', 'manager_name = ?', 'smtp_host = ?',
                      'smtp_port = ?', 'smtp_secure = ?', 'smtp_user = ?', 'smtp_from_name = ?'];
      const values = [data.manager_email, data.manager_name ?? null, data.smtp_host ?? null,
                      Number(data.smtp_port) || 587, data.smtp_secure ? 1 : 0,
                      data.smtp_user, data.smtp_from_name ?? null];
      if (data.smtp_pass) { fields.push('smtp_pass = ?'); values.push(data.smtp_pass); }
      values.push(tenantId);
      await this.pool.execute(`UPDATE tenant_email_config SET ${fields.join(', ')} WHERE tenant_id = ?`, values);
    }
  }
}
