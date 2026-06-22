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
      is_default      TINYINT(1) NOT NULL DEFAULT 0,
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
    CREATE TABLE IF NOT EXISTS machines (
      id               VARCHAR(36)  NOT NULL,
      tenant_id        VARCHAR(36)  DEFAULT NULL,
      department       VARCHAR(255) NOT NULL,
      section          VARCHAR(255) DEFAULT NULL,
      punto_de_red     VARCHAR(100) DEFAULT NULL,
      numero           INT          DEFAULT NULL,
      posicion         VARCHAR(255) DEFAULT NULL,
      ip_address       VARCHAR(50)  DEFAULT NULL,
      so               VARCHAR(255) DEFAULT NULL,
      hardware         TEXT         DEFAULT NULL,
      full_device_name VARCHAR(255) DEFAULT NULL,
      installed_on     DATE         DEFAULT NULL,
      notes            TEXT         DEFAULT NULL,
      status           ENUM('active','inactive') NOT NULL DEFAULT 'active',
      created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at       DATETIME DEFAULT NULL,
      PRIMARY KEY (id)
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

  // Machines: status column (for existing tables without it)
  await addCol(db, 'machines', 'status', "ENUM('active','inactive') NOT NULL DEFAULT 'active'");
  // Tenants: is_default flag (for existing tables without it)
  await addCol(db, 'tenants', 'is_default', 'TINYINT(1) NOT NULL DEFAULT 0');

  // ── Multi-tenant migration: seed default tenant and assign orphan rows ──────

  const [[{ tenantCnt }]] = await db.execute('SELECT COUNT(*) as tenantCnt FROM tenants');
  let defaultTenantId;

  if (tenantCnt === 0) {
    defaultTenantId = crypto.randomUUID();
    await db.execute(
      `INSERT INTO tenants (id, name, inventory_type, plan, max_records, max_users, max_sucursales, is_default)
       VALUES (?, 'Default Company', 'physical', 'starter', 40000, 3, 1, 1)`,
      [defaultTenantId]
    );
    console.log('  → Tenant creado: Default Company');
  } else {
    const [[first]] = await db.execute('SELECT id FROM tenants ORDER BY created_at ASC LIMIT 1');
    defaultTenantId = first.id;
    await db.execute('UPDATE tenants SET is_default = 1 WHERE id = ?', [defaultTenantId]);
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

  // ── Seed machines (default company) ──────────────────────────────────────
  const [[{ machineCnt }]] = await db.execute(
    'SELECT COUNT(*) as machineCnt FROM machines WHERE tenant_id = ?',
    [defaultTenantId]
  );
  if (machineCnt === 0) {
    // [punto_de_red, numero, posicion, ip_address, so, hardware, full_device_name, installed_on, department, section]
    const machines = [
      // DEPARTAMENTO CARIBE PACK - CAJAS
      ['PPP1-CP-11',1,'CAJA 01','192.168.3.201','Windows 10 Pro (v. 22H2)','DELL OptiPlex 7050, i5 7th Gen, 16 RAM, 256GB SSD','PC-CAJA1.CARIBETOURS.com','2025-12-20','DEPARTAMENTO CARIBE PACK','CAJAS'],
      ['PPP1-CP-10',2,'CAJA 02','192.168.3.202','Windows 10 Pro (v. 22H2)','DELL OptiPlex 7050, i5 7th Gen, 16 RAM, 238GB SSD','PC-CAJA02.CARIBETOURS.com','2025-12-20','DEPARTAMENTO CARIBE PACK','CAJAS'],
      ['PPP1-CP-08',3,'CAJA 03','192.168.3.203','Windows 10 Education (v. 22H2)','DELL OptiPlex 7050, i5 7th Gen, 16 RAM, 238GB SSD','PC-CAJA03.CARIBETOURS.com','2024-12-17','DEPARTAMENTO CARIBE PACK','CAJAS'],
      ['PPP1-CP-16',4,'CAJA 04','192.168.3.204','Windows 10 Pro (v. 22H2)','DELL OptiPlex 7050, i5 7th Gen, 16 RAM, 238GB SSD','PC-CAJA04.CARIBETOURS.com','2025-11-15','DEPARTAMENTO CARIBE PACK','CAJAS'],
      ['PPP1-CP-07',5,'CAJA 05','192.168.3.205','Windows 10 Education (v. 22H2)','DELL OptiPlex 5050, i5 7th Gen, 16 RAM, 224GB SSD','PC-CAJA05.CARIBETOURS.com','2025-10-14','DEPARTAMENTO CARIBE PACK','CAJAS'],
      ['PPP1-CP-05',6,'CAJA 06','192.168.3.206','Windows 10 Education (v. 22H2)','DELL OptiPlex 7050, i5 7th Gen, 16 RAM, 238GB SSD','PC-CAJA06.CARIBETOURS.com','2024-12-16','DEPARTAMENTO CARIBE PACK','CAJAS'],
      ['PPP1-CP-04',7,'CAJA 07','192.168.3.207','Windows 10 Pro (v. 22H2)','DELL OptiPlex 7050, i5 7th Gen, 16 RAM, 238GB SSD','PC-CAJA07.CARIBETOURS.com','2024-12-19','DEPARTAMENTO CARIBE PACK','CAJAS'],
      ['PPP1-CP-03',8,'CAJA 08','192.168.3.208','Windows 10 Pro (v. 22H2)','DELL OptiPlex 7050, i5 7th Gen, 16 RAM, 238GB SSD','PC-CAJA08.CARIBETOURS.com','2024-12-18','DEPARTAMENTO CARIBE PACK','CAJAS'],
      ['PPP1-CP-01',9,'CAJA 09','192.168.3.209','Windows 10 Pro (v. 22H2)','DELL OptiPlex 7050, i7 7th Gen, 16 RAM, 238GB SSD','PC-CAJA09.CARIBETOURS.com','2025-10-07','DEPARTAMENTO CARIBE PACK','CAJAS'],
      ['PPP1-CC-01',10,'CAJA 10','192.168.3.210','Windows 7 professional','DELL, i5 4th Gen, 4 RAM','PC-CAJA10.CARIBETOURS.com',null,'DEPARTAMENTO CARIBE PACK','CAJAS'],
      ['PPP1-CC-03',11,'CAJA 11','192.168.3.211','Windows 10 Education (v. 22H2)','DELL OptiPlex 7050, i5 7th Gen, 16 RAM, 238GB SSD','PC-CAJA11.CARIBETOURS.com','2024-12-16','DEPARTAMENTO CARIBE PACK','CAJAS'],
      ['PPP1-CC-04',12,'CAJA 12','192.168.3.212','Windows 10 Pro (v. 22H2)','DELL OptiPlex 5050, i5 7th Gen, 16 RAM, 224GB SSD','PC-CAJA12.CARIBETOURS.com','2025-04-17','DEPARTAMENTO CARIBE PACK','CAJAS'],
      ['PPP1-CC-05',13,'CAJA 13','192.168.3.213','Windows 10 Pro (v. 22H2)','DELL OptiPlex 3020, i5 4th Gen, 8 RAM, 466GB HHD','PC-CAJA13.CARIBETOURS.com','2025-04-02','DEPARTAMENTO CARIBE PACK','CAJAS'],
      ['PPP1-CC-06',14,'CAJA 14','192.168.3.214','Windows 10 Education (v. 22H2)','DELL OptiPlex 5050, i5 6th Gen, 16 RAM, 224GB SSD','PC-CAJA14.CARIBETOURS.com','2026-03-14','DEPARTAMENTO CARIBE PACK','CAJAS'],
      ['PPP1-CC-07',15,'CAJA 15','192.168.3.215','Windows 10 Education (v. 22H2)','DELL OptiPlex 7050, i5 6th Gen, 16 RAM, 238GB SSD','PC-CAJA15.CARIBETOURS.com','2026-03-26','DEPARTAMENTO CARIBE PACK','CAJAS'],
      ['PPP2-CC-02',16,'CAJA 16','192.168.3.216','Windows 10 Education (v. 22H2)','DELL OptiPlex 7050, i5 7th Gen, 16 RAM, 256GB SSD','PC-CAJA16.CARIBETOURS.com','2026-03-13','DEPARTAMENTO CARIBE PACK','CAJAS'],
      ['PPP2-CC-03',17,'CAJA 17','192.168.3.217','Windows 10 Education (v. 22H2)','DELL OptiPlex 7050, i7 7th Gen, 16 RAM, 238GB SSD','PC-CAJA17.CARIBETOURS.com','2026-03-05','DEPARTAMENTO CARIBE PACK','CAJAS'],
      // VALORES 1ER. NIVEL
      [null,18,'POSICION 1','192.168.3.169','Windows 10 Education (v. 22H2)','DELL OptiPlex 7010, i3 3rd Gen, 8 RAM, 298GB SSD','PC-ENTREGASPACK','2022-09-21','DEPARTAMENTO CARIBE PACK','VALORES 1ER. NIVEL'],
      // RECEPCION DE ENVIOS 1ER. NIVEL
      [null,19,'POSICION 1','192.168.3.242','Windows 10 Education (v. 22H2)','DELL OptiPlex 7050, i5 7th Gen, 16 RAM, 256GB SSD','PC-PACK.CARIBETOURS.com','2026-03-27','DEPARTAMENTO CARIBE PACK','RECEPCION DE ENVIOS 1ER. NIVEL'],
      ['2N-PPP4-16',25,'POSICION 3','192.168.3.93','Windows 10 Pro (v. 22H2)','DELL OptiPlex 7050, i5 7th Gen, 16 RAM, 238GB SSD','PC-DESPPACK.CARIBETOURS.com','2023-09-19','DEPARTAMENTO CARIBE PACK','RECEPCION DE ENVIOS 1ER. NIVEL'],
      // SUPERVISOR CARIBE PACK 1ER NIVEL
      [null,20,'SUPERVISOR','192.168.3.92','Windows 10 Education (v. 22H2)','DELL OptiPlex 7050, i5 7th Gen, 16 RAM, 238GB SSD','PC-CAJA33.CARIBETOURS.com','2025-07-30','DEPARTAMENTO CARIBE PACK','SUPERVISOR CARIBE PACK 1ER NIVEL'],
      // CAJAS PAQUETES GRANDES 1ER. NIVEL
      ['2N-PPP1-11',21,'POSICION 1','192.168.3.236','Windows 10 Education (v. 22H2)','DELL OptiPlex 7050, i7 7th Gen, 16 RAM, 238GB SSD','PC-CAJA38.CARIBETOURS.com','2026-03-09','DEPARTAMENTO CARIBE PACK','CAJAS PAQUETES GRANDES 1ER. NIVEL'],
      ['2N-PPP1-15',22,'POSICION 2','192.168.3.240','Windows 10 Pro (v. 22H2)','DELL OptiPlex 3020, i5 4th Gen, 8 RAM, 466GB HHD','PC-ENTREGA.CARIBETOURS.com','2024-02-02','DEPARTAMENTO CARIBE PACK','CAJAS PAQUETES GRANDES 1ER. NIVEL'],
      // DESPACHO DE PAQUETES 1ER. NIVEL
      ['2N-PPP1-01',23,'POSICION 1','192.168.3.241','Windows 10 Pro (v. 22H2)','DELL OptiPlex 7050, i5 6th Gen, 8 RAM, 447GB SSD','PC-DESPACHO-03.CARIBETOURS.com','2024-01-16','DEPARTAMENTO CARIBE PACK','DESPACHO DE PAQUETES 1ER. NIVEL'],
      ['2N-PPP1-02',24,'POSICION 2','192.168.3.238','Windows 10 Pro (v. 22H2)','DELL OptiPlex 7050, i5 6th Gen, 8 RAM, 447GB SSD','PC-DESPACHO-02.CARIBETOURS.com','2019-12-07','DEPARTAMENTO CARIBE PACK','DESPACHO DE PAQUETES 1ER. NIVEL'],
      ['2N-PPP1-05',null,'POSICION 4','192.168.3.239','Windows 10 Pro (v. 22H2)','DELL OptiPlex 7050, i5 6th Gen, 8 RAM, 466GB HDD','PC-032319.CARIBETOURS.com','2024-08-17','DEPARTAMENTO CARIBE PACK','DESPACHO DE PAQUETES 1ER. NIVEL'],
      [null,null,'POSICION 5','192.168.3.8','Windows 10 Education (v. 22H2)','DELL OptiPlex 7050, i5 8th Gen, 8 RAM, 224GB SSD','PC-DESPACHO-05.CARIBETOURS.com','2026-06-05','DEPARTAMENTO CARIBE PACK','DESPACHO DE PAQUETES 1ER. NIVEL'],
      // RECIBIR PAQUETES 2DO. NIVEL
      ['2N-PPP3-21',26,'RECIBIR 01','192.168.3.72','Windows 10 Pro (v. 22H2)','DELL OptiPlex 7050, i5 7th Gen, 8 RAM, 238GB SSD','PC-0420.CARIBETOURS.com','2023-10-18','DEPARTAMENTO CARIBE PACK','RECIBIR PAQUETES 2DO. NIVEL'],
      ['2N-PPP3-22',27,'RECIBIR 02','192.168.3.234','Windows 10 Education (v. 22H2)','DELL OptiPlex 3020, i5 4th Gen, 8 RAM, 233GB HHD','PC-ENTREGA-02.CARIBETOURS.com','2022-11-23','DEPARTAMENTO CARIBE PACK','RECIBIR PAQUETES 2DO. NIVEL'],
      // ENTREGA DE PAQUETES 2DO. NIVEL
      ['2N-PPP1-24',28,'POSICION 01','192.168.3.68','Windows 10 Education (v. 22H2)','DELL OptiPlex 7050, i5 7th Gen, 8 RAM, 238GB SSD','PC-CAJA02.CARIBETOURS.com','2024-12-16','DEPARTAMENTO CARIBE PACK','ENTREGA DE PAQUETES 2DO. NIVEL'],
      ['2N-PPP2-01',29,'POSICION 02','192.168.3.66','Windows 10 Pro (v. 22H2)','DELL OptiPlex 7050, i5 7th Gen, 8 RAM, 238GB SSD','PC-ENTPACKP2.CARIBETOURS.com','2023-09-21','DEPARTAMENTO CARIBE PACK','ENTREGA DE PAQUETES 2DO. NIVEL'],
      ['2N-PPP2-04',30,'POSICION 03','192.168.3.64','Windows 10 Education (v. 22H2)','DELL OptiPlex 7060, i5 8th Gen, 12 RAM, 238GB SSD','PC-ENT2DO.CARIBETOURS.com','2024-07-30','DEPARTAMENTO CARIBE PACK','ENTREGA DE PAQUETES 2DO. NIVEL'],
      ['2N-PPP2-05',31,'POSICION 04','192.168.3.237','Windows 10 Pro (v. 22H2)','DELL OptiPlex 7050, i5 6th Gen, 8 RAM, 466GB SSD','PC-PACKENT01.CARIBETOURS.com','2022-10-07','DEPARTAMENTO CARIBE PACK','ENTREGA DE PAQUETES 2DO. NIVEL'],
      ['2N-PPP2-07',32,'POSICION 05','192.168.3.231','Windows 10 Education (v. 22H2)','DELL OptiPlex 3020, i5 4th Gen, 8 RAM, 932GB HHD','PC-ENTREGAPACK.CARIBETOURS.com','2025-01-14','DEPARTAMENTO CARIBE PACK','ENTREGA DE PAQUETES 2DO. NIVEL'],
      ['2N-PPP2-02',33,'POSICION 06','192.168.3.24','Windows 10 Education (v. 22H2)','DELL OptiPlex 7050, i7 7th Gen, 16 RAM, 238GB SSD','PC-042078.CARIBETOURS.com','2025-08-22','DEPARTAMENTO CARIBE PACK','ENTREGA DE PAQUETES 2DO. NIVEL'],
      // RECLAMACIONES
      [null,34,'SUPERVISORA','192.168.3.113','Windows 10 Pro (v. 22H2)','DELL OptiPlex 7050, i5 7th Gen, 16 RAM, 238GB SSD','PC-ASIST-PACK.CARIBETOURS.com','2025-10-01','DEPARTAMENTO CARIBE PACK','RECLAMACIONES'],
      ['2N-PPP2-20',35,'RECLAMACIONES 01','192.168.3.129','Windows 10 Education (v. 22H2)','DELL OptiPlex 7050, i7 7th Gen, 16 RAM, 477GB SSD','PC-032104.CARIBETOURS.com','2025-08-05','DEPARTAMENTO CARIBE PACK','RECLAMACIONES'],
      ['2N-PPP2-16',36,'RECLAMACIONES 02','192.168.3.128','Windows 10 Pro (v. 22H2)','DELL OptiPlex 7050, i7 7th Gen, 16 RAM, 477GB SSD','PC-032103.CARIBETOURS.com','2025-08-06','DEPARTAMENTO CARIBE PACK','RECLAMACIONES'],
      ['2N-PPP2-17',37,'RECLAMACIONES 03','192.168.3.114','Windows 10 Education (v. 22H2)','DELL OptiPlex 7050, i5 7th Gen, 16 RAM, 238GB SSD','PC-032101.CARIBETOURS.com','2025-08-07','DEPARTAMENTO CARIBE PACK','RECLAMACIONES'],
      ['2N-PPP2-16',38,'RECLAMACIONES 04','192.168.3.118','Windows 10 Education (v. 22H2)','DELL OptiPlex 7050, i5 7th Gen, 16 RAM, 238GB SSD','PC-032103.CARIBETOURS.com','2025-05-01','DEPARTAMENTO CARIBE PACK','RECLAMACIONES'],
      ['2N-PPP2-16',39,'RECLAMACIONES 05','192.168.3.119','Windows 10 Pro (v. 22H2)','DELL OptiPlex 7050, i5 7th Gen, 16 RAM, 238GB SSD','PC-032105.CARIBETOURS.com','2025-05-01','DEPARTAMENTO CARIBE PACK','RECLAMACIONES'],
      // CENTRO DE LLAMADAS - OPERADORES
      ['2N-PPP4-05',40,'SUPERVISORA','192.168.3.102','Windows 10 Pro (v. 22H2)','DELL OptiPlex 7050, i5 7th Gen, 16 RAM, 238GB SSD','PC-032002.CARIBETOURS.com','2025-12-09','CENTRO DE LLAMADAS','OPERADORES'],
      ['2N-PPP3-07',41,'POSICION 01','192.168.3.75','Windows 10 Education (v. 22H2)','DELL OptiPlex 7050, i5 7th Gen, 8 RAM, 238GB SSD','PC-032041.CARIBETOURS.com','2025-02-28','CENTRO DE LLAMADAS','OPERADORES'],
      ['2N-PPP3-08',42,'POSICION 02','192.168.3.77','Windows 10 Pro (v. 22H2)','DELL OptiPlex 7050, i5 7th Gen, 8 RAM, 238GB SSD','PC-0321010.CARIBETOURS.com','2024-01-02','CENTRO DE LLAMADAS','OPERADORES'],
      ['2N-PPP3-10',43,'POSICION 03','192.168.3.78','Windows 10 Pro (v. 22H2)','DELL OptiPlex 7050, i7 7th Gen, 16 RAM, 466GB SSD','PC-032135.CARIBETOURS.com','2025-07-01','CENTRO DE LLAMADAS','OPERADORES'],
      ['2N-PPP3-09',44,'POSICION 04','192.168.3.79','Windows 10 Education (v. 22H2)','DELL OptiPlex 7050, i7 7th Gen, 16 RAM, 466GB SSD','PC-032138.CARIBETOURS.com','2025-02-18','CENTRO DE LLAMADAS','OPERADORES'],
      ['2N-PPP4-13',45,'POSICION 05','192.168.3.80','Windows 10 Education (v. 22H2)','DELL OptiPlex 7050, i5 7th Gen, 16 RAM, 238GB SSD','PC-032139.CARIBETOURS.com','2025-06-06','CENTRO DE LLAMADAS','OPERADORES'],
      ['2N-PPP3-11',46,'POSICION 06','192.168.3.69','Windows 10 Pro (v. 22H2)','DELL OptiPlex 7050, i7 7th Gen, 16 RAM, 466GB SSD','PC-32136.CARIBETOURS.com','2025-02-18','CENTRO DE LLAMADAS','OPERADORES'],
      [null,47,'POSICION 07','192.168.3.83','Windows 10 Pro (v. 22H2)','DELL OptiPlex 7050, i7 7th Gen, 8 RAM, 238GB SSD','PC-032134.CARIBETOURS.com','2025-02-28','CENTRO DE LLAMADAS','OPERADORES'],
      ['2N-PPP3-18',48,'POSICION 08','192.168.3.84','Windows 10 Pro (v. 22H2)','DELL OptiPlex 7050, i7 7th Gen, 8 RAM, 466GB SSD','PC-032133.CARIBETOURS.com','2025-02-17','CENTRO DE LLAMADAS','OPERADORES'],
      ['2N-PPP3-17',49,'POSICION 09','192.168.3.87','Windows 10 Education (v. 22H2)','DELL OptiPlex 7050, i7 7th Gen, 16 RAM, 466GB SSD','PC-032132.CARIBETOURS.com','2025-02-19','CENTRO DE LLAMADAS','OPERADORES'],
      ['2N-PPP3-04',50,'POSICION 10','192.168.3.100','Windows 10 Education (v. 22H2)','DELL OptiPlex 7050, i7 7th Gen, 16 RAM, 466GB SSD','PC-032131.CARIBETOURS.com','2025-02-18','CENTRO DE LLAMADAS','OPERADORES'],
      ['2N-PPP4-11',51,'MONITOR 2 C.D.L','192.168.3.73','Windows 10 Education (v. 22H2)','DELL OptiPlex 3020, i5 4th Gen, 8 RAM, 477GB SSD','PC-031991.CARIBETOURS.com','2026-04-16','CENTRO DE LLAMADAS','OPERADORES'],
      ['2N-PPP4-12',52,'MONITOR 1 C.D.L','192.168.3.96','Windows 10 Education (v. 22H2)','DELL OptiPlex 7050, i5 7th Gen, 8 RAM, 238GB SSD','PC-032147.CARIBETOURS.com','2023-04-18','CENTRO DE LLAMADAS','OPERADORES'],
      // BOLETERIA - CAJAS
      ['PPP2-CC-04',53,'CAJA 18','192.168.3.218','Windows 10 Education (v. 22H2)','DELL OptiPlex 7060, i5 8th Gen, 8 RAM, 238GB SSD','PC-CAJA18.CARIBETOURS.com','2022-10-11','BOLETERIA','CAJAS'],
      ['PPP2-CC-05',54,'CAJA 19','192.168.3.219','Windows 10 Education (v. 22H2)','DELL OptiPlex 7050, i5 7th Gen, 8 RAM, 238GB SSD','PC-CAJA19.CARIBETOURS.com','2023-09-19','BOLETERIA','CAJAS'],
      ['PPP2-CC-06',55,'CAJA 20','192.168.3.220','Windows 10 Education (v. 22H2)','DELL OptiPlex 7050, i5 7th Gen, 8 RAM, 238GB SSD','PC-CAJA20.CARIBETOURS.com','2025-12-21','BOLETERIA','CAJAS'],
      ['PPP2-CC-07',56,'CAJA 21','192.168.3.221','Windows 10 Education (v. 22H2)','DELL OptiPlex 7050, i5 7th Gen, 8 RAM, 238GB SSD','PC-CAJA21.CARIBETOURS.com','2025-12-20','BOLETERIA','CAJAS'],
      ['PPP2-CC-08',57,'CAJA 22','192.168.3.222','Windows 10 Education (v. 22H2)','DELL OptiPlex 7050, i5 7th Gen, 8 RAM, 238GB SSD','PC-CAJA22.CARIBETOURS.com','2025-12-17','BOLETERIA','CAJAS'],
      ['PPP2-CC-09',58,'CAJA 23','192.168.3.223','Windows 10 Pro (v. 22H2)','DELL OptiPlex 7050, i5 7th Gen, 8 RAM, 238GB SSD','PC-CAJA23.CARIBETOURS.com','2025-12-13','BOLETERIA','CAJAS'],
      ['PPP2-CC-10',59,'CAJA 24','192.168.3.224','Windows 10 Pro (v. 22H2)','DELL OptiPlex 7050, i5 7th Gen, 8 RAM, 238GB SSD','PC-CAJA24.CARIBETOURS.com','2025-08-18','BOLETERIA','CAJAS'],
      ['PPP2-CC-11',60,'CAJA 25','192.168.3.225','Windows 10 Pro (v. 22H2)','DELL OptiPlex 7050, i5 7th Gen, 8 RAM, 238GB SSD','PC-CAJA25.CARIBETOURS.com','2025-12-12','BOLETERIA','CAJAS'],
      ['PPP2-CC-12',61,'CAJA 26','192.168.3.226','Windows 10 Pro (v. 22H2)','DELL OptiPlex 7050, i5 6th Gen, 16 RAM, 477GB SSD','PC-CAJA26.CARIBETOURS.com','2025-12-11','BOLETERIA','CAJAS'],
      ['PPP2-CC-13',62,'CAJA 27','192.168.3.227','Windows 10 Education (v. 22H2)','DELL OptiPlex 7050, i5 6th Gen, 16 RAM, 477GB HHD','PC-CAJA27.CARIBETOURS.com','2025-12-12','BOLETERIA','CAJAS'],
      ['PPP2-CC-14',63,'CAJA 28','192.168.3.228','Windows 10 Education (v. 22H2)','DELL OptiPlex 7050, i5 6th Gen, 16 RAM, 585GB HHD','PC-CAJA28.CARIBETOURS.com','2025-11-20','BOLETERIA','CAJAS'],
      ['PPP2-CC-16',64,'CAJA 29','192.168.3.229','Windows 10 Pro (v. 22H2)','DELL OptiPlex 7050, i5 7th Gen, 8 RAM, 238GB SSD','PC-CAJA29.CARIBETOURS.com','2025-12-11','BOLETERIA','CAJAS'],
      // BOLETERIA - DESPACHO DE AUTOBUSES
      [null,65,'SUPERVISOR','192.168.3.105','Windows 10 Education (v. 22H2)','DELL OptiPlex 7050, i5 7th Gen, 8 RAM, 238GB SSD','PC-032005.CARIBETOURS.com','2025-12-22','BOLETERIA','DESPACHO DE AUTOBUSES'],
      [null,66,'POSICION 01','192.168.3.104','Windows 10 Pro (v. 22H2)','DELL OptiPlex 7050, i5 7th Gen, 8 RAM, 238GB SSD','PC-032004.CARIBETOURS.com','2023-02-19','BOLETERIA','DESPACHO DE AUTOBUSES'],
      [null,67,'POSICION 02','192.168.3.109','Windows 10 Education (v. 22H2)','DELL OptiPlex 7050, i5 7th Gen, 8 RAM, 238GB SSD','PC-032009.CARIBETOURS.com','2025-11-22','BOLETERIA','DESPACHO DE AUTOBUSES'],
      [null,68,'POSICION 03','192.168.3.106','Windows 10 Pro (v. 22H2)','DELL OptiPlex 7050, i5 7th Gen, 8 RAM, 238GB SSD','PC-032006.CARIBETOURS.com','2023-02-19','BOLETERIA','DESPACHO DE AUTOBUSES'],
      // BOLETERIA - DEPARTAMENTO DE PEDIDOSYA
      [null,null,null,'192.168.3.82',null,null,null,null,'BOLETERIA','DEPARTAMENTO DE PEDIDOSYA'],
      [null,null,null,'192.168.3.85',null,null,null,null,'BOLETERIA','DEPARTAMENTO DE PEDIDOSYA'],
      // DEPARTAMENTO LEGAL
      ['2N-PPP5-CC-22',69,'ENCARGADO','192.168.4.131','Windows 10 Education (v. 22H2)','DELL OptiPlex 7050, i5 6th Gen, 16 RAM, 224GB SSD','PC-042031.CARIBETOURS.com','2025-06-18','DEPARTAMENTO LEGAL',null],
      ['2N-PPP5-CC-24',70,'SECRETARIA','192.168.4.128','Windows 10 Pro (v. 22H2)','DELL OptiPlex 7050, i5 7th Gen, 16 RAM, 238GB SSD','PC-042028.CARIBETOURS.com','2025-06-16','DEPARTAMENTO LEGAL',null],
      ['2N-PPP5-CC-23',71,'ABOGADO 01','192.168.4.130','Windows 10 Pro (v. 22H2)','DELL OptiPlex 7050, i5 7th Gen, 8 RAM, 238GB SSD','PC-042029.CARIBETOURS.com','2025-05-02','DEPARTAMENTO LEGAL',null],
      [null,72,'ABOGADO 02','192.168.3.235','Windows 10 Pro (v. 22H2)','DELL OptiPlex 7050, i5 7th Gen, 8 RAM, 238GB SSD','PC-0420.CARIBETOURS.com','2023-10-18','DEPARTAMENTO LEGAL',null],
      ['2N-PPP5-CC-06',73,'ABOGADO 03','192.168.4.135','Windows 10 Pro (v. 22H2)','DELL OptiPlex 7050, i5 7th Gen, 16 RAM, 238GB SSD','PC-042035.CARIBETOURS.com','2024-01-25','DEPARTAMENTO LEGAL',null],
      // DEPARTAMENTO RECAUDACIONES
      [null,74,'POSICION 01','192.168.4.127',null,null,null,null,'DEPARTAMENTO RECAUDACIONES',null],
      // DEPARTAMENTO SEGURIDAD
      [null,75,'GENERAL','192.168.4.22','Windows 11 Pro (v. 22H2)','DELL OptiPlex SFF Plus 7010, i7 13th Gen, 16 RAM, 512GB SSD','PC-042019.CARIBETOURS.com','2025-02-24','DEPARTAMENTO SEGURIDAD',null],
      ['2N-PPP1-11',76,'ASISTENTE','192.168.4.9','Windows 10 Education (v. 22H2)','DELL OptiPlex 7050, i5 7th Gen, 8 RAM, 234GB SSD','PC-SEGURIDAD2.CARIBETOURS.com','2023-09-28','DEPARTAMENTO SEGURIDAD',null],
      ['2N-PPP1-10',77,'AUX.TECNICO','192.168.4.75','Windows 10 Education (v. 22H2)','DELL OptiPlex 7050, i5 7th Gen, 16 RAM, 238GB SSD','PC-032019.CARIBETOURS.com','2024-05-06','DEPARTAMENTO SEGURIDAD',null],
      ['2N-PPP1-13',78,'AUX.TECNICO','192.168.4.71','Windows 10 Education (v. 22H2)','DELL OptiPlex 7050, i5 7th Gen, 16 RAM, 954GB SSD','PC-042023.CARIBETOURS.com','2024-11-19','DEPARTAMENTO SEGURIDAD',null],
      // MONITOREO
      ['2N-PPP1-17',79,'SUPERVISOR','192.168.4.77','Windows 11 Pro (v. 22H2)','DELL OptiPlex SFF Plus 7010, i7 13th Gen, 16 RAM, 1TB SSD','PC-032021.CARIBETOURS.com','2024-11-26','MONITOREO',null],
      ['2N-PPP3-04',80,'MONITOREO 01','192.168.4.5','Windows 10 Education (v. 22H2)','DELL OptiPlex 7050, i5 7th Gen, 8 RAM, 932GB SSD','PC-MONITOREO04.CARIBETOURS.com','2024-10-05','MONITOREO',null],
      ['2N-PPP2-05',81,'MONITOREO 02','192.168.4.6','Windows 10 Pro (v. 22H2)','DELL OptiPlex 7050, i5 7th Gen, 8 RAM, 238GB SSD','PC-MONITOREO003.CARIBETOURS.com','2024-05-08','MONITOREO',null],
      ['2N-PPP1-23',82,'MONITOREO 03','192.168.4.4','Windows 10 Education (v. 22H2)','DELL OptiPlex 7050, i5 7th Gen, 8 RAM, 466GB SSD','PC-MONITOREO01.CARIBETOURS.com','2022-09-17','MONITOREO',null],
      // DEPARTAMENTO ESTADISTICAS - OPERADORES
      ['2N-PPP1-05',83,'ENCARGADO','192.168.4.156','Windows 11 Pro (v. 22H2)','DELL OptiPlex 7000, i7 12th Gen, 8 RAM, 477GB SSD','PC-04205.CARIBETOURS.com','2025-01-29','DEPARTAMENTO ESTADISTICAS','OPERADORES'],
      ['2N-PPP1-09',84,'ASISTENTE','192.168.4.157','Windows 11 Pro (v. 22H2)','DELL OptiPlex SFF Plus 7010, i7 13th Gen, 16 RAM, 477GB SSD','PC-042057.CARIBETOURS.com','2025-04-17','DEPARTAMENTO ESTADISTICAS','OPERADORES'],
      ['2N-PPP1-16',85,'ASIS. OPERACIONES','192.168.4.8','Windows 10 Education (v. 22H2)','DELL OptiPlex 5050, i7 7th Gen, 8 RAM, 477GB SSD','PC-042009.CARIBETOURS.com','2023-01-03','DEPARTAMENTO ESTADISTICAS','OPERADORES'],
      ['2N-PPP1-15',86,'POSICION 02','192.168.4.86','Windows 11 Education (v. 22H2)','DELL OptiPlex 7070, i7 9th Gen, 8 RAM, 932GB SSD','PC-032057.CARIBETOURS.com','2022-10-15','DEPARTAMENTO ESTADISTICAS','OPERADORES'],
      ['2N-PPP1-08',87,'POSICION 03','192.168.4.76','Windows 10 Pro (v. 22H2)','DELL OptiPlex 7050, i5 7th Gen, 16 RAM, 238GB SSD','PC-AUX_ESTADISTICA.CARIBETOURS.com','2024-10-01','DEPARTAMENTO ESTADISTICAS','OPERADORES'],
      // DEPARTAMENTO MANTENIMIENTO
      ['2N-PPP0-10',88,'ENCARGADO','192.168.3.71','Windows 10 Education (v. 22H2)','DELL OptiPlex 5050, i7 7th Gen, 8 RAM, 477GB SSD','PC-042020.CARIBETOURS.com','2023-01-24','DEPARTAMENTO MANTENIMIENTO',null],
      // GERENCIA DE TURISMO
      [null,89,'GERENTE','192.168.4.158','Windows 11 Pro (v. 22H2)','DELL OptiPlex 7000, i7 12th Gen, 8 RAM, 932GB SSD','PC-042058.CARIBETOURS.com','2025-02-10','GERENCIA DE TURISMO',null],
      [null,90,'SECRETARIA','192.168.4.161',null,null,null,null,'GERENCIA DE TURISMO',null],
      [null,91,'ASISTENTE 01','192.168.4.162','Windows 11 Education (v. 22H2)','DELL OptiPlex 7000, i7 12th Gen, 8 RAM, 466GB SSD','PC-042062.CARIBETOURS.com','2024-11-22','GERENCIA DE TURISMO',null],
      [null,92,'ASISTENTE 02','192.168.4.164','Windows 11 Pro (v. 22H2)',null,'PC-042064.CARIBETOURS.com','2025-02-21','GERENCIA DE TURISMO',null],
      // GERENCIA DE RECURSOS HUMANOS
      [null,93,'GERENTE','192.168.4.151','Windows 11 Education (v. 22H2)','DELL OptiPlex 7090, i7 10th Gen, 16 RAM, 932GB SSD','PC-042051.CARIBETOURS.com','2025-10-23','GERENCIA DE RECURSOS HUMANOS',null],
      [null,94,'SECRETARIA','192.168.4.150','Windows 10 Pro (v. 22H2)','DELL OptiPlex 7000, i7 7th Gen, 8 RAM, 932GB SSD','PC-042050.CARIBETOURS.com','2022-09-02','GERENCIA DE RECURSOS HUMANOS',null],
      [null,95,'ASISTENTE','192.168.4.159','Windows 11 Pro (v. 22H2)','DELL OptiPlex 7000, i7 12th Gen, 8 RAM, 477GB SSD','PC-042049.CARIBETOURS.com','2025-10-28','GERENCIA DE RECURSOS HUMANOS',null],
      // GERENCIA ADMINISTRATIVA
      [null,96,'GERENTE','192.168.4.152','Windows 10 Pro (v. 22H2)','DELL OptiPlex 7000, i7 10th Gen, 16 RAM','PC-042052.CARIBETOURS.com',null,'GERENCIA ADMINISTRATIVA',null],
      [null,97,'ASISTENTE 01','192.168.4.153','Windows 10 Education (v. 22H2)','DELL OptiPlex 7050, i5 6th Gen, 16 RAM, 894GB SSD','PC-042053.CARIBETOURS.com','2022-08-10','GERENCIA ADMINISTRATIVA',null],
      [null,98,'RECEPCIONISTA','192.168.4.154','Windows 11 Pro (v. 22H2)','DELL OptiPlex 7000, i7 12th Gen, 8 RAM, 477GB SSD','PC-042054.CARIBETOURS.com','2025-02-06','GERENCIA ADMINISTRATIVA',null],
      [null,99,'ASISTENTE 02','192.168.4.126','Windows 10 Education (v. 22H2)','DELL OptiPlex 7070, i7 9th Gen, 8 RAM, 954GB SSD','PC-052026.CARIBETOURS.com','2020-11-25','GERENCIA ADMINISTRATIVA',null],
      // GERENCIA FINANCIERA
      [null,100,'GERENTE','192.168.4.140','Windows 11 Pro (v. 22H2)','DELL OptiPlex 7000, i7 12th Gen, 8 RAM, 477GB SSD','PC-042040.CARIBETOURS.com','2025-03-05','GERENCIA FINANCIERA',null],
      [null,101,'CONTRALOR','192.168.4.141','Windows 11 Pro (v. 22H2)','DELL OptiPlex 7000, i7 12th Gen, 8 RAM, 477GB SSD','PC-042046.CARIBETOURS.com','2025-09-07','GERENCIA FINANCIERA',null],
      [null,102,'PRESUPUESTO','192.168.4.142','Windows 11 Pro (v. 22H2)','DELL OptiPlex 7090, i7 10th Gen, 16 RAM, 477GB SSD','PC-042042.CARIBETOURS.com','2025-08-02','GERENCIA FINANCIERA',null],
      [null,103,'CHEQUES','192.168.4.143','Windows 10 Pro (v. 22H2)','DELL OptiPlex 7050, i5 6th Gen, 8 RAM, 238GB SSD','PC-042043.CARIBETOURS.com','2024-01-16','GERENCIA FINANCIERA',null],
      [null,104,'ASISTENTE 02','192.168.4.144','Windows 10 Education (v. 22H2)','DELL OptiPlex 3020, i5 4th Gen, 4 RAM, 932GB SSD','PC-042044.CARIBETOURS.com','2022-12-13','GERENCIA FINANCIERA',null],
      [null,105,'ASISTENTE 01','192.168.4.147',null,null,null,null,'GERENCIA FINANCIERA',null],
      // CONTABILIDAD
      [null,106,'CONTADOR','192.168.4.146','Windows 11 Pro (v. 22H2)','DELL OptiPlex 7000, i7 12th Gen, 8 RAM, 477GB SSD','PC-042041.CARIBETOURS.com','2025-03-26','CONTABILIDAD',null],
      [null,107,'ASISTENTE','192.168.4.165','Windows 11 Pro (v. 22H2)','DELL OptiPlex 7000, i7 12th Gen, 8 RAM, 477GB SSD','PC-042065.CARIBETOURS.com','2025-04-29','CONTABILIDAD',null],
      [null,108,'AUXILIAR','192.168.4.148','Windows 10 Education (v. 22H2)','DELL OptiPlex 7050, i5 7th Gen, 8 RAM, 238GB SSD','PC-042048.CARIBETOURS.com','2023-09-29','CONTABILIDAD',null],
      [null,109,'CUENTA POR COBRAR','192.168.4.160','Windows 11 Pro (v. 22H2)','DELL OptiPlex SFF Plus 7010, i7 13th Gen, 16 RAM, 477GB SSD','PC-042060.CARIBETOURS.com','2024-12-13','CONTABILIDAD',null],
      [null,110,'ARCHIVO','192.168.4.149','Windows 10 Education (v. 22H2)','DELL OptiPlex 5050, i7 7th Gen, 16 RAM, 238GB SSD','PC-042049.CARIBETOURS.com','2025-03-31','CONTABILIDAD',null],
      // ADMINISTRACION GENERAL
      [null,111,'GERENTE','192.168.4.138',null,null,null,null,'ADMINISTRACION GENERAL',null],
      [null,112,'ASISTENTE','192.168.4.139',null,null,null,null,'ADMINISTRACION GENERAL',null],
      // SUMINISTRO
      [null,113,'ENCARGADO','192.168.4.132','Windows 10 Pro (v. 22H2)','DELL OptiPlex 7050, i5 6th Gen, 8 RAM, 954GB SSD','PC-042032.CARIBETOURS.com','2022-04-12','SUMINISTRO',null],
      [null,114,'ASISTENTE','192.168.4.133','Windows 10 Education (v. 22H2)','DELL OptiPlex 5050, i7 7th Gen, 8 RAM, 954GB SSD','PC-042033.CARIBETOURS.com','2023-05-31','SUMINISTRO',null],
      // IMPRESORAS
      [null,115,'BOLETERIA','192.168.3.25',null,null,null,null,'IMPRESORAS',null],
      [null,116,'MARKETING',null,null,null,null,null,'IMPRESORAS',null],
      [null,117,'CARIBE PACK','192.168.3.48',null,null,null,null,'IMPRESORAS',null],
      [null,118,'RECLAMACIONES',null,null,null,null,null,'IMPRESORAS',null],
      [null,119,'CONTABILIDAD','192.168.4.17',null,null,null,null,'IMPRESORAS',null],
      [null,120,'CONTRALOR','192.168.4.24',null,null,null,null,'IMPRESORAS',null],
      ['2N-PPP2-10',121,'ENVIO SEGUNDO PISO',null,null,null,null,null,'IMPRESORAS',null],
      [null,122,'MONITOREO',null,null,null,null,null,'IMPRESORAS',null],
      // CARIBE PACK (seccion operativa)
      [null,122,'ENCARGADO','192.168.3.110',null,null,null,null,'CARIBE PACK','ENCARGADO'],
      // GERENCIA OPERACIONES
      [null,123,'GERENTE','192.168.3.107','Windows 11 Pro (v. 22H2)','DELL OptiPlex 7000, i7 12th Gen, 8 RAM, 477GB SSD','PC-032007.CARIBETOURS.com','2025-02-05','GERENCIA OPERACIONES',null],
      [null,124,'SECRETARIA','192.168.3.108','Windows 10 Education (v. 22H2)','DELL OptiPlex 7050, i5 7th Gen, 16 RAM, 477GB SSD','PC-032008.CARIBETOURS.com','2025-06-04','GERENCIA OPERACIONES',null],
      // DEPARTAMENTO TECNOLOGIA
      [null,125,'ENCARGADO','192.168.4.7',null,null,null,null,'DEPARTAMENTO TECNOLOGIA',null],
      [null,126,'ANALISTA','192.168.4.74',null,null,null,null,'DEPARTAMENTO TECNOLOGIA',null],
      [null,127,'ASISTENTE','192.168.3.74',null,null,null,null,'DEPARTAMENTO TECNOLOGIA',null],
      [null,128,'ASISTENTE','192.168.3.115',null,null,null,null,'DEPARTAMENTO TECNOLOGIA',null],
      [null,129,'ASISTENTE','192.168.3.94',null,null,null,null,'DEPARTAMENTO TECNOLOGIA',null],
      [null,130,'HACIEL','192.168.4.101','Windows 11 Pro (v. 22H2)','DELL OptiPlex 7050, i5 7th Gen, 16 RAM, 585GB HDD','PC-FACT_ELECTRONICA.CARIBETOURS.com','2024-04-01','DEPARTAMENTO TECNOLOGIA',null],
      [null,131,'T.M.G PLANIFICADOR','192.168.4.79','Windows 10 Education (v. 22H2)','DELL OptiPlex 7050, i7 7th Gen, 16 RAM, 238GB SSD','PC-PLANIFICADOR.CARIBETOURS.com','2025-08-22','DEPARTAMENTO TECNOLOGIA',null],
      [null,132,'NEFTALY','192.168.4.80','Windows 10 Pro (v. 22H2)','DELL OptiPlex 7050, i7 7th Gen, 16 RAM, 477GB SSD','PC-TALLER01.CARIBETOURS.com','2025-08-21','DEPARTAMENTO TECNOLOGIA',null],
      [null,133,'T.M.G-DESPACHO 02','192.168.4.81','Windows 10 Education (v. 22H2)','DELL OptiPlex 7050, i5 7th Gen, 16 RAM, 238GB SSD','PC-ALMDESP03.CARIBETOURS.com','2024-10-01','DEPARTAMENTO TECNOLOGIA',null],
      [null,134,'T.M.G-DESPACHO 01','192.168.4.82','Windows 10 Pro (v. 22H2)','DELL OptiPlex 7050, i5 7th Gen, 16 RAM, 477GB SSD','PC-ALMDESP01.CARIBETOURS.com','2024-09-30','DEPARTAMENTO TECNOLOGIA',null],
      [null,135,'T.MENDOZA','192.168.4.83','Windows 10 Pro (v. 22H2)','DELL OptiPlex 7050, i5 7th Gen, 8 RAM, 238GB SSD','PC-ALMDESP02.CARIBETOURS.com','2024-10-15','DEPARTAMENTO TECNOLOGIA',null],
      [null,136,'T.CAMBITA','192.168.4.84','Windows 10 Pro (v. 22H2)','DELL OptiPlex 7050, i5 7th Gen, 8 RAM, 238GB SSD','PC-ALMDESP03.CARIBETOURS.com','2024-10-21','DEPARTAMENTO TECNOLOGIA',null],
      [null,137,'T.M.G-ALMACEN 01','192.168.4.85','Windows 10 Pro (v. 22H2)','DELL OptiPlex 7050, i5 7th Gen, 8 RAM, 238GB SSD','PC-ALMACENENCO1.CARIBETOURS.com','2024-12-19','DEPARTAMENTO TECNOLOGIA',null],
      [null,138,'T.M.G-CARLOS PEREZ','192.168.4.87','Windows 10 Pro (v. 22H2)','DELL OptiPlex 7050, i5 8th Gen, 8 RAM, 224GB SSD','PC-ALMACENENCO2.CARIBETOURS.com','2024-09-03','DEPARTAMENTO TECNOLOGIA',null],
      [null,139,'TECNOLOGIA DATOS PUEBLO 01','192.168.4.16','Windows 10 Pro (v. 22H2)','DELL OptiPlex 7050, i7 7th Gen, 24 RAM, 954GB SSD','PC-HIGUEY.CARIBETOURS.com','2021-04-11','DEPARTAMENTO TECNOLOGIA',null],
      [null,140,'TECNOLOGIA DATOS PUEBLO 02','192.168.3.7','Windows 7 profesional','i5 7th Gen, 16 RAM, 250GB SSD','PC-NAVARRETE02.CARIBETOURS.com',null,'DEPARTAMENTO TECNOLOGIA',null],
    ];
    for (const [pto, num, pos, ip, so, hw, fdn, inst, dept, sec] of machines) {
      await db.execute(
        `INSERT INTO machines (id, tenant_id, department, section, punto_de_red, numero, posicion, ip_address, so, hardware, full_device_name, installed_on)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [crypto.randomUUID(), defaultTenantId, dept, sec, pto, num, pos, ip, so, hw, fdn, inst]
      );
    }
    console.log('  → Máquinas seed: ' + machines.length + ' registros');
  }

  console.log('✅ Database initialized');
}
