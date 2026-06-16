import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Bell, PackageX, CalendarClock, CreditCard, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import api from '@/api/client';

const MIN_STOCK_FALLBACK = 10;
const EXPIRY_WARNING_DAYS = 7;
const PAYMENT_WARNING_DAYS = 5;

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.floor(diff / 86_400_000);
}

export default function NotificationsBell({ collapsed = false }) {
  const { user, tenant } = useAuth();
  const [open, setOpen] = useState(false);

  const { data: items = [] } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => api.get('/inventory?limit=500').then(r => r.data),
    enabled: !!user,
    staleTime: 30_000,
  });
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then(r => r.data),
    enabled: !!user,
    staleTime: 30_000,
  });

  const notifications = useMemo(() => {
    const list = [];

    // ── Low stock ──────────────────────────────────────────────────────────
    for (const cat of categories) {
      const catItems = items.filter(i => i.category_id === cat.id);
      if (catItems.length === 0) continue;
      const inStock   = catItems.filter(i => i.status === 'in_stock').length;
      const threshold = cat.minimum_stock || MIN_STOCK_FALLBACK;
      if (inStock < threshold) {
        list.push({
          id:    `stock-${cat.id}`,
          icon:  PackageX,
          color: 'text-amber-500 bg-amber-500/10',
          title: 'Stock bajo',
          message: `${cat.name}: ${inStock} en stock (mínimo ${threshold})`,
          link:  '/purchase-orders',
        });
      }
    }

    // ── Expiration approaching ────────────────────────────────────────────
    const expiring = items
      .filter(i => i.expiration_date)
      .map(i => ({ ...i, daysLeft: daysUntil(i.expiration_date) }))
      .filter(i => i.daysLeft <= EXPIRY_WARNING_DAYS)
      .sort((a, b) => a.daysLeft - b.daysLeft);

    for (const i of expiring.slice(0, 8)) {
      list.push({
        id:    `exp-${i.id}`,
        icon:  CalendarClock,
        color: i.daysLeft < 0 ? 'text-red-500 bg-red-500/10' : 'text-orange-500 bg-orange-500/10',
        title: i.daysLeft < 0 ? 'Producto vencido' : 'Caducidad cercana',
        message: i.daysLeft < 0
          ? `${i.name} venció hace ${Math.abs(i.daysLeft)} día(s)`
          : `${i.name} vence en ${i.daysLeft} día(s)`,
        link: `/inventory/${i.id}`,
      });
    }

    // ── Payment approaching (admin only, never for exempt tenants) ────────
    if (user?.role === 'admin' && tenant && !tenant.billing_exempt && tenant.billing_status === 'trialing') {
      const daysLeft = daysUntil(tenant.trial_ends_at);
      if (daysLeft != null && daysLeft <= PAYMENT_WARNING_DAYS) {
        list.push({
          id:    'payment',
          icon:  CreditCard,
          color: daysLeft < 0 ? 'text-red-500 bg-red-500/10' : 'text-rose-500 bg-rose-500/10',
          title: daysLeft < 0 ? 'Período de prueba vencido' : 'Pago próximo',
          message: daysLeft < 0
            ? 'Tu período de prueba terminó. Configura tu método de pago para no perder acceso.'
            : `Tu período de prueba termina en ${daysLeft} día(s). Configura tu método de pago.`,
          link: '/profile',
        });
      }
    }

    return list;
  }, [items, categories, tenant, user]);

  const count = notifications.length;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'relative flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors',
          collapsed ? 'w-8 h-8' : 'w-8 h-8'
        )}
        title="Notificaciones"
      >
        <Bell className="w-4 h-4" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-[10px] font-bold text-white flex items-center justify-center">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" /> Notificaciones
            </DialogTitle>
          </DialogHeader>

          {notifications.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-10">No tienes notificaciones pendientes</p>
          ) : (
            <div className="space-y-2 mt-1">
              {notifications.map(n => {
                const Icon = n.icon;
                return (
                  <Link
                    key={n.id}
                    to={n.link}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/40 transition-colors"
                  >
                    <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', n.color)}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight">{n.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{n.message}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </Link>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
