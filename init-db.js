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

  // ✅ ACTUALIZAR CERVEZAS (borra las viejas e inserta las nuevas)
  const beers = db.collection("beers");
  
  // Borrar todas las cervezas existentes para empezar limpio
  await beers.deleteMany({});
  console.log("🗑️  Cervezas antiguas eliminadas");

  // Insertar las cervezas correctas con sabores actualizados
  const nuevasCervezas = [
    {
      nombre: "IPA",
      estilo: "Cítrico, Tropical, Herbal",
      precio: 14012,
      img: "css/img/IPA.jpeg"
    },
    {
      nombre: "APA",
      estilo: "Cítrico, Malta",
      precio: 13000,
      img: "css/img/APA.jpeg"
    },
    {
      nombre: "Red Ale",
      estilo: "Caramelo",
      precio: 13500,
      img: "css/img/REDALE.jpeg"
    },
    {
      nombre: "Tripel",
      estilo: "Frutal, Miel",
      precio: 15000,
      img: "css/img/TRIPEL.jpeg"
    },
    {
      nombre: "Red IPA",
      estilo: "Caramelo, Resinoso",
      precio: 14500,
      img: "css/img/REDIPA.jpeg"
    },
    {
      nombre: "Smoked Porter",
      estilo: "Malta, Ahumado",
      precio: 16000,
      img: "css/img/SMOKEDPORTER.jpeg"
    }
  ];

  await beers.insertMany(nuevasCervezas);
  console.log("🍺 Cervezas actualizadas:", nuevasCervezas.length);
  
  nuevasCervezas.forEach(c => {
    console.log(`   ✅ ${c.nombre} - ${c.estilo} - $${c.precio.toLocaleString()}`);
  });

  // Usuario demo admin
  const users = db.collection("users");
  const demoEmail = "admin@9tierras.com";
  const existsUser = await users.findOne({ email: demoEmail });
  if (!existsUser) {
    await users.insertOne({ 
      email: demoEmail, 
      password: "1234", 
      role: "admin",
      createdAt: new Date() 
    });
    console.log("👤 Usuario admin creado:", demoEmail, "pass: 1234");
  } else {
    console.log("👤 Usuario admin ya existe:", demoEmail);
  }

  console.log("✅ Init-db terminado.");
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error("❌ Error init-db:", e);
  process.exit(1);
});
