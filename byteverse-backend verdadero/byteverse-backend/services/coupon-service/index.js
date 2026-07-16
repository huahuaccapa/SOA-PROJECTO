//services\coupon-service\index.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3012;

app.use(cors());
app.use(express.json());

// Modelo
const CouponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  type: { type: String, enum: ['percentage', 'fixed'], required: true },
  value: { type: Number, required: true },
  minPurchase: { type: Number, default: 0 },
  maxDiscount: { type: Number },
  expiresAt: { type: Date, required: true },
  usageLimit: { type: Number, default: 1 },
  usedCount: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
  description: String,
  createdAt: { type: Date, default: Date.now }
});

const Coupon = mongoose.model('Coupon', CouponSchema);

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://admin:password@mongodb:27017/byteverse?authSource=admin')
  .then(() => console.log('✅ Coupon Service conectado a MongoDB'))
  .catch(err => console.error('❌ Error MongoDB:', err));

// Crear cupones de ejemplo
async function createDefaultCoupons() {
  const defaultCoupons = [
    {
      code: 'BYTE10',
      type: 'percentage',
      value: 10,
      minPurchase: 100,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      description: '10% de descuento en compras mayores a S/ 100'
    },
    {
      code: 'BYTE25',
      type: 'percentage',
      value: 25,
      minPurchase: 500,
      maxDiscount: 200,
      expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      description: '25% de descuento en compras mayores a S/ 500 (máx S/ 200)'
    },
    {
      code: 'BYTEFREE',
      type: 'fixed',
      value: 50,
      minPurchase: 200,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      description: 'S/ 50 de descuento en compras mayores a S/ 200'
    }
  ];

  for (const couponData of defaultCoupons) {
    const existing = await Coupon.findOne({ code: couponData.code });
    if (!existing) {
      await Coupon.create(couponData);
      console.log(`🎫 Cupón creado: ${couponData.code}`);
    }
  }
}

// ENDPOINTS
app.get('/coupons', async (req, res) => {
  try {
    const { active = true } = req.query;
    const query = active === 'true' ? { active: true } : {};
    const coupons = await Coupon.find(query);
    res.json(coupons);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/coupons/:code', async (req, res) => {
  try {
    const coupon = await Coupon.findOne({ 
      code: req.params.code.toUpperCase(),
      active: true,
      expiresAt: { $gt: new Date() }
    });
    
    if (!coupon) {
      return res.status(404).json({ error: 'Cupón no encontrado o expirado' });
    }
    
    if (coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({ error: 'Cupón agotado' });
    }
    
    res.json(coupon);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/coupons/validate', async (req, res) => {
  try {
    const { code, subtotal } = req.body;
    
    const coupon = await Coupon.findOne({ 
      code: code.toUpperCase(),
      active: true,
      expiresAt: { $gt: new Date() }
    });
    
    if (!coupon) {
      return res.json({ valid: false, error: 'Cupón no válido' });
    }
    
    if (coupon.usedCount >= coupon.usageLimit) {
      return res.json({ valid: false, error: 'Cupón agotado' });
    }
    
    if (subtotal < coupon.minPurchase) {
      return res.json({ 
        valid: false, 
        error: `Mínimo de compra: S/ ${coupon.minPurchase}` 
      });
    }
    
    let discount = 0;
    if (coupon.type === 'percentage') {
      discount = (subtotal * coupon.value) / 100;
      if (coupon.maxDiscount) {
        discount = Math.min(discount, coupon.maxDiscount);
      }
    } else {
      discount = coupon.value;
    }
    
    res.json({
      valid: true,
      discount,
      code: coupon.code,
      description: coupon.description
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/coupons/:code/use', async (req, res) => {
  try {
    const coupon = await Coupon.findOne({ code: req.params.code.toUpperCase() });
    if (!coupon) {
      return res.status(404).json({ error: 'Cupón no encontrado' });
    }
    
    if (coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({ error: 'Cupón agotado' });
    }
    
    coupon.usedCount += 1;
    if (coupon.usedCount >= coupon.usageLimit) {
      coupon.active = false;
    }
    await coupon.save();
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/coupons', async (req, res) => {
  try {
    const coupon = new Coupon(req.body);
    await coupon.save();
    res.status(201).json(coupon);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'coupon-service' });
});

// Iniciar
async function start() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://admin:password@mongodb:27017/byteverse?authSource=admin');
  await createDefaultCoupons();
  app.listen(PORT, () => {
    console.log(`✅ Coupon Service running on port ${PORT}`);
  });
}

start();