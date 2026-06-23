import { ValidationError, NotFoundError, AppError } from '../errors/AppError.js';
import { env } from '../config/env.js';

export function supplierController(repo) {
  return {
    async list(req, res) {
      res.json(await repo.findAllByTenant(req.user.tenant_id));
    },

    async get(req, res) {
      const row = await repo.findByIdAndTenant(req.params.id, req.user.tenant_id);
      if (!row) throw new NotFoundError();
      res.json(row);
    },

    async create(req, res) {
      if (!req.body.name?.trim()) throw new ValidationError('name es requerido');
      res.status(201).json(await repo.create(req.user.tenant_id, req.body));
    },

    async update(req, res) {
      if (!req.body.name?.trim()) throw new ValidationError('name es requerido');
      const row = await repo.update(req.params.id, req.user.tenant_id, req.body);
      if (!row) throw new NotFoundError();
      res.json(row);
    },

    async remove(req, res) {
      const ok = await repo.softDeleteByTenant(req.params.id, req.user.tenant_id);
      if (!ok) throw new NotFoundError();
      res.json({ ok: true });
    },

    // Proxy to DGII API — keeps the API key server-side
    async dgiiLookup(req, res) {
      const query = req.params.query?.replace(/\D/g, ''); // digits only
      if (!query || (query.length !== 9 && query.length !== 11)) {
        throw new ValidationError('Ingresa un RNC (9 dígitos) o Cédula (11 dígitos)');
      }

      const apiKey = env.dgii?.apiKey;
      if (!apiKey) throw new AppError('DGII_API_KEY no configurado en el servidor', 503);

      const apiUrl = env.dgii?.apiUrl;
      const url = `${apiUrl}/${encodeURIComponent(query)}`;

      let response;
      try {
        response = await fetch(url, {
          headers: {
            'x-api-key': apiKey,
            'Accept':    'application/json',
          },
          signal: AbortSignal.timeout(10000),
        });
      } catch (err) {
        console.error('[DGII] fetch error:', err.message);
        throw new AppError('No se pudo conectar con la DGII. Intenta de nuevo.', 503);
      }

      // Read body as text first so we can log it if parsing fails
      let bodyText;
      try { bodyText = await response.text(); } catch { bodyText = ''; }

      if (response.status === 404) throw new NotFoundError('RNC/Cédula no encontrado en la DGII');

      if (!response.ok) {
        console.error(`[DGII] HTTP ${response.status} for ${query}:`, bodyText.slice(0, 300));
        throw new AppError(`Error DGII (${response.status}): ${bodyText.slice(0, 100)}`, 502);
      }

      let data;
      try {
        const raw = JSON.parse(bodyText);
        data = Array.isArray(raw) ? raw[0] : raw;
      } catch {
        console.error('[DGII] Invalid JSON for', query, ':', bodyText.slice(0, 300));
        throw new AppError('La DGII devolvió una respuesta inválida', 502);
      }

      res.json({
        rnc:           data.rnc           ?? data.RNC     ?? query,
        name:          data.nombre        ?? data.NOMBRE  ?? data.name ?? '',
        business_name: data.nombre_comercial ?? data.NOMBRE_COMERCIAL ?? '',
        tipo:          data.categoria     ?? data.TIPO    ?? data.tipo ?? '',
        dgii_status:   data.estatus       ?? data.ESTADO  ?? data.status ?? '',
        actividad:     data.actividad_economica ?? '',
        provincia:     data.provincia     ?? '',
        municipio:     data.municipio     ?? '',
      });
    },
  };
}
