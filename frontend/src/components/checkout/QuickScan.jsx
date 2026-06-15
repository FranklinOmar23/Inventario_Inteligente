import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { X, Zap } from 'lucide-react';

export default function QuickScan({ onScan, scanning, onClose }) {
  const scannerRef = useRef(null);
  const [scannerReady, setScannerReady] = useState(false);

  useEffect(() => {
    if (scannerRef.current) return;
    const scanner = new Html5QrcodeScanner(
      'qr-scanner-container',
      {
        fps: 10,
        qrbox: { width: 250, height: 150 },
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
        aspectRatio: 1.5,
      },
      false
    );
    scanner.render(
      (decodedText) => {
        scanner.clear();
        onScan(decodedText.trim());
      },
      (error) => {}
    );
    scannerRef.current = scanner;
    setScannerReady(true);

    return () => {
      try { scanner.clear(); } catch {}
      scannerRef.current = null;
    };
  }, []);

  return (
    <div className="relative rounded-xl overflow-hidden border border-border bg-muted/30">
      <div className="flex items-center justify-between px-4 py-2 bg-muted/50">
        <span className="text-xs font-medium flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-primary" />
          Escaneo de código QR / Barras
        </span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div id="qr-scanner-container" className="w-full" />
      <p className="text-center text-xs text-muted-foreground py-2">
        También puedes usar un escáner USB — simplemente escanea el código
      </p>
    </div>
  );
}
