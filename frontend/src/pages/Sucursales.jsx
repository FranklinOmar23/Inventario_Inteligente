import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { MapPin, Plus, Trash2, Loader2, Building2, ArrowRight, Pencil, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import api from '@/api/client';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';

const EMPTY_SUC  = { name: '', address: '', manager: '', phone: '' };
const EMPTY_DEPT = { name: '', manager: '', description: '' };

export default function Sucursales() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Sucursal create/edit
  const [open, setOpen]       = useState(false);
  const [saving, setSaving]   = useState(false);
  const [form, setForm]       = useState(EMPTY_SUC);
  const [editing, setEditing] = useState(null);

  // Department add-to-sucursal dialog
  const [addDeptFor, setAddDeptFor]   = useState(null); // { id, name } of the parent sucursal
  const [deptForm, setDeptForm]       = useState(EMPTY_DEPT);
  const [savingDept, setSavingDept]   = useState(false);

  const { data: sucursales = [] } = useQuery({
    queryKey: ['sucursales'],
    queryFn: () => api.get('/sucursales').then(r => r.data),
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.get('/departments').then(r => r.data),
  });

  const { data: items = [] } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => api.get('/inventory?limit=500').then(r => r.data),
  });

  const f = v => setForm(p => ({ ...p, ...v }));

  /* ── Sucursal CRUD ── */
  const handleCreate = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      await api.post('/sucursales', form);
      queryClient.invalidateQueries({ queryKey: ['sucursales'] });
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setOpen(false); setForm(EMPTY_SUC);
      toast({ title: 'Sucursal creada', description: `${form.name} — departamento "General" creado automáticamente` });
    } finally { setSaving(false); }
  };

  const handleUpdate = async () => {
    if (!editing?.name) return;
    setSaving(true);
    try {
      await api.put(`/sucursales/${editing.id}`, editing);
      queryClient.invalidateQueries({ queryKey: ['sucursales'] });
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setEditing(null);
      toast({ title: 'Sucursal actualizada' });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`¿Eliminar la sucursal "${name}"?\nLos departamentos e ítems asociados quedarán sin sucursal.`)) return;
    await api.delete(`/sucursales/${id}`);
    queryClient.invalidateQueries({ queryKey: ['sucursales'] });
    toast({ title: 'Sucursal eliminada' });
  };

  /* ── Department add ── */
  const openAddDept = (suc) => {
    setAddDeptFor(suc);
    setDeptForm(EMPTY_DEPT);
  };

  const handleCreateDept = async () => {
    if (!deptForm.name || !addDeptFor) return;
    setSavingDept(true);
    try {
      await api.post('/departments', {
        ...deptForm,
        sucursal_id:   addDeptFor.id,
        sucursal_name: addDeptFor.name,
      });
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setAddDeptFor(null);
      toast({ title: 'Departamento creado', description: `${deptForm.name} → ${addDeptFor.name}` });
    } finally { setSavingDept(false); }
  };

  return (
    <div>
      <PageHeader
        title="Sucursales"
        subtitle={`${sucursales.length} sucursales registradas`}
        icon={MapPin}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl gap-2"><Plus className="w-4 h-4" /> Nueva Sucursal</Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <DialogHeader><DialogTitle>Nueva Sucursal</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Nombre *</Label>
                  <Input value={form.name} onChange={e => f({ name: e.target.value })}
                    placeholder="Ej: Sede Central, Sucursal Norte" className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Responsable</Label>
                  <Input value={form.manager} onChange={e => f({ manager: e.target.value })}
                    placeholder="Nombre del encargado" className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Teléfono</Label>
                  <Input value={form.phone} onChange={e => f({ phone: e.target.value })}
                    placeholder="809-000-0000" className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Dirección</Label>
                  <Textarea value={form.address} onChange={e => f({ address: e.target.value })}
                    placeholder="Dirección física" className="rounded-xl" rows={2} />
                </div>
                <p className="text-xs text-muted-foreground">Se creará un departamento "General" por defecto.</p>
                <Button onClick={handleCreate} disabled={saving || !form.name} className="w-full rounded-xl">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Crear Sucursal
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Add department dialog */}
      <Dialog open={!!addDeptFor} onOpenChange={v => !v && setAddDeptFor(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Nuevo Departamento</DialogTitle>
            {addDeptFor && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3" /> {addDeptFor.name}
              </p>
            )}
          </DialogHeader>
          <div className="space-y-4 mt-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nombre *</Label>
              <Input value={deptForm.name}
                onChange={e => setDeptForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Ej: Tecnología, RRHH, Finanzas" className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Responsable</Label>
              <Input value={deptForm.manager}
                onChange={e => setDeptForm(p => ({ ...p, manager: e.target.value }))}
                placeholder="Nombre del encargado" className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Descripción</Label>
              <Textarea value={deptForm.description}
                onChange={e => setDeptForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Descripción opcional" className="rounded-xl" rows={2} />
            </div>
            <Button onClick={handleCreateDept} disabled={savingDept || !deptForm.name} className="w-full rounded-xl">
              {savingDept ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Agregar Departamento
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {sucursales.length === 0 ? (
        <EmptyState icon={MapPin} title="Sin sucursales"
          description="Crea la primera sucursal para organizar tus departamentos"
          action={<Button variant="outline" className="rounded-xl" onClick={() => setOpen(true)}>Crear Sucursal</Button>} />
      ) : (
        <div className="space-y-4">
          {sucursales.map(suc => {
            const sucDepts = departments.filter(d => d.sucursal_id === suc.id);
            const sucItems = items.filter(i => i.sucursal_id === suc.id);
            const inStock  = sucItems.filter(i => i.status === 'in_stock').length;

            if (editing?.id === suc.id) {
              return (
                <div key={suc.id} className="glass-card rounded-2xl p-5 border-2 border-primary/30">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Nombre *</Label>
                      <Input value={editing.name} onChange={e => setEditing(p => ({ ...p, name: e.target.value }))} className="rounded-xl" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Responsable</Label>
                      <Input value={editing.manager} onChange={e => setEditing(p => ({ ...p, manager: e.target.value }))} className="rounded-xl" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Teléfono</Label>
                      <Input value={editing.phone} onChange={e => setEditing(p => ({ ...p, phone: e.target.value }))} className="rounded-xl" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Dirección</Label>
                      <Input value={editing.address} onChange={e => setEditing(p => ({ ...p, address: e.target.value }))} className="rounded-xl" />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button size="sm" className="rounded-xl gap-1.5" onClick={handleUpdate} disabled={saving}>
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Guardar
                    </Button>
                    <Button size="sm" variant="ghost" className="rounded-xl gap-1.5" onClick={() => setEditing(null)}>
                      <X className="w-3.5 h-3.5" /> Cancelar
                    </Button>
                  </div>
                </div>
              );
            }

            return (
              <div key={suc.id} className="glass-card rounded-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-start justify-between p-5 border-b border-border">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="font-bold text-base">{suc.name}</h2>
                      {suc.manager && <p className="text-xs text-muted-foreground">Responsable: {suc.manager}</p>}
                      {suc.phone   && <p className="text-xs text-muted-foreground">{suc.phone}</p>}
                      {suc.address && <p className="text-xs text-muted-foreground mt-0.5">{suc.address}</p>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => setEditing({ id: suc.id, name: suc.name, manager: suc.manager || '', phone: suc.phone || '', address: suc.address || '' })}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(suc.id, suc.name)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 divide-x divide-border bg-muted/20 text-center text-xs py-2.5">
                  <div><span className="font-bold text-foreground text-sm">{sucDepts.length}</span><br /><span className="text-muted-foreground">departamentos</span></div>
                  <div><span className="font-bold text-foreground text-sm">{sucItems.length}</span><br /><span className="text-muted-foreground">equipos</span></div>
                  <div><span className="font-bold text-emerald-600 text-sm">{inStock}</span><br /><span className="text-muted-foreground">en stock</span></div>
                </div>

                {/* Departments grid */}
                <div className="p-4">
                  {sucDepts.length > 0 && (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-3">
                      {sucDepts.map(dept => {
                        const deptItems = items.filter(i => i.department_id === dept.id);
                        return (
                          <Link key={dept.id} to={`/departments/${dept.id}`}
                            className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/60 transition-colors group">
                            <div className="flex items-center gap-2 min-w-0">
                              <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{dept.name}</p>
                                {dept.manager && <p className="text-xs text-muted-foreground truncate">{dept.manager}</p>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-xs text-muted-foreground">{deptItems.length} items</span>
                              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}

                  {/* Add department button — always visible */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl gap-1.5 text-xs border-dashed"
                    onClick={() => openAddDept({ id: suc.id, name: suc.name })}
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar departamento
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
