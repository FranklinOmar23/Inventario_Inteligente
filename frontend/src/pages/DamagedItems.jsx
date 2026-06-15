import React, { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DndContext, DragOverlay, useDroppable, useDraggable,
  PointerSensor, useSensor, useSensors, closestCenter,
} from '@dnd-kit/core';
import {
  LayoutGrid, Wrench, Eye, Archive, AlertTriangle, UserCheck,
  Trash2, RotateCcw, Loader2, GripVertical,
  CheckCircle2, Save, Plus, Clock, ChevronDown, ChevronUp,
  Maximize2, Camera, X, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ScanSearchInput from '@/components/shared/ScanSearchInput';
import CameraCapture from '@/components/inventory/CameraCapture';
import api from '@/api/client';
import PageHeader from '@/components/shared/PageHeader';

const COLLAPSE_LIMIT = 10; // columns with more than this collapse to summary card

const COLUMNS = [
  { id: 'maintenance', label: 'Mantenimiento',  icon: Wrench,        header: 'bg-yellow-500/10 text-yellow-700 border-yellow-200 dark:border-yellow-900', dot: 'bg-yellow-500' },
  { id: 'revision',    label: 'Revisión',        icon: Eye,           header: 'bg-purple-500/10 text-purple-600 border-purple-200 dark:border-purple-900', dot: 'bg-purple-500' },
  { id: 'retired',     label: 'Retirado',        icon: Archive,       header: 'bg-gray-500/10 text-gray-600 border-gray-200 dark:border-gray-700',         dot: 'bg-gray-400' },
  { id: 'damaged',     label: 'Dañado / Baja',   icon: AlertTriangle, header: 'bg-red-500/10 text-red-600 border-red-200 dark:border-red-900',             dot: 'bg-red-500' },
  { id: 'checked_out', label: 'En Uso',          icon: UserCheck,     header: 'bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-900', dot: 'bg-emerald-500', restoreOnDrop: true },
];

const ITEM_STATUS = {
  in_stock:    { label: 'En Stock',      cls: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  checked_out: { label: 'En Uso',        cls: 'bg-blue-500/10   text-blue-600   border-blue-500/20' },
  maintenance: { label: 'Mantenimiento', cls: 'bg-yellow-500/10 text-yellow-700 border-yellow-200' },
  revision:    { label: 'En Revisión',   cls: 'bg-purple-500/10 text-purple-600 border-purple-200' },
  retired:     { label: 'Retirado',      cls: 'bg-gray-500/10   text-gray-500   border-gray-500/20' },
  damaged:     { label: 'Dañado',        cls: 'bg-red-500/10    text-red-600    border-red-500/20' },
};

function formatDate(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleString('es-DO', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function getLogLabel(log) {
  if (log.action === 'entry')        return 'Entrada al inventario';
  if (log.action === 'restored')     return 'Restaurado a En Stock';
  if (log.action === 'restock')      return 'Reabastecimiento';
  if (log.action === 'damaged')      return 'Marcado como Dañado';
  if (log.action === 'transfer')     return log.details || 'Traspaso';
  if (log.details)                   return log.details.replace(/ vía (Kanban|panel Fuera de Servicio)/g, '').trim();
  return log.action;
}

function getLogDot(log) {
  if (log.action === 'entry')    return 'bg-emerald-500';
  if (log.action === 'restored') return 'bg-emerald-500';
  if (log.action === 'damaged')  return 'bg-destructive';
  if (log.action === 'transfer') return 'bg-blue-500';
  return 'bg-primary';
}

// ─── Add-to-column modal ──────────────────────────────────────────────────────
function AddToColumnModal({ col, open, onClose, onAdd }) {
  const ColIcon = col?.icon;
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(null);

  const { data: allItems = [] } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => api.get('/inventory?limit=500').then(r => r.data),
    enabled: open,
    staleTime: 30_000,
  });

  const filtered = allItems.filter(i => {
    const itemStatus = i.deleted_at ? 'damaged' : i.status;
    if (itemStatus === col?.id) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    const uuidMatch = q.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    if (uuidMatch) return i.id.toLowerCase() === uuidMatch[0];
    return [i.name, i.brand, i.model, i.asset_tag, i.service_tag, i.serial_number]
      .some(v => v?.toLowerCase().includes(q));
  });

  const handleAdd = async (item) => {
    setAdding(item.id);
    await onAdd(item, col.id);
    setAdding(null);
    setSearch('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setSearch(''); onClose(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {ColIcon && <ColIcon className="w-4 h-4" />}
            Agregar a {col?.label}
          </DialogTitle>
        </DialogHeader>
        <ScanSearchInput value={search} onChange={setSearch} placeholder="Buscar nombre, AF, serial, escanear QR..." />
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
          {filtered.slice(0, 25).map(item => {
            const st = ITEM_STATUS[item.status] || ITEM_STATUS.in_stock;
            return (
              <button key={item.id} disabled={adding === item.id} onClick={() => handleAdd(item)}
                className="w-full text-left glass-card rounded-xl p-3 hover:bg-primary/5 transition-colors flex items-center gap-3 disabled:opacity-50"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  {(item.brand || item.model) && (
                    <p className="text-xs text-muted-foreground truncate">{[item.brand, item.model].filter(Boolean).join(' · ')}</p>
                  )}
                  <div className="flex gap-2 mt-0.5">
                    {item.asset_tag     && <span className="text-[10px] text-muted-foreground">AF: {item.asset_tag}</span>}
                    {item.serial_number && <span className="text-[10px] text-muted-foreground">SN: {item.serial_number}</span>}
                  </div>
                </div>
                {adding === item.id
                  ? <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
                  : <span className={`text-[10px] px-1.5 py-0.5 rounded-md border whitespace-nowrap shrink-0 ${st.cls}`}>{st.label}</span>
                }
              </button>
            );
          })}
          {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Sin resultados</p>}
          {filtered.length > 25 && (
            <p className="text-center text-xs text-muted-foreground py-2">Mostrando 25 de {filtered.length} — refina la búsqueda</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Column expand modal (when > COLLAPSE_LIMIT items) ────────────────────────
function ColumnExpandModal({ col, items, open, onClose, onRestore, onDelete, onSaveNotes, user }) {
  const ColIcon = col?.icon;
  const [search,      setSearch]      = useState('');
  const [page,        setPage]        = useState(1);
  const [showCamera,  setShowCamera]  = useState(false);
  const [aiSearching, setAiSearching] = useState(false);
  const PAGE_SIZE = 10;

  const filtered = items.filter(item => {
    if (!search) return true;
    const q = search.toLowerCase();
    const uuidMatch = q.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    if (uuidMatch) return item.id.toLowerCase() === uuidMatch[0];
    return [item.name, item.brand, item.model, item.asset_tag, item.service_tag, item.serial_number, item.department_name]
      .some(v => v?.toLowerCase().includes(q));
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handlePhotoSearch = async (dataUrl) => {
    setShowCamera(false);
    setAiSearching(true);
    try {
      const { data } = await api.post('/ai/search-by-image', {
        image_base64: dataUrl.replace(/^data:image\/\w+;base64,/, ''),
        items: items.map(i => ({ id: i.id, name: i.name, brand: i.brand, model: i.model, asset_tag: i.asset_tag, serial_number: i.serial_number, service_tag: i.service_tag })),
      });
      if (data.item_id) {
        const found = items.find(i => i.id === data.item_id);
        if (found) { setSearch(found.asset_tag || found.serial_number || found.name || ''); setPage(1); }
      }
    } catch { /* silent */ }
    finally { setAiSearching(false); }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { setSearch(''); setPage(1); setShowCamera(false); onClose(); } }}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            {ColIcon && <ColIcon className="w-4 h-4" />}
            Equipos en {col?.label}
            <span className="ml-auto text-xs font-normal text-muted-foreground">{items.length} total</span>
          </DialogTitle>
          <div className="flex gap-2 mt-3">
            <ScanSearchInput
              className="flex-1"
              value={search}
              onChange={v => { setSearch(v); setPage(1); }}
              placeholder="Buscar nombre, AF, serial, QR..."
            />
            <Button type="button" variant="outline" size="icon" className="rounded-xl shrink-0"
              title="Buscar por foto" onClick={() => setShowCamera(v => !v)}>
              {aiSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            </Button>
          </div>
          {showCamera && (
            <div className="mt-3">
              <CameraCapture onPhotoUploaded={handlePhotoSearch} isProcessing={aiSearching} />
            </div>
          )}
        </DialogHeader>

        {/* Item list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-10">Sin resultados</p>
          ) : (
            paginated.map((item, idx) => (
              <ExpandedItemRow key={item.id} item={item} isLast={idx === paginated.length - 1}
                onRestore={onRestore} onDelete={onDelete} onSaveNotes={onSaveNotes} user={user} />
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-border flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8 rounded-xl"
                disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce((acc, p, i, arr) => {
                  if (i > 0 && p - arr[i - 1] > 1) acc.push('…');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) => p === '…'
                  ? <span key={`g${i}`} className="px-1 text-xs text-muted-foreground">…</span>
                  : <Button key={p} variant={p === page ? 'default' : 'outline'} size="icon" className="h-8 w-8 rounded-xl text-xs" onClick={() => setPage(p)}>{p}</Button>
                )}
              <Button variant="outline" size="icon" className="h-8 w-8 rounded-xl"
                disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Compact row for the expand modal
function ExpandedItemRow({ item, isLast, onRestore, onDelete, onSaveNotes, user }) {
  const [restoring, setRestoring] = useState(false);
  const [deleting,  setDeleting]  = useState(false);
  const isDamaged = !!item.deleted_at;

  return (
    <div className={`glass-card rounded-xl p-3 flex items-center gap-3 ${isLast ? 'border border-primary/40' : ''}`}>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{item.name}</p>
        {(item.brand || item.model) && (
          <p className="text-xs text-muted-foreground truncate">{[item.brand, item.model].filter(Boolean).join(' · ')}</p>
        )}
        <div className="flex flex-wrap gap-x-3 mt-0.5">
          {item.asset_tag     && <span className="text-[10px] text-muted-foreground">AF: {item.asset_tag}</span>}
          {item.serial_number && <span className="text-[10px] text-muted-foreground">SN: {item.serial_number}</span>}
          {item.department_name && <span className="text-[10px] text-muted-foreground">{item.department_name}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-emerald-600"
          title="Restaurar a En Stock" disabled={restoring}
          onClick={async () => { setRestoring(true); await onRestore(item, true); setRestoring(false); }}>
          {restoring ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
        </Button>
        {isDamaged && (
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
            title="Eliminar permanentemente" disabled={deleting}
            onClick={async () => {
              if (!confirm(`¿Eliminar permanentemente "${item.name}"?`)) return;
              setDeleting(true); await onDelete(item); setDeleting(false);
            }}>
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Droppable column ─────────────────────────────────────────────────────────
function KanbanColumn({ col, items, search, onRestore, onDelete, onSaveNotes, user, onAddClick, onExpandClick }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });
  const ColIcon = col.icon;

  const filtered = items.filter(i => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [i.name, i.brand, i.model, i.asset_tag, i.service_tag, i.serial_number, i.department_name, i.category_name]
      .some(v => v?.toLowerCase().includes(q));
  });

  const isCollapsed = filtered.length > COLLAPSE_LIMIT;

  return (
    <div className="flex flex-col min-w-[260px] w-[260px]">
      <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl mb-3 border ${col.header}`}>
        <ColIcon className="w-4 h-4 shrink-0" />
        <span className="font-semibold text-sm flex-1">{col.label}</span>
        <span className="text-xs font-bold opacity-60 mr-1">{filtered.length}</span>
        <button onClick={onAddClick}
          className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          title={`Agregar equipo a ${col.label}`}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      <div ref={setNodeRef}
        className={`flex-1 min-h-[120px] space-y-3 rounded-xl transition-colors ${isOver ? 'bg-primary/5 ring-2 ring-primary/30' : ''}`}
      >
        {isCollapsed ? (
          /* Collapsed: show a single expand card */
          <button
            onClick={() => onExpandClick(col)}
            className="w-full glass-card rounded-xl p-4 border-2 border-primary/50 hover:border-primary hover:bg-primary/5 transition-all flex items-center gap-3 group"
          >
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Maximize2 className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold">{filtered.length} equipos</p>
              <p className="text-xs text-muted-foreground leading-snug">Ver todos en {col.label}</p>
            </div>
          </button>
        ) : (
          <>
            {filtered.map((item, idx) => (
              <KanbanCard key={item.id} item={item} col={col}
                isLast={idx === filtered.length - 1}
                onRestore={onRestore} onDelete={onDelete} onSaveNotes={onSaveNotes} user={user}
              />
            ))}
            {filtered.length === 0 && (
              <div className={`h-20 rounded-xl border-2 border-dashed flex items-center justify-center text-xs text-muted-foreground/40 transition-colors ${isOver ? 'border-primary/40' : 'border-border/40'}`}>
                {isOver ? 'Soltar aquí' : 'Sin equipos'}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Draggable card with history ──────────────────────────────────────────────
function KanbanCard({ item, col, onRestore, onDelete, onSaveNotes, user, overlay = false, isLast = false }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item.id });
  const [notesOpen,   setNotesOpen]   = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [notesVal,    setNotesVal]    = useState(item.notes || '');
  const [saving,    setSaving]    = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [deleting,  setDeleting]  = useState(false);

  const isDamaged = !!item.deleted_at;

  const { data: history = [], isFetching: loadingHistory } = useQuery({
    queryKey: ['item-logs', item.id],
    queryFn: () => api.get('/logs', { params: { item_id: item.id, limit: 20 } }).then(r => r.data),
    enabled: historyOpen,
    staleTime: 60_000,
  });

  const handleSave = async () => {
    setSaving(true);
    await onSaveNotes(item.id, notesVal);
    setSaving(false);
    setNotesOpen(false);
  };

  const handleRestore = async (e) => {
    e.stopPropagation();
    setRestoring(true);
    await onRestore(item);
    setRestoring(false);
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!confirm(`¿Eliminar permanentemente "${item.name}"? Esta acción NO se puede deshacer.`)) return;
    setDeleting(true);
    await onDelete(item);
    setDeleting(false);
  };

  return (
    <div ref={setNodeRef} style={{ opacity: isDragging ? 0.3 : 1 }}
      className={`glass-card rounded-xl p-3 select-none transition-shadow
        ${overlay ? 'shadow-2xl rotate-1' : 'hover:shadow-md'}
        ${isLast && !overlay ? 'border border-primary/50 ring-1 ring-primary/20' : ''}
      `}
    >
      {/* Drag handle + name */}
      <div className="flex items-start gap-2">
        <button {...attributes} {...listeners}
          className="mt-0.5 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground shrink-0"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-tight truncate">{item.name}</p>
          {(item.brand || item.model) && (
            <p className="text-xs text-muted-foreground truncate">{[item.brand, item.model].filter(Boolean).join(' · ')}</p>
          )}
        </div>
        {isLast && !overlay && (
          <span className="text-[9px] font-semibold uppercase tracking-wider text-primary/70 shrink-0 mt-0.5">último</span>
        )}
      </div>

      {/* Identifiers */}
      {(item.asset_tag || item.serial_number || item.service_tag) && (
        <div className="flex flex-wrap gap-x-2 mt-1.5 ml-5">
          {item.asset_tag     && <span className="text-[10px] text-muted-foreground">AF: {item.asset_tag}</span>}
          {item.service_tag   && <span className="text-[10px] text-muted-foreground">ST: {item.service_tag}</span>}
          {item.serial_number && <span className="text-[10px] text-muted-foreground">SN: {item.serial_number}</span>}
        </div>
      )}

      {/* Tags */}
      <div className="flex gap-1 mt-2 ml-5 flex-wrap">
        {item.category_name && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-muted text-[10px] text-muted-foreground">{item.category_name}</span>
        )}
        {item.department_name && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-muted text-[10px] text-muted-foreground">{item.department_name}</span>
        )}
      </div>

      {/* Notes */}
      {item.notes && !notesOpen && (
        <p className="mt-2 ml-5 text-[11px] text-muted-foreground italic line-clamp-2">{item.notes}</p>
      )}
      {notesOpen && (
        <div className="mt-2 ml-5 space-y-1.5">
          <Textarea autoFocus value={notesVal} onChange={e => setNotesVal(e.target.value)}
            placeholder="Observaciones..." className="text-xs min-h-[70px] resize-none rounded-lg"
          />
          <div className="flex gap-1">
            <Button size="sm" className="h-6 text-[11px] px-2 gap-1" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Guardar
            </Button>
            <Button size="sm" variant="ghost" className="h-6 text-[11px] px-2"
              onClick={() => { setNotesOpen(false); setNotesVal(item.notes || ''); }}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* History timeline */}
      {historyOpen && (
        <div className="mt-3 ml-5">
          {loadingHistory ? (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground py-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Cargando…
            </div>
          ) : history.length === 0 ? (
            <p className="text-[11px] text-muted-foreground py-1">Sin historial registrado</p>
          ) : (
            <div className="relative pl-4">
              <div className="absolute left-1.5 top-1 bottom-1 w-px bg-border" />
              <div className="space-y-2.5">
                {history.map(log => (
                  <div key={log.id} className="relative">
                    <div className={`absolute -left-[11px] top-1 w-2.5 h-2.5 rounded-full border-2 border-background ${getLogDot(log)}`} />
                    <p className="text-[11px] font-medium leading-snug">{getLogLabel(log)}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatDate(log.timestamp)}{log.performed_by ? ` · ${log.performed_by}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 mt-2 ml-5">
        <button onClick={() => setNotesOpen(v => !v)}
          className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2"
        >
          {notesOpen ? 'Cerrar' : item.notes ? 'Editar obs.' : '+ Observación'}
        </button>
        <button onClick={() => setHistoryOpen(v => !v)}
          className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 ml-2"
          title="Ver historial de estados"
        >
          <Clock className="w-3 h-3" />
          {historyOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
        <div className="flex-1" />
        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-emerald-600"
          title="Restaurar a En Stock" disabled={restoring} onClick={handleRestore}
        >
          {restoring ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
        </Button>
        {isDamaged && (
          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive"
            title="Eliminar permanentemente" disabled={deleting} onClick={handleDelete}
          >
            {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function DamagedItems() {
  const queryClient    = useQueryClient();
  const { toast }      = useToast();
  const { user }       = useAuth();
  const [search, setSearch]           = useState('');
  const [activeItem, setActiveItem]   = useState(null);
  const [addColModal, setAddColModal] = useState(null);
  const [expandCol,   setExpandCol]   = useState(null); // column to show in expand modal

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['inventory-damaged'],
    queryFn:  () => api.get('/inventory/damaged?limit=500').then(r => r.data),
  });

  // checked_out always empty on board — items restore instantly
  const byStatus = useCallback((statusId) => {
    return items.filter(i => {
      const st = i.deleted_at ? 'damaged' : i.status;
      return st === statusId && st !== 'checked_out';
    });
  }, [items]);

  const changeStatus = async (item, newStatus) => {
    try {
      if (newStatus === 'in_stock') {
        await api.patch(`/inventory/${item.id}/restore`, {
          performed_by: user?.full_name || user?.email || 'Sistema',
          performed_by_id: user?.id,
        });
      } else {
        await api.patch(`/inventory/${item.id}/status`, {
          new_status:      newStatus,
          performed_by:    user?.full_name || user?.email || 'Sistema',
          performed_by_id: user?.id,
          notes: `Movido a ${COLUMNS.find(c => c.id === newStatus)?.label} vía Tablero`,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['inventory-damaged'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast({
        title: 'Estado actualizado',
        description: `${item.name} → ${COLUMNS.find(c => c.id === newStatus)?.label || 'En Stock'}`,
      });
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.error || 'No se pudo cambiar el estado', variant: 'destructive' });
      throw err;
    }
  };

  const handleDragEnd = async ({ active, over }) => {
    setActiveItem(null);
    if (!over || active.id === over.id) return;
    const targetCol = COLUMNS.find(c => c.id === over.id);
    if (!targetCol) return;
    const item = items.find(i => i.id === active.id);
    if (!item) return;
    const currentStatus = item.deleted_at ? 'damaged' : item.status;
    if (currentStatus === over.id) return;

    if (targetCol.restoreOnDrop) {
      await handleRestore(item, true);
    } else {
      await changeStatus(item, over.id);
    }
  };

  const handleDragStart = ({ active }) => {
    setActiveItem(items.find(i => i.id === active.id) || null);
  };

  const handleRestore = async (item, skipConfirm = false) => {
    if (!skipConfirm && !confirm(`¿Restaurar "${item.name}" al inventario como En Stock?`)) return;
    try {
      await api.patch(`/inventory/${item.id}/restore`, {
        performed_by: user?.full_name || user?.email || 'Sistema',
        performed_by_id: user?.id,
      });
      queryClient.invalidateQueries({ queryKey: ['inventory-damaged'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast({ title: 'Equipo restaurado', description: `${item.name} está de vuelta en inventario` });
    } catch (err) {
      toast({ title: 'Error al restaurar', description: err.response?.data?.error || 'Error', variant: 'destructive' });
    }
  };

  const handleDelete = async (item) => {
    try {
      await api.delete(`/inventory/${item.id}/permanent`);
      queryClient.invalidateQueries({ queryKey: ['inventory-damaged'] });
      toast({ title: 'Eliminado permanentemente', description: item.name });
    } catch (err) {
      toast({ title: 'Error al eliminar', description: err.response?.data?.error || 'Error', variant: 'destructive' });
    }
  };

  const handleSaveNotes = async (id, notes) => {
    try {
      await api.patch(`/inventory/${id}/notes`, { notes });
      queryClient.invalidateQueries({ queryKey: ['inventory-damaged'] });
      toast({ title: 'Observación guardada' });
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.error || 'Error', variant: 'destructive' });
    }
  };

  const total = items.filter(i => i.status !== 'checked_out').length;

  // Items for the currently expanded column
  const expandItems = expandCol ? byStatus(expandCol.id) : [];

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Tablero"
        subtitle={`${total} equipo${total !== 1 ? 's' : ''} en seguimiento`}
        icon={LayoutGrid}
      />

      <div className="max-w-sm mb-6">
        <ScanSearchInput value={search} onChange={setSearch} placeholder="Buscar equipo..." />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /><span>Cargando…</span>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter}
          onDragStart={handleDragStart} onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-6 flex-1">
            {COLUMNS.map(col => (
              <KanbanColumn key={col.id} col={col} items={byStatus(col.id)} search={search}
                onRestore={handleRestore} onDelete={handleDelete}
                onSaveNotes={handleSaveNotes} user={user}
                onAddClick={() => setAddColModal(col)}
                onExpandClick={setExpandCol}
              />
            ))}
          </div>

          <DragOverlay>
            {activeItem && (
              <KanbanCard item={activeItem}
                col={COLUMNS.find(c => c.id === (activeItem.deleted_at ? 'damaged' : activeItem.status)) || COLUMNS[0]}
                onRestore={() => {}} onDelete={() => {}} onSaveNotes={() => {}} user={user} overlay
              />
            )}
          </DragOverlay>
        </DndContext>
      )}

      {!isLoading && (
        <p className="text-xs text-muted-foreground mt-2">
          <CheckCircle2 className="w-3 h-3 inline mr-1" />
          Arrastra entre columnas para cambiar estado. <RotateCcw className="w-3 h-3 inline" /> restaura a En Stock. Columnas con más de {COLLAPSE_LIMIT} equipos se colapsan.
        </p>
      )}

      <AddToColumnModal col={addColModal} open={!!addColModal}
        onClose={() => setAddColModal(null)} onAdd={changeStatus}
      />

      <ColumnExpandModal
        col={expandCol}
        items={expandItems}
        open={!!expandCol}
        onClose={() => setExpandCol(null)}
        onRestore={handleRestore}
        onDelete={handleDelete}
        onSaveNotes={handleSaveNotes}
        user={user}
      />
    </div>
  );
}
