import bcrypt from 'bcryptjs';

export async function runSeeds(db) {
  const [[{ tenantCnt }]] = await db.execute('SELECT COUNT(*) as tenantCnt FROM tenants');
  let defaultTenantId;

  if (tenantCnt === 0) {
    defaultTenantId = crypto.randomUUID();
    await db.execute(
      `INSERT INTO tenants (id, name, inventory_type, plan, max_records, max_users, max_sucursales, billing_exempt)
       VALUES (?, 'Default Company', 'physical', 'starter', 40000, 3, 1, 1)`,
      [defaultTenantId]
    );
    console.log('  → Tenant creado: Default Company');
  } else {
    const [[first]] = await db.execute('SELECT id FROM tenants ORDER BY created_at ASC LIMIT 1');
    defaultTenantId = first.id;
  }

  // Assign orphaned rows to the default tenant
  for (const table of ['users','sucursales','departments','categories','inventory_items','activity_logs','estantes','purchase_orders']) {
    await db.execute(`UPDATE \`${table}\` SET tenant_id = ? WHERE tenant_id IS NULL`, [defaultTenantId]);
  }

  // Seed admin user
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

  // Seed sucursal
  const [[{ sucCnt }]] = await db.execute(
    'SELECT COUNT(*) as sucCnt FROM sucursales WHERE tenant_id = ? AND deleted_at IS NULL',
    [defaultTenantId]
  );
  if (sucCnt === 0) {
    const sucId = crypto.randomUUID();
    await db.execute(
      'INSERT INTO sucursales (id, name, address, manager, tenant_id) VALUES (?, ?, ?, ?, ?)',
      [sucId, 'Sede Principal', 'Dirección principal', 'Administrador', defaultTenantId]
    );
    const depts = [
      ['IT', 'Departamento de Tecnología de la Información', 'Carlos Mendoza'],
      ['RRHH', 'Recursos Humanos', 'Maria García'],
      ['Finanzas', 'Departamento de Finanzas y Contabilidad', 'Roberto López'],
      ['Operaciones', 'Departamento de Operaciones', 'Ana Torres'],
    ];
    for (const [name, description, manager] of depts) {
      await db.execute(
        'INSERT INTO departments (id, name, description, manager, sucursal_id, sucursal_name, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [crypto.randomUUID(), name, description, manager, sucId, 'Sede Principal', defaultTenantId]
      );
    }
    console.log('  → Sucursal y departamentos creados');
  }

  // Seed categories
  const [[{ catCnt }]] = await db.execute(
    'SELECT COUNT(*) as catCnt FROM categories WHERE tenant_id = ? AND deleted_at IS NULL',
    [defaultTenantId]
  );
  if (catCnt === 0) {
    const cats = [
      ['Laptop', 1, 1, 3], ['Monitor', 1, 1, 5], ['Mouse', 0, 0, 10],
      ['Teclado', 0, 0, 10], ['Impresora', 1, 1, 2], ['Teléfono', 1, 1, 3],
      ['Cable HDMI', 0, 0, 15], ['Docking Station', 1, 1, 3],
    ];
    for (const [name, rat, rui, min] of cats) {
      await db.execute(
        'INSERT INTO categories (id, name, requires_asset_tag, requires_unique_id, minimum_stock, tenant_id) VALUES (?, ?, ?, ?, ?, ?)',
        [crypto.randomUUID(), name, rat, rui, min, defaultTenantId]
      );
    }
    console.log('  → Categorías creadas');
  }

  console.log('  ✓ Seeds done');
}
