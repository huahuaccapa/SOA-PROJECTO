// backend/api-gateway/index.js
const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = 3000;

// Configuración del frontend
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// CORS más permisivo
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        service: 'API Gateway',
        timestamp: new Date().toISOString()
    });
});

// ✅ AGREGADO: Redirección de rutas del frontend al frontend
app.get('/login', (req, res) => {
    res.redirect(`${FRONTEND_URL}/login`);
});

app.get('/register', (req, res) => {
    res.redirect(`${FRONTEND_URL}/register`);
});

app.get('/products', (req, res) => {
    res.redirect(`${FRONTEND_URL}/products`);
});

app.get('/profile', (req, res) => {
    res.redirect(`${FRONTEND_URL}/profile`);
});

app.get('/orders', (req, res) => {
    res.redirect(`${FRONTEND_URL}/orders`);
});

app.get('/admin', (req, res) => {
    res.redirect(`${FRONTEND_URL}/admin`);
});

app.get('/admin/*', (req, res) => {
    res.redirect(`${FRONTEND_URL}${req.originalUrl}`);
});

app.get('/vendor', (req, res) => {
    res.redirect(`${FRONTEND_URL}/vendor`);
});

app.get('/checkout', (req, res) => {
    res.redirect(`${FRONTEND_URL}/checkout`);
});

// Proxy
app.use('/api/auth', createProxyMiddleware({
    target: 'http://auth-service:3001',
    changeOrigin: true,
    pathRewrite: { '^/api/auth': '' }
}));

app.use('/api/products', createProxyMiddleware({
    target: 'http://products-service:3002',
    changeOrigin: true,
    pathRewrite: { '^/api/products': '' }
}));

app.use('/api/orders', createProxyMiddleware({
    target: 'http://orders-service:3003',
    changeOrigin: true,
    pathRewrite: { '^/api/orders': '' }
}));

app.use('/api/users', createProxyMiddleware({
    target: 'http://users-service:3004',
    changeOrigin: true,
    pathRewrite: { '^/api/users': '' }
}));

app.use('/api/analytics', createProxyMiddleware({
    target: 'http://analytics-service:3006',
    changeOrigin: true,
    pathRewrite: { '^/api/analytics': '' }
}));

app.use('/api/notifications', createProxyMiddleware({
    target: 'http://notifications-service:3005',
    changeOrigin: true,
    pathRewrite: { '^/api/notifications': '' }
}));

// 404
app.use('*', (req, res) => {
    res.status(404).json({ 
        error: 'Route not found', 
        path: req.originalUrl 
    });
});

app.listen(PORT, () => {
    console.log(`✅ API Gateway running on port ${PORT}`);
    console.log(`🔄 Redirigiendo rutas de frontend a: ${FRONTEND_URL}`);
});