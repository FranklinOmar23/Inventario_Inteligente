import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Users as UsersIcon, Plus, Pencil, Trash2, ShieldCheck, User, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import PageHeader from '@/components/shared/PageHeader';
import api from '@/api/client';

// All available permission keys and their labels
const ALL_PERMS = [
  { key: 'inventory',       label: 'Ver Inventario' },
  { key: 'entry',           label: 'Registrar Entradas' },
  { key: 'checkout',        label: 'Traspasos' },
  { key: 'purchase_orders', label: 'Órdenes de Compra' },
  { key: 'logs',            label: 'Ver Historial' },
  { key: 'categories',      label: 'Gestionar Categorías' },
  { key: 'sucursales',      label: 'Gestionar Sucursales' },
];

const EMPTY_FORM = {
  full_name: '',
  email: '',
  password: '',
  role: 'user',
  sucursal_id: '',
  permissions: [],
};

function initials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase()).join('');
}

export default function Users() {
  const { user: me } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null); // null = create, user obj = edit
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(r => r.data),
  });

  const { data: sucursales = [] } = useQuery({
    queryKey: ['sucursales'],
    queryFn: () => api.get('/sucursales').then(r => r.data),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowPass(false);
    setOpen(true);
  };

  const openEdit = (u) => {
    setEditing(u);
    setForm({
      full_name:   u.full_name,
      email:       u.email,
      password:    '',
      role:        u.role,
      sucursal_id: u.sucursal_id || '',
      permissions: u.permissions || [],
    });
    setShowPass(false);
    setOpen(true);
  };

  const togglePerm = (key) => {
    setForm(p => ({
      ...p,
      permissions: p.permissions.includes(key)
        ? p.permissions.filter(k => k !== key)
        : [...p.permissions, key],
    }));
  };

  const handleSave = async () => {
    if (!form.full_name || !form.email) return toast({ title: 'Nombre y email son requeridos', variant: 'destructive' });
    if (!editing && !form.password) return toast({ title: 'Contraseña requerida para nuevo usuario', variant: 'destructive' });

    setSaving(true);
    try {
      const payload = {
        full_name:   form.full_name,
        email:       form.email,
        role:        form.role,
        sucursal_id: form.sucursal_id || null,
        permissions: form.role === 'admin' ? null : form.permissions,
      };
      if (form.password) payload.password = form.password;

      if (editing) {
        await api.put(`/users/${editing.id}`, payload);
        toast({ title: 'Usuario actualizado', description: form.full_name });
      } else {
        await api.post('/users', { ...payload, password: form.password });
        toast({ title: 'Usuario creado', description: form.full_name });
      }

      queryClient.invalidateQueries({ queryKey: ['users'] });
      setOpen(false);
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.error || 'Error al guardar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (u) => {
    if (!confirm(`¿Eliminar a ${u.full_name}?`)) return;
    try {
      await api.delete(`/users/${u.id}`);
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: 'Usuario eliminado' });
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.error || 'Error al eliminar', variant: 'destructive' });
    }
  };

  const sucursalName = (id) => sucursales.find(s => s.id === id)?.name || '—';

  return (
    <div>
      <PageHeader
        title="Gestión de Usuarios"
        subtitle={`${users.length} usuario${users.length !== 1 ? 's' : ''}`}
        icon={UsersIcon}
        actions={
          <Button className="rounded-xl" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" /> Nuevo Usuario
          </Button>
        }
      />

      {/* Users grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {users.map(u => (
          <div key={u.id} className="glass-card rounded-2xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0 ${u.role === 'admin' ? 'bg-primary' : 'bg-slate-500'}`}>
                {initials(u.full_name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{u.full_name}</p>
                <p className="text-xs text-muted-foreground truncate">{u.email}</p>
              </div>
              <Badge variant={u.role === 'admin' ? 'default' : 'secondary'} className="shrink-0 text-[10px]">
                {u.role === 'admin' ? <><ShieldCheck className="w-3 h-3 mr-1" />Admin</> : <><User className="w-3 h-3 mr-1" />Usuario</>}
              </Badge>
            </div>

            {/* Sucursal */}
            {u.sucursal_id && (
              <p className="text-[11px] text-muted-foreground">
                Sucursal: <span className="text-foreground font-medium">{sucursalName(u.sucursal_id)}</span>
              </p>
            )}

            {/* Permissions */}
            {u.role === 'user' && (
              <div className="flex flex-wrap gap-1">
                {(u.permissions?.length ? u.permissions : []).map(p => {
                  const label = ALL_PERMS.find(x => x.key === p)?.label || p;
                  return <span key={p} className="text-[10px] px-1.5 py-0.5 rounded-md bg-primary/10 text-primary">{label}</span>;
                })}
                {!u.permissions?.length && (
                  <span className="text-[10px] text-muted-foreground italic">Sin permisos asignados</span>
                )}
              </div>
            )}
            {u.role === 'admin' && (
              <p className="text-[10px] text-muted-foreground italic">Acceso total</p>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <Button variant="outline" size="sm" className="flex-1 rounded-xl h-8 text-xs" onClick={() => openEdit(u)}>
                <Pencil className="w-3 h-3 mr-1" /> Editar
              </Button>
              {u.id !== me?.id && (
                <Button variant="outline" size="sm" className="rounded-xl h-8 text-destructive hover:bg-destructive hover:text-white" onClick={() => handleDelete(u)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        ))}

        {users.length === 0 && (
          <div className="col-span-full text-center py-16 text-muted-foreground text-sm">No hay usuarios registrados</div>
        )}
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Usuario' : 'Nuevo Usuario'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Name */}
            <div className="space-y-1.5">
              <Label className="text-xs">Nombre completo *</Label>
              <Input value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                placeholder="Ej: Juan Pérez" className="rounded-xl" />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label className="text-xs">Email *</Label>
              <Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="usuario@empresa.com" className="rounded-xl"
                disabled={!!editing} />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label className="text-xs">{editing ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña *'}</Label>
              <div className="relative">
                <Input type={showPass ? 'text' : 'password'} value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder={editing ? '••••••••' : 'Mínimo 6 caracteres'} className="rounded-xl pr-10" />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPass(v => !v)}>
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Role */}
            <div className="space-y-1.5">
              <Label className="text-xs">Rol</Label>
              <Select value={form.role} onValueChange={v => setForm(p => ({ ...p, role: v }))}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador — acceso total</SelectItem>
                  <SelectItem value="user">Usuario — permisos limitados</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sucursal */}
            <div className="space-y-1.5">
              <Label className="text-xs">Sucursal asignada</Label>
              <Select value={form.sucursal_id || 'none'} onValueChange={v => setForm(p => ({ ...p, sucursal_id: v === 'none' ? '' : v }))}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Sin restricción de sucursal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin restricción (todas)</SelectItem>
                  {sucursales.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Permissions — only for role=user */}
            {form.role === 'user' && (
              <div className="space-y-2">
                <Label className="text-xs">Permisos</Label>
                <div className="rounded-xl border border-border divide-y divide-border">
                  {ALL_PERMS.map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between px-3 py-2.5">
                      <span className="text-sm">{label}</span>
                      <Switch
                        checked={form.permissions.includes(key)}
                        onCheckedChange={() => togglePerm(key)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button className="w-full rounded-xl" onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear usuario'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
