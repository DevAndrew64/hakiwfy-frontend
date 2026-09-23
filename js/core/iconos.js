/* Iconos de trazo (24x24). Se inyectan como texto en plantillas. */

const t = (d, extra = '') =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;

export const I = {
  halcon: `<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="M5 24.5 10.2 9.6 19.4 5l8.1 5.1-5 1.7 3.4 4.7h-8.6L12.4 26z"/><circle cx="19.6" cy="10.1" r="1.5" fill="#f0a81c"/><path fill="#f0a81c" d="m22.5 11.8 5-1.7-1.3 2.7z"/></svg>`,
  buscar: t('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
  corazon: t('<path d="M12 20.5s-7.5-4.6-9.2-9.3C1.6 7.8 3.9 4.5 7.3 4.5c2 0 3.5 1.1 4.7 2.7 1.2-1.6 2.7-2.7 4.7-2.7 3.4 0 5.7 3.3 4.5 6.7-1.7 4.7-9.2 9.3-9.2 9.3z"/>'),
  campana: t('<path d="M6 8a6 6 0 0 1 12 0c0 7 3 8.5 3 8.5H3S6 15 6 8"/><path d="M10.3 20a1.9 1.9 0 0 0 3.4 0"/>'),
  usuario: t('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
  usuarios: t('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 20a6.5 6.5 0 0 0-3-5.5"/>'),
  menu: t('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  cerrar: t('<path d="M6 6l12 12M18 6 6 18"/>'),
  flecha: t('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  izq: t('<path d="m15 6-6 6 6 6"/>'),
  der: t('<path d="m9 6 6 6-6 6"/>'),
  abajo: t('<path d="m6 9 6 6 6-6"/>'),
  estrella: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 2.8 2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z"/></svg>',
  calendario: t('<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'),
  camion: t('<path d="M2.5 6.5h11v9h-11zM13.5 9.5h4l3 3v3h-7z"/><circle cx="6.5" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>'),
  tienda: t('<path d="M4 10v10h16V10M3 10l2-6h14l2 6zM9.5 20v-5h5v5"/>'),
  tarjeta: t('<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 9.5h19M6 15h4"/>'),
  banco: t('<path d="M3 10 12 4l9 6M5 10v8M9.7 10v8M14.3 10v8M19 10v8M3 20h18"/>'),
  celular: t('<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M11 18h2"/>'),
  check: t('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
  checkCirculo: t('<circle cx="12" cy="12" r="9"/><path d="m8 12.3 2.8 2.8L16.2 9.5"/>'),
  alerta: t('<path d="M12 3.5 2.5 20h19z"/><path d="M12 10v4.5M12 17.3v.2"/>'),
  info: t('<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8v.2"/>'),
  salir: t('<path d="M15 4h3.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H15M10 16.5 14.5 12 10 7.5M14.5 12H4"/>'),
  panel: t('<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="4.5" rx="1.5"/><rect x="13.5" y="11" width="7" height="9.5" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/>'),
  lista: t('<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>'),
  taladro: t('<path d="M3 7.5h11.5v5.5H7l-1.2 7.5H3z"/><path d="M14.5 9h3.5M18 10.2h3.5M9 13v2.2"/>'),
  sierra: t('<circle cx="11" cy="13" r="6.5"/><circle cx="11" cy="13" r="1.5"/><path d="M11 6.5V3.5M17.5 13h3M4.5 13h-2M11 19.5v2"/>'),
  aire: t('<rect x="3" y="9" width="13" height="9" rx="4.5"/><path d="M16 13.5h3a2 2 0 0 0 2-2V6M8 18v2.5M12 18v2.5M9.5 9V6.5h3V9"/>'),
  hoja: t('<path d="M5 19c0-8 5-13 15-14-1 10-6 15-14 15"/><path d="M5 19 13 11"/>'),
  regla: t('<path d="M3 16.5 16.5 3 21 7.5 7.5 21z"/><path d="m7 12.5 1.8 1.8M10 9.5l1.8 1.8M13 6.5l1.8 1.8"/>'),
  caja: t('<path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9"/>'),
  llave: t('<path d="M14.5 5.5a4.5 4.5 0 0 0 5.6 5.7L11 20.3a2.2 2.2 0 0 1-3.1-3.1l9.1-9.1"/><path d="m17.2 6.8-2.4 2.4"/>'),
  escudo: t('<path d="M12 3 4.5 6v5.5c0 4.5 3.2 8.2 7.5 9.5 4.3-1.3 7.5-5 7.5-9.5V6z"/><path d="m9 12 2 2 4-4"/>'),
  reloj: t('<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/>'),
  editar: t('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>'),
  basura: t('<path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>'),
  ojo: t('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>'),
  ojoNo: t('<path d="M3 3l18 18M10.6 5.6A10 10 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3 3.8M6.2 6.7A17 17 0 0 0 2.5 12s3.5 6.5 9.5 6.5a9.5 9.5 0 0 0 4-.9"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>'),
  subir: t('<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>'),
  descargar: t('<path d="M12 4v12M7 11l5 5 5-5M4 20h16"/>'),
  mas: t('<path d="M12 5v14M5 12h14"/>'),
  filtro: t('<path d="M3.5 5h17l-6.5 8v6l-4-2v-4z"/>'),
  grafica: t('<path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/>'),
  bitacora: t('<path d="M6 3.5h12v17H6z"/><path d="M9 8h6M9 12h6M9 16h3"/>'),
  ajustes: t('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H2.8a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 2.9-1.2v-.2a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  pausa: t('<rect x="6.5" y="5" width="3.5" height="14" rx="1"/><rect x="14" y="5" width="3.5" height="14" rx="1"/>'),
  play: t('<path d="M7 4.5v15l12-7.5z"/>'),
  mensaje: t('<path d="M4 5h16v11H9l-5 4z"/>'),
  ubicacion: t('<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'),
  documento: t('<path d="M6 3h8.5L19 7.5V21H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>'),
  candado: t('<rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>'),
  herramienta: t('<path d="M14.7 6.3a4 4 0 0 0 5.2 5.2l-8.5 8.5a2.3 2.3 0 0 1-3.3-3.3z"/><path d="M4 4l5 5M4 4l2.5-.5L9 6l-.5 2.5z"/>'),
  foto: t('<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10.5" r="1.8"/><path d="m21 16-5-5-8 8"/>'),
  retirar: t('<circle cx="12" cy="12" r="9"/><path d="M8 12h8"/>'),
  historial: t('<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3.5 8.5"/><path d="M3.5 4v4.5H8M12 8v4l3 2"/>'),
  moneda: t('<circle cx="12" cy="12" r="9"/><path d="M15 9.2c-.6-.9-1.7-1.4-3-1.4-1.8 0-3 .9-3 2.2 0 3 6 1.5 6 4.3 0 1.3-1.3 2.3-3 2.3-1.4 0-2.6-.6-3.2-1.6M12 6v1.8M12 16.6v1.6"/>'),
  paquete: t('<path d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5z"/><path d="M4 8.5 12 13l8-4.5M8 6.3l8 4.4"/>'),
};

export const iconoCategoria = (nombre = '') => {
  const n = nombre.toLowerCase();
  if (n.includes('perfor')) return I.taladro;
  if (n.includes('corte')) return I.sierra;
  if (n.includes('aire') || n.includes('neum')) return I.aire;
  if (n.includes('jard') || n.includes('exterior')) return I.hoja;
  if (n.includes('medic')) return I.regla;
  if (n.includes('kit') || n.includes('combo')) return I.paquete;
  if (n.includes('carpin')) return I.llave;
  return I.herramienta;
};
