import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Truck, Plus, Search, Pencil, Trash2, Loader2, X, Check,
  Building2, Phone, Mail, MapPin, Hash, RefreshCw, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import api from '@/api/client';
import PageHeader from '@/components/shared/PageHeader';

const EMPTY_FORM = {
  rnc: '', name: '', business_name: '', tipo: '', dgii_status: '',
  phone: '', email: '', address: '', contact_name: '', notes: '',
};

function SupplierModal({ supplier, onClose, onSaved }) {
  const { toast } = useToast();
  const [form, setForm] = useState(supplier ? {
    rnc: supplier.rnc || '', name: supplier.name, business_name: supplier.business_name || '',
    tipo: supplier.tipo || '', dgii_status: supplier.dgii_status || '',
    phone: supplier.phone || '', email: supplier.email || '',
    address: supplier.address || '', contact_name: supplier.contact_name || '',
    notes: supplier.notes || '',
  } : EMPTY_FORM);

  const [saving, setSaving] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState('');

  const update = (field, value) => setForm(p => ({ ...p, [field]: value }));

  const handleDgiiLookup = async () => {
    const rncClean = form.rnc.replace(/\D/g, '');
    if (rncClean.length !== 9 && rncClean.length !== 11) {
      setLookupError('Ingresa un RNC (9 dígitos) o Cédula (11 dígitos)');
      return;
    }
    setLookupError('');
    setLookingUp(true);
    try {
      const { data } = await api.get(`/suppliers/dgii/${rncClean}`);
      setForm(p => ({
        ...p,
        rnc:           data.rnc           || p.rnc,
        name:          data.name          || p.name,
        business_name: data.business_name || p.business_name,
        tipo:          data.tipo          || p.tipo,
        dgii_status:   data.dgii_status   || p.dgii_status,
        address: p.address || [data.provincia, data.municipio].filter(Boolean).join(', '),
        notes: p.notes || (data.actividad ? `Actividad: ${data.actividad}` : ''),
      }));
      toast({ title: 'Datos DGII cargados', description: data.name });
    } catch (err) {
      const msg = err.response?.data?.error || 'No se encontró en la DGII';
      setLookupError(msg);
    } finally {
      setLookingUp(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      let saved;
      if (supplier) {
        saved = (await api.put(`/suppliers/${supplier.id}`, form)).data;
      } else {
        saved = (await api.post('/suppliers', form)).data;
      }
      onSaved(saved);
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.error || 'No se pudo guardar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-base">{supplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* RNC / Cédula + DGII lookup */}
          <div className="space-y-2">
            <Label className="text-xs">RNC o Cédula</Label>
            <div className="flex gap-2">
              <Input
                value={form.rnc}
                onChange={e => { update('rnc', e.target.value); setLookupError(''); }}
                placeholder="130123456 o 00100123456"
                className="rounded-xl flex-1 font-mono"
                maxLength={13}
              />
              <Button
                type="button"
                variant="outline"
                className="rounded-xl shrink-0 gap-1.5"
                onClick={handleDgiiLookup}
                disabled={lookingUp || !form.rnc.trim()}
              >
                {lookingUp
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <RefreshCw className="w-4 h-4" />}
                Consultar DGII
              </Button>
            </div>
            {lookupError && (
              <p className="flex items-center gap-1.5 text-xs text-destructive">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {lookupError}
              </p>
            )}
            {form.dgii_status && (
              <p className="flex items-center gap-1.5 text-xs text-emerald-500">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                Estado DGII: <span className="font-medium">{form.dgii_status}</span>
                {form.tipo && <span className="text-muted-foreground">· {form.tipo}</span>}
              </p>
            )}
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-xs">Nombre / Razón Social *</Label>
            <Input
              value={form.name}
              onChange={e => update('name', e.target.value)}
              placeholder="Empresa ABC SRL"
              className="rounded-xl"
              required
            />
          </div>

          {/* Business name */}
          <div className="space-y-1.5">
            <Label className="text-xs">Nombre Comercial</Label>
            <Input
              value={form.business_name}
              onChange={e => update('business_name', e.target.value)}
              placeholder="Nombre que aparece en facturas"
              className="rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Teléfono</Label>
              <Input value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="809-000-0000" className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Correo</Label>
              <Input type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="info@empresa.com" className="rounded-xl" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Persona de Contacto</Label>
            <Input value={form.contact_name} onChange={e => update('contact_name', e.target.value)} placeholder="Nombre del contacto" className="rounded-xl" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Dirección</Label>
            <Textarea value={form.address} onChange={e => update('address', e.target.value)} placeholder="Dirección física" className="rounded-xl" rows={2} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Notas</Label>
            <Textarea value={form.notes} onChange={e => update('notes', e.target.value)} placeholder="Condiciones de pago, observaciones..." className="rounded-xl" rows={2} />
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="flex-1 rounded-xl" disabled={saving || !form.name.trim()}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
              {supplier ? 'Guardar cambios' : 'Crear Proveedor'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Suppliers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // null | 'new' | supplier object

  // Auto-open the new-supplier modal if directed from another page
  useEffect(() => {
    if (searchParams.get('openModal')) setModal('new');
  }, []);

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => api.get('/suppliers').then(r => r.data),
  });

  const filtered = suppliers.filter(s =>
    !search ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.rnc?.includes(search) ||
    s.business_name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSaved = (savedSupplier) => {
    queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    setModal(null);
    toast({ title: 'Proveedor guardado' });
    // Navigate back to the origin page with the new supplier pre-selected
    const returnTo = searchParams.get('returnTo');
    if (returnTo && savedSupplier?.id) {
      navigate(`${returnTo}?supplier_id=${savedSupplier.id}`);
    }
  };

  const handleDelete = async (supplier) => {
    if (!confirm(`¿Eliminar a "${supplier.name}"?`)) return;
    try {
      await api.delete(`/suppliers/${supplier.id}`);
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast({ title: 'Proveedor eliminado' });
    } catch {
      toast({ title: 'Error al eliminar', variant: 'destructive' });
    }
  };

  return (
    <div>
      <PageHeader
        title="Proveedores"
        subtitle="Gestiona los proveedores de tu empresa con consulta a la DGII"
        icon={Truck}
        actions={
          <Button className="gap-2" onClick={() => setModal('new')}>
            <Plus className="w-4 h-4" /> Nuevo Proveedor
          </Button>
        }
      />

      {/* Search */}
      <div className="relative mb-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre o RNC…"
          className="pl-9 rounded-xl"
        />
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Cargando…
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Truck className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">{search ? 'Sin resultados' : 'No hay proveedores aún'}</p>
          {!search && (
            <Button className="mt-4 gap-2" onClick={() => setModal('new')}>
              <Plus className="w-4 h-4" /> Agregar primer proveedor
            </Button>
          )}
        </div>
      )}

      {/* Grid */}
      {!isLoading && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(s => (
            <div key={s.id} className="glass-card rounded-2xl p-5 flex flex-col gap-3 group">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{s.name}</p>
                  {s.business_name && s.business_name !== s.name && (
                    <p className="text-xs text-muted-foreground truncate">{s.business_name}</p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setModal(s)}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(s)}
                    className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                {s.rnc && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Hash className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-mono">{s.rnc}</span>
                    {s.dgii_status && (
                      <Badge variant="outline" className={cn('text-[10px] py-0', s.dgii_status === 'NORMAL' ? 'border-emerald-500/40 text-emerald-500' : 'border-amber-500/40 text-amber-500')}>
                        {s.dgii_status}
                      </Badge>
                    )}
                  </div>
                )}
                {s.phone && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    <span>{s.phone}</span>
                  </div>
                )}
                {s.email && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{s.email}</span>
                  </div>
                )}
                {s.contact_name && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Building2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{s.contact_name}</span>
                  </div>
                )}
                {s.address && (
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{s.address}</span>
                  </div>
                )}
              </div>

              {s.tipo && (
                <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">{s.tipo}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {(modal === 'new' || (modal && typeof modal === 'object')) && (
        <SupplierModal
          supplier={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
