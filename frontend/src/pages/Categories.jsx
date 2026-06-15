import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Tags, Plus, Trash2, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import api from '@/api/client';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';

const EMPTY = { name: '', requires_asset_tag: false, requires_unique_id: false, minimum_stock: 5 };

export default function Categories() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: () => api.get('/categories').then((r) => r.data) });
  const { data: items = [] } = useQuery({ queryKey: ['inventory'], queryFn: () => api.get('/inventory?limit=200').then((r) => r.data) });

  const handleCreate = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      await api.post('/categories', { ...form, minimum_stock: Number(form.minimum_stock) || 5 });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setOpen(false); setForm(EMPTY);
      toast({ title: 'Categoría creada', description: form.name });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta categoría?')) return;
    await api.delete(`/categories/${id}`);
    queryClient.invalidateQueries({ queryKey: ['categories'] });
    toast({ title: 'Categoría eliminada' });
  };

  return (
    <div>
      <PageHeader
        title="Categorías"
        subtitle={`${categories.length} categorías`}
        icon={Tags}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl"><Plus className="w-4 h-4 mr-2" /> Nueva</Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <DialogHeader><DialogTitle>Nueva Categoría</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Nombre *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Laptop, Mouse, Monitor" className="rounded-xl" />
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
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Crear Categoría
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {categories.length === 0 ? (
        <EmptyState icon={Tags} title="Sin categorías" description="Crea categorías para clasificar tu inventario"
          action={<Button variant="outline" className="rounded-xl" onClick={() => setOpen(true)}>Crear Categoría</Button>} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => {
            const catItems = items.filter((i) => i.category_id === cat.id);
            const total = catItems.length;
            const inStock = catItems.filter((i) => i.status === 'in_stock').length;
            const isLow = inStock < (cat.minimum_stock || 5);
            return (
              <div
                key={cat.id}
                className={`glass-card rounded-2xl p-5 hover:shadow-xl transition-all group cursor-pointer ${isLow ? 'border-destructive/30' : ''}`}
                onClick={() => navigate(`/inventory?cat=${cat.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                    <Tags className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex gap-1">
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
                <h3 className="font-semibold">{cat.name}</h3>
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
