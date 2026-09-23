import { get, post } from '../core/api.js';
import { CLAVE_DEMO, CUENTAS_DEMO } from '../config.js';
import { I } from '../core/iconos.js';
import { montarLayout } from '../core/layout.js';
import { sesion } from '../core/sesion.js';
import {
  $, alternarContrasena, datosFormulario, enviarFormulario, errorEnFormulario, esc, modal, toast,
} from '../core/ui.js';

montarLayout({});
alternarContrasena();

const pagina = document.body.dataset.pagina;
const params = new URLSearchParams(location.search);

/** Solo se permite volver a rutas internas (evita redirecciones abiertas). */
function destinoSeguro() {
  const next = params.get('next');
  if (next && /^[a-z0-9_-]+\.html([?#].*)?$/i.test(next)) return next;
  return null;
}

function irTrasLogin(usuario) {
  const next = destinoSeguro();
  if (next) location.href = next;
  else if (['superadmin', 'administrador'].includes(usuario.rol)) location.href = 'admin.html';
  else location.href = 'cuenta.html';
}

function fuerza(clave) {
  let n = 0;
  if (clave.length >= 8) n++;
  if (/[a-z]/i.test(clave) && /\d/.test(clave)) n++;
  if (/[A-Z]/.test(clave) && /[a-z]/.test(clave)) n++;
  if (/[^A-Za-z0-9]/.test(clave) || clave.length >= 12) n++;
  return clave ? Math.max(n, 1) : 0;
}

function medidor(input) {
  const m = $('#medidor');
  const texto = $('#texto-medidor');
  const etiquetas = ['Usa al menos 8 caracteres combinando letras y números.', 'Débil', 'Aceptable', 'Buena', 'Fuerte'];
  input.addEventListener('input', () => {
    const n = fuerza(input.value);
    m.className = `medidor n${n}`;
    if (texto) texto.textContent = etiquetas[n];
  });
}

function validarCorreo(form) {
  const correo = form.elements.correo.value.trim();
  if (!correo) return 'Escribe tu correo.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) return 'El correo no tiene un formato válido (ej. nombre@correo.com).';
  return null;
}

// ------------------------------------------------------------------ login

function iniciarLogin() {
  if (sesion.activa() && !params.get('expirada')) {
    irTrasLogin(sesion.usuario());
    return;
  }
  const form = $('#form-login');
  if (params.get('expirada')) {
    $('#aviso').innerHTML = `<div class="alerta alerta-info mb-16">${I.reloj}<div>Tu sesión expiró. Entra de nuevo para continuar donde ibas.</div></div>`;
  } else if (params.get('registro')) {
    $('#aviso').innerHTML = `<div class="alerta alerta-ok mb-16">${I.checkCirculo}<div>Cuenta creada. Ya puedes iniciar sesión.</div></div>`;
    form.elements.correo.value = params.get('correo') || '';
  } else if (params.get('restablecida')) {
    $('#aviso').innerHTML = `<div class="alerta alerta-ok mb-16">${I.checkCirculo}<div>Contraseña actualizada. Entra con la nueva.</div></div>`;
  } else if (destinoSeguro()?.startsWith('checkout')) {
    $('#aviso').innerHTML = `<div class="alerta alerta-info mb-16">${I.info}<div>Inicia sesión para confirmar tu reserva. Tus fechas quedan guardadas.</div></div>`;
  }
  if (destinoSeguro()) $('#enlace-registro').href = `signup.html?next=${encodeURIComponent(destinoSeguro())}`;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorCorreo = validarCorreo(form);
    if (errorCorreo || !form.elements.password.value) {
      errorEnFormulario(form, {
        campos: {
          ...(errorCorreo ? { correo: errorCorreo } : {}),
          ...(!form.elements.password.value ? { password: 'Escribe tu contraseña.' } : {}),
        },
      });
      return;
    }
    await enviarFormulario(form, $('button[type=submit]', form), async () => {
      const r = await post('/auth/login', datosFormulario(form));
      sesion.iniciar(r);
      toast(`Hola, ${r.nombreCompleto.split(' ')[0]}`, 'ok');
      irTrasLogin(r.usuario);
    });
  });

  // Atajo de demostración: solo en entorno local.
  if (['localhost', '127.0.0.1'].includes(location.hostname)) {
    $('#demo').innerHTML = `
      <details class="cuentas-demo">
        <summary>Cuentas de demostración</summary>
        <p class="texto-pequeno tenue" style="margin:8px 0">Contraseña de todas: <span class="mono">${CLAVE_DEMO}</span></p>
        ${CUENTAS_DEMO.map((c) => `<button type="button" data-correo="${c.correo}"><span>${c.correo}</span><span>${c.rol}</span></button>`).join('')}
      </details>`;
    $('#demo').querySelectorAll('[data-correo]').forEach((b) => b.addEventListener('click', () => {
      form.elements.correo.value = b.dataset.correo;
      form.elements.password.value = CLAVE_DEMO;
      form.requestSubmit();
    }));
  }
}

// ------------------------------------------------------------------ registro

function iniciarRegistro() {
  if (sesion.activa()) {
    location.href = 'cuenta.html';
    return;
  }
  const form = $('#form-registro');
  medidor(form.elements.password);
  if (destinoSeguro()) $('#enlace-login').href = `login.html?next=${encodeURIComponent(destinoSeguro())}`;

  $('#ver-politica').addEventListener('click', async () => {
    let texto = 'Cargando…';
    try {
      texto = (await get('/parametros/publicos'))['legal.politica_datos'];
    } catch {
      texto = 'No pudimos cargar la política en este momento. Puedes leerla en legal.html?doc=datos.';
    }
    modal({
      titulo: 'Política de Tratamiento de Datos Personales',
      subtitulo: 'Ley 1581 de 2012 · Habeas Data',
      cuerpo: `<div class="legal"><p>${esc(texto)}</p></div>`,
      acciones: [{
        texto: 'Acepto', clase: 'btn-oscuro', accion: () => { form.elements.aceptaPolitica.checked = true; },
      }],
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = datosFormulario(form);
    const campos = {};
    if (d.nombreCompleto.length < 3) campos.nombreCompleto = 'Escribe tu nombre completo.';
    const errorCorreo = validarCorreo(form);
    if (errorCorreo) campos.correo = errorCorreo;
    if (d.password.length < 8) campos.password = 'La contraseña debe tener al menos 8 caracteres.';
    else if (!/[a-z]/i.test(d.password) || !/\d/.test(d.password)) campos.password = 'Combina letras y números.';
    if (!d.aceptaPolitica) campos.aceptaPolitica = 'Debes autorizar el tratamiento de datos para crear la cuenta.';
    if (Object.keys(campos).length) {
      errorEnFormulario(form, { campos });
      return;
    }
    await enviarFormulario(form, $('button[type=submit]', form), async () => {
      await post('/auth/registro', d);
      // Inicia sesión de inmediato para no pedir la contraseña dos veces.
      const r = await post('/auth/login', { correo: d.correo, password: d.password });
      sesion.iniciar(r);
      toast('¡Bienvenido a Hawkify!', 'ok');
      location.href = destinoSeguro() || 'catalogo.html';
    });
  });
}

// ------------------------------------------------------------------ recuperar

function iniciarRecuperar() {
  const form = $('#form-recuperar');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorCorreo = validarCorreo(form);
    if (errorCorreo) {
      errorEnFormulario(form, { campos: { correo: errorCorreo } });
      return;
    }
    await enviarFormulario(form, $('button[type=submit]', form), async () => {
      const r = await post('/auth/recuperar', { correo: form.elements.correo.value.trim() });
      $('#caja-recuperar').innerHTML = `
        <h1>Revisa tu correo</h1>
        <p class="sub">${esc(r.mensaje)}</p>
        ${r.enlaceDemo ? `<div class="alerta alerta-aviso mb-16">${I.info}<div><strong>Modo demostración:</strong> no hay servidor de correo configurado. Este es el enlace que se habría enviado:<br><a class="enlace" href="${esc(r.enlaceDemo)}" style="word-break:break-all">Abrir enlace de restablecimiento</a></div></div>` : ''}
        <a class="btn btn-oscuro btn-bloque" href="login.html">Volver a iniciar sesión</a>`;
    });
  });
}

// ------------------------------------------------------------------ restablecer

function iniciarRestablecer() {
  const token = params.get('token');
  if (!token) {
    $('#caja-restablecer').innerHTML = `
      <h1>Enlace incompleto</h1>
      <p class="sub">Abre el enlace completo que te enviamos por correo o solicita uno nuevo.</p>
      <a class="btn btn-oscuro btn-bloque" href="recuperar.html">Solicitar un enlace</a>`;
    return;
  }
  const form = $('#form-restablecer');
  medidor(form.elements.password);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = datosFormulario(form);
    const campos = {};
    if (d.password.length < 8 || !/[a-z]/i.test(d.password) || !/\d/.test(d.password)) {
      campos.password = 'Mínimo 8 caracteres combinando letras y números.';
    }
    if (d.password !== d.confirmar) campos.confirmar = 'Las contraseñas no coinciden.';
    if (Object.keys(campos).length) {
      errorEnFormulario(form, { campos });
      return;
    }
    await enviarFormulario(form, $('button[type=submit]', form), async () => {
      await post('/auth/restablecer', { token, password: d.password });
      sesion.cerrar();
      location.href = 'login.html?restablecida=1';
    });
  });
}

({ login: iniciarLogin, registro: iniciarRegistro, recuperar: iniciarRecuperar, restablecer: iniciarRestablecer })[pagina]?.();
