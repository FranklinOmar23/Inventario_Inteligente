import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Tags, Plus, Trash2, Loader2, ArrowRight, CornerDownRight, FolderPlus, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import api from '@/api/client';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';

const EMPTY = { name: '', requires_asset_tag: false, requires_unique_id: false, minimum_stock: 5, parent_id: null };

export default function Categories() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [open, setOpen]     = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm]     = useState(EMPTY);

  // Edit state
  const [editOpen, setEditOpen]     = useState(false);
  const [editId, setEditId]         = useState(null);
  const [editForm, setEditForm]     = useState(EMPTY);
  const [editSaving, setEditSaving] = useState(false);

  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: () => api.get('/categories').then((r) => r.data) });
  const { data: items = [] }      = useQuery({ queryKey: ['inventory'],  queryFn: () => api.get('/inventory?limit=200').then((r) => r.data) });

  const topLevel    = useMemo(() => categories.filter((c) => !c.parent_id), [categories]);
  const childrenOf  = (id) => categories.filter((c) => c.parent_id === id);

  const openCreate = (parentId = null) => {
    setForm({ ...EMPTY, parent_id: parentId });
    setOpen(true);
  };

  const openEdit = (cat, e) => {
    e?.stopPropagation();
    setEditId(cat.id);
    setEditForm({
      name:               cat.name               || '',
      requires_asset_tag: !!cat.requires_asset_tag,
      requires_unique_id: !!cat.requires_unique_id,
      minimum_stock:      cat.minimum_stock       ?? 5,
      parent_id:          cat.parent_id           || null,
    });
    setEditOpen(true);
  };

  const handleCreate = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      await api.post('/categories', { ...form, minimum_stock: Number(form.minimum_stock) || 5 });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setOpen(false); setForm(EMPTY);
      toast({ title: form.parent_id ? 'Subcategoría creada' : 'Categoría creada', description: form.name });
    } finally { setSaving(false); }
  };

  const handleUpdate = async () => {
    if (!editForm.name) return;
    setEditSaving(true);
    try {
      await api.put(`/categories/${editId}`, { ...editForm, minimum_stock: Number(editForm.minimum_stock) || 0 });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setEditOpen(false);
      toast({ title: 'Categoría actualizada', description: editForm.name });
    } finally { setEditSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta categoría? Sus subcategorías también se eliminarán.')) return;
    await api.delete(`/categories/${id}`);
    queryClient.invalidateQueries({ queryKey: ['categories'] });
    toast({ title: 'Categoría eliminada' });
  };

  const countFor = (catId) => {
    const catItems = items.filter((i) => i.category_id === catId);
    return { total: catItems.length, inStock: catItems.filter((i) => i.status === 'in_stock').length };
  };

  const EditDialog = () => (
    <Dialog open={editOpen} onOpenChange={setEditOpen}>
      <DialogContent className="rounded-2xl">
        <DialogHeader><DialogTitle>Editar Categoría</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Nombre *</Label>
            <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="Ej: Laptop, Mouse, Monitor" className="rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Categoría padre</Label>
            <Select
              value={editForm.parent_id || 'none'}
              onValueChange={(v) => setEditForm({ ...editForm, parent_id: v === 'none' ? null : v })}
            >
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Ninguna (categoría principal)</SelectItem>
                {topLevel.filter(c => c.id !== editId).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Stock Mínimo</Label>
            <Input type="number" min={0} value={editForm.minimum_stock} onChange={(e) => setEditForm({ ...editForm, minimum_stock: e.target.value })} className="rounded-xl" />
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
            <div>
              <p className="text-sm font-medium">Requiere Activo Fijo</p>
              <p className="text-xs text-muted-foreground">Equipos con número de activo fijo</p>
            </div>
            <Switch checked={editForm.requires_asset_tag} onCheckedChange={(v) => setEditForm({ ...editForm, requires_asset_tag: v })} />
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
            <div>
              <p className="text-sm font-medium">Identificador Único</p>
              <p className="text-xs text-muted-foreground">Cada unidad tiene un ID propio</p>
            </div>
            <Switch checked={editForm.requires_unique_id} onCheckedChange={(v) => setEditForm({ ...editForm, requires_unique_id: v })} />
          </div>
          <Button onClick={handleUpdate} disabled={editSaving} className="w-full rounded-xl">
            {editSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Guardar Cambios
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div>
      <PageHeader
        title="Categorías"
        subtitle={`${categories.length} categorías`}
        icon={Tags}
        actions={
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setForm(EMPTY); }}>
            <DialogTrigger asChild>
              <Button className="rounded-xl" onClick={() => openCreate(null)}><Plus className="w-4 h-4 mr-2" /> Nueva</Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <DialogHeader><DialogTitle>{form.parent_id ? 'Nueva Subcategoría' : 'Nueva Categoría'}</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Nombre *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Laptop, Mouse, Monitor" className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Categoría padre</Label>
                  <Select
                    value={form.parent_id || 'none'}
                    onValueChange={(v) => setForm({ ...form, parent_id: v === 'none' ? null : v })}
                  >
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Ninguna (categoría principal)</SelectItem>
                      {topLevel.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Stock Mínimo</Label>
                  <Input type="number" min={0} value={form.minimum_stock} onChange={(e) => setForm({ ...form, minimum_stock: e.target.value })} className="rounded-xl" />
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                  <div>
                    <p className="text-sm font-medium">Requiere Activo Fijo</p>
                    <p className="text-xs text-muted-foreground">Equipos con número de activo fijo</p>
                  </div>
                  <Switch checked={form.requires_asset_tag} onCheckedChange={(v) => setForm({ ...form, requires_asset_tag: v })} />
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                  <div>
                    <p className="text-sm font-medium">Identificador Único</p>
                    <p className="text-xs text-muted-foreground">Cada unidad tiene un ID propio</p>
                  </div>
                  <Switch checked={form.requires_unique_id} onCheckedChange={(v) => setForm({ ...form, requires_unique_id: v })} />
                </div>
                <Button onClick={handleCreate} disabled={saving} className="w-full rounded-xl">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} {form.parent_id ? 'Crear Subcategoría' : 'Crear Categoría'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <EditDialog />

      {categories.length === 0 ? (
        <EmptyState icon={Tags} title="Sin categorías" description="Crea categorías para clasificar tu inventario"
          action={<Button variant="outline" className="rounded-xl" onClick={() => openCreate(null)}>Crear Categoría</Button>} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {topLevel.map((cat) => {
            const { total, inStock } = countFor(cat.id);
            const isLow = inStock < (cat.minimum_stock || 5);
            const subcats = childrenOf(cat.id);
            return (
              <div
                key={cat.id}
                className={`glass-card rounded-2xl p-5 hover:shadow-xl transition-all group ${isLow ? 'border-destructive/30' : ''}`}
              >
                <div className="flex items-start justify-between cursor-pointer" onClick={() => navigate(`/inventory?cat=${cat.id}`)}>
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                    <Tags className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary h-8 w-8"
                      onClick={(e) => { e.stopPropagation(); openCreate(cat.id); }} title="Agregar subcategoría">
                      <FolderPlus className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary h-8 w-8"
                      onClick={(e) => openEdit(cat, e)} title="Editar categoría">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary h-8 w-8"
                      onClick={(e) => { e.stopPropagation(); navigate(`/inventory?cat=${cat.id}`); }}>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive h-8 w-8"
                      onClick={(e) => { e.stopPropagation(); handleDelete(cat.id); }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <h3 className="font-semibold cursor-pointer" onClick={() => navigate(`/inventory?cat=${cat.id}`)}>{cat.name}</h3>
                <div className="flex flex-wrap gap-2 mt-2">
                  {cat.requires_asset_tag && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">Activo Fijo</span>}
                  {cat.requires_unique_id && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600">ID Único</span>}
                </div>
                <div className="flex gap-4 mt-4 pt-3 border-t border-border text-xs text-muted-foreground">
                  <span>{total} equipos</span>
                  <span>{inStock} en stock</span>
                  <span>Mín: {cat.minimum_stock || 5}</span>
                  {isLow && <span className="text-destructive font-medium">⚠ Stock bajo</span>}
                </div>

                {subcats.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border space-y-1.5">
                    {subcats.map((sub) => {
                      const subCount = countFor(sub.id);
                      return (
                        <div
                          key={sub.id}
                          className="flex items-center gap-2 text-xs group/sub cursor-pointer hover:text-primary"
                          onClick={(e) => { e.stopPropagation(); navigate(`/inventory?cat=${sub.id}`); }}
                        >
                          <CornerDownRight className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span className="flex-1 truncate">{sub.name}</span>
                          <span className="text-muted-foreground">{subCount.total}</span>
                          <Button variant="ghost" size="icon" className="opacity-0 group-hover/sub:opacity-100 transition-opacity text-muted-foreground hover:text-primary h-6 w-6"
                            onClick={(e) => openEdit(sub, e)} title="Editar">
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="opacity-0 group-hover/sub:opacity-100 transition-opacity text-muted-foreground hover:text-destructive h-6 w-6"
                            onClick={(e) => { e.stopPropagation(); handleDelete(sub.id); }}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
