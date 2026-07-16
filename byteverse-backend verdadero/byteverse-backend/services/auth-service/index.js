const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const amqp = require('amqplib');
const cors = require('cors');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
require('dotenv').config();

const app = express();
const PORT = Number(process.env.PORT || 3001);
const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:password@mongodb:27017/byteverse?authSource=admin';
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback';
const STATE_SECRET = process.env.OAUTH_STATE_SECRET || process.env.JWT_SECRET || 'change-this-oauth-state-secret';
const COOKIE_SECURE = process.env.COOKIE_SECURE === 'true';

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true,
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

console.log('🚀 Auth Service iniciando...');

const UserSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: true },
  role: { type: String, enum: ['ADMIN', 'VENDEDOR', 'COMPRADOR'], default: 'COMPRADOR' },
  activo: { type: Boolean, default: true },
  fechaRegistro: { type: Date, default: Date.now },
  needPasswordChange: { type: Boolean, default: false },
  refreshToken: { type: String },
  googleId: { type: String, unique: true, sparse: true },
  authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
  emailVerified: { type: Boolean, default: false },
  avatar: { type: String, default: '' },
  telefono: { type: String, default: '' },
  direccion: { type: String, default: '' },
  documento: { type: String, default: '' },
  tipoDocumento: { type: String, enum: ['DNI', 'RUC', 'CE', 'PASAPORTE'], default: 'DNI' },
  descripcion: { type: String, default: '' },
  categorias: [{ type: String }],
  comision: { type: Number, default: 10 },
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);

let mongoRetryDelay = 2000;
let mongoRetryTimer = null;
let mongoConnecting = false;

async function connectMongo() {
  if (mongoConnecting || mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) return;
  mongoConnecting = true;
  try {
    console.log('📡 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 20,
      minPoolSize: 2,
      heartbeatFrequencyMS: 10000,
    });
    mongoRetryDelay = 2000;
    console.log('✅ Auth Service conectado a MongoDB');
    await createDefaultUsers();
  } catch (error) {
    console.error(`❌ MongoDB no disponible: ${error.message}. Reintentando en ${mongoRetryDelay / 1000}s`);
    if (!mongoRetryTimer) {
      mongoRetryTimer = setTimeout(() => {
        mongoRetryTimer = null;
        connectMongo();
      }, mongoRetryDelay);
      mongoRetryDelay = Math.min(mongoRetryDelay * 2, 30000);
    }
  } finally {
    mongoConnecting = false;
  }
}

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB desconectado; el driver intentará recuperarse');
});
mongoose.connection.on('error', (error) => console.error('❌ Error de MongoDB:', error.message));

let rabbitConnection = null;
let channel = null;
let rabbitConnecting = false;
let rabbitRetryTimer = null;
let rabbitRetryDelay = 2000;

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
    console.log('📡 Conectando a RabbitMQ...');
    rabbitConnection = await amqp.connect(RABBITMQ_URL, { heartbeat: 15 });
    rabbitConnection.on('error', (error) => console.error('❌ Error de RabbitMQ:', error.message));
    rabbitConnection.on('close', () => {
      console.warn('⚠️ RabbitMQ desconectado; programando reconexión');
      rabbitConnection = null;
      channel = null;
      scheduleRabbitReconnect();
    });
    channel = await rabbitConnection.createConfirmChannel();
    channel.on('error', (error) => console.error('❌ Error del canal RabbitMQ:', error.message));
    channel.on('close', () => {
      channel = null;
      scheduleRabbitReconnect();
    });
    await Promise.all([
      channel.assertQueue('auth_events', { durable: true }),
      channel.assertQueue('user_sync_queue', { durable: true }),
      channel.assertQueue('auth_response_queue', { durable: true }),
    ]);
    rabbitRetryDelay = 2000;
    console.log('✅ Auth Service conectado a RabbitMQ');
    return channel;
  } catch (error) {
    rabbitConnection = null;
    channel = null;
    console.error(`❌ RabbitMQ no disponible: ${error.message}. Se reintentará automáticamente`);
    scheduleRabbitReconnect();
    return null;
  } finally {
    rabbitConnecting = false;
  }
}

async function publish(queue, payload) {
  try {
    if (!channel) await connectRabbitMQ();
    if (!channel) return false;
    channel.sendToQueue(queue, Buffer.from(JSON.stringify(payload)), { persistent: true, contentType: 'application/json' });
    await channel.waitForConfirms();
    return true;
  } catch (error) {
    console.error(`⚠️ Evento no publicado en ${queue}:`, error.message);
    channel = null;
    scheduleRabbitReconnect();
    return false;
  }
}

async function createDefaultUsers() {
  const defaults = [
    ['Administrador', 'admin@byteverse.com', 'ADMIN', { telefono: '999888777', direccion: 'Lima, Perú' }],
    ['Usuario Comprador', 'comprador@byteverse.com', 'COMPRADOR', { telefono: '999111222', direccion: 'Av. Siempre Viva 123', documento: '12345678', tipoDocumento: 'DNI' }],
    ['Vendedor Tech', 'vendedor@byteverse.com', 'VENDEDOR', { needPasswordChange: true, telefono: '999333444', direccion: 'Calle Tecnológica 456', documento: '87654321', tipoDocumento: 'RUC', descripcion: 'Venta de productos tecnológicos', categorias: ['Laptops', 'Smartphones', 'Tablets'] }],
    ['Usuario Demo', 'user@byteverse.com', 'COMPRADOR', { telefono: '999555666', direccion: 'Calle Demo 789' }],
  ];
  for (const [nombre, email, role, extra] of defaults) {
    try {
      const exists = await User.exists({ email });
      if (!exists) await User.create({ nombre, email, role, password: await bcrypt.hash('123456', 10), ...extra });
    } catch (error) {
      console.error(`❌ No se pudo preparar ${email}:`, error.message);
    }
  }
}

function serializeUser(user) {
  return {
    id: user._id,
    nombre: user.nombre,
    email: user.email,
    role: user.role,
    needPasswordChange: user.needPasswordChange || false,
    telefono: user.telefono || '',
    direccion: user.direccion || '',
    documento: user.documento || '',
    tipoDocumento: user.tipoDocumento || 'DNI',
    descripcion: user.descripcion || '',
    categorias: user.categorias || [],
    comision: user.comision || 10,
    activo: user.activo,
    avatar: user.avatar || '',
    authProvider: user.authProvider || 'local',
  };
}

async function issueTokens(user) {
  const accessToken = jwt.sign(
    { userId: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' },
  );
  const refreshToken = jwt.sign(
    { userId: user._id, email: user.email },
    process.env.REFRESH_SECRET || 'refresh_secret',
    { expiresIn: process.env.REFRESH_EXPIRES_IN || '7d' },
  );
  await User.findByIdAndUpdate(user._id, { refreshToken });
  return { accessToken, refreshToken };
}

async function syncUserToUsersService(user) {
  return publish('user_sync_queue', {
    id: user._id.toString(), ...serializeUser(user), fechaRegistro: user.fechaRegistro,
  });
}

function parseCookies(req) {
  return Object.fromEntries((req.headers.cookie || '').split(';').filter(Boolean).map((item) => {
    const index = item.indexOf('=');
    return [item.slice(0, index).trim(), decodeURIComponent(item.slice(index + 1))];
  }));
}

function signOAuthState(payload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', STATE_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

function verifyOAuthState(state) {
  const [encoded, signature] = String(state || '').split('.');
  if (!encoded || !signature) throw new Error('Estado OAuth incompleto');
  const expected = crypto.createHmac('sha256', STATE_SECRET).update(encoded).digest('base64url');
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    throw new Error('Firma OAuth inválida');
  }
  const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  if (!payload.nonce || !payload.expiresAt || Date.now() > payload.expiresAt) throw new Error('Estado OAuth expirado');
  return payload;
}

function googleClient() {
  return new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL);
}

async function findOrCreateGoogleUser(payload) {
  if (!payload.email || !payload.email_verified) throw new Error('Google no confirmó el correo del usuario');
  const email = payload.email.toLowerCase();
  let user = await User.findOne({ $or: [{ googleId: payload.sub }, { email }] });
  if (!user) {
    user = await User.create({
      nombre: payload.name || email.split('@')[0],
      email,
      password: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10),
      googleId: payload.sub,
      authProvider: 'google',
      emailVerified: true,
      avatar: payload.picture || '',
      role: 'COMPRADOR',
    });
    await syncUserToUsersService(user);
    await publish('auth_events', { event: 'USER_REGISTERED', userId: user._id, email: user.email, nombre: user.nombre, role: user.role, provider: 'google', timestamp: new Date().toISOString() });
  } else {
    if (!user.activo) throw new Error('Usuario inactivo');
    user.googleId = user.googleId || payload.sub;
    user.emailVerified = true;
    if (!user.avatar && payload.picture) user.avatar = payload.picture;
    await user.save();
  }
  return user;
}

app.get('/health/live', (req, res) => res.json({ status: 'OK', service: 'auth-service', uptime: process.uptime() }));
app.get('/health/ready', (req, res) => {
  const ready = mongoose.connection.readyState === 1;
  res.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'not_ready', mongodb: ready ? 'connected' : 'disconnected', rabbitmq: channel ? 'connected' : 'reconnecting' });
});
app.get('/health', (req, res) => res.json({ status: mongoose.connection.readyState === 1 ? 'OK' : 'DEGRADED', service: 'auth-service', mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected', rabbitmq: channel ? 'connected' : 'reconnecting' }));

app.post('/login', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!email || !password) return res.status(400).json({ success: false, error: 'Email y contraseña requeridos' });
    const user = await User.findOne({ email });
    if (!user || !user.activo || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ success: false, error: 'Credenciales inválidas' });
    const tokens = await issueTokens(user);
    publish('auth_events', { event: 'USER_LOGIN', userId: user._id, email: user.email, timestamp: new Date().toISOString() });
    return res.json({ success: true, ...tokens, user: serializeUser(user) });
  } catch (error) {
    console.error('❌ Error en login:', error.message);
    return res.status(500).json({ success: false, error: 'No se pudo iniciar sesión' });
  }
});

app.post('/register', async (req, res) => {
  try {
    const { nombre, password, telefono, direccion, documento, tipoDocumento } = req.body;
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!nombre || !email || !password) return res.status(400).json({ success: false, error: 'Nombre, correo y contraseña son requeridos' });
    if (String(password).length < 6) return res.status(400).json({ success: false, error: 'La contraseña debe tener al menos 6 caracteres' });
    if (await User.exists({ email })) return res.status(400).json({ success: false, error: 'El correo ya está registrado' });
    const user = await User.create({ nombre, email, password: await bcrypt.hash(password, 10), role: 'COMPRADOR', telefono: telefono || '', direccion: direccion || '', documento: documento || '', tipoDocumento: tipoDocumento || 'DNI' });
    await syncUserToUsersService(user);
    publish('auth_events', { event: 'USER_REGISTERED', userId: user._id, email, nombre, role: user.role, timestamp: new Date().toISOString() });
    return res.status(201).json({ success: true, user: serializeUser(user) });
  } catch (error) {
    console.error('❌ Error en registro:', error.message);
    return res.status(500).json({ success: false, error: 'No se pudo completar el registro' });
  }
});

// Inicio del flujo OAuth usado por el frontend: GET /api/auth/google?state=...
app.get('/google', (req, res) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res.redirect(`${FRONTEND_URL}/login?error=oauth_not_configured`);
  }
  const nonce = crypto.randomBytes(24).toString('base64url');
  const clientState = /^[a-zA-Z0-9_-]{8,160}$/.test(String(req.query.state || '')) ? String(req.query.state) : '';
  const state = signOAuthState({ nonce, clientState, expiresAt: Date.now() + 10 * 60 * 1000 });
  res.cookie('google_oauth_state', nonce, { httpOnly: true, secure: COOKIE_SECURE, sameSite: 'lax', maxAge: 10 * 60 * 1000, path: '/' });
  return res.redirect(googleClient().generateAuthUrl({ access_type: 'offline', prompt: 'select_account', scope: ['openid', 'email', 'profile'], state }));
});

app.get('/google/callback', async (req, res) => {
  const fail = (code = 'oauth_failed') => res.redirect(`${FRONTEND_URL}/login?error=${encodeURIComponent(code)}`);
  try {
    if (req.query.error) return fail(req.query.error === 'access_denied' ? 'access_denied' : 'oauth_failed');
    if (!req.query.code) return fail('oauth_missing_code');
    const state = verifyOAuthState(req.query.state);
    const cookieState = parseCookies(req).google_oauth_state;
    if (!cookieState || cookieState !== state.nonce) throw new Error('Cookie OAuth inválida');
    res.clearCookie('google_oauth_state', { path: '/' });

    const client = googleClient();
    const { tokens } = await client.getToken(String(req.query.code));
    if (!tokens.id_token) throw new Error('Google no devolvió un ID token');
    const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: GOOGLE_CLIENT_ID });
    const user = await findOrCreateGoogleUser(ticket.getPayload());
    const authTokens = await issueTokens(user);
    await publish('auth_events', { event: 'USER_LOGIN', userId: user._id, email: user.email, provider: 'google', timestamp: new Date().toISOString() });

    const callback = new URL('/auth/callback', FRONTEND_URL);
    callback.searchParams.set('accessToken', authTokens.accessToken);
    callback.searchParams.set('refreshToken', authTokens.refreshToken);
    callback.searchParams.set('user', JSON.stringify(serializeUser(user)));
    if (state.clientState) callback.searchParams.set('state', state.clientState);
    return res.redirect(callback.toString());
  } catch (error) {
    console.error('❌ Error en Google OAuth:', error.message);
    return fail();
  }
});

// Alternativa para Google Identity Services: verifica una credencial sin usar client secret.
app.post('/google/token', async (req, res) => {
  try {
    if (!GOOGLE_CLIENT_ID) return res.status(503).json({ success: false, error: 'Google OAuth no configurado' });
    const credential = req.body.credential || req.body.idToken;
    if (!credential) return res.status(400).json({ success: false, error: 'Credencial de Google requerida' });
    const ticket = await googleClient().verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
    const user = await findOrCreateGoogleUser(ticket.getPayload());
    const tokens = await issueTokens(user);
    publish('auth_events', { event: 'USER_LOGIN', userId: user._id, email: user.email, provider: 'google', timestamp: new Date().toISOString() });
    return res.json({ success: true, ...tokens, user: serializeUser(user) });
  } catch (error) {
    console.error('❌ Credencial de Google rechazada:', error.message);
    return res.status(401).json({ success: false, error: 'Credencial de Google inválida' });
  }
});

app.post('/refresh-token', async (req, res) => {
  try {
    const refreshToken = req.body.refreshToken;
    if (!refreshToken) return res.status(401).json({ success: false, error: 'Refresh token requerido' });
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET || 'refresh_secret');
    const user = await User.findById(decoded.userId);
    if (!user || !user.activo || user.refreshToken !== refreshToken) return res.status(401).json({ success: false, error: 'Refresh token inválido' });
    const accessToken = jwt.sign({ userId: user._id, email: user.email, role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: process.env.JWT_EXPIRES_IN || '15m' });
    return res.json({ success: true, accessToken });
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Refresh token inválido' });
  }
});

app.get('/verify', (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ valid: false });
    return res.json({ valid: true, user: jwt.verify(token, process.env.JWT_SECRET || 'secret') });
  } catch (error) {
    return res.status(401).json({ valid: false });
  }
});

app.post('/change-password', async (req, res) => {
  try {
    if (!req.body.email || !req.body.newPassword || String(req.body.newPassword).length < 6) return res.status(400).json({ success: false, error: 'Datos inválidos' });
    const user = await User.findOne({ email: String(req.body.email).toLowerCase() });
    if (!user) return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    user.password = await bcrypt.hash(req.body.newPassword, 10);
    user.needPasswordChange = false;
    await user.save();
    return res.json({ success: true, message: 'Contraseña actualizada' });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'No se pudo actualizar la contraseña' });
  }
});

app.post('/logout', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      await User.findByIdAndUpdate(decoded.userId, { refreshToken: null });
    }
  } catch (error) {
    // El cierre local debe funcionar incluso con un token vencido.
  }
  return res.json({ success: true });
});

app.use((error, req, res, next) => {
  console.error('❌ Error no controlado en auth-service:', error.message);
  if (res.headersSent) return next(error);
  return res.status(500).json({ success: false, error: 'Error interno del servicio de autenticación' });
});

const server = app.listen(PORT, '0.0.0.0', () => console.log(`✅ Auth Service running on port ${PORT}`));
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;
server.requestTimeout = 30000;

async function shutdown(signal) {
  console.log(`🛑 ${signal}: cerrando auth-service de forma segura`);
  server.close(async () => {
    try { if (channel) await channel.close(); } catch (error) { /* noop */ }
    try { if (rabbitConnection) await rabbitConnection.close(); } catch (error) { /* noop */ }
    try { await mongoose.connection.close(); } catch (error) { /* noop */ }
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (error) => console.error('❌ Promesa rechazada:', error));
process.on('uncaughtException', (error) => {
  console.error('❌ Excepción no controlada:', error);
  shutdown('uncaughtException');
});

connectMongo();
connectRabbitMQ();
