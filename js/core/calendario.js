/*
 * Selector de rango sobre la disponibilidad real de una herramienta (RF-22).
 * Días sin unidades libres quedan tachados y no se pueden incluir en el rango.
 */
import { get } from './api.js';
import { I } from './iconos.js';
import { $, $$, aFecha, esc, iso, sumarDias, toast } from './ui.js';

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const fmtMes = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' });
const capitalizar = (t) => t.charAt(0).toUpperCase() + t.slice(1);

export class CalendarioRango {
  constructor(contenedor, { productoId, desde = null, hasta = null, maxDias = 30, alCambiar } = {}) {
    this.el = contenedor;
    this.productoId = productoId;
    this.maxDias = maxDias;
    this.alCambiar = alCambiar;
    this.hoy = aFecha(iso(new Date()));
    this.inicio = desde ? aFecha(desde) : null;
    this.fin = hasta ? aFecha(hasta) : null;
    this.hover = null;
    this.mes = new Date((this.inicio || this.hoy).getFullYear(), (this.inicio || this.hoy).getMonth(), 1);
    this.disponibilidad = new Map();
    this.unidades = 0;
    this.reservable = true;
    this.cargados = new Set();
    this.el.classList.add('calendario');
    this.render();
    this.cargar();
  }

  get meses() {
    return this.el.clientWidth > 560 ? 2 : 1;
  }

  async cargar() {
    const desde = this.mes < this.hoy ? this.hoy : this.mes;
    const hastaMes = new Date(this.mes.getFullYear(), this.mes.getMonth() + this.meses, 0);
    const clave = iso(this.mes);
    if (this.cargados.has(clave)) return this.render();
    try {
      const d = await get(`/productos/${this.productoId}/disponibilidad`, { desde: iso(desde), hasta: iso(hastaMes) });
      this.unidades = d.unidadesOperativas;
      this.reservable = d.reservable;
      d.dias.forEach((x) => this.disponibilidad.set(x.fecha, x.disponibles));
      this.cargados.add(clave);
    } catch (e) {
      toast(`No pudimos cargar la disponibilidad: ${e.message}`, 'error');
    }
    this.render();
  }

  libres(fecha) {
    const v = this.disponibilidad.get(iso(fecha));
    return v === undefined ? null : v;
  }

  bloqueado(fecha) {
    if (fecha < this.hoy) return true;
    const v = this.libres(fecha);
    return v !== null && v <= 0;
  }

  rangoValido(a, b) {
    for (let d = a; d <= b; d = sumarDias(d, 1)) {
      if (this.bloqueado(d)) return false;
    }
    return true;
  }

  elegir(fecha) {
    if (this.bloqueado(fecha)) return;
    if (!this.inicio || this.fin) {
      this.inicio = fecha;
      this.fin = null;
    } else if (fecha < this.inicio) {
      this.inicio = fecha;
    } else {
      const dias = Math.round((fecha - this.inicio) / 86400000) + 1;
      if (dias > this.maxDias) {
        toast(`El alquiler máximo es de ${this.maxDias} días por reserva.`, 'info');
        return;
      }
      if (!this.rangoValido(this.inicio, fecha)) {
        toast('Ese rango cruza días sin unidades libres. Elige fechas continuas disponibles.', 'info');
        this.inicio = fecha;
        this.fin = null;
      } else {
        this.fin = fecha;
      }
    }
    this.render();
    this.alCambiar?.(this.valor());
  }

  valor() {
    return { desde: this.inicio ? iso(this.inicio) : null, hasta: this.fin ? iso(this.fin) : null };
  }

  limpiar() {
    this.inicio = null;
    this.fin = null;
    this.render();
    this.alCambiar?.(this.valor());
  }

  mover(delta) {
    const nuevo = new Date(this.mes.getFullYear(), this.mes.getMonth() + delta, 1);
    const minimo = new Date(this.hoy.getFullYear(), this.hoy.getMonth(), 1);
    const maximo = new Date(this.hoy.getFullYear(), this.hoy.getMonth() + 5, 1);
    if (nuevo < minimo || nuevo > maximo) return;
    this.mes = nuevo;
    this.cargar();
  }

  mesHTML(base) {
    const primero = new Date(base.getFullYear(), base.getMonth(), 1);
    const ultimo = new Date(base.getFullYear(), base.getMonth() + 1, 0);
    const huecos = (primero.getDay() + 6) % 7;
    const finProvisional = this.fin || (this.inicio && this.hover && this.hover > this.inicio ? this.hover : null);
    let celdas = '';
    for (let i = 0; i < huecos; i++) celdas += '<span class="dia vacio-dia"></span>';
    for (let d = 1; d <= ultimo.getDate(); d++) {
      const f = new Date(base.getFullYear(), base.getMonth(), d);
      const libres = this.libres(f);
      const clases = ['dia'];
      if (f < this.hoy) clases.push('pasado');
      else if (libres !== null && libres <= 0) clases.push('bloqueado');
      else if (libres === 1 && this.unidades > 1) clases.push('pocas');
      if (+f === +this.hoy) clases.push('hoy');
      if (this.inicio && +f === +this.inicio) clases.push('inicio');
      if (finProvisional && +f === +finProvisional) clases.push('fin');
      if (this.inicio && !finProvisional && +f === +this.inicio) clases.push('fin');
      if (this.inicio && finProvisional && f > this.inicio && f < finProvisional) clases.push('en-rango');
      const titulo = f < this.hoy ? '' : libres === null ? '' : libres <= 0 ? 'Sin unidades libres' : `${libres} ${libres === 1 ? 'unidad libre' : 'unidades libres'}`;
      celdas += `<button type="button" class="${clases.join(' ')}" data-fecha="${iso(f)}" title="${titulo}" ${f < this.hoy || (libres !== null && libres <= 0) ? 'aria-disabled="true"' : ''}><span class="num">${d}</span></button>`;
    }
    return `<div><div class="mes-titulo">${esc(capitalizar(fmtMes.format(base)))}</div>
      <div class="dias-semana">${DIAS.map((x) => `<span>${x}</span>`).join('')}</div>
      <div class="dias-mes">${celdas}</div></div>`;
  }

  render() {
    const meses = this.meses;
    const minimo = new Date(this.hoy.getFullYear(), this.hoy.getMonth(), 1);
    const bloques = Array.from({ length: meses }, (_, i) => this.mesHTML(new Date(this.mes.getFullYear(), this.mes.getMonth() + i, 1)));
    this.el.innerHTML = `
      <div class="calendario-nav">
        <button type="button" data-mover="-1" aria-label="Mes anterior" ${this.mes <= minimo ? 'disabled' : ''}>${I.izq}</button>
        <strong>${this.reservable ? 'Elige inicio y devolución' : 'Sin reservas por ahora'}</strong>
        <button type="button" data-mover="1" aria-label="Mes siguiente">${I.der}</button>
      </div>
      <div class="calendario-meses ${meses === 2 ? 'dos' : ''}">${bloques.join('')}</div>
      <div class="leyenda-calendario">
        <span><i class="l-libre"></i>Libre</span>
        ${this.unidades > 1 ? '<span><i class="l-pocas"></i>Última unidad</span>' : ''}
        <span><i class="l-ocupado"></i>Sin unidades</span>
        <span><i class="l-elegido"></i>Tu selección</span>
      </div>`;
    $$('[data-mover]', this.el).forEach((b) => b.addEventListener('click', () => this.mover(Number(b.dataset.mover))));
    $$('.dia[data-fecha]', this.el).forEach((b) => {
      b.addEventListener('click', () => this.elegir(aFecha(b.dataset.fecha)));
      b.addEventListener('mouseenter', () => {
        if (this.inicio && !this.fin) {
          this.hover = aFecha(b.dataset.fecha);
          this.pintarHover();
        }
      });
    });
    $('.calendario-meses', this.el).addEventListener('mouseleave', () => {
      this.hover = null;
      this.pintarHover();
    });
  }

  /** Repinta solo las clases de rango para que el hover no reconstruya el DOM. */
  pintarHover() {
    const fin = this.fin || (this.hover && this.hover > this.inicio ? this.hover : null);
    $$('.dia[data-fecha]', this.el).forEach((b) => {
      const f = aFecha(b.dataset.fecha);
      b.classList.toggle('en-rango', !!(this.inicio && fin && f > this.inicio && f < fin));
      b.classList.toggle('fin', !!((fin && +f === +fin) || (!fin && this.inicio && +f === +this.inicio)));
    });
  }
}
