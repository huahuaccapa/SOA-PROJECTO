const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3014;

app.use(cors());
app.use(express.json());

// ==================== MODELO DE CATEGORÍA ====================
const CategorySchema = new mongoose.Schema({
  nombre: { type: String, required: true, unique: true },
  descripcion: { type: String, default: '' },
  icono: { type: String, default: '📂' },
  activo: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Category = mongoose.model('Category', CategorySchema);

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://admin:password@mongodb:27017/byteverse?authSource=admin')
  .then(async () => {
    console.log('✅ Categories Service conectado a MongoDB');
    await createDefaultCategories();
  })
  .catch(err => console.error('❌ Error MongoDB:', err));

// ==================== DATOS POR DEFECTO ====================
async function createDefaultCategories() {
  const defaultCategories = [
    { nombre: 'Laptops', descripcion: 'Laptops y portátiles', icono: '💻' },
    { nombre: 'Smartphones', descripcion: 'Teléfonos inteligentes', icono: '📱' },
    { nombre: 'Tablets', descripcion: 'Tablets y iPads', icono: '📋' },
    { nombre: 'Accesorios', descripcion: 'Accesorios tecnológicos', icono: '🎧' },
    { nombre: 'Audio', descripcion: 'Audífonos y parlantes', icono: '🔊' },
    { nombre: 'Gaming', descripcion: 'Productos para gaming', icono: '🎮' },
    { nombre: 'Smartwatches', descripcion: 'Relojes inteligentes', icono: '⌚' },
    { nombre: 'Cámaras', descripcion: 'Cámaras y fotografía', icono: '📷' },
    { nombre: 'Almacenamiento', descripcion: 'Discos y memorias', icono: '💾' }
  ];

  for (const catData of defaultCategories) {
    const existing = await Category.findOne({ nombre: catData.nombre });
    if (!existing) {
      await Category.create(catData);
      console.log(`📂 Categoría creada: ${catData.nombre}`);
    }
  }
}

// ==================== ENDPOINTS ====================

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'categories-service',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Obtener todas las categorías
app.get('/categories', async (req, res) => {
  try {
    const { activo } = req.query;
    const query = activo !== undefined ? { activo: activo === 'true' } : {};
    const categories = await Category.find(query).sort({ nombre: 1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener categoría por ID
app.get('/categories/:id', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear categoría
app.post('/categories', async (req, res) => {
  try {
    const { nombre, descripcion, icono, activo } = req.body;
    
    if (!nombre || nombre.trim() === '') {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }
    
    const existing = await Category.findOne({ nombre: nombre.trim() });
    if (existing) {
      return res.status(400).json({ error: 'La categoría ya existe' });
    }
    
    const category = new Category({
      nombre: nombre.trim(),
      descripcion: descripcion || '',
      icono: icono || '📂',
      activo: activo !== undefined ? activo : true
    });
    
    await category.save();
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar categoría
app.put('/categories/:id', async (req, res) => {
  try {
    const { nombre, descripcion, icono, activo } = req.body;
    const updateData = {};
    
    if (nombre) updateData.nombre = nombre.trim();
    if (descripcion !== undefined) updateData.descripcion = descripcion;
    if (icono) updateData.icono = icono;
    if (activo !== undefined) updateData.activo = activo;
    updateData.updatedAt = new Date();
    
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!category) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar categoría
app.delete('/categories/:id', async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Categories Service running on port ${PORT}`);
});