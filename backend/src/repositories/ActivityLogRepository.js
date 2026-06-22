import { BaseRepository } from './BaseRepository.js';

export class ActivityLogRepository extends BaseRepository {
  constructor(pool) { super(pool, 'activity_logs'); }

  async search(tenantId, { action, item_id, search, limit = 100, sucursalId = null } = {}) {
    let sql = 'SELECT * FROM activity_logs WHERE deleted_at IS NULL AND tenant_id = ?';
    const p = [tenantId];
    if (item_id)              { sql += ' AND item_id = ?';   p.push(item_id); }
    if (action && action !== 'all') { sql += ' AND action = ?'; p.push(action); }
    if (sucursalId) {
      sql += ' AND item_id IN (SELECT id FROM inventory_items WHERE sucursal_id = ? AND deleted_at IS NULL)';
      p.push(sucursalId);
    }
    if (search) {
      sql += ' AND (item_name LIKE ? OR performed_by LIKE ? OR details LIKE ?)';
      const q = `%${search}%`;
      p.push(q, q, q);
    }
    sql += ' ORDER BY timestamp DESC LIMIT ?';
    p.push(Number(limit));
    const [rows] = await this.pool.execute(sql, p);
    return rows;
  }

  async insert(log) {
    await this.pool.execute(`
      INSERT INTO activity_logs
        (id, action, item_id, item_name, category_name, department_name,
         from_department_name, to_department_name, from_sucursal_name, to_sucursal_name,
         quantity, unit_cost, total_value,
         performed_by, performed_by_id, checked_out_to,
         reason, destination, details, timestamp, tenant_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      log.id, log.action,
      log.item_id ?? null, log.item_name ?? '',
      log.category_name ?? '', log.department_name ?? '',
      log.from_department_name ?? '', log.to_department_name ?? '',
      log.from_sucursal_name ?? '', log.to_sucursal_name ?? '',
      Number(log.quantity) || 1,
      log.unit_cost ?? null, log.total_value ?? null,
      log.performed_by ?? '', log.performed_by_id ?? null,
      log.checked_out_to ?? null,
      log.reason ?? null, log.destination ?? null,
      log.details ?? '', log.timestamp ?? new Date(),
      log.tenant_id,
    ]);
  }

  async bulkInsert(logs) {
    if (!logs.length) return;
    const ph  = logs.map(() => '(?,?,?,?,?,?,?,?,?)').join(',');
    const vals = logs.flatMap(l => [
      l.id, l.action, l.item_id, l.item_name,
      l.department_name ?? '', l.performed_by ?? '',
      l.performed_by_id ?? null, l.details ?? '',
      Number(l.quantity) || 1,
    ]);
    await this.pool.execute(
      `INSERT INTO activity_logs (id, action, item_id, item_name, department_name, performed_by, performed_by_id, details, quantity) VALUES ${ph}`,
      vals
    );
  }

  async exitSummary(tenantId, days, sucursalId = null) {
    const p = [days, tenantId];
    let w = "action = 'exit' AND timestamp >= DATE_SUB(NOW(), INTERVAL ? DAY) AND tenant_id = ?";
    if (sucursalId) {
      w += ' AND item_id IN (SELECT id FROM inventory_items WHERE sucursal_id = ? AND deleted_at IS NULL)';
      p.push(sucursalId);
    }
    const [[summary]] = await this.pool.execute(
      `SELECT COUNT(*) AS count, COALESCE(SUM(quantity),0) AS quantity, COALESCE(SUM(total_value),0) AS total_value FROM activity_logs WHERE ${w}`,
      p
    );
    const [byReason] = await this.pool.execute(
      `SELECT COALESCE(NULLIF(reason,''),'Sin especificar') AS reason, COUNT(*) AS count, COALESCE(SUM(quantity),0) AS quantity, COALESCE(SUM(total_value),0) AS total_value FROM activity_logs WHERE ${w} GROUP BY reason ORDER BY quantity DESC`,
      p
    );
    return { summary, by_reason: byReason };
  }
}
