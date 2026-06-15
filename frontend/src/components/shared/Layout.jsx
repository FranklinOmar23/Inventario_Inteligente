import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '@/context/AuthContext';
import { Box } from 'lucide-react';

function AppLoader() {
  return (
    <div className="flex items-center justify-center h-screen bg-background overflow-hidden">
      {/* Ambient blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-1/3 left-1/3 w-72 h-72 rounded-full blur-3xl opacity-20 animate-pulse"
          style={{ background: 'hsl(var(--primary))' }}
        />
        <div
          className="absolute bottom-1/3 right-1/3 w-96 h-96 rounded-full blur-3xl opacity-10 animate-pulse"
          style={{ background: 'hsl(var(--primary))', animationDelay: '1s' }}
        />
      </div>

      <div className="relative flex flex-col items-center gap-6">
        {/* Logo + pulse rings */}
        <div className="relative flex items-center justify-center">
          <span
            className="absolute w-20 h-20 rounded-3xl pulse-ring"
            style={{ background: 'hsl(var(--primary) / 0.25)' }}
          />
          <span
            className="absolute w-20 h-20 rounded-3xl pulse-ring"
            style={{ background: 'hsl(var(--primary) / 0.15)', animationDelay: '0.5s' }}
          />
          <div
            className="relative w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl animate-bounce-in"
            style={{ background: 'hsl(var(--primary))' }}
          >
            <Box className="w-8 h-8 text-white" />
          </div>
        </div>

        {/* Brand */}
        <div className="text-center animate-fade" style={{ '--delay': '200ms' }}>
          <p className="text-2xl font-bold tracking-tight">InvenAI</p>
          <p className="text-sm text-muted-foreground mt-0.5">Smart Inventory</p>
        </div>

        {/* Loading dots */}
        <div className="flex items-center gap-2 animate-fade" style={{ '--delay': '400ms' }}>
          <div className="loading-dot w-2 h-2 rounded-full bg-primary" />
          <div className="loading-dot w-2 h-2 rounded-full bg-primary" />
          <div className="loading-dot w-2 h-2 rounded-full bg-primary" />
        </div>
      </div>
    </div>
  );
}

export default function Layout() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <AppLoader />;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main
        key={location.pathname}
        className="flex-1 overflow-y-auto p-6 animate-page"
      >
        <Outlet />
      </main>
    </div>
  );
}
