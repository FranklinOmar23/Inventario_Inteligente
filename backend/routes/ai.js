import { Router } from 'express';
import axios from 'axios';
import { authenticate } from '../middleware/auth.js';
import fs from 'fs';

const router = Router();
router.use(authenticate);

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

async function callOpenRouter(messages, responseSchema = null, opts = {}) {
  const model = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';
  const payload = {
    model,
    messages,
    max_tokens: opts.maxTokens || 1024,
    temperature: 0.1,
  };

  if (responseSchema) {
    payload.response_format = { type: 'json_object' };
  }

  let response;
  try {
    response = await axios.post(`${OPENROUTER_BASE}/chat/completions`, payload, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:5173',
        'X-Title': 'InvenAI Smart Inventory',
      },
      timeout: 60000,
    });
  } catch (axiosErr) {
    const code = axiosErr.code;
    const status = axiosErr.response?.status;
    if (code === 'ECONNRESET' || code === 'ECONNABORTED' || code === 'ETIMEDOUT') {
      throw new Error(`OpenRouter cerró la conexión (${code}). La imagen puede ser demasiado grande o el servicio tardó demasiado.`);
    }
    if (status === 413) throw new Error('OpenRouter rechazó la imagen: payload demasiado grande.');
    if (status === 429) throw new Error('Límite de peticiones de OpenRouter alcanzado. Intenta en unos segundos.');
    throw axiosErr;
  }

  // OpenRouter sometimes returns 200 with an error body instead of throwing
  if (response.data.error) {
    console.error('[OpenRouter] error en body 200:', response.data.error);
    throw new Error(response.data.error.message || 'OpenRouter error');
  }
  if (!response.data.choices?.length) {
    console.error('[OpenRouter] sin choices. Body completo:', JSON.stringify(response.data).slice(0, 500));
    throw new Error(`No response from model ${model}`);
  }
  const content = response.data.choices[0]?.message?.content || '{}';
  console.log('[OpenRouter] content raw:', content.slice(0, 300));
  // Strip markdown code fences (```json ... ```) that some models add
  const cleaned = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    console.error('[OpenRouter] JSON.parse failed, cleaned content:', cleaned.slice(0, 200));
    return { raw: content };
  }
}

// Analyze image for device info
router.post('/detect-image', async (req, res) => {
  try {
    const { image_url, image_base64, image_url_2, image_base64_2 } = req.body;
    if (!image_url && !image_base64) return res.status(400).json({ error: 'Se requiere image_url o image_base64' });

    // OpenRouter/gpt-4o-mini rejects large payloads and resets the connection
    const MAX_B64_BYTES = 10 * 1024 * 1024; // 10 MB encoded
    if (image_base64 && Buffer.byteLength(image_base64, 'utf8') > MAX_B64_BYTES) {
      return res.status(413).json({ error: 'La imagen es demasiado grande. Usa una imagen menor a 7 MB.' });
    }
    if (image_base64_2 && Buffer.byteLength(image_base64_2, 'utf8') > MAX_B64_BYTES) {
      return res.status(413).json({ error: 'La segunda imagen es demasiado grande. Usa una imagen menor a 7 MB.' });
    }

    const rawUrl = image_url || `data:image/jpeg;base64,${image_base64}`;
    const imageContents = [{ type: 'image_url', image_url: { url: rawUrl } }];

    // Second image (back of device) is optional
    if (image_url_2 || image_base64_2) {
      const rawUrl2 = image_url_2 || `data:image/jpeg;base64,${image_base64_2}`;
      imageContents.push({ type: 'image_url', image_url: { url: rawUrl2 } });
    }

    const imageLabel = imageContents.length > 1
      ? 'Eres un asistente de inventario de TI. Analiza estas dos imágenes del mismo dispositivo (frente y parte trasera). Combina toda la información visible en ambas para obtener los datos más completos.'
      : 'Eres un asistente de inventario de TI. Analiza esta imagen de un dispositivo.';

    const result = await callOpenRouter([
      {
        role: 'user',
        content: [
          ...imageContents,
          {
            type: 'text',
            text: `${imageLabel}

⚠️ REGLA CRÍTICA: Devuelve ÚNICAMENTE lo que está escrito LITERALMENTE en la etiqueta o el dispositivo.
NUNCA inventes ni asumas marca, modelo o nombre que no esté visible.
Si la marca no aparece escrita, deja "brand" vacío.
Copia el modelo CARÁCTER POR CARÁCTER exactamente como aparece (no cambies ni una letra).

PASO 1 — Lee LITERALMENTE todo el texto visible:
- Nombre del producto impreso (ej: "Thermal Label Printer", "Laptop", "Monitor")
- Marca / fabricante SOLO si está escrita en la etiqueta
- Número de modelo EXACTAMENTE como aparece en la etiqueta
- Número de serie EXACTAMENTE como aparece
- Service Tag si está visible
- Cualquier otro identificador (activo fijo, etc.)

PASO 2 — Construye los campos así:
- name: si hay nombre del producto → úsalo + modelo. Si no hay nombre pero hay marca+modelo → combínalos. Ejemplo: "Thermal Label Printer 2C-LP427B"
- brand: SOLO si está escrita en la etiqueta. Si no aparece → vacío ""
- model: copia el texto del campo MODEL exactamente, sin modificar ningún carácter
- serial_number: copia el texto del campo SERIAL/S/N exactamente
- description: describe el tipo de dispositivo según lo que lees (no inventes specs)
- suggested_category: infiere del nombre/tipo de dispositivo

PASO 3 — Devuelve SOLO JSON válido:
{
  "name": "nombre del dispositivo basado en lo que está escrito en la etiqueta",
  "brand": "marca SOLO si está escrita en la etiqueta, sino vacío",
  "model": "modelo EXACTO carácter por carácter como aparece en la etiqueta",
  "service_tag": "service tag si es visible, sino vacío",
  "serial_number": "número de serie EXACTO como aparece en la etiqueta, sino vacío",
  "asset_tag": "activo fijo si es visible, sino vacío",
  "description": "descripción basada en el tipo de dispositivo identificado",
  "suggested_category": "una de: Laptop, Monitor, Mouse, Teclado, Impresora, Teléfono, Tablet, Servidor, Switch, Router, UPS, Docking Station, Otro"
}`
          }
        ]
      }
    ]);

    res.json(result);
  } catch (err) {
    console.error('AI detect error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Error al analizar la imagen', detail: err.message });
  }
});

// Identify device from a scanned barcode / model number / text
router.post('/identify-model', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Se requiere code' });

    const result = await callOpenRouter([{
      role: 'user',
      content: `Eres un asistente de inventario de TI. El usuario escaneó este código de un dispositivo: "${code}"

⚠️ REGLA CRÍTICA: Solo asigna marca si el modelo es INEQUÍVOCAMENTE de esa empresa.
NUNCA inferir marca por similitud de patrón. Si tienes duda, deja brand vacío.

PASO 1 — Determina el tipo de código:
A) Número de modelo (letras+números, patrón típico de modelo de producto):
   → model = el código exactamente como está
   → brand = SOLO si el modelo identifica de forma INEQUÍVOCA al fabricante:
     • Contiene "Latitude", "OptiPlex", "PowerEdge", "Inspiron" → Dell
     • Contiene "LaserJet", "OfficeJet", "ProBook", "EliteBook" → HP
     • Contiene "ThinkPad", "IdeaPad", "ThinkCentre" → Lenovo
     • Es exactamente "TSP100", "TSP143", "TSP654" → Star Micronics
     • Empieza EXACTAMENTE con "TM-T" o "TM-U" (no LP, no otra letra) → Seiko Epson
     • MacBook, iMac, iPad, iPhone → Apple
     • CUALQUIER otro patrón → brand = "" (vacío)
   → name = [brand si la hay] + tipo de dispositivo inferido + model

B) Número de serie (>10 caracteres alfanuméricos sin prefijo de marca conocida):
   → serial_number = el código exactamente, name/brand/model vacíos

C) Service tag (5-8 caracteres alfanuméricos):
   → service_tag = el código exactamente

D) EAN/UPC (solo dígitos, 8-13 caracteres):
   → si lo reconoces con certeza: completa los campos; si no → todo vacío

Devuelve SOLO JSON válido:
{
  "name": "nombre descriptivo o vacío si no puedes identificar con certeza",
  "brand": "marca solo si es inequívoca, sino vacío",
  "model": "código exacto si es un modelo, sino vacío",
  "description": "descripción del tipo de dispositivo si puedes identificarlo",
  "suggested_category": "una de: Laptop, Monitor, Mouse, Teclado, Impresora, Teléfono, Tablet, Servidor, Switch, Router, UPS, Docking Station, Otro",
  "serial_number": "si el código es un S/N, sino vacío",
  "service_tag": "si el código es un ST, sino vacío",
  "asset_tag": ""
}`
    }]);

    res.json(result);
  } catch (err) {
    console.error('AI identify-model error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Error al identificar el dispositivo', detail: err.message });
  }
});

// Analyze a photo of an invoice/receipt and extract line items for bulk entry
router.post('/detect-invoice', async (req, res) => {
  try {
    const { image_url, image_base64 } = req.body;
    if (!image_url && !image_base64) return res.status(400).json({ error: 'Se requiere image_url o image_base64' });

    const MAX_B64_BYTES = 10 * 1024 * 1024;
    if (image_base64 && Buffer.byteLength(image_base64, 'utf8') > MAX_B64_BYTES) {
      return res.status(413).json({ error: 'La imagen es demasiado grande. Usa una imagen menor a 7 MB.' });
    }

    const rawUrl = image_url || `data:image/jpeg;base64,${image_base64}`;

    const result = await callOpenRouter([
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: rawUrl } },
          {
            type: 'text',
            text: `Eres un asistente de inventario. Analiza esta imagen de una factura o recibo de compra.

PASO 1 — Lee únicamente las filas de la tabla de productos/artículos. Ignora encabezados de la empresa, datos del cliente, número de factura, fecha, subtotal, impuestos, descuentos, "paga con", "vueltas" y el total final.
PASO 2 — Para cada producto extrae:
- name: el nombre del artículo exactamente como aparece
- quantity: la cantidad (número entero, si no aparece usa 1)
- unit_price: el precio unitario como número (sin símbolo de moneda ni comas)
PASO 3 — Ignora filas vacías o sin nombre de producto claro.

Devuelve SOLO JSON válido, sin texto adicional:
{
  "supplier": "nombre del negocio/proveedor en la factura, o vacío si no aparece",
  "items": [
    { "name": "nombre del producto", "quantity": 2, "unit_price": 6000 }
  ]
}`
          }
        ]
      }
    ], null, { maxTokens: 2048 });

    res.json(result);
  } catch (err) {
    console.error('AI detect-invoice error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Error al analizar la factura', detail: err.message });
  }
});

// Fuzzy search items with AI
router.post('/search', async (req, res) => {
  try {
    const { query, items } = req.body;
    if (!query || !items?.length) return res.status(400).json({ item_id: '' });

    const itemList = items.map(i => ({
      id: i.id, name: i.name, service_tag: i.service_tag,
      asset_tag: i.asset_tag, serial_number: i.serial_number,
      model: i.model, brand: i.brand
    }));

    const result = await callOpenRouter([
      {
        role: 'user',
        content: `Tengo los siguientes items en inventario:
${JSON.stringify(itemList, null, 2)}

El usuario busca: "${query}"
Encuentra el item más probable que coincida con la búsqueda (puede ser nombre, marca, modelo, service tag, etc).
Si no hay coincidencia razonable, devuelve item_id vacío.
Responde SOLO con JSON: {"item_id": "id_del_item_o_vacio", "confidence": "high|medium|low", "reason": "explicación breve"}`
      }
    ]);

    res.json(result);
  } catch (err) {
    console.error('AI search error:', err.response?.data || err.message);
    res.status(500).json({ item_id: '', error: err.message });
  }
});

// Analyze photo for checkout search
router.post('/search-by-image', async (req, res) => {
  try {
    const { image_base64, items } = req.body;
    if (!image_base64 || !items?.length) return res.status(400).json({ item_id: '' });

    const itemList = items.map(i => ({
      id: i.id, name: i.name, service_tag: i.service_tag,
      asset_tag: i.asset_tag, serial_number: i.serial_number,
      model: i.model, brand: i.brand
    }));

    const result = await callOpenRouter([
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${image_base64}` }
          },
          {
            type: 'text',
            text: `Esta es una imagen de un dispositivo. Extrae cualquier identificador visible (service tag, serial, activo fijo, modelo, marca).
Luego busca entre estos items del inventario:
${JSON.stringify(itemList, null, 2)}

Devuelve SOLO JSON: {"item_id": "id_del_item_coincidente_o_vacio", "confidence": "high|medium|low", "extracted_text": "texto extraído de la imagen"}`
          }
        ]
      }
    ]);

    res.json(result);
  } catch (err) {
    console.error('AI image search error:', err.response?.data || err.message);
    res.status(500).json({ item_id: '', error: err.message });
  }
});

export default router;
