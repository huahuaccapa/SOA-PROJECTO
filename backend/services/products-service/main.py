from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import os, json, aio_pika, aiomysql
from datetime import datetime

app = FastAPI(title="Products Service")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

pool = None
rabbitmq_channel = None

def db_config():
    return dict(host=os.getenv("MYSQL_HOST", "localhost"), port=int(os.getenv("MYSQL_PORT", "3306")), user=os.getenv("MYSQL_USER", "root"), password=os.getenv("MYSQL_PASSWORD", "250520"), db=os.getenv("MYSQL_DATABASE", "byteverse_db"), autocommit=True, charset="utf8mb4")

async def connect_mysql():
    global pool
    if pool is None:
        pool = await aiomysql.create_pool(minsize=1, maxsize=10, **db_config())
    return pool

async def fetch_all(sql, params=()):
    await connect_mysql()
    async with pool.acquire() as conn:
        async with conn.cursor(aiomysql.DictCursor) as cur:
            await cur.execute(sql, params)
            return await cur.fetchall()

async def fetch_one(sql, params=()):
    rows = await fetch_all(sql, params)
    return rows[0] if rows else None

async def execute(sql, params=()):
    await connect_mysql()
    async with pool.acquire() as conn:
        async with conn.cursor(aiomysql.DictCursor) as cur:
            await cur.execute(sql, params)
            return cur.lastrowid, cur.rowcount

def format_product(product):
    if not product: return product
    product["_id"] = str(product["id"])
    product["id"] = str(product["id"])
    product["activo"] = bool(product.get("activo"))
    product["tieneIGV"] = bool(product.get("tieneIGV"))
    product["deliveryGratis"] = bool(product.get("deliveryGratis"))
    try: product["caracteristicas"] = json.loads(product.get("caracteristicas") or "[]")
    except Exception: product["caracteristicas"] = []
    return product

async def connect_rabbitmq():
    global rabbitmq_channel
    try:
        connection = await aio_pika.connect_robust(os.getenv("RABBITMQ_URL", "amqp://rabbitmq:5672"))
        rabbitmq_channel = await connection.channel()
        await rabbitmq_channel.declare_queue("product_events", durable=True)
        print("✅ Products Service conectado a RabbitMQ")
    except Exception as e:
        print(f"❌ Error RabbitMQ: {e}")

class ProductCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = ""
    precio: float
    stock: int
    categoria: Optional[str] = ""
    imagen: Optional[str] = ""
    caracteristicas: List[str] = []
    vendedorId: str
    vendedorNombre: str
    tieneIGV: bool = True
    deliveryGratis: bool = False
    activo: bool = True

class ProductUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    precio: Optional[float] = None
    stock: Optional[int] = None
    categoria: Optional[str] = None
    activo: Optional[bool] = None
    imagen: Optional[str] = None
    caracteristicas: Optional[List[str]] = None
    deliveryGratis: Optional[bool] = None
    tieneIGV: Optional[bool] = None

async def create_default_products():
    default_products = [
        {"nombre":"Laptop Gamer ASUS ROG","descripcion":"Potente laptop gamer con Intel Core i7, 16GB RAM, RTX 4060","precio":5499.99,"stock":10,"categoria":"Laptops","imagen":"https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=300&h=200&fit=crop","caracteristicas":["Intel Core i7","16GB RAM","RTX 4060","1TB SSD"],"vendedorId":"3","vendedorNombre":"TechStore Perú","activo":True,"tieneIGV":True,"deliveryGratis":True},
        {"nombre":"iPhone 15 Pro Max","descripcion":"El iPhone más avanzado con titanio y cámara 48MP","precio":5999.99,"stock":15,"categoria":"Smartphones","imagen":"https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300&h=200&fit=crop","caracteristicas":["Pantalla 6.7\"","Chip A17 Pro","Cámara 48MP"],"vendedorId":"3","vendedorNombre":"TechStore Perú","activo":True,"tieneIGV":True,"deliveryGratis":False},
        {"nombre":"Samsung Galaxy S24 Ultra","descripcion":"El mejor Android con IA integrada y cámara 200MP","precio":4999.99,"stock":8,"categoria":"Smartphones","imagen":"https://images.unsplash.com/photo-1610945265297-4a7df12e7c3c?w=300&h=200&fit=crop","caracteristicas":["Pantalla 6.8\"","Snapdragon 8 Gen 3","Cámara 200MP"],"vendedorId":"3","vendedorNombre":"TechStore Perú","activo":True,"tieneIGV":True,"deliveryGratis":True},
        {"nombre":"iPad Pro M2","descripcion":"Tablet profesional con chip M2 y pantalla XDR","precio":3299.99,"stock":5,"categoria":"Tablets","imagen":"https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=300&h=200&fit=crop","caracteristicas":["Chip M2","Pantalla 12.9\"","Hasta 2TB"],"vendedorId":"3","vendedorNombre":"TechStore Perú","activo":True,"tieneIGV":True,"deliveryGratis":False}
    ]
    for p in default_products:
        existing = await fetch_one("SELECT id FROM products WHERE nombre=%s", (p["nombre"],))
        if not existing:
            await execute("INSERT INTO products (nombre,descripcion,precio,stock,categoria,imagen,caracteristicas,vendedorId,vendedorNombre,tieneIGV,deliveryGratis,activo,fechaCreacion) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW())", (p["nombre"],p["descripcion"],p["precio"],p["stock"],p["categoria"],p["imagen"],json.dumps(p["caracteristicas"]),p["vendedorId"],p["vendedorNombre"],1 if p["tieneIGV"] else 0,1 if p["deliveryGratis"] else 0,1))

@app.get("/health")
async def health():
    try:
        await fetch_one("SELECT 1 ok")
        return {"status":"OK", "service":"products-service", "mysql":"connected"}
    except Exception:
        return {"status":"DEGRADED", "service":"products-service", "mysql":"disconnected"}

@app.get("/products")
async def get_products(categoria: Optional[str] = None, activo: Optional[bool] = True, vendedorId: Optional[str] = None):
    sql = "SELECT * FROM products WHERE 1=1"; params=[]
    if categoria: sql += " AND categoria=%s"; params.append(categoria)
    if activo is not None: sql += " AND activo=%s"; params.append(1 if activo else 0)
    if vendedorId: sql += " AND vendedorId=%s"; params.append(vendedorId)
    sql += " ORDER BY fechaCreacion DESC LIMIT 100"
    return [format_product(p) for p in await fetch_all(sql, tuple(params))]

@app.get("/products/vendor/{vendor_id}")
async def get_products_by_vendor(vendor_id: str):
    return [format_product(p) for p in await fetch_all("SELECT * FROM products WHERE vendedorId=%s ORDER BY fechaCreacion DESC LIMIT 100", (vendor_id,))]

@app.get("/products/{product_id}")
async def get_product(product_id: str):
    product = await fetch_one("SELECT * FROM products WHERE id=%s", (product_id,))
    if not product: raise HTTPException(status_code=404, detail="Producto no encontrado")
    return format_product(product)

@app.post("/products")
async def create_product(product: ProductCreate):
    data = product.dict(); data["activo"] = True
    product_id, _ = await execute("INSERT INTO products (nombre,descripcion,precio,stock,categoria,imagen,caracteristicas,vendedorId,vendedorNombre,tieneIGV,deliveryGratis,activo,fechaCreacion) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW())", (data["nombre"],data.get("descripcion",""),data["precio"],data["stock"],data.get("categoria",""),data.get("imagen",""),json.dumps(data.get("caracteristicas",[])),str(data["vendedorId"]),data["vendedorNombre"],1 if data.get("tieneIGV",True) else 0,1 if data.get("deliveryGratis",False) else 0,1))
    created = format_product(await fetch_one("SELECT * FROM products WHERE id=%s", (product_id,)))
    if rabbitmq_channel:
        await rabbitmq_channel.default_exchange.publish(aio_pika.Message(body=json.dumps({"event":"PRODUCT_CREATED","productId":str(product_id),"vendedorId":str(product.vendedorId),"nombre":product.nombre,"precio":product.precio,"timestamp":datetime.now().isoformat()}).encode()), routing_key="product_events")
    return {"success": True, "product": created}

@app.put("/products/{product_id}")
async def update_product(product_id: str, product: ProductUpdate):
    data = {k:v for k,v in product.dict().items() if v is not None}
    if not data: return {"success": True, "message": "Sin cambios"}
    allowed = {"nombre","descripcion","precio","stock","categoria","activo","imagen","caracteristicas","deliveryGratis","tieneIGV"}
    sets=[]; params=[]
    for k,v in data.items():
        if k in allowed:
            sets.append(f"{k}=%s")
            params.append(json.dumps(v) if k=="caracteristicas" else (1 if isinstance(v,bool) and v else 0 if isinstance(v,bool) else v))
    params.append(product_id)
    _, count = await execute(f"UPDATE products SET {', '.join(sets)}, updatedAt=NOW() WHERE id=%s", tuple(params))
    if count <= 0: raise HTTPException(status_code=404, detail="Producto no encontrado")
    return {"success": True, "message": "Producto actualizado"}

@app.delete("/products/{product_id}")
async def delete_product(product_id: str):
    _, count = await execute("DELETE FROM products WHERE id=%s", (product_id,))
    if count <= 0: raise HTTPException(status_code=404, detail="Producto no encontrado")
    return {"success": True, "message": "Producto eliminado"}

@app.on_event("startup")
async def startup_event():
    await connect_mysql(); await connect_rabbitmq(); await create_default_products()
