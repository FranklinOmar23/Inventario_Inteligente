import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Package, Barcode, Printer, Building2, Tag,
  Hash, Calendar, Trash2, Loader2, AlertCircle, RefreshCw, AlertTriangle,
  LayoutGrid, Clock, Layers, Pencil, DollarSign,
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
import BarcodeModal from '@/components/shared/BarcodeModal';
import LabelPrintModal from '@/components/shared/LabelPrintModal';

const STATUS_LABELS = {
  in_stock:    { label: 'En Stock',      cls: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  checked_out: { label: 'En Uso',        cls: 'bg-amber-500/10  text-amber-600  border-amber-500/20' },
  maintenance: { label: 'Mantenimiento', cls: 'bg-blue-500/10   text-blue-600   border-blue-500/20' },
  revision:    { label: 'En Revisión',   cls: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
  damaged:     { label: 'Dañado',        cls: 'bg-red-500/10    text-red-600    border-red-500/20' },
  retired:     { label: 'Retirado',      cls: 'bg-gray-500/10   text-gray-500   border-gray-500/20' },
};

const STATUS_OPTIONS = [
  { value: 'in_stock',    label: 'En Stock' },
  { value: 'checked_out', label: 'En Uso' },
  { value: 'revision',    label: 'En Revisión' },
  { value: 'maintenance', label: 'Mantenimiento' },
  { value: 'damaged',     label: 'Dañado (baja automática)', destructive: true },
];

function formatDate(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleString('es-DO', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

const BOARD_STATUSES_LABELS = {
  maintenance: 'Mantenimiento',
  revision:    'Revisión',
  retired:     'Retirado',
  damaged:     'Dañado / Baja',
  checked_out: 'En Uso',
};

function getBoardLabel(log) {
  if (log.action === 'entry')    return 'Entrada al inventario';
  if (log.action === 'restored') return 'Restaurado a En Stock';
  if (log.action === 'damaged')  return 'Dado de baja / Dañado';
  if (log.action === 'restock')  return 'Reabastecimiento';
  if (log.details) return log.details.replace(/ vía (Kanban|Tablero|panel Fuera de Servicio)/g, '').trim();
  return log.action;
}

function getBoardDot(log) {
  if (log.action === 'entry')    return 'bg-sky-500';
  if (log.action === 'restored') return 'bg-emerald-500';
  if (log.action === 'damaged')  return 'bg-red-500';
  if (log.details?.toLowerCase().includes('mantenimiento')) return 'bg-yellow-500';
  if (log.details?.toLowerCase().includes('revisión') || log.details?.toLowerCase().includes('revision')) return 'bg-purple-500';
  if (log.details?.toLowerCase().includes('retirado')) return 'bg-gray-400';
  if (log.details?.toLowerCase().includes('uso')) return 'bg-emerald-500';
  return 'bg-primary';
}

function isBoardLog(log) {
  if (['entry', 'restored', 'damaged', 'restock'].includes(log.action)) return true;
  if (log.action === 'status_change') return true;
  if (log.details?.toLowerCase().includes('tablero')) return true;
  return false;
}

function Field({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium text-sm mt-0.5">{value}</p>
      </div>
    </div>
  );
}

export default function InventoryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user, tenant } = useAuth();
  const isValued = tenant?.inventory_type === 'valued';

  const [barcodeOpen, setBarcodeOpen] = useState(false);
  const [labelOpen,   setLabelOpen]   = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusForm, setStatusForm] = useState({ new_status: '', quantity: 1, notes: '' });
  const [savingStatus, setSavingStatus] = useState(false);
  const [shelfOpen, setShelfOpen] = useState(false);
  const [selectedShelfId, setSelectedShelfId] = useState('');
  const [savingShelf, setSavingShelf] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const { data: item, isLoading, isError, refetch } = useQuery({
    queryKey: ['inventory', id],
    queryFn: () => api.get(`/inventory/${id}`).then(r => r.data),
  });

  const { data: itemLogs = [] } = useQuery({
    queryKey: ['item-logs', id],
    queryFn: () => api.get('/logs', { params: { item_id: id, limit: 50 } }).then(r => r.data),
    enabled: !!id,
    staleTime: 60_000,
  });

  const { data: estantes = [] } = useQuery({
    queryKey: ['estantes'],
    queryFn: () => api.get('/estantes').then(r => r.data),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then(r => r.data),
    staleTime: 60_000,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.get('/departments').then(r => r.data),
    staleTime: 60_000,
  });

  const openEditDialog = () => {
    if (!item) return;
    setEditForm({
      name:          item.name,
      category_id:   item.category_id   || '',
      category_name: item.category_name || '',
      department_id: item.department_id || '',
      department_name: item.department_name || '',
      brand:         item.brand         || '',
      model:         item.model         || '',
      asset_tag:     item.asset_tag     || '',
      service_tag:   item.service_tag   || '',
      serial_number: item.serial_number || '',
      quantity:      item.quantity      ?? 1,
      unit_cost:     item.unit_cost     ?? '',
      description:   item.description   || '',
      notes:         item.notes         || '',
      entry_date:    item.entry_date    ? item.entry_date.slice(0, 10) : '',
    });
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editForm?.name) return;
    setSavingEdit(true);
    try {
      const cat = categories.find(c => c.id === editForm.category_id);
      const dept = departments.find(d => d.id === editForm.department_id);
      await api.put(`/inventory/${id}`, {
        ...item,
        name:           editForm.name,
        category_id:    editForm.category_id   || null,
        category_name:  cat?.name              || editForm.category_name || '',
        department_id:  editForm.department_id || null,
        department_name: dept?.name            || editForm.department_name || '',
        brand:          editForm.brand,
        model:          editForm.model,
        asset_tag:      editForm.asset_tag,
        service_tag:    editForm.service_tag,
        serial_number:  editForm.serial_number,
        quantity:       Number(editForm.quantity) || 1,
        unit_cost:      editForm.unit_cost !== '' ? Number(editForm.unit_cost) : null,
        description:    editForm.description,
        notes:          editForm.notes,
        entry_date:     editForm.entry_date || null,
      });
      queryClient.invalidateQueries({ queryKey: ['inventory', id] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setEditOpen(false);
      toast({ title: 'Item actualizado', description: editForm.name });
      refetch();
    } catch (err) {
      toast({ title: 'Error al guardar', description: err.response?.data?.error || 'Error', variant: 'destructive' });
    } finally {
      setSavingEdit(false);
    }
  };

  const openShelfDialog = () => {
    setSelectedShelfId(item?.shelf_id || '');
    setShelfOpen(true);
  };

  const handleSaveShelf = async () => {
    setSavingShelf(true);
    try {
      const shelf = estantes.find(e => e.id === selectedShelfId);
      await api.put(`/inventory/${id}`, {
        ...item,
        shelf_id:   selectedShelfId || null,
        shelf_name: shelf?.name || '',
      });
      queryClient.invalidateQueries({ queryKey: ['inventory', id] });
      queryClient.invalidateQueries({ queryKey: ['estantes'] });
      setShelfOpen(false);
      toast({ title: 'Estante actualizado', description: shelf ? shelf.name : 'Sin estante asignado' });
    } catch {
      toast({ title: 'Error al actualizar estante', variant: 'destructive' });
    } finally { setSavingShelf(false); }
  };

  // Board logs oldest→newest for chronological journey display
  const boardLogs = [...itemLogs].filter(isBoardLog).reverse();

  const barcodeValue = item?.asset_tag || item?.service_tag || item?.serial_number || '';

  const handleDelete = async () => {
    if (!confirm(`¿Eliminar "${item.name}"? Esta acción no se puede deshacer.`)) return;
    setDeleting(true);
    try {
      await api.delete(`/inventory/${id}`);
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast({ title: 'Item eliminado', description: item.name });
      navigate('/inventory');
    } catch {
      toast({ title: 'Error al eliminar', variant: 'destructive' });
    } finally { setDeleting(false); }
  };

  const openStatusDialog = () => {
    setStatusForm({ new_status: '', quantity: 1, notes: '' });
    setStatusOpen(true);
  };

  const handleStatusChange = async () => {
    if (!statusForm.new_status) return;
    setSavingStatus(true);
    try {
      await api.patch(`/inventory/${id}/status`, {
        new_status:      statusForm.new_status,
        quantity:        Number(statusForm.quantity) || 1,
        notes:           statusForm.notes || undefined,
        performed_by:    user?.full_name || user?.email || 'Sistema',
        performed_by_id: user?.id,
      });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setStatusOpen(false);

      if (statusForm.new_status === 'damaged') {
        toast({
          title: 'Unidades dadas de baja',
          description: `${statusForm.quantity} unidad(es) de "${item.name}" eliminadas del inventario`,
        });
        // If all units were damaged, item is deleted — go back to list
        if (Number(statusForm.quantity) >= item.quantity) {
          navigate('/inventory');
        } else {
          refetch();
        }
      } else {
        toast({ title: 'Estado actualizado', description: `${statusForm.quantity} uds → ${STATUS_LABELS[statusForm.new_status]?.label}` });
        refetch();
      }
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.error || 'Error al cambiar estado', variant: 'destructive' });
    } finally { setSavingStatus(false); }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !item) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <AlertCircle className="w-12 h-12 text-muted-foreground" />
        <p className="text-muted-foreground">Item no encontrado</p>
        <Button variant="outline" onClick={() => navigate('/inventory')}>Volver al inventario</Button>
      </div>
    );
  }

  const status = STATUS_LABELS[item.status] || STATUS_LABELS.in_stock;
  const isDamaged = statusForm.new_status === 'damaged';
  const allDamaged = isDamaged && Number(statusForm.quantity) >= item.quantity;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header nav */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">
            Inventario / {item.department_name || 'Sin departamento'} / <span className="text-foreground">{item.name}</span>
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl gap-1.5"
          onClick={() => setLabelOpen(true)}
        >
          <Printer className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Etiqueta</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl gap-1.5"
          onClick={openEditDialog}
        >
          <Pencil className="w-3.5 h-3.5" />
          Editar
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl gap-1.5"
          onClick={openStatusDialog}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Estado
        </Button>
        <Button
          variant="destructive"
          size="sm"
          className="rounded-xl gap-1.5"
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          Eliminar
        </Button>
      </div>

      {/* Main card */}
      <div className="glass-card rounded-2xl p-6 mb-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Package className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{item.name}</h1>
            {(item.brand || item.model) && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {[item.brand, item.model].filter(Boolean).join(' · ')}
              </p>
            )}
            <div className="flex flex-wrap gap-2 mt-3">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${status.cls}`}>
                {status.label}
              </span>
              {item.category_name && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground border border-border">
                  {item.category_name}
                </span>
              )}
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
                {item.quantity} unidad{item.quantity !== 1 ? 'es' : ''}
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* Value card — valued inventory only */}
      {isValued && (
        <div className="glass-card rounded-2xl p-5 mb-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5" /> Valor del inventario
          </h2>
          <div className="grid sm:grid-cols-3 gap-3 mt-1">
            <div>
              <p className="text-[11px] text-muted-foreground">Costo unitario</p>
              <p className="text-sm font-semibold mt-0.5">
                {item.unit_cost != null ? `RD$${Number(item.unit_cost).toLocaleString('es-DO', { minimumFractionDigits: 2 })}` : 'Sin definir'}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Cantidad</p>
              <p className="text-sm font-semibold mt-0.5">{item.quantity}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Valor total</p>
              <p className="text-sm font-semibold mt-0.5 text-primary">
                {item.unit_cost != null ? `RD$${(Number(item.unit_cost) * item.quantity).toLocaleString('es-DO', { minimumFractionDigits: 2 })}` : '—'}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Identifiers */}
        <div className="glass-card rounded-2xl p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Identificadores</h2>
          <Field icon={Tag}  label="Activo Fijo"     value={item.asset_tag} />
          <Field icon={Hash} label="Service Tag"     value={item.service_tag} />
          <Field icon={Hash} label="Número de Serie" value={item.serial_number} />
          <Field icon={Hash} label="Lote"            value={item.batch_number} />
          <Field icon={Tag}  label="Unidad de Medida" value={item.unit_measure} />
          {!item.asset_tag && !item.service_tag && !item.serial_number && !item.batch_number && !item.unit_measure && (
            <p className="text-xs text-muted-foreground py-2">Sin identificadores registrados</p>
          )}
        </div>

        {/* Location & dates */}
        <div className="glass-card rounded-2xl p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Ubicación y fechas</h2>
          <Field icon={Building2} label="Departamento"     value={item.department_name} />
          <Field icon={Building2} label="Sucursal"         value={item.sucursal_name} />
          <Field icon={Calendar}  label="Fecha de entrada" value={item.entry_date ? new Date(item.entry_date).toLocaleDateString('es-DO') : null} />
          <Field icon={Calendar}  label="Fecha de caducidad" value={item.expiration_date ? new Date(item.expiration_date).toLocaleDateString('es-DO') : null} />
          {/* Shelf */}
          <div className="flex items-start gap-3 py-3 border-t border-border mt-1">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
              <Layers className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Estante</p>
              <p className="font-medium text-sm mt-0.5">{item.shelf_name || 'Sin asignar'}</p>
            </div>
            <button
              onClick={openShelfDialog}
              className="text-[11px] text-primary hover:underline mt-1.5"
            >
              Cambiar
            </button>
          </div>
        </div>
      </div>

      {/* Notes */}
      {(item.description || item.notes) && (
        <div className="glass-card rounded-2xl p-5 mt-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Notas</h2>
          {item.description && <p className="text-sm mb-2">{item.description}</p>}
          {item.notes && <p className="text-sm text-muted-foreground">{item.notes}</p>}
        </div>
      )}

      {/* Board journey timeline */}
      {boardLogs.length > 0 && (
        <div className="glass-card rounded-2xl p-5 mt-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
            <LayoutGrid className="w-3.5 h-3.5" /> Ruta del Tablero
          </h2>
          <div className="relative pl-5">
            <div className="absolute left-2 top-1 bottom-1 w-px bg-border" />
            <div className="space-y-4">
              {boardLogs.map(log => (
                <div key={log.id} className="relative">
                  <div className={`absolute -left-[17px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-background ${getBoardDot(log)}`} />
                  <p className="text-sm font-medium leading-snug">{getBoardLabel(log)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3 shrink-0" />
                    {formatDate(log.timestamp)}
                    {log.performed_by ? <span className="ml-1">· {log.performed_by}</span> : null}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Status change dialog */}
      <Dialog open={statusOpen} onOpenChange={setStatusOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Cambiar Estado</DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {item.name} · <strong>{item.quantity}</strong> unidad{item.quantity !== 1 ? 'es' : ''} disponibles
            </p>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Nuevo estado</Label>
              <Select value={statusForm.new_status} onValueChange={v => setStatusForm(p => ({ ...p, new_status: v }))}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Seleccionar estado" /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.filter(o => o.value !== item.status).map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Cantidad de unidades a cambiar</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={1}
                  max={item.quantity}
                  value={statusForm.quantity}
                  onChange={e => setStatusForm(p => ({ ...p, quantity: e.target.value }))}
                  className="rounded-xl w-28 text-center font-semibold"
                />
                <span className="text-xs text-muted-foreground">de {item.quantity} disponibles</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Observaciones (opcional)</Label>
              <Textarea
                value={statusForm.notes}
                onChange={e => setStatusForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="Motivo del cambio..."
                className="rounded-xl"
                rows={2}
              />
            </div>

            {/* Warning for damaged */}
            {isDamaged && (
              <div className={`flex items-start gap-2 p-3 rounded-xl text-xs ${allDamaged ? 'bg-red-500/10 border border-red-500/20 text-red-700' : 'bg-orange-500/10 border border-orange-500/20 text-orange-700'}`}>
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>
                  {allDamaged
                    ? `Se eliminarán todas las ${item.quantity} unidades permanentemente del inventario.`
                    : `${statusForm.quantity} unidad(es) serán dadas de baja. Quedarán ${item.quantity - Number(statusForm.quantity)} unidades.`}
                </p>
              </div>
            )}

            <Button
              onClick={handleStatusChange}
              disabled={savingStatus || !statusForm.new_status}
              className={`w-full rounded-xl ${isDamaged ? 'bg-red-600 hover:bg-red-700' : ''}`}
            >
              {savingStatus ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {isDamaged ? 'Dar de Baja' : 'Confirmar Cambio'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Shelf dialog */}
      <Dialog open={shelfOpen} onOpenChange={setShelfOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader><DialogTitle>Cambiar Estante</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <Select value={selectedShelfId || '__none__'} onValueChange={v => setSelectedShelfId(v === '__none__' ? '' : v)}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Sin estante asignado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sin estante asignado</SelectItem>
                {estantes.map(e => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}{e.sucursal_name ? ` · ${e.sucursal_name}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button className="w-full rounded-xl" onClick={handleSaveShelf} disabled={savingShelf}>
              {savingShelf ? 'Guardando…' : 'Confirmar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Full edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="rounded-2xl max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-4 h-4 text-primary" /> Editar Item
            </DialogTitle>
          </DialogHeader>

          {editForm && (
            <div className="grid sm:grid-cols-2 gap-4 mt-2">
              {/* Name */}
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs">Nombre *</Label>
                <Input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                  className="rounded-xl" placeholder="Nombre del item" />
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <Label className="text-xs">Categoría</Label>
                <Select value={editForm.category_id || '__none__'}
                  onValueChange={v => setEditForm(p => ({ ...p, category_id: v === '__none__' ? '' : v }))}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Sin categoría" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin categoría</SelectItem>
                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Department */}
              <div className="space-y-1.5">
                <Label className="text-xs">Departamento</Label>
                <Select value={editForm.department_id || '__none__'}
                  onValueChange={v => setEditForm(p => ({ ...p, department_id: v === '__none__' ? '' : v }))}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Sin departamento" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin departamento</SelectItem>
                    {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}{d.sucursal_name ? ` · ${d.sucursal_name}` : ''}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Brand */}
              <div className="space-y-1.5">
                <Label className="text-xs">Marca</Label>
                <Input value={editForm.brand} onChange={e => setEditForm(p => ({ ...p, brand: e.target.value }))}
                  className="rounded-xl" placeholder="Marca" />
              </div>

              {/* Model */}
              <div className="space-y-1.5">
                <Label className="text-xs">Modelo</Label>
                <Input value={editForm.model} onChange={e => setEditForm(p => ({ ...p, model: e.target.value }))}
                  className="rounded-xl" placeholder="Modelo" />
              </div>

              {/* Asset tag */}
              <div className="space-y-1.5">
                <Label className="text-xs">Activo Fijo</Label>
                <Input value={editForm.asset_tag} onChange={e => setEditForm(p => ({ ...p, asset_tag: e.target.value }))}
                  className="rounded-xl" placeholder="Nº activo fijo" />
              </div>

              {/* Service tag */}
              <div className="space-y-1.5">
                <Label className="text-xs">Service Tag</Label>
                <Input value={editForm.service_tag} onChange={e => setEditForm(p => ({ ...p, service_tag: e.target.value }))}
                  className="rounded-xl" placeholder="Service tag" />
              </div>

              {/* Serial number */}
              <div className="space-y-1.5">
                <Label className="text-xs">Número de Serie</Label>
                <Input value={editForm.serial_number} onChange={e => setEditForm(p => ({ ...p, serial_number: e.target.value }))}
                  className="rounded-xl" placeholder="S/N" />
              </div>

              {/* Quantity */}
              <div className="space-y-1.5">
                <Label className="text-xs">Cantidad</Label>
                <Input type="number" min={1} value={editForm.quantity}
                  onChange={e => setEditForm(p => ({ ...p, quantity: e.target.value }))}
                  className="rounded-xl" />
              </div>

              {/* Unit cost */}
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1"><DollarSign className="w-3 h-3" /> Costo unitario (opcional)</Label>
                <Input type="number" min={0} step="0.01" value={editForm.unit_cost}
                  onChange={e => setEditForm(p => ({ ...p, unit_cost: e.target.value }))}
                  className="rounded-xl" placeholder="0.00" />
              </div>

              {/* Entry date */}
              <div className="space-y-1.5">
                <Label className="text-xs">Fecha de entrada</Label>
                <Input type="date" value={editForm.entry_date}
                  onChange={e => setEditForm(p => ({ ...p, entry_date: e.target.value }))}
                  className="rounded-xl" />
              </div>

              {/* Description */}
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs">Descripción</Label>
                <Textarea value={editForm.description}
                  onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
                  className="rounded-xl" rows={2} placeholder="Descripción del item" />
              </div>

              {/* Notes */}
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs">Observaciones</Label>
                <Textarea value={editForm.notes}
                  onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))}
                  className="rounded-xl" rows={2} placeholder="Notas adicionales" />
              </div>

              <div className="sm:col-span-2 flex gap-2">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setEditOpen(false)}>
                  Cancelar
                </Button>
                <Button className="flex-1 rounded-xl" onClick={handleSaveEdit}
                  disabled={savingEdit || !editForm.name}>
                  {savingEdit ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Guardar Cambios
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <BarcodeModal
        open={barcodeOpen}
        onClose={() => setBarcodeOpen(false)}
        code={barcodeValue}
        itemName={item.name}
      />

      <LabelPrintModal
        open={labelOpen}
        onClose={() => setLabelOpen(false)}
        item={item}
      />
    </div>
  );
}
