import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Building2, User, Mail, Lock, ChevronRight, ChevronLeft,
  Package, TrendingUp, Check, Loader2, Box,
  Sparkles, Users, Database, MapPin, Crown, Phone, MessageCircle,
  Cpu, UtensilsCrossed, Archive, Store,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import api from '@/api/client';

// ── Inventory type options ────────────────────────────────────────────────────

const INV_TYPES = [
  {
    value: 'physical',
    label: 'Inventario Físico',
    subtitle: 'Activos con identidad única',
    icon: Package,
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary',
    desc: 'Laptops, monitores, equipos con número de serie, activo fijo y service tag. Seguimiento individual por activo.',
    features: ['Número de serie / activo fijo', 'Estado por equipo', 'Historial de traslados', 'Etiquetas QR y códigos de barras'],
  },
  {
    value: 'valued',
    label: 'Inventario Valorizado',
    subtitle: 'Contable con costo',
    icon: TrendingUp,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500',
    desc: 'Control contable con costo unitario y valor total. Ideal para finanzas y reportes económicos.',
    features: ['Costo unitario por producto', 'Valor total del inventario', 'Salidas de almacén con costo', 'Reportes financieros'],
  },
];

// ── Business type options ─────────────────────────────────────────────────────

const BUSINESS_TYPES = [
  {
    value: 'tecnologia',
    label: 'Equipos Técnicos',
    icon: Cpu,
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary',
    desc: 'Laptops, monitores y equipos de IT. El formulario de entrada incluye marca, modelo, activo fijo, service tag y número de serie.',
  },
  {
    value: 'alimentos',
    label: 'Alimentos y Bebidas',
    icon: UtensilsCrossed,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500',
    desc: 'Productos perecederos. El formulario incluye fecha de caducidad, lote y unidad de medida.',
  },
  {
    value: 'insumos',
    label: 'Insumos y Papelería',
    icon: Archive,
    color: 'text-sky-500',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500',
    desc: 'Papel, útiles de oficina y suministros de almacén. El formulario incluye unidad de medida y proveedor.',
  },
  {
    value: 'general',
    label: 'Otro / Mercancía General',
    icon: Store,
    color: 'text-violet-500',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500',
    desc: 'Cualquier otro tipo de mercancía. Usa el formulario estándar de inventario.',
  },
];

// ── Plan options ──────────────────────────────────────────────────────────────

const PLANS = [
  {
    value: 'starter',
    label: 'Starter',
    price: 'RD$3,000',
    period: '/mes',
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary',
    badge: null,
    features: [
      { icon: Database, text: 'Hasta 40,000 registros' },
      { icon: Users,    text: '3 usuarios' },
      { icon: MapPin,   text: '1 sucursal' },
      { icon: Sparkles, text: 'Incluye Inteligencia Artificial (IA)' },
      { icon: Package,  text: 'Reportes completos' },
    ],
  },
  {
    value: 'pro',
    label: 'Pro',
    price: 'RD$5,500',
    period: '/mes',
    color: 'text-violet-500',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500',
    badge: 'Popular',
    features: [
      { icon: Database,       text: 'Hasta 60,000 registros' },
      { icon: Users,          text: '5 usuarios' },
      { icon: MapPin,         text: '3 sucursales' },
      { icon: MessageCircle,  text: 'Chatbot IA para consultoría de inventario' },
      { icon: Phone,          text: 'Soporte prioritario' },
      { icon: Package,        text: 'Exportación PDF/Excel' },
    ],
  },
  {
    value: 'enterprise',
    label: 'Enterprise',
    price: 'Personalizado',
    period: '',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500',
    badge: 'Ilimitado',
    features: [
      { icon: Database, text: 'Registros ilimitados' },
      { icon: Users,    text: 'Usuarios ilimitados' },
      { icon: MapPin,   text: 'Sucursales ilimitadas' },
      { icon: Crown,    text: 'Soporte dedicado 24/7' },
      { icon: Sparkles, text: 'Integraciones personalizadas' },
    ],
  },
];

// ── Step indicator ────────────────────────────────────────────────────────────

function StepDot({ step, current, label }) {
  const done    = current > step;
  const active  = current === step;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={cn(
        'w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300',
        done   ? 'bg-primary text-white scale-95' :
        active ? 'bg-primary text-white shadow-lg shadow-primary/40 scale-110' :
                 'bg-muted text-muted-foreground',
      )}>
        {done ? <Check className="w-4 h-4" /> : step}
      </div>
      <span className={cn('text-[10px] font-medium uppercase tracking-wide',
        active ? 'text-primary' : 'text-muted-foreground'
      )}>{label}</span>
    </div>
  );
}

// ── Main wizard ───────────────────────────────────────────────────────────────

export default function Register() {
  const { setupTenant } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    tenant_name: '',
    rnc:         '',
    full_name:   '',
    email:       '',
    password:    '',
    confirm_password: '',
    inventory_type: '',
    business_type: '',
    plan:        '',
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const validateStep1 = () => {
    if (!form.tenant_name.trim()) return 'Nombre de empresa requerido';
    if (!form.full_name.trim())   return 'Tu nombre es requerido';
    if (!form.email.trim())       return 'El email es requerido';
    if (!form.password)           return 'La contraseña es requerida';
    if (form.password.length < 6) return 'La contraseña debe tener al menos 6 caracteres';
    if (form.password !== form.confirm_password) return 'Las contraseñas no coinciden';
    return null;
  };

  const handleNext = () => {
    if (step === 1) {
      const err = validateStep1();
      if (err) { toast({ title: 'Error', description: err, variant: 'destructive' }); return; }
    }
    if (step === 2 && !form.inventory_type) {
      toast({ title: 'Selecciona un tipo de inventario', variant: 'destructive' }); return;
    }
    if (step === 3 && !form.business_type) {
      toast({ title: 'Selecciona el tipo de negocio', variant: 'destructive' }); return;
    }
    setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    if (!form.plan) {
      toast({ title: 'Selecciona un plan', variant: 'destructive' }); return;
    }
    if (form.plan === 'enterprise') {
      window.location.href = 'mailto:soporte@invenai.app?subject=Plan Enterprise InvenAI';
      return;
    }
    setLoading(true);
    try {
      await setupTenant({
        tenant_name:      form.tenant_name,
        rnc:              form.rnc || undefined,
        inventory_type:   form.inventory_type,
        business_type:    form.business_type,
        plan:             form.plan,
        full_name:        form.full_name,
        email:            form.email,
        password:         form.password,
        confirm_password: form.confirm_password,
      });

      // Empresa creada con 14 días de prueba — ahora se redirige a Stripe
      // para registrar el método de pago que se cobrará al finalizar el trial.
      try {
        const { data } = await api.post('/billing/create-checkout-session');
        window.location.href = data.url;
        return;
      } catch (billingErr) {
        toast({
          title: 'Trial iniciado',
          description: 'Tu empresa está activa con 14 días de prueba. No pudimos abrir el cobro con Stripe ahora, podrás configurarlo luego.',
        });
        navigate('/');
      }
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.error || 'Error al crear la empresa', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Box className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold">InvenAI</span>
          </div>
          <h1 className="text-3xl font-bold mb-1">
            {step === 1 ? 'Crea tu empresa' : step === 2 ? 'Tipo de inventario' : step === 3 ? 'Tipo de negocio' : 'Elige tu plan'}
          </h1>
          <p className="text-muted-foreground text-sm">
            {step === 1 ? 'Configura tu cuenta en menos de 2 minutos' :
             step === 2 ? 'Selecciona el modelo que se adapta a tu negocio' :
             step === 3 ? 'Esto personaliza los campos del formulario de entrada' :
                          'Comienza con 14 días gratis en cualquier plan'}
          </p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <StepDot step={1} current={step} label="Empresa" />
          <div className={cn('flex-1 max-w-16 h-0.5 rounded-full transition-all duration-500', step > 1 ? 'bg-primary' : 'bg-border')} />
          <StepDot step={2} current={step} label="Tipo" />
          <div className={cn('flex-1 max-w-16 h-0.5 rounded-full transition-all duration-500', step > 2 ? 'bg-primary' : 'bg-border')} />
          <StepDot step={3} current={step} label="Negocio" />
          <div className={cn('flex-1 max-w-16 h-0.5 rounded-full transition-all duration-500', step > 3 ? 'bg-primary' : 'bg-border')} />
          <StepDot step={4} current={step} label="Plan" />
        </div>

        {/* ── Step 1: Company + Admin ───────────────────────────────────── */}
        {step === 1 && (
          <div className="glass-card rounded-2xl p-8 animate-fade max-w-lg mx-auto">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Nombre de la empresa *</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input autoFocus value={form.tenant_name}
                    onChange={e => set('tenant_name', e.target.value)}
                    className="pl-10 h-11 rounded-xl" placeholder="ACME Corp" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>RNC (opcional)</Label>
                <Input value={form.rnc} onChange={e => set('rnc', e.target.value)}
                  className="h-11 rounded-xl" placeholder="101-23456-7" />
              </div>
              <div className="space-y-1.5">
                <Label>Tu nombre completo *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={form.full_name} onChange={e => set('full_name', e.target.value)}
                    className="pl-10 h-11 rounded-xl" placeholder="Juan Pérez" />
                </div>
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Correo electrónico *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                    className="pl-10 h-11 rounded-xl" placeholder="tu@empresa.com" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Contraseña *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="password" value={form.password} onChange={e => set('password', e.target.value)}
                    className="pl-10 h-11 rounded-xl" placeholder="Mín. 6 caracteres" minLength={6} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Confirmar contraseña *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="password" value={form.confirm_password} onChange={e => set('confirm_password', e.target.value)}
                    className="pl-10 h-11 rounded-xl" placeholder="Repetir contraseña" />
                </div>
              </div>
            </div>
            <Button className="w-full h-11 rounded-xl mt-6 gap-2" onClick={handleNext}>
              Continuar <ChevronRight className="w-4 h-4" />
            </Button>
            <p className="text-center text-sm text-muted-foreground mt-4">
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="text-primary font-medium hover:underline">Iniciar Sesión</Link>
            </p>
          </div>
        )}

        {/* ── Step 2: Inventory type ────────────────────────────────────── */}
        {step === 2 && (
          <div className="animate-fade">
            <div className="grid md:grid-cols-2 gap-4 mb-6 max-w-2xl mx-auto">
              {INV_TYPES.map(t => {
                const Icon = t.icon;
                const sel  = form.inventory_type === t.value;
                return (
                  <button
                    key={t.value}
                    onClick={() => set('inventory_type', t.value)}
                    className={cn(
                      'glass-card rounded-2xl p-6 text-left transition-all duration-200 border-2',
                      sel ? `${t.border} shadow-lg` : 'border-transparent hover:border-border'
                    )}
                  >
                    <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform', t.bg, sel && 'scale-110')}>
                      <Icon className={cn('w-6 h-6', t.color)} />
                    </div>
                    <h3 className="font-bold text-base mb-0.5">{t.label}</h3>
                    <p className={cn('text-xs font-medium mb-3', t.color)}>{t.subtitle}</p>
                    <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{t.desc}</p>
                    <ul className="space-y-1.5">
                      {t.features.map((f, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Check className={cn('w-3.5 h-3.5 shrink-0', t.color)} />
                          {f}
                        </li>
                      ))}
                    </ul>
                    {sel && (
                      <div className={cn('mt-4 flex items-center gap-1.5 text-xs font-semibold', t.color)}>
                        <Check className="w-3.5 h-3.5" /> Seleccionado
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-3 max-w-sm mx-auto">
              <Button variant="outline" className="flex-1 h-11 rounded-xl gap-2" onClick={() => setStep(1)}>
                <ChevronLeft className="w-4 h-4" /> Atrás
              </Button>
              <Button className="flex-1 h-11 rounded-xl gap-2" onClick={handleNext}>
                Continuar <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Business type ────────────────────────────────────── */}
        {step === 3 && (
          <div className="animate-fade">
            <div className="grid md:grid-cols-2 gap-4 mb-6 max-w-2xl mx-auto">
              {BUSINESS_TYPES.map(t => {
                const Icon = t.icon;
                const sel  = form.business_type === t.value;
                return (
                  <button
                    key={t.value}
                    onClick={() => set('business_type', t.value)}
                    className={cn(
                      'glass-card rounded-2xl p-6 text-left transition-all duration-200 border-2',
                      sel ? `${t.border} shadow-lg` : 'border-transparent hover:border-border'
                    )}
                  >
                    <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform', t.bg, sel && 'scale-110')}>
                      <Icon className={cn('w-6 h-6', t.color)} />
                    </div>
                    <h3 className="font-bold text-base mb-0.5">{t.label}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{t.desc}</p>
                    {sel && (
                      <div className={cn('mt-4 flex items-center gap-1.5 text-xs font-semibold', t.color)}>
                        <Check className="w-3.5 h-3.5" /> Seleccionado
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-3 max-w-sm mx-auto">
              <Button variant="outline" className="flex-1 h-11 rounded-xl gap-2" onClick={() => setStep(2)}>
                <ChevronLeft className="w-4 h-4" /> Atrás
              </Button>
              <Button className="flex-1 h-11 rounded-xl gap-2" onClick={handleNext}>
                Continuar <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 4: Plan ─────────────────────────────────────────────── */}
        {step === 4 && (
          <div className="animate-fade">
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              {PLANS.map(p => {
                const sel = form.plan === p.value;
                return (
                  <button
                    key={p.value}
                    onClick={() => set('plan', p.value)}
                    className={cn(
                      'glass-card rounded-2xl p-6 text-left transition-all duration-200 border-2 relative',
                      sel ? `${p.border} shadow-lg` : 'border-transparent hover:border-border'
                    )}
                  >
                    {p.badge && (
                      <div className={cn('absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide text-white', p.value === 'pro' ? 'bg-violet-500' : 'bg-amber-500')}>
                        {p.badge}
                      </div>
                    )}
                    <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mb-4', p.bg)}>
                      <Crown className={cn('w-6 h-6', p.color)} />
                    </div>
                    <h3 className="font-bold text-lg mb-1">{p.label}</h3>
                    <div className="flex items-baseline gap-0.5 mb-4">
                      <span className={cn('text-2xl font-black', p.color)}>{p.price}</span>
                      {p.period && <span className="text-xs text-muted-foreground">{p.period}</span>}
                    </div>
                    <ul className="space-y-2">
                      {p.features.map((f, i) => {
                        const FIcon = f.icon;
                        return (
                          <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <FIcon className={cn('w-3.5 h-3.5 shrink-0', p.color)} />
                            {f.text}
                          </li>
                        );
                      })}
                    </ul>
                    {p.value === 'enterprise' && (
                      <p className="text-xs text-muted-foreground mt-3 italic">
                        Contacta a nuestro equipo para un plan personalizado.
                      </p>
                    )}
                    {sel && (
                      <div className={cn('mt-4 flex items-center gap-1.5 text-xs font-semibold', p.color)}>
                        <Check className="w-3.5 h-3.5" /> Seleccionado
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="text-center text-xs text-muted-foreground mb-4">
              14 días de prueba gratis · Se te pedirá tu método de pago, sin cobro hasta que termine el trial
            </div>

            <div className="flex gap-3 max-w-sm mx-auto">
              <Button variant="outline" className="flex-1 h-11 rounded-xl gap-2" onClick={() => setStep(3)}>
                <ChevronLeft className="w-4 h-4" /> Atrás
              </Button>
              <Button className="flex-1 h-11 rounded-xl gap-2" onClick={handleSubmit} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {form.plan === 'enterprise' ? 'Contactar Soporte' : 'Crear Empresa'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
