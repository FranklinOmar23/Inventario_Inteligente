import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Building2, Plus, Trash2, Loader2, ArrowRight, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import api from '@/api/client';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';

const EMPTY = { name: '', description: '', manager: '', sucursal_id: '', sucursal_name: '' };

export default function Departments() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen]   = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm]   = useState(EMPTY);
  const [sucursalFilter, setSucursalFilter] = useState('all');

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.get('/departments').then(r => r.data),
  });

  const { data: sucursales = [] } = useQuery({
    queryKey: ['sucursales'],
    queryFn: () => api.get('/sucursales').then(r => r.data),
  });

  const { data: items = [] } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => api.get('/inventory?limit=500').then(r => r.data),
  });

  const filtered = sucursalFilter === 'all'
    ? departments
    : departments.filter(d => d.sucursal_id === sucursalFilter);

  // Group departments by sucursal
  const grouped = sucursales.reduce((acc, s) => {
    acc[s.id] = { sucursal: s, depts: filtered.filter(d => d.sucursal_id === s.id) };
    return acc;
  }, {});
  const unassigned = filtered.filter(d => !d.sucursal_id);

  const handleCreate = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      const sel = sucursales.find(s => s.id === form.sucursal_id);
      await api.post('/departments', { ...form, sucursal_name: sel?.name || '' });
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setOpen(false); setForm(EMPTY);
      toast({ title: 'Departamento creado', description: form.name });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este departamento?')) return;
    await api.delete(`/departments/${id}`);
    queryClient.invalidateQueries({ queryKey: ['departments'] });
    toast({ title: 'Departamento eliminado' });
  };

  const DeptCard = ({ dept }) => {
    const deptItems = items.filter(i => i.department_id === dept.id);
    const inStock   = deptItems.filter(i => i.status === 'in_stock').length;
    return (
      <div className="glass-card rounded-2xl p-5 hover:shadow-xl transition-all group relative">
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <Button variant="ghost" size="icon"
            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive h-8 w-8"
            onClick={e => { e.preventDefault(); handleDelete(dept.id); }}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
        <h3 className="font-semibold">{dept.name}</h3>
        {dept.manager && <p className="text-xs text-muted-foreground mt-0.5">{dept.manager}</p>}
        {dept.description && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{dept.description}</p>}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border text-xs text-muted-foreground">
          <div className="flex gap-3">
            <span>{deptItems.length} items</span>
            <span className="text-emerald-600">{inStock} en stock</span>
          </div>
          <Link to={`/departments/${dept.id}`}
            className="flex items-center gap-1 text-primary hover:underline font-medium">
            Ver <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  };

  return (
    <div>
      <PageHeader
        title="Departamentos"
        subtitle={`${departments.length} departamentos`}
        icon={Building2}
        actions={
          <div className="flex gap-2">
            {sucursales.length > 1 && (
              <Select value={sucursalFilter} onValueChange={setSucursalFilter}>
                <SelectTrigger className="w-44 rounded-xl h-9 text-sm">
                  <SelectValue placeholder="Todas las sucursales" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las sucursales</SelectItem>
                  {sucursales.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-xl"><Plus className="w-4 h-4 mr-2" /> Nuevo</Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl">
                <DialogHeader><DialogTitle>Nuevo Departamento</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-4">
                  {sucursales.length > 0 && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Sucursal</Label>
                      <Select value={form.sucursal_id} onValueChange={v => setForm(p => ({ ...p, sucursal_id: v }))}>
                        <SelectTrigger className="rounded-xl"><SelectValue placeholder="Seleccionar sucursal" /></SelectTrigger>
                        <SelectContent>
                          {sucursales.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nombre *</Label>
                    <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ej: IT, RRHH, Finanzas" className="rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Responsable</Label>
                    <Input value={form.manager} onChange={e => setForm(p => ({ ...p, manager: e.target.value }))} placeholder="Nombre del encargado" className="rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Descripción</Label>
                    <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Descripción" className="rounded-xl" rows={2} />
                  </div>
                  <Button onClick={handleCreate} disabled={saving} className="w-full rounded-xl">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Crear Departamento
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {departments.length === 0 ? (
        <EmptyState icon={Building2} title="Sin departamentos"
          description="Crea el primer departamento para organizar el inventario"
          action={<Button variant="outline" className="rounded-xl" onClick={() => setOpen(true)}>Crear Departamento</Button>} />
      ) : (
        <div className="space-y-6">
          {/* Grouped by sucursal */}
          {sucursales.map(s => {
            const depts = grouped[s.id]?.depts || [];
            if (depts.length === 0) return null;
            return (
              <div key={s.id}>
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{s.name}</h2>
                  <span className="text-xs text-muted-foreground">({depts.length})</span>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {depts.map(dept => <DeptCard key={dept.id} dept={dept} />)}
                </div>
              </div>
            );
          })}

          {/* Unassigned */}
          {unassigned.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Sin Sucursal</h2>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {unassigned.map(dept => <DeptCard key={dept.id} dept={dept} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
