async function addCol(db, table, col, def) {
  try {
    await db.execute(`ALTER TABLE \`${table}\` ADD COLUMN ${col} ${def}`);
  } catch (e) {
    if (e.errno !== 1060) throw e; // 1060 = Duplicate column — already exists
  }
}

export async function runMigrations(db) {
  // Multi-tenant: tenant_id on all tables
  await addCol(db, 'users',            'tenant_id',   'VARCHAR(36) DEFAULT NULL');
  await addCol(db, 'sucursales',       'tenant_id',   'VARCHAR(36) DEFAULT NULL');
  await addCol(db, 'departments',      'tenant_id',   'VARCHAR(36) DEFAULT NULL');
  await addCol(db, 'categories',       'tenant_id',   'VARCHAR(36) DEFAULT NULL');
  await addCol(db, 'inventory_items',  'tenant_id',   'VARCHAR(36) DEFAULT NULL');
  await addCol(db, 'activity_logs',    'tenant_id',   'VARCHAR(36) DEFAULT NULL');
  await addCol(db, 'estantes',         'tenant_id',   'VARCHAR(36) DEFAULT NULL');
  await addCol(db, 'purchase_orders',  'tenant_id',   'VARCHAR(36) DEFAULT NULL');

  // Users
  await addCol(db, 'users', 'permissions', 'TEXT DEFAULT NULL AFTER role');
  await addCol(db, 'users', 'sucursal_id', 'VARCHAR(36) DEFAULT NULL AFTER permissions');

  // Inventory
  await addCol(db, 'inventory_items', 'shelf_id',       'VARCHAR(36) DEFAULT NULL');
  await addCol(db, 'inventory_items', 'shelf_name',     'VARCHAR(255) DEFAULT ""');
  await addCol(db, 'inventory_items', 'sucursal_id',    'VARCHAR(36) DEFAULT NULL AFTER department_name');
  await addCol(db, 'inventory_items', 'sucursal_name',  'VARCHAR(255) DEFAULT "" AFTER sucursal_id');
  await addCol(db, 'inventory_items', 'quantity',       'INT NOT NULL DEFAULT 1 AFTER sucursal_name');
  await addCol(db, 'inventory_items', 'unit_cost',      'DECIMAL(12,2) DEFAULT NULL');
  await addCol(db, 'inventory_items', 'restored_at',    'DATETIME DEFAULT NULL');
  await addCol(db, 'inventory_items', 'expiration_date','DATE DEFAULT NULL');
  await addCol(db, 'inventory_items', 'batch_number',   'VARCHAR(100) DEFAULT NULL');
  await addCol(db, 'inventory_items', 'unit_measure',   'VARCHAR(30) DEFAULT NULL');

  // Departments
  await addCol(db, 'departments', 'sucursal_id',   'VARCHAR(36) DEFAULT NULL AFTER manager');
  await addCol(db, 'departments', 'sucursal_name', 'VARCHAR(255) DEFAULT "" AFTER sucursal_id');

  // Activity logs
  await addCol(db, 'activity_logs', 'from_department_name', 'VARCHAR(255) DEFAULT "" AFTER department_name');
  await addCol(db, 'activity_logs', 'to_department_name',   'VARCHAR(255) DEFAULT "" AFTER from_department_name');
  await addCol(db, 'activity_logs', 'from_sucursal_name',   'VARCHAR(255) DEFAULT "" AFTER to_department_name');
  await addCol(db, 'activity_logs', 'to_sucursal_name',     'VARCHAR(255) DEFAULT "" AFTER from_sucursal_name');
  await addCol(db, 'activity_logs', 'unit_cost',            'DECIMAL(12,2) DEFAULT NULL');
  await addCol(db, 'activity_logs', 'total_value',          'DECIMAL(14,2) DEFAULT NULL');
  await addCol(db, 'activity_logs', 'reason',               'VARCHAR(100) DEFAULT NULL');
  await addCol(db, 'activity_logs', 'destination',          'VARCHAR(255) DEFAULT NULL');

  // Estantes
  await addCol(db, 'estantes', 'type', "VARCHAR(50) NOT NULL DEFAULT 'estante'");

  // Tenants
  await addCol(db, 'tenants', 'stripe_customer_id',     'VARCHAR(255) DEFAULT NULL');
  await addCol(db, 'tenants', 'stripe_subscription_id', 'VARCHAR(255) DEFAULT NULL');
  await addCol(db, 'tenants', 'trial_ends_at',           'DATETIME DEFAULT NULL');
  await addCol(db, 'tenants', 'billing_status',          "VARCHAR(20) NOT NULL DEFAULT 'trialing'");
  await addCol(db, 'tenants', 'business_type',           "VARCHAR(30) NOT NULL DEFAULT 'tecnologia'");
  await addCol(db, 'tenants', 'billing_exempt',          'TINYINT(1) NOT NULL DEFAULT 0');

  // Categories
  await addCol(db, 'categories', 'parent_id', 'VARCHAR(36) DEFAULT NULL');

  // Expand ENUMs
  await db.execute(`
    ALTER TABLE purchase_orders
    MODIFY COLUMN status ENUM('pending','approved','rejected','completed','ordered','received','cancelled') NOT NULL DEFAULT 'pending'
  `);
  await db.execute(`
    ALTER TABLE inventory_items
    MODIFY COLUMN status ENUM('in_stock','checked_out','maintenance','retired','revision','damaged') NOT NULL DEFAULT 'in_stock'
  `);

  // Mark Default Company as billing exempt
  await db.execute("UPDATE tenants SET billing_exempt = 1 WHERE name = 'Default Company'");

  console.log('  ✓ Migrations applied');
}
