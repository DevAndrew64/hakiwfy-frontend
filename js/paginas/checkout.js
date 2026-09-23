import { get, post } from '../core/api.js';
import { I } from '../core/iconos.js';
import { montarLayout } from '../core/layout.js';
import { exigirSesion, sesion } from '../core/sesion.js';
import {
  $, $$, cargandoHTML, cop, esc, fecha, fechaDia, fechaHora, fotoHTML, plural, vacioHTML,
} from '../core/ui.js';

const usuario = exigirSesion();
montarLayout({});

const params = new URLSearchParams(location.search);
const productoId = params.get('producto');
const desde = params.get('desde');
const hasta = params.get('hasta');
let modalidad = params.get('entrega') === 'domicilio' ? 'domicilio' : 'recogida';
let metodo = 'tarjeta_simulada';
const raiz = $('#checkout');
const CLAVE_PENDIENTE = `hk_pendiente_${productoId}_${desde}_${hasta}`;

let producto;
let perfil;
let direcciones = [];
let cotizacion;
let parametros = {};
let pendiente = leerPendiente();
let temporizador;

const BANCOS = ['Bancolombia', 'Banco de Bogotá', 'Davivienda', 'BBVA Colombia', 'Banco de Occidente', 'Banco Popular',
  'Scotiabank Colpatria', 'Banco Caja Social', 'Banco AV Villas', 'Itaú', 'Banco Falabella', 'Nu Colombia'];

function leerPendiente() {
  try { return JSON.parse(sessionStorage.getItem(CLAVE_PENDIENTE)); } catch { return null; }
}
function guardarPendiente(r) {
  pendiente = r ? { id: r.id, codigo: r.codigo, limite: r.limitePagoEn, modalidad: r.modalidadEntrega } : null;
  try {
    if (pendiente) sessionStorage.setItem(CLAVE_PENDIENTE, JSON.stringify(pendiente));
    else sessionStorage.removeItem(CLAVE_PENDIENTE);
  } catch { /* sin almacenamiento de sesión */ }
}

async function iniciar() {
  if (!productoId || !desde || !hasta) {
    raiz.innerHTML = vacioHTML({ titulo: 'Faltan datos de la reserva', texto: 'Elige la herramienta y las fechas desde su ficha.', accion: '<a class="btn btn-oscuro" href="catalogo.html">Ir al catálogo</a>' });
    return;
  }
  if (sesion.rol() === 'superadmin') {
    raiz.innerHTML = vacioHTML({ icono: I.info, titulo: 'El superadministrador no realiza reservas', accion: '<a class="btn btn-oscuro" href="admin.html">Ir al panel</a>' });
    return;
  }
  raiz.innerHTML = cargandoHTML('Preparando tu reserva…');
  try {
    [producto, perfil, direcciones, parametros] = await Promise.all([
      get(`/productos/${productoId}`),
      get('/perfil'),
      get('/perfil/direcciones'),
      get('/parametros/publicos'),
    ]);
    if (pendiente) modalidad = pendiente.modalidad;
    await cotizar();
  } catch (e) {
    raiz.innerHTML = vacioHTML({ icono: I.alerta, titulo: 'No pudimos preparar la reserva', texto: esc(e.message), accion: '<a class="btn btn-oscuro" href="catalogo.html">Volver al catálogo</a>' });
    return;
  }
  pintar();
}

async function cotizar() {
  cotizacion = await post('/reservas/cotizar', { productoId, fechaInicio: desde, fechaFin: hasta, modalidadEntrega: modalidad });
}

function direccionesHTML() {
  const bloqueado = pendiente ? 'disabled' : '';
  const guardadas = direcciones.map((d, i) => `
    <label class="opcion-tarjeta">
      <input type="radio" name="direccion" value="${d.id}" ${i === 0 ? 'checked' : ''} ${bloqueado}>
      <div><div class="titulo">${esc(d.etiqueta || 'Dirección')}${d.predeterminada ? ' <span class="etiqueta sin-punto">Principal</span>' : ''}</div><div class="detalle">${esc(d.texto)}</div></div>
    </label>`).join('');
  return `
    <div class="opciones-tarjeta mt-16" id="lista-direcciones">
      ${guardadas}
      <label class="opcion-tarjeta">
        <input type="radio" name="direccion" value="otra" ${direcciones.length ? '' : 'checked'} ${bloqueado}>
        <div style="flex:1"><div class="titulo">Otra dirección</div>
          <div class="campo mt-8" id="campo-otra"><textarea name="direccionTexto" rows="2" placeholder="Calle 84 #45-12, apto 301, Barranquilla" ${bloqueado}></textarea><span class="msg-error"></span></div>
        </div>
      </label>
    </div>`;
}

function pagoHTML() {
  if (metodo === 'pse_simulado') {
    return `
      <div class="fila-campos">
        <div class="campo"><label for="banco">Banco</label>
          <select id="banco" name="banco"><option value="">Selecciona tu banco</option>${BANCOS.map((b) => `<option>${b}</option>`).join('')}</select>
          <span class="msg-error"></span></div>
        <div class="campo"><label for="tipo-persona">Tipo de persona</label>
          <select id="tipo-persona"><option>Natural</option><option>Jurídica</option></select></div>
      </div>
      <p class="texto-pequeno tenue mt-8">En producción serías redirigido al portal de tu banco. Aquí la aprobación es inmediata.</p>`;
  }
  if (metodo === 'nequi_simulado') {
    return `
      <div class="campo" style="max-width:320px"><label for="celular">Celular registrado en Nequi</label>
        <input id="celular" name="celular" inputmode="numeric" maxlength="12" placeholder="300 123 4567">
        <span class="msg-error"></span></div>
      <p class="texto-pequeno tenue mt-8">Recibirías una notificación push en la app para aprobar el pago.</p>`;
  }
  return `
    <div class="tarjeta-visual" aria-hidden="true">
      <div class="entre"><div class="chip-tarjeta"></div><span class="mono" id="tv-marca">TARJETA</span></div>
      <div class="numero" id="tv-numero">•••• •••• •••• ••••</div>
      <div class="pie-tarjeta"><span id="tv-titular">NOMBRE DEL TITULAR</span><span id="tv-vence">MM/AA</span></div>
    </div>
    <div class="form-pila">
      <div class="campo"><label for="numeroTarjeta">Número de tarjeta</label>
        <input id="numeroTarjeta" name="numeroTarjeta" inputmode="numeric" autocomplete="off" maxlength="23" placeholder="4111 1111 1111 4242">
        <span class="msg-error"></span></div>
      <div class="campo"><label for="titular">Nombre como aparece en la tarjeta</label>
        <input id="titular" name="titular" autocomplete="off" maxlength="60" value="${esc(perfil.nombreCompleto.toUpperCase())}">
        <span class="msg-error"></span></div>
      <div class="fila-campos">
        <div class="campo"><label for="vencimiento">Vencimiento</label>
          <input id="vencimiento" name="vencimiento" inputmode="numeric" maxlength="5" placeholder="MM/AA" autocomplete="off"><span class="msg-error"></span></div>
        <div class="campo"><label for="cvv">CVV</label>
          <input id="cvv" name="cvv" inputmode="numeric" maxlength="4" placeholder="123" autocomplete="off"><span class="msg-error"></span></div>
      </div>
    </div>`;
}

function resumenHTML() {
  const c = cotizacion;
  return `
    <div class="tarjeta"><div class="tarjeta-cuerpo">
      <div class="resumen-producto">
        ${fotoHTML(producto.imagenes[0]?.url, producto.nombre)}
        <div><span class="mono texto-pequeno tenue">${esc(producto.codigo)}</span><strong>${esc(producto.nombre)}</strong>
          <span class="texto-pequeno tenue">${cop(c.tarifaDia)} por día</span></div>
      </div>
      <div class="rango-elegido">
        <div><span>Inicio</span><strong>${fechaDia(desde)}</strong></div>
        <div><span>Devolución</span><strong>${fechaDia(hasta)}</strong></div>
      </div>
      <div class="desglose">
        <div class="fila"><span>${cop(c.tarifaDia)} × ${plural(c.dias, 'día', 'días')}</span><span>${cop(c.subtotal)}</span></div>
        <div class="fila"><span>${modalidad === 'domicilio' ? 'Entrega a domicilio' : 'Recogida en punto Hawkify'}</span><span>${Number(c.costoEnvio) ? cop(c.costoEnvio) : 'Sin costo'}</span></div>
        <div class="fila total"><span>Total</span><span>${cop(c.total)}</span></div>
      </div>
      ${pendiente ? `<div class="alerta alerta-aviso">${I.reloj}<div>Retenemos tu unidad mientras pagas: <span class="cronometro" id="cronometro">--:--</span></div></div>` : ''}
      <p class="texto-pequeno tenue mt-16"><strong style="color:var(--texto-2)">Cancelación:</strong> ${esc(c.politicaCancelacion)}</p>
    </div></div>`;
}

function pintar() {
  if (!cotizacion.disponible && !pendiente) {
    raiz.innerHTML = vacioHTML({
      icono: I.calendario,
      titulo: 'Esas fechas ya no están disponibles',
      texto: esc(cotizacion.mensaje),
      accion: `<a class="btn btn-oscuro" href="producto.html?id=${productoId}">Elegir otras fechas</a>`,
    });
    return;
  }
  const bloqueado = pendiente ? 'disabled' : '';
  raiz.innerHTML = `
    <nav class="migas"><a href="producto.html?id=${productoId}&desde=${desde}&hasta=${hasta}">${I.izq.replace('<svg', '<svg width="14" height="14" style="vertical-align:-2px"')} Volver a la herramienta</a></nav>
    <div class="encabezado-pagina" style="padding-top:4px"><h1>Confirma tu alquiler</h1><p>Tres pasos y la herramienta queda apartada a tu nombre.</p></div>
    <div class="checkout-layout">
      <form id="form-checkout" novalidate>
        ${pendiente ? `<div class="alerta alerta-info mb-16">${I.info}<div>Ya creamos la reserva <strong class="mono">${esc(pendiente.codigo)}</strong> y está pendiente de pago. Completa el pago o <button type="button" class="enlace" id="descartar">descártala para cambiar la entrega</button>.</div></div>` : ''}
        <section class="tarjeta paso-checkout"><div class="tarjeta-cuerpo">
          <h2><span class="n">1</span>Tus datos</h2>
          <div class="fila-campos">
            <div class="campo"><label>Nombre</label><input value="${esc(perfil.nombreCompleto)}" disabled></div>
            <div class="campo"><label>Correo</label><input value="${esc(perfil.correo)}" disabled></div>
            <div class="campo"><label for="documentoIdentidad">Documento de identidad</label>
              <input id="documentoIdentidad" name="documentoIdentidad" value="${esc(perfil.documentoIdentidad || '')}" placeholder="Cédula o CE" ${bloqueado}>
              <span class="msg-error"></span></div>
            <div class="campo"><label for="telefono">Celular de contacto</label>
              <input id="telefono" name="telefono" value="${esc(perfil.telefono || '')}" inputmode="tel" placeholder="300 123 4567" ${bloqueado}>
              <span class="msg-error"></span></div>
          </div>
          <p class="texto-pequeno tenue mt-8">Respaldan el alquiler ante el propietario. Se guardan en tu perfil y puedes cambiarlos cuando quieras.</p>
        </div></section>

        <section class="tarjeta paso-checkout"><div class="tarjeta-cuerpo">
          <h2><span class="n">2</span>Entrega</h2>
          <div class="opciones-tarjeta">
            <label class="opcion-tarjeta"><input type="radio" name="modalidad" value="recogida" ${modalidad === 'recogida' ? 'checked' : ''} ${bloqueado}>
              <div><div class="titulo">Recoger en punto Hawkify</div><div class="detalle">Cra 38 #72-13, Barranquilla · lunes a sábado, 7:00 a. m. a 6:00 p. m.</div></div>
              <span class="precio">Sin costo</span></label>
            <label class="opcion-tarjeta"><input type="radio" name="modalidad" value="domicilio" ${modalidad === 'domicilio' ? 'checked' : ''} ${bloqueado}>
              <div><div class="titulo">Entrega y recogida a domicilio</div><div class="detalle">Llevamos la herramienta el día de inicio y la recogemos el día de devolución.</div></div>
              <span class="precio">${cop(parametros['envio.tarifa_domicilio'] || 15000)}</span></label>
          </div>
          <div id="bloque-direccion" class="${modalidad === 'domicilio' ? '' : 'oculto'}">${direccionesHTML()}</div>
        </div></section>

        <section class="tarjeta paso-checkout"><div class="tarjeta-cuerpo">
          <h2><span class="n">3</span>Pago</h2>
          <div class="alerta alerta-aviso mb-16">${I.info}<div><strong>Modo demostración.</strong> No se hace ningún cobro. Cualquier número de 13 a 19 dígitos funciona; una tarjeta terminada en <span class="mono">0002</span> simula un rechazo del banco.</div></div>
          <div class="tabs-pago" role="tablist">
            <button type="button" data-metodo="tarjeta_simulada" class="${metodo === 'tarjeta_simulada' ? 'activo' : ''}">${I.tarjeta}Tarjeta</button>
            <button type="button" data-metodo="pse_simulado" class="${metodo === 'pse_simulado' ? 'activo' : ''}">${I.banco}PSE</button>
            <button type="button" data-metodo="nequi_simulado" class="${metodo === 'nequi_simulado' ? 'activo' : ''}">${I.celular}Nequi</button>
          </div>
          <div id="campos-pago">${pagoHTML()}</div>
          <div id="error-pago"></div>
          <label class="casilla mt-24"><input type="checkbox" name="acepto" id="acepto">
            <span>Acepto los <a class="enlace" href="legal.html?doc=terminos" target="_blank">términos del alquiler</a> y la <a class="enlace" href="legal.html?doc=cancelacion" target="_blank">política de cancelación</a>.</span></label>
          <button class="btn btn-lg btn-bloque mt-16" type="submit" id="pagar">Pagar ${cop(cotizacion.total)} y confirmar</button>
        </div></section>
      </form>
      <aside class="resumen-checkout" id="resumen">${resumenHTML()}</aside>
    </div>`;

  enlazar();
  if (pendiente) iniciarCronometro();
}

function enlazar() {
  const form = $('#form-checkout');
  $$('[name=modalidad]', form).forEach((r) => r.addEventListener('change', async () => {
    modalidad = r.value;
    $('#bloque-direccion').classList.toggle('oculto', modalidad !== 'domicilio');
    await cotizar();
    $('#resumen').innerHTML = resumenHTML();
    $('#pagar').textContent = `Pagar ${cop(cotizacion.total)} y confirmar`;
  }));
  $$('[data-metodo]', form).forEach((b) => b.addEventListener('click', () => {
    metodo = b.dataset.metodo;
    $$('[data-metodo]', form).forEach((x) => x.classList.toggle('activo', x === b));
    $('#campos-pago').innerHTML = pagoHTML();
    $('#error-pago').innerHTML = '';
    enlazarTarjeta();
  }));
  enlazarTarjeta();
  $('#descartar')?.addEventListener('click', descartarPendiente);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    confirmar();
  });
}

function enlazarTarjeta() {
  const num = $('#numeroTarjeta');
  if (!num) return;
  num.addEventListener('input', () => {
    const d = num.value.replace(/\D/g, '').slice(0, 19);
    num.value = d.replace(/(.{4})/g, '$1 ').trim();
    $('#tv-numero').textContent = (d.padEnd(16, '•').match(/.{1,4}/g) || []).join(' ');
    $('#tv-marca').textContent = d.startsWith('4') ? 'VISA' : /^(5|2)/.test(d) ? 'MASTERCARD' : d.startsWith('3') ? 'AMEX' : 'TARJETA';
  });
  $('#titular').addEventListener('input', (e) => { $('#tv-titular').textContent = e.target.value.toUpperCase() || 'NOMBRE DEL TITULAR'; });
  $('#tv-titular').textContent = $('#titular').value || 'NOMBRE DEL TITULAR';
  const venc = $('#vencimiento');
  venc.addEventListener('input', () => {
    const d = venc.value.replace(/\D/g, '').slice(0, 4);
    venc.value = d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
    $('#tv-vence').textContent = venc.value || 'MM/AA';
  });
  $('#cvv').addEventListener('input', (e) => { e.target.value = e.target.value.replace(/\D/g, ''); });
}

function marcarError(nombre, mensaje) {
  const input = $(`[name="${nombre}"]`);
  const campo = input?.closest('.campo');
  if (!campo) return;
  campo.classList.add('con-error');
  $('.msg-error', campo).textContent = mensaje;
}

function validar() {
  $$('.con-error').forEach((c) => c.classList.remove('con-error'));
  const errores = [];
  const v = (n) => ($(`[name="${n}"]`)?.value || '').trim();
  if (!pendiente) {
    if (v('documentoIdentidad').length < 5) errores.push(['documentoIdentidad', 'Escribe tu documento (mínimo 5 caracteres).']);
    if (v('telefono').replace(/\D/g, '').length < 7) errores.push(['telefono', 'Escribe un número de contacto válido.']);
    if (modalidad === 'domicilio') {
      const sel = $('[name=direccion]:checked')?.value;
      if (sel === 'otra' && v('direccionTexto').length < 8) errores.push(['direccionTexto', 'Escribe la dirección completa: calle, número y ciudad.']);
    }
  }
  if (metodo === 'tarjeta_simulada') {
    const numeroLimpio = v('numeroTarjeta').replace(/\D/g, '');
    if (numeroLimpio.length < 13) errores.push(['numeroTarjeta', 'El número debe tener entre 13 y 19 dígitos.']);
    if (!v('titular')) errores.push(['titular', 'Escribe el nombre del titular.']);
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(v('vencimiento'))) errores.push(['vencimiento', 'Usa el formato MM/AA.']);
    if (!/^\d{3,4}$/.test(v('cvv'))) errores.push(['cvv', '3 o 4 dígitos.']);
  }
  if (metodo === 'pse_simulado' && !v('banco')) errores.push(['banco', 'Selecciona tu banco.']);
  if (metodo === 'nequi_simulado' && !/^3\d{9}$/.test(v('celular').replace(/\D/g, ''))) errores.push(['celular', 'Debe tener 10 dígitos y empezar por 3.']);
  errores.forEach(([n, m]) => marcarError(n, m));
  if (!$('#acepto').checked) {
    errores.push(['acepto', '']);
    $('#error-pago').innerHTML = `<div class="alerta alerta-error mt-16">${I.alerta}<div>Debes aceptar los términos y la política de cancelación.</div></div>`;
  }
  if (errores.length) $(`[name="${errores[0][0]}"]`)?.focus();
  return !errores.length;
}

async function confirmar() {
  $('#error-pago').innerHTML = '';
  if (!validar()) return;
  const boton = $('#pagar');
  boton.classList.add('cargando');
  const v = (n) => ($(`[name="${n}"]`)?.value || '').trim();
  try {
    if (!pendiente) {
      const sel = $('[name=direccion]:checked')?.value;
      const reserva = await post('/reservas', {
        productoId,
        fechaInicio: desde,
        fechaFin: hasta,
        modalidadEntrega: modalidad,
        direccionId: modalidad === 'domicilio' && sel !== 'otra' ? sel : null,
        direccionTexto: modalidad === 'domicilio' && sel === 'otra' ? v('direccionTexto') : null,
        documentoIdentidad: v('documentoIdentidad'),
        telefono: v('telefono'),
      });
      guardarPendiente(reserva);
    }
    const pagada = await post(`/reservas/${pendiente.id}/pago`, {
      metodo,
      titular: v('titular'),
      numeroTarjeta: v('numeroTarjeta').replace(/\D/g, ''),
      vencimiento: v('vencimiento'),
      cvv: v('cvv'),
      banco: v('banco'),
      celular: v('celular').replace(/\D/g, ''),
    });
    guardarPendiente(null);
    clearInterval(temporizador);
    exito(pagada);
  } catch (e) {
    boton.classList.remove('cargando');
    if (e.status === 402) {
      $('#error-pago').innerHTML = `<div class="alerta alerta-error mt-16">${I.alerta}<div><strong>Pago rechazado.</strong> ${esc(e.message)} Tu unidad sigue apartada unos minutos.</div></div>`;
      pintarManteniendoPago();
    } else if (e.status === 409 && pendiente) {
      guardarPendiente(null);
      raiz.innerHTML = vacioHTML({ icono: I.reloj, titulo: 'La reserva pendiente expiró', texto: esc(e.message), accion: `<a class="btn btn-oscuro" href="producto.html?id=${productoId}">Elegir fechas de nuevo</a>` });
    } else if (e.status === 409) {
      raiz.innerHTML = vacioHTML({ icono: I.calendario, titulo: 'Alguien se adelantó', texto: esc(e.message), accion: `<a class="btn btn-oscuro" href="producto.html?id=${productoId}">Ver otras fechas</a>` });
    } else if (Object.keys(e.campos || {}).length) {
      Object.entries(e.campos).forEach(([n, m]) => marcarError(n, m));
    } else {
      $('#error-pago').innerHTML = `<div class="alerta alerta-error mt-16">${I.alerta}<div>${esc(e.message)}</div></div>`;
    }
  }
}

/** Tras un rechazo: bloquea pasos 1-2 (la reserva ya existe) sin perder lo digitado en el pago. */
function pintarManteniendoPago() {
  $$('#form-checkout .paso-checkout:nth-of-type(-n+2) input, #form-checkout .paso-checkout:nth-of-type(-n+2) textarea')
    .forEach((i) => { i.disabled = true; });
  if (!$('#descartar')) {
    $('#form-checkout').insertAdjacentHTML('afterbegin', `<div class="alerta alerta-info mb-16">${I.info}<div>La reserva <strong class="mono">${esc(pendiente.codigo)}</strong> quedó pendiente de pago. Puedes reintentar con otro medio o <button type="button" class="enlace" id="descartar">descartarla</button>.</div></div>`);
    $('#descartar').addEventListener('click', descartarPendiente);
  }
  $('#resumen').innerHTML = resumenHTML();
  iniciarCronometro();
}

async function descartarPendiente() {
  if (!pendiente) return;
  try {
    await post(`/reservas/${pendiente.id}/cancelar`, { motivo: 'Descartada en el checkout para cambiar datos' });
  } catch { /* si ya expiró, igual se limpia */ }
  guardarPendiente(null);
  clearInterval(temporizador);
  await cotizar();
  pintar();
}

function iniciarCronometro() {
  clearInterval(temporizador);
  const limite = new Date(pendiente.limite).getTime();
  const pintarTiempo = () => {
    const el = $('#cronometro');
    if (!el) return;
    const s = Math.max(0, Math.round((limite - Date.now()) / 1000));
    el.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    if (s === 0) {
      clearInterval(temporizador);
      el.closest('.alerta').outerHTML = `<div class="alerta alerta-error">${I.reloj}<div>El tiempo para pagar terminó. Vuelve a elegir las fechas.</div></div>`;
    }
  };
  pintarTiempo();
  temporizador = setInterval(pintarTiempo, 1000);
}

function exito(r) {
  window.scrollTo({ top: 0 });
  raiz.innerHTML = `
    <div class="confirmacion">
      <div class="sello-ok">${I.check}</div>
      <span class="sobretitulo">Reserva ${esc(r.codigo)}</span>
      <h1 style="margin-top:10px">¡Listo! La herramienta es tuya del ${fecha(r.fechaInicio)} al ${fecha(r.fechaFin)}</h1>
      <p class="tenue mt-8">Quedó en tus notificaciones y en Mis reservas. El propietario ya fue avisado para preparar la unidad.</p>
      <div class="comprobante">
        <div class="fila"><span>Herramienta</span><span>${esc(r.producto.nombre)}</span></div>
        <div class="fila"><span>Unidad asignada</span><span>${esc(r.unidad)}</span></div>
        <div class="fila"><span>Fechas</span><span>${fechaDia(r.fechaInicio)} → ${fechaDia(r.fechaFin)} (${plural(r.dias, 'día', 'días')})</span></div>
        <div class="fila"><span>Entrega</span><span>${r.modalidadEntrega === 'domicilio' ? esc(r.direccionEntrega) : 'Recoges en Cra 38 #72-13'}</span></div>
        <div class="fila"><span>Pago</span><span>${esc(r.pago.detalle || '')}</span></div>
        <div class="fila"><span>Referencia</span><span>${esc(r.pago.referencia)}</span></div>
        <div class="fila"><span>Pagado el</span><span>${fechaHora(r.pago.fechaPago)}</span></div>
        <div class="fila"><span>Total</span><span style="font-size:18px">${cop(r.total)}</span></div>
      </div>
      <div class="fila" style="justify-content:center">
        <a class="btn btn-oscuro" href="cuenta.html#reservas">Ver mis reservas</a>
        <button class="btn btn-linea" type="button" onclick="window.print()">Imprimir comprobante</button>
        <a class="btn btn-fantasma" href="catalogo.html">Seguir explorando</a>
      </div>
    </div>`;
}

iniciar();
