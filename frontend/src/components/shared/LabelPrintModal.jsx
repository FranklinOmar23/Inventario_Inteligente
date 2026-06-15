import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Label layout ─────────────────────────────────────────────────────────────
// W=72mm H=90mm — all sections use explicit heights so nothing overflows to page 2.
// forPrint=true  → mm units (for actual printing)
// forPrint=false → px units scaled 3:1 (216px x 270px) for screen preview
function LabelContent({ item, forPrint }) {
  const u = forPrint ? 'mm' : 'px';
  const m = forPrint ? 1 : 3; // 1mm → 3px for screen preview

  const qrValue = item.id;
  const QR_SIZE = forPrint ? Math.round(28 * 3.78) : 28 * m; // 28mm QR

  return (
    <div style={{
      width: `${72 * m}${u}`, height: `${72 * m}${u}`,
      fontFamily: 'Arial, Helvetica, sans-serif',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      border: `${forPrint ? '0.3mm' : '1px'} solid #ccc`,
      boxSizing: 'border-box',
      background: '#fff',
      overflow: 'hidden',
      pageBreakInside: 'avoid',
      breakInside: 'avoid',
      padding: `${4 * m}${u}`,
      gap: `${2.5 * m}${u}`,
      textAlign: 'center',
    }}>

      {/* QR centrado */}
      <QRCodeSVG value={qrValue} size={QR_SIZE} level="M" style={{ display: 'block', flexShrink: 0 }} />

      {/* Nombre */}
      <div style={{
        fontSize: forPrint ? '9pt' : `${9 * m / 3}px`,
        fontWeight: 900, lineHeight: 1.2,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        maxWidth: '100%',
      }}>
        {item.name}
      </div>

      {/* Fecha + Sucursal */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: `${0.8 * m}${u}`, alignItems: 'center' }}>
        <div style={{ fontSize: forPrint ? '7pt' : `${7 * m / 3}px`, color: '#444' }}>
          {fmt(item.entry_date) || '—'}
        </div>
        <div style={{ fontSize: forPrint ? '6pt' : `${6 * m / 3}px`, color: '#888' }}>
          {item.sucursal_name || 'Sede Principal'}
        </div>
      </div>

    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
const PRINT_ID = '__lbl_print_actual__';
const STYLE_ID = '__lbl_style__';

export default function LabelPrintModal({ open, onClose, item }) {
  useEffect(() => {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      @media print {
        @page { size: 80mm 70mm; margin: 0mm; }
        body > *                { display: none !important; }
        body > #${PRINT_ID}    { display: block !important; position: fixed; top: 0; left: 0; }
      }
    `;
    document.head.appendChild(style);
    return () => document.getElementById(STYLE_ID)?.remove();
  }, []);

  if (!item) return null;

  const handlePrint = () => {
    const el = document.getElementById(PRINT_ID);
    if (!el) return;
    el.style.display = 'block';

    const restore = () => {
      el.style.display = 'none';
      window.removeEventListener('afterprint', restore);
    };
    window.addEventListener('afterprint', restore);
    setTimeout(restore, 8000);
    window.print();
  };

  return (
    <>
      {createPortal(
        <div id={PRINT_ID} style={{ display: 'none' }}>
          <LabelContent item={item} forPrint />
        </div>,
        document.body
      )}

      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="w-4 h-4" />
              Imprimir Etiqueta
            </DialogTitle>
          </DialogHeader>

          <p className="text-xs text-muted-foreground -mt-2">Formato 72 × 90 mm · impresora térmica</p>

          <div className="text-[11px] bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-amber-800">
            <strong>Tip Chrome:</strong> En el diálogo → <em>Más configuraciones</em> → desactiva <em>"Encabezados y pies de página"</em>.
          </div>

          <div className="flex justify-center py-2">
            <div style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.12)', display: 'inline-block' }}>
              <LabelContent item={item} forPrint={false} />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handlePrint} className="gap-2">
              <Printer className="w-4 h-4" />
              Imprimir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
