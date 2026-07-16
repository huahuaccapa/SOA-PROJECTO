const express = require("express");
const amqp = require("amqplib");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const PDFDocument = require("pdfkit");
const { create } = require("xmlbuilder2");
require("dotenv").config();
const { pool, query, one, ping, toJson, rowToApi } = require("./mysql");

const app = express();
const PORT = process.env.PORT || 3003;
app.use(cors());
app.use(express.json({ limit: "2mb" }));

let channel;
let rabbitRetryTimer;
const retryRabbitMQ = () => {
  if (!rabbitRetryTimer)
    rabbitRetryTimer = setTimeout(() => {
      rabbitRetryTimer = null;
      connectRabbitMQ();
    }, 5000);
};

async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect(
      process.env.RABBITMQ_URL || "amqp://rabbitmq:5672",
      { heartbeat: 15 },
    );
    connection.on("error", (error) =>
      console.error("RabbitMQ:", error.message),
    );
    connection.on("close", () => {
      channel = null;
      retryRabbitMQ();
    });
    channel = await connection.createChannel();
    await channel.assertQueue("order_events", { durable: true });
    await channel.assertQueue("realtime_events", { durable: true });
    console.log("Orders Service conectado a RabbitMQ");
  } catch (error) {
    channel = null;
    retryRabbitMQ();
  }
}

async function publish(payload) {
  if (!channel) return;
  const body = Buffer.from(JSON.stringify(payload));
  await channel.sendToQueue("order_events", body, { persistent: true });
  await channel.sendToQueue("realtime_events", body, { persistent: true });
}

function fmt(order) {
  if (!order) return order;
  return {
    ...rowToApi(order),
    _id: order.id,
    id: order.id,
    productos: toJson(order.productos, []),
    pagoDetalles: toJson(order.pagoDetalles, {}),
  };
}

function role(req) {
  return String(req.headers["x-user-role"] || "").toUpperCase();
}

function userId(req) {
  return String(req.headers["x-user-id"] || "");
}

function canRead(req, order) {
  return (
    role(req) === "ADMIN" ||
    userId(req) === String(order.compradorId) ||
    userId(req) === String(order.vendedorId)
  );
}

function cleanText(value, max = 250) {
  return String(value || "")
    .trim()
    .replace(/[<>`{}]/g, "")
    .slice(0, max);
}

function normalizeMethod(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function validatePayment(method, details = {}) {
  const normalized = normalizeMethod(method);
  if (
    ![
      "efectivo",
      "tarjeta",
      "stripe",
      "yape",
      "plin",
      "transferencia",
    ].includes(normalized)
  ) {
    return "Método de pago inválido.";
  }

  if (normalized !== "efectivo" && !details.paymentId) {
    return "El pago debe registrarse antes de crear la venta.";
  }

  if (["yape", "plin"].includes(normalized)) {
    const phone = String(details.telefono || "").replace(/\D/g, "");
    const code = String(details.codigoOperacion || "").replace(
      /[^a-zA-Z0-9-]/g,
      "",
    );
    if (!/^9\d{8}$/.test(phone))
      return "El celular de pago debe tener 9 dígitos.";
    if (code.length < 6 || code.length > 24)
      return "Código de operación inválido.";
  }

  if (normalized === "transferencia") {
    const code = String(details.codigoOperacion || "").replace(
      /[^a-zA-Z0-9-]/g,
      "",
    );
    if (!details.banco || code.length < 6)
      return "Datos de transferencia incompletos.";
  }

  if (
    normalized === "tarjeta" &&
    !/^\d{4}$/.test(String(details.tarjetaUltimos4 || ""))
  ) {
    return "Ingresa los últimos 4 dígitos de la tarjeta.";
  }

  return "";
}

function money(value) {
  return `S/ ${Number(value || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function dateText(value) {
  return new Date(value || Date.now()).toLocaleString("es-PE");
}

function addHeader(doc, title, subtitle) {
  doc.rect(0, 0, 595.28, 110).fill("#111827");
  doc
    .fillColor("#ffffff")
    .fontSize(24)
    .font("Helvetica-Bold")
    .text("BYTEVERSE", 45, 32);
  doc
    .fontSize(10)
    .font("Helvetica")
    .text("Tecnología y comercio digital", 45, 64);
  doc
    .fillColor("#111827")
    .fontSize(18)
    .font("Helvetica-Bold")
    .text(title, 45, 135);
  doc
    .fillColor("#6b7280")
    .fontSize(10)
    .font("Helvetica")
    .text(subtitle, 45, 160);
}

function documentTitle(type) {
  if (type === "ticket") return "TICKET DE VENTA";
  if (type === "factura") return "FACTURA DE VENTA";
  return "BOLETA DE VENTA";
}

function buildReceiptPdf(res, order, requestedType) {
  const type = requestedType || order.tipoComprobante || "boleta";
  const doc = new PDFDocument({ size: "A4", margin: 45 });
  const number = order.comprobanteNumero || order.boletaNumero || order.id;
  const filename = `${type}-${number}.pdf`;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  doc.pipe(res);

  addHeader(
    doc,
    documentTitle(type),
    `Documento generado el ${dateText(new Date())}`,
  );
  doc.roundedRect(375, 126, 170, 70, 8).stroke("#d1d5db");
  doc
    .fillColor("#111827")
    .font("Helvetica-Bold")
    .fontSize(10)
    .text("NÚMERO", 390, 140);
  doc.fontSize(13).text(number, 390, 160, { width: 145 });

  doc.font("Helvetica").fontSize(10).fillColor("#374151");
  doc.text(`Fecha: ${dateText(order.fecha)}`, 45, 205);
  doc.text(`Cliente: ${order.compradorNombre || "Cliente de tienda"}`, 45, 222);
  if (type === "factura") {
    doc.text(`RUC: ${order.clienteRuc || "-"}`, 45, 239);
    doc.text(`Razón social: ${order.clienteRazonSocial || "-"}`, 45, 256);
    doc.text(`Dirección fiscal: ${order.direccion || "-"}`, 45, 273, {
      width: 500,
    });
  } else {
    doc.text(`Documento: ${order.clienteDocumento || "-"}`, 45, 239);
    doc.text(`Vendedor: ${order.vendedorNombre || "ByteVerse"}`, 45, 256);
  }

  let y = type === "factura" ? 310 : 295;
  doc.rect(45, y, 500, 28).fill("#f3f4f6");
  doc.fillColor("#111827").font("Helvetica-Bold").fontSize(10);
  doc.text("Producto", 55, y + 9);
  doc.text("Cant.", 330, y + 9);
  doc.text("P. Unit.", 385, y + 9);
  doc.text("Importe", 470, y + 9);
  y += 38;

  doc.font("Helvetica").fillColor("#374151");
  for (const item of order.productos || []) {
    if (y > 680) {
      doc.addPage();
      y = 60;
    }
    doc.text(cleanText(item.nombre, 80), 55, y, { width: 260 });
    doc.text(String(item.cantidad), 340, y);
    doc.text(money(item.precio), 385, y);
    doc.text(money(Number(item.precio) * Number(item.cantidad)), 470, y);
    y += 24;
    doc
      .moveTo(55, y - 7)
      .lineTo(535, y - 7)
      .strokeColor("#e5e7eb")
      .stroke();
  }

  y += 10;
  doc.font("Helvetica").fillColor("#4b5563").text("Subtotal productos", 365, y);
  doc.text(money(order.subtotal), 470, y);
  doc.text("Descuento", 365, y + 20);
  doc.text(`-${money(order.descuento)}`, 470, y + 20);
  doc.text("IGV (18%)", 365, y + 40);
  doc.text(money(order.igv), 470, y + 40);
  doc
    .font("Helvetica-Bold")
    .fontSize(13)
    .fillColor("#111827")
    .text("TOTAL", 365, y + 66);
  doc.text(money(order.total), 470, y + 66);

  doc.roundedRect(45, y + 105, 500, 78, 8).fill("#f9fafb");
  doc
    .fillColor("#374151")
    .font("Helvetica")
    .fontSize(9)
    .text(
      `Método de pago: ${String(order.metodoPago || "").toUpperCase()}`,
      60,
      y + 122,
    );
  doc.text(`Estado: ${order.estado}`, 60, y + 140);
  doc.text(`Promoción: ${order.couponCode || "No aplicada"}`, 60, y + 158);
  doc
    .fillColor("#6b7280")
    .fontSize(8)
    .text(
      "Comprobante interno generado por ByteVerse. La emisión tributaria oficial requiere integración con un proveedor autorizado.",
      45,
      760,
      { align: "center", width: 500 },
    );
  doc.end();
}

function receiptXml(order, requestedType) {
  const type = requestedType || order.tipoComprobante || "boleta";
  const root = create({ version: "1.0", encoding: "UTF-8" }).ele(
    "ComprobanteByteVerse",
    { tipo: type, version: "2.0" },
  );
  root
    .ele("Numero")
    .txt(order.comprobanteNumero || order.boletaNumero || order.id)
    .up();
  root.ele("FechaEmision").txt(new Date(order.fecha).toISOString()).up();
  root.ele("Moneda").txt("PEN").up();
  root
    .ele("CanalVenta")
    .txt(order.canalVenta || "WEB")
    .up();
  root
    .ele("Emisor")
    .ele("Nombre")
    .txt(order.vendedorNombre || "ByteVerse")
    .up()
    .ele("Sistema")
    .txt("ByteVerse")
    .up()
    .up();
  const client = root.ele("Cliente");
  client
    .ele("Id")
    .txt(order.compradorId || "")
    .up();
  client
    .ele("Nombre")
    .txt(order.compradorNombre || "")
    .up();
  client
    .ele("Documento")
    .txt(order.clienteDocumento || "")
    .up();
  client
    .ele("RUC")
    .txt(order.clienteRuc || "")
    .up();
  client
    .ele("RazonSocial")
    .txt(order.clienteRazonSocial || "")
    .up();
  client.up();
  const items = root.ele("Items");
  (order.productos || []).forEach((item, index) => {
    items
      .ele("Item", { numero: index + 1 })
      .ele("Descripcion")
      .txt(item.nombre || "")
      .up()
      .ele("Cantidad")
      .txt(item.cantidad)
      .up()
      .ele("PrecioUnitario")
      .txt(Number(item.precio).toFixed(2))
      .up()
      .ele("Importe")
      .txt((Number(item.precio) * Number(item.cantidad)).toFixed(2))
      .up()
      .up();
  });
  items.up();
  root
    .ele("Totales")
    .ele("Subtotal")
    .txt(Number(order.subtotal).toFixed(2))
    .up()
    .ele("Descuento")
    .txt(Number(order.descuento || 0).toFixed(2))
    .up()
    .ele("IGV")
    .txt(Number(order.igv).toFixed(2))
    .up()
    .ele("Total")
    .txt(Number(order.total).toFixed(2))
    .up()
    .up();
  root
    .ele("Pago")
    .ele("Metodo")
    .txt(order.metodoPago || "")
    .up()
    .ele("Estado")
    .txt(order.pagoEstado || "")
    .up()
    .ele("Id")
    .txt(order.paymentId || "")
    .up()
    .up();
  return root.end({ prettyPrint: true });
}

async function ensureSchema() {
  // Crear la tabla si la instalación proviene de una versión anterior. En una
  // base existente CREATE TABLE IF NOT EXISTS no modifica ni elimina datos.
  await query(`CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(80) PRIMARY KEY,
    compradorId VARCHAR(80) NOT NULL,
    compradorNombre VARCHAR(180) NOT NULL,
    vendedorId VARCHAR(80) NOT NULL,
    vendedorNombre VARCHAR(180) NOT NULL,
    productos JSON NOT NULL,
    subtotal DECIMAL(12,2) DEFAULT 0,
    descuento DECIMAL(12,2) DEFAULT 0,
    igv DECIMAL(12,2) DEFAULT 0,
    total DECIMAL(12,2) DEFAULT 0,
    estado ENUM('PENDIENTE','CONFIRMADO','CANCELADO','ENVIADO','ENTREGADO') DEFAULT 'PENDIENTE',
    metodoPago VARCHAR(50) DEFAULT 'tarjeta',
    direccion TEXT,
    ciudad VARCHAR(120),
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    boletaNumero VARCHAR(50),
    comprobanteNumero VARCHAR(60),
    tipoComprobante VARCHAR(20) DEFAULT 'boleta',
    notas TEXT,
    pagoDetalles JSON NULL,
    paymentId VARCHAR(120) NULL,
    pagoEstado VARCHAR(40) DEFAULT 'PENDIENTE',
    departamento VARCHAR(120) NULL,
    provincia VARCHAR(120) NULL,
    distrito VARCHAR(120) NULL,
    couponCode VARCHAR(50) NULL,
    clienteDocumento VARCHAR(30) NULL,
    clienteRuc VARCHAR(20) NULL,
    clienteRazonSocial VARCHAR(200) NULL,
    canalVenta VARCHAR(30) DEFAULT 'WEB'
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);

  const orderAlters = [
    "ALTER TABLE orders ADD COLUMN pagoDetalles JSON NULL",
    "ALTER TABLE orders ADD COLUMN paymentId VARCHAR(120) NULL",
    "ALTER TABLE orders ADD COLUMN pagoEstado VARCHAR(40) DEFAULT 'PENDIENTE'",
    "ALTER TABLE orders ADD COLUMN departamento VARCHAR(120) NULL",
    "ALTER TABLE orders ADD COLUMN provincia VARCHAR(120) NULL",
    "ALTER TABLE orders ADD COLUMN distrito VARCHAR(120) NULL",
    "ALTER TABLE orders ADD COLUMN descuento DECIMAL(12,2) DEFAULT 0",
    "ALTER TABLE orders ADD COLUMN couponCode VARCHAR(50) NULL",
    "ALTER TABLE orders ADD COLUMN tipoComprobante VARCHAR(20) DEFAULT 'boleta'",
    "ALTER TABLE orders ADD COLUMN comprobanteNumero VARCHAR(60) NULL",
    "ALTER TABLE orders ADD COLUMN clienteDocumento VARCHAR(30) NULL",
    "ALTER TABLE orders ADD COLUMN clienteRuc VARCHAR(20) NULL",
    "ALTER TABLE orders ADD COLUMN clienteRazonSocial VARCHAR(200) NULL",
    "ALTER TABLE orders ADD COLUMN canalVenta VARCHAR(30) DEFAULT 'WEB'",
  ];
  const userAlters = [
    "ALTER TABLE users ADD COLUMN ventasRealizadas INT DEFAULT 0",
    "ALTER TABLE users ADD COLUMN totalVentas DECIMAL(12,2) DEFAULT 0.00",
  ];
  const productAlters = [
    "ALTER TABLE products ADD COLUMN categoria VARCHAR(150) DEFAULT ''",
    "ALTER TABLE products ADD COLUMN vendedorId VARCHAR(80) DEFAULT ''",
    "ALTER TABLE products ADD COLUMN vendedorNombre VARCHAR(180) DEFAULT 'ByteVerse Store'",
    "ALTER TABLE products ADD COLUMN activo TINYINT(1) DEFAULT 1",
  ];

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
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  for (const sql of [...orderAlters, ...userAlters, ...productAlters]) {
    try {
      await query(sql);
    } catch (error) {
      if (
        error.code !== "ER_DUP_FIELDNAME" &&
        !/Duplicate column/i.test(error.message)
      )
        throw error;
    }
  }
}

app.get("/health", async (req, res) => {
  try {
    await ping();
    res.json({
      status: "OK",
      service: "orders-service",
      mysql: "connected",
      rabbitmq: channel ? "connected" : "disconnected",
    });
  } catch {
    res.status(503).json({ status: "DEGRADED" });
  }
});

app.post("/orders", async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const data = req.body || {};
    if (
      !data.compradorId ||
      !Array.isArray(data.productos) ||
      !data.productos.length
    ) {
      return res
        .status(400)
        .json({ success: false, error: "Faltan datos de la venta" });
    }

    const requestRole = role(req);
    const requestUserId = userId(req);
    if (
      requestRole === "COMPRADOR" &&
      requestUserId !== String(data.compradorId)
    ) {
      return res
        .status(403)
        .json({ error: "No puedes crear pedidos para otro usuario" });
    }
    const paymentDetails = data.pagoDetalles || {};
    const paymentError = validatePayment(data.metodoPago, paymentDetails);
    if (paymentError)
      return res.status(400).json({ success: false, error: paymentError });

    const receiptType = String(data.tipoComprobante || "boleta").toLowerCase();
    if (!["boleta", "factura", "ticket"].includes(receiptType)) {
      return res.status(400).json({ error: "Tipo de comprobante inválido" });
    }
    if (receiptType === "factura") {
      const ruc = String(data.clienteRuc || "").replace(/\D/g, "");
      if (!/^\d{11}$/.test(ruc))
        return res
          .status(400)
          .json({ error: "Para factura, el RUC debe tener 11 dígitos" });
      if (cleanText(data.clienteRazonSocial, 200).length < 3)
        return res
          .status(400)
          .json({ error: "Ingresa la razón social para la factura" });
    }

    await connection.beginTransaction();

    const requestedItems = data.productos.map((item) => ({
      productId: String(item.productoId || item.id || item._id || ""),
      quantity: Math.max(1, Math.floor(Number(item.cantidad || 1))),
    }));
    const ids = [
      ...new Set(requestedItems.map((item) => item.productId).filter(Boolean)),
    ];
    if (!ids.length) throw new Error("Productos inválidos");

    const placeholders = ids.map(() => "?").join(",");
    const [databaseProducts] = await connection.execute(
      `SELECT id,nombre,precio,stock,categoria,activo,vendedorId,vendedorNombre FROM products WHERE id IN (${placeholders}) FOR UPDATE`,
      ids,
    );
    const productMap = new Map(
      databaseProducts.map((product) => [String(product.id), product]),
    );

    const products = requestedItems.map((item) => {
      const product = productMap.get(item.productId);
      if (!product || !product.activo)
        throw new Error(`El producto ${item.productId} no está disponible`);
      if (Number(product.stock) < item.quantity)
        throw new Error(`Stock insuficiente para ${product.nombre}`);
      return {
        productoId: String(product.id),
        nombre: cleanText(product.nombre, 140),
        categoria: cleanText(product.categoria, 120),
        cantidad: item.quantity,
        precio: Number(product.precio),
        vendedorId: String(product.vendedorId || ""),
        vendedorNombre: cleanText(product.vendedorNombre, 180),
      };
    });

    // Los productos pueden haber sido registrados por vendedores diferentes.
    // El vendedor del pedido representa a quien atendió la venta, no al dueño del producto:
    // - venta presencial: siempre el vendedor autenticado;
    // - compra web: ByteVerse Store;
    // - venta administrativa: permite indicar un vendedor concreto de forma explícita.
    let canonicalVendorId = "BYTEVERSE";
    let canonicalVendorName = "ByteVerse Store";
    if (requestRole === "VENDEDOR") {
      canonicalVendorId = requestUserId;
      canonicalVendorName =
        cleanText(data.vendedorNombre, 180) || "Vendedor ByteVerse";
    } else if (
      requestRole === "ADMIN" &&
      data.vendedorId &&
      String(data.vendedorId) !== "BYTEVERSE"
    ) {
      canonicalVendorId = String(data.vendedorId);
      canonicalVendorName =
        cleanText(data.vendedorNombre, 180) || "Vendedor ByteVerse";
    }

    const subtotal = products.reduce(
      (sum, item) => sum + item.precio * item.cantidad,
      0,
    );
    if (subtotal <= 0) throw new Error("Total de venta inválido");

    let discount = 0;
    let couponCode = "";
    if (data.couponCode) {
      couponCode = cleanText(data.couponCode, 50).toUpperCase();
      const [couponRows] = await connection.execute(
        "SELECT * FROM coupons WHERE code=? FOR UPDATE",
        [couponCode],
      );
      const coupon = couponRows[0];
      if (!coupon || !coupon.active || new Date(coupon.expiresAt) <= new Date())
        throw new Error("El cupón no está vigente");
      if (Number(coupon.usedCount) >= Number(coupon.usageLimit))
        throw new Error("El cupón ya agotó sus usos");
      if (subtotal < Number(coupon.minPurchase || 0))
        throw new Error(
          `Compra mínima para el cupón: ${money(coupon.minPurchase)}`,
        );
      discount =
        coupon.type === "percentage"
          ? (subtotal * Number(coupon.value)) / 100
          : Number(coupon.value);
      if (coupon.maxDiscount !== null && coupon.maxDiscount !== undefined)
        discount = Math.min(discount, Number(coupon.maxDiscount));
      discount = Math.min(subtotal, Math.max(0, discount));
      await connection.execute(
        "UPDATE coupons SET usedCount=usedCount+1, active=IF(usedCount+1>=usageLimit,0,active) WHERE id=?",
        [coupon.id],
      );
    }

    const taxableAmount = Math.max(0, subtotal - discount);
    const igv = Number((taxableAmount * 0.18).toFixed(2));
    const total = Number((taxableAmount + igv).toFixed(2));
    const id = uuidv4();
    const [serialRows] = await connection.execute(
      "SELECT COUNT(*) AS total FROM orders WHERE DATE(fecha)=CURDATE() AND tipoComprobante=?",
      [receiptType],
    );
    const prefix =
      receiptType === "factura"
        ? "F001"
        : receiptType === "ticket"
          ? "T001"
          : "B001";
    const comprobanteNumero = `${prefix}-${String(Number(serialRows[0]?.total || 0) + 1).padStart(8, "0")}`;
    const channelName =
      String(data.canalVenta || "WEB").toUpperCase() === "TIENDA"
        ? "TIENDA"
        : "WEB";
    const initialStatus =
      channelName === "TIENDA" && ["ADMIN", "VENDEDOR"].includes(requestRole)
        ? "CONFIRMADO"
        : "PENDIENTE";
    const paymentId = paymentDetails.paymentId || `cash_${uuidv4()}`;
    const paymentStatus =
      paymentDetails.estado ||
      (normalizeMethod(data.metodoPago) === "efectivo"
        ? "PAGADO"
        : "REGISTRADO");

    await connection.execute(
      `INSERT INTO orders (
        id,compradorId,compradorNombre,vendedorId,vendedorNombre,productos,subtotal,descuento,igv,total,
        estado,metodoPago,direccion,ciudad,fecha,boletaNumero,comprobanteNumero,tipoComprobante,notas,pagoDetalles,
        paymentId,pagoEstado,departamento,provincia,distrito,couponCode,clienteDocumento,clienteRuc,clienteRazonSocial,canalVenta
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW(),?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id,
        String(data.compradorId),
        cleanText(data.compradorNombre, 180) || "Cliente de tienda",
        canonicalVendorId,
        canonicalVendorName,
        JSON.stringify(products),
        subtotal,
        discount,
        igv,
        total,
        initialStatus,
        normalizeMethod(data.metodoPago),
        cleanText(data.direccion, 350),
        cleanText(data.ciudad, 120),
        comprobanteNumero,
        comprobanteNumero,
        receiptType,
        cleanText(data.notas, 350),
        JSON.stringify({ ...paymentDetails, paymentId }),
        paymentId,
        paymentStatus,
        cleanText(data.departamento, 120),
        cleanText(data.provincia, 120),
        cleanText(data.distrito, 120),
        couponCode || null,
        cleanText(data.clienteDocumento, 30),
        cleanText(data.clienteRuc, 20),
        cleanText(data.clienteRazonSocial, 200),
        channelName,
      ],
    );

    for (const item of products) {
      await connection.execute("UPDATE products SET stock=stock-? WHERE id=?", [
        item.cantidad,
        item.productoId,
      ]);
    }
    if (canonicalVendorId !== "BYTEVERSE") {
      try {
        await connection.execute(
          "UPDATE users SET ventasRealizadas=COALESCE(ventasRealizadas,0)+1,totalVentas=COALESCE(totalVentas,0)+? WHERE id=?",
          [total, canonicalVendorId],
        );
      } catch (statsError) {
        // Las métricas del vendedor son complementarias y nunca deben anular una venta válida.
        console.warn(
          "No se pudieron actualizar métricas del vendedor:",
          statsError.message,
        );
      }
    }

    await connection.commit();
    let order;
    try {
      order = fmt(await one("SELECT * FROM orders WHERE id=?", [id]));
    } catch (readError) {
      console.warn(
        "Venta registrada, pero no se pudo releer inmediatamente:",
        readError.message,
      );
      order = {
        id,
        _id: id,
        compradorId: String(data.compradorId),
        compradorNombre:
          cleanText(data.compradorNombre, 180) || "Cliente de tienda",
        vendedorId: canonicalVendorId,
        vendedorNombre: canonicalVendorName,
        productos: products,
        subtotal,
        descuento: discount,
        igv,
        total,
        estado: initialStatus,
        metodoPago: normalizeMethod(data.metodoPago),
        comprobanteNumero,
        tipoComprobante: receiptType,
        pagoEstado: paymentStatus,
        paymentId,
        canalVenta: channelName,
        fecha: new Date().toISOString(),
      };
    }
    try {
      await publish({
        event: "ORDER_CREATED",
        orderId: id,
        ...order,
        timestamp: new Date().toISOString(),
      });
    } catch (publishError) {
      // RabbitMQ puede recuperarse después; la venta ya quedó confirmada en MySQL.
      console.warn(
        "Venta registrada, pero el evento no pudo publicarse:",
        publishError.message,
      );
    }
    res.status(201).json({ success: true, order });
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.warn("Rollback de venta:", rollbackError.message);
    }
    console.error(
      "Create order:",
      error.code || "",
      error.sqlMessage || error.message,
    );
    const known =
      /Stock insuficiente|no está disponible|cupón|Compra mínima|Productos inválidos|Total de venta inválido|vendedores distintos|otro vendedor/i.test(
        error.message,
      );
    const databaseMessages = {
      ER_BAD_FIELD_ERROR:
        "La estructura de la base de datos está desactualizada. Reinicia el servicio de pedidos para aplicar la migración automática.",
      ER_NO_SUCH_TABLE:
        "Falta una tabla requerida para registrar la compra. Reinicia el backend con la versión corregida.",
      ER_DATA_TOO_LONG:
        "Uno de los datos de la compra supera el tamaño permitido.",
      ER_TRUNCATED_WRONG_VALUE_FOR_FIELD:
        "La base de datos contiene un formato antiguo incompatible con la venta.",
      ER_DUP_ENTRY:
        "No se pudo generar un número único para el comprobante. Intenta nuevamente.",
    };
    const safeDatabaseMessage = databaseMessages[error.code];
    res.status(known ? 400 : 500).json({
      success: false,
      error: known
        ? error.message
        : safeDatabaseMessage || "No se pudo registrar la venta",
      code: error.code || "ORDER_CREATE_FAILED",
    });
  } finally {
    connection.release();
  }
});

app.get("/orders", async (req, res) => {
  try {
    let sql = "SELECT * FROM orders WHERE 1=1";
    const params = [];
    const requestRole = role(req);
    const uid = userId(req);
    let buyer = req.query.userId || req.query.compradorId;
    let vendor = req.query.vendorId || req.query.vendedorId;
    if (requestRole === "COMPRADOR") buyer = uid;
    if (requestRole === "VENDEDOR") vendor = uid;
    if (buyer) {
      sql += " AND compradorId=?";
      params.push(buyer);
    }
    if (vendor) {
      sql += " AND vendedorId=?";
      params.push(vendor);
    }
    if (req.query.estado) {
      sql += " AND estado=?";
      params.push(req.query.estado);
    }
    if (req.query.canalVenta) {
      sql += " AND canalVenta=?";
      params.push(req.query.canalVenta);
    }
    if (req.query.from) {
      sql += " AND fecha>=?";
      params.push(req.query.from);
    }
    if (req.query.to) {
      sql += " AND fecha<=?";
      params.push(`${req.query.to} 23:59:59`);
    }
    sql += " ORDER BY fecha DESC";
    res.json((await query(sql, params)).map(fmt));
  } catch {
    res.status(500).json({ error: "No se pudieron cargar las órdenes" });
  }
});

app.get("/orders/reports/summary.:format", async (req, res) => {
  try {
    let sql = "SELECT * FROM orders WHERE 1=1";
    const params = [];
    const requestRole = role(req);
    const uid = userId(req);
    if (requestRole === "VENDEDOR") {
      sql += " AND vendedorId=?";
      params.push(uid);
    } else if (requestRole === "COMPRADOR") {
      sql += " AND compradorId=?";
      params.push(uid);
    }
    if (req.query.from) {
      sql += " AND fecha>=?";
      params.push(req.query.from);
    }
    if (req.query.to) {
      sql += " AND fecha<=?";
      params.push(`${req.query.to} 23:59:59`);
    }
    sql += " ORDER BY fecha DESC";
    const orders = (await query(sql, params)).map(fmt);
    const format = req.params.format;

    if (format === "xml") {
      const root = create({ version: "1.0", encoding: "UTF-8" }).ele(
        "ReportePedidos",
        { generado: new Date().toISOString() },
      );
      root
        .ele("Resumen")
        .ele("Cantidad")
        .txt(orders.length)
        .up()
        .ele("TotalVentas")
        .txt(
          orders
            .reduce((sum, order) => sum + Number(order.total), 0)
            .toFixed(2),
        )
        .up()
        .up();
      const list = root.ele("Pedidos");
      orders.forEach((order) =>
        list.import(create(receiptXml(order, order.tipoComprobante)).root()),
      );
      res
        .type("application/xml")
        .set(
          "Content-Disposition",
          'attachment; filename="reporte-pedidos.xml"',
        )
        .send(root.end({ prettyPrint: true }));
      return;
    }

    if (format !== "pdf")
      return res.status(400).json({ error: "Formato no soportado" });
    const doc = new PDFDocument({ size: "A4", margin: 45 });
    res
      .type("application/pdf")
      .set("Content-Disposition", 'attachment; filename="reporte-pedidos.pdf"');
    doc.pipe(res);
    addHeader(
      doc,
      "REPORTE DE VENTAS",
      `Periodo: ${req.query.from || "Inicio"} - ${req.query.to || "Actualidad"}`,
    );
    const total = orders.reduce((sum, order) => sum + Number(order.total), 0);
    doc
      .fillColor("#111827")
      .font("Helvetica-Bold")
      .fontSize(14)
      .text(`Ventas: ${orders.length}`, 45, 205);
    doc.text(`Importe acumulado: ${money(total)}`, 280, 205);
    let y = 250;
    doc.rect(45, y, 500, 28).fill("#f3f4f6");
    doc
      .fillColor("#111827")
      .fontSize(9)
      .text("N°", 55, y + 9)
      .text("Fecha", 155, y + 9)
      .text("Cliente", 245, y + 9)
      .text("Estado", 390, y + 9)
      .text("Total", 470, y + 9);
    y += 38;
    for (const [index, order] of orders.entries()) {
      if (y > 730) {
        doc.addPage();
        y = 55;
      }
      if (index % 2 === 0) doc.rect(45, y - 5, 500, 22).fill("#f8fafc");
      doc
        .fillColor("#374151")
        .font("Helvetica")
        .fontSize(8)
        .text(order.comprobanteNumero || order.id.slice(0, 8), 55, y)
        .text(new Date(order.fecha).toLocaleDateString("es-PE"), 155, y)
        .text(cleanText(order.compradorNombre, 24), 245, y, { width: 130 })
        .text(order.estado, 390, y)
        .text(money(order.total), 470, y);
      y += 23;
    }
    doc
      .moveTo(390, y + 8)
      .lineTo(545, y + 8)
      .strokeColor("#94a3b8")
      .stroke();
    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor("#0f172a")
      .text("TOTAL GENERAL", 390, y + 18)
      .text(money(total), 470, y + 18);
    doc.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "No se pudo generar el reporte" });
  }
});

app.get(
  "/orders/:orderId/:document(pdf|xml|ticket|factura)",
  async (req, res) => {
    try {
      const order = fmt(
        await one("SELECT * FROM orders WHERE id=?", [req.params.orderId]),
      );
      if (!order) return res.status(404).json({ error: "Orden no encontrada" });
      if (!canRead(req, order))
        return res
          .status(403)
          .json({ error: "No puedes descargar este documento" });
      if (req.params.document === "xml") {
        res
          .type("application/xml")
          .set(
            "Content-Disposition",
            `attachment; filename="${order.tipoComprobante || "boleta"}-${order.comprobanteNumero}.xml"`,
          )
          .send(receiptXml(order));
      } else {
        const type =
          req.params.document === "pdf"
            ? order.tipoComprobante
            : req.params.document;
        buildReceiptPdf(res, order, type);
      }
    } catch {
      res.status(500).json({ error: "No se pudo generar el documento" });
    }
  },
);

app.get("/orders/:orderId/document/:documentType", async (req, res) => {
  try {
    const order = fmt(
      await one("SELECT * FROM orders WHERE id=?", [req.params.orderId]),
    );
    if (!order) return res.status(404).json({ error: "Orden no encontrada" });
    if (!canRead(req, order))
      return res
        .status(403)
        .json({ error: "No puedes descargar este documento" });
    const type = String(req.params.documentType || "").toLowerCase();
    if (!["boleta", "factura", "ticket", "xml"].includes(type))
      return res.status(400).json({ error: "Formato no soportado" });
    if (type === "xml") {
      res
        .type("application/xml")
        .set(
          "Content-Disposition",
          `attachment; filename="${order.tipoComprobante || "boleta"}-${order.comprobanteNumero}.xml"`,
        )
        .send(receiptXml(order));
    } else {
      buildReceiptPdf(res, order, type);
    }
  } catch {
    res.status(500).json({ error: "No se pudo generar el documento" });
  }
});

app.get("/orders/:orderId", async (req, res) => {
  try {
    const order = fmt(
      await one("SELECT * FROM orders WHERE id=?", [req.params.orderId]),
    );
    if (!order) return res.status(404).json({ error: "Orden no encontrada" });
    if (!canRead(req, order))
      return res.status(403).json({ error: "Acceso denegado" });
    res.json(order);
  } catch {
    res.status(500).json({ error: "No se pudo cargar la orden" });
  }
});

app.put("/orders/:orderId/status", async (req, res) => {
  try {
    const status = String(req.body.status || "").toUpperCase();
    const current = fmt(
      await one("SELECT * FROM orders WHERE id=?", [req.params.orderId]),
    );
    if (!current) return res.status(404).json({ error: "Orden no encontrada" });
    if (
      !["ADMIN", "VENDEDOR"].includes(role(req)) ||
      (role(req) === "VENDEDOR" && userId(req) !== String(current.vendedorId))
    ) {
      return res.status(403).json({ error: "No tienes permisos" });
    }
    if (["CANCELADO", "ENTREGADO"].includes(current.estado))
      return res
        .status(409)
        .json({ error: `No se puede modificar una orden ${current.estado}` });
    if (status === "CANCELADO" && current.estado !== "PENDIENTE")
      return res
        .status(409)
        .json({ error: "No puedes cancelar una venta que ya fue aprobada." });
    const allowed = {
      PENDIENTE: ["CONFIRMADO", "CANCELADO"],
      CONFIRMADO: ["ENVIADO", "ENTREGADO"],
      ENVIADO: ["ENTREGADO"],
    };
    if (!allowed[current.estado]?.includes(status))
      return res
        .status(409)
        .json({ error: `Cambio no permitido: ${current.estado} → ${status}` });
    await query("UPDATE orders SET estado=? WHERE id=?", [
      status,
      req.params.orderId,
    ]);
    const order = fmt(
      await one("SELECT * FROM orders WHERE id=?", [req.params.orderId]),
    );
    await publish({
      event: "ORDER_STATUS_UPDATED",
      orderId: order.id,
      estado: status,
      timestamp: new Date().toISOString(),
    });
    res.json({ success: true, order });
  } catch {
    res.status(500).json({ error: "No se pudo actualizar" });
  }
});

app.delete("/orders/:orderId", async (req, res) => {
  try {
    const current = fmt(
      await one("SELECT * FROM orders WHERE id=?", [req.params.orderId]),
    );
    if (!current) return res.status(404).json({ error: "Orden no encontrada" });
    if (userId(req) !== String(current.compradorId) && role(req) !== "ADMIN")
      return res.status(403).json({ error: "No tienes permisos" });
    if (current.estado !== "PENDIENTE")
      return res
        .status(409)
        .json({ error: "No puedes cancelar una venta que ya fue aprobada." });
    await query('UPDATE orders SET estado="CANCELADO" WHERE id=?', [
      req.params.orderId,
    ]);
    res.json({
      success: true,
      order: fmt(
        await one("SELECT * FROM orders WHERE id=?", [req.params.orderId]),
      ),
    });
  } catch {
    res.status(500).json({ error: "No se pudo cancelar" });
  }
});

(async () => {
  await ping();
  await ensureSchema();
  await connectRabbitMQ();
  app.listen(PORT, "0.0.0.0", () =>
    console.log(`Orders Service running on ${PORT}`),
  );
})().catch((error) => {
  console.error("Startup error", error);
  process.exit(1);
});
