require("dotenv").config();
const mongoose = require("mongoose");

async function run() {
  console.log("🚀 Iniciando init-db...");

  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.log("❌ Falta MONGO_URI en .env");
    process.exit(1);
  }

  console.log("🔌 Conectando a:", uri);

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });

  const db = mongoose.connection.db;
  console.log("✅ Conectado a DB:", db.databaseName);

  const wanted = ["beers", "carts", "contacts", "newsletter", "reservas", "users"];
  const existing = (await db.listCollections().toArray()).map(c => c.name);

  for (const name of wanted) {
    if (!existing.includes(name)) {
      await db.createCollection(name);
      console.log("📁 Colección creada:", name);
    } else {
      console.log("📌 Ya existe:", name);
    }
  }

  // Insertar cervezas demo si beers está vacía
  const beers = db.collection("beers");
  const beersCount = await beers.countDocuments();
  if (beersCount === 0) {
    await beers.insertMany([
      { nombre: "Rubia 9 Tierras", estilo: "Golden Ale", precio: 12000, img: "https://via.placeholder.com/400x300?text=Rubia+9+Tierras" },
      { nombre: "Roja 9 Tierras", estilo: "Red Ale", precio: 13000, img: "https://via.placeholder.com/400x300?text=Roja+9+Tierras" },
      { nombre: "Negra 9 Tierras", estilo: "Stout", precio: 14000, img: "https://via.placeholder.com/400x300?text=Negra+9+Tierras" }
    ]);
    console.log("🍺 Cervezas insertadas en beers");
  } else {
    console.log("🍺 beers ya tiene documentos:", beersCount);
  }

  // Usuario demo
  const users = db.collection("users");
  const demoEmail = "admin@9tierras.com";
  const existsUser = await users.findOne({ email: demoEmail });
  if (!existsUser) {
    await users.insertOne({ email: demoEmail, password: "1234", createdAt: new Date() });
    console.log("👤 Usuario demo creado:", demoEmail, "pass: 1234");
  } else {
    console.log("👤 Usuario demo ya existe:", demoEmail);
  }

  console.log("✅ Init-db terminado.");
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error("❌ Error init-db:", e);
  process.exit(1);
});
