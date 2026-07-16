const express = require("express");
const amqp = require("amqplib");
const cors = require("cors");
require("dotenv").config();
const { query, one, ping, rowToApi } = require("./mysql");
const app = express();
const PORT = process.env.PORT || 3007;
app.use(cors());
app.use(express.json());
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
    const conn = await amqp.connect(
      process.env.RABBITMQ_URL || "amqp://rabbitmq:5672",
      { heartbeat: 15 },
    );
    conn.on("error", (e) => console.error("❌ RabbitMQ:", e.message));
    conn.on("close", () => {
      channel = null;
      retryRabbitMQ();
    });
    channel = await conn.createChannel();
    channel.on("close", () => {
      channel = null;
      retryRabbitMQ();
    });
    await channel.assertQueue("inventory_events", { durable: true });
    await channel.assertQueue("order_events", { durable: true });
    channel.consume(
      "order_events",
      async (msg) => {
        if (msg) {
          try {
            await handleOrderEvent(JSON.parse(msg.content.toString()));
            if (channel) channel.ack(msg);
          } catch (e) {
            console.error("Error procesando evento:", e);
            if (channel) channel.ack(msg);
          }
        }
      },
      { noAck: false },
    );
    console.log("✅ Inventory Service conectado a RabbitMQ");
  } catch (e) {
    console.error("❌ Error RabbitMQ:", e.message);
    channel = null;
    retryRabbitMQ();
  }
}
async function move(
  productId,
  type,
  quantity,
  prev,
  next,
  reason,
  orderId,
  userId = "",
) {
  await query(
    "INSERT INTO movements (productId,type,quantity,previousQuantity,newQuantity,reason,orderId,userId) VALUES (?,?,?,?,?,?,?,?)",
    [productId, type, quantity, prev, next, reason, orderId, userId],
  );
}
async function reserveStock(productId, quantity, orderId) {
  const inv = await one("SELECT * FROM inventory WHERE productId=?", [
    productId,
  ]);
  if (!inv || Number(inv.quantity) - Number(inv.reserved) < Number(quantity))
    return;
  const prev = Number(inv.quantity) - Number(inv.reserved);
  await query("UPDATE inventory SET reserved=reserved+? WHERE productId=?", [
    quantity,
    productId,
  ]);
  await move(
    productId,
    "RESERVE",
    quantity,
    prev,
    prev - quantity,
    `Order ${orderId}`,
    orderId,
  );
}
async function confirmReservation(productId, quantity, orderId) {
  const inv = await one("SELECT * FROM inventory WHERE productId=?", [
    productId,
  ]);
  if (!inv) return;
  await query(
    "UPDATE inventory SET quantity=quantity-?, reserved=GREATEST(reserved-?,0) WHERE productId=?",
    [quantity, quantity, productId],
  );
  await move(
    productId,
    "OUT",
    quantity,
    inv.quantity,
    inv.quantity - quantity,
    `Order confirmed ${orderId}`,
    orderId,
  );
}
async function releaseStock(productId, quantity, orderId) {
  const inv = await one("SELECT * FROM inventory WHERE productId=?", [
    productId,
  ]);
  if (!inv) return;
  await query(
    "UPDATE inventory SET reserved=GREATEST(reserved-?,0) WHERE productId=?",
    [quantity, productId],
  );
  await move(
    productId,
    "RELEASE",
    quantity,
    inv.quantity,
    inv.quantity,
    `Order cancelled ${orderId}`,
    orderId,
  );
}
async function handleOrderEvent(event) {
  if (event.event === "ORDER_CREATED") {
    for (const item of event.items || [])
      await reserveStock(
        item.productId || item.productoId,
        item.cantidad,
        event.id,
      );
  } else if (event.event === "ORDER_STATUS_UPDATED") {
    if (event.estado === "CONFIRMADO")
      for (const item of event.items || [])
        await confirmReservation(
          item.productId || item.productoId,
          item.cantidad,
          event.id,
        );
    if (event.estado === "CANCELADO")
      for (const item of event.items || [])
        await releaseStock(
          item.productId || item.productoId,
          item.cantidad,
          event.id,
        );
  }
}
app.get("/inventory", async (req, res) => {
  try {
    res.json(
      (
        await query(
          "SELECT id AS _id,id,productId,quantity,reserved,minStock,maxStock,lastUpdated,location,warehouse FROM inventory",
        )
      ).map(rowToApi),
    );
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.get("/inventory/:productId", async (req, res) => {
  try {
    const inv = await one(
      "SELECT id AS _id,id,productId,quantity,reserved,minStock,maxStock,lastUpdated,location,warehouse FROM inventory WHERE productId=?",
      [req.params.productId],
    );
    if (!inv)
      return res.status(404).json({ error: "Inventario no encontrado" });
    res.json(rowToApi(inv));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.post("/inventory", async (req, res) => {
  try {
    const b = req.body;
    await query(
      "INSERT INTO inventory (productId,quantity,reserved,minStock,maxStock,location,warehouse) VALUES (?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE quantity=VALUES(quantity), minStock=VALUES(minStock), maxStock=VALUES(maxStock), location=VALUES(location), warehouse=VALUES(warehouse)",
      [
        b.productId,
        b.quantity,
        b.reserved || 0,
        b.minStock || 5,
        b.maxStock || 100,
        b.location || "",
        b.warehouse || "",
      ],
    );
    const inv = await one(
      "SELECT id AS _id,id,productId,quantity,reserved,minStock,maxStock,lastUpdated,location,warehouse FROM inventory WHERE productId=?",
      [b.productId],
    );
    res.status(201).json(rowToApi(inv));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.get("/movements/:productId", async (req, res) => {
  try {
    const rows = await query(
      "SELECT id AS _id,id,productId,type,quantity,previousQuantity,newQuantity,reason,userId,orderId,timestamp FROM movements WHERE productId=? ORDER BY timestamp DESC LIMIT 100",
      [req.params.productId],
    );
    res.json(rows.map(rowToApi));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.get("/health", async (req, res) => {
  try {
    await ping();
    res.json({
      status: "OK",
      service: "inventory-service",
      mysql: "connected",
    });
  } catch (e) {
    res.status(503).json({ status: "DEGRADED", mysql: "disconnected" });
  }
});
connectRabbitMQ().then(() =>
  app.listen(PORT, "0.0.0.0", () =>
    console.log(`✅ Inventory Service MySQL running on port ${PORT}`),
  ),
);
