
// -----------------------
// CARRITO (persistente)
// -----------------------
const CART_KEY = "cart_9tierras";

function loadCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) ?? []; }
  catch { return []; }
}

let cart = loadCart();

function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function money(n) {
  return Number(n || 0).toLocaleString("es-CO");
}

// Agregar o sumar cantidad
function addToCart(product) {
  const idx = cart.findIndex(i => i.productId === product.productId);
  if (idx >= 0) cart[idx].qty += 1;
  else cart.push({ ...product, qty: 1 });

  saveCart();
  renderCart();
}

function removeOne(productId) {
  const idx = cart.findIndex(i => i.productId === productId);
  if (idx === -1) return;

  cart[idx].qty -= 1;
  if (cart[idx].qty <= 0) cart.splice(idx, 1);

  saveCart();
  renderCart();
}

function clearCart() {
  cart = [];
  saveCart();
  renderCart();
}

// -----------------------
// Renderizar carrito
// -----------------------
function renderCart() {
  const cartList = document.getElementById("cart");
  const totalSpan = document.getElementById("total");
  if (!cartList || !totalSpan) return;

  cartList.innerHTML = "";
  let total = 0;

  cart.forEach(item => {
    const lineTotal = (Number(item.price) || 0) * (Number(item.qty) || 1);
    total += lineTotal;

    const li = document.createElement("li");
    li.innerHTML = `
      <span>${item.name} x${item.qty} - $${money(lineTotal)}</span>
      <button class="remove-one" data-id="${item.productId}" title="Quitar 1">-</button>
    `;
    cartList.appendChild(li);
  });

  totalSpan.textContent = money(total);
}

// Delegación: quitar 1
document.getElementById("cart")?.addEventListener("click", (e) => {
  const btn = e.target.closest(".remove-one");
  if (!btn) return;
  removeOne(btn.dataset.id);
});

// -----------------------
// CHECKOUT (POST /api/checkout)
// -----------------------
document.getElementById("checkoutBtn")?.addEventListener("click", async () => {
  if (cart.length === 0) return alert("El carrito está vacío");

  try {
    const resp = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cart })
    });

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok || !data?.success) {
      alert(data?.error || "Error al procesar la compra");
      return;
    }

    alert("Compra registrada exitosamente");
    clearCart();
  } catch (err) {
    console.error(err);
    alert("No se pudo conectar con el servidor");
  }
});

// -----------------------
// VARIABLES GLOBALES PARA FILTROS
// -----------------------
let allProducts = [];
let filteredProducts = [];

// -----------------------
// CARGAR PRODUCTOS DESDE MONGO  (GET /api/products)
// -----------------------
async function cargarProductos() {
  const contenedor = document.getElementById("productos");
  if (!contenedor) return;

  contenedor.innerHTML = `<p class="muted">Cargando...</p>`;

  try {
    const res = await fetch("/api/products");
    const productos = await res.json();

    if (!Array.isArray(productos)) {
      contenedor.innerHTML = `<p class="muted">No se pudo cargar el catálogo.</p>`;
      return;
    }

    if (productos.length === 0) {
      contenedor.innerHTML = `<p class="muted">No hay cervezas en la base de datos.</p>`;
      return;
    }

    allProducts = productos;
    filteredProducts = productos;
    renderProducts(filteredProducts);
  } catch (err) {
    console.error(err);
    contenedor.innerHTML = `<p class="muted">Error cargando cervezas.</p>`;
  }
}

// -----------------------
// RENDERIZAR PRODUCTOS
// -----------------------
function renderProducts(products) {
  const contenedor = document.getElementById("productos");
  if (!contenedor) return;

  contenedor.innerHTML = "";

  if (products.length === 0) {
    contenedor.innerHTML = `<p class="muted">No se encontraron cervezas con ese criterio.</p>`;
    return;
  }

  products.forEach(p => {
    contenedor.insertAdjacentHTML("beforeend", `
      <article class="card">
        <figure class="card-media">
          <img src="${p.image || "css/img/IPA.png"}" alt="${p.name}" class="beer-img" />
        </figure>

        <div class="card-body">
          <h3 class="card-title">${p.name}</h3>

          <div class="card-meta">
            <span class="badge">${p.description || ""}</span>
            <span class="price">$${money(p.price)}</span>
          </div>

          <div class="card-actions">
            <button
              class="btn primary add-to-cart"
              data-id="${p._id}"
              data-name="${p.name}"
              data-price="${p.price}">
              Añadir
            </button>
          </div>
        </div>
      </article>
    `);
  });
}

// -----------------------
// FILTROS (BÚSQUEDA Y SABOR)
// -----------------------
function applyFilters() {
  const searchValue = document.getElementById("search")?.value.toLowerCase().trim() || "";
  const styleValue = document.getElementById("filterStyle")?.value || "";

  filteredProducts = allProducts.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchValue) || 
                       (p.description || "").toLowerCase().includes(searchValue);
    
    const matchStyle = !styleValue || (p.description || "").includes(styleValue);

    return matchSearch && matchStyle;
  });

  renderProducts(filteredProducts);
}

// Event listeners para filtros
document.getElementById("search")?.addEventListener("input", applyFilters);
document.getElementById("filterStyle")?.addEventListener("change", applyFilters);

// Delegación: añadir al carrito (importante que exista #productos)
document.getElementById("productos")?.addEventListener("click", (e) => {
  const btn = e.target.closest(".add-to-cart");
  if (!btn) return;

  addToCart({
    productId: btn.dataset.id,
    name: btn.dataset.name,
    price: Number(btn.dataset.price)
  });
});

// -----------------------
// MODAL / FOOTER AÑO / MENÚ MÓVIL
// -----------------------
const modal = document.getElementById("detailsModal");
modal?.querySelector(".close")?.addEventListener("click", () => {
  modal.setAttribute("aria-hidden", "true");
});
modal?.addEventListener("click", (e) => {
  if (e.target === modal) modal.setAttribute("aria-hidden", "true");
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") modal?.setAttribute("aria-hidden", "true");
});

const y = document.getElementById("year");
if (y) y.textContent = new Date().getFullYear();

const toggle = document.querySelector(".nav-toggle");
const menu = document.getElementById("primary-menu");
if (toggle && menu) {
  toggle.addEventListener("click", () => {
    const expanded = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!expanded));
    menu.classList.toggle("open", !expanded);
  });
}

// Init
cargarProductos();
renderCart();

//Ocultar opcion del admin para usuarios normales
document.addEventListener('DOMContentLoaded', () => {
  // Obtener usuario de la sesión
  const user = JSON.parse(sessionStorage.getItem('user'));
  
  // Seleccionar el link de Admin
  const adminLink = document.querySelector('a[href="admin.html"]');

  // Mostrar solo si el usuario es admin
  if (user?.role === 'admin') {
    adminLink.style.display = 'inline-block';
  } else {
    adminLink.style.display = 'none';
  }
});
