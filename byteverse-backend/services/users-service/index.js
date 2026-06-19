const express = require('express');
const mongoose = require('mongoose');
const amqp = require('amqplib');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3004;

app.use(cors());
app.use(express.json());

// Modelo de Usuario (sin contraseña)
const UserSchema = new mongoose.Schema({
  nombre: String,
  email: String,
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
  totalVentas: { type: Number, default: 0 }
});

const User = mongoose.model('User', UserSchema);

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongodb:27017/byteverse')
  .then(async () => {
    console.log('✅ Users Service conectado a MongoDB');
    
    // Sincronizar usuarios desde auth-service si es necesario
    // Por ahora, solo creamos si no existen
  })
  .catch(err => console.error('❌ Error MongoDB:', err));

// Conectar a RabbitMQ
let channel;
async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672');
    channel = await connection.createChannel();
    await channel.assertQueue('user_events');
    console.log('✅ Users Service conectado a RabbitMQ');
  } catch (error) {
    console.error('❌ Error RabbitMQ:', error.message);
  }
}

// Endpoints
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