import React, { useRef, useState } from 'react';
import { Camera, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/api/client';
import { useToast } from '@/components/ui/use-toast';

export default function PhotoSearch({ items, onItemFound }) {
  const fileRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleFile = async (file) => {
    if (!file) return;
    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target.result.split(',')[1];
        const inStock = items.filter((i) => i.status === 'in_stock');
        const { data } = await api.post('/ai/search-by-image', { image_base64: base64, items: inStock });
        if (data.item_id) {
          const found = items.find((i) => i.id === data.item_id);
          if (found) { onItemFound(found); return; }
        }
        toast({ title: 'No encontrado', description: 'No se encontró ningún item con esa imagen', variant: 'destructive' });
      };
      reader.readAsDataURL(file);
    } catch (err) {
      toast({ title: 'Error', description: 'Error al analizar la imagen', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={() => !loading && fileRef.current?.click()}
      className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center gap-3 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
    >
      {loading ? (
        <>
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Analizando imagen con IA...</p>
        </>
      ) : (
        <>
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Camera className="w-6 h-6 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">Tomar foto del dispositivo</p>
            <p className="text-xs text-muted-foreground mt-0.5">La IA buscará el dispositivo en el inventario</p>
          </div>
          <Button type="button" variant="outline" size="sm" className="rounded-xl gap-1.5">
            <Upload className="w-3.5 h-3.5" /> Seleccionar imagen
          </Button>
        </>
      )}
      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])} />
    </div>
  );
}
