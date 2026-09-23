import { del, get, patch, post, put, subirImagen } from '../core/api.js';
import { enlazarDeseos, fichaHTML } from '../core/componentes.js';
import { abrirFormularioProducto } from '../core/formProducto.js';
import { I } from '../core/iconos.js';
import { montarLayout } from '../core/layout.js';
import { exigirSesion, sesion } from '../core/sesion.js';
import {
  $, $$, alternarContrasena, avatarHTML, cargandoHTML, confirmar, cop, datosFormulario, descargar, enlazarPaginacion,
  enviarFormulario, errorHTML, esc, estrellasHTML, etiqueta, fecha, fechaDia, fechaHora, fotoHTML, hace,
  mesAnio, METODOS, modal, paginacionHTML, plural, ROLES, selectorEstrellas, textoEstado, toast, toastError, vacioHTML,
} from '../core/ui.js';

let usuario = exigirSesion();
montarLayout({ alRefrescarUsuario: (u) => { usuario = u; pintarPerfilLateral(); } });

const esSuper = () => usuario.rol === 'superadmin';
const contenido = $('#contenido');

const SECCIONES = [
  { id: 'resumen', texto: 'Resumen', icono: I.panel },
  { id: 'reservas', texto: 'Mis reservas', icono: I.calendario, consumidor: true },
  { id: 'deseos', texto: 'Lista de deseos', icono: I.corazon, consumidor: true },
  { id: 'herramientas', texto: 'Mis herramientas', icono: I.herramienta, consumidor: true },
  { id: 'resenas', texto: 'Mis reseñas', icono: I.estrella, consumidor: true },
  { id: 'notificaciones', texto: 'Notificaciones', icono: I.campana },
  { id: 'perfil', texto: 'Perfil y seguridad', icono: I.ajustes },
  { id: 'privacidad', texto: 'Privacidad y datos', icono: I.escudo },
];

function secciones() {
  return SECCIONES.filter((s) => !(s.consumidor && esSuper()));
}

function pintarPerfilLateral() {
  $('#panel-perfil').innerHTML = `
    ${avatarHTML(usuario)}
    <div><strong>${esc(usuario.nombreCompleto)}</strong><span>${esc(ROLES[usuario.rol])} · desde ${mesAnio(usuario.creadoEn)}</span></div>`;
}

function pintarNav(actual) {
  $('#nav-cuenta').innerHTML = secciones().map((s) => `
    <a href="#${s.id}" class="${s.id === actual ? 'activo' : ''}">${s.icono}${s.texto}</a>`).join('')
    + (sesion.esStaff() ? `<span class="grupo">Staff</span><a href="admin.html">${I.panel}Panel de administración</a>` : '');
}

function encabezado(titulo, texto = '', accion = '') {
  return `<div class="encabezado-seccion"><div><h1>${titulo}</h1>${texto ? `<p>${texto}</p>` : ''}</div>${accion}</div>`;
}

async function navegar() {
  const hash = location.hash.slice(1) || 'resumen';
  const s = secciones().find((x) => x.id === hash) || secciones()[0];
  pintarNav(s.id);
  document.title = `${s.texto} · Hawkify`;
  contenido.innerHTML = cargandoHTML();
  try {
    await RENDER[s.id]();
  } catch (e) {
    contenido.innerHTML = errorHTML(e);
  }
}

// ================================================================== resumen

async function renderResumen() {
  const consumidor = !esSuper();
  const [reservas, deseos, mias, notifs] = await Promise.all([
    consumidor ? get('/reservas') : [],
    consumidor ? get('/lista-deseos') : [],
    consumidor ? get('/mis-productos') : [],
    get('/notificaciones', { tamano: 4 }),
  ]);
  const activas = reservas.filter((r) => ['confirmada', 'en_curso', 'pendiente_pago', 'con_incidencia'].includes(r.estado));
  const proxima = [...activas].sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio))[0];
  const porCalificar = reservas.filter((r) => r.puedeCalificar).length;
  const incompleto = consumidor && (!usuario.documentoIdentidad || !usuario.telefono);
  const primerNombre = usuario.nombreCompleto.split(' ')[0];

  contenido.innerHTML = `
    ${encabezado(`Hola, ${esc(primerNombre)}`, consumidor ? 'Esto es lo que tienes en marcha.' : 'Cuenta de superadministración: la operación está en el panel.',
      sesion.esStaff() ? '<a class="btn btn-oscuro" href="admin.html">Ir al panel de administración</a>' : '<a class="btn" href="catalogo.html">Buscar herramientas</a>')}
    ${incompleto ? `<div class="alerta alerta-aviso mb-24">${I.info}<div>Agrega tu documento y teléfono en <a class="enlace" href="#perfil">Perfil</a> para reservar más rápido.</div></div>` : ''}
    ${consumidor ? `
    <div class="kpis">
      <a class="kpi acento" href="#reservas"><span>Reservas activas</span><strong>${activas.length}</strong><small>${proxima ? `próxima: ${fechaDia(proxima.fechaInicio)}` : 'ninguna en curso'}</small></a>
      <a class="kpi ${porCalificar ? 'alerta-kpi' : ''}" href="#reservas"><span>Por calificar</span><strong>${porCalificar}</strong><small>alquileres finalizados</small></a>
      <a class="kpi" href="#deseos"><span>Lista de deseos</span><strong>${deseos.length}</strong><small>herramientas guardadas</small></a>
      <a class="kpi" href="#herramientas"><span>Mis herramientas</span><strong>${mias.length}</strong><small>${mias.filter((p) => p.estadoPublicacion === 'aprobado').length} publicadas</small></a>
    </div>` : ''}
    <div class="dos-columnas">
      ${consumidor ? `<div class="tarjeta"><div class="tarjeta-cuerpo">
        <div class="tarjeta-titulo"><h3>Próxima reserva</h3><a class="enlace texto-pequeno" href="#reservas">Ver todas</a></div>
        ${proxima ? tarjetaProxima(proxima) : vacioHTML({ icono: I.calendario, titulo: 'Nada programado', texto: 'Cuando reserves, aquí verás fechas, entrega y estado.', accion: '<a class="btn btn-oscuro btn-sm" href="catalogo.html">Explorar catálogo</a>' })}
      </div></div>` : ''}
      <div class="tarjeta"><div class="tarjeta-cuerpo">
        <div class="tarjeta-titulo"><h3>Últimas notificaciones</h3><a class="enlace texto-pequeno" href="#notificaciones">Ver todas</a></div>
        ${notifs.contenido.length ? `<div class="lista-simple">${notifs.contenido.map((n) => `
          <div class="fila" style="align-items:flex-start;flex-wrap:nowrap">${n.leida ? '' : '<span class="etiqueta aviso sin-punto">Nueva</span>'}<div><div class="texto-pequeno">${esc(n.mensaje)}</div><span class="mono texto-pequeno tenue">${hace(n.creadoEn)}</span></div></div>`).join('')}</div>`
          : '<p class="tenue texto-pequeno">Sin notificaciones por ahora.</p>'}
      </div></div>
    </div>`;
}

function lineaTiempo(r) {
  const orden = ['confirmada', 'en_curso', 'finalizada'];
  const idx = r.estado === 'con_incidencia' ? 1 : orden.indexOf(r.estado);
  const hitos = [['Pagada', 0], ['Entregada', 1], ['Devuelta', 2], ['Calificada', 3]];
  const hecho = (i) => (i === 3 ? !!r.calificacion : idx >= i);
  return `<div class="linea-tiempo">${hitos.map(([t, i]) => `<div class="hito ${hecho(i) ? 'hecho' : ''}">${t}</div>`).join('')}</div>`;
}

function tarjetaProxima(r) {
  return `
    <div class="fila" style="flex-wrap:nowrap;align-items:flex-start">
      <div style="width:110px;flex-shrink:0;border-radius:8px;overflow:hidden;aspect-ratio:7/4.6;background:var(--foto)">${fotoHTML(r.producto.imagen)}</div>
      <div>
        <a href="producto.html?id=${r.producto.id}" style="text-decoration:none"><h4 style="font-family:var(--f-display);font-stretch:85%;font-size:17px">${esc(r.producto.nombre)}</h4></a>
        <div class="texto-pequeno tenue mono">${esc(r.codigo)} · unidad ${esc(r.unidad)}</div>
        <div class="mt-8">${etiqueta('reserva', r.estado)}</div>
      </div>
    </div>
    <div class="rango-elegido"><div><span>Inicio</span><strong>${fechaDia(r.fechaInicio)}</strong></div><div><span>Devolución</span><strong>${fechaDia(r.fechaFin)}</strong></div></div>
    ${lineaTiempo(r)}`;
}

// ================================================================== reservas

let pestanaReservas = 'activas';

async function renderReservas() {
  const reservas = await get('/reservas');
  const activas = reservas.filter((r) => ['pendiente_pago', 'confirmada', 'en_curso', 'con_incidencia'].includes(r.estado));
  const historial = reservas.filter((r) => !activas.includes(r));
  const lista = pestanaReservas === 'activas' ? activas : historial;

  contenido.innerHTML = `
    ${encabezado('Mis reservas', 'Estado, fechas, pagos y devoluciones de cada alquiler.')}
    <div class="pestanas">
      <button type="button" data-pestana="activas" class="${pestanaReservas === 'activas' ? 'activo' : ''}">Activas <span class="mono">${activas.length}</span></button>
      <button type="button" data-pestana="historial" class="${pestanaReservas === 'historial' ? 'activo' : ''}">Historial <span class="mono">${historial.length}</span></button>
    </div>
    ${lista.length ? `<div class="tarjeta">${lista.map(itemReserva).join('')}</div>` : vacioHTML({
      icono: I.calendario,
      titulo: pestanaReservas === 'activas' ? 'No tienes reservas activas' : 'Aún no hay historial',
      texto: 'Elige una herramienta, marca tus fechas en el calendario y confírmala en minutos.',
      accion: '<a class="btn btn-oscuro" href="catalogo.html">Buscar herramientas</a>',
    })}`;

  $$('[data-pestana]').forEach((b) => b.addEventListener('click', () => { pestanaReservas = b.dataset.pestana; renderReservas(); }));
  $$('[data-accion]').forEach((b) => b.addEventListener('click', () => accionReserva(b.dataset.accion, reservas.find((r) => r.id === b.dataset.id))));
}

function itemReserva(r) {
  const botones = [];
  if (r.estado === 'pendiente_pago') botones.push(`<button class="btn btn-sm" data-accion="pagar" data-id="${r.id}">Completar pago</button>`);
  if (r.puedeCalificar) botones.push(`<button class="btn btn-sm" data-accion="calificar" data-id="${r.id}">${I.estrella} Calificar</button>`);
  if (r.calificacion) botones.push(`<button class="btn btn-sm btn-linea" data-accion="editar-calificacion" data-id="${r.id}">Editar calificación</button>`);
  if (r.puedeCancelar) botones.push(`<button class="btn btn-sm btn-fantasma" data-accion="cancelar" data-id="${r.id}">Cancelar</button>`);
  botones.push(`<button class="btn btn-sm btn-linea" data-accion="detalle" data-id="${r.id}">Detalle</button>`);
  return `
    <div class="reserva-item">
      <a href="producto.html?id=${r.producto.id}" style="display:block;border-radius:8px;overflow:hidden;aspect-ratio:7/4.6;background:var(--foto)">${fotoHTML(r.producto.imagen, r.producto.nombre)}</a>
      <div>
        <div class="fila" style="gap:8px">${etiqueta('reserva', r.estado)}<span class="mono texto-pequeno tenue">${esc(r.codigo)}</span></div>
        <h4 class="mt-8"><a href="producto.html?id=${r.producto.id}" style="text-decoration:none">${esc(r.producto.nombre)}</a></h4>
        <div class="datos">
          <span>${I.calendario.replace('<svg', '<svg width="13" height="13" style="vertical-align:-2px"')} <b>${fechaDia(r.fechaInicio)} → ${fechaDia(r.fechaFin)}</b></span>
          <span><b>${plural(r.dias, 'día', 'días')}</b></span>
          <span>${r.modalidadEntrega === 'domicilio' ? 'A domicilio' : 'Recoge en punto'}</span>
          ${r.calificacion ? `<span>${estrellasHTML(r.calificacion.estrellas)}</span>` : ''}
        </div>
        ${r.estado === 'pendiente_pago' && r.limitePagoEn ? `<div class="texto-pequeno mt-8" style="color:var(--aviso)">Se libera ${fechaHora(r.limitePagoEn)} si no se paga.</div>` : ''}
        ${r.estado === 'con_incidencia' && r.devolucion?.observaciones ? `<div class="texto-pequeno mt-8" style="color:var(--error)">Incidencia: ${esc(r.devolucion.observaciones)}</div>` : ''}
      </div>
      <div class="acciones">
        <div class="precio-dia">${cop(r.total)}</div>
        <div class="botones">${botones.join('')}</div>
      </div>
    </div>`;
}

async function accionReserva(accion, r) {
  if (accion === 'detalle') return detalleReserva(r);
  if (accion === 'pagar') {
    try {
      sessionStorage.setItem(`hk_pendiente_${r.producto.id}_${r.fechaInicio}_${r.fechaFin}`,
        JSON.stringify({ id: r.id, codigo: r.codigo, limite: r.limitePagoEn, modalidad: r.modalidadEntrega }));
    } catch { /* sin sessionStorage */ }
    location.href = `checkout.html?producto=${r.producto.id}&desde=${r.fechaInicio}&hasta=${r.fechaFin}&entrega=${r.modalidadEntrega}`;
    return undefined;
  }
  if (accion === 'cancelar') {
    const params = await get('/parametros/publicos').catch(() => ({}));
    const motivo = await confirmar({
      titulo: `Cancelar reserva ${r.codigo}`,
      mensaje: `${esc(r.producto.nombre)} · ${fechaDia(r.fechaInicio)} → ${fechaDia(r.fechaFin)}.<br><br>${esc(params['cancelacion.politica'] || '')}${r.pago?.estado === 'aprobado' ? '<br><br><strong>El pago de ' + cop(r.total) + ' quedará marcado como reembolsado.</strong>' : ''}`,
      textoOk: 'Sí, cancelar reserva',
      peligro: true,
      motivo: true,
      etiquetaMotivo: '¿Por qué cancelas?',
      placeholder: 'Nos ayuda a mejorar (ej. se aplazó la obra)',
      accion: (m) => post(`/reservas/${r.id}/cancelar`, { motivo: m || null }),
    });
    if (motivo !== null) {
      toast('Reserva cancelada. Las fechas quedaron libres.', 'ok');
      renderReservas();
    }
    return undefined;
  }
  if (accion === 'calificar' || accion === 'editar-calificacion') return modalCalificacion(r);
  return undefined;
}

function modalCalificacion(r, alGuardar = renderReservas) {
  const existente = r.calificacion;
  const textoPrevio = existente?.resena?.texto || '';
  const reseñaEliminada = existente?.resena?.estado === 'eliminada';
  const cuerpo = document.createElement('div');
  cuerpo.innerHTML = `
    <form class="form-pila" onsubmit="return false">
      <div class="fila" style="flex-wrap:nowrap">
        <div style="width:90px;flex-shrink:0;border-radius:8px;overflow:hidden;aspect-ratio:7/4.6;background:var(--foto)">${fotoHTML(r.producto.imagen)}</div>
        <div><strong>${esc(r.producto.nombre)}</strong><div class="texto-pequeno tenue">${fechaDia(r.fechaInicio)} → ${fechaDia(r.fechaFin)}</div></div>
      </div>
      <div class="campo"><span class="campo-titulo">¿Cómo te fue con la herramienta?</span><div id="estrellas-cal" class="fila"></div><span class="msg-error"></span></div>
      <div class="campo">
        <label for="texto-resena">Reseña <span class="opcional">(opcional, mínimo 10 caracteres)</span></label>
        <textarea id="texto-resena" name="texto" maxlength="2000" ${reseñaEliminada ? 'disabled' : ''} placeholder="¿Llegó en buen estado? ¿Te sirvió para el trabajo? ¿La recomendarías?">${esc(textoPrevio)}</textarea>
        ${reseñaEliminada ? '<span class="ayuda">Esta reseña fue eliminada y ya no se puede volver a publicar.</span>' : '<span class="ayuda">Se publica con tu nombre y la inicial de tu apellido.</span>'}
        ${existente?.resena?.estado === 'oculta' ? '<span class="ayuda" style="color:var(--aviso)">Tu reseña está oculta por moderación.</span>' : ''}
        <span class="msg-error"></span>
      </div>
    </form>`;
  const valor = selectorEstrellas($('#estrellas-cal', cuerpo), existente?.estrellas || 0);
  const acciones = [{ texto: 'Cancelar', clase: 'btn-fantasma' }];
  if (existente?.resena && existente.resena.estado !== 'eliminada') {
    acciones.push({
      texto: 'Eliminar reseña',
      clase: 'btn-linea',
      accion: async () => {
        await del(`/resenas/${existente.resena.id}`);
        toast('Reseña eliminada. Tu calificación en estrellas se mantiene.', 'ok');
        alGuardar();
      },
    });
  }
  acciones.push({
    texto: existente ? 'Guardar cambios' : 'Publicar calificación',
    clase: 'btn-oscuro',
    accion: async (velo) => {
      const estrellas = valor();
      if (!estrellas) {
        const campo = $('#estrellas-cal', velo).closest('.campo');
        campo.classList.add('con-error');
        $('.msg-error', campo).textContent = 'Elige de 1 a 5 estrellas.';
        return false;
      }
      const texto = $('#texto-resena', velo).value.trim();
      const cuerpoReq = { estrellas, texto: texto || null };
      if (existente) await put(`/calificaciones/${existente.id}`, cuerpoReq);
      else await post(`/reservas/${r.id}/calificacion`, cuerpoReq);
      toast('¡Gracias! Tu calificación ayuda a quien alquile después.', 'ok');
      alGuardar();
      return true;
    },
  });
  modal({ titulo: existente ? 'Editar calificación' : 'Califica tu alquiler', cuerpo, acciones });
}

function detalleReserva(r) {
  const filas = [
    ['Código', r.codigo],
    ['Unidad asignada', r.unidad],
    ['Fechas', `${fechaDia(r.fechaInicio)} → ${fechaDia(r.fechaFin)} (${plural(r.dias, 'día', 'días')})`],
    ['Tarifa congelada', `${cop(r.tarifaDia)} / día`],
    ['Subtotal', cop(r.subtotal)],
    ['Envío', Number(r.costoEnvio) ? cop(r.costoEnvio) : 'Sin costo'],
    ['Total', cop(r.total)],
    ['Entrega', r.modalidadEntrega === 'domicilio' ? r.direccionEntrega : 'Recoge en Cra 38 #72-13, Barranquilla'],
    ['Reservada el', fechaHora(r.creadoEn)],
  ];
  if (r.pago) {
    filas.push(['Pago', `${METODOS[r.pago.metodo] || ''} · ${textoEstado('pago', r.pago.estado)}`]);
    if (r.pago.detalle) filas.push(['Medio', r.pago.detalle]);
    if (r.pago.referencia) filas.push(['Referencia', r.pago.referencia]);
  }
  if (r.devolucion) {
    filas.push(['Devolución', `${fechaHora(r.devolucion.fecha)} · ${textoEstado('equipo', r.devolucion.estadoEquipo)}`]);
    if (r.devolucion.observaciones) filas.push(['Observaciones', r.devolucion.observaciones]);
  }
  if (r.motivoCancelacion) filas.push(['Motivo de cancelación', r.motivoCancelacion]);
  if (r.propietario) filas.push(['Propietario', `${r.propietario.nombre}${r.propietario.telefono ? ` · ${r.propietario.telefono}` : ''}`]);
  modal({
    titulo: r.producto.nombre,
    subtitulo: `${etiqueta('reserva', r.estado)}`,
    ancho: 'ancho',
    cuerpo: `${['cancelada', 'pendiente_pago'].includes(r.estado) ? '' : lineaTiempo(r)}
      <div class="comprobante" style="margin:16px 0 0;max-width:none">${filas.map(([k, v]) => `<div class="fila"><span>${esc(k)}</span><span>${esc(v)}</span></div>`).join('')}</div>`,
    acciones: [{ texto: 'Cerrar', clase: 'btn-oscuro' }],
  });
}

// ================================================================== lista de deseos

let ordenDeseos = 'recientes';

async function renderDeseos() {
  const items = await get('/lista-deseos');
  const orden = {
    recientes: (a, b) => b.agregadoEn.localeCompare(a.agregadoEn),
    tarifa: (a, b) => a.producto.tarifaDia - b.producto.tarifaDia,
    disponibles: (a, b) => Number(b.producto.disponibleHoy) - Number(a.producto.disponibleHoy),
  };
  items.sort(orden[ordenDeseos]);
  contenido.innerHTML = `
    ${encabezado('Lista de deseos', 'Guardar no reserva ni cobra nada. Te avisamos si cambia la tarifa o vuelve a estar disponible.',
      items.length ? `<select class="entrada" id="orden-deseos" style="width:auto">
        <option value="recientes">Guardadas recientemente</option>
        <option value="tarifa">Menor tarifa</option>
        <option value="disponibles">Disponibles primero</option>
      </select>` : '')}
    ${items.length ? `<div class="rejilla-fichas" id="rejilla-deseos">${items.map((i) => `<div data-item="${i.producto.id}">${fichaHTML(i.producto)}
      ${i.estadoPublicacion === 'pausado' ? '<p class="texto-pequeno tenue mt-8">Pausada por el propietario.</p>' : ''}</div>`).join('')}</div>`
      : vacioHTML({ icono: I.corazon, titulo: 'Tu lista está vacía', texto: 'Toca el corazón en cualquier herramienta para guardarla aquí.', accion: '<a class="btn btn-oscuro" href="catalogo.html">Explorar catálogo</a>' })}`;
  const sel = $('#orden-deseos');
  if (sel) {
    sel.value = ordenDeseos;
    sel.addEventListener('change', () => { ordenDeseos = sel.value; renderDeseos(); });
  }
  enlazarDeseos(contenido, (id, activo) => {
    if (!activo) $(`[data-item="${id}"]`)?.remove();
    if (!$$('[data-item]').length) renderDeseos();
  });
}

// ================================================================== mis herramientas

async function renderHerramientas() {
  const [mias, reservas] = await Promise.all([get('/mis-productos'), get('/mis-productos/reservas')]);
  const proximas = reservas.filter((r) => ['confirmada', 'en_curso', 'con_incidencia'].includes(r.estado));
  contenido.innerHTML = `
    ${encabezado('Mis herramientas', 'Publica equipos que tienes quietos y recibe reservas por días.', `<button class="btn" type="button" id="publicar">${I.mas} Publicar herramienta</button>`)}
    ${mias.length ? `<div class="tabla-envoltura"><table class="tabla">
      <thead><tr><th>Herramienta</th><th>Estado</th><th class="num">Tarifa / día</th><th class="num">Unidades</th><th>Calificación</th><th></th></tr></thead>
      <tbody>${mias.map((p) => `
        <tr>
          <td><div class="celda-producto">${p.imagen ? `<img src="${esc(p.imagen)}" alt="">` : '<span class="mini-foto"></span>'}<div><strong>${esc(p.nombre)}</strong><span>${esc(p.codigo)} · ${esc(p.categoria.nombre)}</span></div></div>
            ${p.estadoPublicacion === 'rechazado' && p.motivoRechazo ? `<div class="texto-pequeno mt-8" style="color:var(--error);max-width:420px">Ajustes: ${esc(p.motivoRechazo)}</div>` : ''}</td>
          <td>${etiqueta('publicacion', p.estadoPublicacion)}${p.estadoFisico === 'en_mantenimiento' ? '<div class="mt-8"><span class="etiqueta mantenimiento sin-punto"><span>Mantenimiento</span></span></div>' : ''}</td>
          <td class="num">${cop(p.tarifaDia)}</td>
          <td class="num">${p.unidadesOperativas} / ${p.unidadesTotales}</td>
          <td>${p.totalCalificaciones ? estrellasHTML(p.calificacionPromedio, { mostrarNumero: true, total: p.totalCalificaciones }) : '<span class="tenue texto-pequeno">—</span>'}</td>
          <td class="acciones">
            <a class="btn btn-sm btn-fantasma" href="producto.html?id=${p.id}" title="Ver ficha">${I.ojo}</a>
            ${p.estadoPublicacion !== 'retirado' ? `<button class="btn btn-sm btn-linea" data-editar="${p.id}">${I.editar} Editar</button>` : ''}
            ${p.estadoPublicacion === 'aprobado' ? `<button class="btn btn-sm btn-fantasma" data-pausar="${p.id}">${I.pausa} Pausar</button>` : ''}
            ${p.estadoPublicacion === 'pausado' ? `<button class="btn btn-sm btn-fantasma" data-reanudar="${p.id}">${I.play} Reanudar</button>` : ''}
          </td>
        </tr>`).join('')}</tbody></table></div>`
      : vacioHTML({ icono: I.herramienta, titulo: 'Aún no publicas herramientas', texto: 'Si tienes equipos que usas poco, publícalos: tú defines la tarifa y cuántas unidades ofreces.', accion: `<button class="btn btn-oscuro" type="button" id="publicar-vacio">${I.mas} Publicar mi primera herramienta</button>` })}

    <div class="encabezado-seccion mt-32"><div><h2>Reservas de tus herramientas</h2><p>Quién alquila tus equipos y cuándo. La entrega y devolución la coordina el equipo de Hawkify.</p></div></div>
    ${reservas.length ? `<div class="tabla-envoltura"><table class="tabla">
      <thead><tr><th>Reserva</th><th>Herramienta</th><th>Cliente</th><th>Fechas</th><th>Estado</th><th class="num">Total</th></tr></thead>
      <tbody>${reservas.map((r) => `<tr>
        <td class="mono">${esc(r.codigo)}</td>
        <td>${esc(r.producto.nombre)}<div class="texto-pequeno tenue mono">${esc(r.unidad)}</div></td>
        <td>${esc(r.arrendatario?.nombre || '')}<div class="texto-pequeno tenue">${esc(r.arrendatario?.telefono || '')}</div></td>
        <td class="mono texto-pequeno">${fechaDia(r.fechaInicio)} → ${fechaDia(r.fechaFin)}</td>
        <td>${etiqueta('reserva', r.estado)}</td>
        <td class="num">${cop(r.total)}</td></tr>`).join('')}</tbody></table></div>
      <p class="texto-pequeno tenue mt-8">${plural(proximas.length, 'reserva activa', 'reservas activas')} sobre tus herramientas.</p>`
      : '<p class="tenue">Todavía no hay reservas sobre tus herramientas.</p>'}`;

  const abrir = (id) => abrirFormularioProducto({ id, modo: 'propio', alGuardar: renderHerramientas });
  $('#publicar')?.addEventListener('click', () => abrir(null));
  $('#publicar-vacio')?.addEventListener('click', () => abrir(null));
  $$('[data-editar]').forEach((b) => b.addEventListener('click', () => abrir(b.dataset.editar)));
  $$('[data-pausar]').forEach((b) => b.addEventListener('click', async () => {
    const ok = await confirmar({ titulo: 'Pausar publicación', mensaje: 'Dejará de aparecer en el catálogo hasta que la reanudes. Las reservas ya confirmadas se mantienen.', textoOk: 'Pausar' });
    if (!ok) return;
    try { await post(`/mis-productos/${b.dataset.pausar}/pausar`); toast('Publicación pausada', 'ok'); renderHerramientas(); } catch (e) { toastError(e); }
  }));
  $$('[data-reanudar]').forEach((b) => b.addEventListener('click', async () => {
    try { await post(`/mis-productos/${b.dataset.reanudar}/reanudar`); toast('Publicación reanudada', 'ok'); renderHerramientas(); } catch (e) { toastError(e); }
  }));
  if (new URLSearchParams(location.search).get('publicar') === '1') abrir(null);
}

// ================================================================== reseñas

async function renderResenas() {
  const [califs, reservas] = await Promise.all([get('/mis-calificaciones'), get('/reservas')]);
  const porCalificar = reservas.filter((r) => r.puedeCalificar);
  contenido.innerHTML = `
    ${encabezado('Mis reseñas', 'Solo puedes calificar alquileres finalizados. Puedes editar o eliminar tus reseñas cuando quieras.')}
    ${porCalificar.length ? `<div class="alerta alerta-aviso mb-24">${I.estrella}<div>Tienes ${plural(porCalificar.length, 'alquiler', 'alquileres')} por calificar.
      ${porCalificar.map((r) => `<button class="enlace" data-calificar="${r.id}">${esc(r.producto.nombre)}</button>`).join(' · ')}</div></div>` : ''}
    ${califs.length ? `<div class="tarjeta"><div class="tarjeta-cuerpo lista-simple">${califs.map((c) => `
      <div class="entre" style="align-items:flex-start;flex-wrap:nowrap">
        <div class="fila" style="flex-wrap:nowrap;align-items:flex-start">
          <div style="width:84px;flex-shrink:0;border-radius:8px;overflow:hidden;aspect-ratio:7/4.6;background:var(--foto)">${fotoHTML(c.producto.imagen)}</div>
          <div>
            <a href="producto.html?id=${c.producto.id}#resenas" style="text-decoration:none"><strong>${esc(c.producto.nombre)}</strong></a>
            <div class="fila" style="gap:8px">${estrellasHTML(c.estrellas)} <span class="mono texto-pequeno tenue">${fecha(c.creadoEn)}</span> ${c.estadoResena && c.estadoResena !== 'visible' ? etiqueta('moderacion', c.estadoResena) : ''}</div>
            ${c.texto ? `<p class="texto-pequeno mt-8" style="color:var(--texto-2)">${esc(c.texto)}</p>` : '<p class="texto-pequeno tenue mt-8">Sin texto.</p>'}
          </div>
        </div>
        <button class="btn btn-sm btn-linea" data-editar-cal="${c.reservaId}">${I.editar} Editar</button>
      </div>`).join('')}</div></div>`
      : vacioHTML({ icono: I.estrella, titulo: 'Aún no calificas alquileres', texto: 'Cuando devuelvas una herramienta, podrás calificarla aquí.' })}`;

  $$('[data-calificar]').forEach((b) => b.addEventListener('click', () => modalCalificacion(reservas.find((r) => r.id === b.dataset.calificar), renderResenas)));
  $$('[data-editar-cal]').forEach((b) => b.addEventListener('click', () => {
    const r = reservas.find((x) => x.id === b.dataset.editarCal);
    if (r) modalCalificacion(r, renderResenas);
  }));
}

// ================================================================== notificaciones

let paginaNotif = 0;

async function renderNotificaciones() {
  const p = await get('/notificaciones', { pagina: paginaNotif, tamano: 15 });
  const destino = (n) => (n.referenciaTipo === 'producto' ? `producto.html?id=${n.referenciaId}` : n.referenciaTipo === 'reserva' ? '#reservas' : null);
  contenido.innerHTML = `
    ${encabezado('Notificaciones', 'Reservas, cambios de tarifa, disponibilidad y moderación.', p.totalElementos ? '<button class="btn btn-linea" type="button" id="todas-leidas">Marcar todas como leídas</button>' : '')}
    ${p.contenido.length ? `<div class="tarjeta">${p.contenido.map((n) => `
      <div class="notificacion ${n.leida ? 'leida' : 'no-leida'}" style="padding:16px 18px">
        <span class="punto"></span>
        <div style="flex:1"><div>${esc(n.mensaje)}</div><time>${fechaHora(n.creadoEn)} · ${esc(n.tipo.replace('_', ' '))}</time></div>
        <div class="fila" style="flex-wrap:nowrap">${destino(n) ? `<a class="btn btn-sm btn-fantasma" href="${destino(n)}">Ver</a>` : ''}${n.leida ? '' : `<button class="btn btn-sm btn-fantasma" data-leer="${n.id}">${I.check}</button>`}</div>
      </div>`).join('')}</div>${paginacionHTML(p.pagina, p.totalPaginas)}`
      : vacioHTML({ icono: I.campana, titulo: 'Sin notificaciones', texto: 'Aquí verás confirmaciones de reserva y avisos de tu lista de deseos.' })}`;
  $('#todas-leidas')?.addEventListener('click', async () => { await post('/notificaciones/leer-todas'); renderNotificaciones(); });
  $$('[data-leer]').forEach((b) => b.addEventListener('click', async () => { await patch(`/notificaciones/${b.dataset.leer}/leida`); renderNotificaciones(); }));
  enlazarPaginacion(contenido, (n) => { paginaNotif = n; renderNotificaciones(); });
}

// ================================================================== perfil

async function renderPerfil() {
  const [perfil, direcciones] = await Promise.all([get('/perfil'), esSuper() ? [] : get('/perfil/direcciones')]);
  let foto = perfil.fotoPerfilUrl || '';
  contenido.innerHTML = `
    ${encabezado('Perfil y seguridad', 'Datos de contacto, direcciones de entrega y contraseña.')}
    <div class="tarjeta mb-24"><div class="tarjeta-cuerpo">
      <h3 class="mb-16">Datos personales</h3>
      <form id="form-perfil" class="form-pila" novalidate>
        <div class="fila">
          <span id="vista-avatar">${avatarHTML({ ...perfil, fotoPerfilUrl: foto }, 'grande')}</span>
          <div class="fila">
            <label class="btn btn-linea btn-sm" for="subir-foto">${I.subir} Cambiar foto</label>
            <input type="file" id="subir-foto" accept="image/jpeg,image/png,image/webp" hidden>
            ${foto ? '<button type="button" class="btn btn-fantasma btn-sm" id="quitar-foto">Quitar</button>' : ''}
          </div>
        </div>
        <div class="fila-campos">
          <div class="campo"><label for="p-nombre">Nombre completo</label><input id="p-nombre" name="nombreCompleto" value="${esc(perfil.nombreCompleto)}" maxlength="150"><span class="msg-error"></span></div>
          <div class="campo"><label>Correo</label><input value="${esc(perfil.correo)}" disabled><span class="ayuda">El correo identifica tu cuenta y no se puede cambiar.</span></div>
          <div class="campo"><label for="p-doc">Documento de identidad</label><input id="p-doc" name="documentoIdentidad" value="${esc(perfil.documentoIdentidad || '')}" maxlength="20"><span class="msg-error"></span></div>
          <div class="campo"><label for="p-tel">Celular</label><input id="p-tel" name="telefono" value="${esc(perfil.telefono || '')}" inputmode="tel" maxlength="20"><span class="msg-error"></span></div>
        </div>
        <div><button class="btn btn-oscuro" type="submit">Guardar datos</button></div>
      </form>
    </div></div>

    ${esSuper() ? '' : `<div class="tarjeta mb-24"><div class="tarjeta-cuerpo">
      <div class="tarjeta-titulo"><h3>Direcciones de entrega</h3><button class="btn btn-sm btn-linea" type="button" id="nueva-direccion">${I.mas} Agregar</button></div>
      ${direcciones.length ? direcciones.map((d) => `
        <div class="direccion-item">
          <div class="fila" style="flex-wrap:nowrap;align-items:flex-start">${I.ubicacion.replace('<svg', '<svg width="20" height="20" style="flex-shrink:0;color:var(--oro-hondo)"')}
            <div><strong>${esc(d.etiqueta || 'Dirección')}</strong> ${d.predeterminada ? '<span class="etiqueta sin-punto">Principal</span>' : ''}<div class="texto-pequeno tenue">${esc(d.texto)}</div></div></div>
          <div class="fila" style="flex-wrap:nowrap">
            <button class="btn btn-sm btn-fantasma" data-editar-dir="${d.id}">${I.editar}</button>
            <button class="btn btn-sm btn-fantasma" data-borrar-dir="${d.id}">${I.basura}</button>
          </div>
        </div>`).join('') : '<p class="tenue texto-pequeno">Guarda tu casa u obra para elegirla rápido al reservar con entrega a domicilio.</p>'}
    </div></div>`}

    <div class="tarjeta"><div class="tarjeta-cuerpo">
      <h3 class="mb-16">Cambiar contraseña</h3>
      <form id="form-clave" class="form-pila" novalidate style="max-width:520px">
        <div class="campo"><label for="c-actual">Contraseña actual</label><div class="campo-contrasena"><input id="c-actual" name="actual" type="password" autocomplete="current-password"><button type="button"></button></div><span class="msg-error"></span></div>
        <div class="campo"><label for="c-nueva">Nueva contraseña</label><div class="campo-contrasena"><input id="c-nueva" name="nueva" type="password" autocomplete="new-password"><button type="button"></button></div><span class="ayuda">Mínimo 8 caracteres, con letras y números.</span><span class="msg-error"></span></div>
        <div><button class="btn btn-oscuro" type="submit">Actualizar contraseña</button></div>
      </form>
    </div></div>`;

  alternarContrasena(contenido);
  const pintarAvatar = () => { $('#vista-avatar').innerHTML = avatarHTML({ ...perfil, fotoPerfilUrl: foto }, 'grande'); };
  $('#subir-foto').addEventListener('change', async (e) => {
    const archivo = e.target.files[0];
    if (!archivo) return;
    try {
      foto = await subirImagen(archivo);
      pintarAvatar();
      toast('Foto cargada. Guarda para aplicarla.');
    } catch (err) { toastError(err); }
  });
  $('#quitar-foto')?.addEventListener('click', () => { foto = ''; pintarAvatar(); });

  const formPerfil = $('#form-perfil');
  formPerfil.addEventListener('submit', (e) => {
    e.preventDefault();
    enviarFormulario(formPerfil, $('button[type=submit]', formPerfil), async () => {
      const u = await put('/perfil', { ...datosFormulario(formPerfil), fotoPerfilUrl: foto || null });
      sesion.actualizarUsuario(u);
      usuario = u;
      pintarPerfilLateral();
      toast('Datos actualizados', 'ok');
    });
  });

  const formClave = $('#form-clave');
  formClave.addEventListener('submit', (e) => {
    e.preventDefault();
    enviarFormulario(formClave, $('button[type=submit]', formClave), async () => {
      await put('/perfil/password', datosFormulario(formClave));
      formClave.reset();
      toast('Contraseña actualizada', 'ok');
    });
  });

  $('#nueva-direccion')?.addEventListener('click', () => modalDireccion());
  $$('[data-editar-dir]').forEach((b) => b.addEventListener('click', () => modalDireccion(direcciones.find((d) => d.id === b.dataset.editarDir))));
  $$('[data-borrar-dir]').forEach((b) => b.addEventListener('click', async () => {
    const ok = await confirmar({ titulo: 'Eliminar dirección', mensaje: 'Las reservas ya hechas conservan la dirección con la que se crearon.', textoOk: 'Eliminar', peligro: true });
    if (!ok) return;
    try { await del(`/perfil/direcciones/${b.dataset.borrarDir}`); toast('Dirección eliminada'); renderPerfil(); } catch (err) { toastError(err); }
  }));
}

function modalDireccion(d = null) {
  modal({
    titulo: d ? 'Editar dirección' : 'Nueva dirección',
    cuerpo: `<form class="form-pila" novalidate>
      <div class="campo"><label>Nombre para reconocerla</label><input name="etiqueta" maxlength="50" placeholder="Casa, Obra Alto Prado…" value="${esc(d?.etiqueta || '')}"><span class="msg-error"></span></div>
      <div class="campo"><label>Dirección</label><input name="linea1" maxlength="200" placeholder="Cra 53 #76-115" value="${esc(d?.linea1 || '')}"><span class="msg-error"></span></div>
      <div class="campo"><label>Complemento <span class="opcional">(opcional)</span></label><input name="linea2" maxlength="200" placeholder="Apto 402, torre 2" value="${esc(d?.linea2 || '')}"></div>
      <div class="fila-campos">
        <div class="campo"><label>Ciudad</label><input name="ciudad" maxlength="100" value="${esc(d?.ciudad || 'Barranquilla')}"><span class="msg-error"></span></div>
        <div class="campo"><label>Departamento</label><input name="departamento" maxlength="100" value="${esc(d?.departamento || 'Atlántico')}"><span class="msg-error"></span></div>
      </div>
      <label class="casilla"><input type="checkbox" name="predeterminada" ${d?.predeterminada ? 'checked' : ''}> Usar como dirección principal</label>
    </form>`,
    acciones: [
      { texto: 'Cancelar', clase: 'btn-fantasma' },
      {
        texto: 'Guardar',
        clase: 'btn-oscuro',
        accion: async (velo) => {
          const datos = datosFormulario($('form', velo));
          if (d) await put(`/perfil/direcciones/${d.id}`, datos);
          else await post('/perfil/direcciones', datos);
          toast('Dirección guardada', 'ok');
          renderPerfil();
        },
      },
    ],
  });
}

// ================================================================== privacidad

async function renderPrivacidad() {
  contenido.innerHTML = `
    ${encabezado('Privacidad y datos', 'Tus derechos como titular según la Ley 1581 de 2012 (Habeas Data).')}
    <div class="dos-columnas">
      <div class="tarjeta"><div class="tarjeta-cuerpo">
        <h3>Qué guardamos</h3>
        <ul class="texto-pequeno" style="color:var(--texto-2);padding-left:18px;margin:12px 0 0;display:grid;gap:6px">
          <li>Nombre, correo, documento y teléfono.</li>
          <li>Direcciones de entrega que registres.</li>
          <li>Historial de reservas, pagos simulados y devoluciones.</li>
          <li>Calificaciones, reseñas y lista de deseos.</li>
        </ul>
        <p class="texto-pequeno tenue mt-16">Autorizaste el tratamiento el ${fecha(usuario.creadoEn)}. <a class="enlace" href="legal.html?doc=datos">Leer la política completa</a></p>
      </div></div>
      <div class="tarjeta"><div class="tarjeta-cuerpo">
        <h3>Consultar mis datos</h3>
        <p class="texto-pequeno mt-8" style="color:var(--texto-2)">Descarga en un archivo JSON todo lo que Hawkify tiene asociado a tu cuenta.</p>
        <button class="btn btn-linea mt-16" type="button" id="descargar-datos">${I.descargar} Descargar mis datos</button>
        <p class="texto-pequeno tenue mt-16">Para rectificar o actualizar, usa <a class="enlace" href="#perfil">Perfil y seguridad</a>.</p>
      </div></div>
    </div>
    ${esSuper() ? '' : `
    <div class="tarjeta mt-24" style="border-color:#efc2bd"><div class="tarjeta-cuerpo">
      <h3 style="color:var(--error)">Eliminar mi cuenta</h3>
      <p class="texto-pequeno mt-8" style="color:var(--texto-2);max-width:70ch">Borramos tus datos personales (nombre, correo, documento, teléfono, direcciones, foto, lista de deseos y notificaciones) y retiramos tus herramientas publicadas. El historial de reservas se conserva de forma anónima porque respalda operaciones ya realizadas. No se puede deshacer.</p>
      <button class="btn btn-peligro mt-16" type="button" id="eliminar-cuenta">${I.basura} Eliminar mi cuenta</button>
    </div></div>`}`;

  $('#descargar-datos').addEventListener('click', async (e) => {
    e.target.classList.add('cargando');
    try {
      const datos = await get('/perfil/mis-datos');
      descargar(`hawkify-mis-datos-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(datos, null, 2));
      toast('Descarga lista', 'ok');
    } catch (err) { toastError(err); } finally { e.target.classList.remove('cargando'); }
  });

  $('#eliminar-cuenta')?.addEventListener('click', () => {
    modal({
      titulo: '¿Eliminar tu cuenta definitivamente?',
      cuerpo: `<form class="form-pila" onsubmit="return false">
        <div class="alerta alerta-error">${I.alerta}<div>Esta acción no se puede deshacer. Si tienes reservas activas, primero deben terminar o cancelarse.</div></div>
        <div class="campo"><label for="clave-eliminar">Confirma con tu contraseña</label><input id="clave-eliminar" name="password" type="password" autocomplete="current-password"><span class="msg-error"></span></div>
      </form>`,
      acciones: [
        { texto: 'Conservar mi cuenta', clase: 'btn-fantasma' },
        {
          texto: 'Eliminar definitivamente',
          clase: 'btn-peligro',
          accion: async (velo) => {
            await post('/perfil/eliminar-cuenta', { password: $('#clave-eliminar', velo).value });
            sesion.cerrar();
            location.href = 'index.html';
          },
        },
      ],
    });
  });
}

const RENDER = {
  resumen: renderResumen,
  reservas: renderReservas,
  deseos: renderDeseos,
  herramientas: renderHerramientas,
  resenas: renderResenas,
  notificaciones: renderNotificaciones,
  perfil: renderPerfil,
  privacidad: renderPrivacidad,
};

pintarPerfilLateral();
window.addEventListener('hashchange', navegar);
navegar();
