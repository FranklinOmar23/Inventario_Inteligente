import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import {
  Monitor, Plus, Pencil, Trash2, Search, X,
  ChevronDown, ChevronRight, Eye,
  Cpu, Globe, HardDrive, Calendar, Network,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import api from '@/api/client';
import PageHeader from '@/components/shared/PageHeader';

const EMPTY = {
  department: '', section: '', punto_de_red: '', numero: '', posicion: '',
  ip_address: '', so: '', hardware: '', full_device_name: '', installed_on: '',
  notes: '', status: 'active',
};

const fmtDate = (d) => {
  if (!d) return null;
  const s = typeof d === 'string' ? d : d.toISOString();
  return new Date(s).toLocaleDateString('es-DO');
};

const toInput = (d) => {
  if (!d) return '';
  const s = typeof d === 'string' ? d : d.toISOString();
  return s.slice(0, 10);
};

/* ── Detail dialog ──────────────────────────────────────────────────────── */
function DetailDialog({ machine: m, onClose, onEdit, isAdmin }) {
  if (!m) return null;
  const active = m.status === 'active';
  const color  = active ? '#22c55e' : '#ef4444';

  const Row = ({ icon: Icon, label, value }) =>
    value ? (
      <div className="flex items-start gap-3 py-2.5 border-b border-border last:border-0">
        <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="text-sm font-medium break-words">{value}</p>
        </div>
      </div>
    ) : null;

  return (
    <Dialog open={!!m} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {/* status dot */}
            <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
              {[0, 0.5, 1].map((d, i) => (
                <span key={i} className="absolute inset-0 rounded-full"
                  style={{ border: `1.5px solid ${color}`, animation: 'water-wave 2s ease-out infinite', animationDelay: `${d}s`, opacity: 0 }} />
              ))}
              <span className="w-3 h-3 rounded-full z-10 relative"
                style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}90` }} />
            </div>
            <div>
              <DialogTitle className="text-base">{m.posicion || 'Sin nombre'}</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                <span className="font-semibold" style={{ color }}>{active ? 'Activo' : 'Inactivo'}</span>
                {m.numero != null && <span className="ml-2">· No. {m.numero}</span>}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Section / dept badges */}
        <div className="flex flex-wrap gap-1.5 -mt-1">
          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#1F3864]/20 text-[#7aaeff] border border-[#1F3864]/30">
            {m.department}
          </span>
          {m.section && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#2E75B6]/15 text-[#6bb3f5] border border-[#2E75B6]/25">
              {m.section}
            </span>
          )}
        </div>

        {/* Fields */}
        <div className="divide-y divide-border">
          <Row icon={Globe}    label="IP Address"      value={m.ip_address} />
          <Row icon={Network}  label="Punto de Red"    value={m.punto_de_red} />
          <Row icon={Monitor}  label="Full Device Name" value={m.full_device_name} />
          <Row icon={Cpu}      label="Hardware"        value={m.hardware} />
          <Row icon={HardDrive} label="Sistema Operativo" value={m.so} />
          <Row icon={Calendar} label="Installed On"    value={fmtDate(m.installed_on)} />
          {m.notes && <Row icon={Monitor} label="Notas" value={m.notes} />}
        </div>

        {isAdmin && (
          <div className="flex justify-end pt-2">
            <Button size="sm" onClick={() => { onClose(); onEdit(m); }}>
              <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ── Add/Edit dialog ────────────────────────────────────────────────────── */
function MachineDialog({ open, onClose, initial, onSave }) {
  const [form, setForm] = useState(initial ?? EMPTY);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  React.useEffect(() => { setForm(initial ?? EMPTY); }, [initial]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.department.trim()) return toast({ title: 'El departamento es requerido', variant: 'destructive' });
    setSaving(true);
    try {
      await onSave({ ...form, numero: form.numero !== '' ? Number(form.numero) : null });
      onClose();
    } catch {
      toast({ title: 'Error al guardar', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const field = (label, key, opts = {}) => (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input value={form[key] ?? ''} onChange={e => set(key, e.target.value)} className="mt-1 h-8 text-sm" {...opts} />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? 'Editar Máquina' : 'Agregar Máquina'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3 pt-2">
          <div className="col-span-2">{field('Departamento *', 'department', { placeholder: 'ej. DEPARTAMENTO CARIBE PACK' })}</div>
          {field('Sección', 'section', { placeholder: 'ej. CAJAS' })}
          {field('Punto de Red', 'punto_de_red')}
          {field('No.', 'numero', { type: 'number' })}
          {field('Posición', 'posicion')}
          {field('IP Address', 'ip_address', { placeholder: '192.168.x.x' })}
          {field('Sistema Operativo', 'so')}
          <div className="col-span-2">{field('Hardware', 'hardware', { placeholder: 'DELL OptiPlex 7050, i5 7th Gen, 16 RAM, 238GB SSD' })}</div>
          {field('Full Device Name', 'full_device_name')}
          {field('Installed On', 'installed_on', { type: 'date' })}
          <div className="col-span-2">{field('Notas', 'notes')}</div>

          {/* Status selector */}
          <div className="col-span-2 flex items-center gap-3">
            <Label className="text-xs">Estado</Label>
            <div className="flex gap-2">
              {[
                { key: 'active',   label: 'Activo',    cls: 'bg-green-500 text-white border-green-500' },
                { key: 'inactive', label: 'Inactivo',  cls: 'bg-red-500 text-white border-red-500' },
              ].map(({ key, label, cls }) => (
                <button
                  key={key} type="button" onClick={() => set('status', key)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                    form.status === key ? cls : 'border-border text-muted-foreground hover:border-primary'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="col-span-2 flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── Machine card ───────────────────────────────────────────────────────── */
function MachineCard({ m, onEdit, onDelete, onToggle, onView, isAdmin }) {
  const active = m.status === 'active';
  const color  = active ? '#22c55e' : '#ef4444';

  return (
    <div className="relative">
      {/* Wave rings — card-shaped, expand outward */}
      {[0, 0.55, 1.1].map((d, i) => (
        <span key={i} className="absolute inset-0 rounded-xl pointer-events-none"
          style={{ border: `1.5px solid ${color}`, animation: 'water-wave 2.2s ease-out infinite', animationDelay: `${d}s`, opacity: 0 }} />
      ))}

      {/* Card */}
      <div
        className="relative flex flex-col bg-card border rounded-xl overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5"
        style={{ borderColor: `${color}55` }}
      >
        {/* Top bar */}
        <div className="h-1 w-full" style={{ backgroundColor: color }} />

        {/* Header */}
        <div className="flex items-start gap-2 px-3 pt-2.5 pb-1">
          {/* Status dot — toggle on click */}
          <button
            onClick={isAdmin ? () => onToggle(m.id) : undefined}
            title={isAdmin ? (active ? 'Activo — clic para desactivar' : 'Inactivo — clic para activar') : undefined}
            className={`mt-1 shrink-0 ${isAdmin ? 'cursor-pointer' : 'cursor-default'}`}
            style={{ background: 'none', border: 'none', padding: 0 }}
          >
            <span className="block w-3 h-3 rounded-full"
              style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}90` }} />
          </button>

          <div className="min-w-0 flex-1">
            <p className="font-bold text-sm leading-tight text-foreground truncate">{m.posicion || '—'}</p>
            {m.numero != null && <p className="text-[10px] text-muted-foreground">No. {m.numero}</p>}
          </div>

          {/* Action icons */}
          <div className="flex gap-0.5 shrink-0">
            <button onClick={() => onView(m)}
              className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-primary"
              title="Ver detalles">
              <Eye className="w-3.5 h-3.5" />
            </button>
            {isAdmin && (
              <>
                <button onClick={() => onEdit(m)}
                  className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  title="Editar">
                  <Pencil className="w-3 h-3" />
                </button>
                <button onClick={() => onDelete(m.id)}
                  className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-destructive"
                  title="Eliminar">
                  <Trash2 className="w-3 h-3" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="px-3 pb-3 space-y-1 flex-1">
          {m.ip_address && (
            <p className="font-mono text-xs font-semibold" style={{ color: '#38bdf8' }}>{m.ip_address}</p>
          )}
          {m.punto_de_red && (
            <p className="text-[10px] text-muted-foreground font-mono">{m.punto_de_red}</p>
          )}
          {m.hardware && (
            <p className="text-[10px] text-muted-foreground leading-tight line-clamp-2">{m.hardware}</p>
          )}
          {m.full_device_name && (
            <p className="text-[10px] font-mono truncate text-foreground/60">{m.full_device_name}</p>
          )}
          {m.so && (
            <p className="text-[10px] text-muted-foreground truncate">{m.so}</p>
          )}
        </div>

        {/* Footer */}
        {m.installed_on && (
          <div className="px-3 py-1.5 border-t text-[10px] text-muted-foreground"
            style={{ borderColor: `${color}20`, backgroundColor: `${color}08` }}>
            Instalado: {fmtDate(m.installed_on)}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main page ──────────────────────────────────────────────────────────── */
export default function Maquinas() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const qc = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch]           = useState('');
  const [editOpen, setEditOpen]       = useState(false);
  const [editing, setEditing]         = useState(null);
  const [detailMachine, setDetail]    = useState(null);
  const [collapsed, setCollapsed]     = useState({});
  const [filterStatus, setFilterStatus] = useState('all');

  const { data: machines = [], isLoading } = useQuery({
    queryKey: ['machines'],
    queryFn: () => api.get('/machines').then(r => r.data),
  });

  const createMut = useMutation({
    mutationFn: (body) => api.post('/machines', body).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['machines'] }); toast({ title: 'Máquina agregada' }); },
    onError:   () => toast({ title: 'Error al agregar', variant: 'destructive' }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, ...body }) => api.put(`/machines/${id}`, body).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['machines'] }); toast({ title: 'Actualizado' }); },
    onError:   () => toast({ title: 'Error al actualizar', variant: 'destructive' }),
  });

  const toggleMut = useMutation({
    mutationFn: (id) => api.patch(`/machines/${id}/status`).then(r => r.data),
    onSuccess: (row) => {
      // Update cache immediately AND mark for background refetch
      qc.setQueryData(['machines'], (old = []) => old.map(m => m.id === row.id ? { ...m, status: row.status } : m));
      qc.invalidateQueries({ queryKey: ['machines'] });
      toast({ title: row.status === 'active' ? 'Marcado como activo' : 'Marcado como inactivo' });
    },
    onError: () => toast({ title: 'Error al cambiar estado', variant: 'destructive' }),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/machines/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['machines'] }); toast({ title: 'Eliminada' }); },
    onError:   () => toast({ title: 'Error al eliminar', variant: 'destructive' }),
  });

  const handleSave = (form) => {
    if (editing) return updateMut.mutateAsync({ id: editing.id, ...form });
    return createMut.mutateAsync(form);
  };

  const handleEdit = (m) => {
    setEditing({ ...m, installed_on: toInput(m.installed_on) });
    setEditOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Eliminar esta máquina?')) deleteMut.mutate(id);
  };

  const filtered = useMemo(() => {
    let list = machines;
    if (filterStatus !== 'all') list = list.filter(m => m.status === filterStatus);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(m =>
        [m.department, m.section, m.posicion, m.ip_address, m.hardware, m.full_device_name, m.punto_de_red]
          .some(v => v?.toLowerCase().includes(q))
      );
    }
    return list;
  }, [machines, search, filterStatus]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const m of filtered) {
      if (!map.has(m.department)) map.set(m.department, new Map());
      const sec = m.section ?? '__none__';
      if (!map.get(m.department).has(sec)) map.get(m.department).set(sec, []);
      map.get(m.department).get(sec).push(m);
    }
    return map;
  }, [filtered]);

  const activeCount   = machines.filter(m => m.status === 'active').length;
  const inactiveCount = machines.filter(m => m.status === 'inactive').length;

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="Máquinas"
        subtitle={`${machines.length} equipos · ${activeCount} activos · ${inactiveCount} inactivos`}
        icon={Monitor}
        actions={isAdmin && (
          <Button size="sm" onClick={() => { setEditing(null); setEditOpen(true); }}>
            <Plus className="w-4 h-4 mr-1" /> Agregar
          </Button>
        )}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por IP, posición, hardware…"
            className="pl-8 pr-8 h-9 w-64" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {[
          { key: 'all',      label: 'Todos' },
          { key: 'active',   label: `Activos (${activeCount})` },
          { key: 'inactive', label: `Inactivos (${inactiveCount})` },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setFilterStatus(key)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
              filterStatus === key ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground hover:border-primary'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">Cargando…</div>
      )}
      {!isLoading && grouped.size === 0 && (
        <div className="text-center py-20 text-muted-foreground text-sm">
          {search || filterStatus !== 'all' ? 'Sin resultados.' : 'No hay máquinas registradas.'}
        </div>
      )}

      {!isLoading && [...grouped.entries()].map(([dept, sections]) => {
        const isCollapsed = collapsed[dept];
        const allRows     = [...sections.values()].flat();
        const deptActive  = allRows.filter(m => m.status === 'active').length;

        return (
          <div key={dept} className="rounded-xl border border-border overflow-hidden shadow-sm">
            <button
              onClick={() => setCollapsed(p => ({ ...p, [dept]: !p[dept] }))}
              className="w-full flex items-center gap-2 px-4 py-2.5 bg-[#1F3864] text-white font-bold text-sm text-left hover:bg-[#162a50] transition-colors"
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
              <span className="flex-1 uppercase tracking-wide">{dept}</span>
              <span className="flex items-center gap-2 text-xs font-normal">
                <span className="text-green-400">{deptActive} activos</span>
                <span className="text-white/40">·</span>
                <span className="text-white/60">{allRows.length} total</span>
              </span>
            </button>

            {!isCollapsed && (
              <div className="divide-y divide-border">
                {[...sections.entries()].map(([sec, rows]) => (
                  <div key={sec} className="p-4">
                    {sec !== '__none__' && (
                      <p className="text-xs font-semibold text-[#2E75B6] uppercase tracking-wide mb-3">
                        {sec}<span className="ml-2 text-muted-foreground font-normal normal-case">({rows.length})</span>
                      </p>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                      {rows.map(m => (
                        <MachineCard key={m.id} m={m}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          onToggle={(id) => toggleMut.mutate(id)}
                          onView={setDetail}
                          isAdmin={isAdmin}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Detail dialog */}
      <DetailDialog
        machine={detailMachine}
        onClose={() => setDetail(null)}
        onEdit={handleEdit}
        isAdmin={isAdmin}
      />

      {/* Add/Edit dialog */}
      <MachineDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        initial={editing}
        onSave={handleSave}
      />
    </div>
  );
}
