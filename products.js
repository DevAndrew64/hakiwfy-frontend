/* =========================================================
   HAWKIFY — Base de datos de productos (compartida)
   Cada producto/pack tiene un "id" único que se usa en la URL
   (ej: producto.html?id=taladro-bosch) para saber cuál mostrar.
   ========================================================= */

const PRODUCTS = {

  /* ---------------- HERRAMIENTAS INDIVIDUALES ---------------- */

  "taladro-bosch": {
    id: "taladro-bosch", type: "tool",
    name: "Taladro Percutor Bosch",
    category: "Construcción",
    price: 25000, originalPrice: 30000,
    rating: 4.8, reviews: 24,
    owner: { name: "Carlos M.", avatar: "assets/avatars/carlos-m.jpg" },
    image: "assets/products/taladro-bosch.jpg",
    gallery: ["assets/products/taladro-bosch.jpg"],
    description: "Taladro percutor profesional Bosch, ideal para perforar concreto, ladrillo, madera y metal. Cuenta con mandril de metal de alta sujeción y empuñadura ergonómica para jornadas largas de trabajo.",
    specs: { "Marca": "Bosch", "Voltaje": "18V", "Batería": "1x Ion-Litio 4.0 Ah", "Tiempo de carga": "45 minutos", "Peso": "1.8 Kg" }
  },
  "sierra-dewalt": {
    id: "sierra-dewalt", type: "tool",
    name: "Sierra Circular DeWalt",
    category: "Carpintería",
    price: 35000, originalPrice: 42000,
    rating: 4.9, reviews: 31,
    owner: { name: "Ana López", avatar: "assets/avatars/ana-lopez.jpg" },
    image: "assets/products/sierra-dewalt.jpg",
    gallery: ["assets/products/sierra-dewalt.jpg"],
    description: "Sierra circular DeWalt de alto torque, perfecta para cortes rectos y precisos en madera y derivados. Base ajustable de profundidad e inclinación para distintos tipos de corte.",
    specs: { "Marca": "DeWalt", "Potencia": "1600W", "Disco": "7 1/4 pulgadas", "Profundidad de corte": "hasta 65mm", "Peso": "3.9 Kg" }
  },
  "pulidora-makita": {
    id: "pulidora-makita", type: "tool",
    name: "Pulidora Angular Makita",
    category: "Construcción",
    price: 18000, originalPrice: 22000,
    rating: 4.7, reviews: 19,
    owner: { name: "Pedro R.", avatar: "assets/avatars/pedro-r.jpg" },
    image: "assets/products/pulidora-makita.jpg",
    gallery: ["assets/products/pulidora-makita.jpg"],
    description: "Pulidora angular Makita de uso profesional, ideal para desbaste y corte de metal, pulido de superficies y acabados. Diseño compacto y de bajo peso para mayor control.",
    specs: { "Marca": "Makita", "Potencia": "850W", "Disco": "4 1/2 pulgadas", "Velocidad": "11.000 RPM", "Peso": "1.9 Kg" }
  },
  "rotomartillo-hilti": {
    id: "rotomartillo-hilti", type: "tool",
    name: "Rotomartillo Hilti",
    category: "Construcción",
    price: 42000, originalPrice: 84000,
    rating: 5.0, reviews: 42,
    owner: { name: "María G.", avatar: "assets/avatars/maria-g.jpg" },
    image: "assets/products/rotomartillo-hilti.jpg",
    gallery: ["assets/products/rotomartillo-hilti.jpg"],
    description: "Rotomartillo Hilti de nivel industrial, diseñado para perforación y demolición ligera en concreto. Sistema anti-vibración que protege la muñeca en jornadas extensas.",
    specs: { "Marca": "Hilti", "Voltaje": "18V", "Función": "Rotación / Percusión / Cincelado", "Autonomía": "hasta 6 horas de uso mixto", "Peso": "3.2 Kg" }
  },
  "compresor-stanley": {
    id: "compresor-stanley", type: "tool",
    name: "Compresor de Aire Stanley",
    category: "Herramientas Eléctricas",
    price: 30000, originalPrice: 36000,
    rating: 4.6, reviews: 15,
    owner: { name: "Luis H.", avatar: "assets/avatars/luis-h.jpg" },
    image: "assets/products/compresor-stanley.jpg",
    gallery: ["assets/products/compresor-stanley.jpg"],
    description: "Compresor de aire Stanley de tanque, ideal para inflado, pintura con pistola, limpieza con aire y herramientas neumáticas. Motor silencioso de bajo mantenimiento.",
    specs: { "Marca": "Stanley", "Tanque": "24 Litros", "Potencia": "2 HP", "Presión máxima": "115 PSI", "Peso": "22 Kg" }
  },
  "lijadora-blackdecker": {
    id: "lijadora-blackdecker", type: "tool",
    name: "Lijadora Orbital Black+Decker",
    category: "Carpintería",
    price: 15000, originalPrice: 50000,
    rating: 4.5, reviews: 12,
    owner: { name: "Diana P.", avatar: "assets/avatars/diana-p.jpg" },
    image: "assets/products/lijadora-blackdecker.jpg",
    gallery: ["assets/products/lijadora-blackdecker.jpg"],
    description: "Lijadora orbital Black+Decker, perfecta para acabados finos en madera antes de pintar o barnizar. Sistema de recolección de polvo incluido para un trabajo más limpio.",
    specs: { "Marca": "Black+Decker", "Potencia": "220W", "Base": "1/4 de hoja", "Órbitas": "14.000 OPM", "Peso": "1.1 Kg" }
  },
  "taladro-impacto-makita": {
    id: "taladro-impacto-makita", type: "tool",
    name: "Taladro de Impacto Makita",
    category: "Herramientas Eléctricas",
    price: 28000, originalPrice: 56000,
    rating: 4.8, reviews: 21,
    owner: { name: "Julián S.", avatar: "assets/avatars/julian-s.jpg" },
    image: "assets/products/taladro-impacto-makita.jpg",
    gallery: ["assets/products/taladro-impacto-makita.jpg"],
    description: "Taladro de impacto Makita a batería, con torque elevado para atornillado pesado y perforación en distintos materiales. Empuñadura antideslizante y luz LED de trabajo.",
    specs: { "Marca": "Makita", "Voltaje": "18V", "Torque máximo": "180 Nm", "Mandril": "1/4 hexagonal", "Peso": "1.6 Kg" }
  },
  "sierra-jig-bosch": {
    id: "sierra-jig-bosch", type: "tool",
    name: "Sierra Jig Bosch",
    category: "Carpintería",
    price: 22000, originalPrice: 55000,
    rating: 4.9, reviews: 17,
    owner: { name: "Valentina T.", avatar: "assets/avatars/valentina-t.jpg" },
    image: "assets/products/sierra-jig-bosch.jpg",
    gallery: ["assets/products/sierra-jig-bosch.jpg"],
    description: "Sierra caladora (jig saw) Bosch, ideal para cortes curvos y detallados en madera, plástico y láminas metálicas delgadas. Velocidad variable para mayor precisión.",
    specs: { "Marca": "Bosch", "Potencia": "220V / 550W", "Carrera": "20mm", "Velocidad": "variable 0-3000 SPM", "Peso": "2.1 Kg" }
  },
  "martillo-hilti": {
    id: "martillo-hilti", type: "tool",
    name: "Martillo Rotativo Hilti",
    category: "Construcción",
    price: 48000,
    rating: 4.7, reviews: 28,
    owner: { name: "Rafael O.", avatar: "assets/avatars/rafael-o.jpg" },
    image: "assets/products/martillo-hilti.jpg",
    gallery: ["assets/products/martillo-hilti.jpg"],
    description: "Martillo rotativo Hilti de alto rendimiento, pensado para demolición y perforación pesada en concreto armado. Empuñadura reforzada con sistema de absorción de impacto.",
    specs: { "Marca": "Hilti", "Potencia": "1100W", "Energía de impacto": "8.5 Joules", "Portabrocas": "SDS-Plus", "Peso": "4.5 Kg" }
  },

  /* ---------------- PACKS PARA AHORRAR ---------------- */

  "bosch-pack": {
    id: "bosch-pack", type: "pack",
    name: "Pack de 4 Herramientas Bosch a Batería + Bolsa",
    category: "Herramientas Eléctricas",
    price: 65000, originalPrice: 85000,
    rating: 4.9, reviews: 18,
    owner: { name: "María G.", avatar: "assets/avatars/maria-g.jpg" },
    image: "assets/packs/bosch-pack-hero.jpg",
    gallery: [
      "assets/packs/bosch-pack-hero.jpg",
      "assets/packs/bosch-pack-thumb1.jpg",
      "assets/packs/bosch-pack-thumb2.jpg",
      "assets/packs/bosch-pack-thumb3.jpg",
      "assets/packs/bosch-pack-thumb4.jpg"
    ],
    includes: [
      "1x Taladro Percutor Bosch 18V GSB con mandril de metal",
      "1x Sierra Circular Bosch de alta velocidad y corte suave",
      "1x Sierra Sable Bosch para cortes rápidos en metal y madera",
      "1x Linterna LED de alta intensidad articulada",
      "4x Baterías de Ion-Litio de 18V (4.0 Ah) con indicador de carga",
      "1x Cargador rápido inteligente (carga completa en 45 minutos)",
      "1x Maletín / Bolsa de lona reforzada e impermeable"
    ],
    description: "Lleva tus proyectos al siguiente nivel con este completísimo pack de herramientas a batería Bosch de gama industrial. Ideal para obras de construcción, remodelaciones o trabajos exigentes de carpintería y metal mecánica.",
    specs: { "Marca": "Bosch Profesional", "Voltaje": "18V", "Capacidad de baterías": "4.0 Ah cada una (4 unidades)", "Autonomía estimada": "8-10 horas de uso mixto continuo", "Peso del pack completo": "9.2 Kg" }
  },
  "pack-construccion-pro": {
    id: "pack-construccion-pro", type: "pack",
    name: "Pack Construcción Pro",
    category: "Construcción",
    price: 98000, originalPrice: 115000,
    rating: 4.8, reviews: 9,
    owner: { name: "Hawkify", avatar: "" },
    image: "assets/products/taladro-bosch.jpg",
    includesIds: ["taladro-bosch", "rotomartillo-hilti", "martillo-hilti"],
    description: "Trío de herramientas pesadas para obra gris: taladro percutor, rotomartillo y martillo rotativo en un solo pack, listos para perforar, demoler y anclar en concreto y mampostería.",
    specs: { "Incluye": "3 herramientas", "Ideal para": "Obra gris y estructura", "Uso recomendado": "Profesional / cuadrillas" }
  },
  "pack-carpintero": {
    id: "pack-carpintero", type: "pack",
    name: "Pack Carpintero Completo",
    category: "Carpintería",
    price: 61000, originalPrice: 72000,
    rating: 4.8, reviews: 11,
    owner: { name: "Hawkify", avatar: "" },
    image: "assets/products/sierra-dewalt.jpg",
    includesIds: ["sierra-dewalt", "sierra-jig-bosch", "lijadora-blackdecker"],
    description: "Todo lo que necesitas para un proyecto de carpintería: sierra circular para cortes rectos, sierra caladora para curvas y detalles, y lijadora orbital para el acabado final.",
    specs: { "Incluye": "3 herramientas", "Ideal para": "Muebles y acabados en madera", "Uso recomendado": "Profesional / hobby avanzado" }
  },
  "pack-taladros": {
    id: "pack-taladros", type: "pack",
    name: "Pack Taladros 2x1",
    category: "Herramientas Eléctricas",
    price: 47000, originalPrice: 53000,
    rating: 4.7, reviews: 7,
    owner: { name: "Hawkify", avatar: "" },
    image: "assets/products/taladro-impacto-makita.jpg",
    includesIds: ["taladro-bosch", "taladro-impacto-makita"],
    description: "Dos taladros por el precio de uno con descuento: un percutor Bosch para perforar y un taladro de impacto Makita para atornillado pesado. La dupla perfecta para cualquier proyecto.",
    specs: { "Incluye": "2 herramientas", "Ideal para": "Perforar y atornillar sin cambiar de equipo", "Uso recomendado": "Profesional / hobby avanzado" }
  }
};

/* Filas curadas de la página principal */
const HOME_ROWS = [
  {
    key: "ofertas",
    title: "Ofertas de la semana",
    icon: "tag",
    items: ["taladro-bosch", "sierra-dewalt", "pulidora-makita", "compresor-stanley"]
  },
  {
    key: "descuento70",
    title: "Hasta 70% de descuento",
    icon: "percent",
    items: ["rotomartillo-hilti", "lijadora-blackdecker", "taladro-impacto-makita", "sierra-jig-bosch"]
  },
  {
    key: "packs",
    title: "Packs para ahorrar",
    icon: "box",
    items: ["bosch-pack", "pack-construccion-pro", "pack-carpintero", "pack-taladros"]
  }
];

/* Lista completa para el Catálogo (solo herramientas individuales) */
const CATALOG_IDS = [
  "taladro-bosch", "sierra-dewalt", "pulidora-makita", "rotomartillo-hilti",
  "compresor-stanley", "lijadora-blackdecker", "taladro-impacto-makita",
  "sierra-jig-bosch", "martillo-hilti"
];

function formatCOP(n){
  return "$" + n.toLocaleString("es-CO");
}

function discountPercent(product){
  if (!product.originalPrice) return null;
  return Math.round((1 - product.price / product.originalPrice) * 100);
}
