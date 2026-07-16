const express = require("express");
const amqp = require("amqplib");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();
const { query, one, ping, toJson, rowToApi } = require("./mysql");
const app = express();
const PORT = process.env.PORT || 3009;
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
function fmt(s) {
  return s
    ? { ...rowToApi(s), _id: s.id, id: s.id, address: toJson(s.address, {}) }
    : s;
}
async function createShipping(event) {
  const id = uuidv4();
  const address = {
    street: event.direccion || "N/A",
    city: event.ciudad || "N/A",
    country: "Perú",
  };
  await query(
    "INSERT INTO shipping (id,orderId,address,status,trackingNumber,carrier,estimatedDelivery,weight,cost) VALUES (?,?,?,?,?,?,DATE_ADD(NOW(),INTERVAL 3 DAY),?,?)",
    [
      id,
      event.id,
      JSON.stringify(address),
      "PENDING",
      `TRK${Math.floor(Math.random() * 1000000)}`,
      "ByteVerse Logistics",
      1.5,
      25.0,
    ],
  );
  const shipping = await one("SELECT * FROM shipping WHERE id=?", [id]);
  if (channel)
    await channel.sendToQueue(
      "shipping_events",
      Buffer.from(
        JSON.stringify({
          event: "SHIPPING_CREATED",
          shippingId: id,
          orderId: event.id,
          trackingNumber: shipping.trackingNumber,
          timestamp: new Date().toISOString(),
        }),
      ),
      { persistent: true },
    );
}
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
    await channel.assertQueue("shipping_events", { durable: true });
    await channel.assertQueue("order_events", { durable: true });
    channel.consume(
      "order_events",
      async (msg) => {
        if (msg) {
          try {
            const e = JSON.parse(msg.content.toString());
            if (e.event === "ORDER_CREATED") await createShipping(e);
            if (channel) channel.ack(msg);
          } catch (err) {
            console.error("Error procesando evento:", err);
            if (channel) channel.ack(msg);
          }
        }
      },
      { noAck: false },
    );
    console.log("✅ Shipping Service conectado a RabbitMQ");
  } catch (e) {
    console.error("❌ Error RabbitMQ:", e.message);
    channel = null;
    retryRabbitMQ();
  }
}
app.get("/shipping", async (req, res) => {
  try {
    let sql = "SELECT * FROM shipping";
    const p = [];
    if (req.query.orderId) {
      sql += " WHERE orderId=?";
      p.push(req.query.orderId);
    }
    res.json((await query(sql, p)).map(fmt));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.get("/shipping/:id", async (req, res) => {
  try {
    const s = await one("SELECT * FROM shipping WHERE id=?", [req.params.id]);
    if (!s) return res.status(404).json({ error: "Envío no encontrado" });
    res.json(fmt(s));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.put("/shipping/:id/status", async (req, res) => {
  try {
    const r = await query(
      "UPDATE shipping SET status=?, updatedAt=CURRENT_TIMESTAMP WHERE id=?",
      [req.body.status, req.params.id],
    );
    if (!r.affectedRows)
      return res.status(404).json({ error: "Envío no encontrado" });
    const s = await one("SELECT * FROM shipping WHERE id=?", [req.params.id]);
    if (channel)
      await channel.sendToQueue(
        "shipping_events",
        Buffer.from(
          JSON.stringify({
            event: "SHIPPING_STATUS_UPDATED",
            shippingId: s.id,
            orderId: s.orderId,
            status: req.body.status,
            timestamp: new Date().toISOString(),
          }),
        ),
        { persistent: true },
      );
    res.json(fmt(s));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.get("/health", async (req, res) => {
  try {
    await ping();
    res.json({ status: "OK", service: "shipping-service", mysql: "connected" });
  } catch (e) {
    res.status(503).json({ status: "DEGRADED", mysql: "disconnected" });
  }
});
connectRabbitMQ().then(() =>
  app.listen(PORT, "0.0.0.0", () =>
    console.log(`✅ Shipping Service MySQL running on port ${PORT}`),
  ),
);
