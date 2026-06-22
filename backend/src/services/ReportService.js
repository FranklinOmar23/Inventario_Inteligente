export class ReportService {
  constructor(pool) {
    this.pool = pool;
  }

  _scopeWhere(tenantId, sucursalId) {
    const p = [];
    let w = 'deleted_at IS NULL';
    if (tenantId)   { w += ' AND tenant_id = ?'; p.push(tenantId); }
    if (sucursalId) { w += ' AND sucursal_id = ?'; p.push(sucursalId); }
    return { w, p };
  }

  async summary(tenantId, sucursalId) {
    const { w, p } = this._scopeWhere(tenantId, sucursalId);
    const [[s]] = await this.pool.execute(`
      SELECT
        COUNT(*)                                                                    AS items,
        COALESCE(SUM(quantity),0)                                                   AS total_qty,
        COALESCE(SUM(CASE WHEN status='in_stock'    THEN quantity ELSE 0 END),0)    AS in_stock,
        COALESCE(SUM(CASE WHEN status='checked_out' THEN quantity ELSE 0 END),0)    AS checked_out,
        COALESCE(SUM(CASE WHEN status='maintenance' THEN quantity ELSE 0 END),0)    AS maintenance,
        COALESCE(SUM(CASE WHEN status='damaged'     THEN quantity ELSE 0 END),0)    AS damaged,
        COALESCE(SUM(CASE WHEN status='retired'     THEN quantity ELSE 0 END),0)    AS retired,
        COALESCE(SUM(CASE WHEN status='revision'    THEN quantity ELSE 0 END),0)    AS revision,
        COUNT(DISTINCT category_id)                                                 AS categories,
        COALESCE(SUM(quantity * COALESCE(unit_cost,0)),0)                           AS total_value
      FROM inventory_items WHERE ${w}
    `, p);
    return s;
  }

  async byStatus(tenantId, sucursalId) {
    const { w, p } = this._scopeWhere(tenantId, sucursalId);
    const [rows] = await this.pool.execute(
      `SELECT status, COUNT(*) AS items, COALESCE(SUM(quantity),0) AS quantity FROM inventory_items WHERE ${w} GROUP BY status ORDER BY quantity DESC`,
      p
    );
    return rows;
  }

  async byCategory(tenantId, sucursalId) {
    const { w, p } = this._scopeWhere(tenantId, sucursalId);
    const [rows] = await this.pool.execute(
      `SELECT COALESCE(NULLIF(category_name,''),'Sin categoría') AS name, COUNT(*) AS items, COALESCE(SUM(quantity),0) AS quantity FROM inventory_items WHERE ${w} GROUP BY category_name ORDER BY quantity DESC LIMIT 12`,
      p
    );
    return rows;
  }

  async bySucursal(tenantId) {
    const p = [tenantId];
    const [rows] = await this.pool.execute(
      `SELECT COALESCE(NULLIF(sucursal_name,''),'Sin sucursal') AS name, COUNT(*) AS items, COALESCE(SUM(quantity),0) AS quantity FROM inventory_items WHERE deleted_at IS NULL AND tenant_id = ? GROUP BY sucursal_name ORDER BY quantity DESC`,
      p
    );
    return rows;
  }

  async activity(tenantId, sucursalId, days, from, to) {
    let w, p, startDate, endDate;

    if (from && to) {
      startDate = new Date(from);
      endDate   = new Date(to);
      p = [`${from} 00:00:00`, `${to} 23:59:59`, tenantId];
      w = "timestamp >= ? AND timestamp <= ? AND action IN ('entry','checkout','return') AND tenant_id = ?";
    } else {
      const safeDays = Math.min(parseInt(days) || 30, 365);
      endDate   = new Date();
      startDate = new Date(); startDate.setDate(startDate.getDate() - (safeDays - 1));
      p = [safeDays, tenantId];
      w = "timestamp >= DATE_SUB(NOW(), INTERVAL ? DAY) AND action IN ('entry','checkout','return') AND tenant_id = ?";
    }

    if (sucursalId) {
      w += ' AND item_id IN (SELECT id FROM inventory_items WHERE sucursal_id = ? AND deleted_at IS NULL)';
      p.push(sucursalId);
    }
    const [rows] = await this.pool.execute(
      `SELECT DATE_FORMAT(timestamp,'%Y-%m-%d') AS date, action, COUNT(*) AS cnt FROM activity_logs WHERE ${w} GROUP BY DATE_FORMAT(timestamp,'%Y-%m-%d'), action ORDER BY date ASC`,
      p
    );
    const map = {};
    const cur = new Date(startDate);
    while (cur <= endDate) {
      const key = cur.toISOString().slice(0, 10);
      map[key] = { date: key, entry: 0, checkout: 0, return: 0 };
      cur.setDate(cur.getDate() + 1);
    }
    for (const r of rows) { if (map[r.date]) map[r.date][r.action] = Number(r.cnt); }
    return Object.values(map);
  }

  async byEstante(tenantId, sucursalId) {
    const p = [tenantId];
    let w = 'e.deleted_at IS NULL AND e.tenant_id = ?';
    if (sucursalId) { w += ' AND e.sucursal_id = ?'; p.push(sucursalId); }
    const [rows] = await this.pool.execute(
      `SELECT e.name, e.type, e.sucursal_name, COUNT(i.id) AS items, COALESCE(SUM(i.quantity),0) AS quantity FROM estantes e LEFT JOIN inventory_items i ON i.shelf_id = e.id AND i.deleted_at IS NULL WHERE ${w} GROUP BY e.id, e.name, e.type, e.sucursal_name ORDER BY quantity DESC LIMIT 12`,
      p
    );
    return rows;
  }

  async exits(tenantId, sucursalId, days, from, to) {
    let w, p;

    if (from && to) {
      p = [`${from} 00:00:00`, `${to} 23:59:59`, tenantId];
      w = "action = 'exit' AND timestamp >= ? AND timestamp <= ? AND tenant_id = ?";
    } else {
      const safeDays = Math.min(parseInt(days) || 30, 365);
      p = [safeDays, tenantId];
      w = "action = 'exit' AND timestamp >= DATE_SUB(NOW(), INTERVAL ? DAY) AND tenant_id = ?";
    }

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

  async topItems(tenantId, sucursalId) {
    const p = [tenantId];
    let w = "l.action IN ('checkout','entry') AND l.tenant_id = ?";
    if (sucursalId) {
      w += ' AND l.item_id IN (SELECT id FROM inventory_items WHERE sucursal_id = ? AND deleted_at IS NULL)';
      p.push(sucursalId);
    }
    const [rows] = await this.pool.execute(
      `SELECT l.item_name AS name, l.item_id, COUNT(*) AS movements FROM activity_logs l WHERE ${w} GROUP BY l.item_id, l.item_name ORDER BY movements DESC LIMIT 8`,
      p
    );
    return rows;
  }
}
