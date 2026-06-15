import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ShoppingCart, AlertTriangle, Mail, Loader2, Send,
  CheckCheck, Package, Minus, Plus, Cpu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import api from '@/api/client';
import PageHeader from '@/components/shared/PageHeader';

const STATUS_OPTIONS = ['pending', 'approved', 'ordered', 'received', 'cancelled'];
const STATUS_LABELS  = { pending: 'Pendiente', approved: 'Aprobado', ordered: 'Ordenado', received: 'Recibido', cancelled: 'Cancelado' };
const STATUS_COLORS  = {
  pending:   'text-amber-600 bg-amber-500/10 border-amber-500/20',
  approved:  'text-blue-600 bg-blue-500/10 border-blue-500/20',
  ordered:   'text-purple-600 bg-purple-500/10 border-purple-500/20',
  received:  'text-emerald-600 bg-emerald-500/10 border-emerald-500/20',
  cancelled: 'text-muted-foreground bg-muted border-border',
};

const MIN_STOCK = 10;

// Placeholder specs by keyword to help the user
function specsPlaceholder(name = '') {
  const n = name.toLowerCase();
  if (n.includes('laptop') || n.includes('pc') || n.includes('escritorio') || n.includes('all-in-one'))
    return 'Procesador: Intel Core i5\nRAM: 16 GB\nAlmacenamiento: 512 GB SSD\nPantalla: 22"';
  if (n.includes('monitor'))
    return 'Tamaño: 22"\nResolución: 1080p\nConector: HDMI/VGA';
  if (n.includes('impresora'))
    return 'Tipo: Matricial / Térmica\nPapel: 80mm\nConector: USB';
  if (n.includes('escán'))
    return 'Tipo: Lector código de barras\nConector: USB';
  return 'Especificaciones técnicas requeridas...';
}

export default function PurchaseOrders() {
  const queryClient = useQueryClient();
  const { toast }   = useToast();
  const { user }    = useAuth();

  // Multi-select state
  const [selected,   setSelected]   = useState(new Set());
  const [quantities, setQuantities] = useState({});   // { catId: number }
  const [multiSpecs, setMultiSpecs] = useState({});   // { catId: string }

  // Multi-select email dialog
  const [multiEmailOpen, setMultiEmailOpen] = useState(false);
  const [multiMotive,    setMultiMotive]    = useState('');
  const [multiSender,    setMultiSender]    = useState('');
  const [multiNotes,     setMultiNotes]     = useState('');
  const [sendingMulti,   setSendingMulti]   = useState(false);

  // Single "Generar y Enviar" dialog
  const [genDialog, setGenDialog]   = useState(null);  // { cat, qty }
  const [genSpecs,  setGenSpecs]    = useState('');
  const [genMotive, setGenMotive]   = useState('');
  const [genSender, setGenSender]   = useState('');
  const [genNotes,  setGenNotes]    = useState('');
  const [genSaving, setGenSaving]   = useState(false);

  const { data: items      = [] } = useQuery({ queryKey: ['inventory'],       queryFn: () => api.get('/inventory?limit=500').then(r => r.data) });
  const { data: categories = [] } = useQuery({ queryKey: ['categories'],      queryFn: () => api.get('/categories').then(r => r.data) });
  const { data: orders     = [] } = useQuery({ queryKey: ['purchase-orders'], queryFn: () => api.get('/purchase-orders').then(r => r.data) });
  const { data: manager    = {} } = useQuery({ queryKey: ['manager-config'],  queryFn: () => api.get('/purchase-orders/manager-config').then(r => r.data), staleTime: Infinity });

  // Low-stock: only categories with actual items in inventory
  const lowStockCats = categories.map(cat => {
    const allCatItems  = items.filter(i => i.category_id === cat.id);
    if (allCatItems.length === 0) return null;
    const inStockCount = allCatItems.filter(i => i.status === 'in_stock').length;
    const threshold    = cat.minimum_stock || MIN_STOCK;
    if (inStockCount >= threshold) return null;
    const suggested = Math.max(1, threshold - inStockCount);
    return { ...cat, current: inStockCount, threshold, suggested };
  }).filter(Boolean);

  const pendingCatIds = new Set(orders.filter(o => o.status === 'pending').map(o => o.category_id));

  // Quantity helpers
  const getQty  = (catId, suggested) => quantities[catId] ?? suggested;
  const setQty  = (catId, val) => setQuantities(prev => ({ ...prev, [catId]: Math.max(1, Number(val) || 1) }));
  const stepQty = (catId, suggested, d) => setQty(catId, getQty(catId, suggested) + d);

  // Selection helpers
  const toggleSelect = id => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAll    = () => setSelected(new Set(lowStockCats.map(c => c.id)));
  const clearAll     = () => setSelected(new Set());

  // Open single-item dialog
  const openGenDialog = (cat) => {
    setGenDialog({ cat, qty: getQty(cat.id, cat.suggested) });
    setGenSpecs('');
    setGenMotive('');
    setGenSender(user?.full_name || user?.email || '');
    setGenNotes('');
  };

  // Single item: generate order + send email
  const handleGenerate = async () => {
    if (!genMotive.trim()) {
      toast({ title: 'Escribe el motivo de la solicitud', variant: 'destructive' }); return;
    }
    setGenSaving(true);
    try {
      // Create order in DB
      try {
        await api.post('/purchase-orders', {
          category_id:        genDialog.cat.id,
          category_name:      genDialog.cat.name,
          quantity_suggested: genDialog.qty,
          notes:              genSpecs || undefined,
        });
        queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      } catch (err) {
        if (err.response?.status !== 409) throw err;
      }

      // Send email
      await api.post('/purchase-orders/send-requisition', {
        to:           manager.email,
        manager_name: manager.name || 'Encargado',
        sender_name:  genSender,
        motive:       genMotive,
        notes:        genNotes || undefined,
        items: [{
          quantity:    genDialog.qty,
          description: genDialog.cat.name,
          specs:       genSpecs || undefined,
        }],
      });

      toast({ title: 'Orden generada y correo enviado', description: `${genDialog.cat.name} → ${manager.email}` });
      setGenDialog(null);
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.error || 'Error al procesar', variant: 'destructive' });
    } finally {
      setGenSaving(false);
    }
  };

  // Multi-select: open dialog
  const openMultiEmail = () => {
    setMultiSender(user?.full_name || user?.email || '');
    setMultiMotive('');
    setMultiNotes('');
    setMultiEmailOpen(true);
  };

  // Multi-select: send email
  const handleMultiSend = async () => {
    if (!multiMotive.trim()) {
      toast({ title: 'Escribe el motivo de la solicitud', variant: 'destructive' }); return;
    }
    const selectedCats = lowStockCats.filter(c => selected.has(c.id));
    const emailItems   = selectedCats.map(c => ({
      quantity:    getQty(c.id, c.suggested),
      description: c.name,
      specs:       multiSpecs[c.id] || undefined,
    }));

    setSendingMulti(true);
    try {
      await api.post('/purchase-orders/send-requisition', {
        to:           manager.email,
        manager_name: manager.name || 'Encargado',
        sender_name:  multiSender,
        motive:       multiMotive,
        notes:        multiNotes || undefined,
        items:        emailItems,
      });
      toast({ title: 'Requisición enviada', description: `Correo enviado a ${manager.email}` });
      setMultiEmailOpen(false);
      setSelected(new Set());
      setMultiSpecs({});
    } catch (err) {
      toast({ title: 'Error al enviar', description: err.response?.data?.error || 'Error de correo', variant: 'destructive' });
    } finally {
      setSendingMulti(false);
    }
  };

  const updateStatus  = async (id, status) => {
    await api.put(`/purchase-orders/${id}`, { status });
    queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
  };

  const activeOrders = orders.filter(o => o.status !== 'cancelled' && o.status !== 'received');
  const selectedCats = lowStockCats.filter(c => selected.has(c.id));
  const allSelected  = lowStockCats.length > 0 && selected.size === lowStockCats.length;

  return (
    <div className="pb-28">
      <PageHeader title="Órdenes de Compra" subtitle="Productos que necesitan reposición" icon={ShoppingCart} />

      {/* ── Low-stock grid ─────────────────────────────────────── */}
      {lowStockCats.length > 0 ? (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              Equipos con Stock Bajo ({lowStockCats.length})
            </h2>
            <Button variant="ghost" size="sm" className="text-xs gap-1.5 rounded-xl h-8 text-muted-foreground"
              onClick={allSelected ? clearAll : selectAll}>
              <CheckCheck className="w-3.5 h-3.5" />
              {allSelected ? 'Deseleccionar todo' : 'Seleccionar todo'}
            </Button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {lowStockCats.map(cat => {
              const isSelected = selected.has(cat.id);
              const qty        = getQty(cat.id, cat.suggested);
              const pct        = Math.round((cat.current / cat.threshold) * 100);
              return (
                <div
                  key={cat.id}
                  onClick={() => toggleSelect(cat.id)}
                  className={`glass-card rounded-2xl p-5 cursor-pointer transition-all select-none
                    ${isSelected ? 'border-primary/60 bg-primary/5 shadow-lg shadow-primary/10' : 'hover:border-border/80'}`}
                >
                  {/* Checkbox + badge */}
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors flex-shrink-0
                      ${isSelected ? 'border-primary bg-primary' : 'border-border bg-transparent'}`}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full
                      ${cat.current === 0 ? 'text-red-600 bg-red-500/10' : 'text-amber-600 bg-amber-500/10'}`}>
                      {cat.current === 0 ? 'Sin stock' : 'Stock bajo'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-1">
                    <Package className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <h3 className="font-semibold text-sm leading-tight">{cat.name}</h3>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2 mb-3">
                    <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                      <span>{cat.current} en stock</span>
                      <span>mín {cat.threshold}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${cat.current === 0 ? 'bg-destructive' : 'bg-amber-500'}`}
                        style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                  </div>

                  {/* Quantity stepper */}
                  <div className="flex items-center justify-between gap-2 mb-3" onClick={e => e.stopPropagation()}>
                    <Label className="text-[11px] text-muted-foreground whitespace-nowrap">Cant. a solicitar</Label>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => stepQty(cat.id, cat.suggested, -1)}
                        className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80">
                        <Minus className="w-3 h-3" />
                      </button>
                      <Input type="number" min={1} value={qty}
                        onChange={e => setQty(cat.id, e.target.value)}
                        className="w-14 h-7 text-center text-sm font-semibold rounded-lg p-0" />
                      <button type="button" onClick={() => stepQty(cat.id, cat.suggested, 1)}
                        className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Single action button */}
                  <div onClick={e => e.stopPropagation()}>
                    {pendingCatIds.has(cat.id) ? (
                      <div className="text-center py-1.5 rounded-xl bg-muted text-xs font-medium text-muted-foreground">
                        Orden ya generada
                      </div>
                    ) : (
                      <Button variant="outline" className="w-full rounded-xl text-xs h-8 gap-1.5"
                        onClick={() => openGenDialog(cat)}>
                        <Mail className="w-3.5 h-3.5" />
                        Generar y Enviar Correo
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        items.length > 0 && (
          <div className="mb-8 p-6 glass-card rounded-2xl text-center">
            <Package className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="font-medium text-sm">Todo el inventario está en niveles normales</p>
            <p className="text-xs text-muted-foreground mt-1">Ninguna categoría está por debajo del stock mínimo</p>
          </div>
        )
      )}

      {/* ── Active orders ──────────────────────────────────────── */}
      {activeOrders.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-4">Órdenes Activas</h2>
          <div className="glass-card rounded-2xl overflow-hidden">
            {activeOrders.map((order, idx) => (
              <div key={order.id} className={`flex items-center justify-between p-4 ${idx < activeOrders.length - 1 ? 'border-b border-border' : ''}`}>
                <div>
                  <p className="font-medium text-sm">{order.category_name}</p>
                  <p className="text-xs text-muted-foreground">
                    En stock: {items.filter(i => i.category_id === order.category_id && i.status === 'in_stock').length} ·
                    Solicitado: <span className="text-primary font-medium">{order.quantity_suggested}</span>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[order.status]}`}>
                    {STATUS_LABELS[order.status]}
                  </span>
                  <Select value={order.status} onValueChange={v => updateStatus(order.id, v)}>
                    <SelectTrigger className="w-36 rounded-xl h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Floating bar (multi-select) ────────────────────────── */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-200 w-full max-w-xl px-4">
          <div className="glass-card rounded-2xl px-5 py-3 flex items-center gap-4 shadow-2xl border border-primary/20 bg-background/95 backdrop-blur-sm">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {selected.size}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-none">
                {selected.size === 1 ? '1 categoría' : `${selected.size} categorías`} · {selectedCats.reduce((s, c) => s + getQty(c.id, c.suggested), 0)} unidades
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                {selectedCats.map(c => `${c.name} ×${getQty(c.id, c.suggested)}`).join(' · ')}
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button variant="outline" size="sm" className="rounded-xl text-xs h-8" onClick={clearAll}>Cancelar</Button>
              <Button size="sm" className="rounded-xl text-xs h-8 gap-1.5" onClick={openMultiEmail}>
                <Mail className="w-3.5 h-3.5" /> Enviar Requisición
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Single "Generar y Enviar" dialog ──────────────────── */}
      <Dialog open={!!genDialog} onOpenChange={v => !v && setGenDialog(null)}>
        <DialogContent className="rounded-2xl max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-primary" />
              Solicitud de Requerimiento
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Se generará la orden y se enviará el correo a <span className="font-medium text-foreground">{manager.name}</span>
            </p>
          </DialogHeader>

          {genDialog && (
            <div className="space-y-4 mt-1">
              {/* Item info */}
              <div className="flex items-center justify-between bg-muted/40 rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-sm">{genDialog.cat.name}</span>
                </div>
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  <button type="button" onClick={() => setGenDialog(d => ({ ...d, qty: Math.max(1, d.qty - 1) }))}
                    className="w-7 h-7 rounded-lg bg-background border flex items-center justify-center hover:bg-muted">
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-10 text-center font-bold text-sm">{genDialog.qty}</span>
                  <button type="button" onClick={() => setGenDialog(d => ({ ...d, qty: d.qty + 1 }))}
                    className="w-7 h-7 rounded-lg bg-background border flex items-center justify-center hover:bg-muted">
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Technical specs */}
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5" /> Especificaciones técnicas
                </Label>
                <Textarea
                  value={genSpecs}
                  onChange={e => setGenSpecs(e.target.value)}
                  placeholder={specsPlaceholder(genDialog.cat.name)}
                  className="rounded-xl font-mono text-xs"
                  rows={4}
                />
                <p className="text-[11px] text-muted-foreground">Una especificación por línea. Ej: RAM: 16GB</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Motivo / Ocasión *</Label>
                <Input placeholder="Ej: Operativo Semana Santa 2026" value={genMotive}
                  onChange={e => setGenMotive(e.target.value)} className="rounded-xl" autoFocus />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Enviado por</Label>
                <Input placeholder="Tu nombre" value={genSender}
                  onChange={e => setGenSender(e.target.value)} className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Observaciones (opcional)</Label>
                <Textarea value={genNotes} onChange={e => setGenNotes(e.target.value)}
                  placeholder="Detalles adicionales..." className="rounded-xl" rows={2} />
              </div>

              <Button onClick={handleGenerate} disabled={genSaving} className="w-full rounded-xl gap-2">
                {genSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {genSaving ? 'Enviando...' : `Generar y Enviar a ${manager.email || 'encargado'}`}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Multi-select email dialog ──────────────────────────── */}
      <Dialog open={multiEmailOpen} onOpenChange={setMultiEmailOpen}>
        <DialogContent className="rounded-2xl max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" /> Enviar Requisición Formal
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Destinatario: <span className="font-medium text-foreground">{manager.name}</span>
              <span className="text-muted-foreground font-mono ml-1">{manager.email}</span>
            </p>
          </DialogHeader>

          <div className="space-y-4 mt-1">
            {/* Per-item specs */}
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Equipos y especificaciones
              </p>
              {selectedCats.map(c => (
                <div key={c.id} className="bg-muted/30 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="w-3.5 h-3.5 text-primary" />
                      <span className="font-semibold text-sm">{c.name}</span>
                    </div>
                    <span className="text-primary font-bold text-sm">×{getQty(c.id, c.suggested)}</span>
                  </div>
                  <Textarea
                    value={multiSpecs[c.id] || ''}
                    onChange={e => setMultiSpecs(prev => ({ ...prev, [c.id]: e.target.value }))}
                    placeholder={specsPlaceholder(c.name)}
                    className="rounded-xl font-mono text-xs bg-background"
                    rows={3}
                  />
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Motivo / Ocasión *</Label>
              <Input placeholder="Ej: Operativo Semana Santa 2026" value={multiMotive}
                onChange={e => setMultiMotive(e.target.value)} className="rounded-xl" autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Enviado por</Label>
              <Input placeholder="Tu nombre" value={multiSender}
                onChange={e => setMultiSender(e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Observaciones (opcional)</Label>
              <Textarea value={multiNotes} onChange={e => setMultiNotes(e.target.value)}
                placeholder="Detalles adicionales..." className="rounded-xl" rows={2} />
            </div>

            <Button onClick={handleMultiSend} disabled={sendingMulti} className="w-full rounded-xl gap-2">
              {sendingMulti ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {sendingMulti ? 'Enviando...' : `Enviar a ${manager.email || 'encargado'}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
