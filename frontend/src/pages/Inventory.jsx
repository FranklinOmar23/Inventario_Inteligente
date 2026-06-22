import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Package, Plus, Trash2, Download, Barcode, RotateCcw, Archive,
  Loader2, AlertTriangle, CheckSquare, Square, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import api from '@/api/client';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import BarcodeModal from '@/components/shared/BarcodeModal';
import ScanSearchInput from '@/components/shared/ScanSearchInput';
import Pagination from '@/components/shared/Pagination';
import { SkeletonTable } from '@/components/ui/Skeleton';

const DEFAULT_PAGE_SIZE = 10;

const STATUS_LABELS = {
  in_stock:    { label: 'En Stock',       cls: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  checked_out: { label: 'En Uso',         cls: 'bg-amber-500/10  text-amber-600  border-amber-500/20' },
  maintenance: { label: 'Mantenimiento',  cls: 'bg-blue-500/10   text-blue-600   border-blue-500/20' },
  revision:    { label: 'En Revisión',    cls: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
  damaged:     { label: 'Dañado',         cls: 'bg-red-500/10    text-red-600    border-red-500/20' },
  retired:     { label: 'Retirado',       cls: 'bg-gray-500/10   text-gray-500   border-gray-500/20' },
};

const BULK_STATUS_OPTIONS = [
  { value: 'maintenance', label: 'Mantenimiento' },
  { value: 'revision',    label: 'Revisión' },
  { value: 'retired',     label: 'Retirado (Desahucio)' },
  { value: 'damaged',     label: 'Dañado / Baja' },
];

export default function Inventory() {
  const queryClient = useQueryClient();
  const { toast }   = useToast();
  const { user, tenant } = useAuth();
  const isValued = tenant?.inventory_type === 'valued';
  const [searchParams] = useSearchParams();

  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('in_stock');
  const [catFilter,    setCatFilter]    = useState(searchParams.get('cat') || 'all');
  const [deptFilter,   setDeptFilter]   = useState('all');
  const [shelfFilter,  setShelfFilter]  = useState('all');
  const [page,         setPage]         = useState(1);
  const [pageSize,     setPageSize]     = useState(DEFAULT_PAGE_SIZE);
  const [barcodeModal, setBarcodeModal] = useState({ open: false, code: '', itemName: '', assetTag: '' });

  // Multi-select
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Bulk move dialog
  const [bulkOpen,    setBulkOpen]    = useState(false);
  const [bulkStatus,  setBulkStatus]  = useState('retired');
  const [bulkLoading, setBulkLoading] = useState(false);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => api.get('/inventory?limit=500').then((r) => r.data),
  });
  const { data: categories = [] }  = useQuery({ queryKey: ['categories'],  queryFn: () => api.get('/categories').then((r) => r.data) });
  const { data: departments = [] } = useQuery({ queryKey: ['departments'], queryFn: () => api.get('/departments').then((r) => r.data) });
  const { data: estantes = [] }    = useQuery({ queryKey: ['estantes'],    queryFn: () => api.get('/estantes').then((r) => r.data) });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter((item) => {
      const matchSearch = !q || [item.name, item.asset_tag, item.service_tag, item.serial_number, item.brand, item.model]
        .some((v) => v?.toLowerCase().includes(q));
      const matchStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchCat    = catFilter    === 'all' || item.category_id  === catFilter;
      const matchDept   = deptFilter   === 'all' || item.department_id === deptFilter;
      const matchShelf  = shelfFilter  === 'all' || item.shelf_id === shelfFilter || (shelfFilter === '__none__' && !item.shelf_id);
      return matchSearch && matchStatus && matchCat && matchDept && matchShelf;
    });
  }, [items, search, statusFilter, catFilter, deptFilter, shelfFilter]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated  = filtered.slice((page - 1) * pageSize, page * pageSize);

  const resetPage = (fn) => (val) => { fn(val); setPage(1); setSelectedIds(new Set()); };

  // ── Multi-select helpers ──────────────────────────────────────────────────
  const toggleSelect = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const allPageSelected = paginated.length > 0 && paginated.every(i => selectedIds.has(i.id));
  const somePageSelected = paginated.some(i => selectedIds.has(i.id));

  const toggleSelectAll = useCallback(() => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allPageSelected) {
        paginated.forEach(i => next.delete(i.id));
      } else {
        paginated.forEach(i => next.add(i.id));
      }
      return next;
    });
  }, [paginated, allPageSelected]);

  const clearSelection = () => setSelectedIds(new Set());

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id, name) => {
    if (!confirm(`¿Eliminar "${name}"?`)) return;
    await api.delete(`/inventory/${id}`);
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
    setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    toast({ title: 'Item eliminado', description: name });
  };

  const handleBulkDelete = async () => {
    const ids = [...selectedIds];
    if (!confirm(`¿Eliminar ${ids.length} item(s) seleccionado(s)? Esta acción no se puede deshacer.`)) return;
    try {
      await Promise.all(ids.map(id => api.delete(`/inventory/${id}`)));
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      clearSelection();
      toast({ title: `${ids.length} item(s) eliminados` });
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.error || 'Error al eliminar', variant: 'destructive' });
    }
  };

  // ── Bulk move to tablero ──────────────────────────────────────────────────
  const hasSelection = selectedIds.size > 0;

  const handleBulkStatus = async () => {
    setBulkLoading(true);
    try {
      const payload = hasSelection
        ? { new_status: bulkStatus, all: false, item_ids: [...selectedIds], performed_by: user?.full_name || user?.email || 'Sistema', performed_by_id: user?.id }
        : { new_status: bulkStatus, all: true, performed_by: user?.full_name || user?.email || 'Sistema', performed_by_id: user?.id };

      const { data } = await api.post('/inventory/bulk-status', payload);
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-damaged'] });
      toast({ title: 'Operación completada', description: `${data.updated} equipos movidos al Tablero` });
      setBulkOpen(false);
      clearSelection();
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.error || 'Error en la operación', variant: 'destructive' });
    } finally {
      setBulkLoading(false);
    }
  };

  const downloadReport = () => {
    const csv = [
      ['ID', 'Nombre', 'Categoría', 'Departamento', 'Estado', 'Cantidad', 'Activo Fijo', 'Service Tag', 'Número Serie', 'Marca', 'Modelo'].join(','),
      ...filtered.map((i) => [
        i.id, `"${i.name}"`, `"${i.category_name}"`, `"${i.department_name}"`,
        i.status, i.quantity, i.asset_tag, i.service_tag, i.serial_number, i.brand, i.model
      ].join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'inventario.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const stats = useMemo(() => ({
    total:       items.length,
    inStock:     items.filter(i => i.status === 'in_stock').length,
    inUse:       items.filter(i => i.status === 'checked_out').length,
    maintenance: items.filter(i => ['maintenance', 'revision', 'retired', 'damaged'].includes(i.status)).length,
    restored:    items.filter(i => i.restored_at).length,
    totalValue:  items.reduce((sum, i) => sum + (i.unit_cost != null ? Number(i.unit_cost) * i.quantity : 0), 0),
  }), [items]);

  const activeCount = items.filter(i => !['maintenance','revision','retired','damaged'].includes(i.status)).length;

  return (
    <div className="flex gap-6 min-h-0">

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        <PageHeader
          title="Inventario"
          subtitle={`${filtered.length} de ${items.length} items`}
          icon={Package}
          actions={
            <>
              <Button variant="outline" className="rounded-xl gap-1.5" onClick={downloadReport}>
                <Download className="w-4 h-4" /> Descargar Reporte
              </Button>
              <Button
                variant="outline"
                className="rounded-xl gap-1.5 text-orange-600 border-orange-300 hover:bg-orange-500/10"
                onClick={() => setBulkOpen(true)}
              >
                <Archive className="w-4 h-4" />
                {hasSelection ? `Mover seleccionados (${selectedIds.size})` : 'Mover al Tablero'}
              </Button>
              <Link to="/entry">
                <Button className="rounded-xl gap-1.5"><Plus className="w-4 h-4" /> Registrar Entrada</Button>
              </Link>
            </>
          }
        />

        {/* ── Filters ─────────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex-1 min-w-48 space-y-1">
            <Label className="text-xs text-muted-foreground">Buscar</Label>
            <ScanSearchInput
              placeholder="Nombre, activo fijo, service tag, QR..."
              value={search}
              onChange={(v) => { setSearch(v); setPage(1); setSelectedIds(new Set()); }}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Estado</Label>
            <Select value={statusFilter} onValueChange={resetPage(setStatusFilter)}>
              <SelectTrigger className="w-48 rounded-xl"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="in_stock">En Stock</SelectItem>
                <SelectItem value="checked_out">En Uso</SelectItem>
                <SelectItem value="maintenance">Mantenimiento</SelectItem>
                <SelectItem value="revision">En Revisión</SelectItem>
                <SelectItem value="retired">Retirado</SelectItem>
                <SelectItem value="damaged">Dañado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Categoría</Label>
            <Select value={catFilter} onValueChange={resetPage(setCatFilter)}>
              <SelectTrigger className="w-44 rounded-xl"><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories.filter(c => !c.parent_id).flatMap((c) => [
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>,
                  ...categories.filter(s => s.parent_id === c.id).map(s => (
                    <SelectItem key={s.id} value={s.id}>&nbsp;&nbsp;↳ {s.name}</SelectItem>
                  )),
                ])}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Departamento</Label>
            <Select value={deptFilter} onValueChange={resetPage(setDeptFilter)}>
              <SelectTrigger className="w-52 rounded-xl"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los departamentos</SelectItem>
                {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {estantes.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Estante</Label>
              <Select value={shelfFilter} onValueChange={resetPage(setShelfFilter)}>
                <SelectTrigger className="w-48 rounded-xl"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estantes</SelectItem>
                  <SelectItem value="__none__">Sin estante</SelectItem>
                  {estantes.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* ── Bulk action bar ─────────────────────────────────────────── */}
        {hasSelection && (
          <div className="flex items-center gap-3 mb-4 px-4 py-2.5 rounded-xl bg-primary/5 border border-primary/20 animate-in slide-in-from-top-1 duration-150">
            <CheckSquare className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm font-medium text-primary flex-1">
              {selectedIds.size} item(s) seleccionado(s)
            </span>
            <Button
              size="sm"
              variant="outline"
              className="rounded-lg gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10 h-7 text-xs"
              onClick={handleBulkDelete}
            >
              <Trash2 className="w-3.5 h-3.5" /> Eliminar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-lg gap-1.5 text-orange-600 border-orange-300 hover:bg-orange-500/10 h-7 text-xs"
              onClick={() => setBulkOpen(true)}
            >
              <Archive className="w-3.5 h-3.5" /> Mover al Tablero
            </Button>
            <button
              onClick={clearSelection}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Limpiar selección"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {isLoading ? (
          <SkeletonTable rows={10} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Package} title="Sin resultados"
            description="No se encontraron items con los filtros aplicados"
            action={<Link to="/entry"><Button variant="outline" className="rounded-xl">Registrar primer item</Button></Link>} />
        ) : (
          <>
            <div className="glass-card rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {/* Select-all checkbox */}
                    <th className="w-10 px-3 py-3">
                      <button
                        onClick={toggleSelectAll}
                        className="flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                        title={allPageSelected ? 'Deseleccionar página' : 'Seleccionar página'}
                      >
                        {allPageSelected
                          ? <CheckSquare className="w-4 h-4 text-primary" />
                          : somePageSelected
                            ? <CheckSquare className="w-4 h-4 text-primary/50" />
                            : <Square className="w-4 h-4" />}
                      </button>
                    </th>
                    {[
                      'Nombre', 'Categoría', 'Departamento', 'Estante', 'Estado', 'Qty',
                      ...(isValued ? ['Valor Total'] : []),
                      'Identificadores', '',
                    ].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((item, idx) => {
                    const s       = STATUS_LABELS[item.status] || STATUS_LABELS.in_stock;
                    const code    = item.asset_tag || item.service_tag || item.serial_number || '';
                    const checked = selectedIds.has(item.id);
                    return (
                      <tr
                        key={item.id}
                        className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors animate-card ${checked ? 'bg-primary/5' : ''}`}
                        style={{ '--delay': `${Math.min(idx * 30, 300)}ms` }}
                      >
                        {/* Row checkbox */}
                        <td className="px-3 py-3">
                          <button
                            onClick={() => toggleSelect(item.id)}
                            className="flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                          >
                            {checked
                              ? <CheckSquare className="w-4 h-4 text-primary" />
                              : <Square className="w-4 h-4" />}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <Link to={`/inventory/${item.id}`} className="hover:text-primary transition-colors">
                            <p className="font-medium">{item.name}</p>
                            {(item.brand || item.model) && (
                              <p className="text-xs text-muted-foreground">{[item.brand, item.model].filter(Boolean).join(' · ')}</p>
                            )}
                            {item.asset_tag && (
                              <p className="text-[11px] font-mono text-muted-foreground/70 mt-0.5">AF: {item.asset_tag}</p>
                            )}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{item.category_name || '-'}</td>
                        <td className="px-4 py-3 text-muted-foreground">{item.department_name || '-'}</td>
                        <td className="px-4 py-3">
                          {item.shelf_name
                            ? <span className="text-xs px-2 py-0.5 rounded-md bg-primary/10 text-primary font-medium">{item.shelf_name}</span>
                            : <span className="text-xs text-muted-foreground">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium border w-fit ${s.cls}`}>{s.label}</span>
                            {item.restored_at && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border w-fit bg-sky-500/10 text-sky-600 border-sky-500/20">
                                <RotateCcw className="w-2.5 h-2.5" /> Restaurado
                              </span>
                            )}
                            {item.checked_out_to && <p className="text-xs text-muted-foreground">→ {item.checked_out_to}</p>}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-muted-foreground">{item.quantity}</td>
                        {isValued && (
                          <td className="px-4 py-3 font-mono text-sm font-semibold text-primary">
                            {item.unit_cost != null
                              ? `RD$${(Number(item.unit_cost) * item.quantity).toLocaleString('es-DO', { minimumFractionDigits: 2 })}`
                              : <span className="text-muted-foreground font-normal">—</span>}
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <div className="text-xs text-muted-foreground space-y-0.5">
                            {item.asset_tag     && <div>AF: {item.asset_tag}</div>}
                            {item.service_tag   && <div>ST: {item.service_tag}</div>}
                            {item.serial_number && <div>SN: {item.serial_number}</div>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {code && (
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                title="Ver código de barras"
                                onClick={() => setBarcodeModal({ open: true, code, itemName: item.name, assetTag: item.asset_tag || '' })}>
                                <Barcode className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDelete(item.id, item.name)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Pagination
              page={page}
              totalPages={totalPages}
              onPage={setPage}
              totalItems={filtered.length}
              pageSize={pageSize}
              onPageSize={setPageSize}
            />
          </>
        )}

        <BarcodeModal
          open={barcodeModal.open}
          onClose={() => setBarcodeModal({ open: false, code: '', itemName: '', assetTag: '' })}
          code={barcodeModal.code}
          itemName={barcodeModal.itemName}
          assetTag={barcodeModal.assetTag}
        />
      </div>

      {/* ── Right sidebar ────────────────────────────────────────────────── */}
      <aside className="hidden xl:flex flex-col gap-4 w-64 shrink-0 pt-[72px]">
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resumen</h3>
          {[
            { label: 'Total registrados', value: stats.total,       cls: 'text-foreground' },
            { label: 'En Stock',          value: stats.inStock,     cls: 'text-emerald-600' },
            { label: 'En Uso',            value: stats.inUse,       cls: 'text-amber-600' },
            { label: 'En tablero',        value: stats.maintenance, cls: 'text-blue-600' },
            { label: 'Restaurados',       value: stats.restored,    cls: 'text-sky-600' },
          ].map(({ label, value, cls }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{label}</span>
              <span className={`text-sm font-bold ${cls}`}>{value}</span>
            </div>
          ))}
          {isValued && (
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-xs text-muted-foreground">Valor total inventario</span>
              <span className="text-sm font-bold text-primary">
                RD${stats.totalValue.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>

        <div className="glass-card rounded-2xl p-5 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Por categoría</h3>
          {categories.map(cat => {
            const count = items.filter(i => i.category_id === cat.id).length;
            if (!count) return null;
            const pct = Math.round((count / items.length) * 100);
            return (
              <div key={cat.id} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground truncate">{cat.name}</span>
                  <span className="font-medium shrink-0 ml-2">{count}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary/60 transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* ── Bulk move dialog ─────────────────────────────────────────────── */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Archive className="w-5 h-5 text-orange-500" /> Mover equipos al Tablero
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-1">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-700 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>
                {hasSelection
                  ? <>Se moverán los <strong>{selectedIds.size} equipos seleccionados</strong> al estado indicado.</>
                  : <>Todos los equipos <strong>activos en el inventario</strong> serán movidos al estado seleccionado.</>}
                {' '}Esta acción queda registrada en el historial.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Mover a</Label>
              <Select value={bulkStatus} onValueChange={setBulkStatus}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BULK_STATUS_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <p className="text-xs text-muted-foreground">
              Se moverán <strong>
                {hasSelection ? selectedIds.size : activeCount}
              </strong> {hasSelection ? 'equipos seleccionados' : 'equipos activos'}.
            </p>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setBulkOpen(false)}>
                Cancelar
              </Button>
              <Button className="flex-1 rounded-xl bg-orange-600 hover:bg-orange-700"
                disabled={bulkLoading} onClick={handleBulkStatus}>
                {bulkLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Archive className="w-4 h-4 mr-2" />}
                Confirmar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
