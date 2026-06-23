import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Crown, Zap, Building2, Loader2, CreditCard, AlertCircle, CheckCircle2, AlertTriangle, XCircle, RotateCcw, CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import PageHeader from '@/components/shared/PageHeader';
import { cn } from '@/lib/utils';
import api from '@/api/client';
import { useAuth } from '@/context/AuthContext';

const PLANS = [
  {
    key: 'starter',
    name: 'Starter',
    price: 3000,
    currency: 'DOP',
    icon: Zap,
    color: 'text-primary',
    borderActive: 'border-primary/60',
    badge: null,
    description: 'Ideal para negocios pequeños que empiezan a gestionar su inventario.',
    features: [
      'Hasta 15,000 ítems en inventario',
      'Hasta 5 usuarios',
      '3 sucursales',
      'Entrada de inventario inteligente',
      'Categorías y departamentos',
      'Historial de actividad',
      'Reportes básicos',
      'Soporte por correo',
    ],
  },
  {
    key: 'pro',
    name: 'Pro',
    price: 5500,
    currency: 'DOP',
    icon: Crown,
    color: 'text-violet-400',
    borderActive: 'border-violet-500/60',
    badge: 'Más popular',
    description: 'Para empresas que necesitan automatización e inteligencia artificial.',
    features: [
      'Todo lo de Starter',
      'Hasta 30,000 ítems en inventario',
      'Hasta 10 usuarios',
      '5 sucursales',
      'IA Inventia (chat inteligente)',
      'Reportes avanzados con IA',
      'Exportación a Excel/PDF',
      'Soporte prioritario',
    ],
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    price: null,
    currency: 'DOP',
    icon: Building2,
    color: 'text-amber-400',
    borderActive: 'border-amber-500/60',
    badge: null,
    description: 'Solución personalizada para grandes organizaciones con necesidades específicas.',
    features: [
      'Todo lo de Pro',
      'SLA garantizado',
      'Onboarding dedicado',
      'Integraciones a medida',
      'SSO / Active Directory',
      'Auditoría avanzada',
      'Soporte 24/7',
      'Contrato personalizado',
    ],
  },
];

const STATUS_LABEL = {
  trialing:   { text: 'En prueba', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  active:     { text: 'Activo',    color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  past_due:   { text: 'Pago vencido', color: 'bg-red-500/15 text-red-400 border-red-500/30' },
  canceled:   { text: 'Cancelado', color: 'bg-muted text-muted-foreground border-border' },
  incomplete: { text: 'Incompleto', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
};

export default function Billing() {
  const { tenant, isBlocked } = useAuth();
  const queryClient = useQueryClient();
  const [loadingPlan,      setLoadingPlan]      = useState(null);
  const [cancelOpen,       setCancelOpen]       = useState(false);
  const [cancelLoading,    setCancelLoading]    = useState(false);
  const [reactivateLoading, setReactivateLoading] = useState(false);
  const [cancelResult,     setCancelResult]     = useState(null); // { active_until, data_deleted_after }

  const { data: info, isLoading, isError } = useQuery({
    queryKey: ['billing-info'],
    queryFn: () => api.get('/billing/info').then(r => r.data),
    enabled: !!tenant,
  });

  const handleCheckout = async (planKey) => {
    if (planKey === 'enterprise') {
      window.location.href = 'mailto:ventas@invenai.app?subject=Plan Enterprise';
      return;
    }
    setLoadingPlan(planKey);
    try {
      const { data } = await api.post('/billing/create-checkout-session', { plan: planKey });
      window.location.href = data.url;
    } catch (err) {
      const msg = err.response?.data?.error || 'No se pudo iniciar el pago. Intenta de nuevo.';
      alert(msg);
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleCancelConfirm = async () => {
    setCancelLoading(true);
    try {
      const { data } = await api.post('/billing/cancel');
      setCancelResult(data);
      setCancelOpen(false);
      queryClient.invalidateQueries({ queryKey: ['billing-info'] });
    } catch (err) {
      alert(err.response?.data?.error || 'No se pudo cancelar la suscripción.');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleReactivate = async () => {
    setReactivateLoading(true);
    try {
      await api.post('/billing/reactivate');
      setCancelResult(null);
      queryClient.invalidateQueries({ queryKey: ['billing-info'] });
    } catch (err) {
      alert(err.response?.data?.error || 'No se pudo reactivar la suscripción.');
    } finally {
      setReactivateLoading(false);
    }
  };

  const currentPlan       = info?.plan ?? tenant?.plan ?? 'starter';
  const billingStatus     = info?.billing_status;
  const isExempt          = info?.billing_exempt;
  const statusMeta        = STATUS_LABEL[billingStatus];
  const isPendingCancel   = info?.cancel_at_period_end ?? false;
  const hasSubscription   = info?.has_payment_method;
  const canCancel         = hasSubscription && !isPendingCancel && !isExempt && ['active', 'trialing'].includes(billingStatus);

  const fmtDate = (d) => d
    ? new Date(d).toLocaleDateString('es-DO', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  const nextDate         = fmtDate(info?.next_billing_date);
  const activeUntilDate  = fmtDate(cancelResult?.active_until  ?? (isPendingCancel ? info?.next_billing_date : null));
  const dataDeleteDate   = fmtDate(cancelResult?.data_deleted_after ?? (isPendingCancel && info?.next_billing_date
    ? new Date(new Date(info.next_billing_date).getTime() + 15 * 24 * 60 * 60 * 1000)
    : null));

  return (
    <div>
      <PageHeader
        title="Planes y Facturación"
        subtitle="Gestiona tu suscripción y elige el plan que mejor se adapta a tu empresa"
        icon={CreditCard}
      />

      {/* Current plan status bar */}
      {!isLoading && info && (
        <div className="mb-4 p-4 rounded-xl border bg-card flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Plan actual</p>
              <p className="text-sm font-semibold capitalize">{currentPlan}</p>
            </div>
          </div>

          {isExempt && (
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
              Cuenta exenta de facturación
            </Badge>
          )}

          {statusMeta && !isExempt && (
            <Badge variant="outline" className={statusMeta.color}>
              {statusMeta.text}
            </Badge>
          )}

          {isPendingCancel && (
            <Badge variant="outline" className="bg-amber-500/15 text-amber-400 border-amber-500/30 gap-1">
              <CalendarClock className="w-3 h-3" /> Cancelación programada
            </Badge>
          )}

          <div className="ml-auto flex items-center gap-3">
            {nextDate && !isExempt && !isPendingCancel && (
              <p className="text-xs text-muted-foreground">
                Próximo cobro: <span className="text-foreground font-medium">{nextDate}</span>
              </p>
            )}
            {canCancel && (
              <button
                onClick={() => setCancelOpen(true)}
                className="text-xs text-muted-foreground hover:text-destructive underline-offset-2 hover:underline transition-colors"
              >
                Cancelar suscripción
              </button>
            )}
            {isPendingCancel && !isExempt && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                onClick={handleReactivate}
                disabled={reactivateLoading}
              >
                {reactivateLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                Reactivar
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Pending cancellation notice */}
      {!isLoading && (isPendingCancel || cancelResult) && (
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-400 mb-1">Suscripción cancelada</p>
              {activeUntilDate && (
                <p className="text-sm text-foreground">
                  Tu cuenta permanecerá <span className="font-semibold">activa hasta el {activeUntilDate}</span>.
                  No se realizará ningún cobro adicional.
                </p>
              )}
            </div>
          </div>
          <div className="flex items-start gap-3 border-t border-amber-500/20 pt-3">
            <XCircle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Tu información estará disponible durante <span className="font-medium text-foreground">15 días</span> después
              del vencimiento{dataDeleteDate ? ` (hasta el ${dataDeleteDate})` : ''}.
              Pasado ese plazo, todos los datos de tu cuenta serán eliminados permanentemente.
            </p>
          </div>
        </div>
      )}

      {isError && (
        <div className="mb-6 flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          No se pudo cargar la información de facturación.
        </div>
      )}

      {/* Cancel confirmation dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-destructive" />
              Cancelar suscripción
            </DialogTitle>
            <DialogDescription className="pt-2 space-y-2 text-left">
              <span className="block">
                Al cancelar, tu plan seguirá activo hasta la próxima fecha de facturación
                {nextDate ? <strong> ({nextDate})</strong> : ''}.
              </span>
              <span className="block mt-2 text-amber-400 text-xs">
                Después de esa fecha tendrás <strong>15 días</strong> para exportar tu información.
                Transcurrido ese plazo, todos los datos serán eliminados permanentemente.
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setCancelOpen(false)} disabled={cancelLoading}>
              Mantener suscripción
            </Button>
            <Button variant="destructive" onClick={handleCancelConfirm} disabled={cancelLoading}>
              {cancelLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Cancelando...</> : 'Sí, cancelar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          const isCurrent = currentPlan === plan.key;
          const isPopular = plan.badge === 'Más popular';
          const isLoading = loadingPlan === plan.key;

          return (
            <div
              key={plan.key}
              className={cn(
                'relative flex flex-col rounded-2xl border-2 bg-card p-6 transition-all duration-200',
                isCurrent
                  ? `${plan.borderActive} shadow-lg`
                  : 'border-border hover:border-muted-foreground/40',
                isPopular && !isCurrent && 'border-violet-500/30'
              )}
            >
              {/* Popular badge */}
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-violet-500 text-white text-xs font-semibold px-3 py-1 rounded-full shadow">
                    {plan.badge}
                  </span>
                </div>
              )}

              {/* Current plan indicator */}
              {isCurrent && (
                <div className="absolute -top-3 right-4">
                  <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full shadow">
                    Tu plan
                  </span>
                </div>
              )}

              {/* Header */}
              <div className="mb-5">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', `bg-card border`)}>
                  <Icon className={cn('w-5 h-5', plan.color)} />
                </div>
                <h3 className="text-lg font-bold">{plan.name}</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{plan.description}</p>
              </div>

              {/* Price */}
              <div className="mb-6">
                {plan.price !== null ? (
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold">
                      {plan.price.toLocaleString('es-DO')}
                    </span>
                    <span className="text-sm text-muted-foreground font-medium">{plan.currency}/mes</span>
                  </div>
                ) : (
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold">A medida</span>
                  </div>
                )}
              </div>

              {/* Features */}
              <ul className="flex-1 space-y-2.5 mb-6">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2 text-sm">
                    <Check className={cn('w-4 h-4 shrink-0 mt-0.5', plan.color)} />
                    <span className="text-muted-foreground">{feat}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {isCurrent && !isBlocked ? (
                <Button variant="outline" disabled className="w-full">
                  Plan actual
                </Button>
              ) : plan.key === 'enterprise' ? (
                <Button
                  variant="outline"
                  className="w-full border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
                  onClick={() => handleCheckout('enterprise')}
                >
                  Contactar ventas
                </Button>
              ) : (
                <Button
                  className={cn('w-full', isPopular && !isCurrent && 'bg-violet-600 hover:bg-violet-700 text-white')}
                  onClick={() => handleCheckout(plan.key)}
                  disabled={!!loadingPlan}
                >
                  {isLoading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Redirigiendo...</>
                  ) : isCurrent ? (
                    'Reactivar plan'
                  ) : (
                    'Contratar ahora'
                  )}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <p className="mt-8 text-center text-xs text-muted-foreground">
        Los pagos se procesan de forma segura con Stripe. Puedes cancelar en cualquier momento.
        Los precios están en pesos dominicanos (DOP) e incluyen ITBIS.
      </p>
    </div>
  );
}
