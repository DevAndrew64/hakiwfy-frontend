/* =========================================================
   HAWKIFY — Script principal (compartido por todas las páginas)
   Requiere que products.js esté cargado antes que este archivo.
   ========================================================= */

/* ---------------------------------------------------------
   Iconos SVG reutilizables (como texto, para poder inyectarlos
   dinámicamente en tarjetas generadas por JavaScript)
--------------------------------------------------------- */
const ICONS = {
  star: '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>',
  tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41 11 3.83A2 2 0 0 0 9.59 3.24L3 3v6.59a2 2 0 0 0 .59 1.41l9.58 9.58a2 2 0 0 0 2.82 0l4.6-4.6a2 2 0 0 0 0-2.82z"/><circle cx="7.5" cy="7.5" r="1.5"/></svg>',
  percent: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>',
  box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>'
};

/* ---------------------------------------------------------
   CARRITO (guardado en localStorage, se comparte entre páginas)
--------------------------------------------------------- */
const CART_KEY = "hawkify_cart";

function getCart(){
  try{
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  }catch(e){ return []; }
}

function saveCart(cart){
  try{
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }catch(e){ /* almacenamiento no disponible, se ignora */ }
}

function addToCart(id){
  const product = PRODUCTS[id];
  if (!product) return;
  const cart = getCart();
  const existing = cart.find(i => i.id === id);
  if (existing) existing.qty += 1;
  else cart.push({ id, qty: 1 });
  saveCart(cart);
  renderCart();
}

function removeFromCart(id){
  let cart = getCart();
  cart = cart.filter(i => i.id !== id);
  saveCart(cart);
  renderCart();
}

function cartCount(cart){
  return cart.reduce((sum, i) => sum + i.qty, 0);
}

function cartTotal(cart){
  return cart.reduce((sum, i) => {
    const p = PRODUCTS[i.id];
    return sum + (p ? p.price * i.qty : 0);
  }, 0);
}

function renderCart(){
  const cart = getCart();
  const badge = document.getElementById("cart-badge");
  const panel = document.getElementById("cart-dropdown");
  if (!badge || !panel) return;

  const count = cartCount(cart);
  badge.textContent = count;
  badge.style.display = count > 0 ? "flex" : "none";

  if (cart.length === 0){
    panel.innerHTML = '<p class="cart-empty">Tu carrito está vacío.</p>';
    return;
  }

  let rows = "";
  cart.forEach(item => {
    const p = PRODUCTS[item.id];
    if (!p) return;
    rows += `
      <div class="cart-item">
        <img src="${p.image}" alt="${p.name}">
        <div class="cart-item-info">
          <p class="name">${p.name}</p>
          <p class="qty">Cantidad: ${item.qty}</p>
          <p class="price">${formatCOP(p.price * item.qty)} COP</p>
        </div>
        <button class="cart-remove" data-remove-id="${p.id}" aria-label="Quitar">${ICONS.trash}</button>
      </div>`;
  });

  panel.innerHTML = `
    <div class="cart-items">${rows}</div>
    <div class="cart-total-row">
      <span>Total</span>
      <span>${formatCOP(cartTotal(cart))} COP</span>
    </div>
    <a href="checkout.html" class="btn btn-gold btn-gold-wide">Ir a pagar</a>
  `;

  panel.querySelectorAll("[data-remove-id]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      removeFromCart(btn.getAttribute("data-remove-id"));
    });
  });
}

/* ---------------------------------------------------------
   Tarjetas de producto (usadas en index y catálogo)
--------------------------------------------------------- */
function productCardHTML(product, opts){
  opts = opts || {};
  const pct = discountPercent(product);
  const ribbon = pct ? `<span class="discount-ribbon">-${pct}%</span>` : "";

  const priceBlock = product.originalPrice
    ? `<p class="product-price">${formatCOP(product.price)} <span>COP / día</span> <span class="price-old">${formatCOP(product.originalPrice)}</span></p>`
    : `<p class="product-price">${formatCOP(product.price)} <span>COP / día</span></p>`;

  let ownerBlock;
  if (product.type === "pack"){
    ownerBlock = `
      <div class="pack-includes-mini">${(product.includesIds || []).length || (product.includes || []).length} herramientas incluidas</div>`;
  } else {
    ownerBlock = `
      <img src="${product.owner.avatar}" alt="${product.owner.name}">
      <div class="owner-info">
        <p class="name">${product.owner.name}</p>
        <p class="role">Propietario</p>
      </div>`;
  }

  let photo;
  if (product.type === "pack" && product.includesIds){
    const imgs = product.includesIds.slice(0,3).map(id => PRODUCTS[id].image);
    const gridClass = imgs.length === 2 ? "pack-photo-grid two" : "pack-photo-grid";
    photo = `<div class="${gridClass}">${imgs.map(src => `<img src="${src}" alt="">`).join("")}</div>`;
  } else {
    photo = `<img src="${product.image}" alt="${product.name}">`;
  }

  return `
    <article class="product-card" data-category="${product.category}" data-id="${product.id}">
      <a class="product-photo" href="producto.html?id=${product.id}" aria-label="Ver ${product.name}">
        ${ribbon}
        ${photo}
      </a>
      <div class="product-body">
        <div class="product-meta">
          <span class="badge-available">DISPONIBLE</span>
          <span class="rating">${ICONS.star}(${product.rating})</span>
        </div>
        <h3 class="product-name"><a href="producto.html?id=${product.id}">${product.name}</a></h3>
        ${priceBlock}
        <div class="product-owner ${product.type === 'pack' ? 'is-pack' : ''}">
          ${ownerBlock}
          <a href="producto.html?id=${product.id}" class="btn-rent">Alquilar</a>
          <button class="btn-cart-add" data-add-id="${product.id}" aria-label="Agregar al carrito" title="Agregar al carrito">${ICONS.cart}</button>
        </div>
      </div>
    </article>`;
}

function bindCardCartButtons(container){
  container.querySelectorAll("[data-add-id]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      addToCart(btn.getAttribute("data-add-id"));
      btn.classList.add("just-added");
      setTimeout(() => btn.classList.remove("just-added"), 600);
    });
  });
}

/* ---------------------------------------------------------
   Página principal: filas curadas (ofertas / descuentos / packs)
--------------------------------------------------------- */
function renderHomeRows(){
  const wrap = document.getElementById("home-rows");
  if (!wrap) return;

  let html = "";
  HOME_ROWS.forEach(row => {
    const cards = row.items.map(id => productCardHTML(PRODUCTS[id])).join("");
    html += `
      <section class="category-row">
        <div class="category-row-heading">
          <span class="category-row-icon">${ICONS[row.icon]}</span>
          <h2>${row.title}</h2>
        </div>
        <div class="product-grid product-grid-4">${cards}</div>
      </section>`;
  });

  wrap.innerHTML = html;
  bindCardCartButtons(wrap);
}

/* ---------------------------------------------------------
   Catálogo: grid completo + filtro + orden
--------------------------------------------------------- */
function renderCatalog(){
  const grid = document.getElementById("catalog-grid");
  if (!grid) return;

  let ids = CATALOG_IDS.slice();

  const params = new URLSearchParams(window.location.search);
  const cat = params.get("cat");

  function draw(list){
    grid.innerHTML = list.map(id => productCardHTML(PRODUCTS[id])).join("");
    bindCardCartButtons(grid);
    const emptyState = document.getElementById("empty-state");
    if (emptyState) emptyState.style.display = list.length === 0 ? "block" : "none";
  }

  function applyAll(){
    const activeCat = document.querySelector(".filter-pill.active")?.getAttribute("data-filter") || "Todas";
    let list = CATALOG_IDS.filter(id => activeCat === "Todas" || PRODUCTS[id].category === activeCat);

    const sortValue = document.getElementById("sort-select")?.value || "relevancia";
    list = list.slice();
    if (sortValue === "precio-asc") list.sort((a,b) => PRODUCTS[a].price - PRODUCTS[b].price);
    else if (sortValue === "precio-desc") list.sort((a,b) => PRODUCTS[b].price - PRODUCTS[a].price);
    else if (sortValue === "calificacion") list.sort((a,b) => PRODUCTS[b].rating - PRODUCTS[a].rating);

    draw(list);
  }

  document.querySelectorAll(".filter-pill").forEach(pill => {
    pill.addEventListener("click", () => {
      document.querySelectorAll(".filter-pill").forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      applyAll();
    });
  });

  const sortSelect = document.getElementById("sort-select");
  if (sortSelect) sortSelect.addEventListener("change", applyAll);

  if (cat){
    document.querySelectorAll(".filter-pill").forEach(p => {
      p.classList.toggle("active", p.getAttribute("data-filter") === cat);
    });
  }

  applyAll();
}

/* ---------------------------------------------------------
   Página de detalle de producto
--------------------------------------------------------- */
function renderProductDetail(){
  const root = document.getElementById("product-detail");
  if (!root) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id") || "taladro-bosch";
  const product = PRODUCTS[id] || PRODUCTS["taladro-bosch"];

  document.title = product.name + " — Hawkify";

  const gallery = product.gallery && product.gallery.length ? product.gallery : [product.image];

  const includesHTML = product.type === "pack"
    ? `<div class="detail-section">
         <h3>¿Qué incluye?</h3>
         <ul class="check-list">
           ${(product.includes
              ? product.includes
              : (product.includesIds || []).map(pid => PRODUCTS[pid].name)
             ).map(txt => `<li>✔ ${txt}</li>`).join("")}
         </ul>
       </div>`
    : "";

  const specsHTML = `
    <div class="detail-section">
      <h3>Especificaciones</h3>
      <table class="spec-table">
        ${Object.entries(product.specs || {}).map(([k,v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join("")}
      </table>
    </div>`;

  const pct = discountPercent(product);
  const priceHTML = product.originalPrice
    ? `<p class="detail-price">${formatCOP(product.price)} <span>COP / día</span></p>
       <p class="detail-price-old">${formatCOP(product.originalPrice)} COP / día ${pct ? `<span class="discount-ribbon inline">-${pct}%</span>` : ""}</p>`
    : `<p class="detail-price">${formatCOP(product.price)} <span>COP / día</span></p>`;

  const ownerHTML = product.owner && product.owner.name !== "Hawkify"
    ? `<div class="detail-owner">
         <img src="${product.owner.avatar}" alt="${product.owner.name}">
         <div>
           <p class="name">${product.owner.name}</p>
           <p class="role">Propietario de confianza</p>
         </div>
       </div>`
    : `<div class="detail-owner">
         <div class="pack-owner-badge">HK</div>
         <div>
           <p class="name">Hawkify</p>
           <p class="role">Pack oficial de la plataforma</p>
         </div>
       </div>`;

  root.innerHTML = `
    <div class="detail-gallery">
      <div class="detail-main-photo"><img id="detail-main-img" src="${gallery[0]}" alt="${product.name}"></div>
      ${gallery.length > 1 ? `<div class="detail-thumbs">
        ${gallery.map((src,i) => `<button class="detail-thumb ${i===0?'active':''}" data-src="${src}"><img src="${src}" alt=""></button>`).join("")}
      </div>` : ""}
    </div>

    <div class="detail-info">
      <span class="badge-available">DISPONIBLE</span>
      <h1>${product.name}</h1>
      <span class="rating">${ICONS.star}(${product.rating}) · ${product.reviews || 0} reseñas</span>
      ${priceHTML}
      ${ownerHTML}
      <div class="detail-actions">
        <a href="checkout.html?id=${product.id}" class="btn btn-gold btn-gold-wide">Alquilar Ahora</a>
        <button class="btn-cart-add large" data-add-id="${product.id}">${ICONS.cart} Agregar al carrito</button>
      </div>
    </div>

    <div class="detail-full">
      <div class="detail-section">
        <h3>Descripción</h3>
        <p>${product.description || ""}</p>
      </div>
      ${includesHTML}
      ${specsHTML}
    </div>
  `;

  bindCardCartButtons(root);

  root.querySelectorAll(".detail-thumb").forEach(btn => {
    btn.addEventListener("click", () => {
      document.getElementById("detail-main-img").src = btn.getAttribute("data-src");
      root.querySelectorAll(".detail-thumb").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
}

/* ---------------------------------------------------------
   Checkout: resumen del alquiler según el producto elegido
--------------------------------------------------------- */
function renderCheckoutSummary(){
  const root = document.getElementById("checkout-summary");
  if (!root) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id") || "rotomartillo-hilti";
  const product = PRODUCTS[id] || PRODUCTS["rotomartillo-hilti"];

  const days = 3;
  const subtotal = product.price * days;
  const insurance = Math.round(product.price * 0.12);
  const shipping = 15000;
  const total = subtotal + insurance + shipping;

  root.innerHTML = `
    <div class="summary-product">
      <img src="${product.image}" alt="${product.name}">
      <div>
        <p class="name">${product.name}</p>
        <p class="owner">Propietario: ${product.owner.name}</p>
        <p class="price">${formatCOP(product.price)} COP / día</p>
      </div>
    </div>
    <div class="summary-rows">
      <div class="summary-row"><span>Desde:</span><strong>Viernes, Mar 20, 2026</strong></div>
      <div class="summary-row"><span>Hasta:</span><strong>Lunes, Mar 23, 2026</strong></div>
      <div class="summary-row"><span>Duración:</span><strong class="highlight">${days} Días</strong></div>
    </div>
    <div class="summary-rows">
      <div class="summary-row"><span>Subtotal (${days} días)</span><strong>${formatCOP(subtotal)}</strong></div>
      <div class="summary-row"><span>Seguro Todo Riesgo</span><strong class="highlight">¡Incluido!</strong></div>
      <div class="summary-row"><span>Envío y Devolución</span><strong>${formatCOP(shipping)}</strong></div>
    </div>
    <div class="summary-total">
      <span>Total COP</span>
      <span>${formatCOP(total)}</span>
    </div>
    <button class="btn btn-gold btn-gold-wide" id="confirm-rent-btn" type="button">Confirmar Alquiler</button>
    <p class="confirm-success" id="confirm-success">¡Listo! Tu alquiler fue confirmado. Te contactaremos para coordinar la entrega.</p>
  `;

  document.getElementById("confirm-rent-btn").addEventListener("click", () => {
    const form = document.getElementById("delivery-form");
    const required = form ? form.querySelectorAll("[required]") : [];
    let allFilled = true;
    let firstEmpty = null;
    required.forEach(f => {
      if (!f.value.trim()){ allFilled = false; if(!firstEmpty) firstEmpty = f; }
    });
    if (!allFilled){
      alertInline(form, "Por favor completa los datos de entrega antes de confirmar.");
      if (firstEmpty) firstEmpty.focus();
      return;
    }
    document.getElementById("confirm-success").classList.add("show");
    document.getElementById("confirm-rent-btn").disabled = true;
    const oldError = form.querySelector(".form-error");
    if (oldError) oldError.classList.remove("show");
  });
}

function alertInline(form, message){
  let box = form.querySelector(".form-error");
  if (!box){
    box = document.createElement("p");
    box.className = "form-error";
    form.prepend(box);
  }
  box.textContent = message;
  box.classList.add("show");
}

/* ---------------------------------------------------------
   Método de pago (checkout): selección visual de tarjeta
--------------------------------------------------------- */
function initPaymentMethods(){
  const options = document.querySelectorAll(".payment-option");
  if (!options.length) return;
  options.forEach(opt => {
    opt.addEventListener("click", () => {
      options.forEach(o => {
        o.classList.remove("selected");
        o.querySelector('input[type="radio"]').checked = false;
      });
      opt.classList.add("selected");
      opt.querySelector('input[type="radio"]').checked = true;
    });
  });
}

/* ---------------------------------------------------------
   FAQ: acordeón
--------------------------------------------------------- */
function initFaqAccordion(){
  document.querySelectorAll(".faq-item").forEach(item => {
    const question = item.querySelector(".faq-question");
    question.addEventListener("click", () => {
      const isOpen = item.classList.contains("open");
      document.querySelectorAll(".faq-item.open").forEach(o => o.classList.remove("open"));
      if (!isOpen) item.classList.add("open");
    });
  });
}

/* ---------------------------------------------------------
   Mi Cuenta: navegación lateral hace scroll a cada sección
--------------------------------------------------------- */
function initAccountNav(){
  document.querySelectorAll("[data-account-link]").forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      document.querySelectorAll("[data-account-link]").forEach(l => l.classList.remove("active"));
      link.classList.add("active");
      document.getElementById(link.getAttribute("data-account-link"))?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

/* ---------------------------------------------------------
   Validación de formularios de autenticación
--------------------------------------------------------- */
function initAuthForm(){
  const authForm = document.getElementById("auth-form");
  if (!authForm) return;

  const errorBox = document.getElementById("form-error");
  const emailField = authForm.querySelector('input[type="email"]');
  const passwordField = authForm.querySelector('input[type="password"]');

  function setError(msg){
    if (!errorBox) return;
    if (msg){
      errorBox.textContent = msg;
      errorBox.classList.add("show");
    } else {
      errorBox.classList.remove("show");
    }
  }

  authForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const requiredFields = authForm.querySelectorAll("[required]");
    let firstEmpty = null;
    requiredFields.forEach(field => {
      if (!field.value.trim() && !firstEmpty) firstEmpty = field;
    });

    if (firstEmpty){
      setError("Por favor completa todos los campos para continuar.");
      firstEmpty.focus();
      return;
    }

    if (emailField && !emailField.value.includes("@")){
      setError("introduzca una dirección de correo válida.");
      emailField.focus();
      return;
    }

    if (passwordField && passwordField.value.length < 7){
      setError("min. 7 caracteres.");
      passwordField.focus();
      return;
    }

    setError(null);
    window.location.href = "index.html";
  });

  authForm.querySelectorAll("input").forEach(input => {
    input.addEventListener("input", () => setError(null));
  });
}

/* ---------------------------------------------------------
   Mostrar / ocultar contraseña
--------------------------------------------------------- */
function initPasswordToggles(){
  document.querySelectorAll("[data-toggle-password]").forEach(checkbox => {
    const input = document.getElementById(checkbox.getAttribute("data-toggle-password"));
    if (!input) return;
    checkbox.addEventListener("change", () => {
      input.type = checkbox.checked ? "text" : "password";
    });
  });
}

/* ---------------------------------------------------------
   Menús desplegables genéricos del header
--------------------------------------------------------- */
function initDropdowns(){
  const allDropdownButtons = document.querySelectorAll("[data-dropdown-toggle]");

  function closeAll(except){
    document.querySelectorAll(".dropdown-panel.open").forEach(panel => {
      if (panel !== except) panel.classList.remove("open");
    });
  }

  allDropdownButtons.forEach(btn => {
    const panel = document.getElementById(btn.getAttribute("data-dropdown-toggle"));
    if (!panel) return;
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = panel.classList.contains("open");
      closeAll();
      panel.classList.toggle("open", !isOpen);
      if (panel.id === "cart-dropdown" && !isOpen) renderCart();
    });
  });

  document.addEventListener("click", () => closeAll());
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeAll(); });
  document.querySelectorAll(".dropdown-panel").forEach(panel => {
    panel.addEventListener("click", (e) => e.stopPropagation());
  });
}

/* ---------------------------------------------------------
   Init general
--------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  initDropdowns();
  initPasswordToggles();
  initAuthForm();
  initFaqAccordion();
  initAccountNav();
  initPaymentMethods();

  renderHomeRows();
  renderCatalog();
  renderProductDetail();
  renderCheckoutSummary();

  renderCart();
});
