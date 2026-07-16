const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const amqp = require("amqplib");
const cors = require("cors");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const { OAuth2Client } = require("google-auth-library");
require("dotenv").config();
const {
  query,
  one,
  ping,
  waitForDatabase,
  bool,
  rowToApi,
} = require("./mysql");
const app = express();
const PORT = Number(process.env.PORT || 3001);
const FRONTEND_URL = (
  process.env.FRONTEND_URL || "http://localhost:5173"
).replace(/\/$/, "");
// Claves compartidas con el API Gateway. Los fallbacks mantienen compatibilidad
// con instalaciones locales antiguas que todavía no tienen archivo .env.
const JWT_SECRET =
  String(process.env.JWT_SECRET || "secret").trim() || "secret";
const REFRESH_SECRET =
  String(process.env.REFRESH_SECRET || "refresh_secret").trim() ||
  "refresh_secret";
const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://rabbitmq:5672";
const DEFAULT_GOOGLE_CLIENT_ID =
  "765528287121-88mllq5oksjrkfbins18bi90lq4j22ku.apps.googleusercontent.com";
const GOOGLE_CLIENT_ID = String(
  process.env.GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID,
).trim();
const GOOGLE_CLIENT_SECRET = String(
  process.env.GOOGLE_CLIENT_SECRET || "",
).trim();
const GOOGLE_CALLBACK_URL =
  process.env.GOOGLE_CALLBACK_URL ||
  "http://localhost:3000/api/auth/google/callback";
const STATE_SECRET =
  process.env.OAUTH_STATE_SECRET ||
  JWT_SECRET ||
  "change-this-oauth-state-secret";
const COOKIE_SECURE = process.env.COOKIE_SECURE === "true";
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : true,
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
let rabbitConnection = null,
  channel = null,
  rabbitConnecting = false,
  rabbitRetryTimer = null,
  rabbitRetryDelay = 2000;
function scheduleRabbitReconnect() {
  if (rabbitRetryTimer || rabbitConnecting) return;
  rabbitRetryTimer = setTimeout(() => {
    rabbitRetryTimer = null;
    connectRabbitMQ();
  }, rabbitRetryDelay);
  rabbitRetryDelay = Math.min(rabbitRetryDelay * 2, 30000);
}
async function connectRabbitMQ() {
  if (rabbitConnecting || channel) return channel;
  rabbitConnecting = true;
  try {
    rabbitConnection = await amqp.connect(RABBITMQ_URL, { heartbeat: 15 });
    rabbitConnection.on("error", (e) =>
      console.error("❌ Error RabbitMQ:", e.message),
    );
    rabbitConnection.on("close", () => {
      rabbitConnection = null;
      channel = null;
      scheduleRabbitReconnect();
    });
    channel = await rabbitConnection.createConfirmChannel();
    channel.on("close", () => {
      channel = null;
      scheduleRabbitReconnect();
    });
    await Promise.all([
      channel.assertQueue("auth_events", { durable: true }),
      channel.assertQueue("user_sync_queue", { durable: true }),
      channel.assertQueue("auth_response_queue", { durable: true }),
      channel.assertQueue("realtime_events", { durable: true }),
    ]);
    rabbitRetryDelay = 2000;
    console.log("✅ Auth Service conectado a RabbitMQ");
    return channel;
  } catch (e) {
    rabbitConnection = null;
    channel = null;
    console.error(`❌ RabbitMQ no disponible: ${e.message}`);
    scheduleRabbitReconnect();
    return null;
  } finally {
    rabbitConnecting = false;
  }
}
async function publish(queueName, payload) {
  try {
    if (!channel) await connectRabbitMQ();
    if (!channel) return false;
    channel.sendToQueue(queueName, Buffer.from(JSON.stringify(payload)), {
      persistent: true,
      contentType: "application/json",
    });
    if (queueName === "auth_events")
      channel.sendToQueue(
        "realtime_events",
        Buffer.from(JSON.stringify(payload)),
        { persistent: true, contentType: "application/json" },
      );
    await channel.waitForConfirms();
    return true;
  } catch (e) {
    console.error(`⚠️ Evento no publicado en ${queueName}:`, e.message);
    channel = null;
    scheduleRabbitReconnect();
    return false;
  }
}
function parseUser(r) {
  if (!r) return null;
  const apiUser = rowToApi(r);
  delete apiUser.categorias;
  return {
    ...apiUser,
    id: String(r.id),
    _id: String(r.id),
    activo: bool(r.activo),
    needPasswordChange: bool(r.needPasswordChange),
    emailVerified: bool(r.emailVerified),
  };
}
function serializeUser(user) {
  user = parseUser(user);
  return {
    id: String(user.id),
    nombre: user.nombre,
    apellido: user.apellido || "",
    email: user.email,
    role: user.role,
    needPasswordChange: user.needPasswordChange || false,
    telefono: user.telefono || "",
    direccion: user.direccion || "",
    documento: user.documento || "",
    tipoDocumento: user.tipoDocumento || "DNI",
    descripcion: user.descripcion || "",
    comision: user.comision || 10,
    activo: user.activo,
    avatar: user.avatar || "",
    authProvider: user.authProvider || "local",
  };
}
async function getByEmail(email) {
  return parseUser(await one("SELECT * FROM users WHERE email=?", [email]));
}
async function getById(id) {
  return parseUser(await one("SELECT * FROM users WHERE id=?", [id]));
}
async function updateUser(id, fields) {
  const allowed = Object.keys(fields);
  if (!allowed.length) return;
  await query(
    `UPDATE users SET ${allowed.map((k) => `${k}=?`).join(", ")} WHERE id=?`,
    [
      ...allowed.map((k) =>
        Array.isArray(fields[k]) ? JSON.stringify(fields[k]) : fields[k],
      ),
      id,
    ],
  );
}
async function createUser(data) {
  const result = await query(
    "INSERT INTO users (nombre,apellido,email,password,role,activo,fechaRegistro,needPasswordChange,googleId,authProvider,emailVerified,avatar,telefono,direccion,documento,tipoDocumento,descripcion,comision) VALUES (?,?,?,?,?,1,NOW(),?,?,?,?,?,?,?,?,?,?,?)",
    [
      data.nombre,
      data.apellido || "",
      data.email,
      data.password,
      data.role || "COMPRADOR",
      data.needPasswordChange ? 1 : 0,
      data.googleId || null,
      data.authProvider || "local",
      data.emailVerified ? 1 : 0,
      data.avatar || "",
      data.telefono || "",
      data.direccion || "",
      data.documento || "",
      data.tipoDocumento || "DNI",
      data.descripcion || "",
      data.comision || 10,
    ],
  );
  return getById(result.insertId);
}
async function ensureAuthSchema() {
  try {
    await query(
      "ALTER TABLE users ADD COLUMN apellido VARCHAR(150) DEFAULT '' AFTER nombre",
    );
  } catch (e) {
    if (!/Duplicate column/i.test(e.message)) throw e;
  }
  await query(
    `CREATE TABLE IF NOT EXISTS password_reset_tokens (id BIGINT AUTO_INCREMENT PRIMARY KEY,userId BIGINT NOT NULL,tokenHash CHAR(64) NOT NULL UNIQUE,expiresAt DATETIME NOT NULL,usedAt DATETIME NULL,createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,INDEX idx_reset_user(userId),INDEX idx_reset_expiry(expiresAt))`,
  );
}
async function createDefaultUsers() {
  const defaults = [
    [
      "Administrador",
      "admin@byteverse.com",
      "ADMIN",
      { telefono: "999888777", direccion: "Lima, Perú" },
    ],
    [
      "Usuario Comprador",
      "comprador@byteverse.com",
      "COMPRADOR",
      {
        telefono: "999111222",
        direccion: "Av. Siempre Viva 123",
        documento: "12345678",
        tipoDocumento: "DNI",
      },
    ],
    [
      "Vendedor Tech",
      "vendedor@byteverse.com",
      "VENDEDOR",
      {
        needPasswordChange: true,
        telefono: "999333444",
        direccion: "Calle Tecnológica 456",
        documento: "87654321",
        tipoDocumento: "RUC",
        descripcion: "Venta de productos tecnológicos",
      },
    ],
    [
      "Usuario Demo",
      "user@byteverse.com",
      "COMPRADOR",
      { telefono: "999555666", direccion: "Calle Demo 789" },
    ],
  ];
  for (const [nombre, email, role, extra] of defaults) {
    try {
      if (!(await getByEmail(email)))
        await createUser({
          nombre,
          email,
          role,
          password: await bcrypt.hash("123456", 10),
          ...extra,
        });
    } catch (e) {
      console.error(`❌ No se pudo preparar ${email}:`, e.message);
    }
  }
}
async function issueTokens(user) {
  const id = String(user.id);
  const accessToken = jwt.sign(
    { userId: id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "15m" },
  );
  const refreshToken = jwt.sign(
    { userId: id, email: user.email },
    REFRESH_SECRET,
    { expiresIn: process.env.REFRESH_EXPIRES_IN || "7d" },
  );
  await updateUser(id, { refreshToken });
  return { accessToken, refreshToken };
}
async function syncUserToUsersService(user) {
  return publish("user_sync_queue", {
    id: String(user.id),
    ...serializeUser(user),
    fechaRegistro: user.fechaRegistro,
  });
}

function mailTransport() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "false") === "true",
    auth: { user, pass },
  });
}
async function sendPasswordResetEmail(user, token) {
  const transport = mailTransport();
  if (!transport) throw new Error("SMTP_NOT_CONFIGURED");
  const resetUrl = `${FRONTEND_URL}/reset-password?token=${encodeURIComponent(token)}`;
  await transport.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to: user.email,
    subject: "Recupera tu contraseña de ByteVerse",
    text: `Hola ${user.nombre}, abre este enlace para crear una nueva contraseña: ${resetUrl}. El enlace expira pronto.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #e5e7eb;border-radius:18px;overflow:hidden"><div style="background:#111827;color:#fff;padding:28px"><h1 style="margin:0">ByteVerse</h1><p style="margin:8px 0 0;color:#cbd5e1">Recuperación segura de contraseña</p></div><div style="padding:28px"><h2>Hola, ${user.nombre}</h2><p>Recibimos una solicitud para cambiar tu contraseña. Presiona el botón:</p><p style="margin:28px 0"><a href="${resetUrl}" style="background:#2563eb;color:white;padding:13px 22px;border-radius:10px;text-decoration:none;font-weight:bold">Crear nueva contraseña</a></p><p style="color:#6b7280;font-size:13px">El enlace expira en ${Number(process.env.RESET_TOKEN_MINUTES || 30)} minutos. Si no solicitaste el cambio, ignora este correo.</p></div></div>`,
  });
}

function parseCookies(req) {
  return Object.fromEntries(
    (req.headers.cookie || "")
      .split(";")
      .filter(Boolean)
      .map((item) => {
        const i = item.indexOf("=");
        return [item.slice(0, i).trim(), decodeURIComponent(item.slice(i + 1))];
      }),
  );
}
function signOAuthState(payload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", STATE_SECRET)
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${signature}`;
}
function verifyOAuthState(state) {
  const [encoded, signature] = String(state || "").split(".");
  if (!encoded || !signature) throw new Error("Estado OAuth incompleto");
  const expected = crypto
    .createHmac("sha256", STATE_SECRET)
    .update(encoded)
    .digest("base64url");
  if (
    signature.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  )
    throw new Error("Firma OAuth inválida");
  const payload = JSON.parse(
    Buffer.from(encoded, "base64url").toString("utf8"),
  );
  if (!payload.nonce || !payload.expiresAt || Date.now() > payload.expiresAt)
    throw new Error("Estado OAuth expirado");
  return payload;
}
function googleClient() {
  return new OAuth2Client(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET || undefined,
    GOOGLE_CALLBACK_URL,
  );
}
async function verifyGoogleCredential(credential) {
  const verifier = new OAuth2Client();
  const ticket = await verifier.verifyIdToken({
    idToken: String(credential),
    audience: GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload?.sub) throw new Error("Google no devolvió una identidad válida");
  return payload;
}
async function findOrCreateGoogleUser(payload) {
  if (!payload.email || !payload.email_verified)
    throw new Error("Google no confirmó el correo del usuario");
  const email = payload.email.toLowerCase();
  let user = parseUser(
    await one("SELECT * FROM users WHERE googleId=? OR email=?", [
      payload.sub,
      email,
    ]),
  );
  if (!user) {
    user = await createUser({
      nombre: payload.given_name || payload.name || email.split("@")[0],
      apellido: payload.family_name || "",
      email,
      password: await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10),
      googleId: payload.sub,
      authProvider: "google",
      emailVerified: true,
      avatar: payload.picture || "",
      role: "COMPRADOR",
    });
    await syncUserToUsersService(user);
    await publish("auth_events", {
      event: "USER_REGISTERED",
      userId: user.id,
      email: user.email,
      nombre: user.nombre,
      role: user.role,
      provider: "google",
      timestamp: new Date().toISOString(),
    });
  } else {
    if (!user.activo) throw new Error("Usuario inactivo");
    await updateUser(user.id, {
      googleId: user.googleId || payload.sub,
      emailVerified: 1,
      authProvider: "google",
      avatar: user.avatar || payload.picture || "",
    });
    user = await getById(user.id);
  }
  return user;
}
app.get("/health/live", (req, res) =>
  res.json({ status: "OK", service: "auth-service", uptime: process.uptime() }),
);
app.get("/health/ready", async (req, res) => {
  try {
    await ping();
    res.json({
      status: "ready",
      mysql: "connected",
      rabbitmq: channel ? "connected" : "reconnecting",
    });
  } catch (e) {
    res
      .status(503)
      .json({
        status: "not_ready",
        mysql: "disconnected",
        rabbitmq: channel ? "connected" : "reconnecting",
      });
  }
});
app.get("/health", async (req, res) => {
  try {
    await ping();
    res.json({
      status: "OK",
      service: "auth-service",
      mysql: "connected",
      rabbitmq: channel ? "connected" : "reconnecting",
    });
  } catch (e) {
    res
      .status(503)
      .json({
        status: "DEGRADED",
        service: "auth-service",
        mysql: "disconnected",
      });
  }
});
app.post("/login", async (req, res) => {
  try {
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    const password = String(req.body.password || "");
    if (!email || !password)
      return res
        .status(400)
        .json({ success: false, error: "Email y contraseña requeridos" });
    const user = await getByEmail(email);
    if (
      !user ||
      !user.activo ||
      !(await bcrypt.compare(password, user.password || ""))
    )
      return res
        .status(401)
        .json({ success: false, error: "Credenciales inválidas" });
    if (user.needPasswordChange)
      return res
        .status(403)
        .json({
          success: false,
          code: "PASSWORD_CHANGE_REQUIRED",
          needPasswordChange: true,
          email: user.email,
          error:
            "Por seguridad, antes de ingresar debes cambiar tu contraseña.",
        });
    const tokens = await issueTokens(user);
    publish("auth_events", {
      event: "USER_LOGIN",
      userId: user.id,
      email: user.email,
      timestamp: new Date().toISOString(),
    });
    return res.json({ success: true, ...tokens, user: serializeUser(user) });
  } catch (e) {
    console.error("❌ Error login:", e.message);
    return res
      .status(500)
      .json({ success: false, error: "No se pudo iniciar sesión" });
  }
});
app.post("/register", async (req, res) => {
  try {
    const {
      nombre,
      apellido,
      password,
      telefono,
      direccion,
      documento,
      tipoDocumento,
      descripcion,
      comision,
      departamento,
      provincia,
      distrito,
    } = req.body;
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    const requestedRole = String(req.body.role || "COMPRADOR").toUpperCase();
    let requesterRole = "";
    try {
      const bearer = String(req.headers.authorization || "").replace(
        /^Bearer\s+/i,
        "",
      );
      if (bearer)
        requesterRole = String(
          jwt.verify(bearer, JWT_SECRET).role || "",
        ).toUpperCase();
    } catch (e) {}
    const role =
      requestedRole === "VENDEDOR" && requesterRole === "ADMIN"
        ? "VENDEDOR"
        : "COMPRADOR";
    const needPasswordChange =
      role === "VENDEDOR" || req.body.needPasswordChange === true;
    if (!nombre || !email || !password)
      return res
        .status(400)
        .json({
          success: false,
          error: "Nombre, correo y contraseña son requeridos",
        });
    if (String(password).length < 6)
      return res
        .status(400)
        .json({
          success: false,
          error: "La contraseña debe tener al menos 6 caracteres",
        });
    if (await getByEmail(email))
      return res
        .status(400)
        .json({ success: false, error: "El correo ya está registrado" });
    const user = await createUser({
      nombre,
      apellido: apellido || "",
      email,
      password: await bcrypt.hash(password, 10),
      role,
      needPasswordChange,
      telefono: telefono || "",
      direccion: direccion || "",
      documento: documento || "",
      tipoDocumento: tipoDocumento || "DNI",
      descripcion: descripcion || "",
      comision: comision || 10,
      departamento: departamento || "",
      provincia: provincia || "",
      distrito: distrito || "",
    });
    await syncUserToUsersService(user);
    publish("auth_events", {
      event: "USER_REGISTERED",
      userId: user.id,
      email,
      nombre,
      role: user.role,
      timestamp: new Date().toISOString(),
    });
    return res
      .status(201)
      .json({
        success: true,
        user: serializeUser(user),
        message:
          role === "VENDEDOR"
            ? "Vendedor creado. Debe cambiar su contraseña en el primer ingreso."
            : "Registro exitoso",
      });
  } catch (e) {
    console.error("❌ Error registro:", e.message);
    return res
      .status(500)
      .json({ success: false, error: "No se pudo completar el registro" });
  }
});
app.get("/google/config", (req, res) =>
  res.json({
    success: true,
    enabled: Boolean(GOOGLE_CLIENT_ID),
    clientId: GOOGLE_CLIENT_ID,
    tokenLoginEnabled: Boolean(GOOGLE_CLIENT_ID),
    redirectLoginEnabled: Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET),
    callbackUrl: GOOGLE_CALLBACK_URL,
  }),
);
app.get("/google", (req, res) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET)
    return res.redirect(`${FRONTEND_URL}/login?error=oauth_not_configured`);
  const nonce = crypto.randomBytes(24).toString("base64url");
  const clientState = /^[a-zA-Z0-9_-]{8,160}$/.test(
    String(req.query.state || ""),
  )
    ? String(req.query.state)
    : "";
  const state = signOAuthState({
    nonce,
    clientState,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });
  res.cookie("google_oauth_state", nonce, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: "lax",
    maxAge: 10 * 60 * 1000,
    path: "/",
  });
  return res.redirect(
    googleClient().generateAuthUrl({
      access_type: "offline",
      prompt: "select_account",
      scope: ["openid", "email", "profile"],
      state,
    }),
  );
});
app.get("/google/callback", async (req, res) => {
  const fail = (code = "oauth_failed") =>
    res.redirect(`${FRONTEND_URL}/login?error=${encodeURIComponent(code)}`);
  try {
    if (req.query.error)
      return fail(
        req.query.error === "access_denied" ? "access_denied" : "oauth_failed",
      );
    if (!req.query.code) return fail("oauth_missing_code");
    const state = verifyOAuthState(req.query.state);
    const cookieState = parseCookies(req).google_oauth_state;
    if (!cookieState || cookieState !== state.nonce)
      throw new Error("Cookie OAuth inválida");
    res.clearCookie("google_oauth_state", { path: "/" });
    const client = googleClient();
    const { tokens } = await client.getToken(String(req.query.code));
    if (!tokens.id_token) throw new Error("Google no devolvió un ID token");
    const user = await findOrCreateGoogleUser(
      await verifyGoogleCredential(tokens.id_token),
    );
    const authTokens = await issueTokens(user);
    await publish("auth_events", {
      event: "USER_LOGIN",
      userId: user.id,
      email: user.email,
      provider: "google",
      timestamp: new Date().toISOString(),
    });
    const callback = new URL("/auth/callback", FRONTEND_URL);
    callback.searchParams.set("accessToken", authTokens.accessToken);
    callback.searchParams.set("refreshToken", authTokens.refreshToken);
    callback.searchParams.set("user", JSON.stringify(serializeUser(user)));
    if (state.clientState)
      callback.searchParams.set("state", state.clientState);
    return res.redirect(callback.toString());
  } catch (e) {
    console.error("❌ Error Google OAuth:", e.message);
    return fail(
      e.message.includes("Estado") || e.message.includes("Cookie")
        ? "oauth_state_invalid"
        : "oauth_failed",
    );
  }
});
app.post("/google/token", async (req, res) => {
  try {
    if (!GOOGLE_CLIENT_ID)
      return res
        .status(503)
        .json({ success: false, error: "Google OAuth no configurado" });
    const credential = req.body.credential || req.body.idToken;
    if (!credential)
      return res
        .status(400)
        .json({ success: false, error: "Credencial de Google requerida" });
    const user = await findOrCreateGoogleUser(
      await verifyGoogleCredential(credential),
    );
    const tokens = await issueTokens(user);
    publish("auth_events", {
      event: "USER_LOGIN",
      userId: user.id,
      email: user.email,
      provider: "google",
      timestamp: new Date().toISOString(),
    });
    return res.json({ success: true, ...tokens, user: serializeUser(user) });
  } catch (e) {
    console.error("❌ Credencial Google rechazada:", e.message);
    return res
      .status(401)
      .json({
        success: false,
        error:
          "No se pudo validar tu cuenta de Google. Revisa el Client ID y los orígenes autorizados.",
      });
  }
});
app.post("/change-own-password", async (req, res) => {
  try {
    const uid = String(req.headers["x-user-id"] || "");
    const currentPassword = String(req.body.currentPassword || "");
    const newPassword = String(req.body.newPassword || "");
    if (!uid)
      return res
        .status(401)
        .json({ success: false, error: "Sesión requerida" });
    if (newPassword.length < 8)
      return res
        .status(400)
        .json({
          success: false,
          error: "La nueva contraseña debe tener al menos 8 caracteres",
        });
    const user = await getById(uid);
    if (!user || !user.activo)
      return res
        .status(404)
        .json({ success: false, error: "Usuario no encontrado" });
    if (String(user.authProvider || "local") !== "google") {
      if (!currentPassword)
        return res
          .status(400)
          .json({ success: false, error: "Ingresa tu contraseña actual" });
      const passwordRow = await one("SELECT password FROM users WHERE id=?", [
        uid,
      ]);
      if (
        !passwordRow?.password ||
        !(await bcrypt.compare(currentPassword, passwordRow.password))
      )
        return res
          .status(400)
          .json({
            success: false,
            error: "La contraseña actual no es correcta",
          });
    }
    await updateUser(uid, {
      password: await bcrypt.hash(newPassword, 12),
      needPasswordChange: 0,
      refreshToken: null,
    });
    await publish("auth_events", {
      event: "PASSWORD_CHANGED",
      userId: uid,
      email: user.email,
      timestamp: new Date().toISOString(),
    });
    return res.json({
      success: true,
      message: "Contraseña actualizada. Vuelve a iniciar sesión.",
    });
  } catch (e) {
    console.error("❌ Error change-own-password:", e.message);
    return res
      .status(500)
      .json({ success: false, error: "No se pudo cambiar la contraseña" });
  }
});
app.post("/refresh-token", async (req, res) => {
  try {
    const refreshToken = req.body.refreshToken;
    if (!refreshToken)
      return res
        .status(401)
        .json({ success: false, error: "Refresh token requerido" });
    const decoded = jwt.verify(refreshToken, REFRESH_SECRET);
    const user = await getById(decoded.userId);
    if (!user || !user.activo || user.refreshToken !== refreshToken)
      return res
        .status(401)
        .json({ success: false, error: "Refresh token inválido" });
    const accessToken = jwt.sign(
      { userId: String(user.id), email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "15m" },
    );
    return res.json({ success: true, accessToken });
  } catch (e) {
    return res
      .status(401)
      .json({ success: false, error: "Refresh token inválido" });
  }
});
app.get("/verify", (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ valid: false });
    return res.json({ valid: true, user: jwt.verify(token, JWT_SECRET) });
  } catch (e) {
    return res.status(401).json({ valid: false });
  }
});
app.post("/change-password", async (req, res) => {
  try {
    if (
      !req.body.email ||
      !req.body.newPassword ||
      String(req.body.newPassword).length < 6
    )
      return res.status(400).json({ success: false, error: "Datos inválidos" });
    const user = await getByEmail(String(req.body.email).toLowerCase());
    if (!user)
      return res
        .status(404)
        .json({ success: false, error: "Usuario no encontrado" });
    await updateUser(user.id, {
      password: await bcrypt.hash(req.body.newPassword, 10),
      needPasswordChange: 0,
    });
    const updated = await getById(user.id);
    await syncUserToUsersService(updated);
    return res.json({ success: true, message: "Contraseña actualizada" });
  } catch (e) {
    return res
      .status(500)
      .json({ success: false, error: "No se pudo actualizar la contraseña" });
  }
});

app.post("/forgot-password", async (req, res) => {
  try {
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    if (!email)
      return res
        .status(400)
        .json({ success: false, error: "Ingresa tu correo electrónico" });
    const user = await getByEmail(email);
    // Respuesta neutra para evitar revelar si una cuenta existe.
    if (!user)
      return res.json({
        success: true,
        message:
          "Si el correo está registrado, recibirás un enlace de recuperación.",
      });
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");
    const minutes = Math.max(5, Number(process.env.RESET_TOKEN_MINUTES || 30));
    await query(
      "UPDATE password_reset_tokens SET usedAt=NOW() WHERE userId=? AND usedAt IS NULL",
      [user.id],
    );
    await query(
      "INSERT INTO password_reset_tokens (userId,tokenHash,expiresAt) VALUES (?,?,DATE_ADD(NOW(), INTERVAL ? MINUTE))",
      [user.id, tokenHash, minutes],
    );
    await sendPasswordResetEmail(user, rawToken);
    return res.json({
      success: true,
      message:
        "Si el correo está registrado, recibirás un enlace de recuperación.",
    });
  } catch (e) {
    console.error("Error forgot-password:", e.message);
    if (e.message === "SMTP_NOT_CONFIGURED")
      return res
        .status(503)
        .json({
          success: false,
          error:
            "El correo de recuperación todavía no está configurado en el servidor.",
        });
    return res
      .status(500)
      .json({
        success: false,
        error: "No se pudo enviar el correo de recuperación",
      });
  }
});
app.post("/reset-password", async (req, res) => {
  try {
    const token = String(req.body.token || "");
    const newPassword = String(req.body.newPassword || "");
    if (!token || newPassword.length < 8)
      return res
        .status(400)
        .json({
          success: false,
          error: "Token inválido o contraseña demasiado corta",
        });
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const row = await one(
      `SELECT prt.id, prt.userId FROM password_reset_tokens prt WHERE prt.tokenHash=? AND prt.usedAt IS NULL AND prt.expiresAt>NOW()`,
      [tokenHash],
    );
    if (!row)
      return res
        .status(400)
        .json({ success: false, error: "El enlace es inválido o ya expiró" });
    await updateUser(row.userId, {
      password: await bcrypt.hash(newPassword, 12),
      needPasswordChange: 0,
      refreshToken: null,
    });
    await query("UPDATE password_reset_tokens SET usedAt=NOW() WHERE id=?", [
      row.id,
    ]);
    return res.json({
      success: true,
      message: "Contraseña actualizada. Ya puedes iniciar sesión.",
    });
  } catch (e) {
    console.error("Error reset-password:", e.message);
    return res
      .status(500)
      .json({ success: false, error: "No se pudo actualizar la contraseña" });
  }
});

app.post("/logout", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      await updateUser(decoded.userId, { refreshToken: null });
    }
  } catch (e) {}
  return res.json({ success: true });
});
const server = app.listen(PORT, "0.0.0.0", () =>
  console.log(`✅ Auth Service MySQL running on port ${PORT}`),
);
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;
server.requestTimeout = 30000;
async function shutdown(signal) {
  console.log(`🛑 ${signal}: cerrando auth-service`);
  server.close(async () => {
    try {
      if (channel) await channel.close();
    } catch (e) {}
    try {
      if (rabbitConnection) await rabbitConnection.close();
    } catch (e) {}
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("unhandledRejection", (e) =>
  console.error("❌ Promesa rechazada:", e),
);
process.on("uncaughtException", (e) => {
  console.error("❌ Excepción no controlada:", e);
  shutdown("uncaughtException");
});
waitForDatabase()
  .then(ensureAuthSchema)
  .then(createDefaultUsers)
  .catch((e) =>
    console.error("❌ MySQL no disponible después de reintentos:", e.message),
  );
connectRabbitMQ();
