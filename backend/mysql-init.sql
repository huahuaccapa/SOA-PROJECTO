SET NAMES utf8mb4;
SET time_zone = '-05:00';

CREATE DATABASE IF NOT EXISTS byteverse_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE byteverse_db;

-- ----------------------------------------------------------------------------
-- ESQUEMA
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  apellido VARCHAR(150) DEFAULT '',
  email VARCHAR(180) NOT NULL UNIQUE,
  password VARCHAR(255) NULL,
  role ENUM('ADMIN','VENDEDOR','COMPRADOR') DEFAULT 'COMPRADOR',
  activo TINYINT(1) DEFAULT 1,
  fechaRegistro DATETIME DEFAULT CURRENT_TIMESTAMP,
  needPasswordChange TINYINT(1) DEFAULT 0,
  refreshToken TEXT NULL,
  googleId VARCHAR(180) NULL UNIQUE,
  authProvider ENUM('local','google') DEFAULT 'local',
  emailVerified TINYINT(1) DEFAULT 0,
  avatar TEXT,
  telefono VARCHAR(50) DEFAULT '',
  direccion TEXT,
  documento VARCHAR(50) DEFAULT '',
  tipoDocumento ENUM('DNI','RUC','CE','PASAPORTE') DEFAULT 'DNI',
  descripcion TEXT,
  comision DECIMAL(10,2) DEFAULT 10.00,
  tienda VARCHAR(150) NULL,
  ruc VARCHAR(50) NULL,
  ultimoAcceso DATETIME NULL,
  ventasRealizadas INT DEFAULT 0,
  totalVentas DECIMAL(12,2) DEFAULT 0.00,
  syncStatus ENUM('SYNCED','PENDING','FAILED') DEFAULT 'SYNCED',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_role (role),
  INDEX idx_users_activo (activo)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS categories (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL UNIQUE,
  descripcion TEXT,
  icono VARCHAR(20) DEFAULT '📂',
  activo TINYINT(1) DEFAULT 1,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS products (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  descripcion TEXT,
  precio DECIMAL(12,2) NOT NULL DEFAULT 0,
  stock INT NOT NULL DEFAULT 0,
  categoria VARCHAR(150) DEFAULT '',
  imagen TEXT,
  caracteristicas JSON NULL,
  vendedorId VARCHAR(80) NOT NULL,
  vendedorNombre VARCHAR(180) NOT NULL,
  tieneIGV TINYINT(1) DEFAULT 1,
  deliveryGratis TINYINT(1) DEFAULT 0,
  activo TINYINT(1) DEFAULT 1,
  fechaCreacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_products_categoria (categoria),
  INDEX idx_products_vendedor (vendedorId),
  INDEX idx_products_activo (activo)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(80) PRIMARY KEY,
  compradorId VARCHAR(80) NOT NULL,
  compradorNombre VARCHAR(180) NOT NULL,
  vendedorId VARCHAR(80) NOT NULL,
  vendedorNombre VARCHAR(180) NOT NULL,
  productos JSON NOT NULL,
  subtotal DECIMAL(12,2) DEFAULT 0,
  igv DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) DEFAULT 0,
  estado ENUM('PENDIENTE','CONFIRMADO','CANCELADO','ENVIADO','ENTREGADO') DEFAULT 'PENDIENTE',
  metodoPago VARCHAR(50) DEFAULT 'tarjeta',
  direccion TEXT,
  ciudad VARCHAR(120),
  fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
  boletaNumero VARCHAR(50),
  notas TEXT,
  pagoDetalles JSON NULL,
  paymentId VARCHAR(120) NULL,
  pagoEstado VARCHAR(40) DEFAULT 'PENDIENTE',
  departamento VARCHAR(120) NULL,
  provincia VARCHAR(120) NULL,
  distrito VARCHAR(120) NULL,
  descuento DECIMAL(12,2) DEFAULT 0,
  couponCode VARCHAR(50) NULL,
  tipoComprobante VARCHAR(20) DEFAULT 'boleta',
  comprobanteNumero VARCHAR(60) NULL,
  clienteDocumento VARCHAR(30) NULL,
  clienteRuc VARCHAR(20) NULL,
  clienteRazonSocial VARCHAR(200) NULL,
  canalVenta VARCHAR(30) DEFAULT 'WEB',
  INDEX idx_orders_comprador (compradorId),
  INDEX idx_orders_vendedor (vendedorId),
  INDEX idx_orders_estado (estado),
  INDEX idx_orders_fecha (fecha)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS analytics_events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  event VARCHAR(100),
  userId VARCHAR(80),
  email VARCHAR(180),
  data JSON,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_analytics_event (event),
  INDEX idx_analytics_timestamp (timestamp)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS metrics (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  metric VARCHAR(100),
  value INT DEFAULT 0,
  date DATE,
  period ENUM('day','week','month') DEFAULT 'day',
  UNIQUE KEY uq_metric_day (metric, date, period)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  event VARCHAR(100) NOT NULL,
  service VARCHAR(100),
  userId VARCHAR(80),
  email VARCHAR(180),
  action VARCHAR(120),
  resource VARCHAR(120),
  resourceId VARCHAR(120),
  changes JSON,
  ip VARCHAR(80),
  userAgent TEXT,
  severity ENUM('info','warning','error','critical') DEFAULT 'info',
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_event (event),
  INDEX idx_audit_service (service),
  INDEX idx_audit_timestamp (timestamp)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inventory (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  productId VARCHAR(80) NOT NULL UNIQUE,
  quantity INT NOT NULL DEFAULT 0,
  reserved INT DEFAULT 0,
  minStock INT DEFAULT 5,
  maxStock INT DEFAULT 100,
  location VARCHAR(150),
  warehouse VARCHAR(150),
  lastUpdated DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS movements (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  productId VARCHAR(80) NOT NULL,
  type ENUM('IN','OUT','RESERVE','RELEASE','ADJUST'),
  quantity INT DEFAULT 0,
  previousQuantity INT DEFAULT 0,
  newQuantity INT DEFAULT 0,
  reason TEXT,
  userId VARCHAR(80),
  orderId VARCHAR(80),
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_movements_product (productId),
  INDEX idx_movements_order (orderId)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS shipping (
  id VARCHAR(80) PRIMARY KEY,
  orderId VARCHAR(80) NOT NULL,
  address JSON,
  status ENUM('PENDING','PROCESSING','IN_TRANSIT','DELIVERED','CANCELLED') DEFAULT 'PENDING',
  trackingNumber VARCHAR(80),
  carrier VARCHAR(120),
  estimatedDelivery DATETIME,
  actualDelivery DATETIME,
  weight DECIMAL(10,2),
  dimensions VARCHAR(120),
  cost DECIMAL(10,2),
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_shipping_order (orderId),
  INDEX idx_shipping_tracking (trackingNumber)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reviews (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  productId VARCHAR(80) NOT NULL,
  userId VARCHAR(80) NOT NULL,
  userName VARCHAR(180) NOT NULL,
  rating INT NOT NULL,
  title VARCHAR(200),
  comment TEXT,
  images JSON,
  verifiedPurchase TINYINT(1) DEFAULT 0,
  likes INT DEFAULT 0,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_reviews_product (productId),
  INDEX idx_reviews_user (userId)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS wishlist (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  userId VARCHAR(80) NOT NULL,
  productId VARCHAR(80) NOT NULL,
  productName VARCHAR(200),
  productPrice DECIMAL(12,2),
  productImage TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_wishlist_user_product (userId, productId)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS coupons (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  type ENUM('percentage','fixed') NOT NULL,
  value DECIMAL(12,2) NOT NULL,
  minPurchase DECIMAL(12,2) DEFAULT 0,
  maxDiscount DECIMAL(12,2) NULL,
  expiresAt DATETIME NOT NULL,
  usageLimit INT DEFAULT 1,
  usedCount INT DEFAULT 0,
  active TINYINT(1) DEFAULT 1,
  description TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS vendor_cart (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  vendorId VARCHAR(80) NOT NULL,
  productId VARCHAR(80) NOT NULL,
  nombre VARCHAR(200) NOT NULL,
  precio DECIMAL(12,2) NOT NULL,
  cantidad INT DEFAULT 1,
  imagen TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_vendor_product (vendorId, productId)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  userId BIGINT NOT NULL,
  tokenHash CHAR(64) NOT NULL UNIQUE,
  expiresAt DATETIME NOT NULL,
  usedAt DATETIME NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_reset_user (userId),
  INDEX idx_reset_expiry (expiresAt),
  CONSTRAINT fk_reset_user FOREIGN KEY (userId)
    REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- DATOS DE DEMOSTRACION
-- ----------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS seed_byteverse_demo;

DELIMITER $$

CREATE PROCEDURE seed_byteverse_demo()
BEGIN
  DECLARE i INT DEFAULT 1;
  DECLARE v_email VARCHAR(180);
  DECLARE v_role VARCHAR(20);
  DECLARE v_category VARCHAR(150);
  DECLARE v_product_name VARCHAR(200);
  DECLARE v_image_url TEXT;
  DECLARE v_product_id BIGINT;
  DECLARE v_product_id_text VARCHAR(80);
  DECLARE v_user_id BIGINT;
  DECLARE v_user_id_text VARCHAR(80);
  DECLARE v_vendor_id BIGINT;
  DECLARE v_vendor_id_text VARCHAR(80);
  DECLARE v_vendor_name VARCHAR(180);
  DECLARE v_user_name VARCHAR(180);
  DECLARE v_price DECIMAL(12,2);
  DECLARE v_stock INT;
  DECLARE v_qty INT;
  DECLARE v_subtotal DECIMAL(12,2);
  DECLARE v_discount DECIMAL(12,2);
  DECLARE v_igv DECIMAL(12,2);
  DECLARE v_total DECIMAL(12,2);
  DECLARE v_order_id VARCHAR(80);
  DECLARE v_order_status VARCHAR(20);
  DECLARE v_shipping_status VARCHAR(20);
  DECLARE v_coupon VARCHAR(50);
  DECLARE v_old_safe_updates INT DEFAULT 1;

  -- Si cualquier sentencia falla, no deja una transaccion parcial ni cambia
  -- permanentemente la preferencia SQL_SAFE_UPDATES de la sesion.
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    SET SESSION SQL_SAFE_UPDATES = v_old_safe_updates;
    RESIGNAL;
  END;

  SET v_old_safe_updates = @@SESSION.SQL_SAFE_UPDATES;
  SET SESSION SQL_SAFE_UPDATES = 0;
  START TRANSACTION;

  -- Limpia solo filas no unicas identificadas expresamente como DEMO.
  DELETE FROM analytics_events WHERE event LIKE 'DEMO_%';
  DELETE FROM metrics WHERE metric LIKE 'demo_metric_%';
  DELETE FROM audit_logs WHERE resource = 'demo_seed';
  DELETE FROM movements WHERE reason LIKE '[DEMO]%';
  DELETE FROM reviews WHERE title LIKE '[DEMO]%';

  -- Fase 1: 20 usuarios y 20 categorias.
  SET i = 1;
  WHILE i <= 20 DO
    SET v_email = CONCAT('demo', LPAD(i, 2, '0'), '@byteverse.test');
    SET v_role = CASE
      WHEN i = 1 THEN 'ADMIN'
      WHEN i BETWEEN 2 AND 6 THEN 'VENDEDOR'
      ELSE 'COMPRADOR'
    END;

    INSERT INTO users (
      nombre, apellido, email, password, role, activo, fechaRegistro,
      needPasswordChange, refreshToken, googleId, authProvider, emailVerified,
      avatar, telefono, direccion, documento, tipoDocumento, descripcion,
      comision, tienda, ruc, ultimoAcceso, ventasRealizadas, totalVentas,
      syncStatus, createdAt
    ) VALUES (
      ELT(i,
        'Ana','Luis','Mariana','Carlos','Valeria','Diego','Sofia','Jorge','Camila','Miguel',
        'Lucia','Andres','Paola','Fernando','Daniela','Ricardo','Gabriela','Martin','Elena','Sebastian'),
      ELT(i,
        'Torres','Ramirez','Flores','Mendoza','Castro','Vega','Rojas','Salazar','Navarro','Paredes',
        'Campos','Herrera','Silva','Ortega','Reyes','Medina','Cruz','Lopez','Aguilar','Fuentes'),
      v_email,
      NULL,
      v_role,
      1,
      TIMESTAMPADD(DAY, -i, NOW()),
      0,
      NULL,
      CONCAT('demo-google-', LPAD(i, 2, '0')),
      'google',
      1,
      CONCAT('https://i.pravatar.cc/300?img=', i),
      CONCAT('9', LPAD(10000000 + i, 8, '0')),
      CONCAT('Av. Demo ', 100 + i, ', Lima, Peru'),
      IF(v_role = 'VENDEDOR', CONCAT('20', LPAD(500000000 + i, 9, '0')), LPAD(70000000 + i, 8, '0')),
      IF(v_role = 'VENDEDOR', 'RUC', 'DNI'),
      IF(v_role = 'VENDEDOR', 'Vendedor verificado de tecnologia y accesorios.', 'Perfil de demostracion ByteVerse.'),
      IF(v_role = 'VENDEDOR', 10.00, 0.00),
      IF(v_role = 'VENDEDOR', CONCAT('Tienda Demo ', LPAD(i, 2, '0')), NULL),
      IF(v_role = 'VENDEDOR', CONCAT('20', LPAD(500000000 + i, 9, '0')), NULL),
      TIMESTAMPADD(HOUR, -i, NOW()),
      IF(v_role = 'VENDEDOR', i * 4, 0),
      IF(v_role = 'VENDEDOR', i * 1250.50, 0),
      'SYNCED',
      TIMESTAMPADD(DAY, -i, NOW())
    )
    ON DUPLICATE KEY UPDATE
      nombre = VALUES(nombre),
      apellido = VALUES(apellido),
      role = VALUES(role),
      activo = VALUES(activo),
      telefono = VALUES(telefono),
      direccion = VALUES(direccion),
      documento = VALUES(documento),
      tipoDocumento = VALUES(tipoDocumento),
      descripcion = VALUES(descripcion),
      comision = VALUES(comision),
      tienda = VALUES(tienda),
      ruc = VALUES(ruc),
      syncStatus = 'SYNCED';

    SET v_category = ELT(i,
      'Laptops','Smartphones','Tablets','Accesorios','Audio',
      'Gaming','Smartwatches','Camaras','Almacenamiento','Monitores',
      'Impresoras','Redes','Componentes','Hogar inteligente','Televisores',
      'Drones','Consolas','Software','Oficina','Energia');

    INSERT INTO categories (nombre, descripcion, icono, activo, createdAt)
    VALUES (
      v_category,
      CONCAT('Categoria de demostracion para ', v_category, '.'),
      ELT(i,'💻','📱','📟','🎧','🔊','🎮','⌚','📷','💾','🖥️','🖨️','📡','🧩','🏠','📺','🚁','🕹️','💿','🗄️','🔋'),
      1,
      TIMESTAMPADD(DAY, -i, NOW())
    )
    ON DUPLICATE KEY UPDATE
      descripcion = VALUES(descripcion),
      icono = VALUES(icono),
      activo = 1;

    SET i = i + 1;
  END WHILE;

  -- Fase 2: 20 productos y 20 cupones.
  SET i = 1;
  WHILE i <= 20 DO
    SET v_category = ELT(i,
      'Laptops','Smartphones','Tablets','Accesorios','Audio',
      'Gaming','Smartwatches','Camaras','Almacenamiento','Monitores',
      'Impresoras','Redes','Componentes','Hogar inteligente','Televisores',
      'Drones','Consolas','Software','Oficina','Energia');

    SET v_product_name = ELT(i,
      'Laptop Lenovo IdeaPad 5','Samsung Galaxy A55','Tablet Xiaomi Pad 6','Mouse Logitech MX Master 3S',
      'Audifonos Sony WH-1000XM5','Teclado mecanico HyperX Alloy','Apple Watch Series 9','Camara Canon EOS R50',
      'SSD Kingston NV2 1TB','Monitor LG UltraGear 27','Impresora Epson EcoTank L3250','Router TP-Link Archer AX55',
      'Tarjeta grafica RTX 4060','Foco inteligente WiFi RGB','TV Samsung Crystal UHD 55',
      'Drone DJI Mini 4 Pro','Consola PlayStation 5 Slim','Microsoft 365 Personal','Silla ergonomica ErgoPro',
      'UPS APC 1200VA');

    SET v_image_url = ELT(i,
      'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1527814050087-3793815479db?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1606904825846-647eb07f5be2?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1535868463750-c78d9543614f?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1473968512647-3e447244af8f?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1672689944912-9a123a34a1cf?auto=format&fit=crop&w=900&q=80');

    SET v_vendor_id = (
      SELECT id FROM users
      WHERE email = CONCAT('demo', LPAD(2 + MOD(i - 1, 5), 2, '0'), '@byteverse.test')
      LIMIT 1
    );
    SET v_vendor_id_text = CAST(v_vendor_id AS CHAR);
    SET v_vendor_name = (
      SELECT COALESCE(tienda, CONCAT(nombre, ' ', apellido))
      FROM users WHERE id = v_vendor_id LIMIT 1
    );
    SET v_price = ROUND(79.90 + (i * 187.35), 2);
    SET v_stock = 12 + (i * 3);

    SET v_product_id = (
      SELECT id FROM products
      WHERE nombre = v_product_name AND vendedorId = v_vendor_id_text
      LIMIT 1
    );

    IF v_product_id IS NULL THEN
      INSERT INTO products (
        nombre, descripcion, precio, stock, categoria, imagen, caracteristicas,
        vendedorId, vendedorNombre, tieneIGV, deliveryGratis, activo,
        fechaCreacion, createdAt
      ) VALUES (
        v_product_name,
        CONCAT(v_product_name, ' con garantia local y soporte ByteVerse.'),
        v_price,
        v_stock,
        v_category,
        v_image_url,
        JSON_ARRAY(CONCAT('Modelo ', LPAD(i, 2, '0')), 'Garantia 12 meses', 'Stock nacional'),
        v_vendor_id_text,
        v_vendor_name,
        1,
        IF(MOD(i, 3) = 0, 1, 0),
        1,
        TIMESTAMPADD(DAY, -i, NOW()),
        TIMESTAMPADD(DAY, -i, NOW())
      );
    ELSE
      UPDATE products SET
        descripcion = CONCAT(v_product_name, ' con garantia local y soporte ByteVerse.'),
        precio = v_price,
        stock = v_stock,
        categoria = v_category,
        imagen = v_image_url,
        vendedorNombre = v_vendor_name,
        caracteristicas = JSON_ARRAY(CONCAT('Modelo ', LPAD(i, 2, '0')), 'Garantia 12 meses', 'Stock nacional'),
        tieneIGV = 1,
        deliveryGratis = IF(MOD(i, 3) = 0, 1, 0),
        activo = 1
      WHERE id = v_product_id;
    END IF;

    SET v_coupon = CONCAT('DEMO', LPAD(i, 2, '0'));
    INSERT INTO coupons (
      code, type, value, minPurchase, maxDiscount, expiresAt,
      usageLimit, usedCount, active, description, createdAt
    ) VALUES (
      v_coupon,
      IF(MOD(i, 2) = 0, 'percentage', 'fixed'),
      IF(MOD(i, 2) = 0, 5 + MOD(i, 4) * 5, 10 + i * 2),
      50 + i * 10,
      IF(MOD(i, 2) = 0, 100 + i * 5, NULL),
      TIMESTAMPADD(DAY, 30 + i, NOW()),
      50 + i,
      MOD(i, 5),
      1,
      CONCAT('Cupon de demostracion numero ', LPAD(i, 2, '0')),
      TIMESTAMPADD(DAY, -i, NOW())
    )
    ON DUPLICATE KEY UPDATE
      type = VALUES(type),
      value = VALUES(value),
      minPurchase = VALUES(minPurchase),
      maxDiscount = VALUES(maxDiscount),
      expiresAt = VALUES(expiresAt),
      usageLimit = VALUES(usageLimit),
      usedCount = VALUES(usedCount),
      active = 1,
      description = VALUES(description);

    SET i = i + 1;
  END WHILE;

  -- Fase 3: 20 registros en cada tabla relacionada.
  SET i = 1;
  WHILE i <= 20 DO
    SET v_product_name = ELT(i,
      'Laptop Lenovo IdeaPad 5','Samsung Galaxy A55','Tablet Xiaomi Pad 6','Mouse Logitech MX Master 3S',
      'Audifonos Sony WH-1000XM5','Teclado mecanico HyperX Alloy','Apple Watch Series 9','Camara Canon EOS R50',
      'SSD Kingston NV2 1TB','Monitor LG UltraGear 27','Impresora Epson EcoTank L3250','Router TP-Link Archer AX55',
      'Tarjeta grafica RTX 4060','Foco inteligente WiFi RGB','TV Samsung Crystal UHD 55',
      'Drone DJI Mini 4 Pro','Consola PlayStation 5 Slim','Microsoft 365 Personal','Silla ergonomica ErgoPro',
      'UPS APC 1200VA');

    SET v_vendor_id = (
      SELECT id FROM users
      WHERE email = CONCAT('demo', LPAD(2 + MOD(i - 1, 5), 2, '0'), '@byteverse.test')
      LIMIT 1
    );
    SET v_vendor_id_text = CAST(v_vendor_id AS CHAR);
    SET v_vendor_name = (
      SELECT COALESCE(tienda, CONCAT(nombre, ' ', apellido))
      FROM users WHERE id = v_vendor_id LIMIT 1
    );
    SET v_user_id = (
      SELECT id FROM users
      WHERE email = CONCAT('demo', LPAD(7 + MOD(i - 1, 14), 2, '0'), '@byteverse.test')
      LIMIT 1
    );
    SET v_user_id_text = CAST(v_user_id AS CHAR);
    SET v_user_name = (
      SELECT CONCAT(nombre, ' ', apellido) FROM users WHERE id = v_user_id LIMIT 1
    );
    SET v_product_id = (
      SELECT id FROM products
      WHERE nombre = v_product_name AND vendedorId = v_vendor_id_text
      LIMIT 1
    );
    SET v_product_id_text = CAST(v_product_id AS CHAR);
    SET v_price = (SELECT precio FROM products WHERE id = v_product_id);
    SET v_image_url = (SELECT imagen FROM products WHERE id = v_product_id);
    SET v_stock = (SELECT stock FROM products WHERE id = v_product_id);
    SET v_qty = 1 + MOD(i, 3);
    SET v_subtotal = ROUND(v_price * v_qty, 2);
    SET v_discount = IF(MOD(i, 4) = 0, ROUND(v_subtotal * 0.10, 2), 0.00);
    SET v_igv = ROUND((v_subtotal - v_discount) * 0.18, 2);
    SET v_total = ROUND(v_subtotal - v_discount + v_igv, 2);
    SET v_order_id = CONCAT('DEMO-ORDER-', LPAD(i, 4, '0'));
    SET v_order_status = ELT(1 + MOD(i - 1, 5), 'PENDIENTE','CONFIRMADO','ENVIADO','ENTREGADO','CANCELADO');
    SET v_shipping_status = ELT(1 + MOD(i - 1, 5), 'PENDING','PROCESSING','IN_TRANSIT','DELIVERED','CANCELLED');
    SET v_coupon = IF(MOD(i, 4) = 0, CONCAT('DEMO', LPAD(i, 2, '0')), NULL);

    INSERT INTO orders (
      id, compradorId, compradorNombre, vendedorId, vendedorNombre, productos,
      subtotal, igv, total, estado, metodoPago, direccion, ciudad, fecha,
      boletaNumero, notas, pagoDetalles, paymentId, pagoEstado, departamento,
      provincia, distrito, descuento, couponCode, tipoComprobante,
      comprobanteNumero, clienteDocumento, clienteRuc, clienteRazonSocial,
      canalVenta
    ) VALUES (
      v_order_id,
      v_user_id_text,
      v_user_name,
      v_vendor_id_text,
      v_vendor_name,
      JSON_ARRAY(JSON_OBJECT(
        'productoId', v_product_id_text,
        'nombre', v_product_name,
        'precio', v_price,
        'cantidad', v_qty,
        'subtotal', v_subtotal,
        'vendedorId', v_vendor_id_text,
        'vendedorNombre', v_vendor_name
      )),
      v_subtotal,
      v_igv,
      v_total,
      v_order_status,
      ELT(1 + MOD(i - 1, 4), 'tarjeta','yape','efectivo','mercadopago'),
      CONCAT('Av. Los Comercios ', 200 + i),
      'Lima',
      TIMESTAMPADD(DAY, -i, NOW()),
      CONCAT('B001-', LPAD(i, 8, '0')),
      CONCAT('Pedido de demostracion ', LPAD(i, 2, '0')),
      JSON_OBJECT('modo', 'demo', 'referencia', CONCAT('PAY-DEMO-', LPAD(i, 4, '0'))),
      CONCAT('PAY-DEMO-', LPAD(i, 4, '0')),
      IF(v_order_status IN ('CONFIRMADO','ENVIADO','ENTREGADO'), 'PAGADO', IF(v_order_status = 'CANCELADO','ANULADO','PENDIENTE')),
      'Lima',
      'Lima',
      ELT(1 + MOD(i - 1, 5), 'Miraflores','San Isidro','Surco','Lince','Barranco'),
      v_discount,
      v_coupon,
      IF(MOD(i, 5) = 0, 'factura', 'boleta'),
      CONCAT(IF(MOD(i, 5) = 0, 'F001-', 'B001-'), LPAD(i, 8, '0')),
      LPAD(70000000 + i, 8, '0'),
      IF(MOD(i, 5) = 0, CONCAT('20', LPAD(600000000 + i, 9, '0')), NULL),
      IF(MOD(i, 5) = 0, CONCAT('Empresa Demo ', LPAD(i, 2, '0'), ' S.A.C.'), NULL),
      IF(MOD(i, 3) = 0, 'TIENDA', 'WEB')
    )
    ON DUPLICATE KEY UPDATE
      compradorId = VALUES(compradorId),
      compradorNombre = VALUES(compradorNombre),
      vendedorId = VALUES(vendedorId),
      vendedorNombre = VALUES(vendedorNombre),
      productos = VALUES(productos),
      subtotal = VALUES(subtotal),
      descuento = VALUES(descuento),
      igv = VALUES(igv),
      total = VALUES(total),
      estado = VALUES(estado),
      metodoPago = VALUES(metodoPago),
      pagoDetalles = VALUES(pagoDetalles),
      paymentId = VALUES(paymentId),
      pagoEstado = VALUES(pagoEstado),
      couponCode = VALUES(couponCode);

    INSERT INTO inventory (
      productId, quantity, reserved, minStock, maxStock, location, warehouse
    ) VALUES (
      v_product_id_text,
      v_stock,
      MOD(i, 4),
      5,
      150,
      CONCAT('Pasillo ', CHAR(64 + 1 + MOD(i - 1, 5)), '-', LPAD(i, 2, '0')),
      IF(MOD(i, 2) = 0, 'Almacen Lima Norte', 'Almacen Lima Centro')
    )
    ON DUPLICATE KEY UPDATE
      quantity = VALUES(quantity),
      reserved = VALUES(reserved),
      minStock = VALUES(minStock),
      maxStock = VALUES(maxStock),
      location = VALUES(location),
      warehouse = VALUES(warehouse);

    INSERT INTO movements (
      productId, type, quantity, previousQuantity, newQuantity,
      reason, userId, orderId, timestamp
    ) VALUES (
      v_product_id_text,
      ELT(1 + MOD(i - 1, 5), 'IN','OUT','RESERVE','RELEASE','ADJUST'),
      v_qty,
      v_stock - v_qty,
      v_stock,
      CONCAT('[DEMO] Movimiento de inventario ', LPAD(i, 2, '0')),
      v_user_id_text,
      v_order_id,
      TIMESTAMPADD(HOUR, -i, NOW())
    );

    INSERT INTO shipping (
      id, orderId, address, status, trackingNumber, carrier,
      estimatedDelivery, actualDelivery, weight, dimensions, cost,
      createdAt
    ) VALUES (
      CONCAT('SHIP-DEMO-', LPAD(i, 4, '0')),
      v_order_id,
      JSON_OBJECT(
        'street', CONCAT('Av. Los Comercios ', 200 + i),
        'city', 'Lima',
        'district', ELT(1 + MOD(i - 1, 5), 'Miraflores','San Isidro','Surco','Lince','Barranco'),
        'country', 'Peru'
      ),
      v_shipping_status,
      CONCAT('BV', DATE_FORMAT(CURDATE(), '%Y%m'), LPAD(i, 6, '0')),
      ELT(1 + MOD(i - 1, 3), 'ByteVerse Logistics','Olva Courier','Shalom Express'),
      TIMESTAMPADD(DAY, 3, TIMESTAMPADD(DAY, -i, NOW())),
      IF(v_shipping_status = 'DELIVERED', TIMESTAMPADD(DAY, 2, TIMESTAMPADD(DAY, -i, NOW())), NULL),
      ROUND(0.50 + i * 0.15, 2),
      '30x20x15 cm',
      ROUND(12.00 + i * 1.25, 2),
      TIMESTAMPADD(DAY, -i, NOW())
    )
    ON DUPLICATE KEY UPDATE
      orderId = VALUES(orderId),
      address = VALUES(address),
      status = VALUES(status),
      trackingNumber = VALUES(trackingNumber),
      carrier = VALUES(carrier),
      estimatedDelivery = VALUES(estimatedDelivery),
      actualDelivery = VALUES(actualDelivery),
      weight = VALUES(weight),
      dimensions = VALUES(dimensions),
      cost = VALUES(cost);

    INSERT INTO reviews (
      productId, userId, userName, rating, title, comment, images,
      verifiedPurchase, likes, createdAt
    ) VALUES (
      v_product_id_text,
      v_user_id_text,
      v_user_name,
      1 + MOD(i - 1, 5),
      CONCAT('[DEMO] Opinion del producto ', LPAD(i, 2, '0')),
      ELT(1 + MOD(i - 1, 5),
        'Cumple con lo ofrecido y llego bien embalado.',
        'Buena relacion entre precio y calidad.',
        'El producto funciona correctamente.',
        'Entrega rapida y excelente atencion.',
        'Muy recomendado para uso diario.'),
      JSON_ARRAY(),
      1,
      MOD(i * 3, 17),
      TIMESTAMPADD(DAY, -i, NOW())
    );

    INSERT INTO wishlist (
      userId, productId, productName, productPrice, productImage, createdAt
    ) VALUES (
      v_user_id_text,
      v_product_id_text,
      v_product_name,
      v_price,
      v_image_url,
      TIMESTAMPADD(DAY, -i, NOW())
    )
    ON DUPLICATE KEY UPDATE
      productName = VALUES(productName),
      productPrice = VALUES(productPrice),
      productImage = VALUES(productImage);

    INSERT INTO vendor_cart (
      vendorId, productId, nombre, precio, cantidad, imagen, createdAt
    ) VALUES (
      v_vendor_id_text,
      v_product_id_text,
      v_product_name,
      v_price,
      1 + MOD(i, 5),
      v_image_url,
      TIMESTAMPADD(DAY, -i, NOW())
    )
    ON DUPLICATE KEY UPDATE
      nombre = VALUES(nombre),
      precio = VALUES(precio),
      cantidad = VALUES(cantidad),
      imagen = VALUES(imagen);

    INSERT INTO analytics_events (event, userId, email, data, timestamp)
    VALUES (
      CONCAT('DEMO_', ELT(1 + MOD(i - 1, 5), 'USER_LOGIN','PRODUCT_VIEWED','ORDER_CREATED','PAYMENT_CONFIRMED','REVIEW_CREATED')),
      v_user_id_text,
      (SELECT email FROM users WHERE id = v_user_id),
      JSON_OBJECT('demo', TRUE, 'orderId', v_order_id, 'productId', v_product_id_text, 'amount', v_total),
      TIMESTAMPADD(HOUR, -i, NOW())
    );

    INSERT INTO metrics (metric, value, date, period)
    VALUES (
      CONCAT('demo_metric_', LPAD(i, 2, '0')),
      10 + i * 3,
      DATE(TIMESTAMPADD(DAY, -i, NOW())),
      ELT(1 + MOD(i - 1, 3), 'day','week','month')
    )
    ON DUPLICATE KEY UPDATE value = VALUES(value);

    INSERT INTO audit_logs (
      event, service, userId, email, action, resource, resourceId,
      changes, ip, userAgent, severity, timestamp
    ) VALUES (
      CONCAT('DEMO_AUDIT_', LPAD(i, 2, '0')),
      ELT(1 + MOD(i - 1, 5), 'auth','products','orders','payment','shipping'),
      v_user_id_text,
      (SELECT email FROM users WHERE id = v_user_id),
      ELT(1 + MOD(i - 1, 4), 'CREATE','READ','UPDATE','CONFIRM'),
      'demo_seed',
      v_order_id,
      JSON_OBJECT('demo', TRUE, 'productId', v_product_id_text, 'orderId', v_order_id),
      CONCAT('192.168.1.', 20 + i),
      'ByteVerse Demo Seeder/1.0',
      ELT(1 + MOD(i - 1, 4), 'info','info','warning','error'),
      TIMESTAMPADD(MINUTE, -(i * 10), NOW())
    );

    -- Tokens intencionalmente vencidos y usados: rellenan la tabla sin crear
    -- accesos validos para recuperar cuentas demo.
    INSERT INTO password_reset_tokens (
      userId, tokenHash, expiresAt, usedAt, createdAt
    ) VALUES (
      v_user_id,
      SHA2(CONCAT('byteverse-demo-reset-', LPAD(i, 2, '0')), 256),
      TIMESTAMPADD(DAY, -1, NOW()),
      TIMESTAMPADD(HOUR, -12, NOW()),
      TIMESTAMPADD(DAY, -2, NOW())
    )
    ON DUPLICATE KEY UPDATE
      userId = VALUES(userId),
      expiresAt = VALUES(expiresAt),
      usedAt = VALUES(usedAt);

    SET i = i + 1;
  END WHILE;

  COMMIT;
  SET SESSION SQL_SAFE_UPDATES = v_old_safe_updates;
END$$

DELIMITER ;

CALL seed_byteverse_demo();
DROP PROCEDURE IF EXISTS seed_byteverse_demo;

-- ----------------------------------------------------------------------------
-- RESUMEN DE VALIDACION
-- Debe mostrar por lo menos 20 registros en cada tabla.
-- ----------------------------------------------------------------------------

SELECT 'users' AS tabla, COUNT(*) AS registros FROM users
UNION ALL SELECT 'categories', COUNT(*) FROM categories
UNION ALL SELECT 'products', COUNT(*) FROM products
UNION ALL SELECT 'orders', COUNT(*) FROM orders
UNION ALL SELECT 'analytics_events', COUNT(*) FROM analytics_events
UNION ALL SELECT 'metrics', COUNT(*) FROM metrics
UNION ALL SELECT 'audit_logs', COUNT(*) FROM audit_logs
UNION ALL SELECT 'inventory', COUNT(*) FROM inventory
UNION ALL SELECT 'movements', COUNT(*) FROM movements
UNION ALL SELECT 'shipping', COUNT(*) FROM shipping
UNION ALL SELECT 'reviews', COUNT(*) FROM reviews
UNION ALL SELECT 'wishlist', COUNT(*) FROM wishlist
UNION ALL SELECT 'coupons', COUNT(*) FROM coupons
UNION ALL SELECT 'vendor_cart', COUNT(*) FROM vendor_cart
UNION ALL SELECT 'password_reset_tokens', COUNT(*) FROM password_reset_tokens;
