const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { query, one, ping, bool, toJson, rowToApi } = require("./mysql");
const app = express();
const PORT = process.env.PORT || 3010;
app.use(cors());
app.use(express.json());
const fmt = (r) =>
  r
    ? {
        ...rowToApi(r),
        images: toJson(r.images, []),
        verifiedPurchase: bool(r.verifiedPurchase),
      }
    : r;
app.get("/reviews", async (req, res) => {
  try {
    const params = [];
    let sql =
      "SELECT id AS _id,id,productId,userId,userName,rating,title,comment,images,verifiedPurchase,likes,createdAt,updatedAt FROM reviews";
    if (req.query.productId) {
      sql += " WHERE productId=?";
      params.push(req.query.productId);
    }
    sql += " ORDER BY createdAt DESC";
    res.json((await query(sql, params)).map(fmt));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.get("/reviews/:id", async (req, res) => {
  try {
    const r = await one(
      "SELECT id AS _id,id,productId,userId,userName,rating,title,comment,images,verifiedPurchase,likes,createdAt,updatedAt FROM reviews WHERE id=?",
      [req.params.id],
    );
    if (!r) return res.status(404).json({ error: "Review no encontrada" });
    res.json(fmt(r));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.post("/reviews", async (req, res) => {
  try {
    const b = req.body;
    const r = await query(
      "INSERT INTO reviews (productId,userId,userName,rating,title,comment,images,verifiedPurchase) VALUES (?,?,?,?,?,?,?,?)",
      [
        b.productId,
        b.userId,
        b.userName,
        b.rating,
        b.title || "",
        b.comment || "",
        JSON.stringify(b.images || []),
        b.verifiedPurchase ? 1 : 0,
      ],
    );
    const item = await one(
      "SELECT id AS _id,id,productId,userId,userName,rating,title,comment,images,verifiedPurchase,likes,createdAt,updatedAt FROM reviews WHERE id=?",
      [r.insertId],
    );
    res.status(201).json(fmt(item));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.put("/reviews/:id", async (req, res) => {
  try {
    const old = await one("SELECT id FROM reviews WHERE id=?", [req.params.id]);
    if (!old) return res.status(404).json({ error: "Review no encontrada" });
    const b = req.body;
    await query(
      "UPDATE reviews SET productId=COALESCE(?,productId), userId=COALESCE(?,userId), userName=COALESCE(?,userName), rating=COALESCE(?,rating), title=COALESCE(?,title), comment=COALESCE(?,comment), images=COALESCE(?,images), verifiedPurchase=COALESCE(?,verifiedPurchase), updatedAt=CURRENT_TIMESTAMP WHERE id=?",
      [
        b.productId ?? null,
        b.userId ?? null,
        b.userName ?? null,
        b.rating ?? null,
        b.title ?? null,
        b.comment ?? null,
        b.images ? JSON.stringify(b.images) : null,
        b.verifiedPurchase === undefined ? null : b.verifiedPurchase ? 1 : 0,
        req.params.id,
      ],
    );
    const item = await one(
      "SELECT id AS _id,id,productId,userId,userName,rating,title,comment,images,verifiedPurchase,likes,createdAt,updatedAt FROM reviews WHERE id=?",
      [req.params.id],
    );
    res.json(fmt(item));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.delete("/reviews/:id", async (req, res) => {
  try {
    const r = await query("DELETE FROM reviews WHERE id=?", [req.params.id]);
    if (!r.affectedRows)
      return res.status(404).json({ error: "Review no encontrada" });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.post("/reviews/:id/like", async (req, res) => {
  try {
    await query("UPDATE reviews SET likes=likes+1 WHERE id=?", [req.params.id]);
    const item = await one(
      "SELECT id AS _id,id,productId,userId,userName,rating,title,comment,images,verifiedPurchase,likes,createdAt,updatedAt FROM reviews WHERE id=?",
      [req.params.id],
    );
    if (!item) return res.status(404).json({ error: "Review no encontrada" });
    res.json(fmt(item));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.get("/reviews/product/:productId/average", async (req, res) => {
  try {
    const r = await one(
      "SELECT AVG(rating) average, COUNT(*) count FROM reviews WHERE productId=?",
      [req.params.productId],
    );
    res.json({ average: Number(r.average || 0), count: Number(r.count || 0) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.get("/health", async (req, res) => {
  try {
    await ping();
    res.json({ status: "OK", service: "review-service", mysql: "connected" });
  } catch (e) {
    res.status(503).json({ status: "DEGRADED", mysql: "disconnected" });
  }
});
app.listen(PORT, "0.0.0.0", () =>
  console.log(`✅ Review Service MySQL running on port ${PORT}`),
);
