import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  User, Mail, Shield, Crown, CreditCard, Calendar, Lock, Loader2, Building2, Boxes, Store,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import api from '@/api/client';
import PageHeader from '@/components/shared/PageHeader';

const PLAN_LABEL = { starter: 'Starter', pro: 'Pro', enterprise: 'Enterprise' };
const PLAN_COLOR = { starter: 'text-primary', pro: 'text-violet-500', enterprise: 'text-amber-500' };

const INVENTORY_TYPE_LABEL = {
  physical: 'Inventario Físico',
  valued:   'Inventario Valorizado',
  stock:    'Inventario por Stock',
};

const BUSINESS_TYPE_LABEL = {
  tecnologia: 'Equipos Técnicos',
  alimentos:  'Alimentos y Bebidas',
  insumos:    'Insumos y Papelería',
  general:    'Otro / Mercancía General',
};

const STATUS_LABEL = {
  trialing: 'Periodo de prueba',
  active:   'Activa',
  past_due: 'Pago atrasado',
  canceled: 'Cancelada',
  unpaid:   'Sin pagar',
};
const STATUS_VARIANT = {
  trialing: 'secondary',
  active:   'default',
  past_due: 'destructive',
  canceled: 'destructive',
  unpaid:   'destructive',
};

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-DO', { year: 'numeric', month: 'long', day: 'numeric' });
}

function fmtMoney(amount, currency) {
  if (amount == null) return 'Personalizado';
  return `RD$${Number(amount).toLocaleString('es-DO')}${currency ? '' : ''}/mes`;
}

export default function Profile() {
  const { user, tenant } = useAuth();
  const { toast } = useToast();

  const { data: billing, isLoading: loadingBilling } = useQuery({
    queryKey: ['billing-info'],
    queryFn: () => api.get('/billing/info').then(r => r.data),
    enabled: !!tenant,
  });

  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [savingPw, setSavingPw] = useState(false);

  const setPw = (k, v) => setPwForm(p => ({ ...p, [k]: v }));

  const handleChangePassword = async () => {
    if (!pwForm.current_password || !pwForm.new_password) {
      toast({ title: 'Completa todos los campos', variant: 'destructive' }); return;
    }
    if (pwForm.new_password.length < 6) {
      toast({ title: 'La nueva contraseña debe tener al menos 6 caracteres', variant: 'destructive' }); return;
    }
    if (pwForm.new_password !== pwForm.confirm_password) {
      toast({ title: 'Las contraseñas no coinciden', variant: 'destructive' }); return;
    }
    setSavingPw(true);
    try {
      await api.put('/auth/change-password', {
        current_password: pwForm.current_password,
        new_password:      pwForm.new_password,
      });
      toast({ title: 'Contraseña actualizada' });
      setPwForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.error || 'No se pudo cambiar la contraseña', variant: 'destructive' });
    } finally {
      setSavingPw(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader title="Mi Perfil" subtitle="Tus datos, plan y seguridad de la cuenta" icon={User} />

      <div className="grid gap-6">

        {/* ── Datos del usuario ───────────────────────────────────── */}
        <div className="glass-card rounded-2xl p-6 animate-card" style={{ '--delay': '0ms' }}>
          <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-primary" /> Datos del usuario
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Nombre completo</p>
                <p className="text-sm font-medium">{user.full_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Correo electrónico</p>
                <p className="text-sm font-medium">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Rol</p>
                <p className="text-sm font-medium">{user.role === 'admin' ? 'Administrador' : 'Usuario'}</p>
              </div>
            </div>
            {tenant && (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Empresa</p>
                  <p className="text-sm font-medium">{tenant.name}</p>
                </div>
              </div>
            )}
            {tenant && (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Boxes className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Tipo de inventario</p>
                  <p className="text-sm font-medium">{INVENTORY_TYPE_LABEL[tenant.inventory_type] || tenant.inventory_type}</p>
                </div>
              </div>
            )}
            {tenant && (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Store className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Tipo de negocio</p>
                  <p className="text-sm font-medium">{BUSINESS_TYPE_LABEL[tenant.business_type] || tenant.business_type || '—'}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Plan y facturación ──────────────────────────────────── */}
        {tenant && (
          <div className="glass-card rounded-2xl p-6 animate-card" style={{ '--delay': '80ms' }}>
            <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" /> Plan y facturación
            </h2>

            {loadingBilling ? (
              <div className="flex items-center justify-center py-6 text-muted-foreground text-sm gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Cargando información de facturación...
              </div>
            ) : billing?.billing_exempt ? (
              <div className="flex items-center gap-3 py-2">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <Crown className="w-4 h-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-600">Empresa exenta de facturación</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Esta es la empresa por defecto del sistema — no genera cobros.</p>
                </div>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${PLAN_COLOR[billing?.plan] || 'text-primary'} bg-current/10`}>
                    <Crown className={`w-4 h-4 ${PLAN_COLOR[billing?.plan] || 'text-primary'}`} />
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Plan actual</p>
                    <p className={`text-sm font-semibold ${PLAN_COLOR[billing?.plan] || 'text-primary'}`}>
                      {PLAN_LABEL[billing?.plan] || billing?.plan}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <CreditCard className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Estado de la suscripción</p>
                    <Badge variant={STATUS_VARIANT[billing?.billing_status] || 'secondary'}>
                      {STATUS_LABEL[billing?.billing_status] || billing?.billing_status}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">
                      {billing?.billing_status === 'trialing' ? 'Fin de prueba / primer cobro' : 'Próxima fecha de cobro'}
                    </p>
                    <p className="text-sm font-medium">{fmtDate(billing?.next_billing_date)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <CreditCard className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Monto</p>
                    <p className="text-sm font-medium">{fmtMoney(billing?.amount, billing?.currency)}</p>
                  </div>
                </div>
              </div>
            )}

            {billing && !billing.billing_exempt && !billing.has_payment_method && billing.plan !== 'enterprise' && (
              <p className="text-xs text-muted-foreground mt-4 italic">
                Aún no has registrado un método de pago. Se te pedirá antes de que termine tu periodo de prueba.
              </p>
            )}
          </div>
        )}

        {/* ── Cambiar contraseña ──────────────────────────────────── */}
        <div className="glass-card rounded-2xl p-6 animate-card" style={{ '--delay': '160ms' }}>
          <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" /> Cambiar contraseña
          </h2>
          <div className="grid sm:grid-cols-2 gap-4 max-w-md">
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Contraseña actual</Label>
              <Input type="password" value={pwForm.current_password}
                onChange={e => setPw('current_password', e.target.value)}
                className="h-10 rounded-xl" placeholder="••••••••" />
            </div>
            <div className="space-y-1.5">
              <Label>Nueva contraseña</Label>
              <Input type="password" value={pwForm.new_password}
                onChange={e => setPw('new_password', e.target.value)}
                className="h-10 rounded-xl" placeholder="Mín. 6 caracteres" />
            </div>
            <div className="space-y-1.5">
              <Label>Confirmar nueva contraseña</Label>
              <Input type="password" value={pwForm.confirm_password}
                onChange={e => setPw('confirm_password', e.target.value)}
                className="h-10 rounded-xl" placeholder="Repetir contraseña" />
            </div>
          </div>
          <Button className="mt-5 h-10 rounded-xl gap-2" onClick={handleChangePassword} disabled={savingPw}>
            {savingPw ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            Actualizar contraseña
          </Button>
        </div>

      </div>
    </div>
  );
}
