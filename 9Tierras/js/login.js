/*----------------------------
  Activación de las tarjetas
-----------------------------*/
const container = document.querySelector('.container');
const registroBtn = document.querySelector('.registro-btn');
const loginBtn = document.querySelector('.login-btn');

registroBtn.addEventListener('click', () => {
  container.classList.add('active');
});

loginBtn.addEventListener('click', () => {
  container.classList.remove('active');
});


/* ==========================
   LOGIN
========================== */
const loginForm = document.getElementById("loginForm");

loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value.trim();
    const error = document.getElementById("loginError");

    error.textContent = "";

    try {
        const resp = await fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const data = await resp.json();

        if (data.ok) {
            // Guardar usuario en sessionStorage
            sessionStorage.setItem('user', JSON.stringify({ email: data.email, role: data.role }));

            // Redirigir al index
            window.location.href = "index.html";
        } else {
            error.textContent = data.error || "Credenciales incorrectas";
        }
    } catch (e) {
        console.error(e);
        error.textContent = "Error de conexión con el servidor.";
    }
});



/* ==========================
   REGISTRO
========================== */
const registerForm = document.getElementById("registerForm");

registerForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nombre = document.getElementById("regNombre").value.trim();
    const correo = document.getElementById("regCorreo").value.trim();
    const password = document.getElementById("regPassword").value.trim();
    const confirm = document.getElementById("regConfirm").value.trim();

    const error = document.getElementById("registerError");
    const ok = document.getElementById("registerOk");

    error.textContent = "";
    ok.textContent = "";

    if (password !== confirm) {
        error.textContent = "Las contraseñas no coinciden.";
        return;
    }

    try {
        const resp = await fetch("/api/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ nombre, correo, password })

        });

        const data = await resp.json();

        if (data.ok) {
            ok.textContent = "Usuario registrado, ahora inicia sesión.";
            registerForm.reset();
        } else {
            error.textContent = data.error || "No se pudo registrar.";
        }
    } catch (e) {
        console.error(e);
        error.textContent = "Error de conexión con el servidor.";
    }
});


