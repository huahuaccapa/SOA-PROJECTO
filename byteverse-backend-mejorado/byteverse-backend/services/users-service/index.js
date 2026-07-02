const express = require('express');
const mongoose = require('mongoose');
const amqp = require('amqplib');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3004;

app.use(cors());
app.use(express.json());

// ==================== MODELO DE USUARIO ACTUALIZADO ====================
// ✅ AÑADIDO: telefono, direccion (string), documento, tipoDocumento, descripcion, categorias, comision
const UserSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, required: true },
  nombre: String,
  email: { type: String, unique: true },
  role: String,
  activo: Boolean,
  fechaRegistro: Date,
  // ✅ NUEVOS CAMPOS
  telefono: { type: String, default: '' },
  direccion: { type: String, default: '' },
  documento: { type: String, default: '' },
  tipoDocumento: { type: String, default: 'DNI' },
  descripcion: { type: String, default: '' },
  categorias: [{ type: String }],
  comision: { type: Number, default: 10 },
  // Campos existentes
  tienda: String,
  ruc: String,
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
let rabbitRetryTimer;
const retryRabbitMQ = () => {
  if (!rabbitRetryTimer) rabbitRetryTimer = setTimeout(() => {
    rabbitRetryTimer = null;
    connectRabbitMQ();
  }, 5000);
};
async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672', { heartbeat: 15 });
    connection.on('error', error => console.error('❌ RabbitMQ:', error.message));
    connection.on('close', () => { channel = null; retryRabbitMQ(); });
    channel = await connection.createChannel();
    channel.on('close', () => { channel = null; retryRabbitMQ(); });
    await channel.assertQueue('user_sync_queue', { durable: true });
    await channel.assertQueue('auth_response_queue', { durable: true });
    console.log('✅ Users Service conectado a RabbitMQ');
    
    await channel.consume('user_sync_queue', async (msg) => {
      if (msg) {
        try {
          const userData = JSON.parse(msg.content.toString());
          await handleUserSync(userData);
          if (channel) channel.ack(msg);
        } catch (error) {
          console.error('Error procesando sincronización:', error);
          if (channel) channel.ack(msg);
        }
      }
    }, { noAck: false });
    
    return channel;
  } catch (error) {
    console.error('❌ Error RabbitMQ:', error.message);
    channel = null;
    retryRabbitMQ();
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
          telefono: userData.telefono || '',
          direccion: userData.direccion || '',
          documento: userData.documento || '',
          tipoDocumento: userData.tipoDocumento || 'DNI',
          descripcion: userData.descripcion || '',
          categorias: userData.categorias || [],
          comision: userData.comision || 10,
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
        telefono: userData.telefono || '',
        direccion: userData.direccion || '',
        documento: userData.documento || '',
        tipoDocumento: userData.tipoDocumento || 'DNI',
        descripcion: userData.descripcion || '',
        categorias: userData.categorias || [],
        comision: userData.comision || 10,
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

// ==================== ENDPOINTS ====================

// Obtener todos los usuarios
app.get('/users', async (req, res) => {
  try {
    const { role, documento, activo } = req.query;
    const query = {};
    if (role) query.role = role;
    if (documento) query.documento = documento;
    if (activo !== undefined) query.activo = activo === 'true';
    
    const users = await User.find(query);
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener usuario por ID
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

// Actualizar usuario
app.put('/users/:id', async (req, res) => {
  try {
    const updateData = req.body;
    // No permitir actualizar _id o email
    delete updateData._id;
    delete updateData.email;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    res.json({ success: true, user });
  } catch (error) {
    console.error('❌ Error actualizando usuario:', error);
    res.status(500).json({ error: error.message });
  }
});

// Eliminar usuario
app.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'users-service',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

connectRabbitMQ().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Users Service running on port ${PORT}`);
  });
});
