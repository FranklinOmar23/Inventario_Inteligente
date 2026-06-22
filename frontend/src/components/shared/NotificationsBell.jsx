import React, { useMemo, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Bell, PackageX, CalendarClock, CreditCard, ChevronRight, CheckCheck, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import api from '@/api/client';

const MIN_STOCK_FALLBACK = 10;
const EXPIRY_WARNING_DAYS = 7;
const PAYMENT_WARNING_DAYS = 5;
const STORAGE_KEY = 'invenai_read_notifs';
const READ_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.floor(diff / 86_400_000);
}

function loadReadMap() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const map = JSON.parse(raw);
    const now = Date.now();
    // Prune expired entries
    const pruned = Object.fromEntries(
      Object.entries(map).filter(([, ts]) => now - ts < READ_TTL_MS)
    );
    return pruned;
  } catch {
    return {};
  }
}

function saveReadMap(map) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {}
}

export default function NotificationsBell({ collapsed = false }) {
  const { user, tenant } = useAuth();
  const [open, setOpen] = useState(false);
  const [readMap, setReadMap] = useState(() => loadReadMap());

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

    for (const cat of categories) {
      const catItems = items.filter(i => i.category_id === cat.id);
      if (catItems.length === 0) continue;
      const inStock   = catItems.filter(i => i.status === 'in_stock').length;
      const threshold = cat.minimum_stock || MIN_STOCK_FALLBACK;
      if (inStock < threshold) {
        list.push({
          id:      `stock-${cat.id}`,
          icon:    PackageX,
          color:   'text-amber-500 bg-amber-500/10',
          title:   'Stock bajo',
          message: `${cat.name}: ${inStock} en stock (mínimo ${threshold})`,
          link:    '/purchase-orders',
        });
      }
    }

    const expiring = items
      .filter(i => i.expiration_date)
      .map(i => ({ ...i, daysLeft: daysUntil(i.expiration_date) }))
      .filter(i => i.daysLeft <= EXPIRY_WARNING_DAYS)
      .sort((a, b) => a.daysLeft - b.daysLeft);

    for (const i of expiring.slice(0, 8)) {
      list.push({
        id:      `exp-${i.id}`,
        icon:    CalendarClock,
        color:   i.daysLeft < 0 ? 'text-red-500 bg-red-500/10' : 'text-orange-500 bg-orange-500/10',
        title:   i.daysLeft < 0 ? 'Producto vencido' : 'Caducidad cercana',
        message: i.daysLeft < 0
          ? `${i.name} venció hace ${Math.abs(i.daysLeft)} día(s)`
          : `${i.name} vence en ${i.daysLeft} día(s)`,
        link: `/inventory/${i.id}`,
      });
    }

    if (user?.role === 'admin' && tenant && !tenant.billing_exempt && tenant.billing_status === 'trialing') {
      const daysLeft = daysUntil(tenant.trial_ends_at);
      if (daysLeft != null && daysLeft <= PAYMENT_WARNING_DAYS) {
        list.push({
          id:      'payment',
          icon:    CreditCard,
          color:   daysLeft < 0 ? 'text-red-500 bg-red-500/10' : 'text-rose-500 bg-rose-500/10',
          title:   daysLeft < 0 ? 'Período de prueba vencido' : 'Pago próximo',
          message: daysLeft < 0
            ? 'Tu período de prueba terminó. Configura tu método de pago para no perder acceso.'
            : `Tu período de prueba termina en ${daysLeft} día(s). Configura tu método de pago.`,
          link: '/profile',
        });
      }
    }

    return list;
  }, [items, categories, tenant, user]);

  const isRead = useCallback((id) => !!readMap[id], [readMap]);

  const markRead = useCallback((id) => {
    setReadMap(prev => {
      const next = { ...prev, [id]: Date.now() };
      saveReadMap(next);
      return next;
    });
  }, []);

  const markAllRead = useCallback(() => {
    const now = Date.now();
    setReadMap(prev => {
      const next = { ...prev };
      notifications.forEach(n => { next[n.id] = now; });
      saveReadMap(next);
      return next;
    });
  }, [notifications]);

  const unreadCount = notifications.filter(n => !isRead(n.id)).length;

  // Sort: unread first
  const sorted = [...notifications].sort((a, b) => {
    const aRead = isRead(a.id) ? 1 : 0;
    const bRead = isRead(b.id) ? 1 : 0;
    return aRead - bRead;
  });

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
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-[10px] font-bold text-white flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" /> Notificaciones
                {unreadCount > 0 && (
                  <span className="text-xs font-normal text-muted-foreground">
                    ({unreadCount} sin leer)
                  </span>
                )}
              </DialogTitle>
              {notifications.length > 0 && unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground shrink-0"
                  onClick={markAllRead}
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Marcar todo
                </Button>
              )}
            </div>
          </DialogHeader>

          {notifications.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-10">
              No tienes notificaciones pendientes
            </p>
          ) : (
            <div className="space-y-2 mt-1">
              {sorted.map(n => {
                const Icon  = n.icon;
                const read  = isRead(n.id);
                return (
                  <div
                    key={n.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl border transition-colors group',
                      read
                        ? 'border-border/40 bg-muted/20 opacity-60'
                        : 'border-border hover:bg-muted/40'
                    )}
                  >
                    <Link
                      to={n.link}
                      onClick={() => { markRead(n.id); setOpen(false); }}
                      className="flex items-center gap-3 flex-1 min-w-0"
                    >
                      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', n.color)}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm font-medium leading-tight', read && 'font-normal')}>{n.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{n.message}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </Link>

                    {/* Mark as read button */}
                    <button
                      onClick={() => markRead(n.id)}
                      title={read ? 'Ya leído' : 'Marcar como leído'}
                      className={cn(
                        'shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
                        read
                          ? 'text-primary/60 cursor-default'
                          : 'text-muted-foreground hover:text-primary hover:bg-primary/10'
                      )}
                    >
                      {read
                        ? <CheckCheck className="w-3.5 h-3.5" />
                        : <Check className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
