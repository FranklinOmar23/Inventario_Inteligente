import React, { useRef, useState } from 'react';
import { Camera, Upload, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

function compressImage(file) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const MAX = 1024;
      const ratio = Math.min(1, MAX / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.src = URL.createObjectURL(file);
  });
}

// Controlled component: photoUrl drives the preview display.
// onPhotoUploaded(dataUrl) fires when a new file is compressed and ready.
// onClear() fires when the X button is clicked.
export default function CameraCapture({ onPhotoUploaded, onClear, photoUrl = null, isProcessing = false }) {
  const fileRef = useRef(null);
  const [compressing, setCompressing] = useState(false);

  const handleFile = async (file) => {
    if (!file) return;
    setCompressing(true);
    const dataUrl = await compressImage(file);
    setCompressing(false);
    onPhotoUploaded(dataUrl);
  };

  const handleClear = () => {
    if (fileRef.current) fileRef.current.value = '';
    onClear?.();
  };

  const busy = compressing || isProcessing;

  return (
    <div>
      {photoUrl ? (
        <div className="relative rounded-xl overflow-hidden border border-border">
          <img src={photoUrl} alt="Device" className="w-full h-32 object-cover" />
          {busy && (
            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-1.5 text-white">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-[11px]">{compressing ? 'Comprimiendo…' : 'Analizando…'}</span>
            </div>
          )}
          {!busy && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-red-600 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      ) : (
        <div
          onClick={() => !busy && fileRef.current?.click()}
          className="border-2 border-dashed border-border rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all min-h-[80px] justify-center"
        >
          {compressing ? (
            <>
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
              <p className="text-[10px] text-muted-foreground">Procesando…</p>
            </>
          ) : (
            <>
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Camera className="w-5 h-5 text-primary" />
              </div>
              <Button type="button" variant="outline" size="sm" className="rounded-xl gap-1 text-[11px] pointer-events-none h-7">
                <Upload className="w-3 h-3" /> Subir imagen
              </Button>
            </>
          )}
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
