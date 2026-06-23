import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import api from '@/api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,   setUser]   = useState(null);
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.get('/auth/me')
        .then((r) => {
          setUser(r.data);
          if (r.data.tenant_id) {
            api.get('/tenants/me').then(t => setTenant(t.data)).catch(() => {});
          }
        })
        .catch((err) => {
          // 401 = token inválido/expirado → limpiar; error de red = backend temporalmente abajo → conservar token
          if (err.response?.status === 401) localStorage.removeItem('token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    setUser(data.user);
    if (data.user?.tenant_id) {
      api.get('/tenants/me').then(t => setTenant(t.data)).catch(() => {});
    }
    return data;
  };

  const register = async (email, password, full_name) => {
    const { data } = await api.post('/auth/register', { email, password, full_name });
    localStorage.setItem('token', data.token);
    setUser(data.user);
    return data;
  };

  const setupTenant = async (payload) => {
    const { data } = await api.post('/auth/setup-tenant', payload);
    localStorage.setItem('token', data.token);
    setUser(data.user);
    setTenant(data.tenant);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setTenant(null);
  };

  // Account is blocked when: not exempt, not active, and trial has expired
  const isBlocked = useMemo(() => {
    if (!tenant) return false;
    if (tenant.billing_exempt) return false;
    if (tenant.billing_status === 'active') return false;
    if (tenant.trial_ends_at && new Date(tenant.trial_ends_at) < new Date()) return true;
    if (['past_due', 'canceled', 'unpaid', 'inactive'].includes(tenant.billing_status)) return true;
    return false;
  }, [tenant]);

  return (
    <AuthContext.Provider value={{ user, tenant, loading, login, register, setupTenant, logout, isBlocked }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
