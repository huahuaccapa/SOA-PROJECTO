from fastapi import FastAPI, HTTPException, Query
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

# ==================== MONGODB ====================
client = AsyncIOMotorClient(os.getenv("MONGODB_URI", "mongodb://admin:password@mongodb:27017/byteverse?authSource=admin"))
db = client.byteverse
products_collection = db.products

# ==================== RABBITMQ ====================
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

# ==================== MODELOS ACTUALIZADOS ====================
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
    activo: bool = True  # ✅ NUEVO

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

# ==================== DATOS POR DEFECTO ====================
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
            "vendedorId": "67a1b2c3d4e5f67890abcdef",
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
            "vendedorId": "67a1b2c3d4e5f67890abcdef",
            "vendedorNombre": "TechStore Perú",
            "activo": True,
            "tieneIGV": True,
            "deliveryGratis": False,
            "fechaCreacion": datetime.now().isoformat()
        },
        {
            "nombre": "Samsung Galaxy S24 Ultra",
            "descripcion": "El mejor Android con IA integrada y cámara 200MP",
            "precio": 4999.99,
            "stock": 8,
            "categoria": "Smartphones",
            "imagen": "https://images.unsplash.com/photo-1610945265297-4a7df12e7c3c?w=300&h=200&fit=crop",
            "caracteristicas": ["Pantalla 6.8\"", "Snapdragon 8 Gen 3", "Cámara 200MP"],
            "vendedorId": "67a1b2c3d4e5f67890abcdef",
            "vendedorNombre": "TechStore Perú",
            "activo": True,
            "tieneIGV": True,
            "deliveryGratis": True,
            "fechaCreacion": datetime.now().isoformat()
        },
        {
            "nombre": "iPad Pro M2",
            "descripcion": "Tablet profesional con chip M2 y pantalla XDR",
            "precio": 3299.99,
            "stock": 5,
            "categoria": "Tablets",
            "imagen": "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=300&h=200&fit=crop",
            "caracteristicas": ["Chip M2", "Pantalla 12.9\"", "Hasta 2TB"],
            "vendedorId": "67a1b2c3d4e5f67890abcdef",
            "vendedorNombre": "TechStore Perú",
            "activo": True,
            "tieneIGV": True,
            "deliveryGratis": False,
            "fechaCreacion": datetime.now().isoformat()
        }
    ]
    
    for product in default_products:
        existing = await products_collection.find_one({"nombre": product["nombre"]})
        if not existing:
            await products_collection.insert_one(product)
            print(f"📦 Producto creado: {product['nombre']}")

# ==================== ENDPOINTS ====================

@app.get("/health")
async def health():
    return {
        "status": "OK", 
        "service": "products-service",
        "mongodb": "connected"
    }

# ✅ OBTENER PRODUCTOS - CON FILTRO POR VENDEDOR
@app.get("/products")
async def get_products(
    categoria: Optional[str] = None, 
    activo: Optional[bool] = True,
    vendedorId: Optional[str] = None
):
    query = {}
    if categoria:
        query["categoria"] = categoria
    if activo is not None:
        query["activo"] = activo
    if vendedorId:
        query["vendedorId"] = vendedorId
    
    products = await products_collection.find(query).to_list(length=100)
    
    for product in products:
        product["_id"] = str(product["_id"])
        if "vendedorId" in product:
            product["vendedorId"] = str(product["vendedorId"])
    
    return products

# ✅ OBTENER PRODUCTO POR ID
@app.get("/products/{product_id}")
async def get_product(product_id: str):
    try:
        product = await products_collection.find_one({"_id": ObjectId(product_id)})
        if product:
            product["_id"] = str(product["_id"])
            if "vendedorId" in product:
                product["vendedorId"] = str(product["vendedorId"])
            return product
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"ID inválido: {str(e)}")

# ✅ CREAR PRODUCTO
@app.post("/products")
async def create_product(product: ProductCreate):
    try:
        product_data = product.dict()
        product_data["activo"] = True
        product_data["fechaCreacion"] = datetime.now().isoformat()
        product_data["vendedorId"] = str(product_data["vendedorId"])
        
        result = await products_collection.insert_one(product_data)
        product_data["_id"] = str(result.inserted_id)
        
        # Publicar evento
        if rabbitmq_channel:
            await rabbitmq_channel.default_exchange.publish(
                aio_pika.Message(
                    body=json.dumps({
                        "event": "PRODUCT_CREATED",
                        "productId": str(result.inserted_id),
                        "vendedorId": str(product.vendedorId),
                        "nombre": product.nombre,
                        "precio": product.precio,
                        "timestamp": datetime.now().isoformat()
                    }).encode()
                ),
                routing_key="product_events"
            )
        
        return {"success": True, "product": product_data}
    except Exception as e:
        print(f"❌ Error creando producto: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ✅ ACTUALIZAR PRODUCTO
@app.put("/products/{product_id}")
async def update_product(product_id: str, product: ProductUpdate):
    try:
        update_data = {k: v for k, v in product.dict().items() if v is not None}
        
        if "vendedorId" in update_data:
            update_data["vendedorId"] = str(update_data["vendedorId"])
        
        if update_data:
            result = await products_collection.update_one(
                {"_id": ObjectId(product_id)},
                {"$set": update_data}
            )
            if result.modified_count > 0:
                return {"success": True, "message": "Producto actualizado"}
        
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"ID inválido: {str(e)}")

# ✅ ELIMINAR PRODUCTO
@app.delete("/products/{product_id}")
async def delete_product(product_id: str):
    try:
        result = await products_collection.delete_one({"_id": ObjectId(product_id)})
        if result.deleted_count > 0:
            return {"success": True, "message": "Producto eliminado"}
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"ID inválido: {str(e)}")

# ✅ OBTENER PRODUCTOS POR VENDEDOR
@app.get("/products/vendor/{vendor_id}")
async def get_products_by_vendor(vendor_id: str):
    try:
        products = await products_collection.find({"vendedorId": vendor_id}).to_list(length=100)
        for product in products:
            product["_id"] = str(product["_id"])
        return products
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.on_event("startup")
async def startup_event():
    await connect_rabbitmq()
    await create_default_products()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3002)