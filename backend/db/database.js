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
    CREATE TABLE IF NOT EXISTS tenants (
      id              VARCHAR(36)  NOT NULL,
      name            VARCHAR(255) NOT NULL,
      rnc             VARCHAR(20)  DEFAULT NULL,
      inventory_type  ENUM('physical','valued','stock') NOT NULL DEFAULT 'physical',
      plan            ENUM('starter','pro','enterprise') NOT NULL DEFAULT 'starter',
      plan_expires_at DATETIME DEFAULT NULL,
      max_records     INT NOT NULL DEFAULT 40000,
      max_users       INT NOT NULL DEFAULT 3,
      max_sucursales  INT NOT NULL DEFAULT 1,
      is_active       TINYINT(1) NOT NULL DEFAULT 1,
      created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

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

  await db.execute(`
    CREATE TABLE IF NOT EXISTS tenant_email_config (
      tenant_id      VARCHAR(36)  NOT NULL,
      manager_email  VARCHAR(255) DEFAULT NULL,
      manager_name   VARCHAR(255) DEFAULT NULL,
      smtp_host      VARCHAR(255) DEFAULT NULL,
      smtp_port      INT          NOT NULL DEFAULT 587,
      smtp_secure    TINYINT(1)   NOT NULL DEFAULT 0,
      smtp_user      VARCHAR(255) DEFAULT NULL,
      smtp_pass      VARCHAR(255) DEFAULT NULL,
      smtp_from_name VARCHAR(255) DEFAULT NULL,
      updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (tenant_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // ── Migrations: add columns safely ─────────────────────────────────────────

  // Multi-tenant: tenant_id on all tables
  await addCol(db, 'users',            'tenant_id', 'VARCHAR(36) DEFAULT NULL');
  await addCol(db, 'sucursales',       'tenant_id', 'VARCHAR(36) DEFAULT NULL');
  await addCol(db, 'departments',      'tenant_id', 'VARCHAR(36) DEFAULT NULL');
  await addCol(db, 'categories',       'tenant_id', 'VARCHAR(36) DEFAULT NULL');
  await addCol(db, 'inventory_items',  'tenant_id', 'VARCHAR(36) DEFAULT NULL');
  await addCol(db, 'activity_logs',    'tenant_id', 'VARCHAR(36) DEFAULT NULL');
  await addCol(db, 'estantes',         'tenant_id', 'VARCHAR(36) DEFAULT NULL');
  await addCol(db, 'purchase_orders',  'tenant_id', 'VARCHAR(36) DEFAULT NULL');

  // Users: permissions + sucursal
  await addCol(db, 'users', 'permissions', 'TEXT DEFAULT NULL AFTER role');
  await addCol(db, 'users', 'sucursal_id', 'VARCHAR(36) DEFAULT NULL AFTER permissions');

  // Inventory: shelf, sucursal, quantity, unit_cost
  await addCol(db, 'inventory_items', 'shelf_id',   'VARCHAR(36) DEFAULT NULL');
  await addCol(db, 'inventory_items', 'shelf_name', 'VARCHAR(255) DEFAULT ""');
  await addCol(db, 'inventory_items', 'sucursal_id',   'VARCHAR(36) DEFAULT NULL AFTER department_name');
  await addCol(db, 'inventory_items', 'sucursal_name', 'VARCHAR(255) DEFAULT "" AFTER sucursal_id');
  await addCol(db, 'inventory_items', 'quantity',       'INT NOT NULL DEFAULT 1 AFTER sucursal_name');
  await addCol(db, 'inventory_items', 'unit_cost',      'DECIMAL(12,2) DEFAULT NULL');
  await addCol(db, 'inventory_items', 'restored_at',    'DATETIME DEFAULT NULL');

  // Departments: sucursal
  await addCol(db, 'departments', 'sucursal_id',   'VARCHAR(36) DEFAULT NULL AFTER manager');
  await addCol(db, 'departments', 'sucursal_name', 'VARCHAR(255) DEFAULT "" AFTER sucursal_id');

  // Logs: department/sucursal routing
  await addCol(db, 'activity_logs', 'from_department_name', 'VARCHAR(255) DEFAULT "" AFTER department_name');
  await addCol(db, 'activity_logs', 'to_department_name',   'VARCHAR(255) DEFAULT "" AFTER from_department_name');
  await addCol(db, 'activity_logs', 'from_sucursal_name',   'VARCHAR(255) DEFAULT "" AFTER to_department_name');
  await addCol(db, 'activity_logs', 'to_sucursal_name',     'VARCHAR(255) DEFAULT "" AFTER from_sucursal_name');

  // Expand ENUMs
  await db.execute(`
    ALTER TABLE purchase_orders
    MODIFY COLUMN status ENUM('pending','approved','rejected','completed','ordered','received','cancelled') NOT NULL DEFAULT 'pending'
  `);
  await db.execute(`
    ALTER TABLE inventory_items
    MODIFY COLUMN status ENUM('in_stock','checked_out','maintenance','retired','revision','damaged') NOT NULL DEFAULT 'in_stock'
  `);

  // Container type for estantes
  await addCol(db, 'estantes', 'type', "VARCHAR(50) NOT NULL DEFAULT 'estante'");

  // Stripe billing fields on tenants
  await addCol(db, 'tenants', 'stripe_customer_id',     'VARCHAR(255) DEFAULT NULL');
  await addCol(db, 'tenants', 'stripe_subscription_id', 'VARCHAR(255) DEFAULT NULL');
  await addCol(db, 'tenants', 'trial_ends_at',           'DATETIME DEFAULT NULL');
  await addCol(db, 'tenants', 'billing_status',          "VARCHAR(20) NOT NULL DEFAULT 'trialing'");

  // Categories: subcategory support
  await addCol(db, 'categories', 'parent_id', 'VARCHAR(36) DEFAULT NULL');

  // Activity logs: monetary tracking for valued-inventory exits/entries
  await addCol(db, 'activity_logs', 'unit_cost',   'DECIMAL(12,2) DEFAULT NULL');
  await addCol(db, 'activity_logs', 'total_value', 'DECIMAL(14,2) DEFAULT NULL');

  // Tenants: business type drives which fields Entry.jsx shows
  await addCol(db, 'tenants', 'business_type', "VARCHAR(30) NOT NULL DEFAULT 'tecnologia'");

  // Tenants: exempt the seed/default tenant from billing — it's not a paying customer
  await addCol(db, 'tenants', 'billing_exempt', 'TINYINT(1) NOT NULL DEFAULT 0');
  await db.execute("UPDATE tenants SET billing_exempt = 1 WHERE name = 'Default Company'");

  // Inventory: extra fields for non-tech business types (food, warehouse supplies)
  await addCol(db, 'inventory_items', 'expiration_date', 'DATE DEFAULT NULL');
  await addCol(db, 'inventory_items', 'batch_number',    'VARCHAR(100) DEFAULT NULL');
  await addCol(db, 'inventory_items', 'unit_measure',    'VARCHAR(30) DEFAULT NULL');

  // Activity logs: structured reason/destination for Salida reporting
  await addCol(db, 'activity_logs', 'reason',      'VARCHAR(100) DEFAULT NULL');
  await addCol(db, 'activity_logs', 'destination',  'VARCHAR(255) DEFAULT NULL');

  // ── Multi-tenant migration: seed default tenant and assign orphan rows ──────

  const [[{ tenantCnt }]] = await db.execute('SELECT COUNT(*) as tenantCnt FROM tenants');
  let defaultTenantId;

  if (tenantCnt === 0) {
    defaultTenantId = crypto.randomUUID();
    await db.execute(
      `INSERT INTO tenants (id, name, inventory_type, plan, max_records, max_users, max_sucursales)
       VALUES (?, 'Default Company', 'physical', 'starter', 40000, 3, 1)`,
      [defaultTenantId]
    );
    console.log('  → Tenant creado: Default Company');
  } else {
    const [[first]] = await db.execute('SELECT id FROM tenants ORDER BY created_at ASC LIMIT 1');
    defaultTenantId = first.id;
  }

  // Assign all rows that don't have a tenant_id yet
  await db.execute('UPDATE users           SET tenant_id = ? WHERE tenant_id IS NULL', [defaultTenantId]);
  await db.execute('UPDATE sucursales      SET tenant_id = ? WHERE tenant_id IS NULL', [defaultTenantId]);
  await db.execute('UPDATE departments     SET tenant_id = ? WHERE tenant_id IS NULL', [defaultTenantId]);
  await db.execute('UPDATE categories      SET tenant_id = ? WHERE tenant_id IS NULL', [defaultTenantId]);
  await db.execute('UPDATE inventory_items SET tenant_id = ? WHERE tenant_id IS NULL', [defaultTenantId]);
  await db.execute('UPDATE activity_logs   SET tenant_id = ? WHERE tenant_id IS NULL', [defaultTenantId]);
  await db.execute('UPDATE estantes        SET tenant_id = ? WHERE tenant_id IS NULL', [defaultTenantId]);
  await db.execute('UPDATE purchase_orders SET tenant_id = ? WHERE tenant_id IS NULL', [defaultTenantId]);

  // ── Seeds ──────────────────────────────────────────────────────────────────

  const [[{ userCnt }]] = await db.execute(
    'SELECT COUNT(*) as userCnt FROM users WHERE tenant_id = ? AND deleted_at IS NULL',
    [defaultTenantId]
  );
  if (userCnt === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    await db.execute(
      'INSERT INTO users (id, email, password_hash, full_name, role, tenant_id) VALUES (?, ?, ?, ?, ?, ?)',
      [crypto.randomUUID(), 'admin@inventario.com', hash, 'Administrador', 'admin', defaultTenantId]
    );
    console.log('  → Admin: admin@inventario.com / admin123');
  }

  const [[{ sucCnt }]] = await db.execute(
    'SELECT COUNT(*) as sucCnt FROM sucursales WHERE tenant_id = ? AND deleted_at IS NULL',
    [defaultTenantId]
  );
  if (sucCnt === 0) {
    await db.execute(
      'INSERT INTO sucursales (id, name, address, manager, tenant_id) VALUES (?, ?, ?, ?, ?)',
      [crypto.randomUUID(), 'Sede Principal', 'Dirección principal', 'Administrador', defaultTenantId]
    );
    console.log('  → Sucursal creada: Sede Principal');
  }

  const [[{ deptCnt }]] = await db.execute(
    'SELECT COUNT(*) as deptCnt FROM departments WHERE tenant_id = ? AND deleted_at IS NULL',
    [defaultTenantId]
  );
  if (deptCnt === 0) {
    const [[suc]] = await db.execute(
      'SELECT id, name FROM sucursales WHERE tenant_id = ? AND deleted_at IS NULL LIMIT 1',
      [defaultTenantId]
    );
    const depts = [
      ['IT',          'Departamento de Tecnología de la Información', 'Carlos Mendoza'],
      ['RRHH',        'Recursos Humanos',                             'Maria García'],
      ['Finanzas',    'Departamento de Finanzas y Contabilidad',      'Roberto López'],
      ['Operaciones', 'Departamento de Operaciones',                  'Ana Torres'],
    ];
    for (const [name, description, manager] of depts) {
      await db.execute(
        'INSERT INTO departments (id, name, description, manager, sucursal_id, sucursal_name, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [crypto.randomUUID(), name, description, manager, suc?.id || null, suc?.name || '', defaultTenantId]
      );
    }
  }

  const [[{ catCnt }]] = await db.execute(
    'SELECT COUNT(*) as catCnt FROM categories WHERE tenant_id = ? AND deleted_at IS NULL',
    [defaultTenantId]
  );
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
        'INSERT INTO categories (id, name, requires_asset_tag, requires_unique_id, minimum_stock, tenant_id) VALUES (?, ?, ?, ?, ?, ?)',
        [crypto.randomUUID(), name, rat, rui, min, defaultTenantId]
      );
    }
  }

  console.log('✅ Database initialized');
}
