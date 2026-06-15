import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/api/client';
import AuthLayout from '@/components/AuthLayout';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try { await api.post('/auth/reset-password-request', { email }); } catch {}
    finally { setLoading(false); setSent(true); }
  };

  return (
    <AuthLayout
      icon={Mail}
      title="Restablecer Contraseña"
      subtitle="Te enviaremos un enlace para restablecerla"
      footer={
        <Link to="/login" className="text-primary font-medium hover:underline flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> Volver al inicio
        </Link>
      }
    >
      {sent ? (
        <p className="text-sm text-center py-2">
          Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input id="email" type="email" autoFocus placeholder="tu@email.com" value={email}
                onChange={(e) => setEmail(e.target.value)} className="pl-10 h-11 rounded-xl" required />
            </div>
          </div>
          <Button type="submit" className="w-full h-11 rounded-xl" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Enviar enlace
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
