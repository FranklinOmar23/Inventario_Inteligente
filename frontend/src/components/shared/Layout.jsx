import React from 'react';
import { Outlet, Navigate, useLocation, Link } from 'react-router-dom';
import Sidebar from './Sidebar';
import InventiaChat from './InventiaChat';
import { useAuth } from '@/context/AuthContext';
import { Box, LockKeyhole, CreditCard, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

function AppLoader() {
  return (
    <div className="flex items-center justify-center h-screen bg-background overflow-hidden">
      {/* Ambient blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-1/3 left-1/3 w-72 h-72 rounded-full blur-3xl opacity-20 animate-pulse"
          style={{ background: 'hsl(var(--primary))' }}
        />
        <div
          className="absolute bottom-1/3 right-1/3 w-96 h-96 rounded-full blur-3xl opacity-10 animate-pulse"
          style={{ background: 'hsl(var(--primary))', animationDelay: '1s' }}
        />
      </div>

      <div className="relative flex flex-col items-center gap-6">
        {/* Logo + pulse rings */}
        <div className="relative flex items-center justify-center">
          <span
            className="absolute w-20 h-20 rounded-3xl pulse-ring"
            style={{ background: 'hsl(var(--primary) / 0.25)' }}
          />
          <span
            className="absolute w-20 h-20 rounded-3xl pulse-ring"
            style={{ background: 'hsl(var(--primary) / 0.15)', animationDelay: '0.5s' }}
          />
          <div
            className="relative w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl animate-bounce-in"
            style={{ background: 'hsl(var(--primary))' }}
          >
            <Box className="w-8 h-8 text-white" />
          </div>
        </div>

        {/* Brand */}
        <div className="text-center animate-fade" style={{ '--delay': '200ms' }}>
          <p className="text-2xl font-bold tracking-tight">InvenAI</p>
          <p className="text-sm text-muted-foreground mt-0.5">Smart Inventory</p>
        </div>

        {/* Loading dots */}
        <div className="flex items-center gap-2 animate-fade" style={{ '--delay': '400ms' }}>
          <div className="loading-dot w-2 h-2 rounded-full bg-primary" />
          <div className="loading-dot w-2 h-2 rounded-full bg-primary" />
          <div className="loading-dot w-2 h-2 rounded-full bg-primary" />
        </div>
      </div>
    </div>
  );
}

function PaywallScreen({ tenant }) {
  const trialEndDate = tenant?.trial_ends_at
    ? new Date(tenant.trial_ends_at).toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="flex-1 flex items-center justify-center bg-background relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-10 bg-destructive" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full blur-3xl opacity-10 bg-primary" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 max-w-md text-center px-6">
        {/* Icon */}
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
            <LockKeyhole className="w-9 h-9 text-destructive" />
          </div>
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-destructive flex items-center justify-center">
            <AlertTriangle className="w-3.5 h-3.5 text-white" />
          </div>
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Tu cuenta está falta de pago</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {trialEndDate
              ? `Tu período de prueba gratuita venció el ${trialEndDate}.`
              : 'Tu suscripción no está activa.'}
            {' '}Para seguir usando InvenAI elige un plan y activa tu suscripción.
          </p>
        </div>

        {/* CTA */}
        <Button asChild size="lg" className="gap-2 rounded-xl px-8">
          <Link to="/billing">
            <CreditCard className="w-4 h-4" />
            Ver planes y suscribirme
          </Link>
        </Button>

        <p className="text-xs text-muted-foreground">
          Los pagos se procesan de forma segura con Stripe.
        </p>
      </div>
    </div>
  );
}

const BILLING_PATHS = ['/billing', '/billing/success', '/billing/cancelled'];

export default function Layout() {
  const { user, tenant, loading, isBlocked } = useAuth();
  const location = useLocation();

  if (loading) return <AppLoader />;
  if (!user) return <Navigate to="/login" replace />;

  const isBillingRoute = BILLING_PATHS.some(p => location.pathname.startsWith(p));

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      {isBlocked && !isBillingRoute ? (
        <PaywallScreen tenant={tenant} />
      ) : (
        <main
          key={location.pathname}
          className="flex-1 overflow-y-auto p-6 animate-page"
        >
          <Outlet />
        </main>
      )}
      {(!isBlocked || isBillingRoute) && <InventiaChat />}
    </div>
  );
}
