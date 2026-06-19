const express = require('express');
const mongoose = require('mongoose');
const amqp = require('amqplib');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3003;

app.use(cors());
app.use(express.json());

// Modelo de Orden
const OrderSchema = new mongoose.Schema({
  id: { type: String, default: uuidv4 },
  compradorId: { type: Number, required: true },
  compradorNombre: { type: String, required: true },
  vendedorId: { type: Number, required: true },
  vendedorNombre: { type: String, required: true },
  productos: [{
    productoId: Number,
    nombre: String,
    cantidad: Number,
    precio: Number
  }],
  subtotal: Number,
  igv: Number,
  total: Number,
  estado: { 
    type: String, 
    enum: ['PENDIENTE', 'CONFIRMADO', 'CANCELADO'],
    default: 'PENDIENTE'
  },
  metodoPago: String,
  direccion: String,
  ciudad: String,
  fecha: { type: Date, default: Date.now },
  boletaNumero: String
});

const Order = mongoose.model('Order', OrderSchema);

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongodb:27017/byteverse')
  .then(() => console.log('✅ Orders Service conectado a MongoDB'))
  .catch(err => console.error('❌ Error MongoDB:', err));

// Conectar a RabbitMQ
let channel;
async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672');
    channel = await connection.createChannel();
    await channel.assertQueue('order_events');
    console.log('✅ Orders Service conectado a RabbitMQ');
  } catch (error) {
    console.error('❌ Error RabbitMQ:', error.message);
  }
}

// Endpoints
app.post('/orders', async (req, res) => {
  try {
    const orderData = req.body;
    
    // Calcular totales
    const subtotal = orderData.productos.reduce(
      (sum, item) => sum + (item.precio * item.cantidad), 0
    );
    const igv = subtotal * 0.18;
    const total = subtotal + igv;
    
    const order = new Order({
      ...orderData,
      subtotal,
      igv,
      total,
      boletaNumero: `B001-${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`
    });
    
    await order.save();
    
    // Publicar evento
    if (channel) {
      channel.sendToQueue('order_events', Buffer.from(JSON.stringify({
        event: 'ORDER_CREATED',
        id: order.id,
        compradorId: order.compradorId,
        compradorNombre: order.compradorNombre,
        total: order.total,
        estado: order.estado,
        timestamp: new Date().toISOString()
      })));
    }
    
    res.status(201).json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/orders', async (req, res) => {
  try {
    const { userId, vendorId } = req.query;
    let query = {};
    
    if (userId) query.compradorId = parseInt(userId);
    if (vendorId) query.vendedorId = parseInt(vendorId);
    
    const orders = await Order.find(query).sort({ fecha: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/orders/:orderId', async (req, res) => {
  try {
    const order = await Order.findOne({ id: req.params.orderId });
    if (!order) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/orders/:orderId/status', async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findOneAndUpdate(
      { id: req.params.orderId },
      { estado: status },
      { new: true }
    );
    
    if (!order) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }
    
    // Publicar evento
    if (channel) {
      channel.sendToQueue('order_events', Buffer.from(JSON.stringify({
        event: 'ORDER_STATUS_UPDATED',
        id: order.id,
        estado: status,
        timestamp: new Date().toISOString()
      })));
    }
    
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'orders-service' });
});

// Iniciar
connectRabbitMQ().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Orders Service running on port ${PORT}`);
  });
});