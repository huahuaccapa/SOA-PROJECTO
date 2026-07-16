const express = require("express");
const cors = require("cors");
const { createProxyMiddleware } = require("http-proxy-middleware");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const http = require("http");
const { Server } = require("socket.io");
const amqp = require("amqplib");
const { v2: cloudinary } = require("cloudinary");
require("dotenv").config();

const app = express();
const PORT = 3000;
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  },
});
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
// Debe coincidir exactamente con auth-service. El fallback evita que un .env
// ausente genere tokens con una clave y el gateway intente validarlos con otra.
const JWT_SECRET =
  String(process.env.JWT_SECRET || "secret").trim() || "secret";

app.disable("x-powered-by");
app.set("trust proxy", 1);

// Security
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  }),
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiadas peticiones, por favor intenta más tarde" },
});
app.use("/api", limiter);

// CORS
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Accept",
      "X-Refresh-Token",
    ],
  }),
);

// Autenticación y autorización centralizada.
// Las rutas públicas de lectura se mantienen para no romper el catálogo.
const PUBLIC_RULES = [
  {
    method: "POST",
    pattern:
      /^\/api\/auth\/(login|register|google\/token|refresh-token|change-password|forgot-password|reset-password)$/,
  },
  { method: "GET", pattern: /^\/api\/auth\/google(\/callback|\/config)?$/ },
  { method: "GET", pattern: /^\/api\/(products|categories)(\/.*)?$/ },
  { method: "GET", pattern: /^\/uploads\// },
];

function isPublic(req) {
  return PUBLIC_RULES.some(
    (rule) => rule.method === req.method && rule.pattern.test(req.path),
  );
}

function authenticate(req, res, next) {
  if (!req.path.startsWith("/api/") || isPublic(req)) return next();
  const token = String(req.headers.authorization || "").replace(
    /^Bearer\s+/i,
    "",
  );
  if (!token)
    return res
      .status(401)
      .json({ error: "Debes iniciar sesión para continuar" });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    req.headers["x-user-id"] = String(payload.userId || "");
    req.headers["x-user-role"] = String(payload.role || "").toUpperCase();
    req.headers["x-user-email"] = String(payload.email || "");
    return next();
  } catch (error) {
    return res.status(401).json({ error: "Sesión inválida o expirada" });
  }
}

function authorizeSensitiveRoutes(req, res, next) {
  if (!req.user) return next();
  const role = String(req.user.role || "").toUpperCase();
  const currentUserId = String(req.user.userId || "");
  const userMatch = req.path.match(/^\/api\/users\/([^/]+)$/);
  const isSelfUserUpdate = Boolean(
    userMatch &&
    ["PUT", "PATCH"].includes(req.method) &&
    String(userMatch[1]) === currentUserId,
  );

  const adminOnly =
    (req.path === "/api/users" && req.method === "POST") ||
    (req.path.startsWith("/api/users/") && ["DELETE"].includes(req.method)) ||
    (req.path.startsWith("/api/users/") &&
      ["PUT", "PATCH"].includes(req.method) &&
      !isSelfUserUpdate) ||
    (req.path.startsWith("/api/categories") && req.method !== "GET") ||
    (req.path.startsWith("/api/coupons") &&
      req.method !== "GET" &&
      !(req.method === "POST" && req.path === "/api/coupons/validate")) ||
    (req.path.startsWith("/api/products") &&
      ["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) ||
    req.path.startsWith("/api/audit");

  if (adminOnly && role !== "ADMIN") {
    return res
      .status(403)
      .json({ error: "No tienes permisos para realizar esta acción" });
  }
  if (req.path === "/api/upload" && role !== "ADMIN") {
    return res
      .status(403)
      .json({
        error: "Solo el administrador puede subir imágenes de productos",
      });
  }
  return next();
}

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("UNAUTHORIZED"));
    socket.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    next(new Error("UNAUTHORIZED"));
  }
});
io.on("connection", (socket) => {
  const uid = String(socket.user.userId || "");
  const role = String(socket.user.role || "").toUpperCase();
  socket.join(`user:${uid}`);
  socket.join(`role:${role}`);
  socket.emit("notification", {
    type: "CONNECTED",
    title: "Notificaciones activadas",
    message: "Recibirás novedades en tiempo real.",
    createdAt: new Date().toISOString(),
  });
  socket.on("cart:updated", (payload) => {
    io.to(`user:${uid}`).emit("notification", {
      type: "CART_UPDATED",
      title: "Carrito actualizado",
      message: `Tienes ${Number(payload?.totalItems || 0)} producto(s) en tu carrito.`,
      createdAt: new Date().toISOString(),
    });
  });
});
async function connectRealtimeEvents() {
  try {
    const conn = await amqp.connect(
      process.env.RABBITMQ_URL || "amqp://rabbitmq:5672",
    );
    conn.on("close", () => setTimeout(connectRealtimeEvents, 5000));
    const ch = await conn.createChannel();
    const q = "realtime_events";
    await ch.assertQueue(q, { durable: true });
    await ch.consume(q, (msg) => {
      if (!msg) return;
      try {
        const event = JSON.parse(msg.content.toString());
        const uid = String(event.compradorId || event.userId || "");
        const isOrder = String(event.event || "").includes("ORDER");
        const notification = {
          type: event.event || "UPDATE",
          title: isOrder ? "Novedad de tu pedido" : "Nueva actividad",
          message: isOrder
            ? `Tu pedido ${event.orderId || ""} tiene una actualización.`
            : "Hay una novedad en tu cuenta.",
          data: event,
          createdAt: new Date().toISOString(),
        };
        if (uid) io.to(`user:${uid}`).emit("notification", notification);
        io.to("role:ADMIN").emit("notification", notification);
      } catch (e) {
        console.error("Evento realtime inválido:", e.message);
      }
      ch.ack(msg);
    });
  } catch (e) {
    console.error("RabbitMQ realtime:", e.message);
    setTimeout(connectRealtimeEvents, 5000);
  }
}
connectRealtimeEvents();

app.use(authenticate);
app.use(authorizeSensitiveRoutes);

// ============================================
// IMÁGENES: nube en producción, URL en MySQL.
// El binario nunca se guarda en la base de datos.
// ============================================
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    cb(
      file.mimetype.startsWith("image/")
        ? null
        : new Error("Solo se permiten imágenes"),
      file.mimetype.startsWith("image/"),
    ),
});
app.use("/uploads", express.static(uploadsDir));
function cloudinaryReady() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET,
  );
}
if (cloudinaryReady())
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
app.post("/api/upload", upload.single("image"), async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ error: "No se recibió ninguna imagen" });
    const requestedProvider = String(
      process.env.STORAGE_PROVIDER || "local",
    ).toLowerCase();
    if (requestedProvider === "cloudinary" && cloudinaryReady()) {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: process.env.CLOUDINARY_FOLDER || "byteverse",
            resource_type: "image",
            transformation: [{ quality: "auto", fetch_format: "auto" }],
          },
          (err, data) => (err ? reject(err) : resolve(data)),
        );
        stream.end(req.file.buffer);
      });
      return res.json({
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        provider: "cloudinary",
      });
    }
    if (requestedProvider === "cloudinary" && !cloudinaryReady()) {
      console.warn(
        "Cloudinary no está configurado; se usará almacenamiento local persistente.",
      );
    }
    const ext = path.extname(req.file.originalname) || ".jpg";
    const filename = `${Date.now()}-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}${ext}`;
    fs.writeFileSync(path.join(uploadsDir, filename), req.file.buffer);
    return res.json({
      url: `${req.protocol}://${req.get("host")}/uploads/${filename}`,
      provider: "local-dev",
    });
  } catch (e) {
    console.error("Upload:", e.message);
    return res.status(500).json({ error: "No se pudo almacenar la imagen" });
  }
});

// El resto de rutas usa JSON normal
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Logging middleware
app.use((req, res, next) => {
  req.requestId =
    req.headers["x-request-id"] ||
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  res.setHeader("X-Request-Id", req.requestId);
  const startedAt = Date.now();
  res.on("finish", () =>
    console.log(
      `📤 ${req.method} ${req.url} ${res.statusCode} ${Date.now() - startedAt}ms [${req.requestId}]`,
    ),
  );
  next();
});

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    service: "API Gateway",
    timestamp: new Date().toISOString(),
  });
});

// Redirección de rutas del frontend
const frontendRoutes = [
  "/login",
  "/register",
  "/products",
  "/profile",
  "/orders",
  "/buyer",
  "/admin",
  "/vendor",
  "/checkout",
  "/cart",
];
frontendRoutes.forEach((route) => {
  app.get(route, (req, res) => {
    res.redirect(`${FRONTEND_URL}${req.originalUrl}`);
  });
});

app.get("/admin/*", (req, res) => {
  res.redirect(`${FRONTEND_URL}${req.originalUrl}`);
});

app.get("/vendor/*", (req, res) => {
  res.redirect(`${FRONTEND_URL}${req.originalUrl}`);
});

app.get("/buyer/*", (req, res) => {
  res.redirect(`${FRONTEND_URL}${req.originalUrl}`);
});

// ============================================
// ✅ PROXY CONFIGURACIÓN CORREGIDA
// ============================================

function createProxyWithLogging(path, target, rewrite) {
  console.log(`🔧 Configurando proxy: ${path} → ${target}`);

  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: rewrite,
    logLevel: "debug",
    timeout: 30000,
    proxyTimeout: 30000,
    onProxyReq: (proxyReq, req, res) => {
      const newPath = req.url.replace(path, "");
      console.log(
        `🔄 [${path}] ${req.method} ${req.url} → ${target}${newPath}`,
      );

      if (req.body && Object.keys(req.body).length > 0) {
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader("Content-Type", "application/json");
        proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      }
    },
    onProxyRes: (proxyRes, req, res) => {
      console.log(`📥 [${path}] Respuesta: ${proxyRes.statusCode}`);
    },
    onError: (err, req, res) => {
      console.error(`❌ Proxy error en ${path}: ${err.message}`);
      if (res.headersSent) return;
      res.status(503).json({
        error: "Servicio temporalmente no disponible",
        code: "UPSTREAM_UNAVAILABLE",
        requestId: req.requestId,
      });
    },
  });
}

// ✅ CONFIGURACIÓN CORRECTA DE PROXIES
// IMPORTANTE: cada microservicio define sus rutas internamente CON su propio
// prefijo (p.ej. users-service expone app.get('/users', ...), NO app.get('/', ...)).
// Por eso el pathRewrite NO debe borrar el prefijo salvo en los servicios cuyas
// rutas internas de verdad no lo llevan (auth-service expone /login, /register, etc.
// sin prefijo "/auth").
const proxyConfigs = [
  // Auth Service -> rutas internas SIN prefijo (/login, /register, /refresh-token...)
  {
    path: "/api/auth",
    target: "http://auth-service:3001",
    rewrite: { "^/api/auth": "" },
  },
  // Users Service -> rutas internas CON prefijo /users
  {
    path: "/api/users",
    target: "http://users-service:3004",
    rewrite: { "^/api/users": "/users" },
  },
  // Products Service -> rutas internas CON prefijo /products
  {
    path: "/api/products",
    target: "http://products-service:3002",
    rewrite: { "^/api/products": "/products" },
  },
  // Orders Service -> rutas internas CON prefijo /orders
  {
    path: "/api/orders",
    target: "http://orders-service:3003",
    rewrite: { "^/api/orders": "/orders" },
  },
  // Categories Service -> rutas internas CON prefijo /categories
  {
    path: "/api/categories",
    target: "http://categories-service:3014",
    rewrite: { "^/api/categories": "/categories" },
  },
  // Vendor Cart Service -> rutas internas CON prefijo /vendor/cart
  {
    path: "/api/vendor/cart",
    target: "http://vendor-cart-service:3015",
    rewrite: { "^/api/vendor/cart": "/vendor/cart" },
  },
  // Analytics Service -> rutas internas CON prefijo /analytics
  {
    path: "/api/analytics",
    target: "http://analytics-service:3006",
    rewrite: { "^/api/analytics": "/analytics" },
  },
  // Notifications Service (solo consume eventos de RabbitMQ, no expone REST)
  {
    path: "/api/notifications",
    target: "http://notifications-service:3005",
    rewrite: { "^/api/notifications": "" },
  },
  // Inventory Service -> rutas internas CON prefijo /inventory
  {
    path: "/api/inventory",
    target: "http://inventory-service:3007",
    rewrite: { "^/api/inventory": "/inventory" },
  },
  // Payment Service -> rutas internas CON prefijo /payment
  {
    path: "/api/payment",
    target: "http://payment-service:3008",
    rewrite: { "^/api/payment": "/payment" },
  },
  // Shipping Service -> rutas internas CON prefijo /shipping
  {
    path: "/api/shipping",
    target: "http://shipping-service:3009",
    rewrite: { "^/api/shipping": "/shipping" },
  },
  // Reviews Service -> rutas internas CON prefijo /reviews
  {
    path: "/api/reviews",
    target: "http://review-service:3010",
    rewrite: { "^/api/reviews": "/reviews" },
  },
  // Wishlist Service -> rutas internas CON prefijo /wishlist
  {
    path: "/api/wishlist",
    target: "http://wishlist-service:3011",
    rewrite: { "^/api/wishlist": "/wishlist" },
  },
  // Coupons Service -> rutas internas CON prefijo /coupons
  {
    path: "/api/coupons",
    target: "http://coupon-service:3012",
    rewrite: { "^/api/coupons": "/coupons" },
  },
  // Audit Service -> rutas internas CON prefijo /audit
  {
    path: "/api/audit",
    target: "http://audit-service:3013",
    rewrite: { "^/api/audit": "/audit" },
  },
];

// Registrar todos los proxies
proxyConfigs.forEach(({ path, target, rewrite }) => {
  app.use(path, createProxyWithLogging(path, target, rewrite));
});

// Estado agregado: informa qué servicio está degradado sin tumbar el gateway.
app.get("/health/services", async (req, res) => {
  const checks = await Promise.all(
    proxyConfigs.map(async ({ path, target }) => {
      const service = path.replace("/api/", "");
      try {
        const response = await fetch(`${target}/health`, {
          signal: AbortSignal.timeout(2500),
        });
        return {
          service,
          status: response.ok ? "healthy" : "degraded",
          httpStatus: response.status,
        };
      } catch (error) {
        return { service, status: "unavailable" };
      }
    }),
  );
  const healthy = checks.filter((item) => item.status === "healthy").length;
  res.json({
    status: healthy === checks.length ? "OK" : "DEGRADED",
    gateway: "healthy",
    healthyServices: healthy,
    totalServices: checks.length,
    services: checks,
    timestamp: new Date().toISOString(),
  });
});

// ✅ Ruta de prueba
app.get("/api/test", (req, res) => {
  res.json({ message: "API Gateway funcionando correctamente" });
});

// 404 handler
app.use("*", (req, res) => {
  console.log(`❌ Ruta no encontrada: ${req.method} ${req.url}`);
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
    method: req.method,
  });
});

app.use((error, req, res, next) => {
  console.error(
    `❌ Error del gateway [${req.requestId || "sin-id"}]:`,
    error.message,
  );
  if (res.headersSent) return next(error);
  const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 500;
  return res.status(status).json({
    error:
      status === 413
        ? "El archivo supera el límite permitido"
        : "Error interno del gateway",
    requestId: req.requestId,
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ API Gateway running on port ${PORT}`);
  console.log(`🔄 Redirigiendo rutas de frontend a: ${FRONTEND_URL}`);
  console.log("📋 Proxies configurados:");
  proxyConfigs.forEach(({ path, target }) => {
    console.log(`   ${path} → ${target}`);
  });
});

server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;
server.requestTimeout = 35000;

function shutdown(signal) {
  console.log(`🛑 ${signal}: cerrando API Gateway de forma segura`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("unhandledRejection", (error) =>
  console.error("❌ Promesa rechazada en gateway:", error),
);
process.on("uncaughtException", (error) => {
  console.error("❌ Excepción no controlada en gateway:", error);
  shutdown("uncaughtException");
});
