const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3015;

app.use(cors());
app.use(express.json());

// ==================== MODELO DE CARRITO DE VENDEDOR ====================
const VendorCartSchema = new mongoose.Schema({
  vendorId: { type: String, required: true },
  productId: { type: String, required: true },
  nombre: { type: String, required: true },
  precio: { type: Number, required: true },
  cantidad: { type: Number, default: 1, min: 1 },
  imagen: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Índice compuesto para evitar duplicados
VendorCartSchema.index({ vendorId: 1, productId: 1 }, { unique: true });

const VendorCart = mongoose.model('VendorCart', VendorCartSchema);

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://admin:password@mongodb:27017/byteverse?authSource=admin')
  .then(() => console.log('✅ Vendor Cart Service conectado a MongoDB'))
  .catch(err => console.error('❌ Error MongoDB:', err));

// ==================== ENDPOINTS ====================

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'vendor-cart-service',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Obtener carrito de un vendedor
app.get('/vendor/cart/:vendorId', async (req, res) => {
  try {
    const { vendorId } = req.params;
    const items = await VendorCart.find({ vendorId }).sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Agregar producto al carrito
app.post('/vendor/cart', async (req, res) => {
  try {
    const { vendorId, productId, nombre, precio, cantidad, imagen } = req.body;
    
    if (!vendorId || !productId || !nombre || !precio) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }
    
    // Buscar si ya existe
    let existing = await VendorCart.findOne({ vendorId, productId });
    
    if (existing) {
      // Actualizar cantidad
      existing.cantidad += cantidad || 1;
      existing.updatedAt = new Date();
      await existing.save();
      return res.json(existing);
    }
    
    // Crear nuevo
    const newItem = new VendorCart({
      vendorId,
      productId,
      nombre,
      precio,
      cantidad: cantidad || 1,
      imagen: imagen || ''
    });
    
    await newItem.save();
    res.status(201).json(newItem);
  } catch (error) {
    if (error.code === 11000) {
      // Duplicado - intentar actualizar
      try {
        const { vendorId, productId, cantidad } = req.body;
        const existing = await VendorCart.findOneAndUpdate(
          { vendorId, productId },
          { $inc: { cantidad: cantidad || 1 }, $set: { updatedAt: new Date() } },
          { new: true }
        );
        return res.json(existing);
      } catch (e) {
        return res.status(500).json({ error: e.message });
      }
    }
    res.status(500).json({ error: error.message });
  }
});

// Actualizar cantidad
app.put('/vendor/cart/:itemId', async (req, res) => {
  try {
    const { cantidad } = req.body;
    const item = await VendorCart.findByIdAndUpdate(
      req.params.itemId,
      { cantidad, updatedAt: new Date() },
      { new: true }
    );
    
    if (!item) {
      return res.status(404).json({ error: 'Item no encontrado' });
    }
    
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar item del carrito
app.delete('/vendor/cart/:itemId', async (req, res) => {
  try {
    const item = await VendorCart.findByIdAndDelete(req.params.itemId);
    if (!item) {
      return res.status(404).json({ error: 'Item no encontrado' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Vaciar carrito
app.delete('/vendor/cart/:vendorId/clear', async (req, res) => {
  try {
    await VendorCart.deleteMany({ vendorId: req.params.vendorId });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Vendor Cart Service running on port ${PORT}`);
});