/* Utilidades de interfaz compartidas: formato, toasts, modales, formularios. */
import { I } from './iconos.js';

export const $ = (sel, raiz = document) => raiz.querySelector(sel);
export const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];

export function esc(valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ------------------------------------------------------------------ formato

const fmtCOP = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });
export const cop = (n) => `$${fmtCOP.format(Math.round(Number(n) || 0))}`;
export const numero = (n) => fmtCOP.format(Number(n) || 0);

/** '2026-10-12' -> Date local (sin corrimiento por zona horaria). */
export function aFecha(valor) {
  if (valor instanceof Date) return valor;
  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    const [a, m, d] = valor.split('-').map(Number);
    return new Date(a, m - 1, d);
  }
  return new Date(valor);
}

export function iso(fecha) {
  const f = aFecha(fecha);
  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
}

export const hoyISO = () => iso(new Date());
export const sumarDias = (fecha, n) => {
  const f = aFecha(fecha);
  return new Date(f.getFullYear(), f.getMonth(), f.getDate() + n);
};
export const diasEntre = (a, b) => Math.round((aFecha(b) - aFecha(a)) / 86400000);

// Formato compacto propio: Intl en es-CO intercala "de" ("22 de sept de 2026"), que no cabe en tablas.
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];
const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS_SEMANA = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const fmtSoloHora = new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit' });

/** 22 sept 2026 */
export const fecha = (v) => {
  if (!v) return '—';
  const f = aFecha(v);
  return `${f.getDate()} ${MESES[f.getMonth()]} ${f.getFullYear()}`;
};
/** mar 22 sept */
export const fechaDia = (v) => {
  if (!v) return '—';
  const f = aFecha(v);
  return `${DIAS_SEMANA[f.getDay()]} ${f.getDate()} ${MESES[f.getMonth()]}`;
};
/** 22 sept, 4:30 p. m. */
export const fechaHora = (v) => {
  if (!v) return '—';
  const f = new Date(v);
  return `${f.getDate()} ${MESES[f.getMonth()]}, ${fmtSoloHora.format(f)}`;
};
/** septiembre de 2026 */
export const mesAnio = (v) => {
  const f = aFecha(v);
  return `${MESES_LARGOS[f.getMonth()]} de ${f.getFullYear()}`;
};

export function hace(v) {
  const s = Math.round((Date.now() - new Date(v).getTime()) / 1000);
  if (s < 60) return 'hace un momento';
  if (s < 3600) return `hace ${Math.round(s / 60)} min`;
  if (s < 86400) return `hace ${Math.round(s / 3600)} h`;
  if (s < 86400 * 7) return `hace ${Math.round(s / 86400)} d`;
  return fecha(v);
}

export const plural = (n, uno, varios) => `${numero(n)} ${n === 1 ? uno : varios}`;

export function iniciales(nombre = '') {
  const p = nombre.trim().split(/\s+/);
  return ((p[0]?.[0] || '') + (p[1]?.[0] || '')).toUpperCase() || 'H';
}

export function avatarHTML(u, clase = '') {
  if (u?.fotoPerfilUrl) return `<span class="avatar ${clase}"><img src="${esc(u.fotoPerfilUrl)}" alt=""></span>`;
  return `<span class="avatar ${clase}">${esc(iniciales(u?.nombreCompleto || u?.nombre))}</span>`;
}

export function fotoHTML(url, alt = '') {
  if (!url) return `<div class="foto-vacia">${I.foto}</div>`;
  return `<img src="${esc(url)}" alt="${esc(alt)}" loading="lazy" onerror="this.outerHTML='<div class=&quot;foto-vacia&quot;></div>'">`;
}

export function estrellasHTML(valor, { mostrarNumero = false, total = null } = {}) {
  const v = Number(valor) || 0;
  const llenas = Math.round(v);
  let s = '<span class="estrellas" aria-label="' + v.toFixed(1) + ' de 5">';
  for (let i = 1; i <= 5; i++) s += `<span class="${i <= llenas ? '' : 'vacia'}">${I.estrella}</span>`;
  s += '</span>';
  if (!mostrarNumero) return s;
  const n = total === 0 ? '<span>Sin calificaciones</span>'
    : `<strong>${v.toFixed(1)}</strong>${total !== null ? `<span>(${numero(total)})</span>` : ''}`;
  return `<span class="puntaje">${s}${n}</span>`;
}

// ------------------------------------------------------------------ estados

const ESTADOS = {
  reserva: {
    pendiente_pago: ['aviso', 'Pendiente de pago'],
    confirmada: ['info', 'Confirmada'],
    en_curso: ['ok', 'En curso'],
    finalizada: ['', 'Finalizada'],
    cancelada: ['', 'Cancelada'],
    con_incidencia: ['error', 'Con incidencia'],
  },
  publicacion: {
    pendiente_aprobacion: ['aviso', 'En revisión'],
    aprobado: ['ok', 'Publicada'],
    rechazado: ['error', 'Requiere ajustes'],
    pausado: ['', 'Pausada'],
    retirado: ['', 'Retirada'],
  },
  usuario: {
    activo: ['ok', 'Activo'],
    suspendido: ['aviso', 'Suspendido'],
    desactivado: ['error', 'Desactivado'],
  },
  pago: {
    pendiente: ['aviso', 'Pendiente'],
    aprobado: ['ok', 'Aprobado'],
    rechazado: ['error', 'Rechazado'],
    reembolsado: ['info', 'Reembolsado'],
  },
  moderacion: {
    visible: ['ok', 'Visible'],
    oculta: ['aviso', 'Oculta'],
    eliminada: ['error', 'Eliminada'],
  },
  unidad: {
    disponible: ['ok', 'Operativa'],
    en_mantenimiento: ['aviso', 'En mantenimiento'],
    retirada: ['', 'Retirada'],
  },
  equipo: {
    sin_novedad: ['ok', 'Sin novedad'],
    con_dano: ['aviso', 'Con daño'],
    perdida: ['error', 'Pérdida'],
  },
};

export const textoEstado = (tipo, valor) => ESTADOS[tipo]?.[valor]?.[1] || valor;

export function etiqueta(tipo, valor) {
  const [clase, texto] = ESTADOS[tipo]?.[valor] || ['', valor];
  return `<span class="etiqueta ${clase}">${esc(texto)}</span>`;
}

export const ROLES = { superadmin: 'Superadministrador', administrador: 'Administrador', usuario_final: 'Usuario' };
export const FISICO = { nuevo: 'Nuevo', usado: 'Usado', en_mantenimiento: 'En mantenimiento' };
export const METODOS = { tarjeta_simulada: 'Tarjeta', pse_simulado: 'PSE', nequi_simulado: 'Nequi' };

export function etiquetaDisponibilidad(p) {
  if (p.estadoFisico === 'en_mantenimiento') {
    return '<span class="etiqueta mantenimiento sin-punto"><span>En mantenimiento</span></span>';
  }
  if (p.disponibleHoy) {
    return `<span class="etiqueta ok">${p.unidadesLibresHoy > 1 ? `${p.unidadesLibresHoy} libres hoy` : 'Libre hoy'}</span>`;
  }
  return '<span class="etiqueta aviso">Ocupada hoy</span>';
}

// ------------------------------------------------------------------ toasts

function pilaToasts() {
  let pila = $('.pila-toasts');
  if (!pila) {
    pila = document.createElement('div');
    pila.className = 'pila-toasts';
    pila.setAttribute('role', 'status');
    pila.setAttribute('aria-live', 'polite');
    document.body.appendChild(pila);
  }
  return pila;
}

export function toast(mensaje, tipo = 'info', ms = 4200) {
  const el = document.createElement('div');
  el.className = `toast ${tipo}`;
  const icono = tipo === 'ok' ? I.checkCirculo : tipo === 'error' ? I.alerta : I.info;
  el.innerHTML = `${icono}<div>${esc(mensaje)}</div>`;
  pilaToasts().appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity .25s, transform .25s';
    el.style.opacity = '0';
    el.style.transform = 'translateY(6px)';
    setTimeout(() => el.remove(), 260);
  }, ms);
}

export const toastError = (e) => toast(e?.message || 'Algo salió mal. Intenta de nuevo.', 'error', 6000);

// ------------------------------------------------------------------ modales

export function modal({ titulo, subtitulo = '', cuerpo = '', acciones = [], ancho = '', alCerrar } = {}) {
  const velo = document.createElement('div');
  velo.className = 'velo';
  velo.innerHTML = `
    <div class="modal ${ancho}" role="dialog" aria-modal="true" aria-labelledby="modal-titulo">
      <div class="modal-cabecera">
        <div><h3 id="modal-titulo">${esc(titulo)}</h3>${subtitulo ? `<p>${subtitulo}</p>` : ''}</div>
        <button class="icono-btn cerrar" type="button" aria-label="Cerrar">${I.cerrar}</button>
      </div>
      <div class="modal-cuerpo"></div>
      ${acciones.length ? '<div class="modal-pie"></div>' : ''}
    </div>`;
  const contenedorCuerpo = $('.modal-cuerpo', velo);
  if (typeof cuerpo === 'string') contenedorCuerpo.innerHTML = cuerpo;
  else if (cuerpo) contenedorCuerpo.appendChild(cuerpo);

  const previoFoco = document.activeElement;
  const cerrar = () => {
    velo.remove();
    document.removeEventListener('keydown', teclado);
    document.body.style.overflow = '';
    previoFoco?.focus?.();
    alCerrar?.();
  };
  const teclado = (e) => { if (e.key === 'Escape') cerrar(); };

  const pie = $('.modal-pie', velo);
  acciones.forEach((a) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `btn ${a.clase || 'btn-linea'}`;
    b.textContent = a.texto;
    b.addEventListener('click', async () => {
      if (!a.accion) return cerrar();
      b.classList.add('cargando');
      try {
        const resultado = await a.accion(velo);
        if (resultado !== false) cerrar();
      } catch (err) {
        mostrarErrorEnModal(velo, err);
      } finally {
        b.classList.remove('cargando');
      }
    });
    pie.appendChild(b);
  });

  $('.cerrar', velo).addEventListener('click', cerrar);
  velo.addEventListener('mousedown', (e) => { if (e.target === velo) cerrar(); });
  document.addEventListener('keydown', teclado);
  document.body.appendChild(velo);
  document.body.style.overflow = 'hidden';
  setTimeout(() => ($('input, select, textarea', contenedorCuerpo) || $('.modal-pie .btn:last-child', velo))?.focus(), 30);
  return { el: velo, cuerpo: contenedorCuerpo, cerrar };
}

export function mostrarErrorEnModal(velo, err) {
  const form = $('form', velo);
  if (form && err?.campos && Object.keys(err.campos).length) {
    errorEnFormulario(form, err);
    return;
  }
  let caja = $('.modal-error', velo);
  if (!caja) {
    caja = document.createElement('div');
    caja.className = 'alerta alerta-error modal-error mb-16';
    $('.modal-cuerpo', velo).prepend(caja);
  }
  caja.innerHTML = `${I.alerta}<div>${esc(err?.message || 'No se pudo completar la acción.')}</div>`;
}

/**
 * Confirmación con motivo opcional. Resuelve con el motivo (string), true, o null si se cancela.
 */
export function confirmar({ titulo, mensaje = '', textoOk = 'Confirmar', peligro = false, motivo = false,
  motivoObligatorio = false, etiquetaMotivo = 'Motivo', placeholder = '', accion } = {}) {
  return new Promise((resolver) => {
    let resuelto = false;
    const cuerpo = `
      ${mensaje ? `<p class="mb-16" style="color:var(--texto-2)">${mensaje}</p>` : ''}
      ${motivo ? `<form class="form-pila" onsubmit="return false">
        <div class="campo"><label for="c-motivo">${esc(etiquetaMotivo)}${motivoObligatorio ? '' : ' <span class="opcional">(opcional)</span>'}</label>
        <textarea id="c-motivo" name="motivo" maxlength="500" placeholder="${esc(placeholder)}"></textarea>
        <span class="msg-error"></span></div></form>` : ''}`;
    modal({
      titulo,
      cuerpo,
      alCerrar: () => { if (!resuelto) resolver(null); },
      acciones: [
        { texto: 'Cancelar', clase: 'btn-fantasma' },
        {
          texto: textoOk,
          clase: peligro ? 'btn-peligro' : 'btn-oscuro',
          accion: async (velo) => {
            const texto = motivo ? $('#c-motivo', velo).value.trim() : true;
            if (motivo && motivoObligatorio && texto.length < 5) {
              const campo = $('#c-motivo', velo).closest('.campo');
              campo.classList.add('con-error');
              $('.msg-error', campo).textContent = 'Escribe un motivo de al menos 5 caracteres.';
              return false;
            }
            if (accion) await accion(texto);
            resuelto = true;
            resolver(texto);
            return true;
          },
        },
      ],
    });
  });
}

// ------------------------------------------------------------------ formularios

export function datosFormulario(form) {
  const datos = {};
  new FormData(form).forEach((v, k) => {
    const valor = typeof v === 'string' ? v.trim() : v;
    if (k in datos) datos[k] = [].concat(datos[k], valor);
    else datos[k] = valor;
  });
  $$('input[type=checkbox][name]', form).forEach((c) => {
    if (!c.value || c.value === 'on') datos[c.name] = c.checked;
  });
  return datos;
}

export function limpiarErrores(form) {
  $$('.con-error', form).forEach((c) => c.classList.remove('con-error'));
  $('.alerta-form', form)?.remove();
}

export function errorEnFormulario(form, err) {
  limpiarErrores(form);
  const campos = err?.campos || {};
  let primero = null;
  Object.entries(campos).forEach(([nombre, msg]) => {
    const input = form.querySelector(`[name="${nombre}"]`);
    const campo = input?.closest('.campo');
    if (campo) {
      campo.classList.add('con-error');
      let span = $('.msg-error', campo);
      if (!span) {
        span = document.createElement('span');
        span.className = 'msg-error';
        campo.appendChild(span);
      }
      span.textContent = msg;
      primero ||= input;
    }
  });
  const sinCampo = Object.keys(campos).filter((c) => !form.querySelector(`[name="${c}"]`));
  if (!primero || sinCampo.length) {
    const alerta = document.createElement('div');
    alerta.className = 'alerta alerta-error alerta-form';
    const texto = sinCampo.length ? sinCampo.map((c) => campos[c]).join(' · ') : err?.message;
    alerta.innerHTML = `${I.alerta}<div>${esc(texto || 'Revisa los datos e intenta de nuevo.')}</div>`;
    form.prepend(alerta);
    alerta.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  primero?.focus();
}

/** Ejecuta fn mostrando spinner en el botón; captura y muestra errores en el formulario. */
export async function enviarFormulario(form, boton, fn) {
  limpiarErrores(form);
  boton?.classList.add('cargando');
  try {
    return await fn();
  } catch (err) {
    errorEnFormulario(form, err);
    return undefined;
  } finally {
    boton?.classList.remove('cargando');
  }
}

export function alternarContrasena(raiz = document) {
  $$('.campo-contrasena', raiz).forEach((c) => {
    const input = $('input', c);
    const b = $('button', c);
    if (!b || b.dataset.listo) return;
    b.dataset.listo = '1';
    b.innerHTML = I.ojo;
    b.setAttribute('aria-label', 'Mostrar contraseña');
    b.addEventListener('click', () => {
      const ver = input.type === 'password';
      input.type = ver ? 'text' : 'password';
      b.innerHTML = ver ? I.ojoNo : I.ojo;
      b.setAttribute('aria-label', ver ? 'Ocultar contraseña' : 'Mostrar contraseña');
    });
  });
}

// ------------------------------------------------------------------ bloques

export const cargandoHTML = (texto = 'Cargando…') => `<div class="estado-carga"><div class="giro"></div><span>${esc(texto)}</span></div>`;

export function vacioHTML({ icono = I.caja, titulo, texto = '', accion = '' }) {
  return `<div class="vacio">${icono}<h3>${esc(titulo)}</h3>${texto ? `<p>${texto}</p>` : ''}${accion}</div>`;
}

export function errorHTML(err, reintentar = true) {
  return vacioHTML({
    icono: I.alerta,
    titulo: err?.status === 0 ? 'Sin conexión con el servidor' : 'No pudimos cargar esta sección',
    texto: esc(err?.message || ''),
    accion: reintentar ? '<button class="btn btn-linea" onclick="location.reload()">Reintentar</button>' : '',
  });
}

export function paginacionHTML(pagina, totalPaginas) {
  if (!totalPaginas || totalPaginas <= 1) return '';
  const botones = [];
  const rango = new Set([0, totalPaginas - 1, pagina - 1, pagina, pagina + 1].filter((p) => p >= 0 && p < totalPaginas));
  const orden = [...rango].sort((a, b) => a - b);
  let previo = -1;
  orden.forEach((p) => {
    if (p - previo > 1) botones.push('<span class="tenue">…</span>');
    botones.push(`<button data-pagina="${p}" class="${p === pagina ? 'activo' : ''}" aria-label="Página ${p + 1}">${p + 1}</button>`);
    previo = p;
  });
  return `<nav class="paginacion" aria-label="Paginación">
    <button data-pagina="${pagina - 1}" ${pagina === 0 ? 'disabled' : ''} aria-label="Anterior">${I.izq}</button>
    ${botones.join('')}
    <button data-pagina="${pagina + 1}" ${pagina >= totalPaginas - 1 ? 'disabled' : ''} aria-label="Siguiente">${I.der}</button>
  </nav>`;
}

export function enlazarPaginacion(contenedor, alCambiar) {
  $$('.paginacion button[data-pagina]', contenedor).forEach((b) => {
    b.addEventListener('click', () => alCambiar(Number(b.dataset.pagina)));
  });
}

export function debounce(fn, ms = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export function descargar(nombre, contenido, tipo = 'application/json') {
  const blob = new Blob([contenido], { type: `${tipo};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: nombre });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function selectorEstrellas(contenedor, inicial = 0, alCambiar) {
  let valor = inicial;
  const textos = ['', 'Mala', 'Regular', 'Buena', 'Muy buena', 'Excelente'];
  contenedor.innerHTML = `<div class="selector-estrellas" role="radiogroup" aria-label="Calificación">
    ${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-v="${n}" role="radio" aria-label="${n} estrellas">${I.estrella}</button>`).join('')}
  </div> <span class="tenue texto-pequeno" data-texto></span>`;
  const pintar = (v) => {
    $$('button', contenedor).forEach((b) => b.classList.toggle('on', Number(b.dataset.v) <= v));
    $('[data-texto]', contenedor).textContent = textos[v] || 'Elige de 1 a 5';
  };
  $$('button', contenedor).forEach((b) => {
    b.addEventListener('mouseenter', () => pintar(Number(b.dataset.v)));
    b.addEventListener('mouseleave', () => pintar(valor));
    b.addEventListener('click', () => {
      valor = Number(b.dataset.v);
      pintar(valor);
      alCambiar?.(valor);
    });
  });
  pintar(valor);
  return () => valor;
}
