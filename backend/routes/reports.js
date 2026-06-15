import { Router } from 'express';
import { getDB } from '../db/database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);
const h = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Admin can pass ?sucursal_id=X to filter; non-admin always filtered to their sucursal
const forced = req =>
  req.user.role !== 'admin'
    ? req.user.sucursal_id
    : (req.query.sucursal_id || null);

// ── GET /api/reports/summary ──────────────────────────────────────────────────
router.get('/summary', h(async (req, res) => {
  const db = getDB();
  const fs = forced(req);
  const p  = [];
  let  w   = 'deleted_at IS NULL';
  if (fs) { w += ' AND sucursal_id = ?'; p.push(fs); }

  const [[s]] = await db.execute(`
    SELECT
      COUNT(*)                                                                    AS items,
      COALESCE(SUM(quantity),0)                                                   AS total_qty,
      COALESCE(SUM(CASE WHEN status='in_stock'    THEN quantity ELSE 0 END),0)    AS in_stock,
      COALESCE(SUM(CASE WHEN status='checked_out' THEN quantity ELSE 0 END),0)    AS checked_out,
      COALESCE(SUM(CASE WHEN status='maintenance' THEN quantity ELSE 0 END),0)    AS maintenance,
      COALESCE(SUM(CASE WHEN status='damaged'     THEN quantity ELSE 0 END),0)    AS damaged,
      COALESCE(SUM(CASE WHEN status='retired'     THEN quantity ELSE 0 END),0)    AS retired,
      COALESCE(SUM(CASE WHEN status='revision'    THEN quantity ELSE 0 END),0)    AS revision,
      COUNT(DISTINCT category_id)                                                 AS categories
    FROM inventory_items WHERE ${w}
  `, p);
  res.json(s);
}));

// ── GET /api/reports/by-status ────────────────────────────────────────────────
router.get('/by-status', h(async (req, res) => {
  const db = getDB();
  const fs = forced(req);
  const p  = [];
  let  w   = 'deleted_at IS NULL';
  if (fs) { w += ' AND sucursal_id = ?'; p.push(fs); }

  const [rows] = await db.execute(`
    SELECT status,
           COUNT(*)                    AS items,
           COALESCE(SUM(quantity), 0)  AS quantity
    FROM inventory_items WHERE ${w}
    GROUP BY status ORDER BY quantity DESC
  `, p);
  res.json(rows);
}));

// ── GET /api/reports/by-category ──────────────────────────────────────────────
router.get('/by-category', h(async (req, res) => {
  const db = getDB();
  const fs = forced(req);
  const p  = [];
  let  w   = 'deleted_at IS NULL';
  if (fs) { w += ' AND sucursal_id = ?'; p.push(fs); }

  const [rows] = await db.execute(`
    SELECT COALESCE(NULLIF(category_name,''), 'Sin categoría') AS name,
           COUNT(*)                                             AS items,
           COALESCE(SUM(quantity), 0)                          AS quantity
    FROM inventory_items WHERE ${w}
    GROUP BY category_name ORDER BY quantity DESC LIMIT 12
  `, p);
  res.json(rows);
}));

// ── GET /api/reports/by-sucursal ──────────────────────────────────────────────
router.get('/by-sucursal', h(async (req, res) => {
  const db = getDB();
  const [rows] = await db.execute(`
    SELECT COALESCE(NULLIF(sucursal_name,''), 'Sin sucursal') AS name,
           COUNT(*)                                            AS items,
           COALESCE(SUM(quantity), 0)                         AS quantity
    FROM inventory_items WHERE deleted_at IS NULL
    GROUP BY sucursal_name ORDER BY quantity DESC
  `);
  res.json(rows);
}));

// ── GET /api/reports/activity?days=30 ────────────────────────────────────────
router.get('/activity', h(async (req, res) => {
  const db   = getDB();
  const days = Math.min(parseInt(req.query.days) || 30, 90);
  const fs   = forced(req);
  const p    = [days];
  let   w    = `timestamp >= DATE_SUB(NOW(), INTERVAL ? DAY)
                AND action IN ('entry','checkout','return')`;
  if (fs) {
    w += ` AND item_id IN (
            SELECT id FROM inventory_items WHERE sucursal_id = ? AND deleted_at IS NULL)`;
    p.push(fs);
  }

  const [rows] = await db.execute(`
    SELECT DATE_FORMAT(timestamp,'%Y-%m-%d') AS date,
           action,
           COUNT(*)                          AS cnt
    FROM activity_logs WHERE ${w}
    GROUP BY DATE_FORMAT(timestamp,'%Y-%m-%d'), action
    ORDER BY date ASC
  `, p);

  // Build a full date range filled with zeros
  const map = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    map[key] = { date: key, entry: 0, checkout: 0, return: 0 };
  }
  for (const r of rows) { if (map[r.date]) map[r.date][r.action] = Number(r.cnt); }
  res.json(Object.values(map));
}));

// ── GET /api/reports/by-estante ───────────────────────────────────────────────
router.get('/by-estante', h(async (req, res) => {
  const db = getDB();
  const fs = forced(req);
  const p  = [];
  let  w   = 'e.deleted_at IS NULL';
  if (fs) { w += ' AND e.sucursal_id = ?'; p.push(fs); }

  const [rows] = await db.execute(`
    SELECT e.name, e.type, e.sucursal_name,
           COUNT(i.id)                       AS items,
           COALESCE(SUM(i.quantity), 0)      AS quantity
    FROM estantes e
    LEFT JOIN inventory_items i ON i.shelf_id = e.id AND i.deleted_at IS NULL
    WHERE ${w}
    GROUP BY e.id, e.name, e.type, e.sucursal_name
    ORDER BY quantity DESC LIMIT 12
  `, p);
  res.json(rows);
}));

// ── GET /api/reports/top-items ────────────────────────────────────────────────
router.get('/top-items', h(async (req, res) => {
  const db = getDB();
  const fs = forced(req);
  const p  = [];
  let  w   = 'l.action IN (\'checkout\',\'entry\')';
  if (fs) {
    w += ` AND l.item_id IN (
            SELECT id FROM inventory_items WHERE sucursal_id = ? AND deleted_at IS NULL)`;
    p.push(fs);
  }

  const [rows] = await db.execute(`
    SELECT l.item_name AS name, l.item_id,
           COUNT(*)    AS movements
    FROM activity_logs l
    WHERE ${w}
    GROUP BY l.item_id, l.item_name
    ORDER BY movements DESC LIMIT 8
  `, p);
  res.json(rows);
}));

export default router;
