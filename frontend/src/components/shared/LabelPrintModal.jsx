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
// The physical label roll is mounted sideways in the printer: sending a
// landscape (101.6×76.2mm) page prints at the correct total size (confirmed —
// no overflow onto the next label) but the content comes out rotated 90°.
// Sending a portrait (76.2×101.6mm) page keeps the content upright but is
// taller than one physical label, so it spills onto the next one.
// Fix: author the content as a portrait card (CARD_*), then for printing
// pre-rotate it 90° so the hardware's own rotation cancels out, while the
// outer @page stays landscape (PAGE_*) matching the proven-correct physical size.
const PAGE_WIDTH_MM  = 70.6; // 4in — true physical label size (landscape)
const PAGE_HEIGHT_MM = 45.2;  // 3in
const CARD_WIDTH_MM  = PAGE_HEIGHT_MM; // 76.2mm — portrait card, swapped
const CARD_HEIGHT_MM = PAGE_WIDTH_MM;  // 101.6mm

function LabelCard({ item, forPrint, m, u }) {
  const qrValue = item.id;
  const QR_SIZE = forPrint ? Math.round(25 * 2.78) : 20 * m; // 32mm QR

  return (
    <div style={{
      width: `${CARD_WIDTH_MM * m}${u}`, height: `${CARD_HEIGHT_MM * m}${u}`,
      fontFamily: 'Arial, Helvetica, sans-serif',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      border: `${forPrint ? '0.3mm' : '1px'} solid #ccc`,
      boxSizing: 'border-box',
      background: '#fff',
      overflow: 'hidden',
      padding: `${5 * m}${u}`,
      gap: `${3 * m}${u}`,
      textAlign: 'center',
    }}>

      {/* QR centrado */}
      <QRCodeSVG value={qrValue} size={QR_SIZE} level="M" style={{ display: 'block', flexShrink: 0 }} />

      {/* Activo Fijo */}
      {item.asset_tag && (
        <div style={{
          fontSize: forPrint ? '9pt' : `${9 * m / 3}px`,
          fontFamily: 'monospace', fontWeight: 700,
          letterSpacing: '0.03em', color: '#222',
        }}>
          AF: {item.asset_tag}
        </div>
      )}

      {/* Fecha + Sucursal */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: `${1 * m}${u}`, alignItems: 'center' }}>
        <div style={{ fontSize: forPrint ? '9pt' : `${9 * m / 3}px`, color: '#444' }}>
          {fmt(item.entry_date) || '—'}
        </div>
        <div style={{ fontSize: forPrint ? '8pt' : `${8 * m / 3}px`, color: '#888' }}>
          {item.sucursal_name || 'Sede Principal'}
        </div>
      </div>

    </div>
  );
}

function LabelContent({ item, forPrint }) {
  const u = forPrint ? 'mm' : 'px';
  const m = forPrint ? 1 : 2; // 1mm → 2px for screen preview

  const card = <LabelCard item={item} forPrint={forPrint} m={m} u={u} />;

  // Screen preview: show the card as-is (no hardware rotation to compensate for).
  if (!forPrint) return card;

  // Print: pre-rotate 90° so it lands upright once the printer's own mounting rotation applies.
  return (
    <div style={{
      width: `${PAGE_WIDTH_MM}mm`, height: `${PAGE_HEIGHT_MM}mm`,
      position: 'relative', overflow: 'hidden',
      pageBreakInside: 'avoid', breakInside: 'avoid',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0,
        width: `${CARD_WIDTH_MM}mm`, height: `${CARD_HEIGHT_MM}mm`,
        transformOrigin: 'top left',
        transform: 'rotate(90deg) translateY(-100%)',
      }}>
        {card}
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
        @page { size: ${PAGE_WIDTH_MM}mm ${PAGE_HEIGHT_MM}mm; margin: 0mm; }
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

          <p className="text-xs text-muted-foreground mt-1">Formato 4 × 3 in (impresora térmica)</p>

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
