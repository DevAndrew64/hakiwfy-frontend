import { get } from '../core/api.js';
import { montarLayout } from '../core/layout.js';
import { $, cargandoHTML, errorHTML, esc } from '../core/ui.js';

montarLayout({});

const DOCUMENTOS = {
  terminos: { titulo: 'Términos y condiciones', clave: 'legal.terminos' },
  cancelacion: { titulo: 'Política de cancelación', clave: 'cancelacion.politica' },
  datos: { titulo: 'Tratamiento de datos personales', clave: 'legal.politica_datos' },
  garantia: { titulo: 'Garantía por daños', clave: 'garantia.texto_base' },
};

const doc = DOCUMENTOS[new URLSearchParams(location.search).get('doc')] ? new URLSearchParams(location.search).get('doc') : 'terminos';

$('#documentos').innerHTML = Object.entries(DOCUMENTOS)
  .map(([k, v]) => `<a href="legal.html?doc=${k}" style="text-decoration:none"><button type="button" class="${k === doc ? 'activo' : ''}">${v.titulo}</button></a>`)
  .join('');
$('#titulo-legal').textContent = DOCUMENTOS[doc].titulo;
document.title = `${DOCUMENTOS[doc].titulo} · Hawkify`;
$('#texto-legal').innerHTML = cargandoHTML();

get('/parametros/publicos')
  .then((p) => {
    const extra = doc === 'cancelacion'
      ? `\n\nPlazo mínimo para cancelar en línea: ${p['cancelacion.horas_minimas']} horas antes del inicio.\nUna reserva sin pagar se libera automáticamente a los ${p['reserva.minutos_pago']} minutos.`
      : '';
    $('#texto-legal').innerHTML = `<p>${esc(p[DOCUMENTOS[doc].clave] + extra)}</p>
      <p class="texto-pequeno tenue mt-24">Texto vigente configurado por la administración de Hawkify.</p>`;
  })
  .catch((e) => { $('#texto-legal').innerHTML = errorHTML(e); });
