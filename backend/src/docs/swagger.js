import swaggerJsdoc from 'swagger-jsdoc';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title:       'InvenAI API',
      version:     '2.0.0',
      description: 'REST API del Sistema de Inventario Inteligente InvenAI. Autenticación via JWT Bearer token.',
    },
    servers: [
      { url: 'http://localhost:3001', description: 'Local desarrollo' },
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
      schemas: {
        Error: {
          type: 'object',
          properties: { error: { type: 'string', example: 'Mensaje de error' } },
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
            created_at:  { type: 'string', format: 'date-time' },
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
            status:          { type: 'string', enum: ['in_stock','checked_out','maintenance','retired','revision','damaged'] },
            quantity:        { type: 'integer' },
            unit_cost:       { type: 'number', nullable: true },
            asset_tag:       { type: 'string' },
            serial_number:   { type: 'string' },
            model:           { type: 'string' },
            brand:           { type: 'string' },
            entry_date:      { type: 'string', format: 'date', nullable: true },
            expiration_date: { type: 'string', format: 'date', nullable: true },
            batch_number:    { type: 'string', nullable: true },
            unit_measure:    { type: 'string', nullable: true },
            has_unique_id:   { type: 'boolean' },
            created_at:      { type: 'string', format: 'date-time' },
            updated_at:      { type: 'string', format: 'date-time' },
          },
        },
        ActivityLog: {
          type: 'object',
          properties: {
            id:             { type: 'string', format: 'uuid' },
            action:         { type: 'string' },
            item_id:        { type: 'string', format: 'uuid', nullable: true },
            item_name:      { type: 'string' },
            quantity:       { type: 'integer' },
            performed_by:   { type: 'string' },
            reason:         { type: 'string', nullable: true },
            destination:    { type: 'string', nullable: true },
            timestamp:      { type: 'string', format: 'date-time' },
          },
        },
        PurchaseOrder: {
          type: 'object',
          properties: {
            id:                 { type: 'string', format: 'uuid' },
            category_id:        { type: 'string', format: 'uuid', nullable: true },
            category_name:      { type: 'string' },
            quantity_suggested: { type: 'integer' },
            status:             { type: 'string', enum: ['pending','approved','rejected','completed','ordered','received','cancelled'] },
            notes:              { type: 'string', nullable: true },
            created_at:         { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: [
    path.join(__dirname, '../routes/*.routes.js'),
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
