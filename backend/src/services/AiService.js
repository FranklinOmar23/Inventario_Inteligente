import axios from 'axios';
import { ValidationError, PaymentError, AppError } from '../errors/AppError.js';
import { env } from '../config/env.js';

const GEMINI_BASE    = 'https://generativelanguage.googleapis.com/v1beta';
const MAX_B64_BYTES  = 10 * 1024 * 1024;

// ── Download an HTTP image URL and return { mime, b64 } ──────────────────────

async function urlToInline(url) {
  const resp = await axios.get(url, { responseType: 'arraybuffer', timeout: 30_000 });
  const mime = resp.headers['content-type']?.split(';')[0] || 'image/jpeg';
  const b64  = Buffer.from(resp.data).toString('base64');
  return { mime, b64 };
}

// ── Core Gemini call ─────────────────────────────────────────────────────────
// parts: array of Gemini content parts ({ text } | { inlineData: { mimeType, data } })

async function callGemini(parts, opts = {}) {
  const payload = {
    contents: [{ parts }],
    generationConfig: {
      temperature:     0.1,
      maxOutputTokens: opts.maxTokens ?? 1024,
    },
  };

  let response;
  try {
    response = await axios.post(
      `${GEMINI_BASE}/models/${env.gemini.model}:generateContent?key=${env.gemini.apiKey}`,
      payload,
      { headers: { 'Content-Type': 'application/json' }, timeout: 110_000 },
    );
  } catch (axiosErr) {
    const code   = axiosErr.code;
    const status = axiosErr.response?.status;
    const detail = axiosErr.response?.data?.error?.message || '';

    if (['ECONNRESET', 'ECONNABORTED', 'ETIMEDOUT'].includes(code)) {
      throw new AppError(`Gemini cerró la conexión (${code}). La imagen puede ser demasiado grande.`, 502);
    }
    if (status === 400) throw new AppError(detail || 'Solicitud inválida a Gemini.', 400);
    if (status === 403) throw new AppError('API key de Gemini inválida o sin permisos.', 403);
    if (status === 429) throw new AppError('Límite de peticiones de Gemini alcanzado. Intenta en unos segundos.', 429);
    throw axiosErr;
  }

  const candidate = response.data?.candidates?.[0];
  if (!candidate) throw new AppError('Gemini no devolvió respuesta.', 502);

  const text    = candidate.content?.parts?.[0]?.text ?? '';
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return { raw: text };
  }
}

// ── Build an inlineData part from base64 string or URL ───────────────────────

async function imagePart(url, b64) {
  if (b64) return { inlineData: { mimeType: 'image/jpeg', data: b64 } };
  if (url)  { const { mime, b64: d } = await urlToInline(url); return { inlineData: { mimeType: mime, data: d } }; }
  return null;
}

// ── Service ──────────────────────────────────────────────────────────────────

export class AiService {

  async detectImage({ image_url, image_base64, image_url_2, image_base64_2 }) {
    if (!image_url && !image_base64) throw new ValidationError('Se requiere image_url o image_base64');
    if (image_base64 && Buffer.byteLength(image_base64, 'utf8') > MAX_B64_BYTES) {
      throw new ValidationError('La imagen es demasiado grande. Usa una imagen menor a 7 MB.');
    }

    const parts = [];
    const p1 = await imagePart(image_url, image_base64);
    if (p1) parts.push(p1);
    const p2 = await imagePart(image_url_2, image_base64_2);
    if (p2) parts.push(p2);

    const label = parts.length > 1
      ? 'Analiza estas dos imágenes del mismo dispositivo (frente y parte trasera). Combina toda la información visible.'
      : 'Analiza esta imagen de un dispositivo de inventario de TI.';

    parts.push({ text: `${label}\n\n⚠️ REGLA CRÍTICA: Devuelve ÚNICAMENTE lo que está escrito LITERALMENTE en la imagen/etiqueta.\nDevuelve SOLO JSON válido:\n{"name":"","brand":"","model":"","service_tag":"","serial_number":"","asset_tag":"","description":"","suggested_category":""}` });

    return callGemini(parts);
  }

  async identifyModel(code) {
    if (!code) throw new ValidationError('Se requiere code');
    return callGemini([{ text: `Eres un asistente de inventario de TI. El usuario escaneó este código: "${code}"\n\nDevuelve SOLO JSON válido:\n{"name":"","brand":"","model":"","description":"","suggested_category":"","serial_number":"","service_tag":"","asset_tag":""}` }]);
  }

  async detectInvoice({ image_url, image_base64 }) {
    if (!image_url && !image_base64) throw new ValidationError('Se requiere image_url o image_base64');
    if (image_base64 && Buffer.byteLength(image_base64, 'utf8') > MAX_B64_BYTES) {
      throw new ValidationError('La imagen es demasiado grande.');
    }
    const p = await imagePart(image_url, image_base64);
    return callGemini([
      p,
      { text: 'Analiza esta factura. Para cada producto extrae: name, quantity (entero), unit_price (número sin símbolo). Devuelve SOLO JSON:\n{"supplier":"","items":[{"name":"","quantity":1,"unit_price":0}]}' },
    ], { maxTokens: 2048 });
  }

  async search({ query, items }) {
    if (!query || !items?.length) return { item_id: '' };
    const list = items.map(i => ({ id: i.id, name: i.name, service_tag: i.service_tag, asset_tag: i.asset_tag, serial_number: i.serial_number, model: i.model, brand: i.brand }));
    return callGemini([{ text: `Items en inventario:\n${JSON.stringify(list, null, 2)}\n\nEl usuario busca: "${query}"\nEncuentra el item más probable. Responde SOLO JSON: {"item_id":"","confidence":"high|medium|low","reason":""}` }]);
  }

  async searchByImage({ image_base64, items }) {
    if (!image_base64 || !items?.length) return { item_id: '' };
    const list = items.map(i => ({ id: i.id, name: i.name, service_tag: i.service_tag, asset_tag: i.asset_tag, serial_number: i.serial_number, model: i.model, brand: i.brand }));
    const p = await imagePart(null, image_base64);
    return callGemini([
      p,
      { text: `Extrae identificadores visibles y busca entre:\n${JSON.stringify(list, null, 2)}\nDevuelve SOLO JSON: {"item_id":"","confidence":"high|medium|low","extracted_text":""}` },
    ]);
  }

  async chat({ message, history = [], snapshot, companyName }) {
    const { summary, byCategory, byDept, recent } = snapshot;

    const catLines  = byCategory.map(c => `  • ${c.category_name || 'Sin categoría'}: ${c.items} ítems, ${c.qty} uds`).join('\n');
    const deptLines = byDept.map(d => `  • ${d.department_name}: ${d.items} ítems`).join('\n');
    const recentLines = recent.slice(0, 25).map(r =>
      `  - ${r.name}${r.brand ? ` (${r.brand}${r.model ? ' ' + r.model : ''})` : ''} | ${r.category_name} | ${r.status} | ${r.quantity} uds${r.department_name ? ' | ' + r.department_name : ''}`
    ).join('\n');

    const systemText = `Eres Inventia, la asistente IA de inventario de ${companyName}.
Tu trabajo es ayudar al equipo a consultar y entender el inventario actual de la empresa.
Responde SIEMPRE en español, de forma clara y concisa.
No inventes datos; si algo no está en el snapshot, dilo honestamente.
Puedes hacer cálculos simples sobre los datos provistos.

═══ SNAPSHOT DEL INVENTARIO (actualizado ahora) ═══

RESUMEN GENERAL:
  • Ítems únicos: ${summary.items}  |  Unidades totales: ${summary.total_qty}
  • En stock: ${summary.in_stock}  |  En uso/checkout: ${summary.checked_out}
  • En mantenimiento: ${summary.maintenance}  |  Dañados: ${summary.damaged}  |  Retirados: ${summary.retired}

POR CATEGORÍA:
${catLines || '  (sin datos)'}

POR DEPARTAMENTO:
${deptLines || '  (sin datos)'}

ÚLTIMOS 25 ÍTEMS REGISTRADOS:
${recentLines || '  (sin datos)'}
═════════════════════════════════════════════════`;

    const contents = [
      ...history.map(h => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.content }],
      })),
      { role: 'user', parts: [{ text: message }] },
    ];

    let response;
    try {
      response = await axios.post(
        `${GEMINI_BASE}/models/${env.gemini.model}:generateContent?key=${env.gemini.apiKey}`,
        {
          systemInstruction: { parts: [{ text: systemText }] },
          contents,
          generationConfig: { temperature: 0.5, maxOutputTokens: 900 },
        },
        { headers: { 'Content-Type': 'application/json' }, timeout: 60_000 }
      );
    } catch (axiosErr) {
      const status = axiosErr.response?.status;
      if (status === 429) throw new AppError('Límite de peticiones alcanzado. Intenta en unos segundos.', 429);
      if (status === 403) throw new AppError('API key de Gemini inválida.', 403);
      throw axiosErr;
    }

    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No pude generar una respuesta.';
    return { reply: text };
  }

  async analyzeReport({ summary, byCategory, byStatus, activity, exits, dateLabel }) {
    const totalEntradas = (activity || []).reduce((s, d) => s + (d.entry    || 0), 0);
    const totalSalidas  = (activity || []).reduce((s, d) => s + (d.checkout || 0), 0);
    const topCats   = (byCategory || []).slice(0, 6).map(c => `${c.name}: ${c.quantity} uds`).join(', ') || 'Sin datos';
    const statusTxt = (byStatus   || []).map(s => `${s.name || s.status}: ${s.quantity}`).join(' | ')   || 'Sin datos';

    const prompt = `Eres un analista de inventario empresarial. Analiza los datos y redacta un informe ejecutivo profesional en español.

PERÍODO: ${dateLabel}
INVENTARIO ACTUAL:
- Total unidades: ${summary?.total_qty ?? 0} | En stock: ${summary?.in_stock ?? 0} | En uso: ${summary?.checked_out ?? 0}
- Ítems únicos: ${summary?.items ?? 0} | Categorías: ${summary?.categories ?? 0}
${summary?.total_value ? `- Valor total: RD$${Number(summary.total_value).toLocaleString('es-DO', { minimumFractionDigits: 2 })}` : ''}
ESTADOS: ${statusTxt}
TOP CATEGORÍAS: ${topCats}
ACTIVIDAD: Entradas ${totalEntradas} | Salidas/checkouts ${totalSalidas}${exits?.summary ? ` | Mercancía salida: ${exits.summary.count} mov. ${exits.summary.quantity} uds` : ''}

Escribe el informe con estos apartados (máx 400 palabras):
1. Estado General del Inventario
2. Actividad y Tendencias del Período
3. Distribución por Categoría
4. Puntos de Atención y Recomendaciones
5. Conclusión

Responde SOLO con el texto del informe, sin JSON ni markdown.`;

    const result = await callGemini([{ text: prompt }], { maxTokens: 1800 });
    return { analysis: result?.analysis || result?.raw || '' };
  }
}
