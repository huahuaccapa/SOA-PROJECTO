const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const amqp = require('amqplib');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

console.log('🚀 Auth Service iniciando...');

// ==================== MODELO DE USUARIO ACTUALIZADO ====================
// ✅ AÑADIDO: telefono, direccion, documento, tipoDocumento, descripcion, categorias, comision
const UserSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['ADMIN', 'VENDEDOR', 'COMPRADOR'], 
    default: 'COMPRADOR' 
  },
  activo: { type: Boolean, default: true },
  fechaRegistro: { type: Date, default: Date.now },
  needPasswordChange: { type: Boolean, default: false },
  refreshToken: { type: String },
  // ✅ NUEVOS CAMPOS
  telefono: { type: String, default: '' },
  direccion: { type: String, default: '' },
  documento: { type: String, default: '' },
  tipoDocumento: { type: String, enum: ['DNI', 'RUC', 'CE', 'PASAPORTE'], default: 'DNI' },
  descripcion: { type: String, default: '' },
  categorias: [{ type: String }],
  comision: { type: Number, default: 10 }
});

const User = mongoose.model('User', UserSchema);

// Conectar a MongoDB
console.log('📡 Conectando a MongoDB...');
mongoose.connect(process.env.MONGODB_URI || 'mongodb://admin:password@mongodb:27017/byteverse?authSource=admin', {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
})
  .then(async () => {
    console.log('✅ Auth Service conectado a MongoDB');
    await createDefaultUsers();
    console.log('📦 Usuarios por defecto listos');
  })
  .catch(err => {
    console.error('❌ Error MongoDB:', err.message);
  });

// RabbitMQ
let channel;
async function connectRabbitMQ() {
  try {
    console.log('📡 Conectando a RabbitMQ...');
    const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672');
    channel = await connection.createChannel();
    await channel.assertQueue('auth_events', { durable: true });
    await channel.assertQueue('user_sync_queue', { durable: true });
    await channel.assertQueue('auth_response_queue', { durable: true });
    console.log('✅ Auth Service conectado a RabbitMQ');
    return channel;
  } catch (error) {
    console.error('❌ Error RabbitMQ:', error.message);
    return null;
  }
}

// Crear usuarios por defecto
async function createDefaultUsers() {
  const defaultUsers = [
    {
      nombre: 'Administrador',
      email: 'admin@byteverse.com',
      password: await bcrypt.hash('123456', 10),
      role: 'ADMIN',
      activo: true,
      telefono: '999888777',
      direccion: 'Lima, Perú'
    },
    {
      nombre: 'Usuario Comprador',
      email: 'comprador@byteverse.com',
      password: await bcrypt.hash('123456', 10),
      role: 'COMPRADOR',
      activo: true,
      telefono: '999111222',
      direccion: 'Av. Siempre Viva 123',
      documento: '12345678',
      tipoDocumento: 'DNI'
    },
    {
      nombre: 'Vendedor Tech',
      email: 'vendedor@byteverse.com',
      password: await bcrypt.hash('123456', 10),
      role: 'VENDEDOR',
      activo: true,
      needPasswordChange: true,
      telefono: '999333444',
      direccion: 'Calle Tecnológica 456',
      documento: '87654321',
      tipoDocumento: 'RUC',
      descripcion: 'Venta de productos tecnológicos',
      categorias: ['Laptops', 'Smartphones', 'Tablets'],
      comision: 10
    },
    {
      nombre: 'Usuario Demo',
      email: 'user@byteverse.com',
      password: await bcrypt.hash('123456', 10),
      role: 'COMPRADOR',
      activo: true,
      telefono: '999555666',
      direccion: 'Calle Demo 789'
    }
  ];

  for (const userData of defaultUsers) {
    try {
      const existing = await User.findOne({ email: userData.email });
      if (!existing) {
        await User.create(userData);
        console.log(`👤 Usuario creado: ${userData.email}`);
      }
    } catch (error) {
      console.error(`❌ Error creando usuario ${userData.email}:`, error.message);
    }
  }
}

// Sincronizar usuario con Users Service
async function syncUserToUsersService(user) {
  try {
    if (!channel) {
      console.warn('⚠️ RabbitMQ no disponible');
      return;
    }

    const userData = {
      id: user._id.toString(),
      nombre: user.nombre,
      email: user.email,
      role: user.role,
      activo: user.activo,
      fechaRegistro: user.fechaRegistro,
      telefono: user.telefono || '',
      direccion: user.direccion || '',
      documento: user.documento || '',
      tipoDocumento: user.tipoDocumento || 'DNI',
      descripcion: user.descripcion || '',
      categorias: user.categorias || [],
      comision: user.comision || 10
    };

    await channel.sendToQueue('user_sync_queue', Buffer.from(JSON.stringify(userData)), { persistent: true });
    console.log(`📤 Usuario enviado a sincronización: ${user.email}`);

    return true;
  } catch (error) {
    console.error(`❌ Error sincronizando usuario ${user.email}:`, error);
    return false;
  }
}

// ==================== ENDPOINTS ====================

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'auth-service',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    rabbitmq: channel ? 'connected' : 'disconnected'
  });
});

// Login
app.post('/login', async (req, res) => {
  try {
    console.log(`🔐 Login intento: ${req.body.email}`);
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email y contraseña requeridos' 
      });
    }
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, error: 'Credenciales inválidas' });
    }
    
    if (!user.activo) {
      return res.status(401).json({ success: false, error: 'Usuario inactivo' });
    }
    
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Credenciales inválidas' });
    }
    
    console.log(`✅ Login exitoso: ${email}`);
    
    const accessToken = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '15m' }
    );
    
    const refreshToken = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.REFRESH_SECRET || 'refresh_secret',
      { expiresIn: '7d' }
    );
    
    await User.findByIdAndUpdate(user._id, { refreshToken });
    
    if (channel) {
      await channel.sendToQueue('auth_events', Buffer.from(JSON.stringify({
        event: 'USER_LOGIN',
        userId: user._id,
        email: user.email,
        timestamp: new Date().toISOString()
      })), { persistent: true });
    }
    
    res.json({
      success: true,
      accessToken,
      refreshToken,
      user: {
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
        activo: user.activo
      }
    });
  } catch (error) {
    console.error('❌ Error en login:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Registro
app.post('/register', async (req, res) => {
  try {
    const { nombre, email, password, role, telefono, direccion, documento, tipoDocumento } = req.body;
    
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, error: 'El correo ya está registrado' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      nombre,
      email,
      password: hashedPassword,
      role: role || 'COMPRADOR',
      telefono: telefono || '',
      direccion: direccion || '',
      documento: documento || '',
      tipoDocumento: tipoDocumento || 'DNI',
      categorias: [],
      comision: 10
    });
    
    await user.save();
    console.log(`✅ Usuario registrado: ${email}`);
    
    // Sincronizar con Users Service
    await syncUserToUsersService(user);
    
    if (channel) {
      await channel.sendToQueue('auth_events', Buffer.from(JSON.stringify({
        event: 'USER_REGISTERED',
        userId: user._id,
        email: user.email,
        nombre: user.nombre,
        role: user.role,
        timestamp: new Date().toISOString()
      })), { persistent: true });
    }
    
    res.status(201).json({
      success: true,
      user: {
        id: user._id,
        nombre: user.nombre,
        email: user.email,
        role: user.role,
        telefono: user.telefono,
        direccion: user.direccion,
        documento: user.documento,
        tipoDocumento: user.tipoDocumento
      }
    });
  } catch (error) {
    console.error('❌ Error en registro:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Refresh Token
app.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({ success: false, error: 'Refresh token requerido' });
    }
    
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET || 'refresh_secret');
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ success: false, error: 'Usuario no encontrado' });
    }
    
    const newAccessToken = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '15m' }
    );
    
    res.json({
      success: true,
      accessToken: newAccessToken
    });
  } catch (error) {
    console.error('❌ Error en refresh token:', error);
    res.status(401).json({ success: false, error: 'Refresh token inválido' });
  }
});

// Verificar token
app.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ valid: false });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    res.json({ valid: true, user: decoded });
  } catch (error) {
    res.status(401).json({ valid: false });
  }
});

// Cambiar contraseña
app.post('/change-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.needPasswordChange = false;
    await user.save();
    
    res.json({ success: true, message: 'Contraseña actualizada' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Logout
app.post('/logout', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      await User.findByIdAndUpdate(decoded.userId, { refreshToken: null });
    }
    res.json({ success: true });
  } catch (error) {
    res.json({ success: true });
  }
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Auth Service running on port ${PORT}`);
});

// Conectar RabbitMQ
setTimeout(() => {
  connectRabbitMQ();
}, 2000);