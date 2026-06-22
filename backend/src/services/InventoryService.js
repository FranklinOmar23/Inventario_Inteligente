import { ValidationError, NotFoundError, ForbiddenError } from '../errors/AppError.js';

const BOARD_STATUSES = ['maintenance', 'revision', 'retired', 'damaged'];
const STATUS_LABEL = { maintenance: 'Mantenimiento', revision: 'Revisión', retired: 'Retirado', damaged: 'Dañado / Baja' };

export class InventoryService {
  constructor(inventoryRepo, logRepo, tenantRepo) {
    this.repo      = inventoryRepo;
    this.logRepo   = logRepo;
    this.tenantRepo = tenantRepo;
  }

  async list(tenantId, filters, user) {
    const forcedSucursal = user.role !== 'admin' ? user.sucursal_id : null;
    return this.repo.search(tenantId, { ...filters, sucursal_id: forcedSucursal || filters.sucursal_id });
  }

  async getDamaged(tenantId, limit) {
    return this.repo.findDamaged(tenantId, limit);
  }

  async getById(id, tenantId) {
    const item = await this.repo.findById(id, tenantId);
    if (!item) throw new NotFoundError('Item no encontrado');
    return item;
  }

  async create(tenantId, data) {
    if (!data.name) throw new ValidationError('Nombre requerido');
    const id    = crypto.randomUUID();
    const today = new Date().toISOString().split('T')[0];
    await this.repo.create({ ...data, id, entry_date: data.entry_date || today, tenant_id: tenantId });
    return this.repo.findById(id);
  }

  async bulkCreate(tenantId, items) {
    if (!Array.isArray(items) || !items.length) throw new ValidationError('Se requiere un arreglo de items');
    const today = new Date().toISOString().split('T')[0];
    const ids = [];
    for (const item of items) {
      if (!item.name) throw new ValidationError('Falta el nombre en uno de los productos');
      const id = crypto.randomUUID();
      await this.repo.create({ ...item, id, entry_date: item.entry_date || today, tenant_id: tenantId });
      ids.push(id);
    }
    const rows = await this.repo.findByIds(ids);
    const byId = new Map(rows.map(r => [r.id, r]));
    return ids.map(id => byId.get(id));
  }

  async update(id, tenantId, body) {
    const cur = await this.repo.findById(id, tenantId);
    if (!cur) throw new NotFoundError('Item no encontrado');
    const u = { ...cur, ...body };
    await this.repo.update(id, u);

    const performed_by    = body.performed_by    ?? 'Sistema';
    const performed_by_id = body.performed_by_id ?? null;

    // Log shelf changes
    if (body.shelf_id !== undefined && body.shelf_id !== cur.shelf_id) {
      const from = cur.shelf_name  || 'Sin estante';
      const to   = u.shelf_name   || 'Sin estante';
      await this.logRepo.insert({
        id: crypto.randomUUID(), action: 'shelf_change', tenant_id: tenantId,
        item_id: cur.id, item_name: cur.name,
        department_name: cur.department_name ?? '', quantity: cur.quantity || 1,
        performed_by, performed_by_id,
        details: `Estante: ${from} → ${to}`,
      });
    }

    // Log department/sucursal transfers via edit
    if (body.department_id !== undefined && body.department_id !== cur.department_id) {
      const from = cur.department_name || 'Sin departamento';
      const to   = u.department_name  || 'Sin departamento';
      await this.logRepo.insert({
        id: crypto.randomUUID(), action: 'transfer', tenant_id: tenantId,
        item_id: cur.id, item_name: cur.name,
        department_name: u.department_name ?? '', quantity: cur.quantity || 1,
        performed_by, performed_by_id,
        details: `Departamento: ${from} → ${to}`,
      });
    }

    return this.repo.findById(id);
  }

  async transfer(id, tenantId, body) {
    const { to_department_id, to_department_name, to_sucursal_id, to_sucursal_name, performed_by, performed_by_id, notes, quantity = 1 } = body;
    if (!to_department_id) throw new ValidationError('Departamento destino requerido');

    const item = await this.repo.findById(id, tenantId);
    if (!item) throw new NotFoundError('Item no encontrado');

    const qty = Number(quantity) || 1;
    if (qty > item.quantity) throw new ValidationError(`Solo hay ${item.quantity} unidad(es) disponibles`);

    let resultId = id;

    if (qty >= item.quantity) {
      await this.repo.rawExecute(
        "UPDATE inventory_items SET department_id=?, department_name=?, sucursal_id=?, sucursal_name=?, status='in_stock' WHERE id=?",
        [to_department_id, to_department_name ?? '', to_sucursal_id ?? null, to_sucursal_name ?? '', id]
      );
    } else {
      await this.repo.decrementQuantity(id, qty);
      const dest = await this.repo.findSimilarAtDest(item.name, item.brand, item.model, to_department_id, 'in_stock');
      if (dest) {
        await this.repo.incrementQuantity(dest.id, qty);
        resultId = dest.id;
      } else {
        const newId = crypto.randomUUID();
        await this.repo.rawExecute(`
          INSERT INTO inventory_items
            (id, name, description, category_id, category_name, department_id, department_name, sucursal_id, sucursal_name, status, quantity, model, brand, notes, entry_date, has_unique_id, tenant_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'in_stock', ?, ?, ?, ?, ?, ?, ?)
        `, [
          newId, item.name, item.description ?? '',
          item.category_id ?? null, item.category_name ?? '',
          to_department_id, to_department_name ?? '',
          to_sucursal_id ?? null, to_sucursal_name ?? '',
          qty, item.model ?? '', item.brand ?? '',
          `Traspasado desde ${item.department_name ?? ''}${item.sucursal_name ? ` (${item.sucursal_name})` : ''}`,
          item.entry_date ?? null, 0, tenantId,
        ]);
        resultId = newId;
      }
    }

    await this.logRepo.insert({
      id: crypto.randomUUID(), action: 'transfer', tenant_id: tenantId,
      item_id: item.id, item_name: item.name, category_name: item.category_name ?? '',
      department_name: to_department_name ?? '',
      from_department_name: item.department_name ?? '', to_department_name: to_department_name ?? '',
      from_sucursal_name: item.sucursal_name ?? '', to_sucursal_name: to_sucursal_name ?? '',
      quantity: qty, performed_by: performed_by ?? '', performed_by_id: performed_by_id ?? null,
      details: notes ?? `Traspaso: ${item.department_name} → ${to_department_name} (${qty} uds.)`,
    });

    const result = await this.repo.findById(resultId);
    return result ?? { success: true };
  }

  async changeStatus(id, tenantId, { new_status, quantity = 1, performed_by, performed_by_id, notes }) {
    const VALID = ['in_stock','checked_out','maintenance','revision','damaged','retired'];
    if (!new_status || !VALID.includes(new_status)) throw new ValidationError('Estado inválido');

    const item = await this.repo.findById(id, tenantId);
    if (!item) throw new NotFoundError('Item no encontrado');

    const qty = Number(quantity) || 1;
    if (qty > item.quantity) throw new ValidationError(`Solo hay ${item.quantity} unidad(es) disponibles`);

    if (new_status === 'damaged') {
      if (qty >= item.quantity) await this.repo.damage(id);
      else await this.repo.decrementQuantity(id, qty);

      await this.logRepo.insert({
        id: crypto.randomUUID(), action: 'damaged', tenant_id: tenantId,
        item_id: item.id, item_name: item.name, category_name: item.category_name ?? '',
        department_name: item.department_name ?? '', quantity: qty,
        performed_by: performed_by ?? '', performed_by_id: performed_by_id ?? null,
        details: notes ?? `${qty} unidad(es) dañada(s) — dada(s) de baja`,
      });
      return { success: true, damaged_count: qty };
    }

    if (qty >= item.quantity) {
      await this.repo.setStatus(id, new_status);
    } else {
      await this.repo.decrementQuantity(id, qty);
      const match = await this.repo.findSimilarAtDest(item.name, item.brand, item.model, item.department_id, new_status);
      if (match) {
        await this.repo.incrementQuantity(match.id, qty);
      } else {
        await this.repo.rawExecute(`
          INSERT INTO inventory_items
            (id, name, description, category_id, category_name, department_id, department_name, sucursal_id, sucursal_name, status, quantity, model, brand, entry_date, has_unique_id, tenant_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          crypto.randomUUID(), item.name, item.description ?? '',
          item.category_id ?? null, item.category_name ?? '',
          item.department_id ?? null, item.department_name ?? '',
          item.sucursal_id ?? null, item.sucursal_name ?? '',
          new_status, qty, item.model ?? '', item.brand ?? '',
          item.entry_date ?? null, 0, tenantId,
        ]);
      }
    }

    await this.logRepo.insert({
      id: crypto.randomUUID(), action: 'status_change', tenant_id: tenantId,
      item_id: item.id, item_name: item.name, category_name: item.category_name ?? '',
      department_name: item.department_name ?? '', quantity: qty,
      performed_by: performed_by ?? '', performed_by_id: performed_by_id ?? null,
      details: notes ?? `${qty} uds: ${item.status} → ${new_status}`,
    });

    const updated = await this.repo.findById(id);
    return updated ?? { success: true };
  }

  async exit(id, tenantId, { quantity = 1, reason, destination, performed_by, performed_by_id, notes }) {
    if (!reason) throw new ValidationError('Motivo de salida requerido');

    const tenant = await this.tenantRepo.findByIdRaw(tenantId);
    if (tenant?.inventory_type === 'physical') {
      throw new ForbiddenError('La Salida no está disponible para Inventario Físico. Usa Traspaso.');
    }

    const item = await this.repo.findById(id, tenantId);
    if (!item) throw new NotFoundError('Item no encontrado');

    const exitQty    = Number(quantity) || 1;
    if (exitQty > item.quantity) throw new ValidationError(`Solo hay ${item.quantity} unidad(es) disponibles`);

    const unitCost   = item.unit_cost != null ? Number(item.unit_cost) : null;
    const totalValue = unitCost != null ? unitCost * exitQty : null;

    if (exitQty >= item.quantity) await this.repo.retire(id);
    else await this.repo.decrementQuantity(id, exitQty);

    const logId    = crypto.randomUUID();
    const timestamp = new Date();
    await this.logRepo.insert({
      id: logId, action: 'exit', tenant_id: tenantId,
      item_id: item.id, item_name: item.name,
      category_name: item.category_name ?? '', department_name: item.department_name ?? '',
      quantity: exitQty, unit_cost: unitCost, total_value: totalValue,
      performed_by: performed_by ?? '', performed_by_id: performed_by_id ?? null,
      reason, destination: destination ?? null,
      details: notes ?? `Salida: ${exitQty} ud(s) · Motivo: ${reason}${destination ? ' · Destino: ' + destination : ''}`,
      timestamp,
    });

    return { success: true, exited: exitQty, unit_cost: unitCost, total_value: totalValue, log_id: logId, timestamp };
  }

  async bulkSetStatus(tenantId, { new_status, performed_by, performed_by_id, all: moveAll = false, item_ids = [] }) {
    if (!BOARD_STATUSES.includes(new_status)) throw new ValidationError('Estado no válido');

    let targets;
    if (moveAll) {
      targets = await this.repo.rawQuery(
        "SELECT id, name, quantity, department_name FROM inventory_items WHERE deleted_at IS NULL AND status NOT IN ('maintenance','revision','retired','damaged') AND tenant_id = ?",
        [tenantId]
      );
    } else {
      if (!item_ids.length) throw new ValidationError('Se requieren item_ids o all:true');
      const ph = item_ids.map(() => '?').join(',');
      targets = await this.repo.rawQuery(
        `SELECT id, name, quantity, department_name FROM inventory_items WHERE id IN (${ph}) AND deleted_at IS NULL`,
        item_ids
      );
    }
    if (!targets.length) return { updated: 0 };

    const ids   = targets.map(i => i.id);
    await this.repo.bulkSetStatus(ids, new_status, new_status === 'damaged');

    await this.logRepo.bulkInsert(targets.map(item => ({
      id: crypto.randomUUID(), action: 'status_change', item_id: item.id, item_name: item.name,
      department_name: item.department_name ?? '',
      performed_by: performed_by ?? 'Sistema', performed_by_id: performed_by_id ?? null,
      details: `Movido a ${STATUS_LABEL[new_status]} (operación masiva)`, quantity: item.quantity || 1,
    })));

    return { updated: targets.length };
  }

  async restore(id, tenantId, { performed_by, performed_by_id }) {
    const item = await this.repo.rawQuery('SELECT * FROM inventory_items WHERE id = ?', [id]);
    if (!item.length) throw new NotFoundError('Item no encontrado');
    const cur = item[0];
    await this.repo.restore(id);
    const prevStatus = cur.deleted_at ? 'damaged' : (cur.status ?? 'unknown');
    await this.logRepo.insert({
      id: crypto.randomUUID(), action: 'restored', tenant_id: tenantId,
      item_id: cur.id, item_name: cur.name, department_name: cur.department_name ?? '',
      quantity: cur.quantity || 1,
      performed_by: performed_by ?? 'Sistema', performed_by_id: performed_by_id ?? null,
      details: `Restaurado a En Stock desde ${prevStatus}`,
    });
    return this.repo.rawQuery('SELECT * FROM inventory_items WHERE id = ?', [id]).then(r => r[0]);
  }

  async updateNotes(id, notes) {
    const rows = await this.repo.rawQuery('SELECT id FROM inventory_items WHERE id = ?', [id]);
    if (!rows.length) throw new NotFoundError('Item no encontrado');
    await this.repo.updateNotes(id, notes);
  }

  async softDelete(id, tenantId) {
    const item = await this.repo.findById(id, tenantId);
    if (!item) throw new NotFoundError('Item no encontrado');
    await this.repo.softDelete(id);
  }

  async permanentDelete(id) {
    const rows = await this.repo.rawQuery('SELECT id FROM inventory_items WHERE id = ? AND deleted_at IS NOT NULL', [id]);
    if (!rows.length) throw new NotFoundError('Item no encontrado en bajas');
    await this.repo.rawExecute('DELETE FROM activity_logs WHERE item_id = ?', [id]);
    await this.repo.permanentDelete(id);
  }
}
