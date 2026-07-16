const express = require("express");
const amqp = require("amqplib");
const cors = require("cors");
require("dotenv").config();
const { query, one, ping, bool, rowToApi } = require("./mysql");

const app = express();
const PORT = process.env.PORT || 3004;
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

function fmt(user) {
  if (!user) return user;
  const apiUser = rowToApi(user);
  delete apiUser.categorias;
  return {
    ...apiUser,
    activo: bool(user.activo),
    needPasswordChange: bool(user.needPasswordChange),
    _id: String(user.id),
    id: String(user.id),
  };
}

function requestRole(req) {
  return String(req.headers["x-user-role"] || "").toUpperCase();
}

function requestUserId(req) {
  return String(req.headers["x-user-id"] || "");
}

function cleanText(value, max = 250) {
  return String(value ?? "")
    .trim()
    .replace(/[<>`{}]/g, "")
    .slice(0, max);
}

function onlyAllowed(body, allowed) {
  return Object.fromEntries(
    Object.entries(body || {}).filter(([key]) => allowed.includes(key)),
  );
}

async function upsertUser(user) {
  const id = String(user.id || user._id || "").replace(/[^0-9]/g, "") || null;
  const fields = [
    user.nombre,
    user.apellido || "",
    user.email,
    user.role,
    user.activo === undefined ? 1 : user.activo ? 1 : 0,
    user.fechaRegistro ? new Date(user.fechaRegistro) : new Date(),
    user.telefono || "",
    user.direccion || "",
    user.documento || "",
    user.tipoDocumento || "DNI",
    user.descripcion || "",
    user.comision || 10,
    user.tienda || "",
    user.ruc || "",
    user.ventasRealizadas || 0,
    user.totalVentas || 0,
    "SYNCED",
  ];

  if (id) {
    await query(
      'INSERT INTO users (id,nombre,apellido,email,role,activo,fechaRegistro,telefono,direccion,documento,tipoDocumento,descripcion,comision,tienda,ruc,ventasRealizadas,totalVentas,syncStatus) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE nombre=VALUES(nombre), apellido=VALUES(apellido), email=VALUES(email), role=VALUES(role), activo=VALUES(activo), telefono=VALUES(telefono), direccion=VALUES(direccion), documento=VALUES(documento), tipoDocumento=VALUES(tipoDocumento), descripcion=VALUES(descripcion), comision=VALUES(comision), syncStatus="SYNCED"',
      [id, ...fields],
    );
  } else {
    await query(
      'INSERT INTO users (nombre,apellido,email,role,activo,fechaRegistro,telefono,direccion,documento,tipoDocumento,descripcion,comision,tienda,ruc,ventasRealizadas,totalVentas,syncStatus) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE nombre=VALUES(nombre), apellido=VALUES(apellido), role=VALUES(role), activo=VALUES(activo), telefono=VALUES(telefono), direccion=VALUES(direccion), documento=VALUES(documento), tipoDocumento=VALUES(tipoDocumento), descripcion=VALUES(descripcion), comision=VALUES(comision), syncStatus="SYNCED"',
      fields,
    );
  }
}

async function connectRabbitMQ() {
  try {
    const conn = await amqp.connect(
      process.env.RABBITMQ_URL || "amqp://rabbitmq:5672",
      { heartbeat: 15 },
    );
    conn.on("error", (error) => console.error("RabbitMQ:", error.message));
    conn.on("close", () => {
      channel = null;
      retryRabbitMQ();
    });
    channel = await conn.createChannel();
    channel.on("close", () => {
      channel = null;
      retryRabbitMQ();
    });
    await channel.assertQueue("user_sync_queue", { durable: true });
    await channel.assertQueue("auth_response_queue", { durable: true });
    channel.consume(
      "user_sync_queue",
      async (message) => {
        if (!message) return;
        try {
          await upsertUser(JSON.parse(message.content.toString()));
        } catch (error) {
          console.error("Error procesando sincronización:", error);
        } finally {
          if (channel) channel.ack(message);
        }
      },
      { noAck: false },
    );
    console.log("Users Service conectado a RabbitMQ");
  } catch (error) {
    console.error("Error RabbitMQ:", error.message);
    channel = null;
    retryRabbitMQ();
  }
}

app.get("/users", async (req, res) => {
  try {
    const editorRole = requestRole(req);
    if (
      editorRole === "VENDEDOR" &&
      String(req.query.role || "").toUpperCase() !== "COMPRADOR"
    ) {
      return res
        .status(403)
        .json({
          error: "El vendedor solo puede consultar clientes compradores",
        });
    }
    if (!["ADMIN", "VENDEDOR"].includes(editorRole)) {
      return res
        .status(403)
        .json({ error: "No tienes permisos para listar usuarios" });
    }

    let sql = "SELECT * FROM users WHERE 1=1";
    const params = [];
    if (req.query.role) {
      sql += " AND role=?";
      params.push(String(req.query.role).toUpperCase());
    }
    if (req.query.activo !== undefined) {
      sql += " AND activo=?";
      params.push(req.query.activo === "true" ? 1 : 0);
    }
    sql += " ORDER BY fechaRegistro DESC";
    res.json((await query(sql, params)).map(fmt));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/users/:id", async (req, res) => {
  try {
    const user = await one("SELECT * FROM users WHERE id=?", [req.params.id]);
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    const editorRole = requestRole(req);
    const editorId = requestUserId(req);
    const isSelf = editorId === String(req.params.id);
    const vendorReadingBuyer =
      editorRole === "VENDEDOR" &&
      String(user.role).toUpperCase() === "COMPRADOR";
    if (editorRole !== "ADMIN" && !isSelf && !vendorReadingBuyer) {
      return res
        .status(403)
        .json({ error: "No tienes permisos para consultar este perfil" });
    }
    res.json(fmt(user));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/users/:id", async (req, res) => {
  try {
    const current = await one("SELECT id,role FROM users WHERE id=?", [
      req.params.id,
    ]);
    if (!current)
      return res.status(404).json({ error: "Usuario no encontrado" });

    const editorRole = requestRole(req);
    const editorId = requestUserId(req);
    const isSelf = editorId === String(req.params.id);
    if (editorRole !== "ADMIN" && !isSelf)
      return res
        .status(403)
        .json({ error: "Solo puedes editar tu propio perfil" });

    let body = req.body || {};
    if (editorRole === "VENDEDOR") {
      body = onlyAllowed(body, ["nombre", "apellido", "direccion"]);
    } else if (editorRole === "COMPRADOR") {
      body = onlyAllowed(body, [
        "nombre",
        "apellido",
        "telefono",
        "direccion",
        "documento",
        "tipoDocumento",
      ]);
    } else if (editorRole !== "ADMIN") {
      return res
        .status(403)
        .json({ error: "No tienes permisos para editar este perfil" });
    }

    if (body.nombre !== undefined) {
      body.nombre = cleanText(body.nombre, 150);
      if (body.nombre.length < 3)
        return res
          .status(400)
          .json({ error: "El nombre debe tener al menos 3 caracteres" });
    }
    if (body.apellido !== undefined)
      body.apellido = cleanText(body.apellido, 150);
    if (body.direccion !== undefined)
      body.direccion = cleanText(body.direccion, 350);
    if (body.telefono !== undefined)
      body.telefono = cleanText(body.telefono, 30);
    if (body.documento !== undefined)
      body.documento = cleanText(body.documento, 30);
    if (body.descripcion !== undefined)
      body.descripcion = cleanText(body.descripcion, 500);

    await query(
      "UPDATE users SET nombre=COALESCE(?,nombre), apellido=COALESCE(?,apellido), email=COALESCE(?,email), role=COALESCE(?,role), activo=COALESCE(?,activo), telefono=COALESCE(?,telefono), direccion=COALESCE(?,direccion), documento=COALESCE(?,documento), tipoDocumento=COALESCE(?,tipoDocumento), descripcion=COALESCE(?,descripcion), comision=COALESCE(?,comision), tienda=COALESCE(?,tienda), ruc=COALESCE(?,ruc) WHERE id=?",
      [
        body.nombre ?? null,
        body.apellido ?? null,
        body.email ?? null,
        body.role ?? null,
        body.activo === undefined ? null : body.activo ? 1 : 0,
        body.telefono ?? null,
        body.direccion ?? null,
        body.documento ?? null,
        body.tipoDocumento ?? null,
        body.descripcion ?? null,
        body.comision ?? null,
        body.tienda ?? null,
        body.ruc ?? null,
        req.params.id,
      ],
    );

    res.json(fmt(await one("SELECT * FROM users WHERE id=?", [req.params.id])));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/users/validate-phone", async (req, res) => {
  try {
    const key = process.env.RAPIDAPI_KEY;
    if (!key)
      return res
        .status(503)
        .json({ valid: null, error: "RAPIDAPI_KEY no configurada" });
    const number = String(req.body.number || "").trim();
    const country = String(req.body.country || "PE")
      .trim()
      .toUpperCase();
    if (!number) return res.status(400).json({ error: "Número requerido" });
    const url = `https://phonenumbervalidatefree.p.rapidapi.com/ts_PhoneNumberValidateTest.jsp?number=${encodeURIComponent(number)}&country=${encodeURIComponent(country)}`;
    const response = await fetch(url, {
      headers: {
        "x-rapidapi-key": key,
        "x-rapidapi-host": "phonenumbervalidatefree.p.rapidapi.com",
        "Content-Type": "application/json",
      },
    });
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
    res.status(response.status).json(data);
  } catch (error) {
    res
      .status(502)
      .json({ error: "No se pudo validar el teléfono", detail: error.message });
  }
});

app.delete("/users/:id", async (req, res) => {
  try {
    const result = await query("UPDATE users SET activo=0 WHERE id=?", [
      req.params.id,
    ]);
    if (!result.affectedRows)
      return res.status(404).json({ error: "Usuario no encontrado" });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function ensureSchema() {
  try {
    await query(
      "ALTER TABLE users ADD COLUMN apellido VARCHAR(150) DEFAULT '' AFTER nombre",
    );
  } catch (error) {
    if (!/Duplicate column/i.test(error.message)) throw error;
  }
}

app.get("/health", async (req, res) => {
  try {
    await ping();
    res.json({ status: "OK", service: "users-service", mysql: "connected" });
  } catch {
    res.status(503).json({ status: "DEGRADED", mysql: "disconnected" });
  }
});

ensureSchema()
  .then(connectRabbitMQ)
  .then(() =>
    app.listen(PORT, "0.0.0.0", () =>
      console.log(`Users Service MySQL running on port ${PORT}`),
    ),
  )
  .catch((error) => {
    console.error("Users Service startup:", error);
    process.exit(1);
  });
