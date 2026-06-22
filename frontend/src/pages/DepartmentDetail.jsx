import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Building2, Search, Package, Barcode, Loader2, AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/api/client';
import EmptyState from '@/components/shared/EmptyState';
import BarcodeModal from '@/components/shared/BarcodeModal';

const STATUS_LABELS = {
  in_stock:    { label: 'En Stock',      cls: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  checked_out: { label: 'En Uso',        cls: 'bg-amber-500/10  text-amber-600  border-amber-500/20' },
  maintenance: { label: 'Mantenimiento', cls: 'bg-blue-500/10   text-blue-600   border-blue-500/20' },
  retired:     { label: 'Retirado',      cls: 'bg-gray-500/10   text-gray-500   border-gray-500/20' },
};

export default function DepartmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatus] = useState('all');
  const [catFilter, setCat]       = useState('all');
  const [barcode, setBarcode]     = useState({ open: false, code: '', itemName: '' });

  const { data: dept, isLoading: deptLoading, isError } = useQuery({
    queryKey: ['department', id],
    queryFn: () => api.get(`/departments/${id}`).then(r => r.data),
  });

  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['inventory', 'dept', id],
    queryFn: () => api.get(`/inventory?department_id=${id}&limit=500`).then(r => r.data),
    enabled: !!id,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then(r => r.data),
  });

  const filtered = items.filter(item => {
    const q = search.toLowerCase();
    const matchSearch = !q || [item.name, item.asset_tag, item.service_tag, item.serial_number, item.brand, item.model]
      .some(v => v?.toLowerCase().includes(q));
    const matchStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchCat    = catFilter    === 'all' || item.category_id === catFilter;
    return matchSearch && matchStatus && matchCat;
  });

  // Summary counts
  const inStockCount    = items.filter(i => i.status === 'in_stock').length;
  const checkedOutCount = items.filter(i => i.status === 'checked_out').length;
  const maintenCount    = items.filter(i => i.status === 'maintenance').length;

  if (deptLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !dept) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <AlertCircle className="w-12 h-12 text-muted-foreground" />
        <p className="text-muted-foreground">Departamento no encontrado</p>
        <Button variant="outline" onClick={() => navigate('/departments')}>Volver</Button>
      </div>
    );
  }

  return (
    <div>
      {/* Header nav */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => navigate('/departments')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <p className="text-xs text-muted-foreground">
          Departamentos / <span className="text-foreground font-medium">{dept.name}</span>
        </p>
      </div>

      {/* Department card */}
      <div className="glass-card rounded-2xl p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{dept.name}</h1>
            {dept.manager   && <p className="text-sm text-muted-foreground mt-0.5">Responsable: {dept.manager}</p>}
            {dept.description && <p className="text-sm text-muted-foreground mt-1">{dept.description}</p>}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-border">
          {[
            { label: 'Total',          value: items.length,    cls: 'text-foreground' },
            { label: 'En Stock',       value: inStockCount,    cls: 'text-emerald-600' },
            { label: 'En Uso',         value: checkedOutCount, cls: 'text-amber-600' },
            { label: 'Mantenimiento',  value: maintenCount,    cls: 'text-blue-600' },
          ].map(({ label, value, cls }) => (
            <div key={label} className="text-center">
              <p className={`text-2xl font-bold ${cls}`}>{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filters + register button */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, activo fijo, serial..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatus}>
          <SelectTrigger className="w-36 rounded-xl"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="in_stock">En Stock</SelectItem>
            <SelectItem value="checked_out">En Uso</SelectItem>
            <SelectItem value="maintenance">Mantenimiento</SelectItem>
          </SelectContent>
        </Select>
        <Select value={catFilter} onValueChange={setCat}>
          <SelectTrigger className="w-44 rounded-xl"><SelectValue placeholder="Categoría" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Link to={`/entry?dept=${id}${dept?.sucursal_id ? `&suc=${dept.sucursal_id}` : ''}`}>
          <Button className="rounded-xl gap-1.5 shrink-0">
            <Package className="w-4 h-4" /> Registrar item
          </Button>
        </Link>
      </div>

      {/* Items table */}
      {itemsLoading ? (
        <div className="py-16 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Sin items"
          description={search ? 'No hay items que coincidan con la búsqueda' : 'Este departamento no tiene items registrados'}
          action={
            <Link to={`/entry?dept=${id}${dept?.sucursal_id ? `&suc=${dept.sucursal_id}` : ''}`}>
              <Button variant="outline" className="rounded-xl">Registrar item</Button>
            </Link>
          }
        />
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {['Nombre', 'Categoría', 'Estado', 'Identificadores', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const s    = STATUS_LABELS[item.status] || STATUS_LABELS.in_stock;
                const code = item.asset_tag || item.service_tag || item.serial_number || '';
                return (
                  <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <Link to={`/inventory/${item.id}`} className="hover:text-primary transition-colors">
                        <p className="font-medium">{item.name}</p>
                        {(item.brand || item.model) && (
                          <p className="text-xs text-muted-foreground">{[item.brand, item.model].filter(Boolean).join(' · ')}</p>
                        )}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{item.category_name || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium border ${s.cls}`}>
                        {s.label}
                      </span>
                      {item.checked_out_to && (
                        <p className="text-xs text-muted-foreground mt-0.5">→ {item.checked_out_to}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        {item.asset_tag    && <div>AF: {item.asset_tag}</div>}
                        {item.service_tag  && <div>ST: {item.service_tag}</div>}
                        {item.serial_number && <div>SN: {item.serial_number}</div>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Link to={`/inventory/${item.id}`}>
                          <Button variant="ghost" size="sm" className="rounded-lg h-7 text-xs px-2">Ver</Button>
                        </Link>
                        {code && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground"
                            title="Código de barras"
                            onClick={() => setBarcode({ open: true, code, itemName: item.name, assetTag: item.asset_tag || '' })}
                          >
                            <Barcode className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="px-4 py-2.5 border-t border-border bg-muted/20 text-xs text-muted-foreground">
            {filtered.length} de {items.length} items
          </div>
        </div>
      )}

      <BarcodeModal
        open={barcode.open}
        onClose={() => setBarcode({ open: false, code: '', itemName: '', assetTag: '' })}
        code={barcode.code}
        itemName={barcode.itemName}
        assetTag={barcode.assetTag}
      />
    </div>
  );
}
