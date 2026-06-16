import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpFromLine, Search, Loader2, Check, Package, MapPin, Zap, DollarSign, History,
} from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import api from '@/api/client';
import PageHeader from '@/components/shared/PageHeader';
import QuickScan from '@/components/checkout/QuickScan';
import ConducePrintModal from '@/components/shared/ConducePrintModal';

const STATUS_LABELS = {
  in_stock:    { label: 'En Stock',      cls: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  checked_out: { label: 'En Uso',        cls: 'bg-amber-500/10  text-amber-600  border-amber-500/20' },
  maintenance: { label: 'Mantenimiento', cls: 'bg-blue-500/10   text-blue-600   border-blue-500/20' },
};

const REASON_OPTIONS = [
  { value: 'venta',       label: 'Venta' },
  { value: 'consumo',     label: 'Consumo interno' },
  { value: 'donacion',    label: 'Donación' },
  { value: 'perdida',     label: 'Pérdida / Robo' },
  { value: 'desecho',     label: 'Desecho / Vencimiento' },
  { value: 'otro',        label: 'Otro' },
];

export default function Salida() {
  const { user, tenant } = useAuth();
  const { toast }        = useToast();
  const navigate          = useNavigate();
  const queryClient       = useQueryClient();
  const isValued = tenant?.inventory_type === 'valued';

  const [searchQuery, setSearchQuery] = useState('');
  const [foundItem, setFoundItem]     = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching]     = useState(false);
  const [saving, setSaving]           = useState(false);
  const [quickScanOpen, setQuickScanOpen] = useState(false);
  const [exitQty, setExitQty]         = useState(1);
  const [reason, setReason]           = useState('');
  const [destination, setDestination] = useState('');
  const [notes, setNotes]             = useState('');
  const [conduceData, setConduceData] = useState(null);

  const { data: items = [] } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => api.get('/inventory?limit=500').then(r => r.data),
  });

  const { data: exitLogs = [], isLoading: loadingExits } = useQuery({
    queryKey: ['logs-exit'],
    queryFn: () => api.get('/logs?action=exit&limit=50').then(r => r.data),
    staleTime: 15_000,
  });

  const selectItem = (item) => {
    setFoundItem(item);
    setSearchResults([]);
    setExitQty(1);
  };

  const searchItem = (query) => {
    let q = query.trim();
    if (!q) return;

    const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const urlMatch = q.match(uuidPattern);
    if (urlMatch) {
      q = urlMatch[0];
    }

    const ql = q.toLowerCase();
    const exact = items.find(i =>
      i.id.toLowerCase() === ql ||
      [i.asset_tag, i.service_tag, i.serial_number].some(v => v?.toLowerCase() === ql)
    );
    if (exact) {
      selectItem(exact);
      setSearchQuery(query);
      return;
    }

    // No exact code match — fall back to a fuzzy search by name/brand/model
    const nameMatches = items.filter(i =>
      [i.name, i.brand, i.model].some(v => v?.toLowerCase().includes(ql))
    );
    if (nameMatches.length === 1) {
      selectItem(nameMatches[0]);
      setSearchQuery(query);
    } else if (nameMatches.length > 1) {
      setFoundItem(null);
      setSearchResults(nameMatches.slice(0, 20));
    } else {
      setFoundItem(null);
      setSearchResults([]);
      toast({ title: 'No encontrado', description: `Sin coincidencia para: ${q}`, variant: 'destructive' });
    }
  };

  const handleSearch = () => searchItem(searchQuery);

  const handleQuickScan = (code) => {
    setSearchQuery(code);
    searchItem(code);
    setQuickScanOpen(false);
  };

  const qtyNum = Number(exitQty) || 1;
  const totalValue = foundItem?.unit_cost != null ? Number(foundItem.unit_cost) * qtyNum : null;

  const handleExit = async () => {
    if (!foundItem) return;
    if (!reason) {
      toast({ title: 'Motivo de salida requerido', variant: 'destructive' }); return;
    }

    setSaving(true);
    try {
      const reasonLabel = REASON_OPTIONS.find(r => r.value === reason)?.label || reason;
      const performedBy = user?.full_name || user?.email || 'Sistema';
      const res = await api.post(`/inventory/${foundItem.id}/exit`, {
        quantity:        qtyNum,
        reason:          reasonLabel,
        destination:     destination || undefined,
        performed_by:    performedBy,
        performed_by_id: user?.id,
        notes: notes || undefined,
      });

      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['logs'] });
      queryClient.invalidateQueries({ queryKey: ['logs-exit'] });
      toast({
        title: 'Salida registrada',
        description: `${foundItem.name} · ${qtyNum} ud(s)${res.data?.total_value != null ? ` · RD$${Number(res.data.total_value).toLocaleString('es-DO', { minimumFractionDigits: 2 })}` : ''}`,
      });

      const shortRef = (res.data?.log_id || '').replace(/-/g, '').slice(0, 8).toUpperCase();
      setConduceData({
        conduce_number:  `CS-${shortRef || Date.now().toString(36).toUpperCase()}`,
        timestamp:       res.data?.timestamp || new Date().toISOString(),
        reason:          reasonLabel,
        destination,
        notes,
        performed_by:    performedBy,
        department_name: foundItem.department_name,
        sucursal_name:   foundItem.sucursal_name,
        is_valued:       isValued,
        items: [{
          name: foundItem.name,
          code: foundItem.asset_tag || foundItem.service_tag || foundItem.serial_number || '',
          quantity: qtyNum,
          unit_cost: res.data?.unit_cost,
          total_value: res.data?.total_value,
        }],
      });
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.error || 'Error al registrar la salida', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const statusInfo = foundItem ? (STATUS_LABELS[foundItem.status] || STATUS_LABELS.in_stock) : null;

  if (tenant?.inventory_type === 'physical') {
    return (
      <div>
        <PageHeader title="Salida de Mercancía" icon={ArrowUpFromLine} />
        <div className="max-w-lg glass-card rounded-2xl p-8 text-center space-y-3">
          <Package className="w-8 h-8 text-muted-foreground mx-auto" />
          <p className="font-medium text-sm">No disponible para Inventario Físico</p>
          <p className="text-xs text-muted-foreground">
            En este tipo de inventario los equipos no se "venden" ni se "consumen" — se mueven entre departamentos o sucursales.
            Usa <strong>Traspaso</strong> para eso, o el <strong>Tablero</strong> para retirar/dar de baja un equipo.
          </p>
          <Button variant="outline" className="rounded-xl mt-2" onClick={() => navigate('/checkout')}>
            Ir a Traspaso
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Salida de Mercancía"
        subtitle="Registrar venta, consumo, pérdida o desecho de un equipo"
        icon={ArrowUpFromLine}
      />

      <div className="max-w-2xl space-y-5">

        {/* Search */}
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" /> Buscar Equipo
            </h2>
            <Button size="sm" variant={quickScanOpen ? 'default' : 'outline'}
              className="rounded-xl gap-1.5 text-xs h-8"
              onClick={() => setQuickScanOpen(v => !v)}>
              <Zap className="w-3.5 h-3.5" /> Escaneo Rápido
            </Button>
          </div>

          {quickScanOpen && (
            <QuickScan onScan={handleQuickScan} scanning={searching} onClose={() => setQuickScanOpen(false)} />
          )}

          <p className="text-xs text-muted-foreground">
            Busca por nombre del producto, marca/modelo, Activo Fijo, Service Tag o Número de Serie.
          </p>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Nombre del producto, marca, código..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="pl-10 rounded-xl"
              />
            </div>
            <Button onClick={handleSearch} disabled={searching} className="rounded-xl">
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buscar'}
            </Button>
          </div>

          {/* Multiple name matches — let the user pick one */}
          {searchResults.length > 0 && (
            <div className="rounded-xl border border-border divide-y divide-border max-h-72 overflow-y-auto">
              {searchResults.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectItem(item)}
                  className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-muted/40 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {[item.brand, item.model, item.category_name].filter(Boolean).join(' · ') || 'Sin detalles'}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{item.quantity} disp.</span>
                </button>
              ))}
            </div>
          )}

          {/* Found item card */}
          {foundItem && (
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-sm">{foundItem.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {[foundItem.brand, foundItem.model].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${statusInfo.cls}`}>
                  {statusInfo.label}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>
                    Ubicación:&nbsp;
                    <span className="font-medium text-foreground">
                      {foundItem.department_name || 'Sin departamento'}
                      {foundItem.sucursal_name ? ` — ${foundItem.sucursal_name}` : ''}
                    </span>
                  </span>
                </div>
                <span className="font-semibold text-foreground shrink-0">
                  {foundItem.quantity} disponibles
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {foundItem.asset_tag    && <p><span className="text-muted-foreground">Activo fijo: </span>{foundItem.asset_tag}</p>}
                {foundItem.service_tag  && <p><span className="text-muted-foreground">Service Tag: </span>{foundItem.service_tag}</p>}
                {foundItem.serial_number && <p><span className="text-muted-foreground">Serial: </span>{foundItem.serial_number}</p>}
                {foundItem.category_name && <p><span className="text-muted-foreground">Categoría: </span>{foundItem.category_name}</p>}
                {isValued && foundItem.unit_cost != null && (
                  <p><span className="text-muted-foreground">Costo unitario: </span>RD${Number(foundItem.unit_cost).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Exit details */}
        {foundItem && (
          <div className="glass-card rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <ArrowUpFromLine className="w-4 h-4 text-primary" /> Detalle de la Salida
            </h2>

            {/* Quantity */}
            <div className="space-y-1.5">
              <Label className="text-xs">Cantidad de salida</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={1}
                  max={foundItem.quantity}
                  value={exitQty}
                  onChange={e => setExitQty(e.target.value)}
                  className="rounded-xl w-28 text-center font-semibold"
                />
                <span className="text-xs text-muted-foreground">de {foundItem.quantity} disponibles</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Motivo de salida *</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Seleccionar motivo" />
                </SelectTrigger>
                <SelectContent>
                  {REASON_OPTIONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Destino / Cliente (opcional)</Label>
              <Input
                value={destination}
                onChange={e => setDestination(e.target.value)}
                placeholder="Ej: Cliente XYZ, vertedero, etc."
                className="rounded-xl"
              />
            </div>

            {isValued && totalValue != null && (
              <div className="flex items-center justify-between text-xs bg-muted/40 rounded-xl px-4 py-3">
                <span className="text-muted-foreground flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" /> Valor total de la salida</span>
                <span className="font-bold text-primary text-sm">
                  RD${totalValue.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Observaciones (opcional)</Label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Detalles adicionales sobre la salida..."
                className="rounded-xl"
                rows={2}
              />
            </div>

            <Button
              onClick={handleExit}
              disabled={saving || !reason}
              className="w-full rounded-xl"
            >
              {saving
                ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                : <Check className="w-4 h-4 mr-2" />}
              Confirmar Salida
            </Button>
          </div>
        )}
      </div>

      {/* ── Historial de Salidas ───────────────────────────────────────── */}
      <div className="max-w-4xl mt-6">
        <div className="glass-card rounded-2xl p-5">
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-4">
            <History className="w-4 h-4 text-primary" /> Historial de Salidas
          </h2>

          {loadingExits ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Cargando...</div>
          ) : exitLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">Aún no se han registrado salidas</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {['Fecha', 'Producto', 'Cant.', 'Motivo', 'Destino', 'Realizado por', ...(isValued ? ['Valor'] : [])].map(h => (
                      <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {exitLogs.map(log => (
                    <tr key={log.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                        {log.timestamp ? format(new Date(log.timestamp), 'dd/MM/yy HH:mm') : '-'}
                      </td>
                      <td className="px-3 py-2.5 font-medium">{log.item_name}</td>
                      <td className="px-3 py-2.5 font-mono text-muted-foreground">{log.quantity}</td>
                      <td className="px-3 py-2.5">{log.reason || '—'}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{log.destination || '—'}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{log.performed_by || '—'}</td>
                      {isValued && (
                        <td className="px-3 py-2.5 font-medium text-primary whitespace-nowrap">
                          {log.total_value != null ? `RD$${Number(log.total_value).toLocaleString('es-DO', { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ConducePrintModal
        open={!!conduceData}
        data={conduceData}
        tenant={tenant}
        onClose={() => { setConduceData(null); navigate('/inventory'); }}
      />
    </div>
  );
}
