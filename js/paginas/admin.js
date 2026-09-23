import { get, patch, post, put } from '../core/api.js';
import { abrirFormularioProducto } from '../core/formProducto.js';
import { I } from '../core/iconos.js';
import { montarLayout } from '../core/layout.js';
import { exigirSesion, sesion } from '../core/sesion.js';
import {
  $, $$, aFecha, avatarHTML, cargandoHTML, confirmar, cop, datosFormulario, debounce, descargar, enlazarPaginacion,
  errorHTML, esc, estrellasHTML, etiqueta, FISICO, fecha, fechaDia, fechaHora, fotoHTML, hace, hoyISO, iso,
  METODOS, modal, numero, paginacionHTML, plural, ROLES, textoEstado, toast, toastError, vacioHTML,
} from '../core/ui.js';

let usuario = exigirSesion({ staff: true });
montarLayout({ alRefrescarUsuario: (u) => { usuario = u; pintarLateral(); } });

const contenido = $('#contenido');
const puede = (p) => sesion.tienePermiso(p);
const esSuper = () => sesion.esSuperadmin();

const SECCIONES = [
  { id: 'tablero', texto: 'Tablero', icono: I.panel },
  { id: 'aprobaciones', texto: 'Aprobaciones', icono: I.checkCirculo, permiso: 'catalogo_aprobar', contador: 'publicacionesPendientes' },
  { id: 'inventario', texto: 'Inventario', icono: I.herramienta },
  { id: 'reservas', texto: 'Reservas', icono: I.calendario },
  { id: 'usuarios', texto: 'Usuarios', icono: I.usuarios, permiso: 'usuarios_gestionar' },
  { id: 'resenas', texto: 'Moderación', icono: I.mensaje },
  { id: 'calificaciones', texto: 'Calificaciones', icono: I.estrella },
  { id: 'auditoria', texto: 'Auditoría', icono: I.bitacora },
  { id: 'reportes', texto: 'Reportes', icono: I.grafica, super: true },
  { id: 'configuracion', texto: 'Configuración', icono: I.ajustes, super: true },
];
let resumen = null;

const visibles = () => SECCIONES.filter((s) => (!s.super || esSuper()) && (!s.permiso || puede(s.permiso)));

function pintarLateral() {
  $('#panel-perfil').innerHTML = `${avatarHTML(usuario)}<div><strong>${esc(usuario.nombreCompleto)}</strong><span>${esc(ROLES[usuario.rol])}</span></div>`;
}

function pintarNav(actual) {
  $('#nav-admin').innerHTML = visibles().map((s, i) => `
    ${i === visibles().findIndex((x) => x.super) ? '<span class="grupo">Superadministración</span>' : ''}
    <a href="#${s.id}" class="${s.id === actual ? 'activo' : ''}">${s.icono}${s.texto}${s.contador && resumen?.[s.contador] ? `<span class="n">${resumen[s.contador]}</span>` : ''}</a>`).join('')
    + `<span class="grupo">Cuenta</span><a href="cuenta.html">${I.usuario}Mi cuenta</a>`;
}

function encabezado(titulo, texto = '', accion = '') {
  return `<div class="encabezado-seccion"><div><h1>${titulo}</h1>${texto ? `<p>${texto}</p>` : ''}</div>${accion}</div>`;
}

async function navegar() {
  const id = location.hash.slice(1) || 'tablero';
  const s = visibles().find((x) => x.id === id) || visibles()[0];
  pintarNav(s.id);
  document.title = `${s.texto} · Panel Hawkify`;
  contenido.innerHTML = cargandoHTML();
  try {
    await RENDER[s.id]();
  } catch (e) {
    contenido.innerHTML = errorHTML(e);
  }
}

async function refrescarResumen() {
  try {
    resumen = await get('/admin/resumen');
    pintarNav(location.hash.slice(1) || 'tablero');
  } catch { /* el tablero lo muestra si falla */ }
}

const miniFoto = (url) => (url ? `<img src="${esc(url)}" alt="">` : '<span class="mini-foto"></span>');

// ================================================================== tablero

async function renderTablero() {
  resumen = await get('/admin/resumen');
  pintarNav('tablero');
  const [porEntregar, enCurso, pendientes] = await Promise.all([
    get('/admin/reservas', { estado: 'confirmada', hasta: hoyISO(), tamano: 20 }),
    get('/admin/reservas', { estado: 'en_curso', tamano: 100 }),
    puede('catalogo_aprobar') ? get('/admin/productos', { alcance: 'pendientes', tamano: 5 }) : { contenido: [] },
  ]);
  const vencidas = enCurso.contenido.filter((r) => r.fechaFin <= hoyISO());
  const permisos = usuario.permisos || [];
  const r = resumen;

  contenido.innerHTML = `
    ${encabezado(`Buen día, ${esc(usuario.nombreCompleto.split(' ')[0])}`, esSuper() ? 'Visión global de la plataforma.' : 'Operación del inventario que gestionas.')}
    ${!esSuper() && permisos.length < 5 ? `<div class="alerta alerta-info mb-24">${I.info}<div><strong>Tu alcance:</strong> ${permisos.map((p) => p.replace('_', ' ')).join(' · ') || 'solo lectura'}. Para ampliarlo, habla con el superadministrador.</div></div>` : ''}
    <div class="kpis">
      <div class="kpi acento"><span>Ingresos del mes</span><strong>${cop(r.ingresosMes)}</strong><small>reservas pagadas</small></div>
      <a class="kpi" href="#reservas"><span>Reservas activas</span><strong>${r.reservasActivas}</strong><small>confirmadas y en curso</small></a>
      <a class="kpi ${r.entregasHoy ? 'alerta-kpi' : ''}" href="#reservas"><span>Por entregar</span><strong>${r.entregasHoy}</strong><small>inician hoy o antes</small></a>
      <a class="kpi ${r.devolucionesPendientes ? 'alerta-kpi' : ''}" href="#reservas"><span>Devoluciones</span><strong>${r.devolucionesPendientes}</strong><small>vencen hoy o antes</small></a>
      <a class="kpi ${r.incidencias ? 'alerta-kpi' : ''}" href="#reservas"><span>Incidencias abiertas</span><strong>${r.incidencias}</strong><small>daños o pérdidas</small></a>
      ${puede('catalogo_aprobar') ? `<a class="kpi ${r.publicacionesPendientes ? 'alerta-kpi' : ''}" href="#aprobaciones"><span>Por aprobar</span><strong>${r.publicacionesPendientes}</strong><small>publicaciones nuevas</small></a>` : ''}
      <a class="kpi" href="#inventario"><span>Herramientas publicadas</span><strong>${r.herramientasPublicadas}</strong><small>${esSuper() ? 'en todo el catálogo' : 'bajo tu gestión'}</small></a>
      <a class="kpi" href="#resenas"><span>Reseñas recientes</span><strong>${r.resenasUltimos7Dias}</strong><small>últimos 7 días</small></a>
    </div>
    <div class="dos-columnas">
      <div class="tarjeta"><div class="tarjeta-cuerpo">
        <div class="tarjeta-titulo"><h3>Para entregar</h3><a class="enlace texto-pequeno" href="#reservas">Todas las reservas</a></div>
        ${porEntregar.contenido.length ? `<div class="lista-simple">${porEntregar.contenido.map((x) => filaOperativa(x, 'Entregar', 'entregar')).join('')}</div>`
          : '<p class="tenue texto-pequeno">Nada pendiente de entrega hoy.</p>'}
      </div></div>
      <div class="tarjeta"><div class="tarjeta-cuerpo">
        <div class="tarjeta-titulo"><h3>Devoluciones de hoy o vencidas</h3></div>
        ${vencidas.length ? `<div class="lista-simple">${vencidas.map((x) => filaOperativa(x, 'Registrar devolución', 'devolucion')).join('')}</div>`
          : '<p class="tenue texto-pequeno">No hay devoluciones pendientes.</p>'}
      </div></div>
    </div>
    ${pendientes.contenido.length ? `<div class="tarjeta mt-24"><div class="tarjeta-cuerpo">
      <div class="tarjeta-titulo"><h3>Publicaciones esperando revisión</h3><a class="enlace texto-pequeno" href="#aprobaciones">Revisar</a></div>
      <div class="lista-simple">${pendientes.contenido.map((p) => `
        <div class="entre"><div class="celda-producto">${miniFoto(p.imagen)}<div><strong>${esc(p.nombre)}</strong><span>${esc(p.propietario.nombre)} · ${hace(p.creadoEn)}</span></div></div><span class="precio-dia">${cop(p.tarifaDia)}</span></div>`).join('')}</div>
    </div></div>` : ''}`;

  const todas = [...porEntregar.contenido, ...vencidas];
  $$('[data-op]').forEach((b) => b.addEventListener('click', () => {
    const reserva = todas.find((x) => x.id === b.dataset.id);
    if (b.dataset.op === 'entregar') cambiarEstadoReserva(reserva, 'en_curso', renderTablero);
    else modalDevolucion(reserva, renderTablero);
  }));
}

function filaOperativa(r, texto, op) {
  return `<div class="entre">
    <div class="celda-producto" style="min-width:0;flex:1 1 240px">${miniFoto(r.producto.imagen)}<div><strong>${esc(r.producto.nombre)}</strong>
      <span>${esc(r.codigo)} · ${esc(r.arrendatario?.nombre || '')} · ${fechaDia(op === 'entregar' ? r.fechaInicio : r.fechaFin)}</span></div></div>
    ${puede('reservas_gestionar') ? `<button class="btn btn-sm btn-oscuro" data-op="${op}" data-id="${r.id}">${texto}</button>` : ''}
  </div>`;
}

// ================================================================== aprobaciones

async function renderAprobaciones() {
  const p = await get('/admin/productos', { alcance: 'pendientes', tamano: 50 });
  contenido.innerHTML = `
    ${encabezado('Aprobaciones', 'Filtro de calidad del marketplace: revisa que la ficha sea clara, las fotos reales y la tarifa razonable.')}
    ${p.contenido.length ? `<div class="pila">${p.contenido.map((x) => `
      <div class="tarjeta"><div class="tarjeta-cuerpo">
        <div class="entre" style="align-items:flex-start">
          <div class="fila" style="flex-wrap:nowrap;align-items:flex-start">
            <div style="width:150px;flex-shrink:0;border-radius:8px;overflow:hidden;aspect-ratio:7/4.6;background:var(--foto)">${fotoHTML(x.imagen)}</div>
            <div>
              <div class="fila" style="gap:8px">${etiqueta('publicacion', x.estadoPublicacion)}<span class="mono texto-pequeno tenue">${esc(x.codigo)}</span></div>
              <h3 class="mt-8">${esc(x.nombre)}</h3>
              <div class="texto-pequeno tenue mt-8">${esc(x.categoria.nombre)}${x.marca ? ` · ${esc(x.marca.nombre)}` : ''} · ${esc(FISICO[x.estadoFisico])} · ${plural(x.unidadesTotales, 'unidad', 'unidades')}</div>
              <div class="texto-pequeno mt-8">Publicada por <strong>${esc(x.propietario.nombre)}</strong> (${esc(x.propietario.correo)}) · ${hace(x.creadoEn)}</div>
              ${x.imagen ? '' : `<div class="texto-pequeno mt-8" style="color:var(--aviso)">${I.alerta.replace('<svg', '<svg width="14" height="14" style="vertical-align:-2px"')} Sin fotos</div>`}
            </div>
          </div>
          <div style="text-align:right"><div class="precio-grande mono" style="font-size:24px;font-weight:600">${cop(x.tarifaDia)}</div><span class="texto-pequeno tenue">por día</span></div>
        </div>
        <div class="fila mt-16" style="justify-content:flex-end">
          <a class="btn btn-sm btn-fantasma" href="producto.html?id=${x.id}" target="_blank">${I.ojo} Ver ficha completa</a>
          <button class="btn btn-sm btn-linea" data-rechazar="${x.id}">Pedir ajustes</button>
          <button class="btn btn-sm btn-exito" data-aprobar="${x.id}">${I.check} Aprobar y publicar</button>
        </div>
      </div></div>`).join('')}</div>`
      : vacioHTML({ icono: I.checkCirculo, titulo: 'Bandeja al día', texto: 'No hay publicaciones esperando revisión.' })}`;

  $$('[data-aprobar]').forEach((b) => b.addEventListener('click', async () => {
    b.classList.add('cargando');
    try {
      await post(`/admin/productos/${b.dataset.aprobar}/aprobar`);
      toast('Publicada. Avisamos al propietario.', 'ok');
      refrescarResumen();
      renderAprobaciones();
    } catch (e) { toastError(e); b.classList.remove('cargando'); }
  }));
  $$('[data-rechazar]').forEach((b) => b.addEventListener('click', async () => {
    const ok = await confirmar({
      titulo: 'Pedir ajustes al propietario',
      mensaje: 'La ficha no se publica. El propietario verá el motivo y, al corregirla, vuelve a esta bandeja.',
      textoOk: 'Enviar ajustes', motivo: true, motivoObligatorio: true, etiquetaMotivo: 'Qué debe corregir',
      placeholder: 'Ej. Sube fotos reales del equipo; la tarifa parece alta para una pulidora usada.',
      accion: (m) => post(`/admin/productos/${b.dataset.rechazar}/rechazar`, { motivo: m }),
    });
    if (ok) { toast('Enviado al propietario'); refrescarResumen(); renderAprobaciones(); }
  }));
}

// ================================================================== inventario

const filtrosInventario = { q: '', estado: '', alcance: 'todos', pagina: 0 };

async function renderInventario() {
  const p = await get('/admin/productos', { ...filtrosInventario, tamano: 20 });
  const gestiona = puede('catalogo_gestionar');
  contenido.innerHTML = `
    ${encabezado('Inventario', esSuper() ? 'Todas las fichas de la plataforma, sin importar quién las gestione.' : 'Herramientas que publicaste o aprobaste, más la cola de pendientes.',
      gestiona ? `<button class="btn" id="nueva">${I.mas} Nueva herramienta</button>` : '')}
    <div class="filtros-linea">
      <input type="search" id="f-q" placeholder="Buscar por nombre o propietario" value="${esc(filtrosInventario.q)}">
      <select id="f-estado">
        <option value="">Todos los estados</option>
        ${['aprobado', 'pendiente_aprobacion', 'pausado', 'rechazado', 'retirado'].map((e) => `<option value="${e}" ${filtrosInventario.estado === e ? 'selected' : ''}>${textoEstado('publicacion', e)}</option>`).join('')}
      </select>
      ${esSuper() ? `<select id="f-alcance"><option value="todos">Toda la plataforma</option><option value="gestionados" ${filtrosInventario.alcance === 'gestionados' ? 'selected' : ''}>Solo los míos</option></select>` : ''}
      <span class="tenue texto-pequeno">${plural(p.totalElementos, 'herramienta', 'herramientas')}</span>
    </div>
    ${p.contenido.length ? `<div class="tabla-envoltura"><table class="tabla">
      <thead><tr><th>Herramienta</th><th>Propietario</th><th>Estado</th><th class="num">Tarifa</th><th class="num">Unidades</th><th>Calificación</th><th></th></tr></thead>
      <tbody>${p.contenido.map((x) => `<tr>
        <td><div class="celda-producto">${miniFoto(x.imagen)}<div><strong>${esc(x.nombre)}</strong><span>${esc(x.codigo)} · ${esc(x.categoria.nombre)}</span></div></div></td>
        <td class="texto-pequeno">${esc(x.propietario.nombre)}<div class="tenue">${esc(x.revisor ? `Revisó: ${x.revisor.nombre}` : 'Sin revisar')}</div></td>
        <td>${etiqueta('publicacion', x.estadoPublicacion)}${x.estadoFisico === 'en_mantenimiento' ? '<div class="mt-8"><span class="etiqueta mantenimiento sin-punto"><span>Mantenimiento</span></span></div>' : ''}</td>
        <td class="num">${cop(x.tarifaDia)}</td>
        <td class="num">${x.unidadesOperativas}/${x.unidadesTotales}</td>
        <td>${x.totalCalificaciones ? estrellasHTML(x.calificacionPromedio, { mostrarNumero: true, total: x.totalCalificaciones }) : '<span class="tenue">—</span>'}</td>
        <td class="acciones">
          <a class="btn btn-sm btn-fantasma" href="producto.html?id=${x.id}" target="_blank" title="Ver ficha">${I.ojo}</a>
          ${gestiona && x.estadoPublicacion !== 'retirado' ? `
            <button class="btn btn-sm btn-fantasma" data-accion="editar" data-id="${x.id}" title="Editar">${I.editar}</button>
            <button class="btn btn-sm btn-fantasma" data-accion="unidades" data-id="${x.id}" title="Unidades físicas">${I.caja}</button>
            ${x.estadoPublicacion === 'aprobado' ? `<button class="btn btn-sm btn-fantasma" data-accion="pausar" data-id="${x.id}" title="Pausar">${I.pausa}</button>` : ''}
            ${x.estadoPublicacion === 'pausado' ? `<button class="btn btn-sm btn-fantasma" data-accion="reactivar" data-id="${x.id}" title="Reactivar">${I.play}</button>` : ''}
            <button class="btn btn-sm btn-fantasma" data-accion="retirar" data-id="${x.id}" title="Retirar del catálogo" style="--fg:var(--error)">${I.retirar}</button>` : ''}
        </td></tr>`).join('')}</tbody></table></div>${paginacionHTML(p.pagina, p.totalPaginas)}`
      : vacioHTML({ icono: I.herramienta, titulo: 'Sin resultados', texto: 'Ajusta los filtros o crea una herramienta nueva.' })}`;

  $('#f-q').addEventListener('input', debounce((e) => { filtrosInventario.q = e.target.value.trim(); filtrosInventario.pagina = 0; renderInventario(); }, 400));
  $('#f-estado').addEventListener('change', (e) => { filtrosInventario.estado = e.target.value; filtrosInventario.pagina = 0; renderInventario(); });
  $('#f-alcance')?.addEventListener('change', (e) => { filtrosInventario.alcance = e.target.value; filtrosInventario.pagina = 0; renderInventario(); });
  enlazarPaginacion(contenido, (n) => { filtrosInventario.pagina = n; renderInventario(); });
  $('#nueva')?.addEventListener('click', () => abrirFormularioProducto({ modo: 'admin', alGuardar: renderInventario }));
  $$('[data-accion]').forEach((b) => b.addEventListener('click', () => accionInventario(b.dataset.accion, p.contenido.find((x) => x.id === b.dataset.id))));
  if (filtrosInventario.q) {
    const q = $('#f-q');
    q.focus();
    q.setSelectionRange(q.value.length, q.value.length);
  }
}

async function accionInventario(accion, x) {
  try {
    if (accion === 'editar') return abrirFormularioProducto({ id: x.id, modo: 'admin', alGuardar: renderInventario });
    if (accion === 'unidades') return modalUnidades(x);
    if (accion === 'pausar') {
      const m = await confirmar({ titulo: `Pausar “${x.nombre}”`, mensaje: 'Baja temporal (por ejemplo, mantenimiento). Deja de aparecer en el catálogo; las reservas confirmadas se mantienen.', textoOk: 'Pausar', motivo: true, etiquetaMotivo: 'Motivo interno' , accion: (mot) => post(`/admin/productos/${x.id}/pausar`, { motivo: mot || null }) });
      if (m !== null) toast('Herramienta pausada', 'ok');
    }
    if (accion === 'reactivar') {
      await post(`/admin/productos/${x.id}/reactivar`);
      toast('Herramienta reactivada. Avisamos a quienes la tenían en su lista.', 'ok');
    }
    if (accion === 'retirar') {
      const m = await confirmar({ titulo: `Retirar “${x.nombre}”`, mensaje: 'Baja definitiva: sale del catálogo y sus unidades quedan retiradas. No se puede con reservas activas.', textoOk: 'Retirar definitivamente', peligro: true, motivo: true, motivoObligatorio: true, accion: (mot) => post(`/admin/productos/${x.id}/retirar`, { motivo: mot }) });
      if (m !== null) toast('Herramienta retirada', 'ok');
    }
    return renderInventario();
  } catch (e) {
    toastError(e);
    return undefined;
  }
}

async function modalUnidades(x) {
  const unidades = await get(`/admin/productos/${x.id}/unidades`);
  const { el, cerrar } = modal({
    titulo: 'Unidades físicas',
    subtitulo: `${esc(x.nombre)} · cada unidad se reserva por separado`,
    ancho: 'ancho',
    cuerpo: `<div class="tabla-envoltura"><table class="tabla"><thead><tr><th>Código</th><th>Estado</th><th>Alta</th><th>Cambiar a</th></tr></thead><tbody>
      ${unidades.map((u) => `<tr><td class="mono">${esc(u.codigoInterno)}</td><td>${etiqueta('unidad', u.estado)}</td><td class="texto-pequeno">${fecha(u.creadoEn)}</td>
        <td>${u.estado === 'retirada' ? '<span class="tenue texto-pequeno">—</span>' : `<select data-unidad="${u.id}" class="entrada" style="padding:6px 8px;width:auto">
          ${['disponible', 'en_mantenimiento', 'retirada'].map((e) => `<option value="${e}" ${u.estado === e ? 'selected' : ''}>${textoEstado('unidad', e)}</option>`).join('')}</select>`}</td></tr>`).join('')}
    </tbody></table></div>
    <p class="texto-pequeno tenue mt-16">Para agregar unidades, edita la ficha y aumenta “Unidades físicas”.</p>`,
    acciones: [{ texto: 'Listo', clase: 'btn-oscuro' }],
    alCerrar: renderInventario,
  });
  $$('[data-unidad]', el).forEach((s) => s.addEventListener('change', async () => {
    try {
      await patch(`/admin/unidades/${s.dataset.unidad}`, { estado: s.value });
      toast('Unidad actualizada', 'ok');
      s.closest('tr').children[1].innerHTML = etiqueta('unidad', s.value);
    } catch (e) {
      toastError(e);
      cerrar();
    }
  }));
}

// ================================================================== reservas

const filtrosReservas = { q: '', estado: '', desde: '', hasta: '', pagina: 0 };
let vistaReservas = 'lista';
let mesCalendario = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

async function renderReservas() {
  contenido.innerHTML = `
    ${encabezado('Reservas', 'Calendario de alquileres, entregas, devoluciones e incidencias.',
      `<div class="segmentado"><button data-vista="lista" class="${vistaReservas === 'lista' ? 'activo' : ''}">${I.lista.replace('<svg', '<svg width="15" height="15" style="vertical-align:-3px"')} Lista</button><button data-vista="calendario" class="${vistaReservas === 'calendario' ? 'activo' : ''}">${I.calendario.replace('<svg', '<svg width="15" height="15" style="vertical-align:-3px"')} Calendario</button></div>`)}
    <div id="vista-reservas">${cargandoHTML()}</div>`;
  $$('[data-vista]').forEach((b) => b.addEventListener('click', () => { vistaReservas = b.dataset.vista; renderReservas(); }));
  if (vistaReservas === 'lista') await listaReservas();
  else await calendarioReservas();
}

async function listaReservas() {
  const p = await get('/admin/reservas', { ...filtrosReservas, tamano: 20 });
  const cont = $('#vista-reservas');
  cont.innerHTML = `
    <div class="filtros-linea">
      <input type="search" id="r-q" placeholder="Código, cliente o herramienta" value="${esc(filtrosReservas.q)}">
      <select id="r-estado"><option value="">Todos los estados</option>
        ${['pendiente_pago', 'confirmada', 'en_curso', 'con_incidencia', 'finalizada', 'cancelada'].map((e) => `<option value="${e}" ${filtrosReservas.estado === e ? 'selected' : ''}>${textoEstado('reserva', e)}</option>`).join('')}
      </select>
      <input type="date" id="r-desde" value="${filtrosReservas.desde}" aria-label="Desde" title="Reservas que terminan desde">
      <input type="date" id="r-hasta" value="${filtrosReservas.hasta}" aria-label="Hasta" title="Reservas que inician hasta">
      <span class="tenue texto-pequeno">${plural(p.totalElementos, 'reserva', 'reservas')}</span>
    </div>
    ${p.contenido.length ? `<div class="tabla-envoltura"><table class="tabla">
      <thead><tr><th>Reserva</th><th>Herramienta</th><th>Cliente</th><th>Fechas</th><th>Estado</th><th class="num">Total</th><th></th></tr></thead>
      <tbody>${p.contenido.map((r) => `<tr>
        <td style="white-space:nowrap"><span class="mono">${esc(r.codigo)}</span><div class="texto-pequeno tenue">${r.modalidadEntrega === 'domicilio' ? 'Domicilio' : 'Recoge'}</div></td>
        <td><div class="celda-producto">${miniFoto(r.producto.imagen)}<div><strong>${esc(r.producto.nombre)}</strong><span>${esc(r.unidad)}</span></div></div></td>
        <td class="texto-pequeno">${esc(r.arrendatario?.nombre || '')}<div class="tenue">${esc(r.arrendatario?.telefono || r.arrendatario?.correo || '')}</div></td>
        <td class="mono texto-pequeno" style="white-space:nowrap">${fechaDia(r.fechaInicio)}<br>${fechaDia(r.fechaFin)}</td>
        <td>${etiqueta('reserva', r.estado)}</td>
        <td class="num">${cop(r.total)}</td>
        <td class="acciones">${accionesReserva(r)}</td></tr>`).join('')}</tbody></table></div>${paginacionHTML(p.pagina, p.totalPaginas)}`
      : vacioHTML({ icono: I.calendario, titulo: 'Sin reservas con esos filtros' })}`;

  const recargar = () => { filtrosReservas.pagina = 0; listaReservas(); };
  $('#r-q').addEventListener('input', debounce((e) => { filtrosReservas.q = e.target.value.trim(); recargar(); }, 400));
  $('#r-estado').addEventListener('change', (e) => { filtrosReservas.estado = e.target.value; recargar(); });
  $('#r-desde').addEventListener('change', (e) => { filtrosReservas.desde = e.target.value; recargar(); });
  $('#r-hasta').addEventListener('change', (e) => { filtrosReservas.hasta = e.target.value; recargar(); });
  enlazarPaginacion(cont, (n) => { filtrosReservas.pagina = n; listaReservas(); });
  enlazarAccionesReserva(cont, p.contenido, listaReservas);
}

function accionesReserva(r) {
  const b = [`<button class="btn btn-sm btn-fantasma" data-r="detalle" data-id="${r.id}" title="Detalle">${I.ojo}</button>`];
  if (!puede('reservas_gestionar')) return b.join('');
  if (r.estado === 'confirmada') {
    b.push(`<button class="btn btn-sm btn-oscuro" data-r="entregar" data-id="${r.id}">Entregar</button>`);
    b.push(`<button class="btn btn-sm btn-fantasma" data-r="cancelar" data-id="${r.id}" title="Cancelar">${I.cerrar}</button>`);
  }
  if (r.estado === 'en_curso') {
    b.push(`<button class="btn btn-sm btn-oscuro" data-r="devolucion" data-id="${r.id}">Devolución</button>`);
    b.push(`<button class="btn btn-sm btn-fantasma" data-r="incidencia" data-id="${r.id}" title="Reportar incidencia">${I.alerta}</button>`);
  }
  if (r.estado === 'con_incidencia') {
    b.push(r.devolucion
      ? `<button class="btn btn-sm btn-linea" data-r="cerrar" data-id="${r.id}">Cerrar incidencia</button>`
      : `<button class="btn btn-sm btn-oscuro" data-r="devolucion" data-id="${r.id}">Devolución</button>`);
  }
  return b.join('');
}

function enlazarAccionesReserva(cont, reservas, recargar) {
  $$('[data-r]', cont).forEach((b) => b.addEventListener('click', () => {
    const r = reservas.find((x) => x.id === b.dataset.id);
    ({
      detalle: () => detalleReservaAdmin(r),
      entregar: () => cambiarEstadoReserva(r, 'en_curso', recargar),
      cancelar: () => cambiarEstadoReserva(r, 'cancelada', recargar),
      incidencia: () => cambiarEstadoReserva(r, 'con_incidencia', recargar),
      cerrar: () => cambiarEstadoReserva(r, 'finalizada', recargar),
      devolucion: () => modalDevolucion(r, recargar),
    })[b.dataset.r]();
  }));
}

async function cambiarEstadoReserva(r, estado, recargar) {
  const textos = {
    en_curso: ['Confirmar entrega', `¿Entregaste la unidad ${esc(r.unidad)} a ${esc(r.arrendatario?.nombre || 'el cliente')}? El cliente recibe un aviso con la fecha de devolución.`, 'Sí, entregada', false],
    cancelada: ['Cancelar reserva', 'El cliente recibe el motivo y el pago queda marcado como reembolsado.', 'Cancelar reserva', true],
    con_incidencia: ['Reportar incidencia', 'Úsalo si hay un problema durante el alquiler (retraso, falla, reclamo).', 'Reportar', true],
    finalizada: ['Cerrar incidencia', 'La reserva pasa a finalizada y el cliente podrá calificarla.', 'Cerrar incidencia', false],
  }[estado];
  const conMotivo = ['cancelada', 'con_incidencia'].includes(estado);
  const res = await confirmar({
    titulo: `${textos[0]} · ${r.codigo}`,
    mensaje: textos[1],
    textoOk: textos[2],
    peligro: textos[3],
    motivo: conMotivo,
    motivoObligatorio: conMotivo,
    accion: (m) => patch(`/admin/reservas/${r.id}/estado`, { estado, motivo: conMotivo ? m : null }),
  });
  if (res !== null) {
    toast(`Reserva ${r.codigo}: ${textoEstado('reserva', estado).toLowerCase()}`, 'ok');
    refrescarResumen();
    recargar();
  }
}

function modalDevolucion(r, recargar) {
  modal({
    titulo: `Registrar devolución · ${r.codigo}`,
    subtitulo: `${esc(r.producto.nombre)} · unidad ${esc(r.unidad)} · debía volver el ${fechaDia(r.fechaFin)}`,
    cuerpo: `<form class="form-pila" onsubmit="return false">
      <div class="campo"><span class="campo-titulo">¿En qué estado llegó el equipo?</span>
        <div class="opciones-tarjeta">
          <label class="opcion-tarjeta"><input type="radio" name="estadoEquipo" value="sin_novedad" checked><div><div class="titulo">Sin novedad</div><div class="detalle">La reserva se finaliza y el cliente puede calificar.</div></div></label>
          <label class="opcion-tarjeta"><input type="radio" name="estadoEquipo" value="con_dano"><div><div class="titulo">Con daño</div><div class="detalle">La unidad pasa a mantenimiento y la reserva queda con incidencia.</div></div></label>
          <label class="opcion-tarjeta"><input type="radio" name="estadoEquipo" value="perdida"><div><div class="titulo">Pérdida</div><div class="detalle">La unidad se retira del inventario y se abre incidencia.</div></div></label>
        </div></div>
      <div class="campo"><label for="obs">Observaciones</label><textarea id="obs" name="observaciones" maxlength="2000" placeholder="Obligatorio si hay daño o pérdida: qué se encontró, piezas faltantes, estado de baterías…"></textarea><span class="msg-error"></span></div>
    </form>`,
    acciones: [
      { texto: 'Cancelar', clase: 'btn-fantasma' },
      {
        texto: 'Registrar devolución',
        clase: 'btn-oscuro',
        accion: async (velo) => {
          const d = datosFormulario($('form', velo));
          await post(`/admin/reservas/${r.id}/devolucion`, { estadoEquipo: d.estadoEquipo, observaciones: d.observaciones || null });
          toast('Devolución registrada', 'ok');
          refrescarResumen();
          recargar();
        },
      },
    ],
  });
}

function detalleReservaAdmin(r) {
  const filas = [
    ['Estado', textoEstado('reserva', r.estado)],
    ['Cliente', `${r.arrendatario?.nombre || ''} · ${r.arrendatario?.correo || ''}`],
    ['Teléfono', r.arrendatario?.telefono || '—'],
    ['Propietario', r.propietario?.nombre || '—'],
    ['Unidad', r.unidad],
    ['Fechas', `${fechaDia(r.fechaInicio)} → ${fechaDia(r.fechaFin)} (${plural(r.dias, 'día', 'días')})`],
    ['Tarifa congelada', `${cop(r.tarifaDia)} / día`],
    ['Total', cop(r.total)],
    ['Entrega', r.modalidadEntrega === 'domicilio' ? r.direccionEntrega : 'Recoge en punto Hawkify'],
    ['Creada', fechaHora(r.creadoEn)],
  ];
  if (r.pago) filas.push(['Pago', `${METODOS[r.pago.metodo]} · ${textoEstado('pago', r.pago.estado)} · ${r.pago.referencia || ''}`]);
  if (r.devolucion) filas.push(['Devolución', `${textoEstado('equipo', r.devolucion.estadoEquipo)} · ${fechaHora(r.devolucion.fecha)} · ${r.devolucion.registradoPor}`]);
  if (r.devolucion?.observaciones) filas.push(['Observaciones', r.devolucion.observaciones]);
  if (r.motivoCancelacion) filas.push(['Motivo', r.motivoCancelacion]);
  if (r.calificacion) filas.push(['Calificación', `${r.calificacion.estrellas} ★${r.calificacion.resena?.texto ? ` · “${r.calificacion.resena.texto}”` : ''}`]);
  modal({
    titulo: `${r.codigo} · ${r.producto.nombre}`,
    ancho: 'ancho',
    cuerpo: `<div class="comprobante" style="margin:0;max-width:none">${filas.map(([k, v]) => `<div class="fila"><span>${esc(k)}</span><span>${esc(v)}</span></div>`).join('')}</div>`,
    acciones: [{ texto: 'Cerrar', clase: 'btn-oscuro' }],
  });
}

async function calendarioReservas() {
  const inicio = mesCalendario;
  const fin = new Date(inicio.getFullYear(), inicio.getMonth() + 1, 0);
  const p = await get('/admin/reservas', { desde: iso(inicio), hasta: iso(fin), tamano: 300 });
  const reservas = p.contenido.filter((r) => r.estado !== 'cancelada');
  const productos = [...new Map(reservas.map((r) => [r.producto.id, r.producto])).values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
  const dias = fin.getDate();
  const hoy = hoyISO();
  const fmtMes = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(inicio);
  const ancho = 30;

  const cont = $('#vista-reservas');
  const cabecera = Array.from({ length: dias }, (_, i) => {
    const d = new Date(inicio.getFullYear(), inicio.getMonth(), i + 1);
    const finde = [0, 6].includes(d.getDay());
    return `<th class="${iso(d) === hoy ? 'hoy' : finde ? 'finde' : ''}">${i + 1}</th>`;
  }).join('');

  const filas = productos.map((prod) => {
    const propias = reservas.filter((r) => r.producto.id === prod.id);
    const celdas = Array.from({ length: dias }, (_, i) => {
      const d = new Date(inicio.getFullYear(), inicio.getMonth(), i + 1);
      const finde = [0, 6].includes(d.getDay());
      const dia = iso(d);
      const tramos = propias.filter((r) => (r.fechaInicio === dia) || (i === 0 && r.fechaInicio < dia && r.fechaFin >= dia));
      return `<td class="${finde ? 'finde' : ''}">${tramos.map((r, k) => {
        const hastaDia = r.fechaFin > iso(fin) ? dias : aFecha(r.fechaFin).getDate();
        const desdeDia = i + 1;
        const largo = hastaDia - desdeDia + 1;
        return `<button class="tramo ${r.estado}" data-r="detalle" data-id="${r.id}" data-largo="${largo}" style="width:${largo * ancho - 4}px;top:${5 + k * 3}px" title="${esc(r.codigo)} · ${esc(r.arrendatario?.nombre || '')} · ${textoEstado('reserva', r.estado)}">${esc(r.unidad.split('-').pop())} ${esc((r.arrendatario?.nombre || '').split(' ')[0])}</button>`;
      }).join('')}</td>`;
    }).join('');
    return `<tr><th title="${esc(prod.nombre)}">${esc(prod.nombre)}</th>${celdas}</tr>`;
  }).join('');

  cont.innerHTML = `
    <div class="entre mb-16">
      <div class="fila">
        <button class="btn btn-sm btn-linea" id="mes-ant" aria-label="Mes anterior">${I.izq}</button>
        <strong style="font-family:var(--f-display);font-stretch:85%;font-size:19px;min-width:170px;text-align:center">${fmtMes.charAt(0).toUpperCase() + fmtMes.slice(1)}</strong>
        <button class="btn btn-sm btn-linea" id="mes-sig" aria-label="Mes siguiente">${I.der}</button>
        <button class="btn btn-sm btn-fantasma" id="mes-hoy">Hoy</button>
      </div>
      <div class="leyenda-calendario" style="margin:0">
        ${['pendiente_pago', 'confirmada', 'en_curso', 'con_incidencia', 'finalizada'].map((e) => `<span><i class="tramo ${e}" style="position:static;display:inline-block;width:14px;height:10px"></i>${textoEstado('reserva', e)}</span>`).join('')}
      </div>
    </div>
    ${productos.length ? `<div class="gantt"><table>
      <thead><tr><th style="min-width:220px;text-align:left;padding-left:12px">Herramienta</th>${cabecera}</tr></thead>
      <tbody>${filas}</tbody></table></div>` : vacioHTML({ icono: I.calendario, titulo: 'Sin reservas este mes' })}`;

  // Ajusta el largo de cada tramo al ancho real de las celdas y lleva la vista al día de hoy.
  const celda = $('.gantt tbody td', cont);
  if (celda) {
    const anchoReal = celda.getBoundingClientRect().width;
    $$('.tramo[data-largo]', cont).forEach((t) => { t.style.width = `${Number(t.dataset.largo) * anchoReal - 4}px`; });
    const thHoy = $('.gantt thead th.hoy', cont);
    if (thHoy) $('.gantt', cont).scrollLeft = Math.max(0, thHoy.offsetLeft - 320);
  }

  $('#mes-ant').addEventListener('click', () => { mesCalendario = new Date(inicio.getFullYear(), inicio.getMonth() - 1, 1); calendarioReservas(); });
  $('#mes-sig').addEventListener('click', () => { mesCalendario = new Date(inicio.getFullYear(), inicio.getMonth() + 1, 1); calendarioReservas(); });
  $('#mes-hoy').addEventListener('click', () => { mesCalendario = new Date(new Date().getFullYear(), new Date().getMonth(), 1); calendarioReservas(); });
  enlazarAccionesReserva(cont, reservas, calendarioReservas);
}

// ================================================================== usuarios

const filtrosUsuarios = { q: '', rol: '', estado: '', pagina: 0 };
let catalogoPermisos = [];

async function renderUsuarios() {
  const [p, permisos] = await Promise.all([
    get('/admin/usuarios', { ...filtrosUsuarios, tamano: 20 }),
    catalogoPermisos.length ? catalogoPermisos : get('/admin/permisos'),
  ]);
  catalogoPermisos = permisos;
  contenido.innerHTML = `
    ${encabezado('Usuarios', esSuper() ? 'Cuentas de toda la plataforma, incluidos los administradores y su alcance.' : 'Usuarios finales: datos, suspensiones y desactivaciones.',
      `<button class="btn" id="crear-usuario">${I.mas} Crear usuario</button>`)}
    <div class="filtros-linea">
      <input type="search" id="u-q" placeholder="Nombre, correo o documento" value="${esc(filtrosUsuarios.q)}">
      ${esSuper() ? `<select id="u-rol"><option value="">Todos los roles</option>${Object.entries(ROLES).map(([k, v]) => `<option value="${k}" ${filtrosUsuarios.rol === k ? 'selected' : ''}>${v}</option>`).join('')}</select>` : ''}
      <select id="u-estado"><option value="">Todos los estados</option>${['activo', 'suspendido', 'desactivado'].map((e) => `<option value="${e}" ${filtrosUsuarios.estado === e ? 'selected' : ''}>${textoEstado('usuario', e)}</option>`).join('')}</select>
      <span class="tenue texto-pequeno">${plural(p.totalElementos, 'cuenta', 'cuentas')}</span>
    </div>
    ${p.contenido.length ? `<div class="tabla-envoltura"><table class="tabla">
      <thead><tr><th>Usuario</th><th>Rol</th><th>Estado</th><th>Contacto</th><th>Alta</th><th></th></tr></thead>
      <tbody>${p.contenido.map((u) => `<tr>
        <td><div class="fila" style="flex-wrap:nowrap">${avatarHTML(u)}<div><strong>${esc(u.nombreCompleto)}</strong><div class="texto-pequeno tenue">${esc(u.correo)}</div></div></div></td>
        <td class="texto-pequeno">${esc(ROLES[u.rol])}${u.rol === 'administrador' ? `<div class="tenue">${u.permisos.length}/5 permisos</div>` : ''}</td>
        <td>${etiqueta('usuario', u.estado)}${u.suspendidoHasta ? `<div class="texto-pequeno tenue mt-8">hasta ${fecha(u.suspendidoHasta)}</div>` : ''}${u.motivoEstado ? `<div class="texto-pequeno tenue" title="${esc(u.motivoEstado)}" style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(u.motivoEstado)}</div>` : ''}</td>
        <td class="texto-pequeno">${esc(u.telefono || '—')}<div class="tenue mono">${esc(u.documentoIdentidad || '')}</div></td>
        <td class="texto-pequeno mono">${fecha(u.creadoEn)}</td>
        <td class="acciones">${u.rol === 'superadmin' || u.id === usuario.id ? '' : `
          <button class="btn btn-sm btn-fantasma" data-u="editar" data-id="${u.id}" title="Editar">${I.editar}</button>
          ${u.estado === 'activo'
            ? `<button class="btn btn-sm btn-linea" data-u="suspender" data-id="${u.id}">Suspender</button><button class="btn btn-sm btn-fantasma" data-u="desactivar" data-id="${u.id}" style="--fg:var(--error)">${esSuper() && u.rol === 'administrador' ? 'Revocar' : 'Desactivar'}</button>`
            : `<button class="btn btn-sm btn-exito" data-u="activar" data-id="${u.id}">Reactivar</button>`}`}
        </td></tr>`).join('')}</tbody></table></div>${paginacionHTML(p.pagina, p.totalPaginas)}`
      : vacioHTML({ icono: I.usuarios, titulo: 'Sin usuarios con esos filtros' })}`;

  const recargar = () => { filtrosUsuarios.pagina = 0; renderUsuarios(); };
  $('#u-q').addEventListener('input', debounce((e) => { filtrosUsuarios.q = e.target.value.trim(); recargar(); }, 400));
  $('#u-rol')?.addEventListener('change', (e) => { filtrosUsuarios.rol = e.target.value; recargar(); });
  $('#u-estado').addEventListener('change', (e) => { filtrosUsuarios.estado = e.target.value; recargar(); });
  enlazarPaginacion(contenido, (n) => { filtrosUsuarios.pagina = n; renderUsuarios(); });
  $('#crear-usuario').addEventListener('click', () => modalUsuario(null));
  $$('[data-u]').forEach((b) => b.addEventListener('click', () => accionUsuario(b.dataset.u, p.contenido.find((u) => u.id === b.dataset.id))));
  if (filtrosUsuarios.q) {
    const q = $('#u-q');
    q.focus();
    q.setSelectionRange(q.value.length, q.value.length);
  }
}

function permisosHTML(seleccion) {
  return `<div class="campo" id="bloque-permisos"><span class="campo-titulo">Alcance del administrador</span>
    <div class="opciones-tarjeta">${catalogoPermisos.map((pm) => `
      <label class="opcion-tarjeta" style="padding:10px 12px"><input type="checkbox" name="permisos" value="${pm.codigo}" ${seleccion.includes(pm.codigo) ? 'checked' : ''}>
        <div><div class="titulo texto-pequeno">${esc(pm.codigo.replace('_', ' '))}</div><div class="detalle">${esc(pm.descripcion)}</div></div></label>`).join('')}</div></div>`;
}

function modalUsuario(u) {
  const nuevo = !u;
  const rolActual = u?.rol || 'usuario_final';
  const cuerpo = document.createElement('div');
  cuerpo.innerHTML = `<form class="form-pila" novalidate>
    <div class="fila-campos">
      <div class="campo"><label>Nombre completo</label><input name="nombreCompleto" value="${esc(u?.nombreCompleto || '')}"><span class="msg-error"></span></div>
      ${nuevo ? '<div class="campo"><label>Correo</label><input name="correo" type="email"><span class="msg-error"></span></div>' : `<div class="campo"><label>Correo</label><input value="${esc(u.correo)}" disabled></div>`}
      ${nuevo ? '<div class="campo"><label>Contraseña temporal</label><input name="password" autocomplete="new-password" placeholder="Mínimo 8, letras y números"><span class="msg-error"></span></div>' : `<div class="campo"><label>Documento</label><input name="documentoIdentidad" value="${esc(u.documentoIdentidad || '')}"><span class="msg-error"></span></div>`}
      <div class="campo"><label>Teléfono</label><input name="telefono" value="${esc(u?.telefono || '')}"><span class="msg-error"></span></div>
    </div>
    ${esSuper() ? `<div class="campo"><label>Rol</label><select name="rol">
      <option value="usuario_final" ${rolActual === 'usuario_final' ? 'selected' : ''}>Usuario final</option>
      <option value="administrador" ${rolActual === 'administrador' ? 'selected' : ''}>Administrador</option></select></div>
      <div id="contenedor-permisos" class="${rolActual === 'administrador' ? '' : 'oculto'}">${permisosHTML(u?.permisos || catalogoPermisos.map((p) => p.codigo))}</div>` : ''}
  </form>`;
  $('[name=rol]', cuerpo)?.addEventListener('change', (e) => $('#contenedor-permisos', cuerpo).classList.toggle('oculto', e.target.value !== 'administrador'));

  modal({
    titulo: nuevo ? 'Crear usuario' : `Editar ${u.nombreCompleto}`,
    ancho: 'ancho',
    cuerpo,
    acciones: [
      { texto: 'Cancelar', clase: 'btn-fantasma' },
      {
        texto: nuevo ? 'Crear cuenta' : 'Guardar',
        clase: 'btn-oscuro',
        accion: async (velo) => {
          const form = $('form', velo);
          const d = datosFormulario(form);
          const permisos = $$('[name=permisos]:checked', form).map((c) => c.value);
          const cuerpoReq = { ...d, permisos: d.rol === 'administrador' ? permisos : null };
          if (nuevo) await post('/admin/usuarios', cuerpoReq);
          else await put(`/admin/usuarios/${u.id}`, cuerpoReq);
          toast(nuevo ? 'Cuenta creada' : 'Usuario actualizado', 'ok');
          renderUsuarios();
        },
      },
    ],
  });
}

async function accionUsuario(accion, u) {
  if (accion === 'editar') return modalUsuario(u);
  if (accion === 'activar') {
    try {
      await patch(`/admin/usuarios/${u.id}/estado`, { estado: 'activo' });
      toast('Cuenta reactivada', 'ok');
      renderUsuarios();
    } catch (e) { toastError(e); }
    return undefined;
  }
  if (accion === 'suspender') {
    const manana = iso(new Date(Date.now() + 7 * 86400000));
    modal({
      titulo: `Suspender a ${u.nombreCompleto}`,
      subtitulo: 'No podrá iniciar sesión mientras dure la suspensión. Al vencer, la cuenta se reactiva sola.',
      cuerpo: `<form class="form-pila" onsubmit="return false">
        <div class="campo"><label>Motivo</label><textarea name="motivo" maxlength="300" placeholder="Ej. Devolución tardía reiterada"></textarea><span class="msg-error"></span></div>
        <div class="campo"><label>Suspendida hasta <span class="opcional">(vacío = indefinida)</span></label><input type="date" name="hasta" min="${iso(new Date(Date.now() + 86400000))}" value="${manana}"></div>
      </form>`,
      acciones: [
        { texto: 'Cancelar', clase: 'btn-fantasma' },
        {
          texto: 'Suspender',
          clase: 'btn-peligro',
          accion: async (velo) => {
            const d = datosFormulario($('form', velo));
            await patch(`/admin/usuarios/${u.id}/estado`, {
              estado: 'suspendido',
              motivo: d.motivo,
              suspendidoHasta: d.hasta ? `${d.hasta}T23:59:00-05:00` : null,
            });
            toast('Cuenta suspendida', 'ok');
            renderUsuarios();
          },
        },
      ],
    });
    return undefined;
  }
  if (accion === 'desactivar') {
    const revocar = u.rol === 'administrador';
    const m = await confirmar({
      titulo: revocar ? `Revocar acceso de ${u.nombreCompleto}` : `Desactivar a ${u.nombreCompleto}`,
      mensaje: revocar ? 'El administrador pierde acceso al panel y a la plataforma. Puedes reactivarlo después.' : 'La cuenta no podrá entrar hasta que la reactives.',
      textoOk: revocar ? 'Revocar' : 'Desactivar',
      peligro: true,
      motivo: true,
      motivoObligatorio: true,
      accion: (mot) => patch(`/admin/usuarios/${u.id}/estado`, { estado: 'desactivado', motivo: mot }),
    });
    if (m !== null) { toast('Cuenta desactivada', 'ok'); renderUsuarios(); }
  }
  return undefined;
}

// ================================================================== moderación

const filtrosResenas = { estado: '', pagina: 0 };

async function renderResenas() {
  const p = await get('/admin/resenas', { ...filtrosResenas, tamano: 20 });
  contenido.innerHTML = `
    ${encabezado('Moderación de reseñas', esSuper() ? 'Auditoría global: puedes revertir decisiones de cualquier administrador.' : 'Reseñas de las herramientas bajo tu gestión. Oculta o elimina lo que infrinja las normas (lenguaje ofensivo, publicidad no autorizada).')}
    <div class="pestanas">${[['', 'Todas'], ['visible', 'Visibles'], ['oculta', 'Ocultas'], ['eliminada', 'Eliminadas']].map(([v, t]) => `<button data-estado="${v}" class="${filtrosResenas.estado === v ? 'activo' : ''}">${t}</button>`).join('')}</div>
    ${p.contenido.length ? `<div class="tarjeta"><div class="tarjeta-cuerpo lista-simple">${p.contenido.map((r) => `
      <div>
        <div class="entre" style="align-items:flex-start">
          <div>
            <div class="fila" style="gap:8px">${estrellasHTML(r.estrellas)} ${etiqueta('moderacion', r.estado)} <span class="mono texto-pequeno tenue">${fecha(r.creadoEn)}</span></div>
            <div class="texto-pequeno mt-8"><strong>${esc(r.autor.nombre)}</strong> sobre <a class="enlace" href="producto.html?id=${r.producto.id}#resenas" target="_blank">${esc(r.producto.nombre)}</a></div>
          </div>
          <div class="fila">
            <button class="btn btn-sm btn-fantasma" data-m="historial" data-id="${r.id}">${I.historial} Historial</button>
            ${r.puedeModerar && r.estado === 'visible' ? `<button class="btn btn-sm btn-linea" data-m="ocultar" data-id="${r.id}">Ocultar</button>` : ''}
            ${r.puedeModerar && r.estado !== 'eliminada' ? `<button class="btn btn-sm btn-fantasma" data-m="eliminar" data-id="${r.id}" style="--fg:var(--error)">Eliminar</button>` : ''}
            ${r.puedeRevertir ? `<button class="btn btn-sm btn-oscuro" data-m="revertir" data-id="${r.id}">Revertir</button>` : ''}
          </div>
        </div>
        <p class="mt-8" style="color:var(--texto-2);${r.estado !== 'visible' ? 'opacity:.6' : ''}">${esc(r.texto)}</p>
      </div>`).join('')}</div></div>${paginacionHTML(p.pagina, p.totalPaginas)}`
      : vacioHTML({ icono: I.mensaje, titulo: 'Nada por aquí', texto: 'No hay reseñas en esta categoría.' })}`;

  $$('[data-estado]').forEach((b) => b.addEventListener('click', () => { filtrosResenas.estado = b.dataset.estado; filtrosResenas.pagina = 0; renderResenas(); }));
  enlazarPaginacion(contenido, (n) => { filtrosResenas.pagina = n; renderResenas(); });
  $$('[data-m]').forEach((b) => b.addEventListener('click', async () => {
    const id = b.dataset.id;
    if (b.dataset.m === 'historial') {
      const h = await get(`/admin/resenas/${id}/historial`);
      modal({
        titulo: 'Historial de moderación',
        cuerpo: h.length ? `<div class="lista-simple">${h.map((x) => `<div><div class="entre"><strong>${esc(x.accion)}</strong><span class="mono texto-pequeno tenue">${fechaHora(x.fecha)}</span></div><div class="texto-pequeno">${esc(x.moderador)}${x.motivo ? ` · ${esc(x.motivo)}` : ''}</div></div>`).join('')}</div>` : '<p class="tenue">Sin acciones de moderación.</p>',
        acciones: [{ texto: 'Cerrar', clase: 'btn-oscuro' }],
      });
      return;
    }
    const accion = b.dataset.m;
    const res = await confirmar({
      titulo: { ocultar: 'Ocultar reseña', eliminar: 'Eliminar reseña', revertir: 'Revertir moderación' }[accion],
      mensaje: {
        ocultar: 'Deja de mostrarse en la ficha. El autor recibe el motivo.',
        eliminar: 'Borrado lógico: queda registrada para auditoría y el superadministrador puede revertirlo.',
        revertir: 'La reseña vuelve a ser visible y el autor recibe un aviso.',
      }[accion],
      textoOk: 'Confirmar',
      peligro: accion !== 'revertir',
      motivo: true,
      motivoObligatorio: accion !== 'revertir',
      placeholder: accion === 'revertir' ? 'Motivo de la reversión' : 'Ej. Contiene datos de contacto de un tercero',
      accion: (m) => post(`/admin/resenas/${id}/moderar`, { accion, motivo: m || null }),
    });
    if (res !== null) { toast('Moderación registrada', 'ok'); renderResenas(); }
  }));
}

// ================================================================== calificaciones (RF-14)

let maxEstrellas = '';

async function renderCalificaciones() {
  const p = await get('/admin/calificaciones', { maxEstrellas, tamano: 100 });
  const porProducto = new Map();
  p.contenido.forEach((c) => {
    const x = porProducto.get(c.producto.id) || { nombre: c.producto.nombre, id: c.producto.id, suma: 0, n: 0, bajas: 0 };
    x.suma += c.estrellas;
    x.n += 1;
    if (c.estrellas <= 2) x.bajas += 1;
    porProducto.set(c.producto.id, x);
  });
  const ranking = [...porProducto.values()].map((x) => ({ ...x, prom: x.suma / x.n })).sort((a, b) => a.prom - b.prom);

  contenido.innerHTML = `
    ${encabezado('Calificaciones', 'Detecta equipos con desempeño deficiente antes de que afecten la reputación del catálogo.',
      `<select class="entrada" id="max-estrellas" style="width:auto"><option value="">Todas las calificaciones</option><option value="3" ${maxEstrellas === '3' ? 'selected' : ''}>3 estrellas o menos</option><option value="2" ${maxEstrellas === '2' ? 'selected' : ''}>2 estrellas o menos</option></select>`)}
    ${ranking.length ? `<div class="tarjeta mb-24"><div class="tarjeta-cuerpo">
      <h3 class="mb-16">Promedio por herramienta ${maxEstrellas ? `(solo ≤ ${maxEstrellas}★)` : ''}</h3>
      <div class="barras-h">${ranking.slice(0, 12).map((x) => `
        <div class="barra-h"><a href="producto.html?id=${x.id}" target="_blank" style="text-decoration:none" class="texto-pequeno">${esc(x.nombre)}</a>
          <div class="pista"><div class="relleno" style="width:${(x.prom / 5) * 100}%;background:${x.prom < 3.5 ? 'var(--error)' : x.prom < 4.2 ? 'var(--oro-hondo)' : 'var(--tinta)'}"></div></div>
          <span class="v">${x.prom.toFixed(1)}★ · ${x.n}</span></div>`).join('')}</div>
      ${ranking.some((x) => x.prom < 3.5) ? `<div class="alerta alerta-aviso mt-16">${I.alerta}<div>Hay herramientas por debajo de 3.5★. Considera revisarlas o pasarlas a mantenimiento.</div></div>` : ''}
    </div></div>` : ''}
    ${p.contenido.length ? `<div class="tabla-envoltura"><table class="tabla">
      <thead><tr><th>Herramienta</th><th>Cliente</th><th>Calificación</th><th>Fecha</th></tr></thead>
      <tbody>${p.contenido.map((c) => `<tr><td>${esc(c.producto.nombre)}</td><td class="texto-pequeno">${esc(c.autor.nombre)}<div class="tenue">${esc(c.autor.correo)}</div></td><td>${estrellasHTML(c.estrellas)}</td><td class="mono texto-pequeno">${fecha(c.creadoEn)}</td></tr>`).join('')}</tbody>
    </table></div>` : vacioHTML({ icono: I.estrella, titulo: 'Sin calificaciones con ese filtro' })}`;
  $('#max-estrellas').addEventListener('change', (e) => { maxEstrellas = e.target.value; renderCalificaciones(); });
}

// ================================================================== auditoría (RF-28)

const filtrosAuditoria = { entidad: '', accion: '', q: '', desde: '', hasta: '', pagina: 0 };

async function renderAuditoria() {
  const [p, entidades] = await Promise.all([
    get('/admin/auditoria', { ...filtrosAuditoria, tamano: 30 }),
    get('/admin/auditoria/entidades'),
  ]);
  contenido.innerHTML = `
    ${encabezado('Auditoría', esSuper() ? 'Acciones críticas de toda la plataforma. El registro es de solo inserción: nadie puede editarlo ni borrarlo.' : 'Tus acciones y las que afectan tu inventario. Registro inmutable.')}
    <div class="filtros-linea">
      <input type="search" id="a-q" placeholder="Actor o ID de entidad" value="${esc(filtrosAuditoria.q)}">
      <select id="a-entidad"><option value="">Todas las entidades</option>${entidades.map((e) => `<option ${filtrosAuditoria.entidad === e ? 'selected' : ''}>${esc(e)}</option>`).join('')}</select>
      <input type="date" id="a-desde" value="${filtrosAuditoria.desde}" aria-label="Desde">
      <input type="date" id="a-hasta" value="${filtrosAuditoria.hasta}" aria-label="Hasta">
      <span class="tenue texto-pequeno">${plural(p.totalElementos, 'evento', 'eventos')}</span>
    </div>
    ${p.contenido.length ? `<div class="tabla-envoltura"><table class="tabla">
      <thead><tr><th>Fecha</th><th>Actor</th><th>Acción</th><th>Entidad</th><th>IP</th><th></th></tr></thead>
      <tbody>${p.contenido.map((r, i) => `<tr>
        <td class="mono texto-pequeno" style="white-space:nowrap">${fechaHora(r.fecha)}</td>
        <td class="texto-pequeno">${esc(r.actorNombre || 'Sistema')}<div class="tenue">${esc(r.actorCorreo || '')}</div></td>
        <td><span class="etiqueta tinta sin-punto mono" style="font-weight:500">${esc(r.accion)}</span></td>
        <td class="texto-pequeno">${esc(r.entidad)}<div class="tenue mono">${esc((r.entidadId || '').slice(0, 8))}</div></td>
        <td class="mono texto-pequeno">${esc(r.ip || '—')}</td>
        <td class="acciones">${r.valoresPrevios || r.valoresNuevos ? `<button class="btn btn-sm btn-fantasma" data-diff="${i}">Cambios</button>` : ''}</td></tr>`).join('')}</tbody></table></div>${paginacionHTML(p.pagina, p.totalPaginas)}`
      : vacioHTML({ icono: I.bitacora, titulo: 'Sin eventos con esos filtros' })}`;

  const recargar = () => { filtrosAuditoria.pagina = 0; renderAuditoria(); };
  $('#a-q').addEventListener('input', debounce((e) => { filtrosAuditoria.q = e.target.value.trim(); recargar(); }, 400));
  $('#a-entidad').addEventListener('change', (e) => { filtrosAuditoria.entidad = e.target.value; recargar(); });
  $('#a-desde').addEventListener('change', (e) => { filtrosAuditoria.desde = e.target.value; recargar(); });
  $('#a-hasta').addEventListener('change', (e) => { filtrosAuditoria.hasta = e.target.value; recargar(); });
  enlazarPaginacion(contenido, (n) => { filtrosAuditoria.pagina = n; renderAuditoria(); });
  $$('[data-diff]').forEach((b) => b.addEventListener('click', () => {
    const r = p.contenido[Number(b.dataset.diff)];
    modal({
      titulo: r.accion,
      subtitulo: `${esc(r.actorNombre || 'Sistema')} · ${fechaHora(r.fecha)} · ${esc(r.entidad)} ${esc(r.entidadId || '')}`,
      ancho: 'ancho',
      cuerpo: `<div class="json-diff"><div><h5>Antes</h5><pre>${esc(JSON.stringify(r.valoresPrevios, null, 2) || '—')}</pre></div><div><h5>Después</h5><pre>${esc(JSON.stringify(r.valoresNuevos, null, 2) || '—')}</pre></div></div>`,
      acciones: [{ texto: 'Cerrar', clase: 'btn-oscuro' }],
    });
  }));
  if (filtrosAuditoria.q) {
    const q = $('#a-q');
    q.focus();
    q.setSelectionRange(q.value.length, q.value.length);
  }
}

// ================================================================== reportes (RF-29)

const rangoReporte = { desde: '', hasta: '' };

function graficaMeses(porMes) {
  if (!porMes.length) return '<p class="tenue">Sin datos en el periodo.</p>';
  const w = 720;
  const h = 260;
  const m = { t: 24, r: 12, b: 40, l: 70 };
  const max = Math.max(...porMes.map((x) => Number(x.ingresos)), 1);
  const paso = (w - m.l - m.r) / porMes.length;
  const barra = Math.min(56, paso * 0.6);
  const y = (v) => h - m.b - (v / max) * (h - m.t - m.b);
  const nombresMes = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const guias = [0, 0.5, 1].map((f) => {
    const v = max * f;
    return `<line class="eje" x1="${m.l}" x2="${w - m.r}" y1="${y(v)}" y2="${y(v)}" stroke-dasharray="${f ? '3 4' : ''}"/><text x="${m.l - 8}" y="${y(v) + 4}" text-anchor="end">${cop(v).replace('$', '$ ')}</text>`;
  }).join('');
  const barras = porMes.map((x, i) => {
    const cx = m.l + paso * i + paso / 2;
    const v = Number(x.ingresos);
    const [anio, mes] = x.mes.split('-');
    return `<rect class="barra" x="${cx - barra / 2}" y="${y(v)}" width="${barra}" height="${h - m.b - y(v)}" rx="3"><title>${x.mes}: ${cop(v)} · ${x.reservas} reservas</title></rect>
      <text class="valor" x="${cx}" y="${y(v) - 6}" text-anchor="middle">${x.reservas}</text>
      <text x="${cx}" y="${h - m.b + 18}" text-anchor="middle">${nombresMes[Number(mes) - 1]} ${anio.slice(2)}</text>`;
  }).join('');
  return `<svg class="grafica" viewBox="0 0 ${w} ${h}" role="img" aria-label="Ingresos por mes">${guias}${barras}</svg>
    <p class="texto-pequeno tenue">Barras: ingresos del mes. Número sobre la barra: reservas creadas.</p>`;
}

async function renderReportes() {
  const r = await get('/admin/reportes', rangoReporte);
  rangoReporte.desde ||= r.desde;
  rangoReporte.hasta ||= r.hasta;
  const maxCat = Math.max(...r.porCategoria.map((c) => Number(c.ingresos)), 1);
  contenido.innerHTML = `
    ${encabezado('Reportes', `Operación del ${fecha(r.desde)} al ${fecha(r.hasta)}. Los ingresos usan la tarifa congelada en cada reserva.`,
      `<div class="fila"><input type="date" class="entrada" id="rep-desde" value="${r.desde}" style="width:auto"><input type="date" class="entrada" id="rep-hasta" value="${r.hasta}" style="width:auto">
       <button class="btn btn-linea" id="exportar">${I.descargar} CSV</button></div>`)}
    <div class="kpis">
      <div class="kpi acento"><span>Ingresos estimados</span><strong>${cop(r.ingresos)}</strong><small>reservas pagadas</small></div>
      <div class="kpi"><span>Reservas</span><strong>${numero(r.reservas)}</strong><small>creadas en el periodo</small></div>
      <div class="kpi ${Number(r.tasaCancelacion) > 15 ? 'alerta-kpi' : ''}"><span>Tasa de cancelación</span><strong>${r.tasaCancelacion}%</strong><small>${numero(r.canceladas)} canceladas</small></div>
      <div class="kpi"><span>Ticket promedio</span><strong>${cop(r.ticketPromedio)}</strong><small>por reserva</small></div>
      <div class="kpi"><span>Duración promedio</span><strong>${r.diasPromedio}</strong><small>días por alquiler</small></div>
      <div class="kpi"><span>Usuarios nuevos</span><strong>${numero(r.usuariosNuevos)}</strong><small>registros</small></div>
    </div>
    <div class="tarjeta mb-24"><div class="tarjeta-cuerpo"><h3 class="mb-16">Ingresos por mes</h3>${graficaMeses(r.porMes)}</div></div>
    <div class="dos-columnas">
      <div class="tarjeta"><div class="tarjeta-cuerpo">
        <h3 class="mb-16">Herramientas más alquiladas</h3>
        ${r.topProductos.length ? `<div style="overflow-x:auto"><table class="tabla"><thead><tr><th>#</th><th>Herramienta</th><th class="num">Reservas</th><th class="num">Ingresos</th></tr></thead><tbody>
          ${r.topProductos.map((t, i) => `<tr><td class="mono">${i + 1}</td><td><strong class="texto-pequeno">${esc(t.nombre)}</strong><div class="texto-pequeno tenue">${esc(t.categoria)} · ${numero(t.dias)} días</div></td><td class="num">${t.reservas}</td><td class="num">${cop(t.ingresos)}</td></tr>`).join('')}
        </tbody></table></div>` : '<p class="tenue">Sin datos.</p>'}
      </div></div>
      <div class="pila">
        <div class="tarjeta"><div class="tarjeta-cuerpo">
          <h3 class="mb-16">Ingresos por categoría</h3>
          <div class="barras-h">${r.porCategoria.map((c) => `<div class="barra-h"><span class="texto-pequeno">${esc(c.categoria)}</span><div class="pista"><div class="relleno" style="width:${(Number(c.ingresos) / maxCat) * 100}%"></div></div><span class="v">${cop(c.ingresos)}</span></div>`).join('') || '<p class="tenue">Sin datos.</p>'}</div>
        </div></div>
        <div class="tarjeta"><div class="tarjeta-cuerpo">
          <h3 class="mb-16">Reservas por estado</h3>
          <div class="fila">${r.porEstado.map((e) => `${etiqueta('reserva', e.estado)} <span class="mono texto-pequeno" style="margin-right:10px">${e.total}</span>`).join('')}</div>
        </div></div>
      </div>
    </div>`;

  const actualizar = () => {
    rangoReporte.desde = $('#rep-desde').value;
    rangoReporte.hasta = $('#rep-hasta').value;
    renderReportes();
  };
  $('#rep-desde').addEventListener('change', actualizar);
  $('#rep-hasta').addEventListener('change', actualizar);
  $('#exportar').addEventListener('click', () => {
    const lineas = [
      ['Reporte Hawkify', `${r.desde} a ${r.hasta}`],
      [],
      ['Indicador', 'Valor'],
      ['Ingresos', r.ingresos], ['Reservas', r.reservas], ['Canceladas', r.canceladas],
      ['Tasa de cancelacion %', r.tasaCancelacion], ['Ticket promedio', r.ticketPromedio], ['Dias promedio', r.diasPromedio],
      [],
      ['Mes', 'Reservas', 'Canceladas', 'Ingresos'],
      ...r.porMes.map((x) => [x.mes, x.reservas, x.canceladas, x.ingresos]),
      [],
      ['Herramienta', 'Categoria', 'Reservas', 'Dias', 'Ingresos'],
      ...r.topProductos.map((t) => [t.nombre, t.categoria, t.reservas, t.dias, t.ingresos]),
    ];
    const csv = lineas.map((l) => l.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
    descargar(`hawkify-reporte-${r.desde}-a-${r.hasta}.csv`, `﻿${csv}`, 'text/csv');
  });
}

// ================================================================== configuración (RF-30)

const ETIQUETAS_PARAM = {
  'cancelacion.horas_minimas': ['Horas mínimas para cancelar en línea', 'horas'],
  'cancelacion.politica': ['Texto de la política de cancelación'],
  'envio.tarifa_domicilio': ['Costo de entrega a domicilio', 'COP'],
  'reserva.dias_maximos': ['Máximo de días por reserva', 'días'],
  'reserva.minutos_pago': ['Tiempo para pagar antes de liberar la unidad', 'minutos'],
  'garantia.texto_base': ['Política de garantía por daños (general)'],
  'legal.politica_datos': ['Política de Tratamiento de Datos Personales'],
  'legal.terminos': ['Términos y Condiciones'],
};

async function renderConfiguracion() {
  const [parametros, categorias] = await Promise.all([get('/admin/parametros'), get('/admin/categorias')]);
  const numericos = parametros.filter((p) => p.numerico);
  const textos = parametros.filter((p) => !p.numerico);
  contenido.innerHTML = `
    ${encabezado('Configuración', 'Parámetros globales, categorías y textos legales de la plataforma. Cada cambio queda en auditoría.')}
    <div class="tarjeta mb-24"><div class="tarjeta-cuerpo">
      <h3 class="mb-16">Reglas de operación</h3>
      <div class="fila-campos">${numericos.map((p) => `
        <form class="campo" data-param="${esc(p.clave)}">
          <label>${esc(ETIQUETAS_PARAM[p.clave]?.[0] || p.clave)}</label>
          <div class="fila" style="flex-wrap:nowrap"><input name="valor" type="number" min="0" value="${esc(p.valor)}"><span class="tenue texto-pequeno">${esc(ETIQUETAS_PARAM[p.clave]?.[1] || '')}</span><button class="btn btn-sm btn-oscuro" type="submit">Guardar</button></div>
          <span class="ayuda">${esc(p.descripcion || '')}</span><span class="msg-error"></span>
        </form>`).join('')}</div>
    </div></div>

    <div class="tarjeta mb-24"><div class="tarjeta-cuerpo">
      <div class="tarjeta-titulo"><h3>Categorías de herramientas</h3><button class="btn btn-sm btn-linea" id="nueva-categoria">${I.mas} Nueva categoría</button></div>
      <table class="tabla"><thead><tr><th>Nombre</th><th>Descripción</th><th class="num">Publicadas</th><th>Estado</th><th></th></tr></thead><tbody>
        ${categorias.map((c) => `<tr><td><strong>${esc(c.nombre)}</strong></td><td class="texto-pequeno tenue">${esc(c.descripcion || '')}</td><td class="num">${c.productos}</td>
          <td>${c.activa ? '<span class="etiqueta ok">Activa</span>' : '<span class="etiqueta">Inactiva</span>'}</td>
          <td class="acciones"><button class="btn btn-sm btn-fantasma" data-cat="${c.id}">${I.editar}</button></td></tr>`).join('')}
      </tbody></table>
    </div></div>

    <div class="tarjeta"><div class="tarjeta-cuerpo">
      <h3 class="mb-16">Textos legales y políticas</h3>
      <div class="form-pila">${textos.map((p) => `
        <form class="campo" data-param="${esc(p.clave)}">
          <label>${esc(ETIQUETAS_PARAM[p.clave]?.[0] || p.clave)}</label>
          <textarea name="valor" rows="5">${esc(p.valor)}</textarea>
          <div class="entre"><span class="ayuda">Última edición: ${fechaHora(p.actualizadoEn)}</span><button class="btn btn-sm btn-oscuro" type="submit">Guardar</button></div>
          <span class="msg-error"></span>
        </form>`).join('')}</div>
    </div></div>`;

  $$('[data-param]').forEach((f) => f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const boton = $('button[type=submit]', f);
    boton.classList.add('cargando');
    f.classList.remove('con-error');
    try {
      await put(`/admin/parametros/${encodeURIComponent(f.dataset.param)}`, { valor: f.elements.valor.value });
      toast('Parámetro actualizado', 'ok');
    } catch (err) {
      f.classList.add('con-error');
      $('.msg-error', f).textContent = err.message;
    } finally {
      boton.classList.remove('cargando');
    }
  }));
  $('#nueva-categoria').addEventListener('click', () => modalCategoria());
  $$('[data-cat]').forEach((b) => b.addEventListener('click', () => modalCategoria(categorias.find((c) => c.id === b.dataset.cat))));
}

function modalCategoria(c = null) {
  modal({
    titulo: c ? 'Editar categoría' : 'Nueva categoría',
    cuerpo: `<form class="form-pila" novalidate>
      <div class="campo"><label>Nombre</label><input name="nombre" maxlength="100" value="${esc(c?.nombre || '')}"><span class="msg-error"></span></div>
      <div class="campo"><label>Descripción <span class="opcional">(opcional)</span></label><textarea name="descripcion" maxlength="500" rows="3">${esc(c?.descripcion || '')}</textarea><span class="msg-error"></span></div>
      <label class="casilla"><input type="checkbox" name="activa" ${c?.activa === false ? '' : 'checked'}> Activa (visible en filtros y al publicar)</label>
    </form>`,
    acciones: [
      { texto: 'Cancelar', clase: 'btn-fantasma' },
      {
        texto: 'Guardar',
        clase: 'btn-oscuro',
        accion: async (velo) => {
          const d = datosFormulario($('form', velo));
          if (c) await put(`/admin/categorias/${c.id}`, d);
          else await post('/admin/categorias', d);
          toast('Categoría guardada', 'ok');
          renderConfiguracion();
        },
      },
    ],
  });
}

const RENDER = {
  tablero: renderTablero,
  aprobaciones: renderAprobaciones,
  inventario: renderInventario,
  reservas: renderReservas,
  usuarios: renderUsuarios,
  resenas: renderResenas,
  calificaciones: renderCalificaciones,
  auditoria: renderAuditoria,
  reportes: renderReportes,
  configuracion: renderConfiguracion,
};

pintarLateral();
window.addEventListener('hashchange', navegar);
refrescarResumen();
navegar();
