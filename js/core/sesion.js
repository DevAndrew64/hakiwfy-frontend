/* Sesión del usuario: token JWT + perfil, persistidos en localStorage. */

const CLAVE = 'hawkify_sesion';

function leer() {
  try {
    const s = JSON.parse(localStorage.getItem(CLAVE));
    if (!s || !s.token) return null;
    if (s.expira && Date.now() > s.expira) {
      localStorage.removeItem(CLAVE);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

function escribir(s) {
  try {
    if (s) localStorage.setItem(CLAVE, JSON.stringify(s));
    else localStorage.removeItem(CLAVE);
  } catch { /* almacenamiento no disponible: la sesión dura lo que la pestaña */ }
  window.dispatchEvent(new CustomEvent('hawkify:sesion'));
}

export const sesion = {
  token: () => leer()?.token || null,
  usuario: () => leer()?.usuario || null,
  activa: () => !!leer(),

  iniciar(respuestaLogin) {
    escribir({
      token: respuestaLogin.token,
      usuario: respuestaLogin.usuario,
      expira: Date.now() + (respuestaLogin.expiraEnSegundos || 3600) * 1000,
    });
  },

  actualizarUsuario(usuario) {
    const s = leer();
    if (s) escribir({ ...s, usuario });
  },

  cerrar() {
    escribir(null);
  },

  rol: () => leer()?.usuario?.rol || null,
  esSuperadmin: () => leer()?.usuario?.rol === 'superadmin',
  esAdmin: () => leer()?.usuario?.rol === 'administrador',
  esStaff: () => ['superadmin', 'administrador'].includes(leer()?.usuario?.rol),
  tienePermiso: (p) => {
    const u = leer()?.usuario;
    if (!u) return false;
    return u.rol === 'superadmin' || (u.permisos || []).includes(p);
  },
};

/** Redirige a login si no hay sesión (o si el rol no alcanza). Devuelve el usuario. */
export function exigirSesion({ staff = false } = {}) {
  const u = sesion.usuario();
  if (!u) {
    const siguiente = encodeURIComponent(location.pathname.split('/').pop() + location.search + location.hash);
    location.replace(`login.html?next=${siguiente}`);
    throw new Error('Sesión requerida');
  }
  if (staff && !sesion.esStaff()) {
    location.replace('cuenta.html');
    throw new Error('Rol insuficiente');
  }
  return u;
}
