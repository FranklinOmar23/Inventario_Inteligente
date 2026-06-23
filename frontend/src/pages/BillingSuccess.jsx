import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';

export default function BillingSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // Invalidate billing info and tenant so plan badge updates everywhere
    queryClient.invalidateQueries({ queryKey: ['billing-info'] });
    queryClient.invalidateQueries({ queryKey: ['tenant-me'] });
  }, [queryClient]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-20 h-20 rounded-full bg-emerald-500/15 flex items-center justify-center mb-6 animate-in zoom-in duration-300">
        <CheckCircle2 className="w-10 h-10 text-emerald-400" />
      </div>

      <h1 className="text-2xl font-bold mb-2">¡Pago exitoso!</h1>
      <p className="text-muted-foreground mb-1 max-w-md">
        Tu suscripción ha sido activada. Ya tienes acceso a todas las funciones de tu nuevo plan.
      </p>
      {sessionId && (
        <p className="text-xs text-muted-foreground/60 mb-8 font-mono">
          ID de sesión: {sessionId}
        </p>
      )}
      {!sessionId && <div className="mb-8" />}

      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={() => navigate('/')} className="gap-2">
          Ir al Dashboard
          <ArrowRight className="w-4 h-4" />
        </Button>
        <Button variant="outline" onClick={() => navigate('/billing')}>
          Ver mi plan
        </Button>
      </div>
    </div>
  );
}
