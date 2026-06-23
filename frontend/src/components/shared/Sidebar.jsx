import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard, Package, ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine,
  ShoppingCart, History, Tags, LogOut, ChevronLeft, ChevronRight,
  Box, MapPin, Building2, ChevronDown, AlertOctagon, Sun, Moon, Users, LayoutGrid, BarChart2, Crown, User, Monitor, CreditCard, Truck,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import api from '@/api/client';
import NotificationsBell from './NotificationsBell';

// permission = null means always visible
const MAIN_NAV = [
  { to: '/',                label: 'Dashboard',         icon: LayoutDashboard,  permission: null },
  { to: '/inventory',       label: 'Inventario',        icon: Package,          permission: 'inventory' },
  { to: '/entry',           label: 'Entrada',           icon: ArrowDownToLine,  permission: 'entry' },
  { to: '/checkout',        label: 'Traspaso',          icon: ArrowLeftRight,   permission: 'checkout' },
  { to: '/salida',          label: 'Salida',            icon: ArrowUpFromLine,  permission: 'salida', hideForPhysical: true },
  { to: '/purchase-orders', label: 'Órdenes de Compra', icon: ShoppingCart,     permission: 'purchase_orders' },
  { to: '/logs',            label: 'Historial',         icon: History,          permission: 'logs' },
  { to: '/categories',      label: 'Categorías',        icon: Tags,             permission: 'categories' },
  { to: '/damaged',         label: 'Tablero',           icon: AlertOctagon,     permission: null },
  { to: '/reports',         label: 'Reportes',          icon: BarChart2,        permission: null },
  { to: '/maquinas',        label: 'Máquinas',          icon: Monitor,          permission: null, defaultOnly: true },
  { to: '/suppliers',       label: 'Proveedores',        icon: Truck,            permission: null },
];

const PLAN_LABEL = { starter: 'Starter', pro: 'Pro', enterprise: 'Enterprise' };
const PLAN_COLOR = { starter: 'text-primary', pro: 'text-violet-400', enterprise: 'text-amber-400' };

export default function Sidebar() {
  const { logout, user, tenant } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [openSucs, setOpenSucs] = useState({});

  const isAdmin = user?.role === 'admin';
  // Admins bypass permission checks; regular users see only items they're allowed
  const canSee = (permission) => {
    if (!permission) return true;
    if (isAdmin) return true;
    return Array.isArray(user?.permissions) && user.permissions.includes(permission);
  };

  const canSeeSucursales = isAdmin || (Array.isArray(user?.permissions) && user.permissions.includes('sucursales'));

  const { data: sucursales = [] } = useQuery({
    queryKey: ['sucursales'],
    queryFn: () => api.get('/sucursales').then(r => r.data),
    staleTime: 60_000,
    enabled: !!user,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.get('/departments').then(r => r.data),
    staleTime: 60_000,
    enabled: !!user,
  });

  const toggle = (id) => setOpenSucs(p => ({ ...p, [id]: p[id] === false }));
  const isOpen = (id) => openSucs[id] !== false;

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <aside
      className={cn(
        'flex flex-col h-screen sticky top-0 transition-all duration-300 z-30',
        collapsed ? 'w-16' : 'w-56',
        'bg-[hsl(var(--sidebar-bg))] text-white'
      )}
    >
      {/* Logo */}
      <div className="border-b border-white/10">
        <div className="flex items-center gap-2.5 px-4 py-4">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Box className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <>
              <div className="overflow-hidden flex-1">
                <p className="text-sm font-bold leading-none">InvenAI</p>
                <p className="text-[10px] text-white/50 uppercase tracking-wider">Smart Inventory</p>
              </div>
              <NotificationsBell collapsed={collapsed} />
            </>
          )}
        </div>
        {collapsed && (
          <div className="flex justify-center pb-3">
            <NotificationsBell collapsed={collapsed} />
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {MAIN_NAV
          .filter(item => canSee(item.permission))
          .filter(item => !(item.hideForPhysical && tenant?.inventory_type === 'physical'))
          .filter(item => !(item.defaultOnly && !tenant?.is_default))
          .map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => cn('sidebar-item', isActive ? 'active' : 'text-white/70')}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}

        {/* Admin-only: Usuarios + Facturación */}
        {isAdmin && (
          <>
            <NavLink
              to="/users"
              className={({ isActive }) => cn('sidebar-item', isActive ? 'active' : 'text-white/70')}
            >
              <Users className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="truncate">Usuarios</span>}
            </NavLink>
            <NavLink
              to="/billing"
              className={({ isActive }) => cn('sidebar-item', isActive ? 'active' : 'text-white/70')}
            >
              <CreditCard className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="truncate">Facturación</span>}
            </NavLink>
          </>
        )}

        {/* Organización section */}
        {canSeeSucursales && (
          <div className="border-t border-white/10 mt-2 pt-2">
            {collapsed ? (
              <NavLink
                to="/sucursales"
                className={({ isActive }) => cn('sidebar-item', isActive ? 'active' : 'text-white/70')}
              >
                <MapPin className="w-4 h-4 shrink-0" />
              </NavLink>
            ) : (
              <>
                <p className="text-[10px] text-white/30 uppercase tracking-wider px-2 mb-1.5">Organización</p>

                {sucursales.map(suc => {
                  const depts = departments.filter(d => d.sucursal_id === suc.id);
                  const open = isOpen(suc.id);

                  return (
                    <div key={suc.id}>
                      <button
                        onClick={() => toggle(suc.id)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 text-left"
                      >
                        <MapPin className="w-3.5 h-3.5 text-primary/80 shrink-0" />
                        <span className="flex-1 text-xs text-white/75 font-medium truncate">{suc.name}</span>
                        <ChevronDown
                          className={cn('w-3 h-3 text-white/30 transition-transform shrink-0', open ? '' : '-rotate-90')}
                        />
                      </button>

                      {open && (
                        <div className="mb-0.5">
                          {depts.map(dept => (
                            <NavLink
                              key={dept.id}
                              to={`/departments/${dept.id}`}
                              className={({ isActive }) => cn(
                                'flex items-center gap-2 pl-6 pr-2 py-1 rounded-lg text-xs transition-colors',
                                isActive
                                  ? 'bg-white/10 text-white'
                                  : 'text-white/45 hover:text-white/75 hover:bg-white/5'
                              )}
                            >
                              <Building2 className="w-3 h-3 shrink-0" />
                              <span className="truncate">{dept.name}</span>
                            </NavLink>
                          ))}
                          {depts.length === 0 && (
                            <p className="pl-6 py-1 text-[11px] text-white/20 italic">Sin departamentos</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                <NavLink
                  to="/sucursales"
                  className={({ isActive }) => cn(
                    'flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs mt-1 transition-colors',
                    isActive ? 'bg-white/10 text-white' : 'text-white/35 hover:text-white/60 hover:bg-white/5'
                  )}
                >
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span>Gestionar sucursales</span>
                </NavLink>

                <NavLink
                  to="/estantes"
                  className={({ isActive }) => cn(
                    'flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors',
                    isActive ? 'bg-white/10 text-white' : 'text-white/35 hover:text-white/60 hover:bg-white/5'
                  )}
                >
                  <LayoutGrid className="w-3 h-3 shrink-0" />
                  <span>Gestionar estantes</span>
                </NavLink>
              </>
            )}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="px-2 pb-4 space-y-0.5 border-t border-white/10 pt-3">
        {!collapsed && user && (
          <NavLink
            to="/profile"
            className={({ isActive }) => cn('block px-2 py-2 mb-1 rounded-lg hover:bg-white/5 transition-colors', isActive && 'bg-white/10')}
          >
            {tenant && (
              <div className="flex items-center gap-1.5 mb-1">
                <Crown className={`w-2.5 h-2.5 shrink-0 ${PLAN_COLOR[tenant.plan] || 'text-primary'}`} />
                <span className={`text-[10px] font-semibold uppercase tracking-wide ${PLAN_COLOR[tenant.plan] || 'text-primary'}`}>
                  {PLAN_LABEL[tenant.plan] || tenant.plan}
                </span>
                <span className="text-[10px] text-white/30 truncate">· {tenant.name}</span>
              </div>
            )}
            <p className="text-xs font-medium text-white/80 truncate">{user.full_name}</p>
            <p className="text-[10px] text-white/40 truncate">{user.role === 'admin' ? 'Administrador' : 'Usuario'}</p>
          </NavLink>
        )}
        {collapsed && user && (
          <NavLink
            to="/profile"
            className={({ isActive }) => cn('sidebar-item w-full justify-center', isActive ? 'active' : 'text-white/70')}
            title="Mi Perfil"
          >
            <User className="w-4 h-4 shrink-0" />
          </NavLink>
        )}
        <button
          onClick={toggleTheme}
          className="sidebar-item w-full text-white/70"
          title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
        >
          {theme === 'dark'
            ? <Sun className="w-4 h-4 shrink-0" />
            : <Moon className="w-4 h-4 shrink-0" />}
          {!collapsed && <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}</span>}
        </button>
        <button onClick={handleLogout} className="sidebar-item w-full text-white/70">
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Cerrar Sesión</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-6 w-6 h-6 rounded-full bg-primary border-2 border-background flex items-center justify-center shadow-md"
      >
        {collapsed
          ? <ChevronRight className="w-3 h-3 text-white" />
          : <ChevronLeft className="w-3 h-3 text-white" />}
      </button>
    </aside>
  );
}
