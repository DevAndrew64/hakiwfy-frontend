import { get } from '../core/api.js';
import { enlazarDeseos, esqueletoFichas, fichaHTML } from '../core/componentes.js';
import { iconoCategoria } from '../core/iconos.js';
import { montarLayout } from '../core/layout.js';
import { $, cop, errorHTML, esc, hoyISO, iso, numero, plural, sumarDias } from '../core/ui.js';

montarLayout({ activo: 'inicio' });

const PRECIO_COMPRA = 1450000;

async function cargarFilas() {
  $('#destacadas').innerHTML = esqueletoFichas(4);
  $('#recientes').innerHTML = esqueletoFichas(4);
  try {
    const [top, nuevas] = await Promise.all([
      get('/productos', { orden: 'calificacion', tamano: 4 }),
      get('/productos', { orden: 'recientes', tamano: 4 }),
    ]);
    $('#destacadas').innerHTML = top.contenido.map(fichaHTML).join('');
    $('#recientes').innerHTML = nuevas.contenido.map(fichaHTML).join('');
    enlazarDeseos(document);
    pintarHeroFicha(top.contenido[0]);
    configurarComparador(top.contenido.concat(nuevas.contenido));
    $('#hero-cifras').innerHTML += `<div><strong>${numero(top.totalElementos)}</strong><span>herramientas publicadas</span></div>`;
  } catch (e) {
    $('#destacadas').outerHTML = errorHTML(e);
    $('#recientes').closest('section').remove();
  }
}

async function cargarCategorias() {
  try {
    const categorias = await get('/categorias');
    $('#categorias').innerHTML = categorias.map((c) => `
      <a class="categoria-tile" href="catalogo.html?categoriaId=${c.id}">
        ${iconoCategoria(c.nombre)}
        <div>
          <h3>${esc(c.nombre)}</h3>
          <span class="conteo">${c.productos ? plural(c.productos, 'herramienta', 'herramientas') : 'Próximamente'}</span>
        </div>
      </a>`).join('');
    $('#hero-cifras').innerHTML = `<div><strong>${categorias.length}</strong><span>categorías de trabajo</span></div>` + $('#hero-cifras').innerHTML;
  } catch {
    $('#categorias').closest('section').remove();
  }
}

function pintarHeroFicha(p) {
  if (!p) return;
  const ficha = document.createElement('a');
  ficha.className = 'hero-ficha';
  ficha.href = `producto.html?id=${p.id}`;
  ficha.style.textDecoration = 'none';
  ficha.innerHTML = `
    <span class="mono">${esc(p.codigo)} · ${esc(p.categoria.nombre.toUpperCase())}</span>
    <strong>${esc(p.nombre)}</strong>
    <div class="fila"><span>Tarifa</span><b>${cop(p.tarifaDia)} / día</b></div>
    <div class="fila"><span>Calificación</span><b>${Number(p.calificacionPromedio).toFixed(1)} ★ (${p.totalCalificaciones})</b></div>
    <div class="fila"><span>Hoy</span><b>${p.disponibleHoy ? `${p.unidadesLibresHoy} libre${p.unidadesLibresHoy > 1 ? 's' : ''}` : 'Ocupada'}</b></div>`;
  $('#hero-visual').appendChild(ficha);
  if (p.imagen) $('.hero-foto img').src = p.imagen;
}

function configurarComparador(productos) {
  const roto = productos.find((p) => /rotomartillo/i.test(p.nombre));
  const tarifa = roto ? Number(roto.tarifaDia) : 42000;
  const rango = $('#dias-uso');
  const pintar = () => {
    const dias = Number(rango.value);
    const total = tarifa * dias;
    $('#dias-uso-valor').textContent = dias;
    $('#cifra-alquiler').textContent = cop(total);
    $('#texto-ahorro').textContent = total < PRECIO_COMPRA
      ? `Ahorras ${cop(PRECIO_COMPRA - total)} frente a comprarlo`
      : 'A partir de aquí, comprar empieza a tener sentido';
  };
  rango.addEventListener('input', pintar);
  pintar();
}

function configurarBuscador() {
  const form = $('#buscador-hero');
  const desde = form.elements.desde;
  const hasta = form.elements.hasta;
  desde.min = hoyISO();
  hasta.min = hoyISO();
  desde.addEventListener('change', () => {
    hasta.min = desde.value || hoyISO();
    if (!hasta.value || hasta.value < desde.value) hasta.value = iso(sumarDias(desde.value, 1));
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const p = new URLSearchParams();
    if (form.elements.q.value.trim()) p.set('q', form.elements.q.value.trim());
    if (desde.value) p.set('desde', desde.value);
    if (hasta.value) p.set('hasta', hasta.value || desde.value);
    location.href = `catalogo.html${p.toString() ? `?${p}` : ''}`;
  });
}

configurarBuscador();
cargarCategorias();
cargarFilas();
