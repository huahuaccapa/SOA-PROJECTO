const express = require("express");
const amqp = require("amqplib");
const cors = require("cors");
require("dotenv").config();
const { query, one, ping, toJson, rowToApi } = require("./mysql");
const app = express();
const PORT = process.env.PORT || 3013;
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
function getSeverity(event) {
  if (["USER_REGISTERED", "ORDER_CREATED", "PAYMENT_CONFIRMED"].includes(event))
    return "critical";
  if (["ORDER_CANCELLED", "USER_LOGOUT"].includes(event)) return "warning";
  return "info";
}
async function logEvent(event, source) {
  await query(
    "INSERT INTO audit_logs (event,service,userId,email,action,resource,resourceId,changes,severity,timestamp) VALUES (?,?,?,?,?,?,?,?,?,NOW())",
    [
      event.event,
      source.replace("_events", ""),
      event.userId || event.compradorId || "",
      event.email || event.compradorNombre || "",
      event.event,
      source,
      event.id || event.productId || event.userId || "",
      JSON.stringify(event),
      getSeverity(event.event),
    ],
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
    await channel.assertQueue("audit_events", { durable: true });
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
              await logEvent(JSON.parse(msg.content.toString()), queueName);
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
    console.log("✅ Audit Service conectado a RabbitMQ");
  } catch (e) {
    console.error("❌ Error RabbitMQ:", e.message);
    channel = null;
    retryRabbitMQ();
  }
}
const fmt = (r) => (r ? { ...rowToApi(r), changes: toJson(r.changes, {}) } : r);
app.get("/audit", async (req, res) => {
  try {
    let sql =
      "SELECT id AS _id,id,event,service,userId,email,action,resource,resourceId,changes,ip,userAgent,timestamp,severity FROM audit_logs WHERE 1=1";
    const p = [];
    for (const k of ["service", "event", "userId"])
      if (req.query[k]) {
        sql += ` AND ${k}=?`;
        p.push(req.query[k]);
      }
    sql +=
      " ORDER BY timestamp DESC LIMIT " +
      Math.min(Number(req.query.limit || 100), 500);
    res.json((await query(sql, p)).map(fmt));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.get("/audit/stats", async (req, res) => {
  try {
    const rows = await query(
      "SELECT event AS _id, COUNT(*) AS count FROM audit_logs GROUP BY event ORDER BY count DESC",
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.get("/audit/:id", async (req, res) => {
  try {
    const r = await one(
      "SELECT id AS _id,id,event,service,userId,email,action,resource,resourceId,changes,ip,userAgent,timestamp,severity FROM audit_logs WHERE id=?",
      [req.params.id],
    );
    if (!r) return res.status(404).json({ error: "Log no encontrado" });
    res.json(fmt(r));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.get("/health", async (req, res) => {
  try {
    await ping();
    res.json({ status: "OK", service: "audit-service", mysql: "connected" });
  } catch (e) {
    res.status(503).json({ status: "DEGRADED", mysql: "disconnected" });
  }
});
connectRabbitMQ().then(() =>
  app.listen(PORT, "0.0.0.0", () =>
    console.log(`✅ Audit Service MySQL running on port ${PORT}`),
  ),
);
