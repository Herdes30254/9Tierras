/* ==========================================================
   MAIN.JS - Formularios conectados a backend (Mongo)
   - Contacto -> POST /api/contact
   - Reserva  -> POST /api/reservas
   - Suscribir -> POST /api/contact (type: 'subscribe')
========================================================== */

/* -------------------------
   Helpers: alert visual
   ------------------------- */
function showAlert(message, type = 'info') {
  // type: info | success | error
  // implementación simple: alert() pero la dejamos lista para un toast
  if (type === 'error') {
    alert('Error: ' + message);
  } else {
    alert(message);
  }
}

/* ==========================================================
   1. Scroll suave en enlaces internos
========================================================== */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', e => {
    const href = anchor.getAttribute('href');
    const target = document.querySelector(href);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth' });
  });
});

/* ==========================================================
   2. Suscripción (envía email al backend)
   🔥 CORREGIDO: Ahora busca el formulario correctamente
========================================================== */
const subscribeForm = document.getElementById('subscribeForm');

if (subscribeForm) {
  subscribeForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // 🔥 Evita que recargue la página

    const emailInput = subscribeForm.querySelector('input[type="email"]');
    const submitBtn = subscribeForm.querySelector('button[type="submit"]');
    
    if (!emailInput) {
      console.error('❌ No se encontró el input de email');
      return;
    }

    const email = emailInput.value.trim();

    if (!email) {
      showAlert('Por favor ingresa un correo válido.', 'error');
      return;
    }

    // Validación básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showAlert('El formato del correo no es válido.', 'error');
      return;
    }

    // Deshabilitar botón mientras procesa
    submitBtn.disabled = true;
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Enviando...';

    try {
      const resp = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          correo: email, 
          type: 'subscribe' 
        })
      });

      const data = await resp.json();

      if (data.success) {
        showAlert('¡Gracias por suscribirte! 🎉', 'success');
        emailInput.value = ''; // Limpiar el input
      } else {
        showAlert(data.message || 'No se pudo completar la suscripción. Intenta más tarde.', 'error');
      }
    } catch (err) {
      console.error('❌ Error de conexión:', err);
      showAlert('Error de red. Por favor verifica tu conexión e intenta de nuevo.', 'error');
    } finally {
      // Restaurar botón
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
}

/* ==========================================================
   3. Formulario de Contacto
   Endpoint: POST /api/contact
========================================================== */
const contactForm = document.getElementById('contactForm');

contactForm?.addEventListener('submit', async e => {
  e.preventDefault();

  const nombre = contactForm.nombre?.value?.trim();
  const correo = contactForm.correo?.value?.trim();
  const mensaje = contactForm.mensaje?.value?.trim();

  // Validaciones
  if (!nombre || !correo || !mensaje) {
    showAlert('Por favor completa todos los campos.', 'error');
    return;
  }

  // Validar formato de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(correo)) {
    showAlert('Por favor ingresa un correo electrónico válido.', 'error');
    return;
  }

  // Validar longitud mínima
  if (nombre.length < 2) {
    showAlert('El nombre debe tener al menos 2 caracteres.', 'error');
    return;
  }

  if (mensaje.length < 10) {
    showAlert('El mensaje debe tener al menos 10 caracteres.', 'error');
    return;
  }

  const submitBtn = contactForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Enviando...';

  try {
    const resp = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, correo, mensaje })
    });

    const data = await resp.json();
    if (data.success) {
      showAlert(`¡Gracias ${nombre}! Te contactaremos pronto. 📧`, 'success');
      contactForm.reset();
    } else {
      showAlert(data.message || 'Error al enviar el formulario.', 'error');
    }
  } catch (err) {
    console.error(err);
    showAlert('Error de red. Intenta más tarde.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Enviar';
  }
});

/* ==========================================================
   4. Formulario de Reservas
   Endpoint: POST /api/reservas
========================================================== */
const reservaForm = document.getElementById('reservaForm');

reservaForm?.addEventListener('submit', async e => {
  e.preventDefault();

  const nombre = reservaForm.nombre?.value?.trim();
  const correo = reservaForm.correo?.value?.trim();
  const fecha = reservaForm.fecha?.value?.trim();
  const hora = reservaForm.hora?.value?.trim();
  const personas = reservaForm.personas?.value?.trim();

  if (!nombre || !correo || !fecha || !hora || !personas) {
    showAlert('Por favor completa todos los campos de la reserva.', 'error');
    return;
  }

  const submitBtn = reservaForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Enviando reserva...';

  try {
    const resp = await fetch('/api/reservas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, correo, fecha, hora, personas: Number(personas) })
    });

    const data = await resp.json();
    if (data.success) {
      showAlert(`¡Reserva confirmada! 🎉 Recibirás un correo de confirmación.`, 'success');
      reservaForm.reset();
    } else {
      showAlert(data.message || 'Error al enviar la reserva.', 'error');
    }
  } catch (err) {
    console.error(err);
    showAlert('Error de red. Intenta más tarde.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Reservar';
  }
});

/* ==========================================================
   5. Modal Detalles de Productos (mejor accesibilidad)
========================================================== */
const detailsBtns = document.querySelectorAll(".details-btn");
const modal = document.getElementById("detailsModal");
const modalTitle = document.getElementById("modalTitle");
const modalDescription = document.getElementById("modalDescription");
const closeModalBtn = modal?.querySelector(".close");

detailsBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    const product = btn.dataset.product || 'Producto';
    const details = btn.dataset.details || 'Sin descripción.';
    modal?.setAttribute('aria-hidden', 'false');
    modal?.style && (modal.style.display = 'flex');
    modalTitle && (modalTitle.textContent = product);
    modalDescription && (modalDescription.textContent = details);
  });
});

closeModalBtn?.addEventListener("click", () => {
  modal?.setAttribute('aria-hidden', 'true');
  modal?.style && (modal.style.display = 'none');
});

window.addEventListener("click", e => {
  if (e.target === modal) {
    modal?.setAttribute('aria-hidden', 'true');
    modal?.style && (modal.style.display = 'none');
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    modal?.setAttribute('aria-hidden', 'true');
    modal?.style && (modal.style.display = 'none');
  }
});

/* ==========================================================
   6. Menu responsive
========================================================== */
const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelector('.nav-links');

navToggle?.addEventListener('click', () => {
  navLinks?.classList.toggle('show');
});

/* ==========================================================
   7. Ocultar botón de Admin para usuarios normales
========================================================== */
document.addEventListener('DOMContentLoaded', () => {
  const user = JSON.parse(sessionStorage.getItem('user'));
  const adminLink = document.querySelector('a[href="admin.html"]');

  if (adminLink) {
    if (user?.role === 'admin') {
      adminLink.style.display = 'inline-block';
    } else {
      adminLink.style.display = 'none';
    }
  }

  // Año actual en footer
  const yearSpan = document.getElementById('year');
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }
});

console.log('✅ main.js cargado correctamente');