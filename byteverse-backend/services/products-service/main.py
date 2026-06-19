from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from typing import Optional, List
import os
import json
import aio_pika
from datetime import datetime
from bson import ObjectId

app = FastAPI(title="Products Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB
client = AsyncIOMotorClient(os.getenv("MONGODB_URI", "mongodb://mongodb:27017"))
db = client.byteverse
products_collection = db.products

# RabbitMQ
rabbitmq_channel = None

async def connect_rabbitmq():
    global rabbitmq_channel
    try:
        connection = await aio_pika.connect_robust(
            os.getenv("RABBITMQ_URL", "amqp://rabbitmq:5672")
        )
        rabbitmq_channel = await connection.channel()
        await rabbitmq_channel.declare_queue("product_events", durable=True)
        print("✅ Products Service conectado a RabbitMQ")
        return rabbitmq_channel
    except Exception as e:
        print(f"❌ Error RabbitMQ: {e}")
        return None

# Models
class ProductCreate(BaseModel):
    nombre: str
    descripcion: str
    precio: float
    stock: int
    categoria: str
    imagen: Optional[str] = None
    caracteristicas: List[str] = []
    vendedorId: int
    vendedorNombre: str
    tieneIGV: bool = True
    deliveryGratis: bool = False

class ProductUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    precio: Optional[float] = None
    stock: Optional[int] = None
    categoria: Optional[str] = None
    activo: Optional[bool] = None

# Crear productos por defecto
async def create_default_products():
    default_products = [
        {
            "nombre": "Laptop Gamer ASUS ROG",
            "descripcion": "Potente laptop gamer con Intel Core i7, 16GB RAM, RTX 4060",
            "precio": 5499.99,
            "stock": 10,
            "categoria": "Laptops",
            "imagen": "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=300&h=200&fit=crop",
            "caracteristicas": ["Intel Core i7", "16GB RAM", "RTX 4060", "1TB SSD"],
            "vendedorId": 3,
            "vendedorNombre": "TechStore Perú",
            "activo": True,
            "tieneIGV": True,
            "deliveryGratis": True,
            "fechaCreacion": datetime.now().isoformat()
        },
        {
            "nombre": "iPhone 15 Pro Max",
            "descripcion": "El iPhone más avanzado con titanio y cámara 48MP",
            "precio": 5999.99,
            "stock": 15,
            "categoria": "Smartphones",
            "imagen": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300&h=200&fit=crop",
            "caracteristicas": ["Pantalla 6.7\"", "Chip A17 Pro", "Cámara 48MP"],
            "vendedorId": 3,
            "vendedorNombre": "TechStore Perú",
            "activo": True,
            "tieneIGV": True,
            "deliveryGratis": False,
            "fechaCreacion": datetime.now().isoformat()
        },
        {
            "nombre": "Sony WH-1000XM5",
            "descripcion": "Audífonos con cancelación de ruido líder en la industria",
            "precio": 1299.99,
            "stock": 25,
            "categoria": "Audífonos",
            "imagen": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=200&fit=crop",
            "caracteristicas": ["Cancelación de ruido", "30 horas batería", "Bluetooth 5.2"],
            "vendedorId": 4,
            "vendedorNombre": "GamerWorld",
            "activo": True,
            "tieneIGV": True,
            "deliveryGratis": True,
            "fechaCreacion": datetime.now().isoformat()
        }
    ]
    
    for product in default_products:
        existing = await products_collection.find_one({"nombre": product["nombre"]})
        if not existing:
            await products_collection.insert_one(product)
            print(f"📦 Producto creado: {product['nombre']}")

# Endpoints
@app.get("/")
async def root():
    return {"service": "Products Service", "status": "healthy"}

@app.get("/health")
async def health():
    return {"status": "OK", "service": "products-service"}

@app.get("/products")
async def get_products(categoria: Optional[str] = None, activo: Optional[bool] = True):
    query = {}
    if categoria:
        query["categoria"] = categoria
    if activo is not None:
        query["activo"] = activo
    
    products = await products_collection.find(query).to_list(length=100)
    for product in products:
        product["_id"] = str(product["_id"])
    return products

@app.get("/products/{product_id}")
async def get_product(product_id: str):
    try:
        product = await products_collection.find_one({"_id": ObjectId(product_id)})
        if product:
            product["_id"] = str(product["_id"])
            return product
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    except:
        raise HTTPException(status_code=400, detail="ID inválido")

@app.post("/products")
async def create_product(product: ProductCreate):
    product_data = product.dict()
    product_data["activo"] = True
    product_data["fechaCreacion"] = datetime.now().isoformat()
    
    result = await products_collection.insert_one(product_data)
    product_data["_id"] = str(result.inserted_id)
    
    # Publicar evento
    if rabbitmq_channel:
        await rabbitmq_channel.default_exchange.publish(
            aio_pika.Message(
                body=json.dumps({
                    "event": "PRODUCT_CREATED",
                    "productId": str(result.inserted_id),
                    "vendedorId": product.vendedorId,
                    "timestamp": datetime.now().isoformat()
                }).encode()
            ),
            routing_key="product_events"
        )
    
    return {"success": True, "product": product_data}

@app.put("/products/{product_id}")
async def update_product(product_id: str, product: ProductUpdate):
    try:
        update_data = {k: v for k, v in product.dict().items() if v is not None}
        if update_data:
            result = await products_collection.update_one(
                {"_id": ObjectId(product_id)},
                {"$set": update_data}
            )
            if result.modified_count > 0:
                return {"success": True, "message": "Producto actualizado"}
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    except:
        raise HTTPException(status_code=400, detail="ID inválido")

@app.delete("/products/{product_id}")
async def delete_product(product_id: str):
    try:
        result = await products_collection.delete_one({"_id": ObjectId(product_id)})
        if result.deleted_count > 0:
            return {"success": True, "message": "Producto eliminado"}
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    except:
        raise HTTPException(status_code=400, detail="ID inválido")

@app.on_event("startup")
async def startup_event():
    await connect_rabbitmq()
    await create_default_products()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3002)