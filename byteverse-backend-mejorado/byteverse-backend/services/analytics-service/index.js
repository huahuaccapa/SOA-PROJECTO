//services\analytics-service\index.js
const express = require('express');
const mongoose = require('mongoose');
const amqp = require('amqplib');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3006;

app.use(cors());
app.use(express.json());

// Modelos
const EventSchema = new mongoose.Schema({
  event: String,
  userId: Number,
  email: String,
  data: mongoose.Schema.Types.Mixed,
  timestamp: { type: Date, default: Date.now }
});

const MetricSchema = new mongoose.Schema({
  metric: String,
  value: { type: Number, default: 0 },
  date: { type: Date, default: Date.now },
  period: { type: String, enum: ['day', 'week', 'month'] }
});

const Event = mongoose.model('AnalyticsEvent', EventSchema);
const Metric = mongoose.model('Metric', MetricSchema);

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://admin:password@mongodb:27017/byteverse?authSource=admin')
  .then(() => console.log('✅ Analytics Service conectado a MongoDB'))
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
    
    const queues = ['auth_events', 'order_events', 'product_events', 'payment_events'];
    for (const queue of queues) {
      await channel.assertQueue(queue);
      channel.consume(queue, async (msg) => {
        if (msg) {
          try {
            const event = JSON.parse(msg.content.toString());
            await processEvent(event);
            if (channel) channel.ack(msg);
          } catch (error) {
            console.error('Error procesando evento:', error);
            if (channel) channel.ack(msg);
          }
        }
      }, { noAck: false });
    }
    
    console.log('✅ Analytics Service conectado a RabbitMQ');
  } catch (error) {
    console.error('❌ Error RabbitMQ:', error.message);
    channel = null;
    retryRabbitMQ();
  }
}

async function processEvent(event) {
  console.log(`📊 Evento: ${event.event}`);
  
  await Event.create({
    event: event.event,
    userId: event.userId,
    email: event.email,
    data: event,
    timestamp: new Date()
  });
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const metricMap = {
    'USER_REGISTERED': 'new_users',
    'USER_LOGIN': 'user_logins',
    'ORDER_CREATED': 'orders_created',
    'PRODUCT_CREATED': 'products_created',
    'PAYMENT_CONFIRMED': 'payments_completed'
  };
  
  const metricName = metricMap[event.event] || 'other_events';
  
  await Metric.findOneAndUpdate(
    { metric: metricName, date: today, period: 'day' },
    { $inc: { value: 1 } },
    { upsert: true }
  );
}

// ENDPOINTS
app.get('/analytics/events', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const events = await Event.find()
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/analytics/metrics', async (req, res) => {
  try {
    const { period = 'day' } = req.query;
    const metrics = await Metric.find({ period });
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'analytics-service' });
});

connectRabbitMQ().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Analytics Service running on port ${PORT}`);
  });
});
