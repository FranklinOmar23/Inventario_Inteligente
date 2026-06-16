import { Router } from 'express';
import { getDB } from '../db/database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const tid = req => req.user.tenant_id;

const toItem = r => ({ ...r, has_unique_id: !!r.has_unique_id });

async function createInventoryItem(db, tenantId, data) {
  const {
    name, description, category_id, category_name,
    department_id, department_name, sucursal_id, sucursal_name,
    shelf_id, shelf_name,
    quantity = 1, unit_cost, asset_tag, service_tag, serial_number, model, brand,
    photo_url, notes, entry_date, has_unique_id = false,
    expiration_date, batch_number, unit_measure,
  } = data;
  if (!name) throw Object.assign(new Error('Nombre requerido'), { status: 400 });

  const id = crypto.randomUUID();
  const today = new Date().toISOString().split('T')[0];

  await db.execute(`
    INSERT INTO inventory_items
      (id, name, description, category_id, category_name, department_id, department_name,
       sucursal_id, sucursal_name, shelf_id, shelf_name, status, quantity, unit_cost,
       asset_tag, service_tag, serial_number, model, brand, photo_url, notes, entry_date,
       has_unique_id, expiration_date, batch_number, unit_measure, tenant_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'in_stock', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id, name, description || '', category_id || null, category_name || '',
    department_id || null, department_name || '',
    sucursal_id || null, sucursal_name || '',
    shelf_id || null, shelf_name || '',
    Number(quantity) || 1, unit_cost != null ? Number(unit_cost) : null,
    asset_tag || '', service_tag || '', serial_number || '',
    model || '', brand || '', photo_url || null,
    notes || null, entry_date || today,
    has_unique_id ? 1 : 0,
    expiration_date || null, batch_number || null, unit_measure || null,
    tenantId,
  ]);

  return id;
}

/**
 * @swagger
 * tags:
 *   name: Inventory
 *   description: Gestión de ítems de inventario
 */

/**
 * @swagger
 * /api/inventory:
 *   get:
 *     summary: Listar ítems de inventario (con filtros opcionales)
 *     tags: [Inventory]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [in_stock, checked_out, maintenance, retired] }
 *       - in: query
 *         name: category_id
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: department_id
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Busca en nombre, asset_tag, service_tag, serial_number, marca y modelo
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 200 }
 *     responses:
 *       200:
 *         description: Lista de ítems
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/InventoryItem' }
 */
router.get('/', asyncHandler(async (req, res) => {
  const db = getDB();
  const { status, category_id, department_id, shelf_id, search, limit = 200 } = req.query;
  const forcedSucursal = req.user.role !== 'admin' ? req.user.sucursal_id : null;
  const sucursal_id = forcedSucursal || req.query.sucursal_id || null;

  let sql = 'SELECT * FROM inventory_items WHERE deleted_at IS NULL';
  const params = [];

  if (tid(req))      { sql += ' AND tenant_id = ?';     params.push(tid(req)); }
  if (status)        { sql += ' AND status = ?';        params.push(status); }
  if (category_id)   { sql += ' AND category_id = ?';   params.push(category_id); }
  if (department_id) { sql += ' AND department_id = ?'; params.push(department_id); }
  if (sucursal_id)   { sql += ' AND sucursal_id = ?';   params.push(sucursal_id); }
  if (shelf_id)      { sql += ' AND shelf_id = ?';      params.push(shelf_id); }
  if (search) {
    sql += ' AND (name LIKE ? OR asset_tag LIKE ? OR service_tag LIKE ? OR serial_number LIKE ? OR brand LIKE ? OR model LIKE ?)';
    const q = `%${search}%`;
    params.push(q, q, q, q, q, q);
  }

  sql += ' ORDER BY created_at DESC LIMIT ?';
  params.push(Number(limit));

  const [rows] = await db.execute(sql, params);
  res.json(rows.map(toItem));
}));

/**
 * @swagger
 * /api/inventory/{id}:
 *   get:
 *     summary: Obtener un ítem por ID
 *     tags: [Inventory]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Ítem encontrado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/InventoryItem' }
 *       404:
 *         description: No encontrado
 */
// GET /api/inventory/damaged — items con estado distinto a in_stock (o soft-deleted)
router.get('/damaged', asyncHandler(async (req, res) => {
  const db = getDB();
  const { limit = 500 } = req.query;

  const [rows] = await db.execute(`
    SELECT
      i.*,
      al.performed_by  AS damaged_by,
      al.timestamp     AS damaged_at,
      al.details       AS damage_notes
    FROM inventory_items i
    LEFT JOIN activity_logs al
      ON al.id = (
        SELECT id FROM activity_logs
        WHERE item_id = i.id
          AND action IN ('damaged','status_change','maintenance','revision','retired')
          AND deleted_at IS NULL
        ORDER BY timestamp DESC
        LIMIT 1
      )
    WHERE (i.deleted_at IS NOT NULL OR i.status NOT IN ('in_stock'))
    ${tid(req) ? 'AND i.tenant_id = ?' : ''}
    ORDER BY COALESCE(i.deleted_at, i.updated_at) DESC
    LIMIT ?
  `, tid(req) ? [tid(req), Number(limit)] : [Number(limit)]);

  res.json(rows.map(toItem));
}));

// POST /api/inventory/bulk-status — move multiple (or all) items to a board status
router.post('/bulk-status', asyncHandler(async (req, res) => {
  const { new_status, performed_by, performed_by_id, all: moveAll = false, item_ids = [] } = req.body;
  const BOARD_STATUSES = ['maintenance', 'revision', 'retired', 'damaged'];
  if (!BOARD_STATUSES.includes(new_status)) return res.status(400).json({ error: 'Estado no válido' });
  const db = getDB();

  let targets;
  if (moveAll) {
    let bulkSql = "SELECT id, name, quantity, department_name FROM inventory_items WHERE deleted_at IS NULL AND status NOT IN ('maintenance','revision','retired','damaged')";
    const bulkParams = [];
    if (tid(req)) { bulkSql += ' AND tenant_id = ?'; bulkParams.push(tid(req)); }
    const [rows] = await db.execute(bulkSql, bulkParams);
    targets = rows;
  } else {
    if (!item_ids.length) return res.status(400).json({ error: 'Se requieren item_ids o all:true' });
    const placeholders = item_ids.map(() => '?').join(',');
    const [rows] = await db.execute(`SELECT id, name, quantity, department_name FROM inventory_items WHERE id IN (${placeholders}) AND deleted_at IS NULL`, item_ids);
    targets = rows;
  }
  if (!targets.length) return res.json({ updated: 0 });

  const label = { maintenance: 'Mantenimiento', revision: 'Revisión', retired: 'Retirado', damaged: 'Dañado / Baja' }[new_status];
  const ids   = targets.map(i => i.id);
  const ph    = ids.map(() => '?').join(',');

  // Single batch UPDATE instead of N individual queries
  if (new_status === 'damaged') {
    await db.execute(`UPDATE inventory_items SET deleted_at = NOW(), status = ? WHERE id IN (${ph})`, [new_status, ...ids]);
  } else {
    await db.execute(`UPDATE inventory_items SET status = ? WHERE id IN (${ph})`, [new_status, ...ids]);
  }

  // Single batch INSERT for all log entries
  const logRows  = targets.map(item => [
    crypto.randomUUID(), 'status_change', item.id, item.name,
    item.department_name || '', performed_by || 'Sistema', performed_by_id || null,
    `Movido a ${label} (operación masiva)`, item.quantity || 1,
  ]);
  const rowPh    = logRows.map(() => '(?,?,?,?,?,?,?,?,?)').join(',');
  await db.execute(
    `INSERT INTO activity_logs (id, action, item_id, item_name, department_name, performed_by, performed_by_id, details, quantity) VALUES ${rowPh}`,
    logRows.flat()
  );

  res.json({ updated: targets.length });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const db = getDB();
  const [rows] = await db.execute(
    'SELECT * FROM inventory_items WHERE id = ? AND deleted_at IS NULL',
    [req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Item no encontrado' });
  res.json(toItem(rows[0]));
}));

/**
 * @swagger
 * /api/inventory:
 *   post:
 *     summary: Registrar entrada de ítem (Entrada)
 *     tags: [Inventory]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:            { type: string }
 *               description:     { type: string }
 *               category_id:     { type: string, format: uuid }
 *               category_name:   { type: string }
 *               department_id:   { type: string, format: uuid }
 *               department_name: { type: string }
 *               quantity:        { type: integer, default: 1 }
 *               asset_tag:       { type: string }
 *               service_tag:     { type: string }
 *               serial_number:   { type: string }
 *               model:           { type: string }
 *               brand:           { type: string }
 *               photo_url:       { type: string }
 *               notes:           { type: string }
 *               entry_date:      { type: string, format: date }
 *               has_unique_id:   { type: boolean, default: false }
 *     responses:
 *       201:
 *         description: Ítem registrado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/InventoryItem' }
 */
router.post('/', asyncHandler(async (req, res) => {
  const db = getDB();
  const id = await createInventoryItem(db, tid(req), req.body);
  const [rows] = await db.execute('SELECT * FROM inventory_items WHERE id = ?', [id]);
  res.status(201).json(toItem(rows[0]));
}));

/**
 * @swagger
 * /api/inventory/bulk:
 *   post:
 *     summary: Registrar varios ítems de una sola vez (ej. productos extraídos de una factura)
 *     tags: [Inventory]
 *     responses:
 *       201:
 *         description: Ítems registrados
 */
router.post('/bulk', asyncHandler(async (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Se requiere un arreglo de items' });
  }

  const db = getDB();
  const ids = [];
  for (const item of items) {
    if (!item.name) return res.status(400).json({ error: `Falta el nombre en uno de los productos` });
    ids.push(await createInventoryItem(db, tid(req), item));
  }

  const [rows] = await db.execute(
    `SELECT * FROM inventory_items WHERE id IN (${ids.map(() => '?').join(',')})`,
    ids
  );
  const byId = new Map(rows.map(r => [r.id, toItem(r)]));
  res.status(201).json(ids.map(id => byId.get(id)));
}));

/**
 * @swagger
 * /api/inventory/{id}:
 *   put:
 *     summary: Actualizar un ítem (incluye salida / checkout)
 *     tags: [Inventory]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/InventoryItem' }
 *     responses:
 *       200:
 *         description: Ítem actualizado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/InventoryItem' }
 *       404:
 *         description: No encontrado
 */
router.put('/:id', asyncHandler(async (req, res) => {
  const db = getDB();
  const [existing] = await db.execute(
    'SELECT * FROM inventory_items WHERE id = ? AND deleted_at IS NULL',
    [req.params.id]
  );
  if (existing.length === 0) return res.status(404).json({ error: 'Item no encontrado' });

  const cur = existing[0];
  const u = { ...cur, ...req.body };

  await db.execute(`
    UPDATE inventory_items SET
      name=?, description=?, category_id=?, category_name=?, department_id=?,
      department_name=?, shelf_id=?, shelf_name=?, status=?, quantity=?, unit_cost=?,
      asset_tag=?, service_tag=?, serial_number=?, model=?, brand=?,
      photo_url=?, notes=?, entry_date=?, checkout_date=?, checked_out_to=?, has_unique_id=?,
      expiration_date=?, batch_number=?, unit_measure=?
    WHERE id=?
  `, [
    u.name, u.description || '', u.category_id || null, u.category_name || '',
    u.department_id || null, u.department_name || '',
    u.shelf_id || null, u.shelf_name || '',
    u.status, Number(u.quantity) || 0,
    u.unit_cost != null ? Number(u.unit_cost) : null,
    u.asset_tag || '', u.service_tag || '', u.serial_number || '',
    u.model || '', u.brand || '', u.photo_url || null,
    u.notes || null, u.entry_date || null,
    u.checkout_date || null, u.checked_out_to || null,
    u.has_unique_id ? 1 : 0,
    u.expiration_date || null, u.batch_number || null, u.unit_measure || null,
    req.params.id,
  ]);

  const [rows] = await db.execute('SELECT * FROM inventory_items WHERE id = ?', [req.params.id]);
  res.json(toItem(rows[0]));
}));

/**
 * @swagger
 * /api/inventory/{id}/transfer:
 *   post:
 *     summary: Traspasar un ítem a otro departamento / sucursal
 *     tags: [Inventory]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [to_department_id, to_department_name]
 *             properties:
 *               to_department_id:   { type: string }
 *               to_department_name: { type: string }
 *               to_sucursal_id:     { type: string }
 *               to_sucursal_name:   { type: string }
 *               performed_by:       { type: string }
 *               performed_by_id:    { type: string }
 *               notes:              { type: string }
 *     responses:
 *       200:
 *         description: Traspaso realizado
 */
router.post('/:id/transfer', asyncHandler(async (req, res) => {
  const {
    to_department_id, to_department_name, to_sucursal_id, to_sucursal_name,
    performed_by, performed_by_id, notes, quantity = 1,
  } = req.body;
  if (!to_department_id) return res.status(400).json({ error: 'Departamento destino requerido' });

  const db = getDB();
  const [existing] = await db.execute(
    'SELECT * FROM inventory_items WHERE id = ? AND deleted_at IS NULL',
    [req.params.id]
  );
  if (existing.length === 0) return res.status(404).json({ error: 'Item no encontrado' });

  const item = existing[0];
  const transferQty = Number(quantity) || 1;
  if (transferQty > item.quantity) {
    return res.status(400).json({ error: `Solo hay ${item.quantity} unidad(es) disponibles` });
  }

  const fromDept    = item.department_name || '';
  const fromSucursal = item.sucursal_name  || '';
  let resultId = req.params.id;

  if (transferQty >= item.quantity) {
    // Move entire batch to new location
    await db.execute(`
      UPDATE inventory_items
      SET department_id=?, department_name=?, sucursal_id=?, sucursal_name=?, status='in_stock'
      WHERE id=?
    `, [to_department_id, to_department_name||'', to_sucursal_id||null, to_sucursal_name||'', req.params.id]);
  } else {
    // Partial: reduce source
    await db.execute('UPDATE inventory_items SET quantity=quantity-? WHERE id=?', [transferQty, req.params.id]);

    // Find same item already at destination (merge if exists)
    const [destMatch] = await db.execute(`
      SELECT id FROM inventory_items
      WHERE name=? AND brand=? AND model=? AND department_id=? AND status='in_stock' AND deleted_at IS NULL
      LIMIT 1
    `, [item.name, item.brand||'', item.model||'', to_department_id]);

    if (destMatch.length > 0) {
      await db.execute('UPDATE inventory_items SET quantity=quantity+? WHERE id=?', [transferQty, destMatch[0].id]);
      resultId = destMatch[0].id;
    } else {
      const newId = crypto.randomUUID();
      await db.execute(`
        INSERT INTO inventory_items
          (id, name, description, category_id, category_name,
           department_id, department_name, sucursal_id, sucursal_name,
           status, quantity, model, brand, notes, entry_date, has_unique_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'in_stock', ?, ?, ?, ?, ?, ?)
      `, [
        newId, item.name, item.description||'',
        item.category_id||null, item.category_name||'',
        to_department_id, to_department_name||'',
        to_sucursal_id||null, to_sucursal_name||'',
        transferQty, item.model||'', item.brand||'',
        `Traspasado desde ${fromDept}${fromSucursal ? ` (${fromSucursal})` : ''}`,
        item.entry_date||null, 0,
      ]);
      resultId = newId;
    }
  }

  await db.execute(`
    INSERT INTO activity_logs
      (id, action, item_id, item_name, category_name,
       department_name, from_department_name, to_department_name,
       from_sucursal_name, to_sucursal_name, quantity,
       performed_by, performed_by_id, details, timestamp)
    VALUES (?, 'transfer', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
  `, [
    crypto.randomUUID(), item.id, item.name, item.category_name||'',
    to_department_name||'', fromDept, to_department_name||'',
    fromSucursal, to_sucursal_name||'', transferQty,
    performed_by||'', performed_by_id||null,
    notes || `Traspaso: ${fromDept} → ${to_department_name} (${transferQty} uds.)`,
  ]);

  const [rows] = await db.execute('SELECT * FROM inventory_items WHERE id=? AND deleted_at IS NULL', [resultId]);
  res.json(rows.length > 0 ? toItem(rows[0]) : { success: true });
}));

// ── Change status of N units ───────────────────────────────────────────────────
router.patch('/:id/status', asyncHandler(async (req, res) => {
  const { new_status, quantity = 1, performed_by, performed_by_id, notes } = req.body;
  const VALID = ['in_stock', 'checked_out', 'maintenance', 'revision', 'damaged', 'retired'];
  if (!new_status || !VALID.includes(new_status)) {
    return res.status(400).json({ error: 'Estado inválido' });
  }

  const db = getDB();
  const [existing] = await db.execute(
    'SELECT * FROM inventory_items WHERE id=? AND deleted_at IS NULL',
    [req.params.id]
  );
  if (existing.length === 0) return res.status(404).json({ error: 'Item no encontrado' });

  const item = existing[0];
  const changeQty = Number(quantity) || 1;
  if (changeQty > item.quantity) {
    return res.status(400).json({ error: `Solo hay ${item.quantity} unidad(es) disponibles` });
  }

  if (new_status === 'damaged') {
    // Auto soft-delete damaged units
    if (changeQty >= item.quantity) {
      await db.execute('UPDATE inventory_items SET deleted_at=NOW() WHERE id=?', [req.params.id]);
    } else {
      await db.execute('UPDATE inventory_items SET quantity=quantity-? WHERE id=?', [changeQty, req.params.id]);
    }
    await db.execute(`
      INSERT INTO activity_logs
        (id, action, item_id, item_name, category_name, department_name, quantity, performed_by, performed_by_id, details, timestamp)
      VALUES (?, 'damaged', ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      crypto.randomUUID(), item.id, item.name, item.category_name||'',
      item.department_name||'', changeQty,
      performed_by||'', performed_by_id||null,
      notes || `${changeQty} unidad(es) dañada(s) — dada(s) de baja`,
    ]);
    return res.json({ success: true, damaged_count: changeQty });
  }

  // Other statuses: change entire batch or split
  if (changeQty >= item.quantity) {
    await db.execute('UPDATE inventory_items SET status=? WHERE id=?', [new_status, req.params.id]);
  } else {
    await db.execute('UPDATE inventory_items SET quantity=quantity-? WHERE id=?', [changeQty, req.params.id]);
    const [match] = await db.execute(`
      SELECT id FROM inventory_items
      WHERE name=? AND brand=? AND model=? AND department_id=? AND status=? AND deleted_at IS NULL LIMIT 1
    `, [item.name, item.brand||'', item.model||'', item.department_id, new_status]);
    if (match.length > 0) {
      await db.execute('UPDATE inventory_items SET quantity=quantity+? WHERE id=?', [changeQty, match[0].id]);
    } else {
      await db.execute(`
        INSERT INTO inventory_items
          (id, name, description, category_id, category_name,
           department_id, department_name, sucursal_id, sucursal_name,
           status, quantity, model, brand, entry_date, has_unique_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        crypto.randomUUID(), item.name, item.description||'',
        item.category_id||null, item.category_name||'',
        item.department_id||null, item.department_name||'',
        item.sucursal_id||null, item.sucursal_name||'',
        new_status, changeQty, item.model||'', item.brand||'',
        item.entry_date||null, 0,
      ]);
    }
  }

  await db.execute(`
    INSERT INTO activity_logs
      (id, action, item_id, item_name, category_name, department_name, quantity, performed_by, performed_by_id, details, timestamp)
    VALUES (?, 'status_change', ?, ?, ?, ?, ?, ?, ?, ?, NOW())
  `, [
    crypto.randomUUID(), item.id, item.name, item.category_name||'',
    item.department_name||'', changeQty,
    performed_by||'', performed_by_id||null,
    notes || `${changeQty} uds: ${item.status} → ${new_status}`,
  ]);

  const [rows] = await db.execute('SELECT * FROM inventory_items WHERE id=? AND deleted_at IS NULL', [req.params.id]);
  res.json(rows.length > 0 ? toItem(rows[0]) : { success: true });
}));

// ── Salida: permanent stock outflow (sale, consumption, disposal, etc.) ───────
router.post('/:id/exit', asyncHandler(async (req, res) => {
  const { quantity = 1, reason, destination, performed_by, performed_by_id, notes } = req.body;
  if (!reason) return res.status(400).json({ error: 'Motivo de salida requerido' });

  const db = getDB();

  if (tid(req)) {
    const [[tenantRow]] = await db.execute('SELECT inventory_type FROM tenants WHERE id = ?', [tid(req)]);
    if (tenantRow?.inventory_type === 'physical') {
      return res.status(400).json({ error: 'La Salida no está disponible para Inventario Físico. Usa Traspaso.' });
    }
  }

  const [existing] = await db.execute(
    'SELECT * FROM inventory_items WHERE id=? AND deleted_at IS NULL',
    [req.params.id]
  );
  if (existing.length === 0) return res.status(404).json({ error: 'Item no encontrado' });

  const item = existing[0];
  const exitQty = Number(quantity) || 1;
  if (exitQty > item.quantity) {
    return res.status(400).json({ error: `Solo hay ${item.quantity} unidad(es) disponibles` });
  }

  const unitCost   = item.unit_cost != null ? Number(item.unit_cost) : null;
  const totalValue = unitCost != null ? unitCost * exitQty : null;

  if (exitQty >= item.quantity) {
    await db.execute('UPDATE inventory_items SET deleted_at=NOW(), status="retired" WHERE id=?', [req.params.id]);
  } else {
    await db.execute('UPDATE inventory_items SET quantity=quantity-? WHERE id=?', [exitQty, req.params.id]);
  }

  const logId = crypto.randomUUID();
  const timestamp = new Date();
  await db.execute(`
    INSERT INTO activity_logs
      (id, action, item_id, item_name, category_name, department_name, quantity, unit_cost, total_value, performed_by, performed_by_id, reason, destination, details, timestamp, tenant_id)
    VALUES (?, 'exit', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    logId, item.id, item.name, item.category_name||'', item.department_name||'', exitQty,
    unitCost, totalValue, performed_by||'', performed_by_id||null,
    reason, destination || null,
    notes || `Salida: ${exitQty} ud(s) · Motivo: ${reason}${destination ? ' · Destino: '+destination : ''}`,
    timestamp, tid(req),
  ]);

  res.json({ success: true, exited: exitQty, unit_cost: unitCost, total_value: totalValue, log_id: logId, timestamp });
}));

// PATCH /:id/notes — actualizar observaciones/notas del item
router.patch('/:id/notes', asyncHandler(async (req, res) => {
  const { notes } = req.body;
  const db = getDB();
  const [existing] = await db.execute(
    'SELECT id FROM inventory_items WHERE id=? AND deleted_at IS NULL',
    [req.params.id]
  );
  if (existing.length === 0) {
    // try soft-deleted items too (damaged items can have notes updated)
    const [del] = await db.execute('SELECT id FROM inventory_items WHERE id=?', [req.params.id]);
    if (del.length === 0) return res.status(404).json({ error: 'Item no encontrado' });
  }
  await db.execute('UPDATE inventory_items SET notes=? WHERE id=?', [notes ?? null, req.params.id]);
  res.json({ success: true });
}));

/**
 * @swagger
 * /api/inventory/{id}:
 *   delete:
 *     summary: Eliminar (soft delete) un ítem del inventario
 *     tags: [Inventory]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Eliminado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *       404:
 *         description: No encontrado
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const db = getDB();
  const [existing] = await db.execute(
    'SELECT id FROM inventory_items WHERE id = ? AND deleted_at IS NULL',
    [req.params.id]
  );
  if (existing.length === 0) return res.status(404).json({ error: 'Item no encontrado' });

  await db.execute('UPDATE inventory_items SET deleted_at = NOW() WHERE id = ?', [req.params.id]);
  res.json({ success: true });
}));

// PATCH /api/inventory/:id/restore — restore any board item back to in_stock
router.patch('/:id/restore', asyncHandler(async (req, res) => {
  const { performed_by, performed_by_id } = req.body;
  const db = getDB();

  const [existing] = await db.execute(
    'SELECT * FROM inventory_items WHERE id = ?',
    [req.params.id]
  );
  if (existing.length === 0) return res.status(404).json({ error: 'Item no encontrado' });

  const item = existing[0];
  await db.execute(
    "UPDATE inventory_items SET deleted_at = NULL, status = 'in_stock', restored_at = NOW() WHERE id = ?",
    [req.params.id]
  );

  const prevStatus = item.deleted_at ? 'damaged' : (item.status || 'unknown');
  await db.execute(
    `INSERT INTO activity_logs (id, action, item_id, item_name, department_name, performed_by, performed_by_id, details, quantity)
     VALUES (?, 'restored', ?, ?, ?, ?, ?, ?, ?)`,
    [crypto.randomUUID(), item.id, item.name, item.department_name || '', performed_by || 'Sistema', performed_by_id || null, `Restaurado a En Stock desde ${prevStatus}`, item.quantity || 1]
  );

  const [updated] = await db.execute('SELECT * FROM inventory_items WHERE id = ?', [req.params.id]);
  res.json(toItem(updated[0]));
}));

// DELETE /api/inventory/:id/permanent — hard delete a soft-deleted item
router.delete('/:id/permanent', asyncHandler(async (req, res) => {
  const db = getDB();
  const [existing] = await db.execute(
    'SELECT id FROM inventory_items WHERE id = ? AND deleted_at IS NOT NULL',
    [req.params.id]
  );
  if (existing.length === 0) return res.status(404).json({ error: 'Item no encontrado en bajas' });

  await db.execute('DELETE FROM activity_log WHERE item_id = ?', [req.params.id]);
  await db.execute('DELETE FROM inventory_items WHERE id = ?', [req.params.id]);
  res.json({ success: true });
}));

export default router;
