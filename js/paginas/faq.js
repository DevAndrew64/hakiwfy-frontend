import { get } from '../core/api.js';
import { I } from '../core/iconos.js';
import { montarLayout } from '../core/layout.js';
import { $$ } from '../core/ui.js';

montarLayout({ activo: 'ayuda' });

$$('#faq .item').forEach((item, i) => {
  const boton = item.querySelector('.pregunta');
  boton.insertAdjacentHTML('beforeend', I.mas);
  boton.setAttribute('aria-expanded', 'false');
  boton.addEventListener('click', () => {
    const abierto = item.classList.toggle('abierto');
    boton.setAttribute('aria-expanded', String(abierto));
  });
  if (i === 0) boton.click();
});

// Las respuestas sobre políticas usan el texto vigente configurado por el superadmin.
get('/parametros/publicos').then((p) => {
  $$('[data-param]').forEach((el) => {
    if (p[el.dataset.param]) el.textContent = p[el.dataset.param];
  });
}).catch(() => {});
