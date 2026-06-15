import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  ArrowDownToLine, Sparkles, Check, Loader2, Camera,
  Barcode, RefreshCw, Search, Plus, PackagePlus, X, ScanLine, Upload, Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import api from '@/api/client';
import PageHeader from '@/components/shared/PageHeader';
import LabelPrintModal from '@/components/shared/LabelPrintModal';
import QuickScan from '@/components/checkout/QuickScan';
import ScanSearchInput from '@/components/shared/ScanSearchInput';
import CameraCapture from '@/components/inventory/CameraCapture';

function compressImage(file) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const MAX = 1024;
      const ratio = Math.min(1, MAX / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.src = URL.createObjectURL(file);
  });
}

function generateBarcode() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const rand = Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `INV${date}${rand}`;
}

const EMPTY_FORM = {
  name: '', description: '', category_id: '', department_id: '', sucursal_id: '',
  shelf_id: '', shelf_name: '',
  asset_tag: '', service_tag: '', model: '', brand: '',
  serial_number: '', photo_url: '', quantity: 1, notes: '',
  entry_date: new Date().toISOString().split('T')[0],
};

const STATUS_LABEL = { in_stock: 'En stock', checked_out: 'En uso', maintenance: 'Mantenimiento', retired: 'Retirado' };
const STATUS_COLOR = { in_stock: 'default', checked_out: 'secondary', maintenance: 'outline', retired: 'destructive' };

const TABS = [
  { id: 'manual',  label: 'Manual',        icon: PackagePlus },
  { id: 'restock', label: 'Reponer Stock',  icon: Plus },
];

function findItDept(departments) {
  return departments.find(d => /\bit\b|tecnolog|sistemas/i.test(d.name)) ?? departments[0];
}
function findPrincipalSuc(sucursales) {
  return sucursales.find(s => /principal|sede|main/i.test(s.name)) ?? sucursales[0];
}

function RecentEntriesPanel() {
  const { data: logs = [] } = useQuery({
    queryKey: ['logs-entry-recent'],
    queryFn: () => api.get('/logs?action=entry&limit=8').then(r => r.data),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const { data: allLogs = [] } = useQuery({
    queryKey: ['logs-recent-all'],
    queryFn: () => api.get('/logs?limit=50').then(r => r.data),
    staleTime: 60_000,
  });

  const today = new Date().toDateString();
  const todayCount = allLogs.filter(l => l.action === 'entry' && new Date(l.timestamp).toDateString() === today).length;
  const weekCount  = allLogs.filter(l => {
    if (l.action !== 'entry') return false;
    const diff = (Date.now() - new Date(l.timestamp)) / 86400000;
    return diff <= 7;
  }).length;

  return (
    <aside className="hidden xl:flex flex-col gap-4 w-64 shrink-0 pt-[72px]">

      {/* Stats rápidas */}
      <div className="glass-card rounded-2xl p-5 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actividad</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-primary/5 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-primary">{todayCount}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Hoy</p>
          </div>
          <div className="bg-muted/50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{weekCount}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Esta semana</p>
          </div>
        </div>
      </div>

      {/* Últimas entradas */}
      <div className="glass-card rounded-2xl p-5 space-y-3 flex-1">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Últimas entradas</h3>
        </div>

        {logs.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">Sin registros aún</p>
        ) : (
          <div className="space-y-3">
            {logs.map(log => (
              <Link key={log.id} to={log.item_id ? `/inventory/${log.item_id}` : '#'}
                className="block group border-b border-border/50 last:border-0 pb-2.5 last:pb-0"
              >
                <p className="text-xs font-medium group-hover:text-primary transition-colors truncate">{log.item_name || '—'}</p>
                <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                  {[log.category_name, log.department_name].filter(Boolean).join(' · ')}
                </p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                  {log.timestamp ? new Date(log.timestamp).toLocaleString('es-DO', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' }) : ''}
                  {log.performed_by ? ` · ${log.performed_by}` : ''}
                </p>
              </Link>
            ))}
          </div>
        )}

        <Link to="/logs" className="text-xs text-primary hover:underline block pt-1">
          Ver todo el historial →
        </Link>
      </div>
    </aside>
  );
}

export default function Entry() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState('manual');

  // Manual form
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // AI detection mode in manual tab: 'none' | 'photo' | 'scan'
  const [detectMode, setDetectMode] = useState('none');
  const [aiProcessing, setAiProcessing] = useState(false);
  const [lastCode, setLastCode] = useState('');
  // Two-photo state — each slot independent so both can be uploaded at once
  const [photo1, setPhoto1] = useState(null);
  const [photo2, setPhoto2] = useState(null);

  // Restock
  const [searchCode, setSearchCode] = useState('');
  const [searching, setSearching] = useState(false);
  const [foundItem, setFoundItem] = useState(null);
  const [addQty, setAddQty] = useState(1);
  const [addingStock, setAddingStock] = useState(false);

  // Shared
  const [labelItem, setLabelItem] = useState(null);

  const { data: departments = [] } = useQuery({ queryKey: ['departments'], queryFn: () => api.get('/departments').then(r => r.data) });
  const { data: categories = [] }  = useQuery({ queryKey: ['categories'],  queryFn: () => api.get('/categories').then(r => r.data) });
  const { data: sucursales = [] }  = useQuery({ queryKey: ['sucursales'],  queryFn: () => api.get('/sucursales').then(r => r.data) });
  const { data: estantes = [] }    = useQuery({ queryKey: ['estantes'],    queryFn: () => api.get('/estantes').then(r => r.data) });

  // Pre-fill dept/suc from URL params (e.g. coming from DepartmentDetail)
  useEffect(() => {
    const deptParam = searchParams.get('dept');
    const sucParam  = searchParams.get('suc');
    if (!deptParam && !sucParam) return;
    setForm(p => ({
      ...p,
      ...(deptParam && { department_id: deptParam }),
      ...(sucParam  && { sucursal_id:   sucParam  }),
    }));
  }, [searchParams, departments, sucursales]);

  const update = (field, value) => setForm(p => ({ ...p, [field]: value }));

  const applyAiResult = (result) => {
    const updates = {};
    if (result.name)          updates.name          = result.name;
    if (result.brand)         updates.brand         = result.brand;
    if (result.model)         updates.model         = result.model;
    if (result.description)   updates.description   = result.description;
    if (result.serial_number) updates.serial_number = result.serial_number;
    if (result.service_tag)   updates.service_tag   = result.service_tag;
    if (result.asset_tag)     updates.asset_tag     = result.asset_tag;
    if (result.suggested_category) {
      const match = categories.find(c => c.name.toLowerCase() === result.suggested_category?.toLowerCase());
      if (match) updates.category_id = match.id;
    }
    if (!form.department_id) {
      const itDept = findItDept(departments);
      if (itDept) updates.department_id = itDept.id;
    }
    if (!form.sucursal_id) {
      const mainSuc = findPrincipalSuc(sucursales);
      if (mainSuc) updates.sucursal_id = mainSuc.id;
    }
    setForm(p => ({ ...p, ...updates }));
  };

  // ── Analyze 1 or 2 photos with AI ────────────────────────────────────────
  const handleAnalyzePhotos = async () => {
    if (!photo1 && !photo2) return;
    setAiProcessing(true);
    try {
      const body = { image_url: photo1 || photo2 };
      if (photo1 && photo2) body.image_url_2 = photo2;
      const { data: result } = await api.post('/ai/detect-image', body);
      applyAiResult(result);
      const desc = photo1 && photo2 ? 'Analizó frente y parte trasera' : 'Los campos detectados fueron rellenados';
      toast({ title: 'IA completó el análisis', description: desc });
      setDetectMode('none');
      setPhoto1(null);
      setPhoto2(null);
    } catch {
      toast({ title: 'IA no disponible', variant: 'destructive' });
    } finally {
      setAiProcessing(false);
    }
  };

  // ── Barcode → AI → fill form ──────────────────────────────────────────────
  const handleBarcodeScanned = async (code) => {
    setDetectMode('none');
    setLastCode(code);
    setAiProcessing(true);
    try {
      const { data: result } = await api.post('/ai/identify-model', { code });
      applyAiResult(result);
      toast({ title: result.name ? 'Dispositivo identificado' : 'Código guardado', description: result.name || 'Completa los campos restantes' });
    } catch {
      toast({ title: 'IA no disponible', description: 'Ingresa los datos manualmente', variant: 'destructive' });
    } finally {
      setAiProcessing(false);
    }
  };

  // ── Restock ────────────────────────────────────────────────────────────────
  const handleSearchCode = async (code) => {
    const q = (code ?? searchCode).trim();
    if (!q) return;
    setSearching(true);
    setFoundItem(null);
    try {
      const uuidMatch = q.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
      const searchVal = uuidMatch ? uuidMatch[0] : q;

      const { data: items } = await api.get('/inventory', { params: { search: searchVal, limit: 50 } });
      const exact = items.find(i =>
        i.id === searchVal ||
        i.asset_tag === searchVal ||
        i.service_tag === searchVal ||
        i.serial_number === searchVal
      );
      if (exact) {
        setFoundItem(exact);
        setAddQty(1);
      } else if (items.length === 1) {
        setFoundItem(items[0]);
        setAddQty(1);
      } else {
        toast({ title: 'Ítem no encontrado', description: 'Completa el formulario para registrarlo como nuevo' });
        update('asset_tag', q);
        setTab('manual');
      }
    } catch {
      toast({ variant: 'destructive', title: 'Error al buscar' });
    } finally {
      setSearching(false);
    }
  };

  const handleAddStock = async () => {
    const qty = Number(addQty);
    if (!qty || qty < 1) return;
    setAddingStock(true);
    try {
      const newQty = foundItem.quantity + qty;
      await api.put(`/inventory/${foundItem.id}`, { ...foundItem, quantity: newQty, status: 'in_stock' });
      await api.post('/logs', {
        action: 'restock', item_id: foundItem.id, item_name: foundItem.name,
        category_name: foundItem.category_name, department_name: foundItem.department_name,
        quantity: qty, performed_by: user?.full_name || user?.email || 'Sistema',
        performed_by_id: user?.id,
        details: `Reabastecimiento: +${qty} uds. Anterior: ${foundItem.quantity}, nuevo: ${newQty}`,
        timestamp: new Date().toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['logs-recent'] });
      toast({ title: 'Stock actualizado', description: `${foundItem.name}: ${foundItem.quantity} → ${newQty}` });
      setLabelItem({ ...foundItem, quantity: newQty });
      setFoundItem(null);
      setSearchCode('');
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: err.response?.data?.error || 'Error al actualizar' });
    } finally {
      setAddingStock(false);
    }
  };

  // ── Submit manual form ────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.category_id || !form.department_id) {
      toast({ title: 'Campos requeridos', description: 'Nombre, categoría y departamento son obligatorios', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const dept  = departments.find(d => d.id === form.department_id);
      const cat   = categories.find(c  => c.id === form.category_id);
      const suc   = sucursales.find(s  => s.id === form.sucursal_id);
      const shelf = estantes.find(e   => e.id === form.shelf_id);

      const item = await api.post('/inventory', {
        ...form,
        quantity:        Number(form.quantity) || 1,
        department_name: dept?.name  || '',
        category_name:   cat?.name   || '',
        sucursal_name:   suc?.name   || '',
        shelf_name:      shelf?.name || '',
        has_unique_id:   !!(form.asset_tag || form.service_tag || form.serial_number),
      }).then(r => r.data);

      await api.post('/logs', {
        action: 'entry', item_id: item.id, item_name: form.name,
        category_name: cat?.name || '', department_name: dept?.name || '',
        quantity: Number(form.quantity) || 1,
        performed_by: user?.full_name || user?.email || 'Sistema',
        performed_by_id: user?.id,
        details: `Entrada: ${form.name}${form.model ? ' · ' + form.model : ''}${form.brand ? ' ' + form.brand : ''}`.trim(),
        timestamp: new Date().toISOString(),
      });

      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['logs-recent'] });

      setLabelItem(item);
      setForm(EMPTY_FORM);
      setLastCode('');
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.error || 'Error al registrar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex gap-6 min-h-0">

      {/* ── Form column ──────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 max-w-2xl">
      <PageHeader title="Registrar Entrada" subtitle="Añadir o reponer equipos en el inventario" icon={ArrowDownToLine} />

      <div className="space-y-5">

        {/* ── Tabs ──────────────────────────────────────────────────────── */}
        <div className="flex gap-1 p-1 bg-muted rounded-xl">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                  tab === t.id
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── Reponer Stock Tab ──────────────────────────────────────────── */}
        {tab === 'restock' && (
          <div className="glass-card rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold">Reponer stock de ítem existente</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Escanea el código QR o de barras del ítem, o escríbelo manualmente.
            </p>

            <div className="flex gap-2">
              <ScanSearchInput
                className="flex-1"
                value={searchCode}
                onChange={setSearchCode}
                onScan={(code) => handleSearchCode(code)}
                placeholder="Activo fijo, service tag, serial, QR…"
              />
              <Button
                type="button"
                variant="outline"
                className="rounded-xl px-4 shrink-0"
                onClick={() => handleSearchCode()}
                disabled={searching}
              >
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>

            {foundItem && (
              <div className="border border-primary/30 rounded-xl p-4 bg-primary/5 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <p className="font-semibold text-sm truncate">{foundItem.name}</p>
                    {(foundItem.brand || foundItem.model) && (
                      <p className="text-xs text-muted-foreground">{[foundItem.brand, foundItem.model].filter(Boolean).join(' · ')}</p>
                    )}
                    <p className="text-xs text-muted-foreground">{[foundItem.category_name, foundItem.department_name].filter(Boolean).join(' · ')}</p>
                    {foundItem.asset_tag && <p className="text-xs font-mono text-muted-foreground">{foundItem.asset_tag}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge variant={STATUS_COLOR[foundItem.status] || 'secondary'}>
                      {STATUS_LABEL[foundItem.status] || foundItem.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">Stock: <strong>{foundItem.quantity}</strong></span>
                  </div>
                </div>

                <div className="flex items-end gap-3">
                  <div className="space-y-1.5 w-32">
                    <Label className="text-xs">Cantidad a añadir</Label>
                    <Input type="number" min={1} value={addQty} onChange={e => setAddQty(e.target.value)} className="rounded-xl text-center font-semibold" />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Nuevo total</Label>
                    <div className="h-9 flex items-center px-3 rounded-xl bg-muted text-sm font-semibold text-primary">
                      {foundItem.quantity} + {Number(addQty) || 0} = {foundItem.quantity + (Number(addQty) || 0)}
                    </div>
                  </div>
                  <Button className="rounded-xl gap-1.5 shrink-0" onClick={handleAddStock} disabled={addingStock}>
                    {addingStock ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Añadir
                  </Button>
                </div>

                <button
                  type="button"
                  onClick={() => { setFoundItem(null); setSearchCode(''); }}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-3 h-3" /> Cancelar
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Manual Tab ────────────────────────────────────────────────── */}
        {tab === 'manual' && (
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* AI detection — photo or barcode */}
            <div className="glass-card rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-semibold">Detección automática con IA</h2>
                </div>
                {aiProcessing && (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Analizando…
                  </span>
                )}
              </div>

              {/* Mode selector */}
              {detectMode === 'none' && !aiProcessing && (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => { setPhoto1(null); setPhoto2(null); setDetectMode('photo'); }}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Camera className="w-5 h-5 text-primary" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium">Tomar Foto</p>
                      <p className="text-[11px] text-muted-foreground">Frente y/o trasera</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetectMode('scan')}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <ScanLine className="w-5 h-5 text-primary" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium">Escanear Código</p>
                      <p className="text-[11px] text-muted-foreground">QR o código de barras</p>
                    </div>
                  </button>
                </div>
              )}

              {/* Photo mode — both slots visible at once */}
              {detectMode === 'photo' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <p className="text-[11px] text-muted-foreground text-center">Frontal / etiqueta</p>
                      <CameraCapture
                        photoUrl={photo1}
                        onPhotoUploaded={setPhoto1}
                        onClear={() => setPhoto1(null)}
                        isProcessing={aiProcessing}
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] text-muted-foreground text-center">Trasera (opcional)</p>
                      <CameraCapture
                        photoUrl={photo2}
                        onPhotoUploaded={setPhoto2}
                        onClear={() => setPhoto2(null)}
                        isProcessing={aiProcessing}
                      />
                    </div>
                  </div>

                  {aiProcessing ? (
                    <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analizando {photo1 && photo2 ? 'las fotos' : 'la foto'}…
                    </div>
                  ) : (
                    <Button
                      type="button"
                      className="w-full rounded-xl gap-1.5"
                      disabled={!photo1 && !photo2}
                      onClick={handleAnalyzePhotos}
                    >
                      <Sparkles className="w-4 h-4" />
                      Analizar con IA{photo1 && photo2 ? ' (2 fotos)' : ''}
                    </Button>
                  )}

                  <Button type="button" variant="ghost" size="sm" className="w-full rounded-xl text-xs"
                    onClick={() => { setDetectMode('none'); setPhoto1(null); setPhoto2(null); }}
                  >
                    <X className="w-3.5 h-3.5 mr-1" /> Cancelar
                  </Button>
                </div>
              )}

              {/* Barcode / QR scan mode — physical gun (USB/BT) or manual type */}
              {detectMode === 'scan' && (
                <div className="space-y-3">
                  <div className="rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 p-5 flex flex-col items-center gap-3">
                    <ScanLine className="w-8 h-8 text-primary/60" />
                    <p className="text-sm font-medium text-center">Apunta la pistola al código</p>
                    <p className="text-xs text-muted-foreground text-center">El campo está listo — escanea el código de barras o QR</p>
                    <input
                      autoFocus
                      className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="El código aparecerá aquí…"
                      onKeyDown={e => {
                        if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                          handleBarcodeScanned(e.currentTarget.value.trim());
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                    <p className="text-[11px] text-muted-foreground">También puedes escribirlo y presionar Enter</p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" className="w-full rounded-xl text-xs" onClick={() => setDetectMode('none')}>
                    <X className="w-3.5 h-3.5 mr-1" /> Cancelar
                  </Button>
                  {lastCode && (
                    <p className="text-xs text-muted-foreground text-center">
                      Último código: <span className="font-mono text-foreground">{lastCode}</span>
                    </p>
                  )}
                </div>
              )}

              {/* After AI fills fields, show reset option */}
              {detectMode === 'none' && !aiProcessing && lastCode && (
                <p className="text-xs text-muted-foreground text-center">
                  Último código: <span className="font-mono text-foreground">{lastCode}</span>
                </p>
              )}
            </div>

            {/* General info */}
            <div className="glass-card rounded-2xl p-5 space-y-4">
              <h2 className="text-sm font-semibold">Información General</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Nombre *</Label>
                  <Input value={form.name} onChange={e => update('name', e.target.value)} placeholder="Ej: Laptop Dell Latitude" className="rounded-xl" required />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Cantidad</Label>
                  <Input type="number" min={1} value={form.quantity} onChange={e => update('quantity', e.target.value)} className="rounded-xl" />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Departamento *</Label>
                  <Select value={form.department_id} onValueChange={v => update('department_id', v)}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>{departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Sucursal</Label>
                  <Select value={form.sucursal_id || '__none__'} onValueChange={v => { update('sucursal_id', v === '__none__' ? '' : v); update('shelf_id', ''); }}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Seleccionar (opcional)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sin sucursal específica</SelectItem>
                      {sucursales.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Shelf selector — filtered to current sucursal */}
              {(() => {
                const availShelves = estantes.filter(e => !form.sucursal_id || e.sucursal_id === form.sucursal_id);
                if (availShelves.length === 0) return null;
                return (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Estante / Ubicación física</Label>
                    <Select value={form.shelf_id || '__none__'} onValueChange={v => update('shelf_id', v === '__none__' ? '' : v)}>
                      <SelectTrigger className="rounded-xl"><SelectValue placeholder="Sin estante asignado" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Sin estante asignado</SelectItem>
                        {availShelves.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })()}

              <div className="space-y-1.5">
                <Label className="text-xs">Categoría *</Label>
                <Select value={form.category_id} onValueChange={v => update('category_id', v)}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Descripción</Label>
                <Textarea value={form.description} onChange={e => update('description', e.target.value)} placeholder="Detalles del equipo..." className="rounded-xl" rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Fecha de Entrada</Label>
                <Input type="date" value={form.entry_date} onChange={e => update('entry_date', e.target.value)} className="rounded-xl" />
              </div>
            </div>

            {/* Device details */}
            <div className="glass-card rounded-2xl p-5 space-y-4">
              <h2 className="text-sm font-semibold">Detalles del Dispositivo</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Marca</Label>
                  <Input value={form.brand} onChange={e => update('brand', e.target.value)} placeholder="Dell, HP, Lenovo..." className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Modelo</Label>
                  <Input value={form.model} onChange={e => update('model', e.target.value)} placeholder="Latitude 5520" className="rounded-xl" />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Activo Fijo / Código de Barras</Label>
                  <Button type="button" variant="outline" size="sm" className="h-6 px-2 text-xs rounded-lg gap-1" onClick={() => update('asset_tag', generateBarcode())}>
                    <RefreshCw className="w-3 h-3" /> Generar código
                  </Button>
                </div>
                <div className="relative">
                  <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={form.asset_tag} onChange={e => update('asset_tag', e.target.value)} placeholder="AF-0001 o haz clic en Generar" className="rounded-xl pl-9 font-mono" />
                </div>
                {form.asset_tag && <p className="text-[11px] text-muted-foreground">Al guardar se mostrará la etiqueta para imprimir</p>}
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Service Tag</Label>
                  <Input value={form.service_tag} onChange={e => update('service_tag', e.target.value)} placeholder="ABC1234" className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Número de Serie</Label>
                  <Input value={form.serial_number} onChange={e => update('serial_number', e.target.value)} placeholder="SN-12345" className="rounded-xl" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Notas</Label>
                <Textarea value={form.notes} onChange={e => update('notes', e.target.value)} placeholder="Notas adicionales..." className="rounded-xl" rows={2} />
              </div>
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="outline" className="rounded-xl flex-1" onClick={() => navigate('/inventory')}>Cancelar</Button>
              <Button type="submit" className="rounded-xl flex-1" disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                Registrar Entrada
              </Button>
            </div>
          </form>
        )}
      </div>

      <LabelPrintModal
        open={!!labelItem}
        item={labelItem}
        onClose={() => {
          setLabelItem(null);
          navigate('/inventory');
        }}
      />
      </div>{/* end form column */}

      {/* ── Right panel — últimas entradas ───────────────────────────────── */}
      <RecentEntriesPanel />
    </div>
  );
}
