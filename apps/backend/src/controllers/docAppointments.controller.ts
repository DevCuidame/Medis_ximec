// ============================================================
// apps/backend/src/controllers/docAppointments.controller.ts
// Proxy hacia las citas clínicas reales de Ximena en CuidameDoc
// (professional_id=2). Misma forma de respuesta que el equivalente
// de Diana (professional_id=12) en su propio backend — autentica con
// el docAuth.ts propio de Ximena, nunca con las credenciales de Diana.
// ============================================================

import type { Request, Response as ExpressResponse } from 'express';
import { env } from '@config/env.js';
import { getDocToken, refreshDocToken } from '@utils/docAuth.js';

// NOTA: se usa `Response as ExpressResponse` en las firmas de los handlers de
// Express (abajo) para no tapar el `Response` global del Fetch API, que es lo
// que `docFetch` realmente devuelve. Importar `Response` de 'express' sin
// alias rompe la firma de retorno de `docFetch` (ver referencia en el
// controlador equivalente de Diana — mismo bug ahí, sin alias — que falla
// `tsc --noEmit` con TS2740/TS2345; se corrige aquí en vez de reproducirlo).
async function docFetch(path: string, init?: RequestInit): Promise<Response> {
  let token = await getDocToken();
  let res = await fetch(`${env.DOC_API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init?.headers as object | undefined) },
  });
  if (res.status === 401) {
    token = await refreshDocToken();
    res = await fetch(`${env.DOC_API_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init?.headers as object | undefined) },
    });
  }
  return res;
}

export async function getXimenaAppointments(req: Request, res: ExpressResponse): Promise<void> {
  const { start_date, end_date } = req.query as { start_date?: string; end_date?: string };
  const params = new URLSearchParams();
  if (start_date) params.set('start_date', start_date);
  if (end_date) params.set('end_date', end_date);
  const qs = params.size > 0 ? `?${params.toString()}` : '';
  try {
    const upstream = await docFetch(`/clinical-appointments${qs}`);
    const json = await upstream.json();
    res.status(upstream.status).json(json);
  } catch {
    res.status(502).json({ success: false, error: 'Error conectando con CuidameDoc' });
  }
}

export async function createXimenaAppointment(req: Request, res: ExpressResponse): Promise<void> {
  try {
    const upstream = await docFetch('/clinical-appointments', {
      method: 'POST',
      body: JSON.stringify(req.body),
    });
    const json = await upstream.json();
    res.status(upstream.status).json(json);
  } catch {
    res.status(502).json({ success: false, error: 'Error conectando con CuidameDoc' });
  }
}

export async function getXimenaPatients(req: Request, res: ExpressResponse): Promise<void> {
  const { q } = req.query as { q?: string };
  const path = q ? `/patients/search?q=${encodeURIComponent(q)}` : '/patients/my-patients';
  try {
    const upstream = await docFetch(path);
    const json = await upstream.json();
    res.status(upstream.status).json(json);
  } catch {
    res.status(502).json({ success: false, error: 'Error conectando con CuidameDoc' });
  }
}
