import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, FileText } from 'lucide-react';

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('es-DO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function money(n) {
  return `RD$${Number(n || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}`;
}

// data shape: { conduce_number, timestamp, reason, destination, notes, performed_by,
//               department_name, sucursal_name, is_valued, items: [{ name, code, quantity, unit_cost, total_value }] }
function ConduceContent({ tenant, data }) {
  if (!data) return null;
  const totalQty   = data.items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
  const totalValue = data.items.reduce((s, i) => s + (Number(i.total_value) || 0), 0);

  return (
    <div style={{
      width: '190mm', minHeight: '250mm', padding: '12mm',
      fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '10pt', color: '#1a1a1a',
      boxSizing: 'border-box', background: '#fff',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #1a1a1a', paddingBottom: '8mm', marginBottom: '8mm' }}>
        <div>
          <div style={{ fontSize: '14pt', fontWeight: 900 }}>{tenant?.name || 'Empresa'}</div>
          {tenant?.rnc && <div style={{ fontSize: '9pt', color: '#555' }}>RNC: {tenant.rnc}</div>}
          <div style={{ fontSize: '9pt', color: '#555', marginTop: '1mm' }}>
            {[data.sucursal_name, data.department_name].filter(Boolean).join(' · ') || 'Almacén'}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '16pt', fontWeight: 900, color: '#1a1a1a' }}>CONDUCE DE SALIDA</div>
          <div style={{ fontSize: '9pt', marginTop: '1mm' }}>No. <strong>{data.conduce_number}</strong></div>
          <div style={{ fontSize: '9pt' }}>Fecha: {fmtDate(data.timestamp)}</div>
        </div>
      </div>

      {/* Motivo / Destino */}
      <div style={{ display: 'flex', gap: '6mm', marginBottom: '6mm' }}>
        <div style={{ flex: 1, border: '0.3mm solid #ccc', borderRadius: '2mm', padding: '3mm' }}>
          <div style={{ fontSize: '7.5pt', color: '#888', textTransform: 'uppercase' }}>Motivo de salida</div>
          <div style={{ fontSize: '10pt', fontWeight: 700 }}>{data.reason}</div>
        </div>
        <div style={{ flex: 1, border: '0.3mm solid #ccc', borderRadius: '2mm', padding: '3mm' }}>
          <div style={{ fontSize: '7.5pt', color: '#888', textTransform: 'uppercase' }}>Destino / Cliente</div>
          <div style={{ fontSize: '10pt', fontWeight: 700 }}>{data.destination || '—'}</div>
        </div>
      </div>

      {/* Items table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6mm' }}>
        <thead>
          <tr style={{ background: '#1a1a1a', color: '#fff' }}>
            <th style={{ textAlign: 'left',  padding: '2.5mm', fontSize: '8.5pt' }}>Código</th>
            <th style={{ textAlign: 'left',  padding: '2.5mm', fontSize: '8.5pt' }}>Descripción</th>
            <th style={{ textAlign: 'center', padding: '2.5mm', fontSize: '8.5pt' }}>Cant.</th>
            {data.is_valued && <th style={{ textAlign: 'right', padding: '2.5mm', fontSize: '8.5pt' }}>Costo Unit.</th>}
            {data.is_valued && <th style={{ textAlign: 'right', padding: '2.5mm', fontSize: '8.5pt' }}>Total</th>}
          </tr>
        </thead>
        <tbody>
          {data.items.map((it, i) => (
            <tr key={i} style={{ borderBottom: '0.3mm solid #e5e5e5' }}>
              <td style={{ padding: '2.5mm', fontSize: '9pt', fontFamily: 'monospace' }}>{it.code || '—'}</td>
              <td style={{ padding: '2.5mm', fontSize: '9pt' }}>{it.name}</td>
              <td style={{ padding: '2.5mm', fontSize: '9pt', textAlign: 'center' }}>{it.quantity}</td>
              {data.is_valued && <td style={{ padding: '2.5mm', fontSize: '9pt', textAlign: 'right' }}>{it.unit_cost != null ? money(it.unit_cost) : '—'}</td>}
              {data.is_valued && <td style={{ padding: '2.5mm', fontSize: '9pt', textAlign: 'right' }}>{it.total_value != null ? money(it.total_value) : '—'}</td>}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={data.is_valued ? 2 : 1} style={{ padding: '2.5mm', fontSize: '9pt', fontWeight: 700, textAlign: 'right' }}>Totales</td>
            <td style={{ padding: '2.5mm', fontSize: '9pt', fontWeight: 700, textAlign: 'center' }}>{totalQty}</td>
            {data.is_valued && <td />}
            {data.is_valued && <td style={{ padding: '2.5mm', fontSize: '9pt', fontWeight: 700, textAlign: 'right' }}>{money(totalValue)}</td>}
          </tr>
        </tfoot>
      </table>

      {/* Notes */}
      {data.notes && (
        <div style={{ marginBottom: '8mm' }}>
          <div style={{ fontSize: '7.5pt', color: '#888', textTransform: 'uppercase' }}>Observaciones</div>
          <div style={{ fontSize: '9pt' }}>{data.notes}</div>
        </div>
      )}

      {/* Signatures */}
      <div style={{ display: 'flex', gap: '10mm', marginTop: '20mm' }}>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ borderTop: '0.3mm solid #1a1a1a', paddingTop: '2mm', fontSize: '9pt' }}>
            Entregado por<br /><strong>{data.performed_by || '—'}</strong>
          </div>
        </div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ borderTop: '0.3mm solid #1a1a1a', paddingTop: '2mm', fontSize: '9pt' }}>
            Recibido por (firma)
          </div>
        </div>
      </div>
    </div>
  );
}

const PRINT_ID = '__conduce_print_actual__';
const STYLE_ID = '__conduce_style__';

export default function ConducePrintModal({ open, onClose, data, tenant }) {
  useEffect(() => {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      @media print {
        @page { size: letter portrait; margin: 0mm; }
        body > *               { display: none !important; }
        body > #${PRINT_ID}    { display: block !important; position: fixed; top: 0; left: 0; }
      }
    `;
    document.head.appendChild(style);
    return () => document.getElementById(STYLE_ID)?.remove();
  }, []);

  if (!data) return null;

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
          <ConduceContent tenant={tenant} data={data} />
        </div>,
        document.body
      )}

      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Conduce de Salida
            </DialogTitle>
          </DialogHeader>

          <p className="text-xs text-muted-foreground -mt-2">
            Documento de salida de mercancía del almacén — No. {data.conduce_number}
          </p>

          <div className="flex justify-center py-2 bg-muted/30 rounded-xl">
            <div style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.12)', transform: 'scale(0.85)', transformOrigin: 'top' }}>
              <ConduceContent tenant={tenant} data={data} />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cerrar</Button>
            <Button onClick={handlePrint} className="gap-2">
              <Printer className="w-4 h-4" />
              Imprimir / Guardar PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
