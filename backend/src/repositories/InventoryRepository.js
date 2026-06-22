import { BaseRepository } from './BaseRepository.js';

export class InventoryRepository extends BaseRepository {
  constructor(pool) { super(pool, 'inventory_items'); }

  toItem(row) {
    return { ...row, has_unique_id: !!row.has_unique_id };
  }

  async search(tenantId, { status, category_id, department_id, sucursal_id, shelf_id, search, limit = 200 } = {}) {
    let sql = 'SELECT * FROM inventory_items WHERE deleted_at IS NULL AND tenant_id = ?';
    const p = [tenantId];
    if (status)        { sql += ' AND status = ?';        p.push(status); }
    if (category_id)   { sql += ' AND category_id = ?';   p.push(category_id); }
    if (department_id) { sql += ' AND department_id = ?'; p.push(department_id); }
    if (sucursal_id)   { sql += ' AND sucursal_id = ?';   p.push(sucursal_id); }
    if (shelf_id)      { sql += ' AND shelf_id = ?';      p.push(shelf_id); }
    if (search) {
      sql += ' AND (name LIKE ? OR asset_tag LIKE ? OR service_tag LIKE ? OR serial_number LIKE ? OR brand LIKE ? OR model LIKE ?)';
      const q = `%${search}%`;
      p.push(q, q, q, q, q, q);
    }
    sql += ' ORDER BY created_at DESC LIMIT ?';
    p.push(Number(limit));
    const [rows] = await this.pool.execute(sql, p);
    return rows.map(r => this.toItem(r));
  }

  async findDamaged(tenantId, limit = 500) {
    const [rows] = await this.pool.execute(`
      SELECT i.*,
        al.performed_by AS damaged_by,
        al.timestamp    AS damaged_at,
        al.details      AS damage_notes
      FROM inventory_items i
      LEFT JOIN activity_logs al
        ON al.id = (
          SELECT id FROM activity_logs
          WHERE item_id = i.id
            AND action IN ('damaged','status_change','maintenance','revision','retired')
            AND deleted_at IS NULL
          ORDER BY timestamp DESC LIMIT 1
        )
      WHERE (i.deleted_at IS NOT NULL OR i.status NOT IN ('in_stock'))
        AND i.tenant_id = ?
      ORDER BY COALESCE(i.deleted_at, i.updated_at) DESC
      LIMIT ?
    `, [tenantId, Number(limit)]);
    return rows.map(r => this.toItem(r));
  }

  async create(data) {
    const {
      id, name, description, category_id, category_name,
      department_id, department_name, sucursal_id, sucursal_name,
      shelf_id, shelf_name, quantity, unit_cost,
      asset_tag, service_tag, serial_number, model, brand,
      photo_url, notes, entry_date, has_unique_id,
      expiration_date, batch_number, unit_measure, tenant_id,
    } = data;

    await this.pool.execute(`
      INSERT INTO inventory_items
        (id, name, description, category_id, category_name, department_id, department_name,
         sucursal_id, sucursal_name, shelf_id, shelf_name, status, quantity, unit_cost,
         asset_tag, service_tag, serial_number, model, brand, photo_url, notes, entry_date,
         has_unique_id, expiration_date, batch_number, unit_measure, tenant_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'in_stock', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, name, description ?? '', category_id ?? null, category_name ?? '',
      department_id ?? null, department_name ?? '',
      sucursal_id ?? null, sucursal_name ?? '',
      shelf_id ?? null, shelf_name ?? '',
      Number(quantity) || 1, unit_cost != null ? Number(unit_cost) : null,
      asset_tag ?? '', service_tag ?? '', serial_number ?? '',
      model ?? '', brand ?? '', photo_url ?? null,
      notes ?? null, entry_date,
      has_unique_id ? 1 : 0,
      expiration_date ?? null, batch_number ?? null, unit_measure ?? null,
      tenant_id,
    ]);
  }

  async update(id, u) {
    await this.pool.execute(`
      UPDATE inventory_items SET
        name=?, description=?, category_id=?, category_name=?, department_id=?,
        department_name=?, shelf_id=?, shelf_name=?, status=?, quantity=?, unit_cost=?,
        asset_tag=?, service_tag=?, serial_number=?, model=?, brand=?,
        photo_url=?, notes=?, entry_date=?, checkout_date=?, checked_out_to=?, has_unique_id=?,
        expiration_date=?, batch_number=?, unit_measure=?
      WHERE id=?
    `, [
      u.name, u.description ?? '', u.category_id ?? null, u.category_name ?? '',
      u.department_id ?? null, u.department_name ?? '',
      u.shelf_id ?? null, u.shelf_name ?? '',
      u.status, Number(u.quantity) || 0,
      u.unit_cost != null ? Number(u.unit_cost) : null,
      u.asset_tag ?? '', u.service_tag ?? '', u.serial_number ?? '',
      u.model ?? '', u.brand ?? '', u.photo_url ?? null,
      u.notes ?? null, u.entry_date ?? null,
      u.checkout_date ?? null, u.checked_out_to ?? null,
      u.has_unique_id ? 1 : 0,
      u.expiration_date ?? null, u.batch_number ?? null, u.unit_measure ?? null,
      id,
    ]);
  }

  async decrementQuantity(id, qty) {
    await this.pool.execute('UPDATE inventory_items SET quantity = quantity - ? WHERE id = ?', [qty, id]);
  }

  async incrementQuantity(id, qty) {
    await this.pool.execute('UPDATE inventory_items SET quantity = quantity + ? WHERE id = ?', [qty, id]);
  }

  async retire(id) {
    await this.pool.execute('UPDATE inventory_items SET deleted_at = NOW(), status = "retired" WHERE id = ?', [id]);
  }

  async setStatus(id, status) {
    await this.pool.execute('UPDATE inventory_items SET status = ? WHERE id = ?', [status, id]);
  }

  async damage(id) {
    await this.pool.execute('UPDATE inventory_items SET deleted_at = NOW(), status = "damaged" WHERE id = ?', [id]);
  }

  async restore(id) {
    await this.pool.execute(
      "UPDATE inventory_items SET deleted_at = NULL, status = 'in_stock', restored_at = NOW() WHERE id = ?",
      [id]
    );
  }

  async findSimilarAtDest(name, brand, model, departmentId, status) {
    const [rows] = await this.pool.execute(`
      SELECT id FROM inventory_items
      WHERE name = ? AND brand = ? AND model = ? AND department_id = ? AND status = ? AND deleted_at IS NULL
      LIMIT 1
    `, [name, brand ?? '', model ?? '', departmentId, status]);
    return rows[0] ?? null;
  }

  async updateNotes(id, notes) {
    await this.pool.execute('UPDATE inventory_items SET notes = ? WHERE id = ?', [notes ?? null, id]);
  }

  async bulkSetStatus(ids, status, softDelete = false) {
    const ph = ids.map(() => '?').join(',');
    if (softDelete) {
      await this.pool.execute(`UPDATE inventory_items SET deleted_at = NOW(), status = ? WHERE id IN (${ph})`, [status, ...ids]);
    } else {
      await this.pool.execute(`UPDATE inventory_items SET status = ? WHERE id IN (${ph})`, [status, ...ids]);
    }
  }

  async findByIds(ids) {
    const ph = ids.map(() => '?').join(',');
    const [rows] = await this.pool.execute(
      `SELECT * FROM inventory_items WHERE id IN (${ph}) AND deleted_at IS NULL`,
      ids
    );
    return rows.map(r => this.toItem(r));
  }

  async permanentDelete(id) {
    await this.pool.execute('DELETE FROM inventory_items WHERE id = ?', [id]);
  }

  async getSnapshot(tenantId) {
    const [[summary]] = await this.pool.execute(`
      SELECT
        COUNT(*)                                                          AS items,
        COALESCE(SUM(quantity),0)                                         AS total_qty,
        COALESCE(SUM(CASE WHEN status='in_stock'     THEN quantity END),0) AS in_stock,
        COALESCE(SUM(CASE WHEN status='checked_out'  THEN quantity END),0) AS checked_out,
        COALESCE(SUM(CASE WHEN status='maintenance'  THEN quantity END),0) AS maintenance,
        COALESCE(SUM(CASE WHEN status='damaged'      THEN quantity END),0) AS damaged,
        COALESCE(SUM(CASE WHEN status='retired'      THEN quantity END),0) AS retired
      FROM inventory_items WHERE tenant_id = ? AND deleted_at IS NULL`, [tenantId]);

    const [byCategory] = await this.pool.execute(`
      SELECT category_name, COUNT(*) AS items, COALESCE(SUM(quantity),0) AS qty
      FROM inventory_items WHERE tenant_id = ? AND deleted_at IS NULL
      GROUP BY category_name ORDER BY qty DESC LIMIT 15`, [tenantId]);

    const [byDept] = await this.pool.execute(`
      SELECT department_name, COUNT(*) AS items, COALESCE(SUM(quantity),0) AS qty
      FROM inventory_items WHERE tenant_id = ? AND deleted_at IS NULL AND department_name != ''
      GROUP BY department_name ORDER BY items DESC LIMIT 10`, [tenantId]);

    const [recent] = await this.pool.execute(`
      SELECT name, category_name, status, quantity, department_name, brand, model, asset_tag
      FROM inventory_items WHERE tenant_id = ? AND deleted_at IS NULL
      ORDER BY created_at DESC LIMIT 40`, [tenantId]);

    return { summary, byCategory, byDept, recent };
  }
}
