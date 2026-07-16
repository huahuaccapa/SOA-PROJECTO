const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { query, one, ping, rowToApi } = require("./mysql");
const app = express();
const PORT = process.env.PORT || 3011;
app.use(cors());
app.use(express.json());
app.get("/wishlist/:userId", async (req, res) => {
  try {
    const rows = await query(
      "SELECT id AS _id,id,userId,productId,productName,productPrice,productImage,createdAt FROM wishlist WHERE userId=? ORDER BY createdAt DESC",
      [req.params.userId],
    );
    res.json(rows.map(rowToApi));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.post("/wishlist", async (req, res) => {
  try {
    const { userId, productId, productName, productPrice, productImage } =
      req.body;
    const exists = await one(
      "SELECT id FROM wishlist WHERE userId=? AND productId=?",
      [userId, productId],
    );
    if (exists)
      return res.status(400).json({ error: "Producto ya en wishlist" });
    const r = await query(
      "INSERT INTO wishlist (userId,productId,productName,productPrice,productImage) VALUES (?,?,?,?,?)",
      [userId, productId, productName, productPrice, productImage],
    );
    const item = await one(
      "SELECT id AS _id,id,userId,productId,productName,productPrice,productImage,createdAt FROM wishlist WHERE id=?",
      [r.insertId],
    );
    res.status(201).json(rowToApi(item));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.delete("/wishlist/:userId/:productId", async (req, res) => {
  try {
    const r = await query(
      "DELETE FROM wishlist WHERE userId=? AND productId=?",
      [req.params.userId, req.params.productId],
    );
    if (!r.affectedRows)
      return res.status(404).json({ error: "Item no encontrado" });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.delete("/wishlist/:userId", async (req, res) => {
  try {
    await query("DELETE FROM wishlist WHERE userId=?", [req.params.userId]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.get("/health", async (req, res) => {
  try {
    await ping();
    res.json({ status: "OK", service: "wishlist-service", mysql: "connected" });
  } catch (e) {
    res.status(503).json({ status: "DEGRADED", mysql: "disconnected" });
  }
});
app.listen(PORT, "0.0.0.0", () =>
  console.log(`✅ Wishlist Service MySQL running on port ${PORT}`),
);
