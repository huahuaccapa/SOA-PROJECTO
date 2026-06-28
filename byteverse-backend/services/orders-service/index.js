//services\orders-service\index.js
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

// ==================== MODELO DE ORDEN ACTUALIZADO ====================
// ✅ Cambio: compradorId, vendedorId y productoId ahora son String (ObjectId)
const OrderSchema = new mongoose.Schema({
  id: { type: String, default: uuidv4 },
  compradorId: { type: String, required: true },      // ✅ String para ObjectId
  compradorNombre: { type: String, required: true },
  vendedorId: { type: String, required: true },       // ✅ String para ObjectId
  vendedorNombre: { type: String, required: true },
  productos: [{
    productoId: { type: String, required: true },     // ✅ String para ObjectId
    nombre: String,
    cantidad: Number,
    precio: Number
  }],
  subtotal: { type: Number, default: 0 },
  igv: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  estado: { 
    type: String, 
    enum: ['PENDIENTE', 'CONFIRMADO', 'CANCELADO', 'ENVIADO', 'ENTREGADO'],
    default: 'PENDIENTE'
  },
  metodoPago: { type: String, default: 'tarjeta' },
  direccion: { type: String, default: '' },
  ciudad: { type: String, default: '' },
  fecha: { type: Date, default: Date.now },
  boletaNumero: { type: String },
  notas: { type: String, default: '' }
});

const Order = mongoose.model('Order', OrderSchema);

// ==================== CONEXIÓN A MONGODB ====================
mongoose.connect(process.env.MONGODB_URI || 'mongodb://admin:password@mongodb:27017/byteverse?authSource=admin')
  .then(() => console.log('✅ Orders Service conectado a MongoDB'))
  .catch(err => console.error('❌ Error MongoDB:', err));

// ==================== RABBITMQ ====================
let channel;
async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672');
    channel = await connection.createChannel();
    await channel.assertQueue('order_events', { durable: true });
    await channel.assertQueue('order_responses', { durable: true });
    console.log('✅ Orders Service conectado a RabbitMQ');
  } catch (error) {
    console.error('❌ Error RabbitMQ:', error.message);
  }
}

// ==================== ENDPOINTS ====================

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'orders-service',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    rabbitmq: channel ? 'connected' : 'disconnected'
  });
});

// ✅ CREAR ORDEN - ACTUALIZADO
app.post('/orders', async (req, res) => {
  try {
    console.log('📦 Creando orden:', req.body);
    
    const orderData = req.body;
    
    // Validar datos requeridos
    if (!orderData.compradorId || !orderData.vendedorId || !orderData.productos || orderData.productos.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Faltan datos requeridos: compradorId, vendedorId, productos' 
      });
    }
    
    // Calcular totales
    const subtotal = orderData.productos.reduce(
      (sum, item) => sum + (item.precio * item.cantidad), 0
    );
    const igv = subtotal * 0.18;
    const total = subtotal + igv;
    
    // Generar número de boleta
    const boletaNumero = `B001-${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`;
    
    // Crear orden
    const order = new Order({
      ...orderData,
      subtotal,
      igv,
      total,
      boletaNumero,
      estado: 'PENDIENTE',
      fecha: new Date()
    });
    
    await order.save();
    console.log(`✅ Orden creada: ${order.id}`);
    
    // ==================== PUBLICAR EVENTO ====================
    if (channel) {
      const eventData = {
        event: 'ORDER_CREATED',
        id: order.id,
        orderId: order.id,
        compradorId: order.compradorId,
        compradorNombre: order.compradorNombre,
        vendedorId: order.vendedorId,
        vendedorNombre: order.vendedorNombre,
        subtotal: order.subtotal,
        igv: order.igv,
        total: order.total,
        estado: order.estado,
        items: order.productos,
        direccion: order.direccion,
        ciudad: order.ciudad,
        metodoPago: order.metodoPago,
        boletaNumero: order.boletaNumero,
        timestamp: new Date().toISOString()
      };
      
      await channel.sendToQueue('order_events', Buffer.from(JSON.stringify(eventData)), { 
        persistent: true 
      });
      console.log('📤 Evento ORDER_CREATED publicado');
    }
    
    res.status(201).json({ 
      success: true, 
      order: {
        id: order.id,
        compradorId: order.compradorId,
        compradorNombre: order.compradorNombre,
        vendedorId: order.vendedorId,
        vendedorNombre: order.vendedorNombre,
        productos: order.productos,
        subtotal: order.subtotal,
        igv: order.igv,
        total: order.total,
        estado: order.estado,
        boletaNumero: order.boletaNumero,
        fecha: order.fecha
      }
    });
    
  } catch (error) {
    console.error('❌ Error creando orden:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ OBTENER ÓRDENES - ACTUALIZADO
app.get('/orders', async (req, res) => {
  try {
    const { userId, vendorId, estado } = req.query;
    let query = {};
    
    if (userId) query.compradorId = userId;
    if (vendorId) query.vendedorId = vendorId;
    if (estado) query.estado = estado;
    
    console.log('🔍 Buscando órdenes con query:', query);
    
    const orders = await Order.find(query).sort({ fecha: -1 });
    
    // Formatear respuesta
    const formattedOrders = orders.map(order => ({
      id: order.id,
      compradorId: order.compradorId,
      compradorNombre: order.compradorNombre,
      vendedorId: order.vendedorId,
      vendedorNombre: order.vendedorNombre,
      productos: order.productos,
      subtotal: order.subtotal,
      igv: order.igv,
      total: order.total,
      estado: order.estado,
      metodoPago: order.metodoPago,
      direccion: order.direccion,
      ciudad: order.ciudad,
      boletaNumero: order.boletaNumero,
      fecha: order.fecha,
      _id: order._id
    }));
    
    res.json(formattedOrders);
  } catch (error) {
    console.error('❌ Error obteniendo órdenes:', error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ OBTENER ORDEN POR ID
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

// ✅ ACTUALIZAR ESTADO DE ORDEN
app.put('/orders/:orderId/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: 'Estado requerido' });
    }
    
    const order = await Order.findOneAndUpdate(
      { id: req.params.orderId },
      { estado: status },
      { new: true }
    );
    
    if (!order) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }
    
    if (channel) {
      await channel.sendToQueue('order_events', Buffer.from(JSON.stringify({
        event: 'ORDER_STATUS_UPDATED',
        id: order.id,
        orderId: order.id,
        estado: status,
        items: order.productos,
        timestamp: new Date().toISOString()
      })), { persistent: true });
    }
    
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ CANCELAR ORDEN
app.delete('/orders/:orderId', async (req, res) => {
  try {
    const order = await Order.findOneAndUpdate(
      { id: req.params.orderId },
      { estado: 'CANCELADO' },
      { new: true }
    );
    
    if (!order) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }
    
    if (channel) {
      await channel.sendToQueue('order_events', Buffer.from(JSON.stringify({
        event: 'ORDER_CANCELLED',
        id: order.id,
        orderId: order.id,
        items: order.productos,
        timestamp: new Date().toISOString()
      })), { persistent: true });
    }
    
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== INICIAR SERVIDOR ====================
connectRabbitMQ().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Orders Service running on port ${PORT}`);
  });
});