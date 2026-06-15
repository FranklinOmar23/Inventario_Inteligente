import React from 'react';
import { cn } from '@/lib/utils';

// Base shimmer block
export function Skeleton({ className = '', style }) {
  return <div className={cn('skeleton rounded-lg', className)} style={style} />;
}

// ── Stat card skeleton ───────────────────────────────────────────────────────
export function SkeletonStat() {
  return (
    <div className="glass-card rounded-2xl p-5 flex items-center justify-between">
      <div className="space-y-2.5 flex-1">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-2.5 w-36" />
      </div>
      <Skeleton className="w-12 h-12 rounded-xl shrink-0 ml-4" />
    </div>
  );
}

// ── Table row skeleton ───────────────────────────────────────────────────────
export function SkeletonRow({ cols = 5 }) {
  const widths = ['w-8', 'flex-1', 'w-24', 'w-20', 'w-16'];
  return (
    <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border last:border-0">
      <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
      <Skeleton className="h-3.5 flex-1" />
      <Skeleton className="h-3.5 w-28 hidden sm:block" />
      <Skeleton className="h-5 w-20 rounded-full hidden md:block" />
      <Skeleton className="h-5 w-16 rounded-full" />
      <Skeleton className="w-7 h-7 rounded-lg shrink-0" />
    </div>
  );
}

// ── Card skeleton (for estantes, users, etc.) ────────────────────────────────
export function SkeletonCard() {
  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2 min-w-0">
          <Skeleton className="h-4 w-3/5" />
          <Skeleton className="h-3 w-4/5" />
          <div className="flex gap-3 mt-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <Skeleton className="w-7 h-7 rounded-lg" />
          <Skeleton className="w-7 h-7 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

// ── Activity log row skeleton ────────────────────────────────────────────────
export function SkeletonLogRow() {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/40">
      <Skeleton className="h-6 w-14 rounded-lg shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-4/5" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

// ── Full table skeleton (header + rows) ──────────────────────────────────────
export function SkeletonTable({ rows = 8 }) {
  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-muted/30">
        {['flex-1', 'w-28', 'w-24', 'w-20', 'w-16'].map((w, i) => (
          <Skeleton key={i} className={`h-3 ${w} ${i > 1 ? 'hidden md:block' : ''}`} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}

// ── User card skeleton ───────────────────────────────────────────────────────
export function SkeletonUserCard() {
  return (
    <div className="glass-card rounded-2xl p-5 space-y-4">
      <div className="flex items-start gap-3">
        <Skeleton className="w-10 h-10 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {[20, 16, 18, 22].map((w, i) => (
          <Skeleton key={i} className={`h-5 rounded-full`} style={{ width: `${w * 4}px` }} />
        ))}
      </div>
    </div>
  );
}

// ── Page header skeleton ─────────────────────────────────────────────────────
export function SkeletonPageHeader() {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="h-9 w-32 rounded-xl" />
    </div>
  );
}
