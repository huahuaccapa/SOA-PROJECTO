//services\audit-service\index.js
const express = require('express');
const mongoose = require('mongoose');
const amqp = require('amqplib');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3013;

app.use(cors());
app.use(express.json());

// Modelo
const AuditLogSchema = new mongoose.Schema({
  event: { type: String, required: true },
  service: String,
  userId: String,
  email: String,
  action: String,
  resource: String,
  resourceId: String,
  changes: mongoose.Schema.Types.Mixed,
  ip: String,
  userAgent: String,
  timestamp: { type: Date, default: Date.now },
  severity: { 
    type: String, 
    enum: ['info', 'warning', 'error', 'critical'],
    default: 'info'
  }
});

const AuditLog = mongoose.model('AuditLog', AuditLogSchema);

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://admin:password@mongodb:27017/byteverse?authSource=admin')
  .then(() => console.log('✅ Audit Service conectado a MongoDB'))
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
    await channel.assertQueue('audit_events', { durable: true });
    
    const queues = ['auth_events', 'order_events', 'product_events', 'payment_events'];
    for (const queue of queues) {
      await channel.assertQueue(queue);
      channel.consume(queue, async (msg) => {
        if (msg) {
          try {
            const event = JSON.parse(msg.content.toString());
            await logEvent(event, queue);
            if (channel) channel.ack(msg);
          } catch (error) {
            console.error('Error procesando evento:', error);
            if (channel) channel.ack(msg);
          }
        }
      }, { noAck: false });
    }
    
    console.log('✅ Audit Service conectado a RabbitMQ');
  } catch (error) {
    console.error('❌ Error RabbitMQ:', error.message);
    channel = null;
    retryRabbitMQ();
  }
}

async function logEvent(event, source) {
  const auditLog = {
    event: event.event,
    service: source.replace('_events', ''),
    userId: event.userId || event.compradorId,
    email: event.email || event.compradorNombre,
    action: event.event,
    resource: source,
    resourceId: event.id || event.productId || event.userId,
    changes: event,
    severity: getSeverity(event.event),
    timestamp: new Date()
  };
  
  await AuditLog.create(auditLog);
  console.log(`📝 Audit log creado: ${event.event}`);
}

function getSeverity(event) {
  const criticalEvents = ['USER_REGISTERED', 'ORDER_CREATED', 'PAYMENT_CONFIRMED'];
  const warningEvents = ['ORDER_CANCELLED', 'USER_LOGOUT'];
  
  if (criticalEvents.includes(event)) return 'critical';
  if (warningEvents.includes(event)) return 'warning';
  return 'info';
}

// ENDPOINTS
app.get('/audit', async (req, res) => {
  try {
    const { limit = 100, service, event, userId } = req.query;
    const query = {};
    if (service) query.service = service;
    if (event) query.event = event;
    if (userId) query.userId = userId;
    
    const logs = await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/audit/:id', async (req, res) => {
  try {
    const log = await AuditLog.findById(req.params.id);
    if (!log) {
      return res.status(404).json({ error: 'Log no encontrado' });
    }
    res.json(log);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/audit/stats', async (req, res) => {
  try {
    const stats = await AuditLog.aggregate([
      { $group: {
        _id: '$event',
        count: { $sum: 1 }
      }},
      { $sort: { count: -1 } }
    ]);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'audit-service' });
});

connectRabbitMQ().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Audit Service running on port ${PORT}`);
  });
});
