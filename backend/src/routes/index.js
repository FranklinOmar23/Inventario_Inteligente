import { Router } from 'express';
import { getPool } from '../db/pool.js';

// Repositories
import { UserRepository }          from '../repositories/UserRepository.js';
import { TenantRepository }        from '../repositories/TenantRepository.js';
import { SucursalRepository }      from '../repositories/SucursalRepository.js';
import { DepartmentRepository }    from '../repositories/DepartmentRepository.js';
import { CategoryRepository }      from '../repositories/CategoryRepository.js';
import { InventoryRepository }     from '../repositories/InventoryRepository.js';
import { ActivityLogRepository }   from '../repositories/ActivityLogRepository.js';
import { PurchaseOrderRepository } from '../repositories/PurchaseOrderRepository.js';
import { EstanteRepository }       from '../repositories/EstanteRepository.js';
import { MachineRepository }       from '../repositories/MachineRepository.js';

// Services
import { AuthService }          from '../services/AuthService.js';
import { InventoryService }     from '../services/InventoryService.js';
import { CategoryService }      from '../services/CategoryService.js';
import { SucursalService }      from '../services/SucursalService.js';
import { DepartmentService }    from '../services/DepartmentService.js';
import { UserService }          from '../services/UserService.js';
import { ActivityLogService }   from '../services/ActivityLogService.js';
import { TenantService }        from '../services/TenantService.js';
import { PurchaseOrderService } from '../services/PurchaseOrderService.js';
import { ReportService }        from '../services/ReportService.js';
import { EstanteService }       from '../services/EstanteService.js';
import { AiService }            from '../services/AiService.js';

// Controllers
import { authController }          from '../controllers/auth.controller.js';
import { inventoryController }     from '../controllers/inventory.controller.js';
import { categoryController }      from '../controllers/category.controller.js';
import { sucursalController }      from '../controllers/sucursal.controller.js';
import { departmentController }    from '../controllers/department.controller.js';
import { userController }          from '../controllers/user.controller.js';
import { activityLogController }   from '../controllers/activityLog.controller.js';
import { tenantController }        from '../controllers/tenant.controller.js';
import { purchaseOrderController } from '../controllers/purchaseOrder.controller.js';
import { reportController }        from '../controllers/report.controller.js';
import { estanteController }       from '../controllers/estante.controller.js';
import { aiController }            from '../controllers/ai.controller.js';
import { billingController }       from '../controllers/billing.controller.js';
import { machineController }       from '../controllers/machine.controller.js';

// Route factories
import { authRouter }          from './auth.routes.js';
import { inventoryRouter }     from './inventory.routes.js';
import { categoryRouter }      from './category.routes.js';
import { sucursalRouter }      from './sucursal.routes.js';
import { departmentRouter }    from './department.routes.js';
import { userRouter }          from './user.routes.js';
import { activityLogRouter }   from './activityLog.routes.js';
import { tenantRouter }        from './tenant.routes.js';
import { purchaseOrderRouter } from './purchaseOrder.routes.js';
import { reportRouter }        from './report.routes.js';
import { estanteRouter }       from './estante.routes.js';
import { aiRouter }            from './ai.routes.js';
import { uploadRouter }        from './upload.routes.js';
import { billingRouter }       from './billing.routes.js';
import { machineRouter }       from './machine.routes.js';

export function createRouter() {
  const pool = getPool();
  const router = Router();

  // ── Repositories ──────────────────────────────────────────────────────────────
  const userRepo          = new UserRepository(pool);
  const tenantRepo        = new TenantRepository(pool);
  const sucursalRepo      = new SucursalRepository(pool);
  const departmentRepo    = new DepartmentRepository(pool);
  const categoryRepo      = new CategoryRepository(pool);
  const inventoryRepo     = new InventoryRepository(pool);
  const logRepo           = new ActivityLogRepository(pool);
  const purchaseOrderRepo = new PurchaseOrderRepository(pool);
  const estanteRepo       = new EstanteRepository(pool);
  const machineRepo       = new MachineRepository(pool);

  // ── Services ──────────────────────────────────────────────────────────────────
  const authSvc          = new AuthService(userRepo, tenantRepo, sucursalRepo, departmentRepo);
  const inventorySvc     = new InventoryService(inventoryRepo, logRepo, tenantRepo);
  const categorySvc      = new CategoryService(categoryRepo);
  const sucursalSvc      = new SucursalService(sucursalRepo, departmentRepo, tenantRepo);
  const departmentSvc    = new DepartmentService(departmentRepo);
  const userSvc          = new UserService(userRepo, tenantRepo);
  const logSvc           = new ActivityLogService(logRepo);
  const tenantSvc        = new TenantService(tenantRepo);
  const purchaseOrderSvc = new PurchaseOrderService(purchaseOrderRepo, tenantRepo);
  const reportSvc        = new ReportService(pool);
  const estanteSvc       = new EstanteService(estanteRepo, sucursalRepo);
  const aiSvc            = new AiService();

  // ── Mount routes ──────────────────────────────────────────────────────────────
  router.use('/auth',           authRouter(authController(authSvc)));
  router.use('/inventory',      inventoryRouter(inventoryController(inventorySvc)));
  router.use('/categories',     categoryRouter(categoryController(categorySvc)));
  router.use('/sucursales',     sucursalRouter(sucursalController(sucursalSvc)));
  router.use('/departments',    departmentRouter(departmentController(departmentSvc)));
  router.use('/users',          userRouter(userController(userSvc)));
  router.use('/logs',           activityLogRouter(activityLogController(logSvc)));
  router.use('/tenants',        tenantRouter(tenantController(tenantSvc)));
  router.use('/purchase-orders', purchaseOrderRouter(purchaseOrderController(purchaseOrderSvc)));
  router.use('/reports',        reportRouter(reportController(reportSvc)));
  router.use('/estantes',       estanteRouter(estanteController(estanteSvc)));
  router.use('/ai',             aiRouter(aiController(aiSvc, { inventoryRepo, tenantRepo })));
  router.use('/upload',         uploadRouter());
  router.use('/billing',        billingRouter(billingController(tenantRepo)));
  router.use('/machines',       machineRouter(machineController(machineRepo)));

  router.get('/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

  return router;
}
