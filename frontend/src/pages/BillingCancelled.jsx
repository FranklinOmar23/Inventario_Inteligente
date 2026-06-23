import React from 'react';
import { useNavigate } from 'react-router-dom';
import { XCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function BillingCancelled() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
        <XCircle className="w-10 h-10 text-muted-foreground" />
      </div>

      <h1 className="text-2xl font-bold mb-2">Pago cancelado</h1>
      <p className="text-muted-foreground mb-8 max-w-md">
        No se realizó ningún cargo. Puedes volver a los planes cuando quieras y contratar en el momento que prefieras.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={() => navigate('/billing')} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Ver planes
        </Button>
        <Button variant="outline" onClick={() => navigate('/')}>
          Ir al Dashboard
        </Button>
      </div>
    </div>
  );
}
