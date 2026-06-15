import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { Toaster } from '@/components/ui/toaster';
import Layout from '@/components/shared/Layout';

import Dashboard from '@/pages/Dashboard';
import Inventory from '@/pages/Inventory';
import Entry from '@/pages/Entry';
import Checkout from '@/pages/Checkout';
import PurchaseOrders from '@/pages/PurchaseOrders';
import Logs from '@/pages/Logs';
import Departments from '@/pages/Departments';
import Categories from '@/pages/Categories';
import InventoryDetail from '@/pages/InventoryDetail';
import DepartmentDetail from '@/pages/DepartmentDetail';
import Sucursales from '@/pages/Sucursales';
import DamagedItems from '@/pages/DamagedItems';
import Users from '@/pages/Users';
import Estantes from '@/pages/Estantes';
import Reports from '@/pages/Reports';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/inventory/:id" element={<InventoryDetail />} />
              <Route path="/entry" element={<Entry />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/purchase-orders" element={<PurchaseOrders />} />
              <Route path="/logs" element={<Logs />} />
              <Route path="/sucursales" element={<Sucursales />} />
              <Route path="/departments" element={<Departments />} />
              <Route path="/departments/:id" element={<DepartmentDetail />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/damaged" element={<DamagedItems />} />
              <Route path="/users" element={<Users />} />
              <Route path="/estantes" element={<Estantes />} />
              <Route path="/reports" element={<Reports />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
