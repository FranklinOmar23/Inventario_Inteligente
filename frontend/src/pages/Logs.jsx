import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { History, Search, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import api from '@/api/client';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import Pagination from '@/components/shared/Pagination';

const DEFAULT_PAGE_SIZE = 10;

const ACTION_MAP = {
  entry:         { label: 'Entrada',       color: 'bg-emerald-500/10 text-emerald-600' },
  checkout:      { label: 'Salida',        color: 'bg-amber-500/10 text-amber-600' },
  return:        { label: 'Devolución',    color: 'bg-blue-500/10 text-blue-600' },
  edit:          { label: 'Edición',       color: 'bg-purple-500/10 text-purple-600' },
  delete:        { label: 'Eliminado',     color: 'bg-destructive/10 text-destructive' },
  restock:       { label: 'Reabastecido',  color: 'bg-sky-500/10 text-sky-600' },
  status_change: { label: 'Cambio estado', color: 'bg-orange-500/10 text-orange-600' },
  restored:      { label: 'Restaurado',    color: 'bg-teal-500/10 text-teal-600' },
  damaged:       { label: 'Baja',          color: 'bg-red-500/10 text-red-600' },
  transfer:      { label: 'Traspaso',      color: 'bg-violet-500/10 text-violet-600' },
};

export default function Logs() {
  const [search, setSearch]           = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [page, setPage]               = useState(1);
  const [pageSize, setPageSize]       = useState(DEFAULT_PAGE_SIZE);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['logs', search, actionFilter],
    queryFn: () => {
      const params = new URLSearchParams({ limit: '500' });
      if (search)                     params.set('search', search);
      if (actionFilter !== 'all')     params.set('action', actionFilter);
      return api.get(`/logs?${params}`).then((r) => r.data);
    },
  });

  const totalPages = Math.ceil(logs.length / pageSize);
  const paginated  = logs.slice((page - 1) * pageSize, page * pageSize);

  // Action counts for sidebar
  const actionCounts = useMemo(() => {
    const counts = {};
    for (const log of logs) counts[log.action] = (counts[log.action] || 0) + 1;
    return counts;
  }, [logs]);

  const setFilter = (setter) => (val) => { setter(val); setPage(1); };

  const downloadReport = () => {
    const csv = [
      ['Fecha', 'Acción', 'Item', 'Categoría', 'Departamento', 'Cantidad', 'Realizado por', 'Entregado a', 'Detalles'].join(','),
      ...logs.map((l) => [
        l.timestamp ? format(new Date(l.timestamp), 'dd/MM/yyyy HH:mm') : '',
        l.action, `"${l.item_name}"`, `"${l.category_name}"`, `"${l.department_name}"`,
        l.quantity, `"${l.performed_by}"`, `"${l.checked_out_to || ''}"`, `"${l.details}"`
      ].join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'historial.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex gap-6 min-h-0">

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        <PageHeader
          title="Historial de Actividad"
          subtitle={`${logs.length} registros`}
          icon={History}
          actions={
            <Button variant="outline" className="rounded-xl gap-1.5" onClick={downloadReport}>
              <Download className="w-4 h-4" /> Descargar Reporte
            </Button>
          }
        />

        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-48 space-y-1">
            <Label className="text-xs text-muted-foreground">Buscar</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Nombre del equipo, usuario, detalles..." value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-10 rounded-xl" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Tipo de acción</Label>
            <Select value={actionFilter} onValueChange={setFilter(setActionFilter)}>
              <SelectTrigger className="w-44 rounded-xl"><SelectValue placeholder="Todas las acciones" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las acciones</SelectItem>
                {Object.entries(ACTION_MAP).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="py-20 text-center text-muted-foreground">Cargando...</div>
        ) : logs.length === 0 ? (
          <EmptyState icon={History} title="Sin registros" description="No se encontraron registros con los filtros aplicados" />
        ) : (
          <>
            <div className="glass-card rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {['Fecha', 'Acción', 'Item', 'Cantidad', 'Realizado por', 'Detalles'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((log) => {
                    const action = ACTION_MAP[log.action] || { label: log.action, color: 'bg-muted text-muted-foreground' };
                    return (
                      <tr key={log.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {log.timestamp ? format(new Date(log.timestamp), 'dd/MM/yy HH:mm') : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase ${action.color}`}>{action.label}</span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{log.item_name}</p>
                          <p className="text-xs text-muted-foreground">{[log.category_name, log.department_name].filter(Boolean).join(' · ')}</p>
                        </td>
                        <td className="px-4 py-3 font-mono text-muted-foreground">{log.quantity || 1}</td>
                        <td className="px-4 py-3">
                          <p className="text-sm">{log.performed_by}</p>
                          {log.checked_out_to && <p className="text-xs text-muted-foreground">→ {log.checked_out_to}</p>}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate">{log.details}</td>
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
              totalItems={logs.length}
              pageSize={pageSize}
              onPageSize={setPageSize}
            />
          </>
        )}
      </div>

      {/* ── Right sidebar ────────────────────────────────────────────────── */}
      <aside className="hidden xl:flex flex-col gap-4 w-56 shrink-0 pt-[72px]">
        <div className="glass-card rounded-2xl p-5 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Por acción</h3>
          {Object.entries(ACTION_MAP).map(([key, { label, color }]) => {
            const cnt = actionCounts[key] || 0;
            if (!cnt) return null;
            return (
              <button key={key}
                onClick={() => { setActionFilter(key === actionFilter ? 'all' : key); setPage(1); }}
                className={`w-full flex items-center justify-between hover:bg-muted/40 rounded-lg px-2 py-1 transition-colors ${actionFilter === key ? 'bg-muted/60' : ''}`}
              >
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${color}`}>{label}</span>
                <span className="text-xs font-bold text-foreground">{cnt}</span>
              </button>
            );
          })}
          {Object.keys(actionCounts).filter(k => !ACTION_MAP[k]).map(key => {
            const cnt = actionCounts[key];
            return (
              <button key={key}
                onClick={() => { setActionFilter(key === actionFilter ? 'all' : key); setPage(1); }}
                className="w-full flex items-center justify-between hover:bg-muted/40 rounded-lg px-2 py-1 transition-colors"
              >
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-muted text-muted-foreground">{key}</span>
                <span className="text-xs font-bold">{cnt}</span>
              </button>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
