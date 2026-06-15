import React from 'react';
import { cn } from '@/lib/utils';

export default function StatCard({ title, value, icon: Icon, className, delay = 0 }) {
  return (
    <div
      className={cn('glass-card rounded-2xl p-5 flex items-center justify-between animate-card', className)}
      style={{ '--delay': `${delay}ms` }}
    >
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
        <p
          className="text-3xl font-bold mt-1 animate-count-in"
          style={{ '--delay': `${delay + 80}ms` }}
        >
          {value}
        </p>
      </div>
      {Icon && (
        <div
          className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center animate-bounce-in"
          style={{ '--delay': `${delay + 140}ms` }}
        >
          <Icon className="w-6 h-6 text-primary" />
        </div>
      )}
    </div>
  );
}
