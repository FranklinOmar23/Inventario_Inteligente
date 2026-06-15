import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Mail, Lock, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import AuthLayout from '@/components/AuthLayout';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [form, setForm] = useState({ full_name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form.email, form.password, form.full_name);
      navigate('/');
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.error || 'Error al registrar', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      icon={UserPlus}
      title="Crear Cuenta"
      subtitle="Únete al sistema de inventario"
      footer={
        <span>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-primary font-medium hover:underline">Iniciar Sesión</Link>
        </span>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>Nombre completo</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input autoFocus placeholder="Tu nombre" value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="pl-10 h-11 rounded-xl" required />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Correo electrónico</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input type="email" placeholder="tu@email.com" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="pl-10 h-11 rounded-xl" required />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Contraseña</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input type="password" placeholder="Min 6 caracteres" value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="pl-10 h-11 rounded-xl" required minLength={6} />
          </div>
        </div>
        <Button type="submit" className="w-full h-11 rounded-xl" disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Crear Cuenta
        </Button>
      </form>
    </AuthLayout>
  );
}
