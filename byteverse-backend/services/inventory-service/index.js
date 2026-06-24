const express = require('express');
const mongoose = require('mongoose');
const amqp = require('amqplib');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3007;

app.use(cors());
app.use(express.json());

// Modelos
const InventorySchema = new mongoose.Schema({
  productId: { type: String, required: true, unique: true },
  quantity: { type: Number, required: true, min: 0 },
  reserved: { type: Number, default: 0 },
  minStock: { type: Number, default: 5 },
  maxStock: { type: Number, default: 100 },
  lastUpdated: { type: Date, default: Date.now },
  location: String,
  warehouse: String
});

const MovementSchema = new mongoose.Schema({
  productId: { type: String, required: true },
  type: { type: String, enum: ['IN', 'OUT', 'RESERVE', 'RELEASE', 'ADJUST'] },
  quantity: Number,
  previousQuantity: Number,
  newQuantity: Number,
  reason: String,
  userId: String,
  orderId: String,
  timestamp: { type: Date, default: Date.now }
});

const Inventory = mongoose.model('Inventory', InventorySchema);
const Movement = mongoose.model('Movement', MovementSchema);

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://admin:password@mongodb:27017/byteverse?authSource=admin')
  .then(() => console.log('✅ Inventory Service conectado a MongoDB'))
  .catch(err => console.error('❌ Error MongoDB:', err));

// RabbitMQ
let channel;
async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672');
    channel = await connection.createChannel();
    await channel.assertQueue('inventory_events', { durable: true });
    await channel.assertQueue('order_events', { durable: true });
    console.log('✅ Inventory Service conectado a RabbitMQ');
    
    await channel.consume('order_events', async (msg) => {
      if (msg) {
        try {
          const event = JSON.parse(msg.content.toString());
          await handleOrderEvent(event);
          channel.ack(msg);
        } catch (error) {
          console.error('Error procesando evento:', error);
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

async function handleOrderEvent(event) {
  if (event.event === 'ORDER_CREATED') {
    for (const item of event.items || []) {
      await reserveStock(item.productId, item.cantidad, event.id);
    }
  } else if (event.event === 'ORDER_STATUS_UPDATED') {
    if (event.estado === 'CONFIRMADO') {
      for (const item of event.items || []) {
        await confirmReservation(item.productId, item.cantidad, event.id);
      }
    } else if (event.estado === 'CANCELADO') {
      for (const item of event.items || []) {
        await releaseStock(item.productId, item.cantidad, event.id);
      }
    }
  }
}

async function reserveStock(productId, quantity, orderId) {
  const inventory = await Inventory.findOne({ productId });
  if (!inventory) {
    console.warn(`⚠️ Producto ${productId} no encontrado en inventario`);
    return;
  }
  
  if (inventory.quantity - inventory.reserved < quantity) {
    console.warn(`⚠️ Stock insuficiente para ${productId}`);
    return;
  }
  
  inventory.reserved += quantity;
  await inventory.save();
  
  await Movement.create({
    productId,
    type: 'RESERVE',
    quantity,
    previousQuantity: inventory.quantity - inventory.reserved,
    newQuantity: inventory.quantity - inventory.reserved - quantity,
    reason: `Order ${orderId}`,
    orderId
  });
}

async function confirmReservation(productId, quantity, orderId) {
  const inventory = await Inventory.findOne({ productId });
  if (!inventory) return;
  
  inventory.quantity -= quantity;
  inventory.reserved -= quantity;
  await inventory.save();
  
  await Movement.create({
    productId,
    type: 'OUT',
    quantity: -quantity,
    previousQuantity: inventory.quantity + quantity,
    newQuantity: inventory.quantity,
    reason: `Order ${orderId} confirmed`,
    orderId
  });
}

async function releaseStock(productId, quantity, orderId) {
  const inventory = await Inventory.findOne({ productId });
  if (!inventory) return;
  
  inventory.reserved -= quantity;
  await inventory.save();
  
  await Movement.create({
    productId,
    type: 'RELEASE',
    quantity: -quantity,
    previousQuantity: inventory.quantity + inventory.reserved + quantity,
    newQuantity: inventory.quantity + inventory.reserved,
    reason: `Order ${orderId} cancelled`,
    orderId
  });
}

// ENDPOINTS
app.get('/inventory', async (req, res) => {
  try {
    const { productId } = req.query;
    const query = productId ? { productId } : {};
    const inventory = await Inventory.find(query);
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/inventory/:productId', async (req, res) => {
  try {
    const inventory = await Inventory.findOne({ productId: req.params.productId });
    if (!inventory) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/inventory', async (req, res) => {
  try {
    const { productId, quantity, location, warehouse } = req.body;
    
    const inventory = new Inventory({
      productId,
      quantity,
      location,
      warehouse
    });
    
    await inventory.save();
    
    await Movement.create({
      productId,
      type: 'IN',
      quantity,
      previousQuantity: 0,
      newQuantity: quantity,
      reason: 'Initial stock'
    });
    
    res.status(201).json(inventory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/movements/:productId', async (req, res) => {
  try {
    const movements = await Movement.find({ productId: req.params.productId })
      .sort({ timestamp: -1 })
      .limit(100);
    res.json(movements);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'inventory-service' });
});

connectRabbitMQ().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Inventory Service running on port ${PORT}`);
  });
});