/* Formulario de alta/edición de una herramienta (RF-09 / RF-10), compartido por cuenta y panel admin. */
import { get, post, put, subirImagen } from './api.js';
import { I } from './iconos.js';
import { $, $$, datosFormulario, errorEnFormulario, esc, modal, toast } from './ui.js';

/**
 * @param {object} opciones
 * @param {string|null} opciones.id       producto a editar (null = nuevo)
 * @param {'propio'|'admin'} opciones.modo  define endpoints y textos
 * @param {Function} opciones.alGuardar   callback con la ficha guardada
 */
export async function abrirFormularioProducto({ id = null, modo = 'propio', alGuardar } = {}) {
  let categorias = [];
  let marcas = [];
  let p = null;
  try {
    [categorias, marcas, p] = await Promise.all([
      get('/categorias'),
      get('/marcas'),
      id ? get(`/productos/${id}`) : Promise.resolve(null),
    ]);
  } catch (e) {
    toast(e.message, 'error');
    return;
  }

  let imagenes = p ? p.imagenes.map((i) => i.url) : [];
  const specs = p ? p.especificaciones : [{ clave: '', valor: '' }];

  const cuerpo = document.createElement('div');
  cuerpo.innerHTML = `
    <form class="form-pila" id="form-producto" novalidate>
      ${modo === 'propio' && !id ? `<div class="alerta alerta-info">${I.info}<div>Un administrador revisa cada publicación antes de mostrarla en el catálogo. Te avisamos por notificación cuando quede aprobada o si necesita ajustes.</div></div>` : ''}
      ${p?.estadoPublicacion === 'rechazado' && p.motivoRechazo ? `<div class="alerta alerta-aviso">${I.alerta}<div><strong>Ajustes solicitados:</strong> ${esc(p.motivoRechazo)}<br>Al guardar, la ficha vuelve a revisión.</div></div>` : ''}
      <div class="campo">
        <label for="fp-nombre">Nombre de la herramienta</label>
        <input id="fp-nombre" name="nombre" maxlength="150" placeholder="Ej. Taladro percutor Bosch GSB 18V-50" value="${esc(p?.nombre || '')}">
        <span class="msg-error"></span>
      </div>
      <div class="fila-campos tres">
        <div class="campo">
          <label for="fp-categoria">Categoría</label>
          <select id="fp-categoria" name="categoriaId">
            <option value="">Selecciona…</option>
            ${categorias.map((c) => `<option value="${c.id}" ${p?.categoria?.id === c.id ? 'selected' : ''}>${esc(c.nombre)}</option>`).join('')}
          </select>
          <span class="msg-error"></span>
        </div>
        <div class="campo">
          <label for="fp-marca">Marca <span class="opcional">(opcional)</span></label>
          <input id="fp-marca" name="marca" list="fp-marcas" maxlength="100" value="${esc(p?.marca?.nombre || '')}" placeholder="Bosch, DeWalt…">
          <datalist id="fp-marcas">${marcas.map((m) => `<option value="${esc(m.nombre)}">`).join('')}</datalist>
          <span class="msg-error"></span>
        </div>
        <div class="campo">
          <label for="fp-fisico">Estado físico</label>
          <select id="fp-fisico" name="estadoFisico">
            ${[['nuevo', 'Nuevo'], ['usado', 'Usado, buen estado'], ['en_mantenimiento', 'En mantenimiento']]
              .map(([v, t]) => `<option value="${v}" ${(p?.estadoFisico || 'nuevo') === v ? 'selected' : ''}>${t}</option>`).join('')}
          </select>
          <span class="ayuda">“En mantenimiento” la saca temporalmente de reservas.</span>
        </div>
      </div>
      <div class="fila-campos">
        <div class="campo">
          <label for="fp-tarifa">Tarifa por día (COP)</label>
          <input id="fp-tarifa" name="tarifaDia" type="number" min="1000" step="500" inputmode="numeric" value="${p ? Number(p.tarifaDia) : ''}" placeholder="25000">
          <span class="msg-error"></span>
        </div>
        <div class="campo">
          <label for="fp-unidades">Unidades físicas</label>
          <input id="fp-unidades" name="unidades" type="number" min="1" max="50" value="${p ? Math.max(p.unidadesOperativas, 1) : 1}">
          <span class="ayuda">Cada unidad se reserva por separado. Con 3 unidades, tres personas pueden alquilarla en las mismas fechas.</span>
          <span class="msg-error"></span>
        </div>
      </div>
      <div class="campo">
        <label for="fp-descripcion">Descripción</label>
        <textarea id="fp-descripcion" name="descripcion" maxlength="4000" rows="4" placeholder="Para qué sirve, qué incluye (baterías, maletín, accesorios) y para qué trabajos la recomiendas.">${esc(p?.descripcion || '')}</textarea>
        <span class="msg-error"></span>
      </div>
      <div class="campo">
        <span class="campo-titulo">Fotos <span class="opcional">(la primera es la principal · máx. 8)</span></span>
        <div class="editor-imagenes" id="fp-imagenes"></div>
        <input type="file" id="fp-archivo" accept="image/jpeg,image/png,image/webp" multiple hidden>
      </div>
      <div class="campo">
        <span class="campo-titulo">Ficha técnica <span class="opcional">(potencia, voltaje, peso, accesorios…)</span></span>
        <div id="fp-specs"></div>
        <button type="button" class="btn btn-fantasma btn-sm" id="fp-agregar-spec" style="align-self:flex-start">${I.mas} Agregar especificación</button>
      </div>
      <div class="fila-campos">
        <div class="campo">
          <label for="fp-condiciones">Condiciones de uso <span class="opcional">(opcional)</span></label>
          <textarea id="fp-condiciones" name="condicionesUso" maxlength="4000" rows="3" placeholder="Elementos de protección, materiales permitidos, cómo devolverla.">${esc(p?.condicionesUso || '')}</textarea>
        </div>
        <div class="campo">
          <label for="fp-garantia">Política de garantía por daños <span class="opcional">(opcional)</span></label>
          <textarea id="fp-garantia" name="politicaGarantia" maxlength="4000" rows="3" placeholder="Si la dejas vacía se aplica la política general de Hawkify.">${esc(p && !p.garantiaPorDefecto ? p.politicaGarantia : '')}</textarea>
        </div>
      </div>
    </form>`;

  const pintarImagenes = () => {
    const cont = $('#fp-imagenes', cuerpo);
    cont.innerHTML = imagenes.map((url, i) => `
      <div class="miniatura">
        <img src="${esc(url)}" alt="">
        ${i === 0 ? '<span class="principal">Principal</span>' : `<button type="button" data-principal="${i}" title="Usar como principal" style="left:4px;right:auto;background:rgba(240,168,28,.95);color:#121a2c">${I.estrella}</button>`}
        <button type="button" data-quitar="${i}" aria-label="Quitar foto">${I.cerrar}</button>
      </div>`).join('') + (imagenes.length < 8 ? `<label class="subir-imagen" for="fp-archivo">${I.subir}<span>Subir fotos<br>JPG, PNG o WEBP · 5 MB</span></label>` : '');
    $$('[data-quitar]', cont).forEach((b) => b.addEventListener('click', () => {
      imagenes.splice(Number(b.dataset.quitar), 1);
      pintarImagenes();
    }));
    $$('[data-principal]', cont).forEach((b) => b.addEventListener('click', () => {
      const [img] = imagenes.splice(Number(b.dataset.principal), 1);
      imagenes.unshift(img);
      pintarImagenes();
    }));
  };

  const filaSpec = (s = {}) => {
    const fila = document.createElement('div');
    fila.className = 'fila-spec';
    fila.innerHTML = `
      <input data-spec="clave" maxlength="80" placeholder="Potencia" value="${esc(s.clave || '')}" aria-label="Característica">
      <input data-spec="valor" maxlength="200" placeholder="850 W" value="${esc(s.valor || '')}" aria-label="Valor">
      <button type="button" class="icono-btn" style="color:var(--tenue)" aria-label="Quitar">${I.basura}</button>`;
    $('button', fila).addEventListener('click', () => fila.remove());
    $('#fp-specs', cuerpo).appendChild(fila);
  };

  pintarImagenes();
  specs.forEach(filaSpec);
  $('#fp-agregar-spec', cuerpo).addEventListener('click', () => filaSpec());
  $('#fp-archivo', cuerpo).addEventListener('change', async (e) => {
    const archivos = [...e.target.files].slice(0, 8 - imagenes.length);
    e.target.value = '';
    for (const archivo of archivos) {
      if (archivo.size > 5 * 1024 * 1024) {
        toast(`${archivo.name} supera 5 MB.`, 'error');
        continue;
      }
      try {
        imagenes.push(await subirImagen(archivo));
        pintarImagenes();
      } catch (err) {
        toast(`${archivo.name}: ${err.message}`, 'error');
      }
    }
  });

  const base = modo === 'admin' ? '/admin/productos' : '/mis-productos';
  modal({
    titulo: id ? 'Editar herramienta' : 'Publicar una herramienta',
    subtitulo: id ? `Código ${esc(p.codigo)}` : 'Completa la ficha técnica tal como la verá quien la alquile.',
    ancho: 'muy-ancho',
    cuerpo,
    acciones: [
      { texto: 'Cancelar', clase: 'btn-fantasma' },
      {
        texto: id ? 'Guardar cambios' : modo === 'admin' ? 'Publicar en el catálogo' : 'Enviar a revisión',
        clase: 'btn-oscuro',
        accion: async (velo) => {
          const form = $('#form-producto', velo);
          const d = datosFormulario(form);
          const cuerpoReq = {
            nombre: d.nombre,
            categoriaId: d.categoriaId || null,
            marca: d.marca || null,
            estadoFisico: d.estadoFisico,
            tarifaDia: d.tarifaDia ? Number(d.tarifaDia) : null,
            unidades: d.unidades ? Number(d.unidades) : null,
            descripcion: d.descripcion,
            condicionesUso: d.condicionesUso || null,
            politicaGarantia: d.politicaGarantia || null,
            imagenes,
            especificaciones: $$('.fila-spec', form)
              .map((f) => ({ clave: $('[data-spec=clave]', f).value.trim(), valor: $('[data-spec=valor]', f).value.trim() }))
              .filter((s) => s.clave || s.valor),
          };
          try {
            const r = id ? await put(`${base}/${id}`, cuerpoReq) : await post(base, cuerpoReq);
            toast(id ? 'Cambios guardados' : modo === 'admin' ? 'Herramienta publicada' : 'Enviada a revisión. Te avisamos cuando se apruebe.', 'ok');
            alGuardar?.(r);
            return true;
          } catch (err) {
            errorEnFormulario(form, err);
            return false;
          }
        },
      },
    ],
  });
}
