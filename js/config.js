/*
 * URL base del backend.
 *  - En localhost se usa http://localhost:8080/api.
 *  - Desplegado (Vercel, Netlify...) se usa API_PRODUCCION: cámbiala por la URL real del backend.
 * Para probar contra otro servidor sin tocar código, en la consola del navegador:
 *   localStorage.setItem('hawkify_api', 'https://api.tudominio.co/api')
 */
const API_PRODUCCION = 'https://hawkify-backend.onrender.com/';

function leerOverride() {
  try {
    return localStorage.getItem('hawkify_api');
  } catch {
    return null;
  }
}

const esLocal = ['localhost', '127.0.0.1'].includes(location.hostname);

export const API_URL = (
  leerOverride()
  || window.HAWKIFY_API_URL
  || (esLocal ? 'http://localhost:8080/api' : API_PRODUCCION)
).replace(/\/$/, '');

/** Cuentas de demostración que siembra el backend (DemoSeeder). Solo se muestran en localhost. */
export const CUENTAS_DEMO = [
  { correo: 'laura.gomez@correo.co', rol: 'Usuaria final' },
  { correo: 'andres.rios@correo.co', rol: 'Publica herramientas' },
  { correo: 'admin@hawkify.co', rol: 'Administrador' },
  { correo: 'bodega@hawkify.co', rol: 'Admin con alcance limitado' },
  { correo: 'superadmin@hawkify.co', rol: 'Superadministrador' },
];
export const CLAVE_DEMO = 'Hawkify2026*';
