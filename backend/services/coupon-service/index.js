const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { query, one, ping, bool, rowToApi } = require("./mysql");

const app = express();
const PORT = Number(process.env.PORT || 3012);
app.use(cors());
app.use(express.json({ limit: "512kb" }));

const cleanCode = (value) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 50);
const cleanText = (value, max = 500) =>
  String(value || "")
    .trim()
    .replace(/[<>`{}]/g, "")
    .slice(0, max);
const asNumber = (value, fallback = 0) =>
  Number.isFinite(Number(value)) ? Number(value) : fallback;
const fmt = (row) =>
  row ? { ...rowToApi(row), active: bool(row.active) } : row;

async function ensureSchema() {
  await query(`CREATE TABLE IF NOT EXISTS coupons (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    type ENUM('percentage','fixed') NOT NULL,
    value DECIMAL(12,2) NOT NULL,
    minPurchase DECIMAL(12,2) DEFAULT 0,
    maxDiscount DECIMAL(12,2) NULL,
    expiresAt DATETIME NOT NULL,
    usageLimit INT DEFAULT 1,
    usedCount INT DEFAULT 0,
    active TINYINT(1) DEFAULT 1,
    description TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);

  try {
    await query(
      "ALTER TABLE coupons ADD COLUMN updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
    );
  } catch (error) {
    if (!/Duplicate column/i.test(error.message)) throw error;
  }
}

async function createDefaultCoupons() {
  const days = (amount) => new Date(Date.now() + amount * 86400000);
  const defaults = [
    [
      "BYTE10",
      "percentage",
      10,
      100,
      null,
      days(30),
      100,
      "10% de descuento en compras mayores a S/ 100",
    ],
    [
      "BYTE25",
      "percentage",
      25,
      500,
      200,
      days(15),
      50,
      "25% de descuento en compras mayores a S/ 500 (máximo S/ 200)",
    ],
    [
      "BYTEFREE",
      "fixed",
      50,
      200,
      null,
      days(7),
      30,
      "S/ 50 de descuento en compras mayores a S/ 200",
    ],
  ];
  for (const coupon of defaults) {
    await query(
      "INSERT IGNORE INTO coupons (code,type,value,minPurchase,maxDiscount,expiresAt,usageLimit,description,active) VALUES (?,?,?,?,?,?,?,?,1)",
      coupon,
    );
  }
}

function validatePayload(body, { partial = false } = {}) {
  const code = cleanCode(body.code);
  const type = String(body.type || "").toLowerCase();
  const value = asNumber(body.value, NaN);
  const minPurchase = Math.max(0, asNumber(body.minPurchase, 0));
  const maxDiscount =
    body.maxDiscount === null ||
    body.maxDiscount === "" ||
    body.maxDiscount === undefined
      ? null
      : Math.max(0, asNumber(body.maxDiscount, 0));
  const usageLimit = Math.max(1, Math.floor(asNumber(body.usageLimit, 1)));
  const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;

  if (!partial || body.code !== undefined) {
    if (code.length < 3)
      return { error: "El código debe tener al menos 3 caracteres" };
  }
  if (!partial || body.type !== undefined) {
    if (!["percentage", "fixed"].includes(type))
      return { error: "Tipo de descuento inválido" };
  }
  if (!partial || body.value !== undefined) {
    if (!Number.isFinite(value) || value <= 0)
      return { error: "El valor del descuento debe ser mayor que cero" };
    if (type === "percentage" && value > 100)
      return { error: "El porcentaje no puede superar el 100%" };
  }
  if (!partial || body.expiresAt !== undefined) {
    if (!expiresAt || Number.isNaN(expiresAt.getTime()))
      return { error: "Fecha de vencimiento inválida" };
  }

  return {
    data: {
      code,
      type,
      value,
      minPurchase,
      maxDiscount,
      expiresAt,
      usageLimit,
      active: body.active === undefined ? true : Boolean(body.active),
      description: cleanText(body.description),
    },
  };
}

const selectColumns =
  "id AS _id,id,code,type,value,minPurchase,maxDiscount,expiresAt,usageLimit,usedCount,active,description,createdAt,updatedAt";

app.get("/coupons", async (req, res) => {
  try {
    let sql = `SELECT ${selectColumns} FROM coupons`;
    if (req.query.active === "true")
      sql += " WHERE active=1 AND expiresAt>NOW() AND usedCount<usageLimit";
    sql += " ORDER BY active DESC, expiresAt ASC, createdAt DESC";
    res.json((await query(sql)).map(fmt));
  } catch (error) {
    console.error("List coupons:", error);
    res.status(500).json({ error: "No se pudieron cargar las promociones" });
  }
});

app.get("/coupons/:code", async (req, res) => {
  try {
    const coupon = await one(
      `SELECT ${selectColumns} FROM coupons WHERE code=? AND active=1 AND expiresAt>NOW()`,
      [cleanCode(req.params.code)],
    );
    if (!coupon)
      return res.status(404).json({ error: "Cupón no encontrado o expirado" });
    if (Number(coupon.usedCount) >= Number(coupon.usageLimit))
      return res.status(400).json({ error: "Cupón agotado" });
    res.json(fmt(coupon));
  } catch (error) {
    res.status(500).json({ error: "No se pudo consultar el cupón" });
  }
});

app.post("/coupons/validate", async (req, res) => {
  try {
    const code = cleanCode(req.body.code);
    const subtotal = Math.max(0, asNumber(req.body.subtotal, 0));
    if (!code)
      return res.status(400).json({ valid: false, error: "Código requerido" });
    const coupon = await one(
      "SELECT * FROM coupons WHERE code=? AND active=1 AND expiresAt>NOW()",
      [code],
    );
    if (!coupon)
      return res.json({ valid: false, error: "Cupón no válido o vencido" });
    if (Number(coupon.usedCount) >= Number(coupon.usageLimit))
      return res.json({ valid: false, error: "Cupón agotado" });
    if (subtotal < Number(coupon.minPurchase || 0)) {
      return res.json({
        valid: false,
        error: `Compra mínima: S/ ${Number(coupon.minPurchase).toFixed(2)}`,
      });
    }
    let discount =
      coupon.type === "percentage"
        ? (subtotal * Number(coupon.value)) / 100
        : Number(coupon.value);
    if (coupon.maxDiscount !== null)
      discount = Math.min(discount, Number(coupon.maxDiscount));
    discount = Number(Math.min(discount, subtotal).toFixed(2));
    res.json({
      valid: true,
      discount,
      code: coupon.code,
      description: coupon.description,
    });
  } catch (error) {
    console.error("Validate coupon:", error);
    res
      .status(500)
      .json({ valid: false, error: "No se pudo validar la promoción" });
  }
});

app.post("/coupons/:code/use", async (req, res) => {
  try {
    const code = cleanCode(req.params.code);
    const coupon = await one("SELECT * FROM coupons WHERE code=?", [code]);
    if (!coupon) return res.status(404).json({ error: "Cupón no encontrado" });
    if (!coupon.active || new Date(coupon.expiresAt) <= new Date())
      return res.status(409).json({ error: "Cupón no vigente" });
    if (Number(coupon.usedCount) >= Number(coupon.usageLimit))
      return res.status(409).json({ error: "Cupón agotado" });
    await query(
      "UPDATE coupons SET usedCount=usedCount+1, active=IF(usedCount+1>=usageLimit,0,active) WHERE code=?",
      [code],
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "No se pudo registrar el uso del cupón" });
  }
});

app.post("/coupons", async (req, res) => {
  try {
    const validation = validatePayload(req.body);
    if (validation.error)
      return res.status(400).json({ error: validation.error });
    const body = validation.data;
    const result = await query(
      "INSERT INTO coupons (code,type,value,minPurchase,maxDiscount,expiresAt,usageLimit,usedCount,active,description) VALUES (?,?,?,?,?,?,?,?,?,?)",
      [
        body.code,
        body.type,
        body.value,
        body.minPurchase,
        body.maxDiscount,
        body.expiresAt,
        body.usageLimit,
        0,
        body.active ? 1 : 0,
        body.description,
      ],
    );
    res
      .status(201)
      .json(
        fmt(
          await one(`SELECT ${selectColumns} FROM coupons WHERE id=?`, [
            result.insertId,
          ]),
        ),
      );
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY")
      return res
        .status(409)
        .json({ error: "Ya existe un cupón con ese código" });
    console.error("Create coupon:", error);
    res.status(500).json({ error: "No se pudo crear la promoción" });
  }
});

app.put("/coupons/:id", async (req, res) => {
  try {
    const current = await one("SELECT * FROM coupons WHERE id=?", [
      req.params.id,
    ]);
    if (!current)
      return res.status(404).json({ error: "Promoción no encontrada" });
    const validation = validatePayload({ ...current, ...req.body });
    if (validation.error)
      return res.status(400).json({ error: validation.error });
    const body = validation.data;
    await query(
      "UPDATE coupons SET code=?,type=?,value=?,minPurchase=?,maxDiscount=?,expiresAt=?,usageLimit=?,active=?,description=? WHERE id=?",
      [
        body.code,
        body.type,
        body.value,
        body.minPurchase,
        body.maxDiscount,
        body.expiresAt,
        body.usageLimit,
        body.active ? 1 : 0,
        body.description,
        req.params.id,
      ],
    );
    res.json(
      fmt(
        await one(`SELECT ${selectColumns} FROM coupons WHERE id=?`, [
          req.params.id,
        ]),
      ),
    );
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY")
      return res
        .status(409)
        .json({ error: "Ya existe un cupón con ese código" });
    console.error("Update coupon:", error);
    res.status(500).json({ error: "No se pudo actualizar la promoción" });
  }
});

app.delete("/coupons/:id", async (req, res) => {
  try {
    const result = await query("DELETE FROM coupons WHERE id=?", [
      req.params.id,
    ]);
    if (!result.affectedRows)
      return res.status(404).json({ error: "Promoción no encontrada" });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "No se pudo eliminar la promoción" });
  }
});

app.get("/health", async (req, res) => {
  try {
    await ping();
    res.json({ status: "OK", service: "coupon-service", mysql: "connected" });
  } catch {
    res.status(503).json({ status: "DEGRADED", mysql: "disconnected" });
  }
});

ensureSchema()
  .then(createDefaultCoupons)
  .then(() =>
    app.listen(PORT, "0.0.0.0", () =>
      console.log(`Coupon Service MySQL running on port ${PORT}`),
    ),
  )
  .catch((error) => {
    console.error("Coupon Service startup:", error);
    process.exit(1);
  });
