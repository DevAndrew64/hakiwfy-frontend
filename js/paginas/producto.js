import { get, post } from '../core/api.js';
import { CalendarioRango } from '../core/calendario.js';
import { enlazarDeseos } from '../core/componentes.js';
import { I } from '../core/iconos.js';
import { montarLayout } from '../core/layout.js';
import { sesion } from '../core/sesion.js';
import {
  $, $$, avatarHTML, cargandoHTML, cop, esc, estrellasHTML, etiqueta, FISICO, fecha, fechaDia,
  fotoHTML, mesAnio, plural, vacioHTML,
} from '../core/ui.js';

montarLayout({ activo: 'catalogo' });

const params = new URLSearchParams(location.search);
const id = params.get('id');
const raiz = $('#producto');
let producto;
let parametros = {};
let calendario;
let modalidad = params.get('entrega') === 'domicilio' ? 'domicilio' : 'recogida';
let paginaResenas = 0;

async function iniciar() {
  if (!id) {
    raiz.innerHTML = vacioHTML({ titulo: 'Falta indicar la herramienta', accion: '<a class="btn btn-oscuro" href="catalogo.html">Ir al catálogo</a>' });
    return;
  }
  raiz.innerHTML = cargandoHTML('Cargando ficha técnica…');
  try {
    [producto, parametros] = await Promise.all([get(`/productos/${id}`), get('/parametros/publicos').catch(() => ({}))]);
  } catch (e) {
    raiz.innerHTML = vacioHTML({
      icono: I.alerta,
      titulo: e.status === 404 ? 'Esta herramienta no está disponible' : 'No pudimos cargar la herramienta',
      texto: esc(e.message),
      accion: '<a class="btn btn-oscuro" href="catalogo.html">Volver al catálogo</a>',
    });
    return;
  }
  document.title = `${producto.nombre} · Hawkify`;
  pintar();
  cargarResenas();
}

function avisoEstado(p) {
  const u = sesion.usuario();
  if (p.esPropio) {
    const extra = p.estadoPublicacion === 'rechazado' && p.motivoRechazo
      ? `<br><strong>Ajustes solicitados:</strong> ${esc(p.motivoRechazo)}` : '';
    return `<div class="alerta alerta-info aviso-propio">${I.info}<div>Esta herramienta es tuya · ${etiqueta('publicacion', p.estadoPublicacion)}${extra}
      <br><a class="enlace" href="cuenta.html#herramientas">Gestionarla desde Mis herramientas</a></div></div>`;
  }
  if (p.estadoPublicacion !== 'aprobado') {
    return `<div class="alerta alerta-aviso aviso-propio">${I.alerta}<div>Vista de staff: la ficha está en estado <strong>${esc(p.estadoPublicacion.replace('_', ' '))}</strong> y no aparece en el catálogo público.</div></div>`;
  }
  if (u?.rol === 'superadmin') {
    return `<div class="alerta alerta-info aviso-propio">${I.info}<div>Estás viendo la ficha como superadministrador. <a class="enlace" href="admin.html#inventario">Gestionar en el panel</a></div></div>`;
  }
  return '';
}

function pintar() {
  const p = producto;
  const imagenes = p.imagenes.length ? p.imagenes : [{ url: null }];
  const puedeReservar = p.reservable && !p.esPropio && sesion.rol() !== 'superadmin';
  const disponibilidadHoy = p.estadoFisico === 'en_mantenimiento'
    ? '<span class="etiqueta mantenimiento sin-punto"><span>En mantenimiento</span></span>'
    : p.unidadesLibresHoy > 0
      ? `<span class="etiqueta ok">${p.unidadesLibresHoy} de ${p.unidadesOperativas} ${p.unidadesOperativas === 1 ? 'unidad libre' : 'unidades libres'} hoy</span>`
      : '<span class="etiqueta aviso">Sin unidades libres hoy</span>';

  raiz.innerHTML = `
    <nav class="migas" aria-label="Ruta">
      <a href="index.html">Inicio</a><span>/</span>
      <a href="catalogo.html">Catálogo</a><span>/</span>
      <a href="catalogo.html?categoriaId=${p.categoria.id}">${esc(p.categoria.nombre)}</a><span>/</span>
      <span>${esc(p.nombre)}</span>
    </nav>
    <div class="producto-layout">
      <div>
        ${avisoEstado(p)}
        <div class="galeria-principal" id="foto-principal">${fotoHTML(imagenes[0].url, p.nombre)}</div>
        ${imagenes.length > 1 ? `<div class="galeria-miniaturas">
          ${imagenes.map((img, i) => `<button type="button" class="${i === 0 ? 'activo' : ''}" data-foto="${esc(img.url)}" aria-label="Foto ${i + 1}">${fotoHTML(img.url)}</button>`).join('')}
        </div>` : ''}

        <div class="producto-cabecera">
          <div class="fila-meta">
            <span class="mono">${esc(p.codigo)}</span>
            <span>·</span><span>${esc(p.categoria.nombre)}</span>
            ${p.marca ? `<span>·</span><span>${esc(p.marca.nombre)}</span>` : ''}
            <span>·</span><span>Estado: ${esc(FISICO[p.estadoFisico] || p.estadoFisico)}</span>
          </div>
          <h1>${esc(p.nombre)}</h1>
          <div class="fila">
            <a href="#resenas" style="text-decoration:none">${estrellasHTML(p.calificacionPromedio, { mostrarNumero: true, total: p.totalCalificaciones })}</a>
            ${disponibilidadHoy}
          </div>
        </div>

        <div class="propietario">
          ${avatarHTML({ nombre: p.propietario.nombre })}
          <div>
            <strong>${esc(p.propietario.nombre)}</strong>
            <span>Propietario · publica en Hawkify desde ${mesAnio(p.propietarioDesde)}</span>
          </div>
        </div>

        <section class="bloque-detalle"><h2>Descripción</h2><p>${esc(p.descripcion || 'El propietario no agregó una descripción.')}</p></section>
        ${p.especificaciones.length ? `
        <section class="bloque-detalle"><h2>Ficha técnica</h2>
          <table class="tabla-specs">${p.especificaciones.map((e) => `<tr><td>${esc(e.clave)}</td><td>${esc(e.valor)}</td></tr>`).join('')}</table>
        </section>` : ''}
        <section class="bloque-detalle"><h2>Condiciones de uso</h2><p>${esc(p.condicionesUso || 'Usar según el manual del fabricante y con los elementos de protección personal adecuados. Devolver limpia y en el estado en que se recibió.')}</p></section>
        <section class="bloque-detalle"><h2>Garantía por daños</h2><p>${esc(p.politicaGarantia)}</p>
          ${p.garantiaPorDefecto ? '<p class="texto-pequeno tenue mt-8">Esta es la política general de Hawkify; el propietario no definió una propia.</p>' : ''}
        </section>
        <section class="bloque-detalle" id="resenas" style="border-bottom:none"><h2>Reseñas</h2><div id="bloque-resenas">${cargandoHTML()}</div></section>
      </div>

      <aside class="panel-reserva">
        <div class="tarjeta"><div class="tarjeta-cuerpo">
          <div class="entre">
            <div class="precio-grande">${cop(p.tarifaDia)} <small>/ día</small></div>
            ${sesion.rol() === 'superadmin' || p.esPropio ? '' : `<button class="btn btn-linea btn-sm boton-deseo-panel ${p.enListaDeseos ? 'activo' : ''}" data-deseo="${p.id}" type="button">${I.corazon}<span>${p.enListaDeseos ? 'Guardada' : 'Guardar'}</span></button>`}
          </div>
          ${puedeReservar ? `
            <div id="calendario" class="mt-16"></div>
            <div class="rango-elegido">
              <div><span>Inicio</span><strong id="r-desde">Elige fecha</strong></div>
              <div><span>Devolución</span><strong id="r-hasta">—</strong></div>
            </div>
            <div class="segmentado" role="group" aria-label="Entrega" style="width:100%">
              <button type="button" data-modalidad="recogida" style="flex:1">${I.tienda.replace('<svg', '<svg width="15" height="15" style="vertical-align:-3px"')} Recoger</button>
              <button type="button" data-modalidad="domicilio" style="flex:1">${I.camion.replace('<svg', '<svg width="15" height="15" style="vertical-align:-3px"')} A domicilio</button>
            </div>
            <div id="cotizacion"></div>
            <button class="btn btn-lg btn-bloque" id="reservar" type="button" disabled>Elige tus fechas</button>
            <p class="texto-pequeno tenue mt-8" style="text-align:center">No se cobra nada hasta que confirmes el pago.</p>
          ` : `
            <div class="alerta ${p.esPropio || sesion.rol() === 'superadmin' ? 'alerta-info' : 'alerta-aviso'} mt-16">${I.info}<div>${
              p.esPropio ? 'No puedes reservar tu propia herramienta.'
                : sesion.rol() === 'superadmin' ? 'La cuenta de superadministrador no realiza reservas.'
                  : p.estadoFisico === 'en_mantenimiento' ? 'Está en mantenimiento. Guárdala en tu lista de deseos y te avisamos cuando vuelva.'
                    : 'Por ahora no recibe reservas.'}</div></div>`}
        </div></div>
        <div class="texto-pequeno tenue mt-16" style="padding:0 4px">
          <strong style="color:var(--texto-2)">Cancelación:</strong> ${esc(parametros['cancelacion.politica'] || 'Consulta la política de cancelación.')}
        </div>
      </aside>
    </div>`;

  $$('.galeria-miniaturas button', raiz).forEach((b) => b.addEventListener('click', () => {
    $('#foto-principal').innerHTML = fotoHTML(b.dataset.foto, p.nombre);
    $$('.galeria-miniaturas button', raiz).forEach((x) => x.classList.toggle('activo', x === b));
  }));

  enlazarDeseos(raiz, (_, activo) => {
    const b = $('.boton-deseo-panel', raiz);
    if (b) $('span', b).textContent = activo ? 'Guardada' : 'Guardar';
  });

  if (puedeReservar) montarReserva();
}

function montarReserva() {
  calendario = new CalendarioRango($('#calendario'), {
    productoId: id,
    desde: params.get('desde'),
    hasta: params.get('hasta'),
    maxDias: Number(parametros['reserva.dias_maximos'] || 30),
    alCambiar: cotizar,
  });
  $$('[data-modalidad]').forEach((b) => {
    b.classList.toggle('activo', b.dataset.modalidad === modalidad);
    b.addEventListener('click', () => {
      modalidad = b.dataset.modalidad;
      $$('[data-modalidad]').forEach((x) => x.classList.toggle('activo', x === b));
      cotizar(calendario.valor());
    });
  });
  $('#reservar').addEventListener('click', () => {
    const { desde, hasta } = calendario.valor();
    const destino = `checkout.html?producto=${id}&desde=${desde}&hasta=${hasta}&entrega=${modalidad}`;
    location.href = sesion.activa() ? destino : `login.html?next=${encodeURIComponent(destino)}`;
  });
  if (params.get('desde')) cotizar(calendario.valor());
}

let cotizacionActual = 0;
async function cotizar({ desde, hasta }) {
  $('#r-desde').textContent = desde ? fechaDia(desde) : 'Elige fecha';
  $('#r-hasta').textContent = hasta ? fechaDia(hasta) : desde ? 'Elige devolución' : '—';
  const boton = $('#reservar');
  const caja = $('#cotizacion');
  if (!desde || !hasta) {
    caja.innerHTML = '';
    boton.disabled = true;
    boton.textContent = desde ? 'Elige la fecha de devolución' : 'Elige tus fechas';
    return;
  }
  const n = ++cotizacionActual;
  caja.innerHTML = '<div class="desglose"><div class="linea-esqueleto esqueleto"></div><div class="linea-esqueleto esqueleto"></div></div>';
  try {
    const c = await post('/reservas/cotizar', { productoId: id, fechaInicio: desde, fechaFin: hasta, modalidadEntrega: modalidad });
    if (n !== cotizacionActual) return;
    caja.innerHTML = `
      <div class="desglose">
        <div class="fila"><span>${cop(c.tarifaDia)} × ${plural(c.dias, 'día', 'días')}</span><span>${cop(c.subtotal)}</span></div>
        <div class="fila"><span>${modalidad === 'domicilio' ? 'Entrega y recogida a domicilio' : 'Recoges en el punto Hawkify'}</span><span>${Number(c.costoEnvio) ? cop(c.costoEnvio) : 'Sin costo'}</span></div>
        <div class="fila total"><span>Total</span><span>${cop(c.total)}</span></div>
      </div>
      ${c.disponible ? '' : `<div class="alerta alerta-aviso mb-16">${I.alerta}<div>${esc(c.mensaje)}</div></div>`}`;
    boton.disabled = !c.disponible;
    boton.textContent = c.disponible ? `Reservar ${plural(c.dias, 'día', 'días')}` : 'Fechas no disponibles';
  } catch (e) {
    caja.innerHTML = `<div class="alerta alerta-error mb-16">${I.alerta}<div>${esc(e.message)}</div></div>`;
    boton.disabled = true;
  }
}

async function cargarResenas(mas = false) {
  const bloque = $('#bloque-resenas');
  try {
    const r = await get(`/productos/${id}/resenas`, { pagina: paginaResenas, tamano: 6 });
    if (!r.total) {
      bloque.innerHTML = vacioHTML({
        icono: I.estrella,
        titulo: 'Todavía no tiene calificaciones',
        texto: 'Las reseñas solo las pueden escribir personas que alquilaron y devolvieron esta herramienta.',
      });
      return;
    }
    const maximo = Math.max(...Object.values(r.distribucion), 1);
    const items = r.items.map((c) => `
      <article class="resena">
        <header>
          <div class="autor">${avatarHTML({ nombre: c.autor })}<div>${esc(c.autor)}<div>${estrellasHTML(c.estrellas)}</div></div></div>
          <time datetime="${c.fecha}">${fecha(c.fecha)}${c.editada ? ' · editada' : ''}</time>
        </header>
        ${c.texto ? `<p>${esc(c.texto)}</p>` : '<p class="tenue texto-pequeno">Calificó sin dejar comentario.</p>'}
      </article>`).join('');
    const botonMas = r.pagina + 1 < r.totalPaginas
      ? '<button class="btn btn-linea mt-16" type="button" id="mas-resenas">Ver más reseñas</button>' : '';

    if (mas) {
      $('#mas-resenas')?.remove();
      $('#lista-resenas').insertAdjacentHTML('beforeend', items);
      $('#lista-resenas').insertAdjacentHTML('afterend', botonMas);
    } else {
      bloque.innerHTML = `
        <div class="reputacion">
          <div>
            <div class="nota">${Number(r.promedio).toFixed(1)}</div>
            ${estrellasHTML(r.promedio)}
            <p class="texto-pequeno tenue mt-8">${plural(r.total, 'calificación', 'calificaciones')} de alquileres finalizados</p>
          </div>
          <div class="barras-dist">
            ${Object.entries(r.distribucion).sort((a, b) => b[0] - a[0]).map(([k, v]) => `
              <div class="barra-dist"><span>${k} ★</span><div class="pista"><div class="relleno" style="width:${(v / maximo) * 100}%"></div></div><span>${v}</span></div>`).join('')}
          </div>
        </div>
        <div id="lista-resenas">${items}</div>${botonMas}`;
    }
    $('#mas-resenas')?.addEventListener('click', () => {
      paginaResenas += 1;
      cargarResenas(true);
    });
  } catch {
    bloque.innerHTML = '<p class="tenue">No pudimos cargar las reseñas.</p>';
  }
}

iniciar();
