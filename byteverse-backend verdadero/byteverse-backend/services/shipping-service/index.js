//services\shipping-service\index.js
const express = require('express');
const mongoose = require('mongoose');
const amqp = require('amqplib');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3009;

app.use(cors());
app.use(express.json());

// Modelos
const ShippingSchema = new mongoose.Schema({
  id: { type: String, default: uuidv4 },
  orderId: { type: String, required: true },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  status: {
    type: String,
    enum: ['PENDING', 'PROCESSING', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'],
    default: 'PENDING'
  },
  trackingNumber: String,
  carrier: String,
  estimatedDelivery: Date,
  actualDelivery: Date,
  weight: Number,
  dimensions: String,
  cost: Number,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Shipping = mongoose.model('Shipping', ShippingSchema);

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://admin:password@mongodb:27017/byteverse?authSource=admin')
  .then(() => console.log('✅ Shipping Service conectado a MongoDB'))
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
    await channel.assertQueue('shipping_events', { durable: true });
    await channel.assertQueue('order_events', { durable: true });
    console.log('✅ Shipping Service conectado a RabbitMQ');
    
    await channel.consume('order_events', async (msg) => {
      if (msg) {
        try {
          const event = JSON.parse(msg.content.toString());
          if (event.event === 'ORDER_CREATED') {
            await createShipping(event);
          }
          if (channel) channel.ack(msg);
        } catch (error) {
          console.error('Error procesando evento:', error);
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

async function createShipping(event) {
  try {
    const shipping = new Shipping({
      orderId: event.id,
      address: {
        street: event.direccion || 'N/A',
        city: event.ciudad || 'N/A',
        country: 'Perú'
      },
      status: 'PENDING',
      trackingNumber: `TRK${Math.floor(Math.random() * 1000000)}`,
      carrier: 'ByteVerse Logistics',
      estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      weight: 1.5,
      cost: 25.00
    });
    
    await shipping.save();
    console.log(`📦 Envío creado para orden ${event.id}`);
    
    if (channel) {
      await channel.sendToQueue('shipping_events', Buffer.from(JSON.stringify({
        event: 'SHIPPING_CREATED',
        shippingId: shipping.id,
        orderId: event.id,
        trackingNumber: shipping.trackingNumber,
        timestamp: new Date().toISOString()
      })), { persistent: true });
    }
  } catch (error) {
    console.error('Error creando envío:', error);
  }
}

// ENDPOINTS
app.get('/shipping', async (req, res) => {
  try {
    const { orderId } = req.query;
    const query = orderId ? { orderId } : {};
    const shipments = await Shipping.find(query);
    res.json(shipments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/shipping/:id', async (req, res) => {
  try {
    const shipping = await Shipping.findOne({ id: req.params.id });
    if (!shipping) {
      return res.status(404).json({ error: 'Envío no encontrado' });
    }
    res.json(shipping);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/shipping/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const shipping = await Shipping.findOneAndUpdate(
      { id: req.params.id },
      { status, updatedAt: new Date() },
      { new: true }
    );
    
    if (!shipping) {
      return res.status(404).json({ error: 'Envío no encontrado' });
    }
    
    if (channel) {
      await channel.sendToQueue('shipping_events', Buffer.from(JSON.stringify({
        event: 'SHIPPING_STATUS_UPDATED',
        shippingId: shipping.id,
        orderId: shipping.orderId,
        status: status,
        timestamp: new Date().toISOString()
      })), { persistent: true });
    }
    
    res.json(shipping);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'shipping-service' });
});

connectRabbitMQ().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Shipping Service running on port ${PORT}`);
  });
});
