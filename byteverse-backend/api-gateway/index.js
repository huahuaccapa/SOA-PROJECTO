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
const frontendRoutes = ['/login', '/register', '/products', '/profile', '/orders', '/admin', '/vendor', '/checkout'];
frontendRoutes.forEach(route => {
  app.get(route, (req, res) => {
    res.redirect(`${FRONTEND_URL}${req.originalUrl}`);
  });
});

app.get('/admin/*', (req, res) => {
  res.redirect(`${FRONTEND_URL}${req.originalUrl}`);
});

// ✅ PROXY CONFIGURACIÓN CORRECTA - USANDO pathRewrite CON OBJETO
const proxyConfigs = [
  { 
    path: '/api/auth', 
    target: 'http://auth-service:3001',
    rewrite: { '^/api/auth': '' }
  },
  { 
    path: '/api/users', 
    target: 'http://users-service:3004',
    rewrite: { '^/api/users': '' }
  },
  { 
    path: '/api/products', 
    target: 'http://products-service:3002',
    rewrite: { '^/api/products': '/products' }  // ✅ Clave: reemplazar /api/products con /products
  },
  { 
    path: '/api/orders', 
    target: 'http://orders-service:3003',
    rewrite: { '^/api/orders': '' }
  },
  { 
    path: '/api/analytics', 
    target: 'http://analytics-service:3006',
    rewrite: { '^/api/analytics': '' }
  },
  { 
    path: '/api/notifications', 
    target: 'http://notifications-service:3005',
    rewrite: { '^/api/notifications': '' }
  },
  { 
    path: '/api/inventory', 
    target: 'http://inventory-service:3007',
    rewrite: { '^/api/inventory': '' }
  },
  { 
    path: '/api/payment', 
    target: 'http://payment-service:3008',
    rewrite: { '^/api/payment': '' }
  },
  { 
    path: '/api/shipping', 
    target: 'http://shipping-service:3009',
    rewrite: { '^/api/shipping': '' }
  },
  { 
    path: '/api/reviews', 
    target: 'http://review-service:3010',
    rewrite: { '^/api/reviews': '' }
  },
  { 
    path: '/api/wishlist', 
    target: 'http://wishlist-service:3011',
    rewrite: { '^/api/wishlist': '' }
  },
  { 
    path: '/api/coupons', 
    target: 'http://coupon-service:3012',
    rewrite: { '^/api/coupons': '' }
  },
  { 
    path: '/api/audit', 
    target: 'http://audit-service:3013',
    rewrite: { '^/api/audit': '' }
  }
];

proxyConfigs.forEach(({ path, target, rewrite }) => {
  app.use(path, createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: rewrite,  // ✅ Usar el objeto rewrite
    logLevel: 'debug',
    timeout: 30000,
    proxyTimeout: 30000,
    onProxyReq: (proxyReq, req, res) => {
      const newPath = req.url.replace(path, '');
      console.log(`🔄 Proxying ${req.method} ${req.url} → ${target}${newPath}`);
      
      if (req.body && Object.keys(req.body).length > 0) {
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader('Content-Type', 'application/json');
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      }
    },
    onProxyRes: (proxyRes, req, res) => {
      console.log(`📥 Respuesta de ${target}: ${proxyRes.statusCode}`);
    },
    onError: (err, req, res) => {
      console.error(`❌ Proxy error: ${err.message}`);
      res.status(503).json({ 
        error: 'Service unavailable', 
        message: err.message,
        service: target
      });
    },
  }));
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ API Gateway running on port ${PORT}`);
  console.log(`🔄 Redirigiendo rutas de frontend a: ${FRONTEND_URL}`);
});