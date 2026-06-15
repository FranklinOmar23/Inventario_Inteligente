import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const PAGE_SIZES = [10, 25, 50, 100];

export default function Pagination({ page, totalPages, onPage, totalItems, pageSize, onPageSize, className }) {
  if (totalItems === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to   = Math.min(page * pageSize, totalItems);

  // Build page number list with ellipsis
  const pages = [];
  const delta = 1;
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) {
      pages.push(i);
    }
  }
  const withGaps = [];
  let prev = 0;
  for (const p of pages) {
    if (prev && p - prev > 1) withGaps.push('...');
    withGaps.push(p);
    prev = p;
  }

  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3 mt-4', className)}>

      {/* Left: info + per-page selector */}
      <div className="flex items-center gap-3">
        <p className="text-xs text-muted-foreground whitespace-nowrap">
          {totalPages > 1 ? `${from}–${to} de ${totalItems}` : `${totalItems} registro${totalItems !== 1 ? 's' : ''}`}
        </p>
        {onPageSize && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Ver</span>
            <Select value={String(pageSize)} onValueChange={v => { onPageSize(Number(v)); onPage(1); }}>
              <SelectTrigger className="h-7 w-16 rounded-lg text-xs px-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map(s => (
                  <SelectItem key={s} value={String(s)} className="text-xs">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground whitespace-nowrap">por página</span>
          </div>
        )}
      </div>

      {/* Right: page buttons */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8 rounded-xl"
            disabled={page === 1} onClick={() => onPage(page - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>

          {withGaps.map((p, i) =>
            p === '...' ? (
              <span key={`gap-${i}`} className="px-1 text-xs text-muted-foreground">…</span>
            ) : (
              <Button key={p} variant={p === page ? 'default' : 'outline'}
                size="icon" className="h-8 w-8 rounded-xl text-xs"
                onClick={() => onPage(p)}>
                {p}
              </Button>
            )
          )}

          <Button variant="outline" size="icon" className="h-8 w-8 rounded-xl"
            disabled={page === totalPages} onClick={() => onPage(page + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
