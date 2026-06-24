const express = require('express');
const mongoose = require('mongoose');
const amqp = require('amqplib');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3004;

app.use(cors());
app.use(express.json());

// Modelo de Usuario
const UserSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, required: true },
  nombre: String,
  email: { type: String, unique: true },
  role: String,
  activo: Boolean,
  fechaRegistro: Date,
  direccion: {
    departamento: String,
    provincia: String,
    distrito: String,
    linea: String,
    referencia: String
  },
  tienda: String,
  ruc: String,
  telefono: String,
  ultimoAcceso: Date,
  ventasRealizadas: { type: Number, default: 0 },
  totalVentas: { type: Number, default: 0 },
  syncStatus: { type: String, enum: ['SYNCED', 'PENDING', 'FAILED'], default: 'SYNCED' }
});

const User = mongoose.model('User', UserSchema);

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://admin:password@mongodb:27017/byteverse?authSource=admin')
  .then(() => console.log('✅ Users Service conectado a MongoDB'))
  .catch(err => console.error('❌ Error MongoDB:', err));

// RabbitMQ
let channel;
async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672');
    channel = await connection.createChannel();
    await channel.assertQueue('user_sync_queue', { durable: true });
    await channel.assertQueue('auth_response_queue', { durable: true });
    console.log('✅ Users Service conectado a RabbitMQ');
    
    await channel.consume('user_sync_queue', async (msg) => {
      if (msg) {
        try {
          const userData = JSON.parse(msg.content.toString());
          await handleUserSync(userData);
          channel.ack(msg);
        } catch (error) {
          console.error('Error procesando sincronización:', error);
          channel.ack(msg);
        }
      }
    }, { noAck: false });
    
    return channel;
  } catch (error) {
    console.error('❌ Error RabbitMQ:', error.message);
    return null;
  }
}

// Manejar sincronización
async function handleUserSync(userData) {
  try {
    console.log(`🔄 Sincronizando usuario: ${userData.email}`);
    
    const user = await User.findOne({ _id: userData.id });
    
    if (user) {
      await User.updateOne(
        { _id: userData.id },
        {
          nombre: userData.nombre,
          email: userData.email,
          role: userData.role,
          activo: userData.activo,
          fechaRegistro: userData.fechaRegistro,
          syncStatus: 'SYNCED'
        }
      );
      console.log(`✅ Usuario actualizado: ${userData.email}`);
    } else {
      await User.create({
        _id: userData.id,
        nombre: userData.nombre,
        email: userData.email,
        role: userData.role,
        activo: userData.activo,
        fechaRegistro: userData.fechaRegistro,
        syncStatus: 'SYNCED'
      });
      console.log(`✅ Usuario creado: ${userData.email}`);
    }
    
    await channel.sendToQueue('auth_response_queue', Buffer.from(JSON.stringify({
      userId: userData.id,
      success: true,
      timestamp: new Date().toISOString()
    })), { persistent: true });
    
  } catch (error) {
    console.error(`❌ Error sincronizando:`, error);
    await channel.sendToQueue('auth_response_queue', Buffer.from(JSON.stringify({
      userId: userData.id,
      success: false,
      error: error.message
    })), { persistent: true });
  }
}

// ENDPOINTS
app.get('/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'users-service' });
});

connectRabbitMQ().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Users Service running on port ${PORT}`);
  });
});