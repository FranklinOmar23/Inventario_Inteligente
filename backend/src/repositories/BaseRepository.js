export class BaseRepository {
  constructor(pool, table) {
    this.pool  = pool;
    this.table = table;
  }

  async findById(id, tenantId = null) {
    const extra = tenantId ? ' AND tenant_id = ?' : '';
    const params = tenantId ? [id, tenantId] : [id];
    const [rows] = await this.pool.execute(
      `SELECT * FROM \`${this.table}\` WHERE id = ? AND deleted_at IS NULL${extra}`,
      params
    );
    return rows[0] ?? null;
  }

  async findAll({ tenantId = null, where = '', params = [], orderBy = 'created_at DESC', limit = 500 } = {}) {
    let sql = `SELECT * FROM \`${this.table}\` WHERE deleted_at IS NULL`;
    const p = [...params];
    if (tenantId) { sql += ' AND tenant_id = ?'; p.push(tenantId); }
    if (where)    { sql += ` AND ${where}`; }
    sql += ` ORDER BY ${orderBy} LIMIT ?`;
    p.push(limit);
    const [rows] = await this.pool.execute(sql, p);
    return rows;
  }

  async softDelete(id) {
    const [result] = await this.pool.execute(
      `UPDATE \`${this.table}\` SET deleted_at = NOW() WHERE id = ?`,
      [id]
    );
    return result.affectedRows > 0;
  }

  async count({ tenantId = null, where = '', params = [] } = {}) {
    let sql = `SELECT COUNT(*) as cnt FROM \`${this.table}\` WHERE deleted_at IS NULL`;
    const p = [...params];
    if (tenantId) { sql += ' AND tenant_id = ?'; p.push(tenantId); }
    if (where)    { sql += ` AND ${where}`; }
    const [[{ cnt }]] = await this.pool.execute(sql, p);
    return Number(cnt);
  }

  async rawQuery(sql, params = []) {
    const [rows] = await this.pool.execute(sql, params);
    return rows;
  }

  async rawExecute(sql, params = []) {
    const [result] = await this.pool.execute(sql, params);
    return result;
  }
}
