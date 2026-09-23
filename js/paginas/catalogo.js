import { get } from '../core/api.js';
import { enlazarDeseos, esqueletoFichas, fichaHTML } from '../core/componentes.js';
import { I } from '../core/iconos.js';
import { montarLayout } from '../core/layout.js';
import {
  $, $$, cop, debounce, enlazarPaginacion, errorHTML, esc, estrellasHTML, fecha, hoyISO, iso, numero,
  paginacionHTML, sumarDias, vacioHTML,
} from '../core/ui.js';

montarLayout({ activo: 'catalogo' });

const filtros = $('#filtros');
const estado = leerURL();
let categorias = [];
let marcas = [];
let peticion = 0;

function leerURL() {
  const p = new URLSearchParams(location.search);
  return {
    q: p.get('q') || '',
    categoriaId: p.get('categoriaId') || '',
    marcaId: p.getAll('marcaId'),
    precioMin: p.get('precioMin') || '',
    precioMax: p.get('precioMax') || '',
    calificacionMin: p.get('calificacionMin') || '',
    desde: p.get('desde') || '',
    hasta: p.get('hasta') || '',
    soloDisponibles: p.get('soloDisponibles') === 'true',
    orden: p.get('orden') || 'relevancia',
    pagina: Number(p.get('pagina') || 0),
  };
}

function escribirURL() {
  const p = new URLSearchParams();
  Object.entries(estado).forEach(([k, v]) => {
    if (k === 'pagina' && !v) return;
    if (k === 'orden' && v === 'relevancia') return;
    if (Array.isArray(v)) v.forEach((x) => p.append(k, x));
    else if (v !== '' && v !== false && v !== null) p.set(k, v);
  });
  history.replaceState(null, '', `catalogo.html${p.toString() ? `?${p}` : ''}`);
}

function sincronizarControles() {
  $('[name=q]', filtros).value = estado.q;
  $('[name=desde]', filtros).value = estado.desde;
  $('[name=hasta]', filtros).value = estado.hasta;
  $('[name=soloDisponibles]', filtros).checked = estado.soloDisponibles;
  $('[name=precioMin]', filtros).value = estado.precioMin;
  $('[name=precioMax]', filtros).value = estado.precioMax;
  $('#orden').value = estado.orden;
  $$('[name=categoria]', filtros).forEach((r) => { r.checked = r.value === estado.categoriaId; });
  $$('[name=marca]', filtros).forEach((c) => { c.checked = estado.marcaId.includes(c.value); });
  $$('[name=calificacion]', filtros).forEach((r) => { r.checked = r.value === estado.calificacionMin; });
}

function pintarOpciones() {
  const total = categorias.reduce((s, c) => s + c.productos, 0);
  $('#f-categorias').innerHTML = `
    <label class="opcion-filtro"><input type="radio" name="categoria" value=""> Todas <span class="n">${total}</span></label>
    ${categorias.map((c) => `
      <label class="opcion-filtro"><input type="radio" name="categoria" value="${c.id}"> ${esc(c.nombre)} <span class="n">${c.productos}</span></label>`).join('')}`;
  $('#f-marcas').innerHTML = marcas.map((m) => `
    <label class="opcion-filtro"><input type="checkbox" name="marca" value="${m.id}"> ${esc(m.nombre)}</label>`).join('');
  $('#f-estrellas').innerHTML = [['', 'Cualquiera'], ['4', '4 o más'], ['3', '3 o más'], ['2', '2 o más']].map(([v, t]) => `
    <label class="opcion-filtro"><input type="radio" name="calificacion" value="${v}"> ${v ? estrellasHTML(Number(v)) : ''} ${t}</label>`).join('');
  sincronizarControles();

  $$('[name=categoria]', filtros).forEach((r) => r.addEventListener('change', () => cambiar({ categoriaId: r.value })));
  $$('[name=calificacion]', filtros).forEach((r) => r.addEventListener('change', () => cambiar({ calificacionMin: r.value })));
  $$('[name=marca]', filtros).forEach((c) => c.addEventListener('change', () => {
    cambiar({ marcaId: $$('[name=marca]:checked', filtros).map((x) => x.value) });
  }));
}

function cambiar(parcial) {
  Object.assign(estado, parcial, { pagina: parcial.pagina ?? 0 });
  escribirURL();
  sincronizarControles();
  buscar();
}

function chipsHTML() {
  const chips = [];
  const cat = categorias.find((c) => c.id === estado.categoriaId);
  if (estado.q) chips.push(['q', `“${estado.q}”`]);
  if (cat) chips.push(['categoriaId', cat.nombre]);
  estado.marcaId.forEach((id) => {
    const m = marcas.find((x) => x.id === id);
    if (m) chips.push([`marca:${id}`, m.nombre]);
  });
  if (estado.desde) chips.push(['fechas', `${fecha(estado.desde)} → ${fecha(estado.hasta || estado.desde)}`]);
  if (estado.soloDisponibles) chips.push(['soloDisponibles', 'Libres hoy']);
  if (estado.precioMin) chips.push(['precioMin', `Desde ${cop(estado.precioMin)}`]);
  if (estado.precioMax) chips.push(['precioMax', `Hasta ${cop(estado.precioMax)}`]);
  if (estado.calificacionMin) chips.push(['calificacionMin', `${estado.calificacionMin}★ o más`]);
  return chips.map(([k, t]) => `<button class="chip" type="button" data-quitar="${esc(k)}">${esc(t)} ${I.cerrar}</button>`).join('');
}

function quitarFiltro(clave) {
  if (clave.startsWith('marca:')) return cambiar({ marcaId: estado.marcaId.filter((m) => m !== clave.slice(6)) });
  if (clave === 'fechas') return cambiar({ desde: '', hasta: '' });
  if (clave === 'soloDisponibles') return cambiar({ soloDisponibles: false });
  return cambiar({ [clave]: '' });
}

async function buscar() {
  const id = ++peticion;
  const resultados = $('#resultados');
  resultados.innerHTML = esqueletoFichas(6);
  $('#paginacion').innerHTML = '';
  $('#chips').innerHTML = chipsHTML();
  $$('[data-quitar]').forEach((b) => b.addEventListener('click', () => quitarFiltro(b.dataset.quitar)));

  const cat = categorias.find((c) => c.id === estado.categoriaId);
  $('#titulo-catalogo').textContent = cat ? cat.nombre : estado.q ? `Resultados para “${estado.q}”` : 'Catálogo de herramientas';

  try {
    const r = await get('/productos', {
      q: estado.q,
      categoriaId: estado.categoriaId,
      marcaId: estado.marcaId,
      precioMin: estado.precioMin,
      precioMax: estado.precioMax,
      calificacionMin: estado.calificacionMin,
      desde: estado.desde,
      hasta: estado.hasta || estado.desde,
      soloDisponibles: estado.soloDisponibles,
      orden: estado.orden,
      pagina: estado.pagina,
      tamano: 12,
    });
    if (id !== peticion) return;

    $('#conteo').innerHTML = r.totalElementos
      ? `<strong>${numero(r.totalElementos)}</strong> ${r.totalElementos === 1 ? 'herramienta' : 'herramientas'}${estado.desde ? ' con unidad libre en tus fechas' : ''}`
      : '';

    if (!r.contenido.length) {
      resultados.innerHTML = `<div style="grid-column:1/-1">${vacioHTML({
        icono: I.buscar,
        titulo: 'No encontramos herramientas con esos filtros',
        texto: estado.desde
          ? 'Puede que todas las unidades estén reservadas en esas fechas. Prueba moviendo el rango o quitando algún filtro.'
          : 'Prueba con otra palabra, amplía el rango de tarifa o quita algún filtro.',
        accion: '<button class="btn btn-oscuro" type="button" id="vaciar">Limpiar filtros</button>',
      })}</div>`;
      $('#vaciar')?.addEventListener('click', limpiar);
      return;
    }

    resultados.innerHTML = r.contenido.map(fichaHTML).join('');
    if (estado.desde) {
      $$('.ficha h3 a', resultados).forEach((a) => {
        a.href += `&desde=${estado.desde}&hasta=${estado.hasta || estado.desde}`;
      });
    }
    enlazarDeseos(resultados);
    $('#paginacion').innerHTML = paginacionHTML(r.pagina, r.totalPaginas);
    enlazarPaginacion($('#paginacion'), (p) => {
      cambiar({ pagina: p });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  } catch (e) {
    if (id !== peticion) return;
    $('#conteo').textContent = '';
    resultados.innerHTML = `<div style="grid-column:1/-1">${errorHTML(e)}</div>`;
  }
}

function limpiar() {
  cambiar({
    q: '', categoriaId: '', marcaId: [], precioMin: '', precioMax: '', calificacionMin: '',
    desde: '', hasta: '', soloDisponibles: false,
  });
}

function enlazarControles() {
  const q = $('[name=q]', filtros);
  q.addEventListener('input', debounce(() => cambiar({ q: q.value.trim() }), 350));

  const desde = $('[name=desde]', filtros);
  const hasta = $('[name=hasta]', filtros);
  desde.min = hoyISO();
  hasta.min = hoyISO();
  desde.addEventListener('change', () => {
    let h = hasta.value;
    if (!h || h < desde.value) h = desde.value ? iso(sumarDias(desde.value, 1)) : '';
    hasta.min = desde.value || hoyISO();
    cambiar({ desde: desde.value, hasta: h });
  });
  hasta.addEventListener('change', () => {
    if (!desde.value) return cambiar({ desde: hasta.value, hasta: hasta.value });
    return cambiar({ hasta: hasta.value < desde.value ? desde.value : hasta.value });
  });
  $('[name=soloDisponibles]', filtros).addEventListener('change', (e) => cambiar({ soloDisponibles: e.target.checked }));

  const precio = debounce(() => cambiar({
    precioMin: $('[name=precioMin]', filtros).value,
    precioMax: $('[name=precioMax]', filtros).value,
  }), 500);
  $$('.rango-precio input', filtros).forEach((i) => i.addEventListener('input', precio));

  $('#orden').addEventListener('change', (e) => cambiar({ orden: e.target.value }));
  $('#limpiar-filtros').addEventListener('click', limpiar);

  $('#cerrar-filtros').innerHTML = I.cerrar;
  $('#abrir-filtros').innerHTML = `${I.filtro} Filtros`;
  $('#abrir-filtros').addEventListener('click', () => filtros.classList.add('abierto'));
  $('#cerrar-filtros').addEventListener('click', () => filtros.classList.remove('abierto'));
}

async function iniciar() {
  enlazarControles();
  sincronizarControles();
  buscar();
  try {
    [categorias, marcas] = await Promise.all([get('/categorias'), get('/marcas')]);
    pintarOpciones();
    $('#chips').innerHTML = chipsHTML();
    $$('[data-quitar]').forEach((b) => b.addEventListener('click', () => quitarFiltro(b.dataset.quitar)));
    const cat = categorias.find((c) => c.id === estado.categoriaId);
    if (cat) $('#titulo-catalogo').textContent = cat.nombre;
  } catch {
    $('#f-categorias').innerHTML = '<span class="tenue texto-pequeno">No disponible</span>';
  }
}

iniciar();
