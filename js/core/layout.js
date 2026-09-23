/* Cabecera, pie, notificaciones y menú de cuenta comunes a todas las páginas. */
import { api, get, post, patch } from './api.js';
import { I } from './iconos.js';
import { sesion } from './sesion.js';
import { $, $$, esc, avatarHTML, hace, toast } from './ui.js';

let opciones = {};

export function montarLayout(opts = {}) {
  opciones = opts;
  pintarCabecera();
  pintarPie();
  window.addEventListener('hawkify:sesion', pintarCabecera);
  refrescarPerfil();
  if (sesion.activa()) {
    actualizarContador();
    setInterval(actualizarContador, 60000);
  }
}

function enlaceActivo(clave) {
  return opciones.activo === clave ? 'activo' : '';
}

function pintarCabecera() {
  const destino = $('#cabecera');
  if (!destino) return;
  const u = sesion.usuario();
  const publicar = u?.rol === 'superadmin' ? '' : `<a href="cuenta.html#herramientas" class="${enlaceActivo('publicar')}">Publica tu herramienta</a>`;

  destino.outerHTML = `
  <header class="cabecera" id="cabecera">
    <div class="franja"></div>
    <div class="contenedor barra">
      <button class="icono-btn boton-menu-movil" type="button" aria-label="Abrir menú" aria-expanded="false">${I.menu}</button>
      <a class="logo" href="index.html" aria-label="Hawkify, inicio">
        <span class="logo-marca">${I.halcon}</span>
        <span class="logo-texto">HAWK<em>IFY</em></span>
      </a>
      <form class="buscador-cabecera" action="catalogo.html" role="search">
        ${I.buscar}
        <input name="q" type="search" placeholder="Taladro, pulidora, compresor…" aria-label="Buscar herramientas" value="${esc(new URLSearchParams(location.search).get('q') || '')}">
      </form>
      <nav class="nav-principal" aria-label="Principal">
        <a href="catalogo.html" class="${enlaceActivo('catalogo')}">Catálogo</a>
        <a href="index.html#como-funciona">Cómo funciona</a>
        ${publicar}
        <a href="faq.html" class="${enlaceActivo('ayuda')}">Ayuda</a>
      </nav>
      <div class="acciones-cabecera">
        ${u ? accionesConSesion(u) : `
          <a class="btn btn-sm btn-fantasma" style="--fg:#fff" href="login.html">Entrar</a>
          <a class="btn btn-sm" href="signup.html">Crear cuenta</a>`}
      </div>
    </div>
    <div class="menu-movil contenedor">
      <form class="buscador-cabecera" action="catalogo.html" role="search">${I.buscar}<input name="q" type="search" placeholder="¿Qué herramienta necesitas?"></form>
      <a href="catalogo.html">Catálogo</a>
      <a href="index.html#como-funciona">Cómo funciona</a>
      ${u?.rol === 'superadmin' ? '' : '<a href="cuenta.html#herramientas">Publica tu herramienta</a>'}
      <a href="faq.html">Ayuda</a>
      ${u ? '<a href="cuenta.html">Mi cuenta</a>' : '<a href="login.html">Entrar</a><a href="signup.html">Crear cuenta</a>'}
      ${u && sesion.esStaff() ? '<a href="admin.html">Panel de administración</a>' : ''}
    </div>
  </header>`;

  const cab = $('#cabecera');
  const botonMovil = $('.boton-menu-movil', cab);
  botonMovil.addEventListener('click', () => {
    const abierto = $('.menu-movil', cab).classList.toggle('abierto');
    botonMovil.setAttribute('aria-expanded', abierto);
    botonMovil.innerHTML = abierto ? I.cerrar : I.menu;
  });
  $$('.menu-desplegable', cab).forEach((m) => {
    $('button', m).addEventListener('click', (e) => {
      e.stopPropagation();
      const abrir = !m.classList.contains('abierto');
      $$('.menu-desplegable.abierto').forEach((x) => x.classList.remove('abierto'));
      m.classList.toggle('abierto', abrir);
      if (abrir && m.id === 'menu-notif') cargarNotificaciones();
    });
    $('.panel-desplegable', m).addEventListener('click', (e) => e.stopPropagation());
  });
  document.addEventListener('click', () => $$('.menu-desplegable.abierto').forEach((x) => x.classList.remove('abierto')));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') $$('.menu-desplegable.abierto').forEach((x) => x.classList.remove('abierto'));
  });
  $('#salir', cab)?.addEventListener('click', () => {
    sesion.cerrar();
    location.href = 'index.html';
  });
  if (u) actualizarContador();
}

function accionesConSesion(u) {
  const staff = ['superadmin', 'administrador'].includes(u.rol);
  const primerNombre = (u.nombreCompleto || '').split(' ')[0];
  return `
    ${u.rol !== 'superadmin' ? `<a class="icono-btn" href="cuenta.html#deseos" aria-label="Lista de deseos" title="Lista de deseos">${I.corazon}</a>` : ''}
    <div class="menu-desplegable" id="menu-notif">
      <button class="icono-btn" type="button" aria-label="Notificaciones" title="Notificaciones">${I.campana}<span class="contador oculto" id="contador-notif">0</span></button>
      <div class="panel-desplegable panel-notificaciones">
        <header><strong>Notificaciones</strong><button class="enlace texto-pequeno" type="button" id="leer-todas">Marcar todas como leídas</button></header>
        <div class="lista-notificaciones" id="lista-notif"></div>
      </div>
    </div>
    <div class="menu-desplegable" id="menu-cuenta">
      <button class="boton-cuenta" type="button" aria-label="Menú de cuenta">${avatarHTML(u)}<span class="nombre-corto">${esc(primerNombre)}</span></button>
      <div class="panel-desplegable">
        <div class="cabecera-usuario"><strong>${esc(u.nombreCompleto)}</strong><span>${esc(u.correo)}</span></div>
        ${staff ? `<a href="admin.html">${I.panel} Panel de administración</a><hr>` : ''}
        <a href="cuenta.html#resumen">${I.usuario} Mi cuenta</a>
        ${u.rol !== 'superadmin' ? `
        <a href="cuenta.html#reservas">${I.calendario} Mis reservas</a>
        <a href="cuenta.html#deseos">${I.corazon} Lista de deseos</a>
        <a href="cuenta.html#herramientas">${I.herramienta} Mis herramientas</a>` : ''}
        <a href="cuenta.html#perfil">${I.ajustes} Perfil y seguridad</a>
        <hr>
        <button class="item" type="button" id="salir">${I.salir} Cerrar sesión</button>
      </div>
    </div>`;
}

async function refrescarPerfil() {
  if (!sesion.activa()) return;
  try {
    const u = await api('/auth/me', { silencioso401: true });
    sesion.actualizarUsuario(u);
    opciones.alRefrescarUsuario?.(u);
  } catch (e) {
    if (e.status === 401) {
      sesion.cerrar();
      toast('Tu sesión expiró. Vuelve a entrar para continuar.', 'info');
    }
  }
}

async function actualizarContador() {
  if (!sesion.activa()) return;
  try {
    const { total } = await get('/notificaciones/no-leidas');
    const c = $('#contador-notif');
    if (!c) return;
    c.textContent = total > 9 ? '9+' : total;
    c.classList.toggle('oculto', !total);
  } catch { /* silencioso: el contador no es crítico */ }
}

function destinoNotificacion(n) {
  if (n.referenciaTipo === 'producto') return `producto.html?id=${n.referenciaId}`;
  if (n.referenciaTipo === 'reserva') return sesion.esStaff() ? 'admin.html#reservas' : 'cuenta.html#reservas';
  return 'cuenta.html#notificaciones';
}

async function cargarNotificaciones() {
  const lista = $('#lista-notif');
  lista.innerHTML = '<div class="notificacion tenue">Cargando…</div>';
  try {
    const pagina = await get('/notificaciones', { tamano: 8 });
    if (!pagina.contenido.length) {
      lista.innerHTML = '<div class="notificacion tenue">No tienes notificaciones todavía.</div>';
      return;
    }
    lista.innerHTML = pagina.contenido.map((n) => `
      <a class="notificacion ${n.leida ? 'leida' : 'no-leida'}" href="${destinoNotificacion(n)}" data-id="${n.id}">
        <span class="punto"></span>
        <div>${esc(n.mensaje)}<time>${hace(n.creadoEn)}</time></div>
      </a>`).join('') + '<a class="notificacion" href="cuenta.html#notificaciones" style="justify-content:center;font-weight:600">Ver todas</a>';
    $$('.notificacion[data-id]', lista).forEach((a) => a.addEventListener('click', () => {
      patch(`/notificaciones/${a.dataset.id}/leida`).catch(() => {});
    }));
    $('#leer-todas').onclick = async () => {
      await post('/notificaciones/leer-todas');
      $$('.notificacion.no-leida', lista).forEach((x) => x.classList.replace('no-leida', 'leida'));
      actualizarContador();
    };
  } catch {
    lista.innerHTML = '<div class="notificacion tenue">No pudimos cargar las notificaciones.</div>';
  }
}

function pintarPie() {
  const destino = $('#pie');
  if (!destino) return;
  destino.outerHTML = `
  <footer class="pie">
    <div class="franja"></div>
    <div class="contenedor">
      <div class="pie-grid">
        <div>
          <a class="logo" href="index.html"><span class="logo-marca">${I.halcon}</span><span class="logo-texto">HAWK<em>IFY</em></span></a>
          <p>Alquiler de herramientas profesionales por días. Menos equipos quietos en bodegas, más obras terminadas.</p>
        </div>
        <div>
          <h4>Alquila</h4>
          <ul>
            <li><a href="catalogo.html">Catálogo completo</a></li>
            <li><a href="catalogo.html?soloDisponibles=true">Disponibles hoy</a></li>
            <li><a href="index.html#como-funciona">Cómo funciona</a></li>
          </ul>
        </div>
        <div>
          <h4>Ayuda</h4>
          <ul>
            <li><a href="faq.html">Preguntas frecuentes</a></li>
            <li><a href="legal.html?doc=cancelacion">Política de cancelación</a></li>
            <li><a href="legal.html?doc=terminos">Términos y condiciones</a></li>
            <li><a href="legal.html?doc=datos">Tratamiento de datos</a></li>
          </ul>
        </div>
        <div>
          <h4>Contacto</h4>
          <ul>
            <li>soporte@hawkify.co</li>
            <li>+57 301 234 5678</li>
            <li>Cra 38 #72-13, Barranquilla</li>
          </ul>
        </div>
      </div>
      <div class="pie-base">
        <span>© 2026 Hawkify · Proyecto ADSO23 · SENA</span>
        <span>Pagos en modo simulado: ninguna transacción mueve dinero real.</span>
      </div>
    </div>
  </footer>`;
}
