const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { query, one, ping, bool, rowToApi } = require("./mysql");
const app = express();
const PORT = process.env.PORT || 3014;
app.use(cors());
app.use(express.json());
async function createDefaultCategories() {
  const cats = [
    ["Laptops", "Laptops y portátiles", "💻"],
    ["Smartphones", "Teléfonos inteligentes", "📱"],
    ["Tablets", "Tablets y iPads", "📋"],
    ["Accesorios", "Accesorios tecnológicos", "🎧"],
    ["Audio", "Audífonos y parlantes", "🔊"],
    ["Gaming", "Productos para gaming", "🎮"],
    ["Smartwatches", "Relojes inteligentes", "⌚"],
    ["Cámaras", "Cámaras y fotografía", "📷"],
    ["Almacenamiento", "Discos y memorias", "💾"],
  ];
  for (const c of cats) {
    await query(
      "INSERT IGNORE INTO categories (nombre,descripcion,icono,activo) VALUES (?,?,?,1)",
      c,
    );
  }
}
app.get("/health", async (req, res) => {
  try {
    await ping();
    res.json({
      status: "OK",
      service: "categories-service",
      mysql: "connected",
    });
  } catch (e) {
    res.status(503).json({ status: "DEGRADED", mysql: "disconnected" });
  }
});
app.get("/categories", async (req, res) => {
  try {
    const params = [];
    let sql =
      "SELECT id AS _id,id,nombre,descripcion,icono,activo,createdAt,updatedAt FROM categories";
    if (req.query.activo !== undefined) {
      sql += " WHERE activo=?";
      params.push(req.query.activo === "true" ? 1 : 0);
    }
    sql += " ORDER BY nombre ASC";
    const rows = await query(sql, params);
    res.json(rows.map((r) => ({ ...rowToApi(r), activo: bool(r.activo) })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.get("/categories/:id", async (req, res) => {
  try {
    const r = await one(
      "SELECT id AS _id,id,nombre,descripcion,icono,activo,createdAt,updatedAt FROM categories WHERE id=?",
      [req.params.id],
    );
    if (!r) return res.status(404).json({ error: "Categoría no encontrada" });
    res.json({ ...rowToApi(r), activo: bool(r.activo) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.post("/categories", async (req, res) => {
  try {
    const { nombre, descripcion = "", icono = "📂", activo = true } = req.body;
    if (!nombre || !String(nombre).trim())
      return res.status(400).json({ error: "El nombre es requerido" });
    const exists = await one("SELECT id FROM categories WHERE nombre=?", [
      String(nombre).trim(),
    ]);
    if (exists)
      return res.status(400).json({ error: "La categoría ya existe" });
    const result = await query(
      "INSERT INTO categories (nombre,descripcion,icono,activo) VALUES (?,?,?,?)",
      [String(nombre).trim(), descripcion, icono, activo ? 1 : 0],
    );
    const r = await one(
      "SELECT id AS _id,id,nombre,descripcion,icono,activo,createdAt,updatedAt FROM categories WHERE id=?",
      [result.insertId],
    );
    res.status(201).json({ ...rowToApi(r), activo: bool(r.activo) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.put("/categories/:id", async (req, res) => {
  try {
    const old = await one("SELECT id FROM categories WHERE id=?", [
      req.params.id,
    ]);
    if (!old) return res.status(404).json({ error: "Categoría no encontrada" });
    const { nombre, descripcion, icono, activo } = req.body;
    await query(
      "UPDATE categories SET nombre=COALESCE(?,nombre), descripcion=COALESCE(?,descripcion), icono=COALESCE(?,icono), activo=COALESCE(?,activo) WHERE id=?",
      [
        nombre ? String(nombre).trim() : null,
        descripcion ?? null,
        icono ?? null,
        activo === undefined ? null : activo ? 1 : 0,
        req.params.id,
      ],
    );
    const r = await one(
      "SELECT id AS _id,id,nombre,descripcion,icono,activo,createdAt,updatedAt FROM categories WHERE id=?",
      [req.params.id],
    );
    res.json({ ...rowToApi(r), activo: bool(r.activo) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.delete("/categories/:id", async (req, res) => {
  try {
    const result = await query("DELETE FROM categories WHERE id=?", [
      req.params.id,
    ]);
    if (!result.affectedRows)
      return res.status(404).json({ error: "Categoría no encontrada" });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
createDefaultCategories()
  .then(() =>
    app.listen(PORT, "0.0.0.0", () =>
      console.log(`✅ Categories Service MySQL running on port ${PORT}`),
    ),
  )
  .catch((e) => console.error(e));
