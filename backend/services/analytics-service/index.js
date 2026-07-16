const express = require("express");
const amqp = require("amqplib");
const cors = require("cors");
require("dotenv").config();
const { query, ping, toJson, rowToApi } = require("./mysql");
const app = express();
const PORT = process.env.PORT || 3006;
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
    for (const queueName of [
      "auth_events",
      "order_events",
      "product_events",
      "payment_events",
    ]) {
      await channel.assertQueue(queueName);
      channel.consume(
        queueName,
        async (msg) => {
          if (msg) {
            try {
              const event = JSON.parse(msg.content.toString());
              await processEvent(event);
              if (channel) channel.ack(msg);
            } catch (e) {
              console.error("Error procesando evento:", e);
              if (channel) channel.ack(msg);
            }
          }
        },
        { noAck: false },
      );
    }
    console.log("✅ Analytics Service conectado a RabbitMQ");
  } catch (e) {
    console.error("❌ Error RabbitMQ:", e.message);
    channel = null;
    retryRabbitMQ();
  }
}
async function processEvent(event) {
  await query(
    "INSERT INTO analytics_events (event,userId,email,data,timestamp) VALUES (?,?,?,?,NOW())",
    [event.event, event.userId || "", event.email || "", JSON.stringify(event)],
  );
  const map = {
    USER_REGISTERED: "new_users",
    USER_LOGIN: "user_logins",
    ORDER_CREATED: "orders_created",
    PRODUCT_CREATED: "products_created",
    PAYMENT_CONFIRMED: "payments_completed",
  };
  const metric = map[event.event] || "other_events";
  await query(
    'INSERT INTO metrics (metric,value,date,period) VALUES (?,1,CURDATE(),"day") ON DUPLICATE KEY UPDATE value=value+1',
    [metric],
  );
}
app.get("/analytics/events", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit || 50), 500);
    const rows = await query(
      `SELECT id AS _id,id,event,userId,email,data,timestamp FROM analytics_events ORDER BY timestamp DESC LIMIT ${limit}`,
    );
    res.json(rows.map((r) => ({ ...rowToApi(r), data: toJson(r.data, {}) })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.get("/analytics/metrics", async (req, res) => {
  try {
    const rows = await query(
      "SELECT id AS _id,id,metric,value,date,period FROM metrics WHERE period=?",
      [req.query.period || "day"],
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
      service: "analytics-service",
      mysql: "connected",
    });
  } catch (e) {
    res.status(503).json({ status: "DEGRADED", mysql: "disconnected" });
  }
});
connectRabbitMQ().then(() =>
  app.listen(PORT, "0.0.0.0", () =>
    console.log(`✅ Analytics Service MySQL running on port ${PORT}`),
  ),
);
