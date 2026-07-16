const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { query, one, ping, rowToApi } = require("./mysql");
const app = express();
const PORT = process.env.PORT || 3015;
app.use(cors());
app.use(express.json());
app.get("/health", async (req, res) => {
  try {
    await ping();
    res.json({
      status: "OK",
      service: "vendor-cart-service",
      mysql: "connected",
    });
  } catch (e) {
    res.status(503).json({ status: "DEGRADED", mysql: "disconnected" });
  }
});
app.get("/vendor/cart/:vendorId", async (req, res) => {
  try {
    const rows = await query(
      "SELECT id AS _id,id,vendorId,productId,nombre,precio,cantidad,imagen,createdAt,updatedAt FROM vendor_cart WHERE vendorId=? ORDER BY createdAt DESC",
      [req.params.vendorId],
    );
    res.json(rows.map(rowToApi));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.post("/vendor/cart", async (req, res) => {
  try {
    const {
      vendorId,
      productId,
      nombre,
      precio,
      cantidad = 1,
      imagen = "",
    } = req.body;
    if (!vendorId || !productId || !nombre || precio === undefined)
      return res.status(400).json({ error: "Faltan datos requeridos" });
    await query(
      "INSERT INTO vendor_cart (vendorId,productId,nombre,precio,cantidad,imagen) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE cantidad=cantidad+VALUES(cantidad), updatedAt=CURRENT_TIMESTAMP",
      [vendorId, productId, nombre, precio, cantidad, imagen],
    );
    const item = await one(
      "SELECT id AS _id,id,vendorId,productId,nombre,precio,cantidad,imagen,createdAt,updatedAt FROM vendor_cart WHERE vendorId=? AND productId=?",
      [vendorId, productId],
    );
    res.status(201).json(rowToApi(item));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.put("/vendor/cart/:itemId", async (req, res) => {
  try {
    const { cantidad } = req.body;
    const r = await query(
      "UPDATE vendor_cart SET cantidad=?, updatedAt=CURRENT_TIMESTAMP WHERE id=?",
      [cantidad, req.params.itemId],
    );
    if (!r.affectedRows)
      return res.status(404).json({ error: "Item no encontrado" });
    const item = await one(
      "SELECT id AS _id,id,vendorId,productId,nombre,precio,cantidad,imagen,createdAt,updatedAt FROM vendor_cart WHERE id=?",
      [req.params.itemId],
    );
    res.json(rowToApi(item));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.delete("/vendor/cart/:itemId", async (req, res) => {
  try {
    const r = await query("DELETE FROM vendor_cart WHERE id=?", [
      req.params.itemId,
    ]);
    if (!r.affectedRows)
      return res.status(404).json({ error: "Item no encontrado" });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.delete("/vendor/cart/:vendorId/clear", async (req, res) => {
  try {
    await query("DELETE FROM vendor_cart WHERE vendorId=?", [
      req.params.vendorId,
    ]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.listen(PORT, "0.0.0.0", () =>
  console.log(`✅ Vendor Cart Service MySQL running on port ${PORT}`),
);
