const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3011;

app.use(cors());
app.use(express.json());

// Modelo
const WishlistSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  productId: { type: String, required: true },
  productName: String,
  productPrice: Number,
  productImage: String,
  createdAt: { type: Date, default: Date.now }
});

const Wishlist = mongoose.model('Wishlist', WishlistSchema);

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://admin:password@mongodb:27017/byteverse?authSource=admin')
  .then(() => console.log('✅ Wishlist Service conectado a MongoDB'))
  .catch(err => console.error('❌ Error MongoDB:', err));

// ENDPOINTS
app.get('/wishlist/:userId', async (req, res) => {
  try {
    const items = await Wishlist.find({ userId: req.params.userId })
      .sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/wishlist', async (req, res) => {
  try {
    const { userId, productId, productName, productPrice, productImage } = req.body;
    
    const existing = await Wishlist.findOne({ userId, productId });
    if (existing) {
      return res.status(400).json({ error: 'Producto ya en wishlist' });
    }
    
    const item = new Wishlist({
      userId,
      productId,
      productName,
      productPrice,
      productImage
    });
    
    await item.save();
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/wishlist/:userId/:productId', async (req, res) => {
  try {
    const result = await Wishlist.findOneAndDelete({
      userId: req.params.userId,
      productId: req.params.productId
    });
    if (!result) {
      return res.status(404).json({ error: 'Item no encontrado' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/wishlist/:userId', async (req, res) => {
  try {
    await Wishlist.deleteMany({ userId: req.params.userId });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'wishlist-service' });
});

app.listen(PORT, () => {
  console.log(`✅ Wishlist Service running on port ${PORT}`);
});