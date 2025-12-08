require("dotenv").config();

const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const session = require("express-session"); // ✅ A)

const app = express();

// ✅ TU FRONT ESTÁ AQUÍ (carpeta doble)
const PUBLIC_DIR = path.join(__dirname, "9Tierras");

// Middlewares
app.use(cors());
app.use(express.json());

// ✅ A) Sesiones (cookie)
app.use(
  session({
    secret: process.env.SESSION_SECRET || "9tierras_secret_123",
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true }
  })
);






// Conexión Mongo
async function connectDB() {
  try {
    if (!process.env.MONGO_URI) {
      console.error("❌ Falta MONGO_URI en el archivo .env");
      process.exit(1);
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB conectado");
  } catch (err) {
    console.error("❌ Error conectando MongoDB:", err.message);
    process.exit(1);
  }
}

/** ====== MODELOS (colecciones de 9tierras) ====== **/

// beers
const ProductSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true },
    estilo: String,
    precio: { type: Number, required: true },
    img: String
  },
  { timestamps: true }
);
const Product = mongoose.model("Product", ProductSchema, "beers");

// reservas
const ReservationSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    correo: { type: String, required: true, trim: true, lowercase: true },
    fecha: { type: String, required: true },
    hora: { type: String, required: true },
    personas: { type: Number, required: true, min: 1 },
    mensaje: { type: String, default: "" }
  },
  { timestamps: true }
);
const Reservation = mongoose.model("Reservation", ReservationSchema, "reservas");

// contacts
const ContactSchema = new mongoose.Schema(
  {
    nombre: { type: String, default: null },
    correo: { type: String, required: true, trim: true, lowercase: true },
    mensaje: { type: String, default: null }
  },
  { timestamps: true }
);
const Contact = mongoose.model("Contact", ContactSchema, "contacts");

// newsletter (suscriptores)
const NewsletterSchema = new mongoose.Schema(
  {
    correo: { type: String, required: true, trim: true, lowercase: true, unique: true }
  },
  { timestamps: true }
);
const Newsletter = mongoose.model("Newsletter", NewsletterSchema, "newsletter");

// carts (órdenes/checkout)
const OrderSchema = new mongoose.Schema(
  {
    cart: [
      {
        product: String,
        price: Number,
        qty: { type: Number, default: 1 }
      }
    ],
    total: Number
  },
  { timestamps: true }
);
const Order = mongoose.model("Order", OrderSchema, "carts");



// users
const UserSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: false },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, default: "cliente" } // 🔥 Nuevo
  },
  { timestamps: true }
);

const User = mongoose.model("User", UserSchema, "users");











/** ====== B) Middleware: requireAdmin ====== **/
function requireAdmin(req, res, next) {
  if (req.session?.user?.role === "admin") return next();
  return res.status(401).json({ ok: false, error: "No autorizado" });
}

// Middleware para páginas privadas
function requireLogin(req, res, next) {
  if (req.session?.user) return next();
  return res.redirect("/"); // Si no hay sesión, va a login
}




/** ====== RUTAS API ====== **/

app.get("/api/health", (req, res) => res.json({ ok: true }));

// Productos para catalogo.js
app.get("/api/products", async (req, res) => {
  try {
    const productos = await Product.find().sort({ createdAt: -1 });
    res.json(
      productos.map(p => ({
        _id: p._id,
        name: p.nombre,
        description: p.estilo || "",
        price: p.precio,
        image: p.img || ""
      }))
    );
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al obtener products" });
  }
});

// Contacto (form contacto)
app.post("/api/contact", async (req, res) => {
  try {
    const { nombre, correo, mensaje, type } = req.body;

    if (!correo) return res.status(400).json({ success: false, message: "Correo requerido." });

    if (type === "subscribe") {
      const mail = correo.trim().toLowerCase();
      const exists = await Newsletter.findOne({ correo: mail });
      if (exists) return res.json({ success: true, message: "Ya estabas suscrito." });

      await Newsletter.create({ correo: mail });
      return res.status(201).json({ success: true });
    }

    await Contact.create({ nombre: nombre ?? null, correo, mensaje: mensaje ?? null });
    res.status(201).json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: "Error guardando contacto." });
  }
});

// Reservas
app.post("/api/reservas", async (req, res) => {
  try {
    let { nombre, correo, email, fecha, hora, personas, mensaje } = req.body;

    correo = (correo || email || "").trim().toLowerCase();
    nombre = (nombre || "").trim();
    fecha = (fecha || "").trim();
    hora = (hora || "").toString().trim();
    const personasNum = Number(personas);

    if (!nombre || !correo || !fecha || !hora || !Number.isFinite(personasNum) || personasNum < 1) {
      return res.status(400).json({ success: false, message: "Faltan campos o vienen inválidos." });
    }

    await Reservation.create({
      nombre,
      correo,
      fecha,
      hora,
      personas: personasNum,
      mensaje: (mensaje || "").toString()
    });

    return res.status(201).json({ success: true });
  } catch (e) {
    console.error("❌ ERROR RESERVA:", e);
    return res.status(500).json({ success: false, message: "Error guardando reserva", details: e.message });
  }
});

// Checkout (carrito)
app.post("/api/checkout", async (req, res) => {
  try {
    const { cart } = req.body;

    if (!Array.isArray(cart) || cart.length === 0) {
      return res.status(400).json({ success: false, error: "Carrito vacío" });
    }

    const normalizedCart = cart.map(i => ({
      product: String(i.product || i.name || ""),
      price: Number(i.price || 0),
      qty: Number(i.qty || 1)
    }));

    const total = normalizedCart.reduce((acc, i) => acc + i.price * i.qty, 0);

    const order = await Order.create({ cart: normalizedCart, total });
    return res.status(201).json({ success: true, orderId: order._id });
  } catch (e) {
    console.error("❌ ERROR CHECKOUT:", e);
    return res.status(500).json({ success: false, error: "Error registrando compra" });
  }
});



/** ====== C) Login crea sesión + Logout ====== **/

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(401).json({ ok: false, error: "Credenciales inválidas" });

    if (user.password !== password)
      return res.status(401).json({ ok: false, error: "Credenciales inválidas" });

    // 🔥 AHORA GUARDA EL ROL REAL
    req.session.user = { email: user.email, role: user.role };

    return res.json({ ok: true, email: user.email, role: user.role });
  } catch (e) {
    console.error("❌ ERROR LOGIN:", e);
    return res.status(500).json({ ok: false, error: "Error en login" });
  }
});


app.post("/api/register", async (req, res) => {
  try {
    const { nombre, correo, password } = req.body;

    if (!correo || !password)
      return res.status(400).json({ ok: false, error: "Correo y contraseña requeridos" });

    const email = correo.toLowerCase().trim();

    const exists = await User.findOne({ email });
    if (exists) return res.json({ ok: false, error: "El correo ya está registrado" });

    await User.create({
      nombre,
      email,
      password,
      role: "cliente"
    });

    return res.json({ ok: true });
  } catch (e) {
    console.error("❌ ERROR REGISTER:", e);
    return res.status(500).json({ ok: false, error: "Error registrando usuario" });
  }
});



app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});




// ===============================
//   ADMIN CRUD - BEERS (PROTEGIDO)
// ===============================

// Listar cervezas (admin)
app.get("/api/admin/beers", requireAdmin, async (req, res) => {
  try {
    const beers = await Product.find().sort({ createdAt: -1 });
    res.json({ ok: true, beers });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Error listando cervezas" });
  }
});

// Crear cerveza
app.post("/api/admin/beers", requireAdmin, async (req, res) => {
  try {
    const { nombre, estilo, precio, img } = req.body;

    if (!nombre || precio === undefined || precio === null || nombre.trim() === "") {
      return res.status(400).json({ ok: false, error: "Nombre y precio son obligatorios" });
    }

    const beer = await Product.create({
      nombre: nombre.trim(),
      estilo: (estilo || "").trim(),
      precio: Number(precio),
      img: (img || "").trim()
    });

    res.status(201).json({ ok: true, beer });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Error creando cerveza" });
  }
});

// Editar cerveza
app.put("/api/admin/beers/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, estilo, precio, img } = req.body;

    if (!nombre || precio === undefined || precio === null || nombre.trim() === "") {
      return res.status(400).json({ ok: false, error: "Nombre y precio son obligatorios" });
    }

    const beer = await Product.findByIdAndUpdate(
      id,
      {
        nombre: nombre.trim(),
        estilo: (estilo || "").trim(),
        precio: Number(precio),
        img: (img || "").trim()
      },
      { new: true }
    );

    if (!beer) return res.status(404).json({ ok: false, error: "Cerveza no encontrada" });

    res.json({ ok: true, beer });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Error editando cerveza" });
  }
});

// Eliminar cerveza
app.delete("/api/admin/beers/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Product.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ ok: false, error: "Cerveza no encontrada" });

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Error eliminando cerveza" });
  }
});

// ✅ Fallback (Express 5 compatible)
app.get("/", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "login.html"));
});

// Index privado (requiere login)
app.get("/index.html", requireLogin, (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

// ✅ Servir HTML/CSS/JS
app.use(express.static(PUBLIC_DIR));
app.use("/css", express.static(path.join(PUBLIC_DIR, "css")));
app.use("/js", express.static(path.join(PUBLIC_DIR, "js")));



// Arranque
connectDB().then(() => {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`🚀 Server listo en http://localhost:${port}`));
});
