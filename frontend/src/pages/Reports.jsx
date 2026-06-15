import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  BarChart2, Package, CheckCircle2, ArrowUpFromLine, Layers, Tags,
  Printer, TrendingUp, Activity, PieChart as PieIcon, LayoutGrid,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import PageHeader from '@/components/shared/PageHeader';
import { SkeletonStat, Skeleton } from '@/components/ui/Skeleton';
import Container3DIcon from '@/components/shared/Container3DIcon';
import api from '@/api/client';

// ── Color palettes ───────────────────────────────────────────────────────────

const STATUS_CFG = {
  in_stock:    { label: 'En Stock',      color: '#10b981' },
  checked_out: { label: 'En Uso',        color: '#f59e0b' },
  maintenance: { label: 'Mantenimiento', color: '#3b82f6' },
  revision:    { label: 'Revisión',      color: '#f97316' },
  damaged:     { label: 'Dañado',        color: '#ef4444' },
  retired:     { label: 'Retirado',      color: '#6b7280' },
};

const CAT_COLORS = [
  '#6d28d9','#2563eb','#0891b2','#059669','#d97706',
  '#dc2626','#7c3aed','#0284c7','#047857','#b45309','#db2777','#0f766e',
];

// ── Custom Tooltip ────────────────────────────────────────────────────────────

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl shadow-xl px-3.5 py-3 text-xs min-w-[120px]">
      {label && <p className="font-semibold text-foreground mb-2">{label}</p>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 mb-1 last:mb-0">
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.color || p.fill }} />
          <span className="text-muted-foreground flex-1">{p.name}:</span>
          <span className="font-bold text-foreground">{Number(p.value).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
};

// ── Section card wrapper ──────────────────────────────────────────────────────

function ChartCard({ title, icon: Icon, children, className = '', action }) {
  return (
    <div className={`glass-card rounded-2xl p-5 animate-card ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-primary" />}
          {title}
        </h3>
        {action}
      </div>
      {children}
    </div>
  );
}

// ── Mini stat card ────────────────────────────────────────────────────────────

function MiniStat({ label, value, icon: Icon, color = 'text-primary', delay = 0 }) {
  return (
    <div
      className="glass-card rounded-2xl p-4 flex items-center gap-3 animate-card"
      style={{ '--delay': `${delay}ms` }}
    >
      <div className={`w-10 h-10 rounded-xl bg-current/10 flex items-center justify-center shrink-0 animate-bounce-in ${color}`}
        style={{ '--delay': `${delay + 100}ms` }}
      >
        <Icon className="w-5 h-5" style={{ color: 'currentColor' }} />
      </div>
      <div>
        <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider leading-none mb-1">{label}</p>
        <p className={`text-2xl font-bold animate-count-in ${color}`} style={{ '--delay': `${delay + 60}ms` }}>
          {value?.toLocaleString() ?? '—'}
        </p>
      </div>
    </div>
  );
}

// ── Donut center label ────────────────────────────────────────────────────────

const DonutLabel = ({ viewBox, total }) => {
  const { cx, cy } = viewBox;
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
      <tspan x={cx} dy="-8" fontSize="22" fontWeight="700" fill="currentColor">{total?.toLocaleString()}</tspan>
      <tspan x={cx} dy="22" fontSize="11" fill="#6b7280">unidades</tspan>
    </text>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Reports() {
  const { theme } = useTheme();
  const { user }  = useAuth();
  const isDark    = theme === 'dark';
  const [days, setDays] = useState('30');

  const gridColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
  const textColor = isDark ? '#a1a1aa' : '#6b7280';
  const axisProps = { tick: { fill: textColor, fontSize: 11 }, axisLine: false, tickLine: false };

  const q = (key, url) => ({
    queryKey: [key],
    queryFn: () => api.get(url).then(r => r.data),
    staleTime: 30_000,
  });

  const { data: summary,    isLoading: lSum  } = useQuery(q('rep-summary',    '/reports/summary'));
  const { data: byStatus,   isLoading: lSt   } = useQuery(q('rep-status',     '/reports/by-status'));
  const { data: byCategory, isLoading: lCat  } = useQuery(q('rep-category',   '/reports/by-category'));
  const { data: bySucursal, isLoading: lSuc  } = useQuery(q('rep-sucursal',   '/reports/by-sucursal'));
  const { data: byEstante,  isLoading: lEst  } = useQuery(q('rep-estante',    '/reports/by-estante'));
  const { data: topItems,   isLoading: lTop  } = useQuery(q('rep-top',        '/reports/top-items'));
  const { data: activity,   isLoading: lAct  } = useQuery({
    queryKey: ['rep-activity', days],
    queryFn: () => api.get(`/reports/activity?days=${days}`).then(r => r.data),
    staleTime: 30_000,
  });

  // Status data enriched with config
  const statusData = (byStatus || []).map(r => ({
    ...r,
    name:  STATUS_CFG[r.status]?.label || r.status,
    color: STATUS_CFG[r.status]?.color || '#6b7280',
  }));

  const totalQty = summary?.total_qty ?? 0;

  const handlePrint = () => window.print();

  const formatDate = (d) => {
    try { return format(parseISO(d), 'dd/MM', { locale: es }); }
    catch { return d; }
  };

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Reportes"
        subtitle="Análisis y estadísticas del inventario"
        icon={BarChart2}
        actions={
          <Button variant="outline" className="rounded-xl gap-2 print:hidden" onClick={handlePrint}>
            <Printer className="w-4 h-4" /> Imprimir
          </Button>
        }
      />

      {/* ── Summary cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {lSum ? (
          <>{[0,1,2,3,4].map(i => <SkeletonStat key={i} />)}</>
        ) : (
          <>
            <MiniStat label="Total unidades" value={summary?.total_qty}   icon={Package}         color="text-primary"      delay={0}   />
            <MiniStat label="En stock"        value={summary?.in_stock}    icon={CheckCircle2}    color="text-emerald-500"  delay={60}  />
            <MiniStat label="En uso"          value={summary?.checked_out} icon={ArrowUpFromLine} color="text-amber-500"    delay={120} />
            <MiniStat label="Ítems únicos"    value={summary?.items}       icon={Layers}          color="text-blue-500"     delay={180} />
            <MiniStat label="Categorías"      value={summary?.categories}  icon={Tags}            color="text-violet-500"   delay={240} />
          </>
        )}
      </div>

      {/* ── Status donut + Activity chart ──────────────────────────────── */}
      <div className="grid lg:grid-cols-5 gap-6">

        {/* Donut */}
        <ChartCard title="Distribución por Estado" icon={PieIcon} className="lg:col-span-2" style={{ '--delay': '100ms' }}>
          {lSt ? (
            <div className="flex items-center justify-center h-64">
              <Skeleton className="w-48 h-48 rounded-full" />
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%" cy="50%"
                    innerRadius={65} outerRadius={95}
                    paddingAngle={3}
                    dataKey="quantity"
                    nameKey="name"
                    animationBegin={0}
                    animationDuration={800}
                  >
                    {statusData.map((e, i) => (
                      <Cell key={i} fill={e.color} strokeWidth={0} />
                    ))}
                    <LabelList content={<DonutLabel total={totalQty} />} />
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              {/* Legend */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2">
                {statusData.map((e, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: e.color }} />
                    <span className="text-muted-foreground flex-1 truncate">{e.name}</span>
                    <span className="font-semibold">{Number(e.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </ChartCard>

        {/* Activity area */}
        <ChartCard
          title="Actividad"
          icon={Activity}
          className="lg:col-span-3"
          action={
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger className="h-7 text-xs w-32 rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 días</SelectItem>
                <SelectItem value="30">Últimos 30 días</SelectItem>
                <SelectItem value="60">Últimos 60 días</SelectItem>
                <SelectItem value="90">Últimos 90 días</SelectItem>
              </SelectContent>
            </Select>
          }
        >
          {lAct ? (
            <Skeleton className="h-56 w-full rounded-xl" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={activity} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  {[['entry','#10b981'],['checkout','#f59e0b'],['return','#3b82f6']].map(([k,c]) => (
                    <linearGradient key={k} id={`grad-${k}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={c} stopOpacity={0.30} />
                      <stop offset="95%" stopColor={c} stopOpacity={0.02} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  interval={Number(days) <= 7 ? 0 : Number(days) <= 30 ? 4 : 8}
                  {...axisProps}
                />
                <YAxis {...axisProps} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  iconType="circle" iconSize={8}
                  formatter={v => <span style={{ color: textColor, fontSize: 11 }}>
                    {v === 'entry' ? 'Entradas' : v === 'checkout' ? 'Salidas' : 'Devoluciones'}
                  </span>}
                />
                <Area type="monotone" dataKey="entry"    name="entry"    stroke="#10b981" strokeWidth={2} fill="url(#grad-entry)"    dot={false} />
                <Area type="monotone" dataKey="checkout" name="checkout" stroke="#f59e0b" strokeWidth={2} fill="url(#grad-checkout)" dot={false} />
                <Area type="monotone" dataKey="return"   name="return"   stroke="#3b82f6" strokeWidth={2} fill="url(#grad-return)"   dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ── By category (horizontal bar) ───────────────────────────────── */}
      <ChartCard title="Inventario por Categoría" icon={Tags} style={{ '--delay': '200ms' }}>
        {lCat ? (
          <Skeleton className="h-72 w-full rounded-xl" />
        ) : byCategory?.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">Sin datos</p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(260, byCategory.length * 38)}>
            <BarChart layout="vertical" data={byCategory} margin={{ top: 0, right: 60, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
              <XAxis type="number" {...axisProps} allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={130} {...axisProps} tick={{ ...axisProps.tick, fontSize: 12 }} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="quantity" name="Cantidad" radius={[0, 6, 6, 0]} animationDuration={800}>
                {byCategory.map((_, i) => (
                  <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />
                ))}
                <LabelList dataKey="quantity" position="right" style={{ fill: textColor, fontSize: 11, fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* ── Sucursal + Top items ────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-6">

        {/* By sucursal */}
        <ChartCard title="Por Sucursal" icon={TrendingUp} style={{ '--delay': '260ms' }}>
          {lSuc ? (
            <Skeleton className="h-52 w-full rounded-xl" />
          ) : bySucursal?.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">Sin datos</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={bySucursal} margin={{ top: 4, right: 24, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="name" {...axisProps} tick={{ ...axisProps.tick, fontSize: 11 }} />
                <YAxis {...axisProps} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="quantity" name="Cantidad" radius={[6, 6, 0, 0]} animationDuration={800}>
                  {bySucursal.map((_, i) => (
                    <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Top items by movement */}
        <ChartCard title="Ítems más Activos" icon={TrendingUp} style={{ '--delay': '300ms' }}>
          {lTop ? (
            <div className="space-y-2">
              {[0,1,2,3,4].map(i => <Skeleton key={i} className="h-8 rounded-lg" />)}
            </div>
          ) : topItems?.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">Sin actividad registrada</p>
          ) : (
            <div className="space-y-2">
              {topItems.map((item, i) => {
                const pct = Math.round((item.movements / topItems[0].movements) * 100);
                return (
                  <div key={item.item_id} className="flex items-center gap-3 animate-card" style={{ '--delay': `${i * 40}ms` }}>
                    <span className="text-xs text-muted-foreground w-4 shrink-0 font-mono">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate mb-1">{item.name}</p>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, background: CAT_COLORS[i % CAT_COLORS.length] }}
                        />
                      </div>
                    </div>
                    <span className="text-xs font-bold text-muted-foreground shrink-0 w-8 text-right">{item.movements}</span>
                  </div>
                );
              })}
            </div>
          )}
        </ChartCard>
      </div>

      {/* ── By estante ─────────────────────────────────────────────────── */}
      {(byEstante?.length > 0 || lEst) && (
        <ChartCard title="Inventario por Estante / Contenedor" icon={LayoutGrid} style={{ '--delay': '340ms' }}>
          {lEst ? (
            <Skeleton className="h-52 w-full rounded-xl" />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {byEstante.map((e, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 animate-card"
                  style={{ '--delay': `${i * 40}ms` }}
                >
                  <Container3DIcon type={e.type || 'estante'} size={36} animated={false} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold truncate">{e.name}</p>
                    {e.sucursal_name && (
                      <p className="text-[10px] text-muted-foreground truncate">{e.sucursal_name}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-base font-bold text-primary">{Number(e.quantity).toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">{e.items} ítems</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ChartCard>
      )}
    </div>
  );
}
