import nodemailer from 'nodemailer';

function createTransporter(smtp) {
  return nodemailer.createTransport({
    host:   smtp.host || 'smtp.gmail.com',
    port:   Number(smtp.port) || 587,
    secure: !!smtp.secure,
    auth: {
      user: smtp.user,
      pass: smtp.pass,
    },
  });
}

/**
 * Sends a formal requisition email to the technology manager.
 * @param {object} opts
 * @param {string}   opts.to           - recipient email
 * @param {string}   opts.managerName  - e.g. "Ing. Florentino"
 * @param {string}   opts.senderName   - e.g. "Franklin Disla"
 * @param {string}   opts.motive       - e.g. "Operativo Semana Santa 2026"
 * @param {Array}    opts.items        - [{ quantity, description }]
 * @param {string}   [opts.notes]      - optional additional notes
 * @param {object}   opts.smtp         - per-tenant SMTP config: { host, port, secure, user, pass, fromName }
 */
export async function sendRequisitionEmail({ to, managerName, senderName, motive, items, notes, smtp }) {
  const transporter = createTransporter(smtp);

  const today = new Date().toLocaleDateString('es-DO', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  // Build plain-text item list (padded like the example)
  const itemLines = items.map((item, i) => {
    const num = String(i + 1).padStart(2, '0');
    const qty = String(item.quantity).padStart(2, '0');
    const specLine = item.specs ? `\n       ${item.specs.replace(/\n/g, '\n       ')}` : '';
    return `  ${num}. ${qty} ${item.description}${specLine}`;
  }).join('\n');

  const textBody = `Buenas Tardes ${managerName},

Por este medio hacemos la formal solicitud del requerimiento para la compra de equipos con fines de ${motive}. A continuación el detalle:

\tCompra de equipos:
${itemLines}
${notes ? `\nObservaciones:\n  ${notes}\n` : ''}
Saludos Cordiales,
${senderName}
InvenAI – Sistema de Inventario`;

  // HTML version
  const itemRows = items.map((item, i) => `
    <tr style="border-bottom:1px solid #f0f0f0">
      <td style="padding:8px 12px;color:#666;width:40px;vertical-align:top">${String(i + 1).padStart(2, '0')}</td>
      <td style="padding:8px 12px;font-weight:600;vertical-align:top">${item.quantity}</td>
      <td style="padding:8px 12px;vertical-align:top">
        <span style="font-weight:600">${item.description}</span>
        ${item.specs ? `<br><span style="font-size:12px;color:#6b7280;white-space:pre-line">${item.specs}</span>` : ''}
      </td>
    </tr>`).join('');

  const htmlBody = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0d9488,#0284c7);padding:28px 32px">
            <p style="margin:0;font-size:20px;font-weight:700;color:#fff">Solicitud Formal de Requerimiento</p>
            <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,.8)">${today}</p>
          </td>
        </tr>

        <!-- Greeting -->
        <tr>
          <td style="padding:28px 32px 0">
            <p style="margin:0;font-size:15px;color:#333">Buenas Tardes <strong>${managerName}</strong>,</p>
            <p style="margin:12px 0 0;font-size:14px;color:#555;line-height:1.6">
              Por este medio hacemos la formal solicitud del requerimiento para la compra de equipos con fines de
              <strong>${motive}</strong>. A continuación el detalle de las localidades.
            </p>
          </td>
        </tr>

        <!-- Items table -->
        <tr>
          <td style="padding:24px 32px">
            <p style="margin:0 0 12px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#888">Compra de Equipos</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb">
              <thead>
                <tr style="background:#f9fafb">
                  <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#9ca3af">#</th>
                  <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#9ca3af">Cant.</th>
                  <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#9ca3af">Descripción</th>
                </tr>
              </thead>
              <tbody>${itemRows}</tbody>
            </table>
          </td>
        </tr>

        ${notes ? `
        <!-- Notes -->
        <tr>
          <td style="padding:0 32px 24px">
            <p style="margin:0 0 8px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#888">Observaciones</p>
            <p style="margin:0;font-size:14px;color:#555;line-height:1.6;background:#f9fafb;padding:12px 16px;border-radius:8px;border-left:3px solid #0d9488">${notes}</p>
          </td>
        </tr>` : ''}

        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px 28px;border-top:1px solid #f0f0f0">
            <p style="margin:0;font-size:14px;color:#333">Saludos Cordiales,</p>
            <p style="margin:4px 0 0;font-size:15px;font-weight:700;color:#0d9488">${senderName}</p>
            <p style="margin:2px 0 0;font-size:12px;color:#9ca3af">InvenAI – Sistema de Inventario</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await transporter.sendMail({
    from:    `"${smtp.fromName || 'InvenAI'}" <${smtp.user}>`,
    to,
    subject: `Solicitud de Requerimiento – ${motive}`,
    text:    textBody,
    html:    htmlBody,
  });
}
