from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days

# Security
security = HTTPBearer()

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class UserRegister(BaseModel):
    username: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: User

class Category(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    color: str
    icon: str
    user_id: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class CategoryCreate(BaseModel):
    name: str
    color: str
    icon: str

class ShoppingItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    description: str
    photo_url: Optional[str] = None
    category_id: str
    is_purchased: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ShoppingItemCreate(BaseModel):
    description: str
    photo_url: Optional[str] = None
    category_id: str

class ShoppingItemUpdate(BaseModel):
    description: Optional[str] = None
    photo_url: Optional[str] = None
    category_id: Optional[str] = None

# Helper functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_jwt_token(user_id: str, username: str) -> str:
    payload = {
        'user_id': user_id,
        'username': username,
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_jwt_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    token = credentials.credentials
    payload = decode_jwt_token(token)
    user = await db.users.find_one({"id": payload['user_id']}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Usuário não encontrado")
    return user

# Initialize default categories
async def initialize_default_categories():
    default_categories = [
        {"id": "cat-1", "name": "Frutas", "color": "#10b981", "icon": "apple", "user_id": None},
        {"id": "cat-2", "name": "Carnes", "color": "#ef4444", "icon": "beef", "user_id": None},
        {"id": "cat-3", "name": "Limpeza", "color": "#3b82f6", "icon": "sparkles", "user_id": None},
        {"id": "cat-4", "name": "Laticínios", "color": "#f59e0b", "icon": "milk", "user_id": None},
        {"id": "cat-5", "name": "Padaria", "color": "#8b5cf6", "icon": "wheat", "user_id": None},
        {"id": "cat-6", "name": "Bebidas", "color": "#06b6d4", "icon": "cup-soda", "user_id": None},
        {"id": "cat-7", "name": "Congelados", "color": "#6366f1", "icon": "snowflake", "user_id": None},
        {"id": "cat-8", "name": "Outros", "color": "#64748b", "icon": "package", "user_id": None}
    ]
    
    for cat in default_categories:
        existing = await db.categories.find_one({"id": cat["id"]})
        if not existing:
            cat['created_at'] = datetime.now(timezone.utc).isoformat()
            await db.categories.insert_one(cat)

# Auth routes
@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserRegister):
    # Check if user exists
    existing_user = await db.users.find_one({"username": user_data.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Usuário já existe")
    
    # Create user
    user = User(username=user_data.username)
    user_dict = user.model_dump()
    user_dict['password_hash'] = hash_password(user_data.password)
    
    await db.users.insert_one(user_dict)
    
    # Create token
    token = create_jwt_token(user.id, user.username)
    
    return TokenResponse(access_token=token, user=user)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    # Find user
    user = await db.users.find_one({"username": credentials.username})
    if not user:
        raise HTTPException(status_code=401, detail="Usuário ou senha incorretos")
    
    # Verify password
    if not verify_password(credentials.password, user['password_hash']):
        raise HTTPException(status_code=401, detail="Usuário ou senha incorretos")
    
    # Create token
    token = create_jwt_token(user['id'], user['username'])
    user_obj = User(**user)
    
    return TokenResponse(access_token=token, user=user_obj)

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: dict = Depends(get_current_user)):
    return User(**current_user)

# Categories routes
@api_router.get("/categories", response_model=List[Category])
async def get_categories(current_user: dict = Depends(get_current_user)):
    categories = await db.categories.find(
        {"$or": [{"user_id": None}, {"user_id": current_user['id']}]},
        {"_id": 0}
    ).to_list(1000)
    return categories

@api_router.post("/categories", response_model=Category)
async def create_category(category_data: CategoryCreate, current_user: dict = Depends(get_current_user)):
    category = Category(**category_data.model_dump(), user_id=current_user['id'])
    await db.categories.insert_one(category.model_dump())
    return category

# Shopping items routes
@api_router.get("/items", response_model=List[ShoppingItem])
async def get_items(current_user: dict = Depends(get_current_user)):
    items = await db.shopping_items.find(
        {"user_id": current_user['id']},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    return items

@api_router.post("/items", response_model=ShoppingItem)
async def create_item(item_data: ShoppingItemCreate, current_user: dict = Depends(get_current_user)):
    item = ShoppingItem(**item_data.model_dump(), user_id=current_user['id'])
    await db.shopping_items.insert_one(item.model_dump())
    return item

@api_router.put("/items/{item_id}", response_model=ShoppingItem)
async def update_item(item_id: str, item_data: ShoppingItemUpdate, current_user: dict = Depends(get_current_user)):
    # Find item
    item = await db.shopping_items.find_one({"id": item_id, "user_id": current_user['id']})
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    
    # Update fields
    update_data = {k: v for k, v in item_data.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.shopping_items.update_one(
        {"id": item_id},
        {"$set": update_data}
    )
    
    updated_item = await db.shopping_items.find_one({"id": item_id}, {"_id": 0})
    return ShoppingItem(**updated_item)

@api_router.patch("/items/{item_id}/toggle", response_model=ShoppingItem)
async def toggle_item(item_id: str, current_user: dict = Depends(get_current_user)):
    item = await db.shopping_items.find_one({"id": item_id, "user_id": current_user['id']})
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    
    new_status = not item.get('is_purchased', False)
    
    await db.shopping_items.update_one(
        {"id": item_id},
        {"$set": {"is_purchased": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    updated_item = await db.shopping_items.find_one({"id": item_id}, {"_id": 0})
    return ShoppingItem(**updated_item)

@api_router.delete("/items/{item_id}")
async def delete_item(item_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.shopping_items.delete_one({"id": item_id, "user_id": current_user['id']})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    return {"message": "Item deletado com sucesso"}

# Upload route
@api_router.post("/upload")
async def upload_image(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    # Read file content
    contents = await file.read()
    
    # Convert to base64
    base64_image = base64.b64encode(contents).decode('utf-8')
    mime_type = file.content_type or 'image/jpeg'
    
    # Return data URL
    data_url = f"data:{mime_type};base64,{base64_image}"
    
    return {"url": data_url}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    await initialize_default_categories()
    logger.info("Application started successfully")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()