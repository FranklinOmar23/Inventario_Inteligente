import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftRight, Search, Loader2, Check, Package, Building2, MapPin, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import api from '@/api/client';
import PageHeader from '@/components/shared/PageHeader';
import QuickScan from '@/components/checkout/QuickScan';

const STATUS_LABELS = {
  in_stock:    { label: 'En Stock',      cls: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  checked_out: { label: 'En Uso',        cls: 'bg-amber-500/10  text-amber-600  border-amber-500/20' },
  maintenance: { label: 'Mantenimiento', cls: 'bg-blue-500/10   text-blue-600   border-blue-500/20' },
};

export default function Traspaso() {
  const { user }         = useAuth();
  const { toast }        = useToast();
  const navigate         = useNavigate();
  const queryClient      = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [foundItem, setFoundItem]     = useState(null);
  const [searching, setSearching]     = useState(false);
  const [saving, setSaving]           = useState(false);
  const [quickScanOpen, setQuickScanOpen] = useState(false);
  const [toSucursalId, setToSucursalId]   = useState('');
  const [toDeptId, setToDeptId]           = useState('');
  const [transferQty, setTransferQty]     = useState(1);
  const [notes, setNotes]                 = useState('');

  const { data: items = [] } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => api.get('/inventory?limit=500').then(r => r.data),
  });

  const { data: sucursales = [] } = useQuery({
    queryKey: ['sucursales'],
    queryFn: () => api.get('/sucursales').then(r => r.data),
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.get('/departments').then(r => r.data),
  });

  // Filter departments by selected sucursal
  const filteredDepts = (toSucursalId && toSucursalId !== '__all__')
    ? departments.filter(d => d.sucursal_id === toSucursalId)
    : departments;

  const selectedSucursal = sucursales.find(s => s.id === toSucursalId);
  const selectedDept     = departments.find(d => d.id === toDeptId);

  const searchItem = (query) => {
    let q = query.trim();
    if (!q) return;

    // Extract UUID from a scanned URL (e.g. http://localhost:5173/inventory/<uuid>)
    // Scanners with wrong keyboard locale may replace : with Ñ and / with - or similar
    const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const urlMatch = q.match(uuidPattern);
    if (urlMatch) {
      q = urlMatch[0];
    }

    const ql = q.toLowerCase();
    const match = items.find(i =>
      i.id.toLowerCase() === ql ||
      [i.asset_tag, i.service_tag, i.serial_number].some(v => v?.toLowerCase() === ql)
    );
    if (match) {
      setFoundItem(match);
      setSearchQuery(query);
      setTransferQty(1);
    } else {
      setFoundItem(null);
      toast({ title: 'No encontrado', description: `Sin coincidencia para: ${q}`, variant: 'destructive' });
    }
  };

  const handleSearch = () => searchItem(searchQuery);

  const handleQuickScan = (code) => {
    setSearchQuery(code);
    searchItem(code);
    setQuickScanOpen(false);
  };

  const handleTransfer = async () => {
    if (!foundItem) return;
    if (!toDeptId) {
      toast({ title: 'Departamento destino requerido', variant: 'destructive' }); return;
    }
    if (foundItem.department_id === toDeptId) {
      toast({ title: 'El equipo ya está en ese departamento', variant: 'destructive' }); return;
    }

    setSaving(true);
    try {
      await api.post(`/inventory/${foundItem.id}/transfer`, {
        to_department_id:   toDeptId,
        to_department_name: selectedDept?.name || '',
        to_sucursal_id:     toSucursalId || null,
        to_sucursal_name:   selectedSucursal?.name || '',
        quantity:           Number(transferQty) || 1,
        performed_by:       user?.full_name || user?.email || 'Sistema',
        performed_by_id:    user?.id,
        notes: notes || undefined,
      });

      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['logs'] });
      toast({
        title: 'Traspaso registrado',
        description: `${foundItem.name} → ${selectedDept?.name}${selectedSucursal ? ` (${selectedSucursal.name})` : ''}`,
      });
      navigate('/inventory');
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.error || 'Error al realizar traspaso', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const statusInfo = foundItem ? (STATUS_LABELS[foundItem.status] || STATUS_LABELS.in_stock) : null;

  return (
    <div>
      <PageHeader
        title="Traspaso de Equipo"
        subtitle="Mover un equipo de un departamento a otro"
        icon={ArrowLeftRight}
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
            Ingresa el Activo Fijo, Service Tag o Número de Serie del equipo a traspasar.
          </p>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Activo fijo, service tag, número de serie..."
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

              {/* Current location + qty */}
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
              </div>
            </div>
          )}
        </div>

        {/* Destination */}
        {foundItem && (
          <div className="glass-card rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" /> Destino del Traspaso
            </h2>

            {/* Quantity */}
            <div className="space-y-1.5">
              <Label className="text-xs">Cantidad a traspasar</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={1}
                  max={foundItem.quantity}
                  value={transferQty}
                  onChange={e => setTransferQty(e.target.value)}
                  className="rounded-xl w-28 text-center font-semibold"
                />
                <span className="text-xs text-muted-foreground">de {foundItem.quantity} disponibles</span>
              </div>
            </div>

            {sucursales.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs">Sucursal destino</Label>
                <Select value={toSucursalId || '__all__'} onValueChange={v => { setToSucursalId(v === '__all__' ? '' : v); setToDeptId(''); }}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Seleccionar sucursal (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todas las sucursales</SelectItem>
                    {sucursales.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Departamento destino *</Label>
              <Select value={toDeptId} onValueChange={setToDeptId}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Seleccionar departamento" />
                </SelectTrigger>
                <SelectContent>
                  {filteredDepts.map(d => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}{d.sucursal_name ? ` — ${d.sucursal_name}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Transfer preview */}
            {toDeptId && (
              <div className="flex items-center gap-3 text-xs bg-muted/40 rounded-xl px-4 py-3">
                <div className="text-center">
                  <p className="text-muted-foreground">Desde</p>
                  <p className="font-semibold">{foundItem.department_name || 'Sin asignar'}</p>
                  {foundItem.sucursal_name && <p className="text-muted-foreground">{foundItem.sucursal_name}</p>}
                </div>
                <ArrowLeftRight className="w-4 h-4 text-primary flex-shrink-0" />
                <div className="text-center">
                  <p className="text-muted-foreground">Hacia</p>
                  <p className="font-semibold">{selectedDept?.name}</p>
                  {selectedSucursal && <p className="text-muted-foreground">{selectedSucursal.name}</p>}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Observaciones (opcional)</Label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Motivo del traspaso, responsable, etc."
                className="rounded-xl"
                rows={2}
              />
            </div>

            <Button
              onClick={handleTransfer}
              disabled={saving || !toDeptId}
              className="w-full rounded-xl"
            >
              {saving
                ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                : <Check className="w-4 h-4 mr-2" />}
              Confirmar Traspaso
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
