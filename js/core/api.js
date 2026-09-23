/* Cliente HTTP del backend Hawkify. Normaliza errores en ErrorApi. */
import { API_URL } from '../config.js';
import { sesion } from './sesion.js';

export class ErrorApi extends Error {
  constructor(status, mensaje, campos = null, titulo = '') {
    super(mensaje);
    this.status = status;
    this.campos = campos || {};
    this.titulo = titulo;
  }
}

export function qs(parametros = {}) {
  const p = new URLSearchParams();
  Object.entries(parametros).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '' || v === false) return;
    if (Array.isArray(v)) v.forEach((x) => p.append(k, x));
    else p.append(k, v);
  });
  const s = p.toString();
  return s ? `?${s}` : '';
}

export async function api(ruta, { metodo = 'GET', cuerpo, formData, silencioso401 = false } = {}) {
  const headers = { Accept: 'application/json' };
  const token = sesion.token();
  if (token) headers.Authorization = `Bearer ${token}`;

  let body;
  if (formData) {
    body = formData;
  } else if (cuerpo !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(cuerpo);
  }

  let res;
  try {
    res = await fetch(API_URL + ruta, { method: metodo, headers, body });
  } catch {
    throw new ErrorApi(0, 'No pudimos conectar con el servidor de Hawkify. Revisa tu conexión e intenta de nuevo.');
  }

  if (res.status === 204) return null;
  const texto = await res.text();
  let datos = null;
  if (texto) {
    try { datos = JSON.parse(texto); } catch { datos = null; }
  }

  if (!res.ok) {
    if (res.status === 401 && token && !silencioso401) {
      // Token vencido o revocado: se cierra la sesión y se pide entrar de nuevo.
      sesion.cerrar();
      const siguiente = encodeURIComponent(location.pathname.split('/').pop() + location.search);
      location.href = `login.html?expirada=1&next=${siguiente}`;
    }
    throw new ErrorApi(
      res.status,
      datos?.message || `El servidor respondió con un error (${res.status}).`,
      datos?.fieldErrors,
      datos?.error,
    );
  }
  return datos;
}

export const get = (ruta, parametros) => api(ruta + qs(parametros));
export const post = (ruta, cuerpo) => api(ruta, { metodo: 'POST', cuerpo: cuerpo ?? {} });
export const put = (ruta, cuerpo) => api(ruta, { metodo: 'PUT', cuerpo: cuerpo ?? {} });
export const patch = (ruta, cuerpo) => api(ruta, { metodo: 'PATCH', cuerpo: cuerpo ?? {} });
export const del = (ruta) => api(ruta, { metodo: 'DELETE' });

export async function subirImagen(archivo) {
  const fd = new FormData();
  fd.append('archivo', archivo);
  const r = await api('/archivos', { metodo: 'POST', formData: fd });
  return r.url;
}
