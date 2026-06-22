import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Download, X } from 'lucide-react';

export default function BarcodeModal({ open, onClose, code, itemName, assetTag }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!open || !code) return;
    // Delay so Radix Dialog finishes mounting before JsBarcode renders into the SVG
    const timer = setTimeout(() => {
      if (svgRef.current) {
        JsBarcode(svgRef.current, code, {
          format: 'CODE128',
          width: 2.2,
          height: 70,
          displayValue: true,
          fontOptions: 'bold',
          fontSize: 15,
          margin: 12,
          background: '#ffffff',
          lineColor: '#000000',
        });
      }
    }, 80);
    return () => clearTimeout(timer);
  }, [open, code]);

  const handleDownload = () => {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, code, {
      format: 'CODE128',
      width: 2.2,
      height: 70,
      displayValue: true,
      fontOptions: 'bold',
      fontSize: 15,
      margin: 12,
      background: '#ffffff',
      lineColor: '#000000',
    });
    const a = document.createElement('a');
    a.download = `${code}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
  };

  const handlePrint = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const pw = window.open('', '_blank', 'width=460,height=320');
    pw.document.write(`<!DOCTYPE html><html><head>
      <title>Etiqueta ${code}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 16px; font-family: Arial, sans-serif;
          background: #fff;
        }
        svg { max-width: 100%; }
        .item-name {
          font-size: 11px; text-align: center; margin-top: 6px;
          max-width: 240px; word-break: break-word; color: #333;
        }
        .asset-tag {
          font-size: 10px; text-align: center; margin-top: 3px;
          font-family: monospace; color: #555; letter-spacing: 0.5px;
        }
        @media print { @page { margin: 4mm; size: 60mm 35mm; } }
      </style>
    </head><body>
      ${svg.outerHTML}
      ${itemName ? `<div class="item-name">${itemName}</div>` : ''}
      ${assetTag ? `<div class="asset-tag">Activo Fijo: ${assetTag}</div>` : ''}
      <script>window.onload = () => { window.print(); window.close(); }<\/script>
    </body></html>`);
    pw.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base">Etiqueta de Código de Barras</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-3 py-2">
          <div className="bg-white border rounded-xl p-3 w-full flex justify-center">
            <svg ref={svgRef} />
          </div>

          {itemName && (
            <p className="text-xs text-muted-foreground text-center max-w-[220px] break-words">
              {itemName}
            </p>
          )}

          {assetTag && (
            <p className="text-[11px] text-muted-foreground">
              Activo Fijo: <span className="font-mono font-semibold text-foreground">{assetTag}</span>
            </p>
          )}
          {!assetTag && (
            <p className="text-[11px] text-muted-foreground">
              Código: <span className="font-mono font-semibold text-foreground">{code}</span>
            </p>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <Button variant="outline" className="flex-1 rounded-xl gap-2" onClick={handleDownload}>
            <Download className="w-4 h-4" />
            Descargar PNG
          </Button>
          <Button className="flex-1 rounded-xl gap-2" onClick={handlePrint}>
            <Printer className="w-4 h-4" />
            Imprimir
          </Button>
        </div>

        <Button variant="ghost" size="sm" className="w-full rounded-xl text-muted-foreground" onClick={onClose}>
          <X className="w-3.5 h-3.5 mr-1" />
          Cerrar
        </Button>
      </DialogContent>
    </Dialog>
  );
}
