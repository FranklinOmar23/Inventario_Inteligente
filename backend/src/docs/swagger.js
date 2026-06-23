const bearer = { bearerAuth: [] };

const schemas = {
  Error: {
    type: 'object',
    properties: { error: { type: 'string', example: 'Mensaje de error' } },
  },
  Ok: {
    type: 'object',
    properties: { ok: { type: 'boolean', example: true } },
  },
  User: {
    type: 'object',
    properties: {
      id:          { type: 'string', format: 'uuid' },
      email:       { type: 'string', format: 'email' },
      full_name:   { type: 'string' },
      role:        { type: 'string', enum: ['admin', 'user'] },
      permissions: { type: 'array', items: { type: 'string' }, nullable: true },
      sucursal_id: { type: 'string', format: 'uuid', nullable: true },
      tenant_id:   { type: 'string', format: 'uuid' },
      created_at:  { type: 'string', format: 'date-time' },
    },
  },
  Tenant: {
    type: 'object',
    properties: {
      id:             { type: 'string', format: 'uuid' },
      name:           { type: 'string' },
      rnc:            { type: 'string', nullable: true },
      inventory_type: { type: 'string', enum: ['physical', 'valued', 'stock'] },
      plan:           { type: 'string', enum: ['starter', 'pro', 'enterprise'] },
      billing_status: { type: 'string' },
      max_records:    { type: 'integer' },
      max_users:      { type: 'integer' },
      max_sucursales: { type: 'integer' },
      is_active:      { type: 'boolean' },
      is_default:     { type: 'boolean' },
    },
  },
  Category: {
    type: 'object',
    properties: {
      id:                 { type: 'string', format: 'uuid' },
      name:               { type: 'string' },
      requires_asset_tag: { type: 'boolean' },
      requires_unique_id: { type: 'boolean' },
      minimum_stock:      { type: 'integer' },
      parent_id:          { type: 'string', format: 'uuid', nullable: true },
    },
  },
  Department: {
    type: 'object',
    properties: {
      id:          { type: 'string', format: 'uuid' },
      name:        { type: 'string' },
      description: { type: 'string', nullable: true },
      sucursal_id: { type: 'string', format: 'uuid', nullable: true },
    },
  },
  Sucursal: {
    type: 'object',
    properties: {
      id:       { type: 'string', format: 'uuid' },
      name:     { type: 'string' },
      address:  { type: 'string', nullable: true },
      manager:  { type: 'string', nullable: true },
    },
  },
  Estante: {
    type: 'object',
    properties: {
      id:           { type: 'string', format: 'uuid' },
      name:         { type: 'string' },
      sucursal_id:  { type: 'string', format: 'uuid', nullable: true },
      sucursal_name:{ type: 'string', nullable: true },
    },
  },
  InventoryItem: {
    type: 'object',
    properties: {
      id:              { type: 'string', format: 'uuid' },
      name:            { type: 'string' },
      description:     { type: 'string' },
      category_id:     { type: 'string', format: 'uuid', nullable: true },
      category_name:   { type: 'string' },
      department_id:   { type: 'string', format: 'uuid', nullable: true },
      department_name: { type: 'string' },
      sucursal_id:     { type: 'string', format: 'uuid', nullable: true },
      sucursal_name:   { type: 'string' },
      shelf_id:        { type: 'string', format: 'uuid', nullable: true },
      shelf_name:      { type: 'string', nullable: true },
      status: {
        type: 'string',
        enum: ['in_stock', 'checked_out', 'maintenance', 'retired', 'revision', 'damaged'],
      },
      quantity:        { type: 'integer' },
      unit_cost:       { type: 'number', nullable: true },
      asset_tag:       { type: 'string' },
      service_tag:     { type: 'string' },
      serial_number:   { type: 'string' },
      model:           { type: 'string' },
      brand:           { type: 'string' },
      entry_date:      { type: 'string', format: 'date', nullable: true },
      expiration_date: { type: 'string', format: 'date', nullable: true },
      batch_number:    { type: 'string', nullable: true },
      unit_measure:    { type: 'string', nullable: true },
      has_unique_id:   { type: 'boolean' },
      notes:           { type: 'string', nullable: true },
      created_at:      { type: 'string', format: 'date-time' },
      updated_at:      { type: 'string', format: 'date-time' },
    },
  },
  ActivityLog: {
    type: 'object',
    properties: {
      id:           { type: 'string', format: 'uuid' },
      action:       { type: 'string' },
      item_id:      { type: 'string', format: 'uuid', nullable: true },
      item_name:    { type: 'string' },
      quantity:     { type: 'integer' },
      performed_by: { type: 'string' },
      reason:       { type: 'string', nullable: true },
      destination:  { type: 'string', nullable: true },
      timestamp:    { type: 'string', format: 'date-time' },
    },
  },
  PurchaseOrder: {
    type: 'object',
    properties: {
      id:                 { type: 'string', format: 'uuid' },
      category_id:        { type: 'string', format: 'uuid', nullable: true },
      category_name:      { type: 'string' },
      quantity_suggested: { type: 'integer' },
      status: {
        type: 'string',
        enum: ['pending', 'approved', 'rejected', 'completed', 'ordered', 'received', 'cancelled'],
      },
      notes:      { type: 'string', nullable: true },
      created_at: { type: 'string', format: 'date-time' },
    },
  },
  Machine: {
    type: 'object',
    properties: {
      id:              { type: 'string', format: 'uuid' },
      department:      { type: 'string' },
      section:         { type: 'string', nullable: true },
      punto_de_red:    { type: 'string', nullable: true },
      numero:          { type: 'string', nullable: true },
      posicion:        { type: 'string', nullable: true },
      ip_address:      { type: 'string', nullable: true },
      so:              { type: 'string', nullable: true },
      hardware:        { type: 'string', nullable: true },
      full_device_name:{ type: 'string', nullable: true },
      installed_on:    { type: 'string', format: 'date', nullable: true },
      notes:           { type: 'string', nullable: true },
      status:          { type: 'string', enum: ['active', 'inactive'] },
    },
  },
  BillingInfo: {
    type: 'object',
    properties: {
      plan:               { type: 'string', enum: ['starter', 'pro', 'enterprise'] },
      billing_status:     { type: 'string' },
      billing_exempt:     { type: 'boolean' },
      trial_ends_at:      { type: 'string', format: 'date-time', nullable: true },
      next_billing_date:  { type: 'string', format: 'date-time', nullable: true },
      amount:             { type: 'number', nullable: true },
      currency:           { type: 'string', example: 'DOP' },
      has_payment_method: { type: 'boolean' },
    },
  },
};

// ─── Reusable response helpers ────────────────────────────────────────────────

const r200 = (schema) => ({ 200: { description: 'OK', content: { 'application/json': { schema } } } });
const r201 = (schema) => ({ 201: { description: 'Creado', content: { 'application/json': { schema } } } });
const r400 = { description: 'Petición inválida', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } };
const r401 = { description: 'No autenticado' };
const r403 = { description: 'Acceso denegado' };
const r404 = { description: 'No encontrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } };

const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const arrayOf = (name) => ({ type: 'array', items: ref(name) });
const idParam = { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } };
const commonErrors = { 400: r400, 401: r401, 403: r403, 404: r404 };

// ─── Paths ────────────────────────────────────────────────────────────────────

const paths = {

  // ── Auth ──────────────────────────────────────────────────────────────────

  '/api/auth/login': {
    post: {
      tags: ['Auth'],
      summary: 'Iniciar sesión',
      security: [],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' } } } } },
      },
      responses: {
        ...r200({ type: 'object', properties: { token: { type: 'string' }, user: ref('User') } }),
        401: r401,
      },
    },
  },
  '/api/auth/setup-tenant': {
    post: {
      tags: ['Auth'],
      summary: 'Registro + crear empresa',
      security: [],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { type: 'object', required: ['email', 'password', 'full_name', 'company_name'], properties: { email: { type: 'string' }, password: { type: 'string' }, full_name: { type: 'string' }, company_name: { type: 'string' }, inventory_type: { type: 'string', enum: ['physical', 'valued', 'stock'] } } } } },
      },
      responses: {
        ...r201({ type: 'object', properties: { token: { type: 'string' }, user: ref('User'), tenant: ref('Tenant') } }),
        400: r400,
      },
    },
  },
  '/api/auth/me': {
    get: {
      tags: ['Auth'],
      summary: 'Obtener usuario autenticado',
      security: [bearer],
      responses: { ...r200(ref('User')), 401: r401 },
    },
  },
  '/api/auth/change-password': {
    put: {
      tags: ['Auth'],
      summary: 'Cambiar contraseña',
      security: [bearer],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { type: 'object', required: ['current_password', 'new_password'], properties: { current_password: { type: 'string' }, new_password: { type: 'string' } } } } },
      },
      responses: { ...r200(ref('Ok')), 400: r400, 401: r401 },
    },
  },

  // ── Inventory ─────────────────────────────────────────────────────────────

  '/api/inventory': {
    get: {
      tags: ['Inventory'],
      summary: 'Listar ítems',
      security: [bearer],
      parameters: [
        { name: 'status', in: 'query', schema: { type: 'string' } },
        { name: 'category_id', in: 'query', schema: { type: 'string' } },
        { name: 'department_id', in: 'query', schema: { type: 'string' } },
        { name: 'sucursal_id', in: 'query', schema: { type: 'string' } },
        { name: 'shelf_id', in: 'query', schema: { type: 'string' } },
        { name: 'search', in: 'query', schema: { type: 'string' } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 200 } },
      ],
      responses: { ...r200(arrayOf('InventoryItem')), 401: r401 },
    },
    post: {
      tags: ['Inventory'],
      summary: 'Crear ítem',
      security: [bearer],
      requestBody: { required: true, content: { 'application/json': { schema: ref('InventoryItem') } } },
      responses: { ...r201(ref('InventoryItem')), ...commonErrors },
    },
  },
  '/api/inventory/damaged': {
    get: {
      tags: ['Inventory'],
      summary: 'Listar ítems dañados / retirados',
      security: [bearer],
      responses: { ...r200(arrayOf('InventoryItem')), 401: r401 },
    },
  },
  '/api/inventory/bulk': {
    post: {
      tags: ['Inventory'],
      summary: 'Entrada masiva de ítems (desde factura)',
      security: [bearer],
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { items: { type: 'array', items: ref('InventoryItem') } } } } } },
      responses: { ...r201({ type: 'object', properties: { created: { type: 'integer' } } }), ...commonErrors },
    },
  },
  '/api/inventory/bulk-status': {
    post: {
      tags: ['Inventory'],
      summary: 'Cambiar estado masivo',
      security: [bearer],
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['ids', 'new_status'], properties: { ids: { type: 'array', items: { type: 'string' } }, new_status: { type: 'string' } } } } } },
      responses: { ...r200(ref('Ok')), ...commonErrors },
    },
  },
  '/api/inventory/{id}': {
    get: {
      tags: ['Inventory'],
      summary: 'Obtener ítem por ID',
      security: [bearer],
      parameters: [idParam],
      responses: { ...r200(ref('InventoryItem')), 401: r401, 404: r404 },
    },
    put: {
      tags: ['Inventory'],
      summary: 'Actualizar ítem',
      security: [bearer],
      parameters: [idParam],
      requestBody: { required: true, content: { 'application/json': { schema: ref('InventoryItem') } } },
      responses: { ...r200(ref('InventoryItem')), ...commonErrors },
    },
    delete: {
      tags: ['Inventory'],
      summary: 'Archivar ítem (soft delete)',
      security: [bearer],
      parameters: [idParam],
      responses: { ...r200(ref('Ok')), 401: r401, 404: r404 },
    },
  },
  '/api/inventory/{id}/permanent': {
    delete: {
      tags: ['Inventory'],
      summary: 'Eliminar ítem permanentemente',
      security: [bearer],
      parameters: [idParam],
      responses: { ...r200(ref('Ok')), 401: r401, 403: r403, 404: r404 },
    },
  },
  '/api/inventory/{id}/status': {
    patch: {
      tags: ['Inventory'],
      summary: 'Cambiar estado individual',
      security: [bearer],
      parameters: [idParam],
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['status'], properties: { status: { type: 'string' }, checkout_date: { type: 'string', format: 'date' }, checked_out_to: { type: 'string' } } } } } },
      responses: { ...r200(ref('InventoryItem')), ...commonErrors },
    },
  },
  '/api/inventory/{id}/transfer': {
    post: {
      tags: ['Inventory'],
      summary: 'Transferir ítem a otro departamento/sucursal',
      security: [bearer],
      parameters: [idParam],
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['department_id', 'quantity'], properties: { department_id: { type: 'string' }, department_name: { type: 'string' }, sucursal_id: { type: 'string' }, sucursal_name: { type: 'string' }, quantity: { type: 'integer' }, notes: { type: 'string' } } } } } },
      responses: { ...r200(ref('Ok')), ...commonErrors },
    },
  },
  '/api/inventory/{id}/exit': {
    post: {
      tags: ['Inventory'],
      summary: 'Registrar salida de mercancía',
      security: [bearer],
      parameters: [idParam],
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['quantity', 'reason'], properties: { quantity: { type: 'integer' }, reason: { type: 'string' }, destination: { type: 'string' } } } } } },
      responses: { ...r200(ref('Ok')), ...commonErrors },
    },
  },
  '/api/inventory/{id}/notes': {
    patch: {
      tags: ['Inventory'],
      summary: 'Actualizar notas de ítem',
      security: [bearer],
      parameters: [idParam],
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { notes: { type: 'string' } } } } } },
      responses: { ...r200(ref('Ok')), 401: r401, 404: r404 },
    },
  },
  '/api/inventory/{id}/restore': {
    patch: {
      tags: ['Inventory'],
      summary: 'Restaurar ítem archivado',
      security: [bearer],
      parameters: [idParam],
      responses: { ...r200(ref('Ok')), 401: r401, 404: r404 },
    },
  },

  // ── Categories ────────────────────────────────────────────────────────────

  '/api/categories': {
    get: {
      tags: ['Categories'],
      summary: 'Listar categorías',
      security: [bearer],
      responses: { ...r200(arrayOf('Category')), 401: r401 },
    },
    post: {
      tags: ['Categories'],
      summary: 'Crear categoría',
      security: [bearer],
      requestBody: { required: true, content: { 'application/json': { schema: ref('Category') } } },
      responses: { ...r201(ref('Category')), ...commonErrors },
    },
  },
  '/api/categories/{id}': {
    get: {
      tags: ['Categories'],
      summary: 'Obtener categoría',
      security: [bearer],
      parameters: [idParam],
      responses: { ...r200(ref('Category')), 401: r401, 404: r404 },
    },
    put: {
      tags: ['Categories'],
      summary: 'Actualizar categoría',
      security: [bearer],
      parameters: [idParam],
      requestBody: { required: true, content: { 'application/json': { schema: ref('Category') } } },
      responses: { ...r200(ref('Category')), ...commonErrors },
    },
    delete: {
      tags: ['Categories'],
      summary: 'Eliminar categoría',
      security: [bearer],
      parameters: [idParam],
      responses: { ...r200(ref('Ok')), 401: r401, 404: r404 },
    },
  },

  // ── Departments ───────────────────────────────────────────────────────────

  '/api/departments': {
    get: {
      tags: ['Departments'],
      summary: 'Listar departamentos',
      security: [bearer],
      parameters: [{ name: 'sucursal_id', in: 'query', schema: { type: 'string' } }],
      responses: { ...r200(arrayOf('Department')), 401: r401 },
    },
    post: {
      tags: ['Departments'],
      summary: 'Crear departamento',
      security: [bearer],
      requestBody: { required: true, content: { 'application/json': { schema: ref('Department') } } },
      responses: { ...r201(ref('Department')), ...commonErrors },
    },
  },
  '/api/departments/{id}': {
    get: {
      tags: ['Departments'],
      summary: 'Obtener departamento',
      security: [bearer],
      parameters: [idParam],
      responses: { ...r200(ref('Department')), 401: r401, 404: r404 },
    },
    put: {
      tags: ['Departments'],
      summary: 'Actualizar departamento',
      security: [bearer],
      parameters: [idParam],
      requestBody: { required: true, content: { 'application/json': { schema: ref('Department') } } },
      responses: { ...r200(ref('Department')), ...commonErrors },
    },
    delete: {
      tags: ['Departments'],
      summary: 'Eliminar departamento',
      security: [bearer],
      parameters: [idParam],
      responses: { ...r200(ref('Ok')), 401: r401, 404: r404 },
    },
  },

  // ── Sucursales ────────────────────────────────────────────────────────────

  '/api/sucursales': {
    get: {
      tags: ['Sucursales'],
      summary: 'Listar sucursales',
      security: [bearer],
      responses: { ...r200(arrayOf('Sucursal')), 401: r401 },
    },
    post: {
      tags: ['Sucursales'],
      summary: 'Crear sucursal',
      security: [bearer],
      requestBody: { required: true, content: { 'application/json': { schema: ref('Sucursal') } } },
      responses: { ...r201(ref('Sucursal')), ...commonErrors },
    },
  },
  '/api/sucursales/{id}': {
    get: {
      tags: ['Sucursales'],
      summary: 'Obtener sucursal',
      security: [bearer],
      parameters: [idParam],
      responses: { ...r200(ref('Sucursal')), 401: r401, 404: r404 },
    },
    put: {
      tags: ['Sucursales'],
      summary: 'Actualizar sucursal',
      security: [bearer],
      parameters: [idParam],
      requestBody: { required: true, content: { 'application/json': { schema: ref('Sucursal') } } },
      responses: { ...r200(ref('Sucursal')), ...commonErrors },
    },
    delete: {
      tags: ['Sucursales'],
      summary: 'Eliminar sucursal',
      security: [bearer],
      parameters: [idParam],
      responses: { ...r200(ref('Ok')), 401: r401, 404: r404 },
    },
  },

  // ── Estantes ──────────────────────────────────────────────────────────────

  '/api/estantes': {
    get: {
      tags: ['Estantes'],
      summary: 'Listar estantes',
      security: [bearer],
      responses: { ...r200(arrayOf('Estante')), 401: r401 },
    },
    post: {
      tags: ['Estantes'],
      summary: 'Crear estante',
      security: [bearer],
      requestBody: { required: true, content: { 'application/json': { schema: ref('Estante') } } },
      responses: { ...r201(ref('Estante')), ...commonErrors },
    },
  },
  '/api/estantes/{id}': {
    put: {
      tags: ['Estantes'],
      summary: 'Actualizar estante',
      security: [bearer],
      parameters: [idParam],
      requestBody: { required: true, content: { 'application/json': { schema: ref('Estante') } } },
      responses: { ...r200(ref('Estante')), ...commonErrors },
    },
    delete: {
      tags: ['Estantes'],
      summary: 'Eliminar estante',
      security: [bearer],
      parameters: [idParam],
      responses: { ...r200(ref('Ok')), 401: r401, 404: r404 },
    },
  },

  // ── Users ─────────────────────────────────────────────────────────────────

  '/api/users': {
    get: {
      tags: ['Users'],
      summary: 'Listar usuarios de la empresa',
      security: [bearer],
      responses: { ...r200(arrayOf('User')), 401: r401, 403: r403 },
    },
    post: {
      tags: ['Users'],
      summary: 'Crear usuario',
      security: [bearer],
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email', 'password', 'full_name'], properties: { email: { type: 'string' }, password: { type: 'string' }, full_name: { type: 'string' }, role: { type: 'string', enum: ['admin', 'user'] }, permissions: { type: 'array', items: { type: 'string' } }, sucursal_id: { type: 'string' } } } } } },
      responses: { ...r201(ref('User')), ...commonErrors },
    },
  },
  '/api/users/{id}': {
    put: {
      tags: ['Users'],
      summary: 'Actualizar usuario',
      security: [bearer],
      parameters: [idParam],
      requestBody: { required: true, content: { 'application/json': { schema: ref('User') } } },
      responses: { ...r200(ref('User')), ...commonErrors },
    },
    delete: {
      tags: ['Users'],
      summary: 'Eliminar usuario',
      security: [bearer],
      parameters: [idParam],
      responses: { ...r200(ref('Ok')), 401: r401, 403: r403, 404: r404 },
    },
  },

  // ── Activity Logs ─────────────────────────────────────────────────────────

  '/api/logs': {
    get: {
      tags: ['Logs'],
      summary: 'Historial de actividad',
      security: [bearer],
      parameters: [
        { name: 'action', in: 'query', schema: { type: 'string' } },
        { name: 'item_id', in: 'query', schema: { type: 'string' } },
        { name: 'search', in: 'query', schema: { type: 'string' } },
        { name: 'sucursal_id', in: 'query', schema: { type: 'string' } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 200 } },
      ],
      responses: { ...r200(arrayOf('ActivityLog')), 401: r401 },
    },
    post: {
      tags: ['Logs'],
      summary: 'Registrar entrada en historial',
      security: [bearer],
      requestBody: { required: true, content: { 'application/json': { schema: ref('ActivityLog') } } },
      responses: { ...r201(ref('ActivityLog')), ...commonErrors },
    },
  },
  '/api/logs/{id}': {
    delete: {
      tags: ['Logs'],
      summary: 'Eliminar entrada de historial',
      security: [bearer],
      parameters: [idParam],
      responses: { ...r200(ref('Ok')), 401: r401, 403: r403, 404: r404 },
    },
  },

  // ── Purchase Orders ───────────────────────────────────────────────────────

  '/api/purchase-orders': {
    get: {
      tags: ['PurchaseOrders'],
      summary: 'Listar órdenes de compra',
      security: [bearer],
      responses: { ...r200(arrayOf('PurchaseOrder')), 401: r401 },
    },
    post: {
      tags: ['PurchaseOrders'],
      summary: 'Crear orden de compra',
      security: [bearer],
      requestBody: { required: true, content: { 'application/json': { schema: ref('PurchaseOrder') } } },
      responses: { ...r201(ref('PurchaseOrder')), ...commonErrors },
    },
  },
  '/api/purchase-orders/manager-config': {
    get: {
      tags: ['PurchaseOrders'],
      summary: 'Obtener configuración del manager de compras',
      security: [bearer],
      responses: { ...r200({ type: 'object' }), 401: r401 },
    },
  },
  '/api/purchase-orders/send-requisition': {
    post: {
      tags: ['PurchaseOrders'],
      summary: 'Enviar requisición por email',
      security: [bearer],
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { order_id: { type: 'string' } } } } } },
      responses: { ...r200(ref('Ok')), ...commonErrors },
    },
  },
  '/api/purchase-orders/{id}': {
    get: {
      tags: ['PurchaseOrders'],
      summary: 'Obtener orden por ID',
      security: [bearer],
      parameters: [idParam],
      responses: { ...r200(ref('PurchaseOrder')), 401: r401, 404: r404 },
    },
    put: {
      tags: ['PurchaseOrders'],
      summary: 'Actualizar orden de compra',
      security: [bearer],
      parameters: [idParam],
      requestBody: { required: true, content: { 'application/json': { schema: ref('PurchaseOrder') } } },
      responses: { ...r200(ref('PurchaseOrder')), ...commonErrors },
    },
    delete: {
      tags: ['PurchaseOrders'],
      summary: 'Eliminar orden de compra',
      security: [bearer],
      parameters: [idParam],
      responses: { ...r200(ref('Ok')), 401: r401, 404: r404 },
    },
  },

  // ── Reports ───────────────────────────────────────────────────────────────

  '/api/reports/summary': {
    get: {
      tags: ['Reports'],
      summary: 'Resumen general del inventario',
      security: [bearer],
      parameters: [{ name: 'sucursal_id', in: 'query', schema: { type: 'string' } }],
      responses: { ...r200({ type: 'object' }), 401: r401 },
    },
  },
  '/api/reports/by-status': {
    get: {
      tags: ['Reports'],
      summary: 'Distribución por estado',
      security: [bearer],
      parameters: [{ name: 'sucursal_id', in: 'query', schema: { type: 'string' } }],
      responses: { ...r200({ type: 'array', items: { type: 'object' } }), 401: r401 },
    },
  },
  '/api/reports/by-category': {
    get: {
      tags: ['Reports'],
      summary: 'Distribución por categoría',
      security: [bearer],
      parameters: [{ name: 'sucursal_id', in: 'query', schema: { type: 'string' } }],
      responses: { ...r200({ type: 'array', items: { type: 'object' } }), 401: r401 },
    },
  },
  '/api/reports/by-sucursal': {
    get: {
      tags: ['Reports'],
      summary: 'Distribución por sucursal',
      security: [bearer],
      responses: { ...r200({ type: 'array', items: { type: 'object' } }), 401: r401 },
    },
  },
  '/api/reports/activity': {
    get: {
      tags: ['Reports'],
      summary: 'Actividad del período (entradas / salidas por día)',
      security: [bearer],
      parameters: [
        { name: 'days', in: 'query', schema: { type: 'integer', default: 30 } },
        { name: 'sucursal_id', in: 'query', schema: { type: 'string' } },
      ],
      responses: { ...r200({ type: 'array', items: { type: 'object' } }), 401: r401 },
    },
  },
  '/api/reports/by-estante': {
    get: {
      tags: ['Reports'],
      summary: 'Distribución por estante',
      security: [bearer],
      responses: { ...r200({ type: 'array', items: { type: 'object' } }), 401: r401 },
    },
  },
  '/api/reports/exits': {
    get: {
      tags: ['Reports'],
      summary: 'Reporte de salidas de mercancía',
      security: [bearer],
      parameters: [
        { name: 'days', in: 'query', schema: { type: 'integer', default: 30 } },
        { name: 'sucursal_id', in: 'query', schema: { type: 'string' } },
      ],
      responses: { ...r200({ type: 'object' }), 401: r401 },
    },
  },
  '/api/reports/top-items': {
    get: {
      tags: ['Reports'],
      summary: 'Ítems más activos',
      security: [bearer],
      parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } }],
      responses: { ...r200({ type: 'array', items: { type: 'object' } }), 401: r401 },
    },
  },

  // ── Tenants ───────────────────────────────────────────────────────────────

  '/api/tenants/me': {
    get: {
      tags: ['Tenants'],
      summary: 'Obtener datos de la empresa actual',
      security: [bearer],
      responses: { ...r200(ref('Tenant')), 401: r401 },
    },
    put: {
      tags: ['Tenants'],
      summary: 'Actualizar datos de la empresa',
      security: [bearer],
      requestBody: { required: true, content: { 'application/json': { schema: ref('Tenant') } } },
      responses: { ...r200(ref('Tenant')), ...commonErrors },
    },
  },
  '/api/tenants/email-config': {
    get: {
      tags: ['Tenants'],
      summary: 'Obtener configuración de email SMTP',
      security: [bearer],
      responses: { ...r200({ type: 'object' }), 401: r401, 403: r403 },
    },
    put: {
      tags: ['Tenants'],
      summary: 'Guardar configuración SMTP',
      security: [bearer],
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { smtp_host: { type: 'string' }, smtp_port: { type: 'integer' }, smtp_user: { type: 'string' }, smtp_pass: { type: 'string' }, manager_email: { type: 'string' } } } } } },
      responses: { ...r200(ref('Ok')), ...commonErrors },
    },
  },

  // ── Billing ───────────────────────────────────────────────────────────────

  '/api/billing/info': {
    get: {
      tags: ['Billing'],
      summary: 'Estado de facturación de la empresa',
      security: [bearer],
      responses: { ...r200(ref('BillingInfo')), 401: r401 },
    },
  },
  '/api/billing/create-checkout-session': {
    post: {
      tags: ['Billing'],
      summary: 'Crear sesión de pago Stripe',
      security: [bearer],
      responses: {
        ...r200({ type: 'object', properties: { url: { type: 'string', format: 'uri' } } }),
        401: r401, 403: r403,
        503: { description: 'Stripe no configurado' },
      },
    },
  },
  '/api/billing/webhook': {
    post: {
      tags: ['Billing'],
      summary: 'Webhook de Stripe (uso interno)',
      security: [],
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
      responses: {
        ...r200({ type: 'object', properties: { received: { type: 'boolean' } } }),
        400: r400,
      },
    },
  },

  // ── Upload ────────────────────────────────────────────────────────────────

  '/api/upload': {
    post: {
      tags: ['Upload'],
      summary: 'Subir imagen (multipart/form-data)',
      security: [bearer],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              properties: { file: { type: 'string', format: 'binary' } },
            },
          },
        },
      },
      responses: {
        ...r200({ type: 'object', properties: { url: { type: 'string', format: 'uri' } } }),
        400: r400, 401: r401,
      },
    },
  },

  // ── AI ────────────────────────────────────────────────────────────────────

  '/api/ai/detect-image': {
    post: {
      tags: ['AI'],
      summary: 'Detectar datos de dispositivo desde imagen',
      security: [bearer],
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { image_url: { type: 'string' }, image_base64: { type: 'string' } } } } } },
      responses: { ...r200({ type: 'object' }), ...commonErrors },
    },
  },
  '/api/ai/identify-model': {
    post: {
      tags: ['AI'],
      summary: 'Identificar marca/modelo desde código escaneado',
      security: [bearer],
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['code'], properties: { code: { type: 'string' } } } } } },
      responses: { ...r200({ type: 'object' }), ...commonErrors },
    },
  },
  '/api/ai/detect-invoice': {
    post: {
      tags: ['AI'],
      summary: 'Extraer ítems de factura para entrada masiva',
      security: [bearer],
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { image_url: { type: 'string' }, image_base64: { type: 'string' } } } } } },
      responses: { ...r200({ type: 'object', properties: { supplier: { type: 'string' }, items: { type: 'array', items: { type: 'object' } } } }), ...commonErrors },
    },
  },
  '/api/ai/search': {
    post: {
      tags: ['AI'],
      summary: 'Buscar ítem en inventario por descripción natural',
      security: [bearer],
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['query', 'items'], properties: { query: { type: 'string' }, items: { type: 'array', items: { type: 'object' } } } } } } },
      responses: { ...r200({ type: 'object', properties: { item_id: { type: 'string' }, confidence: { type: 'string' }, reason: { type: 'string' } } }), ...commonErrors },
    },
  },
  '/api/ai/search-by-image': {
    post: {
      tags: ['AI'],
      summary: 'Buscar ítem en inventario por imagen',
      security: [bearer],
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['image_base64', 'items'], properties: { image_base64: { type: 'string' }, items: { type: 'array', items: { type: 'object' } } } } } } },
      responses: { ...r200({ type: 'object' }), ...commonErrors },
    },
  },
  '/api/ai/report-analysis': {
    post: {
      tags: ['AI'],
      summary: 'Generar análisis ejecutivo del reporte',
      security: [bearer],
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
      responses: { ...r200({ type: 'object', properties: { analysis: { type: 'string' } } }), ...commonErrors },
    },
  },
  '/api/ai/chat': {
    post: {
      tags: ['AI'],
      summary: 'Chat con Inventia (requiere plan Pro/Enterprise)',
      security: [bearer],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['message'],
              properties: {
                message: { type: 'string', example: '¿Cuántos ítems hay en stock?' },
                history: { type: 'array', items: { type: 'object', properties: { role: { type: 'string', enum: ['user', 'assistant'] }, content: { type: 'string' } } } },
              },
            },
          },
        },
      },
      responses: {
        ...r200({ type: 'object', properties: { reply: { type: 'string' } } }),
        400: r400, 401: r401, 403: r403,
      },
    },
  },

  // ── Machines ──────────────────────────────────────────────────────────────

  '/api/machines': {
    get: {
      tags: ['Machines'],
      summary: 'Listar equipos (solo empresa por defecto)',
      security: [bearer],
      responses: { ...r200(arrayOf('Machine')), 401: r401 },
    },
    post: {
      tags: ['Machines'],
      summary: 'Registrar equipo',
      security: [bearer],
      requestBody: { required: true, content: { 'application/json': { schema: ref('Machine') } } },
      responses: { ...r201(ref('Machine')), ...commonErrors },
    },
  },
  '/api/machines/{id}': {
    put: {
      tags: ['Machines'],
      summary: 'Actualizar equipo',
      security: [bearer],
      parameters: [idParam],
      requestBody: { required: true, content: { 'application/json': { schema: ref('Machine') } } },
      responses: { ...r200(ref('Machine')), ...commonErrors },
    },
    delete: {
      tags: ['Machines'],
      summary: 'Eliminar equipo',
      security: [bearer],
      parameters: [idParam],
      responses: { ...r200(ref('Ok')), 401: r401, 404: r404 },
    },
  },
  '/api/machines/{id}/status': {
    patch: {
      tags: ['Machines'],
      summary: 'Alternar estado activo/inactivo',
      security: [bearer],
      parameters: [idParam],
      responses: { ...r200(ref('Machine')), 401: r401, 404: r404 },
    },
  },
};

// ─── Export ───────────────────────────────────────────────────────────────────

export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title:       'InvenAI API',
    version:     '2.0.0',
    description: 'REST API del Sistema de Inventario Inteligente InvenAI. Autenticación via JWT Bearer token.',
  },
  servers: [
    { url: 'http://localhost:3001', description: 'Local desarrollo' },
  ],
  tags: [
    { name: 'Auth',           description: 'Autenticación y sesión' },
    { name: 'Inventory',      description: 'Gestión de ítems de inventario' },
    { name: 'Categories',     description: 'Categorías de inventario' },
    { name: 'Departments',    description: 'Departamentos de la empresa' },
    { name: 'Sucursales',     description: 'Sucursales / sedes' },
    { name: 'Estantes',       description: 'Estantes y ubicaciones de almacén' },
    { name: 'Users',          description: 'Usuarios del sistema' },
    { name: 'Logs',           description: 'Historial de actividad' },
    { name: 'PurchaseOrders', description: 'Órdenes de compra' },
    { name: 'Reports',        description: 'Reportes y estadísticas' },
    { name: 'Tenants',        description: 'Configuración de la empresa' },
    { name: 'Billing',        description: 'Facturación y suscripciones Stripe' },
    { name: 'Upload',         description: 'Subida de archivos' },
    { name: 'AI',             description: 'Funciones de inteligencia artificial (Gemini)' },
    { name: 'Machines',       description: 'Inventario de equipos informáticos' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type:         'http',
        scheme:       'bearer',
        bearerFormat: 'JWT',
        description:  'Ingresa el token JWT: Bearer <token>',
      },
    },
    schemas,
  },
  security: [bearer],
  paths,
};
