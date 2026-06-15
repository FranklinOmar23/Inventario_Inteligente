import React, { useEffect, useRef, useState, useId } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { Search, ScanLine, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export default function ScanSearchInput({ value, onChange, onScan, placeholder = 'Buscar...', className }) {
  const [scanOpen, setScanOpen] = useState(false);
  const scannerRef = useRef(null);
  const rawId = useId();
  const containerId = `scan-${rawId.replace(/:/g, '')}`;

  useEffect(() => {
    if (!scanOpen) return;

    const scanner = new Html5QrcodeScanner(
      containerId,
      {
        fps: 10,
        qrbox: { width: 240, height: 140 },
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
        aspectRatio: 1.5,
        showTorchButtonIfSupported: true,
      },
      false
    );

    scanner.render(
      (text) => {
        const uuidMatch = text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
        const decoded = uuidMatch ? uuidMatch[0] : text.trim();
        onChange(decoded);
        onScan?.(decoded);
        // Stay open and resume so the next scan replaces the previous value
        try { scanner.resume(); } catch {}
      },
      () => {}
    );

    scannerRef.current = scanner;

    return () => {
      try { scanner.clear(); } catch {}
      scannerRef.current = null;
    };
  }, [scanOpen]);

  return (
    <div className={cn('w-full', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="pl-10 pr-10 rounded-xl"
        />
        <button
          type="button"
          onClick={() => setScanOpen(v => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
          title={scanOpen ? 'Cerrar escáner' : 'Escanear código QR o barras'}
        >
          {scanOpen ? <X className="w-4 h-4" /> : <ScanLine className="w-4 h-4" />}
        </button>
      </div>
      {scanOpen && (
        <div className="mt-2 rounded-xl overflow-hidden border border-border bg-muted/20">
          <div id={containerId} className="w-full" />
          <p className="text-center text-xs text-muted-foreground pb-2">
            También puedes usar un escáner USB — simplemente escanea el código
          </p>
        </div>
      )}
    </div>
  );
}
