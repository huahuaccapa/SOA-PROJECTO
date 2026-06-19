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

// Modelo de Usuario
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
  direccion: {
    departamento: String,
    provincia: String,
    distrito: String,
    linea: String,
    referencia: String
  },
  needPasswordChange: { type: Boolean, default: false }
});

// IMPORTANTE: Crear usuarios por defecto
const User = mongoose.model('User', UserSchema);

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongodb:27017/byteverse')
  .then(async () => {
    console.log('✅ Auth Service conectado a MongoDB');
    
    // Crear usuarios por defecto
    const defaultUsers = [
      {
        nombre: 'Administrador',
        email: 'admin@byteverse.com',
        password: await bcrypt.hash('123456', 10),
        role: 'ADMIN',
        activo: true
      },
      {
        nombre: 'Usuario Comprador',
        email: 'comprador@byteverse.com',
        password: await bcrypt.hash('123456', 10),
        role: 'COMPRADOR',
        activo: true
      },
      {
        nombre: 'Vendedor Tech',
        email: 'vendedor@byteverse.com',
        password: await bcrypt.hash('123456', 10),
        role: 'VENDEDOR',
        activo: true,
        needPasswordChange: true
      },
      {
        nombre: 'Usuario Demo',
        email: 'user@byteverse.com',
        password: await bcrypt.hash('123456', 10),
        role: 'COMPRADOR',
        activo: true
      }
    ];

    for (const userData of defaultUsers) {
      const existing = await User.findOne({ email: userData.email });
      if (!existing) {
        await User.create(userData);
        console.log(`👤 Usuario creado: ${userData.email}`);
      }
    }
  })
  .catch(err => console.error('❌ Error MongoDB:', err));

// Conectar a RabbitMQ
let channel;
async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672');
    channel = await connection.createChannel();
    await channel.assertQueue('auth_events');
    console.log('✅ Auth Service conectado a RabbitMQ');
  } catch (error) {
    console.error('❌ Error RabbitMQ:', error.message);
  }
}

// Endpoints
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
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
    
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '24h' }
    );
    
    // Publicar evento
    if (channel) {
      channel.sendToQueue('auth_events', Buffer.from(JSON.stringify({
        event: 'USER_LOGIN',
        userId: user._id,
        email: user.email,
        timestamp: new Date().toISOString()
      })));
    }
    
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        nombre: user.nombre,
        email: user.email,
        role: user.role,
        needPasswordChange: user.needPasswordChange || false
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/register', async (req, res) => {
  try {
    const { nombre, email, password, role } = req.body;
    
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, error: 'El correo ya está registrado' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      nombre,
      email,
      password: hashedPassword,
      role: role || 'COMPRADOR'
    });
    
    await user.save();
    
    // Publicar evento
    if (channel) {
      channel.sendToQueue('auth_events', Buffer.from(JSON.stringify({
        event: 'USER_REGISTERED',
        userId: user._id,
        email: user.email,
        nombre: user.nombre,
        role: user.role,
        timestamp: new Date().toISOString()
      })));
    }
    
    res.status(201).json({
      success: true,
      user: {
        id: user._id,
        nombre: user.nombre,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

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

app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'auth-service' });
});

// Iniciar
connectRabbitMQ().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Auth Service running on port ${PORT}`);
  });
});