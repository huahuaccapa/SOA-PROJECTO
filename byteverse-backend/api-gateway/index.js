const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Security
app.use(helmet({
  crossOriginResourcePolicy: false,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Demasiadas peticiones, por favor intenta más tarde'
});
app.use('/api', limiter);

// CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Refresh-Token']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`📤 ${req.method} ${req.url}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'API Gateway',
    timestamp: new Date().toISOString()
  });
});

// Redirección de rutas del frontend
const frontendRoutes = ['/login', '/register', '/products', '/profile', '/orders', '/admin', '/vendor', '/checkout', '/cart'];
frontendRoutes.forEach(route => {
  app.get(route, (req, res) => {
    res.redirect(`${FRONTEND_URL}${req.originalUrl}`);
  });
});

app.get('/admin/*', (req, res) => {
  res.redirect(`${FRONTEND_URL}${req.originalUrl}`);
});

// ============================================
// ✅ PROXY CONFIGURACIÓN CORREGIDA
// ============================================

function createProxyWithLogging(path, target, rewrite) {
  console.log(`🔧 Configurando proxy: ${path} → ${target}`);
  
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: rewrite,
    logLevel: 'debug',
    timeout: 30000,
    proxyTimeout: 30000,
    onProxyReq: (proxyReq, req, res) => {
      const newPath = req.url.replace(path, '');
      console.log(`🔄 [${path}] ${req.method} ${req.url} → ${target}${newPath}`);
      
      if (req.body && Object.keys(req.body).length > 0) {
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader('Content-Type', 'application/json');
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      }
    },
    onProxyRes: (proxyRes, req, res) => {
      console.log(`📥 [${path}] Respuesta: ${proxyRes.statusCode}`);
    },
    onError: (err, req, res) => {
      console.error(`❌ Proxy error en ${path}: ${err.message}`);
      res.status(503).json({ 
        error: 'Service unavailable', 
        message: err.message,
        service: target,
        path: req.url
      });
    },
  });
}

// ✅ CONFIGURACIÓN CORRECTA DE PROXIES
const proxyConfigs = [
  // Auth Service
  { 
    path: '/api/auth', 
    target: 'http://auth-service:3001',
    rewrite: { '^/api/auth': '' }
  },
  // Users Service
  { 
    path: '/api/users', 
    target: 'http://users-service:3004',
    rewrite: { '^/api/users': '' }
  },
  // Products Service - ✅ CORREGIDO: mantener /products
  { 
    path: '/api/products', 
    target: 'http://products-service:3002',
    rewrite: { '^/api/products': '/products' }  // ✅ Mantener /products
  },
  // Orders Service
  { 
    path: '/api/orders', 
    target: 'http://orders-service:3003',
    rewrite: { '^/api/orders': '' }
  },
  // Categories Service - ✅ CORREGIDO: mantener /categories
  { 
    path: '/api/categories', 
    target: 'http://categories-service:3014',
    rewrite: { '^/api/categories': '/categories' }  // ✅ Mantener /categories
  },
  // Vendor Cart Service - ✅ CORREGIDO: mantener /vendor/cart
  { 
    path: '/api/vendor/cart', 
    target: 'http://vendor-cart-service:3015',
    rewrite: { '^/api/vendor/cart': '/vendor/cart' }  // ✅ Mantener /vendor/cart
  },
  // Analytics Service
  { 
    path: '/api/analytics', 
    target: 'http://analytics-service:3006',
    rewrite: { '^/api/analytics': '' }
  },
  // Notifications Service
  { 
    path: '/api/notifications', 
    target: 'http://notifications-service:3005',
    rewrite: { '^/api/notifications': '' }
  },
  // Inventory Service
  { 
    path: '/api/inventory', 
    target: 'http://inventory-service:3007',
    rewrite: { '^/api/inventory': '' }
  },
  // Payment Service
  { 
    path: '/api/payment', 
    target: 'http://payment-service:3008',
    rewrite: { '^/api/payment': '' }
  },
  // Shipping Service
  { 
    path: '/api/shipping', 
    target: 'http://shipping-service:3009',
    rewrite: { '^/api/shipping': '' }
  },
  // Reviews Service
  { 
    path: '/api/reviews', 
    target: 'http://review-service:3010',
    rewrite: { '^/api/reviews': '' }
  },
  // Wishlist Service
  { 
    path: '/api/wishlist', 
    target: 'http://wishlist-service:3011',
    rewrite: { '^/api/wishlist': '' }
  },
  // Coupons Service
  { 
    path: '/api/coupons', 
    target: 'http://coupon-service:3012',
    rewrite: { '^/api/coupons': '' }
  },
  // Audit Service
  { 
    path: '/api/audit', 
    target: 'http://audit-service:3013',
    rewrite: { '^/api/audit': '' }
  }
];

// Registrar todos los proxies
proxyConfigs.forEach(({ path, target, rewrite }) => {
  app.use(path, createProxyWithLogging(path, target, rewrite));
});

// ✅ Ruta de prueba
app.get('/api/test', (req, res) => {
  res.json({ message: 'API Gateway funcionando correctamente' });
});

// 404 handler
app.use('*', (req, res) => {
  console.log(`❌ Ruta no encontrada: ${req.method} ${req.url}`);
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ API Gateway running on port ${PORT}`);
  console.log(`🔄 Redirigiendo rutas de frontend a: ${FRONTEND_URL}`);
  console.log('📋 Proxies configurados:');
  proxyConfigs.forEach(({ path, target }) => {
    console.log(`   ${path} → ${target}`);
  });
});