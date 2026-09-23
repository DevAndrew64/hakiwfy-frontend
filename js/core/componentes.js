/* Piezas reutilizables entre páginas: ficha de producto y lista de deseos. */
import { del, put } from './api.js';
import { I } from './iconos.js';
import { sesion } from './sesion.js';
import { $$, cop, esc, estrellasHTML, etiquetaDisponibilidad, fotoHTML, toast, toastError } from './ui.js';

export function fichaHTML(p) {
  const deseo = sesion.rol() === 'superadmin' ? '' : `
    <button class="boton-deseo ${p.enListaDeseos ? 'activo' : ''}" type="button" data-deseo="${p.id}"
      aria-pressed="${p.enListaDeseos}" aria-label="${p.enListaDeseos ? 'Quitar de' : 'Agregar a'} mi lista de deseos">${I.corazon}</button>`;
  return `
  <article class="ficha">
    <div class="ficha-foto">
      ${fotoHTML(p.imagen, p.nombre)}
      <span class="ficha-codigo">${esc(p.codigo)}</span>
      ${deseo}
    </div>
    <div class="ficha-cuerpo">
      <div class="ficha-meta">
        <span class="categoria">${esc(p.categoria?.nombre)}${p.marca ? ` · ${esc(p.marca.nombre)}` : ''}</span>
      </div>
      <h3><a href="producto.html?id=${p.id}">${esc(p.nombre)}</a></h3>
      <div class="fila" style="gap:8px">
        ${estrellasHTML(p.calificacionPromedio, { mostrarNumero: true, total: p.totalCalificaciones })}
      </div>
      <div class="ficha-pie">
        <div class="precio-dia">${cop(p.tarifaDia)} <small>/ día</small></div>
        ${etiquetaDisponibilidad(p)}
      </div>
    </div>
  </article>`;
}

export function esqueletoFichas(n = 8) {
  return Array.from({ length: n }, () => `
    <div class="ficha ficha-esqueleto">
      <div class="ficha-foto"></div>
      <div class="ficha-cuerpo">
        <div class="linea-esqueleto esqueleto" style="width:40%"></div>
        <div class="linea-esqueleto esqueleto" style="width:85%;height:16px"></div>
        <div class="linea-esqueleto esqueleto" style="width:55%"></div>
      </div>
    </div>`).join('');
}

/** Corazón de lista de deseos (RF-19). Sin sesión, lleva a login y regresa. */
export function enlazarDeseos(contenedor, alCambiar) {
  $$('[data-deseo]', contenedor).forEach((b) => {
    if (b.dataset.enlazado) return;
    b.dataset.enlazado = '1';
    b.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!sesion.activa()) {
        location.href = `login.html?next=${encodeURIComponent(location.pathname.split('/').pop() + location.search)}`;
        return;
      }
      const id = b.dataset.deseo;
      const activo = b.classList.contains('activo');
      b.classList.toggle('activo', !activo);
      try {
        if (activo) {
          await del(`/lista-deseos/${id}`);
          toast('Quitada de tu lista de deseos');
        } else {
          await put(`/lista-deseos/${id}`);
          toast('Guardada. Te avisaremos si cambia su tarifa o disponibilidad.', 'ok');
        }
        b.setAttribute('aria-pressed', String(!activo));
        alCambiar?.(id, !activo);
      } catch (err) {
        b.classList.toggle('activo', activo);
        toastError(err);
      }
    });
  });
}
