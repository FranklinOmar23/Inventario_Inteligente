import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { LayoutDashboard, Package, ArrowDownToLine, ArrowUpFromLine, AlertTriangle, TrendingDown, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import api from '@/api/client';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';
import { SkeletonStat, SkeletonLogRow, Skeleton } from '@/components/ui/Skeleton';

export default function Dashboard() {
  const { data: items = [], isLoading: loadingItems } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => api.get('/inventory?limit=200').then((r) => r.data),
  });
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then((r) => r.data),
  });
  const { data: logs = [], isLoading: loadingLogs } = useQuery({
    queryKey: ['logs-recent'],
    queryFn: () => api.get('/logs?limit=10').then((r) => r.data),
  });

  const isLoading = loadingItems;

  const totalItems = items.reduce((s, i) => s + (i.quantity || 1), 0);
  const inStock = items.filter((i) => i.status === 'in_stock').reduce((s, i) => s + (i.quantity || 1), 0);
  const checkedOut = items.filter((i) => i.status === 'checked_out').reduce((s, i) => s + (i.quantity || 1), 0);

  const lowStockAlerts = categories.map((cat) => {
    const catItems = items.filter((i) => i.category_id === cat.id && i.status === 'in_stock');
    const qty = catItems.reduce((s, i) => s + (i.quantity || 1), 0);
    const min = cat.minimum_stock || 5;
    if (qty < min) return { category: cat.name, current: qty, minimum: min, critical: qty === 0 };
    return null;
  }).filter(Boolean);

  const actionMap = {
    entry: { label: 'Entrada', color: 'bg-emerald-500/10 text-emerald-600' },
    checkout: { label: 'Salida', color: 'bg-amber-500/10 text-amber-600' },
    return: { label: 'Devolución', color: 'bg-blue-500/10 text-blue-600' },
    edit: { label: 'Edición', color: 'bg-purple-500/10 text-purple-600' },
    delete: { label: 'Eliminado', color: 'bg-destructive/10 text-destructive' },
  };

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Vista general del inventario" icon={LayoutDashboard} />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {isLoading ? (
          <>
            <SkeletonStat /><SkeletonStat /><SkeletonStat /><SkeletonStat />
          </>
        ) : (
          <>
            <StatCard title="Total Items"  value={totalItems}           icon={Package}        delay={0} />
            <StatCard title="En Stock"     value={inStock}              icon={ArrowDownToLine} delay={60} />
            <StatCard title="En Uso"       value={checkedOut}           icon={ArrowUpFromLine} delay={120} />
            <StatCard title="Alertas"      value={lowStockAlerts.length} icon={AlertTriangle}  delay={180}
              className={lowStockAlerts.length > 0 ? 'border-destructive/30' : ''} />
          </>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Stock Bajo */}
        <div className="glass-card rounded-2xl p-6 animate-card" style={{ '--delay': '200ms' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-destructive" /> Stock Bajo
            </h2>
            <Link to="/purchase-orders">
              <Button variant="ghost" size="sm" className="text-xs">Ver órdenes</Button>
            </Link>
          </div>
          {isLoading ? (
            <div className="space-y-3">
              {[0,1,2].map(i => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
              ))}
            </div>
          ) : lowStockAlerts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Todo el inventario está en niveles normales</p>
          ) : (
            <div className="space-y-3">
              {lowStockAlerts.map((alert, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/50 animate-card"
                  style={{ '--delay': `${i * 50}ms` }}
                >
                  <div>
                    <p className="text-sm font-medium">{alert.category}</p>
                    <p className="text-xs text-muted-foreground">{alert.current} de {alert.minimum} mínimo</p>
                  </div>
                  <Badge variant="outline" className={alert.critical ? 'border-destructive text-destructive' : 'border-amber-500 text-amber-500'}>
                    {alert.critical ? 'Crítico' : 'Bajo'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actividad Reciente */}
        <div className="glass-card rounded-2xl p-6 animate-card" style={{ '--delay': '260ms' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> Actividad Reciente
            </h2>
            <Link to="/logs">
              <Button variant="ghost" size="sm" className="text-xs">Ver todo</Button>
            </Link>
          </div>
          {loadingLogs ? (
            <div className="space-y-3">
              {[0,1,2,3,4].map(i => <SkeletonLogRow key={i} />)}
            </div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Sin actividad registrada</p>
          ) : (
            <div className="space-y-3">
              {logs.slice(0, 6).map((log, i) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 animate-card"
                  style={{ '--delay': `${i * 40}ms` }}
                >
                  <div className={`px-2 py-1 rounded-lg text-[10px] font-semibold uppercase shrink-0 ${actionMap[log.action]?.color || 'bg-muted text-muted-foreground'}`}>
                    {actionMap[log.action]?.label || log.action}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{log.item_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {log.performed_by} · {log.timestamp ? format(new Date(log.timestamp), 'dd/MM/yy HH:mm') : ''}
                    </p>
                  </div>
                  {log.quantity > 1 && <span className="text-xs font-mono text-muted-foreground shrink-0">x{log.quantity}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
