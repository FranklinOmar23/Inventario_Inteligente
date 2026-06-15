import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  LayoutGrid, Plus, Pencil, Trash2, Package, MapPin, ChevronRight, X, QrCode, Printer,
} from 'lucide-react';
import Container3DIcon, { CONTAINER_TYPES } from '@/components/shared/Container3DIcon';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import PageHeader from '@/components/shared/PageHeader';
import api from '@/api/client';

const EMPTY = { name: '', description: '', sucursal_id: '', type: 'estante' };

const STATUS_CLS = {
  in_stock:    'bg-emerald-500/10 text-emerald-600',
  checked_out: 'bg-amber-500/10 text-amber-600',
  maintenance: 'bg-blue-500/10 text-blue-600',
  revision:    'bg-orange-500/10 text-orange-600',
  damaged:     'bg-red-500/10 text-red-600',
  retired:     'bg-gray-500/10 text-gray-500',
};
const STATUS_LABEL = {
  in_stock: 'En Stock', checked_out: 'En Uso', maintenance: 'Mantenimiento',
  revision: 'Revisión', damaged: 'Dañado', retired: 'Retirado',
};

function printShelfQR(shelf) {
  const qrValue = `${window.location.origin}/inventory?shelf_id=${shelf.id}`;
  const svgEl = document.getElementById('estante-qr-svg');
  if (!svgEl) return;

  const win = window.open('', '_blank', 'width=420,height=560');
  win.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>QR - ${shelf.name}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; min-height: 100vh;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #fff; padding: 32px;
  }
  .qr-wrap { border: 2px dashed #ddd; border-radius: 16px; padding: 24px; text-align: center; }
  svg { display: block; }
  .name { font-size: 20px; font-weight: 700; margin-top: 16px; color: #111; }
  .sub  { font-size: 12px; color: #888; margin-top: 6px; }
  .url  { font-size: 10px; color: #bbb; margin-top: 10px; word-break: break-all; }
</style></head>
<body onload="window.print();window.close()">
  <div class="qr-wrap">
    ${svgEl.outerHTML}
    <p class="name">${shelf.name}</p>
    ${shelf.sucursal_name ? `<p class="sub">${shelf.sucursal_name}</p>` : ''}
    <p class="url">${qrValue}</p>
  </div>
</body></html>`);
  win.document.close();
}

export default function Estantes() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isAdmin = user?.role === 'admin';

  const [open, setOpen]         = useState(false);
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState(EMPTY);
  const [saving, setSaving]     = useState(false);
  const [selected, setSelected] = useState(null);
  const [qrShelf, setQrShelf]   = useState(null); // shelf whose QR is shown

  const { data: estantes = [], isLoading: loadingEstantes } = useQuery({
    queryKey: ['estantes'],
    queryFn: () => api.get('/estantes').then(r => r.data),
  });

  const { data: sucursales = [] } = useQuery({
    queryKey: ['sucursales'],
    queryFn: () => api.get('/sucursales').then(r => r.data),
  });

  const { data: shelfItems = [], isLoading: loadingItems } = useQuery({
    queryKey: ['inventory', { shelf_id: selected }],
    queryFn: () => api.get('/inventory', { params: { shelf_id: selected, limit: 200 } }).then(r => r.data),
    enabled: !!selected,
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY, sucursal_id: user?.sucursal_id || '' });
    setOpen(true);
  };

  const openEdit = (e) => {
    setEditing(e);
    setForm({ name: e.name, description: e.description || '', sucursal_id: e.sucursal_id || '', type: e.type || 'estante' });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return toast({ title: 'El nombre es requerido', variant: 'destructive' });
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/estantes/${editing.id}`, form);
        toast({ title: 'Estante actualizado', description: form.name });
        setOpen(false);
      } else {
        const { data: created } = await api.post('/estantes', form);
        queryClient.invalidateQueries({ queryKey: ['estantes'] });
        setOpen(false);
        setQrShelf(created); // open QR dialog after creation
        toast({ title: 'Estante creado', description: form.name });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['estantes'] });
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.error || 'Error al guardar', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleDelete = async (e) => {
    if (!confirm(`¿Eliminar estante "${e.name}"? Los equipos en este estante quedarán sin ubicación.`)) return;
    try {
      await api.delete(`/estantes/${e.id}`);
      queryClient.invalidateQueries({ queryKey: ['estantes'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      if (selected === e.id) setSelected(null);
      toast({ title: 'Estante eliminado' });
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.error, variant: 'destructive' });
    }
  };

  const selectedShelf = estantes.find(e => e.id === selected);
  const qrValue = qrShelf
    ? `${window.location.origin}/inventory?shelf_id=${qrShelf.id}`
    : '';

  return (
    <div>
      <PageHeader
        title="Estantes"
        subtitle={`${estantes.length} estante${estantes.length !== 1 ? 's' : ''}`}
        icon={LayoutGrid}
        actions={
          <Button className="rounded-xl" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" /> Nuevo Estante
          </Button>
        }
      />

      <div className="flex gap-6 min-h-0">
        {/* ── Left: shelves grid ───────────────────────────────────── */}
        <div className={`${selected ? 'w-72 shrink-0' : 'flex-1'} space-y-3`}>
          {loadingEstantes && (
            <div className="space-y-3">
              {[0,1,2,3].map(i => <SkeletonCard key={i} />)}
            </div>
          )}

          {!loadingEstantes && estantes.length === 0 && (
            <div className="glass-card rounded-2xl p-12 flex flex-col items-center gap-4 text-muted-foreground">
              <Container3DIcon type="estante" size={88} animated={true} />
              <div className="text-center">
                <p className="font-medium text-sm text-foreground">Aún no hay contenedores</p>
                <p className="text-xs mt-1">Crea el primero para organizar tus equipos</p>
              </div>
            </div>
          )}

          {!loadingEstantes && estantes.map((e, idx) => (
            <div
              key={e.id}
              onClick={() => setSelected(e.id === selected ? null : e.id)}
              className={`glass-card rounded-2xl p-4 cursor-pointer transition-all border-2 animate-card ${
                selected === e.id ? 'border-primary/60' : 'border-transparent hover:border-primary/20'
              }`}
              style={{ '--delay': `${idx * 55}ms` }}
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 flex items-center justify-center shrink-0">
                  <Container3DIcon type={e.type || 'estante'} size={44} animated={true} delay={idx * 0.4} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm truncate">{e.name}</p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground shrink-0">
                      {CONTAINER_TYPES.find(t => t.value === e.type)?.label || 'Estante'}
                    </span>
                  </div>
                  {e.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{e.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    {e.sucursal_name && (
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <MapPin className="w-3 h-3" />{e.sucursal_name}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-[11px] text-primary font-medium">
                      <Package className="w-3 h-3" />
                      {e.item_count} equipo{e.item_count !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(ev) => { ev.stopPropagation(); setQrShelf(e); }}
                    title="Ver código QR"
                    className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                  </button>
                  {isAdmin && (
                    <>
                      <button
                        type="button"
                        onClick={(ev) => { ev.stopPropagation(); openEdit(e); }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(ev) => { ev.stopPropagation(); handleDelete(e); }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                  <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${selected === e.id ? 'rotate-90 text-primary' : ''}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Right: items in selected shelf ──────────────────────── */}
        {selected && (
          <div className="flex-1 min-w-0 animate-slide-left">
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div>
                  <h2 className="font-semibold">{selectedShelf?.name}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {shelfItems.length} equipo{shelfItems.length !== 1 ? 's' : ''} en este estante
                  </p>
                </div>
                <button onClick={() => setSelected(null)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {loadingItems ? (
                <div className="p-8 text-center text-sm text-muted-foreground">Cargando…</div>
              ) : shelfItems.length === 0 ? (
                <div className="p-10 text-center">
                  <Package className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No hay equipos en este estante</p>
                  <p className="text-xs text-muted-foreground mt-1">Asigna equipos desde Registrar Entrada o el detalle del ítem</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {shelfItems.map(item => (
                    <Link key={item.id} to={`/inventory/${item.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/50 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Package className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {[item.brand, item.model].filter(Boolean).join(' · ') || item.category_name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground">{item.quantity} ud.</span>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${STATUS_CLS[item.status] || STATUS_CLS.in_stock}`}>
                          {STATUS_LABEL[item.status] || item.status}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Create / Edit dialog ────────────────────────────────────── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar contenedor' : 'Nuevo contenedor'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {/* Type selector */}
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo de contenedor *</Label>
              <div className="grid grid-cols-4 gap-1.5">
                {CONTAINER_TYPES.map(ct => (
                  <button
                    key={ct.value}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, type: ct.value }))}
                    title={ct.desc}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${
                      form.type === ct.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/30 hover:bg-muted/50'
                    }`}
                  >
                    <Container3DIcon type={ct.value} size={36} animated={false} />
                    <span className="text-[10px] font-medium leading-none text-center">{ct.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Nombre *</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Ej: Rack A, Estante 1, Armario IT" className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Descripción (opcional)</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Ubicación física, notas…" className="rounded-xl resize-none h-20" />
            </div>
            {isAdmin && sucursales.length > 1 && (
              <div className="space-y-1.5">
                <Label className="text-xs">Sucursal</Label>
                <Select value={form.sucursal_id || 'none'} onValueChange={v => setForm(p => ({ ...p, sucursal_id: v === 'none' ? '' : v }))}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Seleccionar sucursal" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin sucursal específica</SelectItem>
                    {sucursales.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button className="w-full rounded-xl" onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear estante'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── QR dialog ───────────────────────────────────────────────── */}
      <Dialog open={!!qrShelf} onOpenChange={v => !v && setQrShelf(null)}>
        <DialogContent className="rounded-2xl max-w-xs text-center">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center gap-2">
              <QrCode className="w-5 h-5 text-primary" />
              Código QR
            </DialogTitle>
          </DialogHeader>

          {qrShelf && (
            <div className="flex flex-col items-center gap-4 py-2">
              {/* QR Code */}
              <div className="bg-white p-4 rounded-2xl border border-border shadow-sm">
                <QRCodeSVG
                  id="estante-qr-svg"
                  value={qrValue}
                  size={180}
                  level="M"
                  includeMargin={false}
                />
              </div>

              {/* Info */}
              <div>
                <p className="font-semibold text-base">{qrShelf.name}</p>
                {qrShelf.sucursal_name && (
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
                    <MapPin className="w-3 h-3" />{qrShelf.sucursal_name}
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground/50 mt-2 break-all">{qrValue}</p>
              </div>

              <p className="text-xs text-muted-foreground">
                Escanea para ver los equipos de este estante
              </p>

              {/* Actions */}
              <div className="flex gap-2 w-full">
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl"
                  onClick={() => setQrShelf(null)}
                >
                  Cerrar
                </Button>
                <Button
                  className="flex-1 rounded-xl"
                  onClick={() => printShelfQR(qrShelf)}
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimir
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
