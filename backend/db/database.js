import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

let pool;

export function getDB() {
  if (!pool) {
    pool = mysql.createPool({
      host:             process.env.DB_HOST     || 'localhost',
      port:             Number(process.env.DB_PORT) || 3306,
      user:             process.env.DB_USER,
      password:         process.env.DB_PASSWORD,
      database:         process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit:  10,
      charset:          'utf8mb4',
      timezone:         '+00:00',
    });
  }
  return pool;
}

async function addCol(db, table, col, def) {
  try {
    await db.execute(`ALTER TABLE \`${table}\` ADD COLUMN ${col} ${def}`);
  } catch (e) {
    if (e.errno !== 1060) throw e; // 1060 = Duplicate column name — already exists
  }
}

export async function initDB() {
  const db = getDB();

  // ── Core tables ────────────────────────────────────────────────────────────
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id            VARCHAR(36)  NOT NULL,
      email         VARCHAR(255) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      full_name     VARCHAR(255) NOT NULL,
      role          ENUM('admin','user') NOT NULL DEFAULT 'user',
      created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at    DATETIME DEFAULT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uq_users_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS sucursales (
      id          VARCHAR(36)  NOT NULL,
      name        VARCHAR(255) NOT NULL,
      address     TEXT         DEFAULT NULL,
      manager     VARCHAR(255) DEFAULT '',
      phone       VARCHAR(50)  DEFAULT '',
      created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at  DATETIME DEFAULT NULL,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS departments (
      id            VARCHAR(36)  NOT NULL,
      name          VARCHAR(255) NOT NULL,
      description   TEXT         DEFAULT NULL,
      manager       VARCHAR(255) DEFAULT '',
      sucursal_id   VARCHAR(36)  DEFAULT NULL,
      sucursal_name VARCHAR(255) DEFAULT '',
      created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at    DATETIME DEFAULT NULL,
      PRIMARY KEY (id),
      KEY idx_dept_sucursal (sucursal_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS categories (
      id                 VARCHAR(36)  NOT NULL,
      name               VARCHAR(255) NOT NULL,
      requires_asset_tag TINYINT(1)   NOT NULL DEFAULT 0,
      requires_unique_id TINYINT(1)   NOT NULL DEFAULT 0,
      minimum_stock      INT          NOT NULL DEFAULT 5,
      created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at         DATETIME DEFAULT NULL,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS inventory_items (
      id              VARCHAR(36)  NOT NULL,
      name            VARCHAR(255) NOT NULL,
      description     TEXT         DEFAULT NULL,
      category_id     VARCHAR(36)  DEFAULT NULL,
      category_name   VARCHAR(255) DEFAULT '',
      department_id   VARCHAR(36)  DEFAULT NULL,
      department_name VARCHAR(255) DEFAULT '',
      sucursal_id     VARCHAR(36)  DEFAULT NULL,
      sucursal_name   VARCHAR(255) DEFAULT '',
      status          ENUM('in_stock','checked_out','maintenance','retired') NOT NULL DEFAULT 'in_stock',
      quantity        INT          NOT NULL DEFAULT 1,
      asset_tag       VARCHAR(100) DEFAULT '',
      service_tag     VARCHAR(100) DEFAULT '',
      serial_number   VARCHAR(100) DEFAULT '',
      model           VARCHAR(255) DEFAULT '',
      brand           VARCHAR(255) DEFAULT '',
      photo_url       TEXT         DEFAULT NULL,
      notes           TEXT         DEFAULT NULL,
      entry_date      DATE         DEFAULT NULL,
      checkout_date   DATETIME     DEFAULT NULL,
      checked_out_to  VARCHAR(255) DEFAULT NULL,
      has_unique_id   TINYINT(1)   NOT NULL DEFAULT 0,
      created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at      DATETIME DEFAULT NULL,
      PRIMARY KEY (id),
      KEY idx_inv_status     (status),
      KEY idx_inv_category   (category_id),
      KEY idx_inv_department (department_id),
      KEY idx_inv_sucursal   (sucursal_id),
      CONSTRAINT fk_inv_category   FOREIGN KEY (category_id)   REFERENCES categories  (id) ON DELETE SET NULL,
      CONSTRAINT fk_inv_department FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id                   VARCHAR(36)  NOT NULL,
      action               VARCHAR(100) NOT NULL,
      item_id              VARCHAR(36)  DEFAULT NULL,
      item_name            VARCHAR(255) DEFAULT '',
      category_name        VARCHAR(255) DEFAULT '',
      department_name      VARCHAR(255) DEFAULT '',
      from_department_name VARCHAR(255) DEFAULT '',
      to_department_name   VARCHAR(255) DEFAULT '',
      from_sucursal_name   VARCHAR(255) DEFAULT '',
      to_sucursal_name     VARCHAR(255) DEFAULT '',
      quantity             INT          DEFAULT 1,
      performed_by         VARCHAR(255) DEFAULT '',
      performed_by_id      VARCHAR(36)  DEFAULT NULL,
      checked_out_to       VARCHAR(255) DEFAULT NULL,
      details              TEXT         DEFAULT NULL,
      timestamp            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at           DATETIME DEFAULT NULL,
      PRIMARY KEY (id),
      KEY idx_logs_action (action),
      KEY idx_logs_item   (item_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS estantes (
      id            VARCHAR(36)  NOT NULL,
      name          VARCHAR(255) NOT NULL,
      description   TEXT         DEFAULT NULL,
      sucursal_id   VARCHAR(36)  DEFAULT NULL,
      sucursal_name VARCHAR(255) DEFAULT '',
      created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at    DATETIME DEFAULT NULL,
      PRIMARY KEY (id),
      KEY idx_estantes_sucursal (sucursal_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id                 VARCHAR(36)  NOT NULL,
      category_id        VARCHAR(36)  DEFAULT NULL,
      category_name      VARCHAR(255) DEFAULT '',
      quantity_suggested INT          NOT NULL DEFAULT 1,
      status             ENUM('pending','approved','rejected','completed') NOT NULL DEFAULT 'pending',
      notes              TEXT         DEFAULT NULL,
      created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at         DATETIME DEFAULT NULL,
      PRIMARY KEY (id),
      KEY idx_po_category (category_id),
      KEY idx_po_status   (status),
      CONSTRAINT fk_po_category FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // ── Migrations: add columns to existing tables if they don't exist ──────────
  // Users: permissions (JSON array of keys) and assigned sucursal
  await addCol(db, 'users', 'permissions', 'TEXT DEFAULT NULL AFTER role');
  await addCol(db, 'users', 'sucursal_id', 'VARCHAR(36) DEFAULT NULL AFTER permissions');
  // Inventory items: physical shelf location
  await addCol(db, 'inventory_items', 'shelf_id',   'VARCHAR(36) DEFAULT NULL');
  await addCol(db, 'inventory_items', 'shelf_name', 'VARCHAR(255) DEFAULT ""');

  await addCol(db, 'departments',      'sucursal_id',           'VARCHAR(36) DEFAULT NULL AFTER manager');
  await addCol(db, 'departments',      'sucursal_name',         'VARCHAR(255) DEFAULT "" AFTER sucursal_id');
  await addCol(db, 'inventory_items',  'sucursal_id',           'VARCHAR(36) DEFAULT NULL AFTER department_name');
  await addCol(db, 'inventory_items',  'sucursal_name',         'VARCHAR(255) DEFAULT "" AFTER sucursal_id');
  await addCol(db, 'activity_logs',    'from_department_name',  'VARCHAR(255) DEFAULT "" AFTER department_name');
  await addCol(db, 'activity_logs',    'to_department_name',    'VARCHAR(255) DEFAULT "" AFTER from_department_name');
  await addCol(db, 'activity_logs',    'from_sucursal_name',    'VARCHAR(255) DEFAULT "" AFTER to_department_name');
  await addCol(db, 'activity_logs',    'to_sucursal_name',      'VARCHAR(255) DEFAULT "" AFTER from_sucursal_name');
  await addCol(db, 'inventory_items',  'quantity',              'INT NOT NULL DEFAULT 1 AFTER sucursal_name');
  // Expand purchase_orders status ENUM to include ordered/received/cancelled
  await db.execute(`
    ALTER TABLE purchase_orders
    MODIFY COLUMN status ENUM('pending','approved','rejected','completed','ordered','received','cancelled') NOT NULL DEFAULT 'pending'
  `);
  // Expand status ENUM to support revision and damaged
  await db.execute(`
    ALTER TABLE inventory_items
    MODIFY COLUMN status ENUM('in_stock','checked_out','maintenance','retired','revision','damaged') NOT NULL DEFAULT 'in_stock'
  `);
  // Track when an item was last restored from the board
  await addCol(db, 'inventory_items', 'restored_at', 'DATETIME DEFAULT NULL');
  // Container type for estantes
  await addCol(db, 'estantes', 'type', "VARCHAR(50) NOT NULL DEFAULT 'estante'");

  // ── Seeds ──────────────────────────────────────────────────────────────────
  const [[{ cnt: userCnt }]] = await db.execute('SELECT COUNT(*) as cnt FROM users WHERE deleted_at IS NULL');
  if (userCnt === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    await db.execute(
      'INSERT INTO users (id, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)',
      [crypto.randomUUID(), 'admin@inventario.com', hash, 'Administrador', 'admin']
    );
    console.log('  → Admin: admin@inventario.com / admin123');
  }

  const [[{ cnt: sucCnt }]] = await db.execute('SELECT COUNT(*) as cnt FROM sucursales WHERE deleted_at IS NULL');
  if (sucCnt === 0) {
    await db.execute(
      'INSERT INTO sucursales (id, name, address, manager) VALUES (?, ?, ?, ?)',
      [crypto.randomUUID(), 'Sede Principal', 'Dirección principal', 'Administrador']
    );
    console.log('  → Sucursal creada: Sede Principal');
  }

  const [[{ cnt: deptCnt }]] = await db.execute('SELECT COUNT(*) as cnt FROM departments WHERE deleted_at IS NULL');
  if (deptCnt === 0) {
    const [[suc]] = await db.execute('SELECT id, name FROM sucursales WHERE deleted_at IS NULL LIMIT 1');
    const depts = [
      ['IT',          'Departamento de Tecnología de la Información', 'Carlos Mendoza'],
      ['RRHH',        'Recursos Humanos',                             'Maria García'],
      ['Finanzas',    'Departamento de Finanzas y Contabilidad',      'Roberto López'],
      ['Operaciones', 'Departamento de Operaciones',                  'Ana Torres'],
    ];
    for (const [name, description, manager] of depts) {
      await db.execute(
        'INSERT INTO departments (id, name, description, manager, sucursal_id, sucursal_name) VALUES (?, ?, ?, ?, ?, ?)',
        [crypto.randomUUID(), name, description, manager, suc?.id || null, suc?.name || '']
      );
    }
  }

  const [[{ cnt: catCnt }]] = await db.execute('SELECT COUNT(*) as cnt FROM categories WHERE deleted_at IS NULL');
  if (catCnt === 0) {
    const cats = [
      ['Laptop',          1, 1,  3],
      ['Monitor',         1, 1,  5],
      ['Mouse',           0, 0, 10],
      ['Teclado',         0, 0, 10],
      ['Impresora',       1, 1,  2],
      ['Teléfono',        1, 1,  3],
      ['Cable HDMI',      0, 0, 15],
      ['Docking Station', 1, 1,  3],
    ];
    for (const [name, rat, rui, min] of cats) {
      await db.execute(
        'INSERT INTO categories (id, name, requires_asset_tag, requires_unique_id, minimum_stock) VALUES (?, ?, ?, ?, ?)',
        [crypto.randomUUID(), name, rat, rui, min]
      );
    }
  }

  console.log('✅ Database initialized');
}
