# Day 1 Quick Start Guide
## Get Your Development Environment Ready in 30 Minutes

Follow these steps to set up your environment and start building the RegScout agent.

---

## ⚡ Step 1: Initial Setup (10 minutes)

### 1.1 Create Project Structure

```bash
# Navigate to your project directory
cd /Users/aditilakshminarayanan/Downloads/HCLTechProj./RegNav.AI

# Create backend structure
mkdir -p regnav_ai/backend/{agents,api,models,services,utils,config}
mkdir -p regnav_ai/backend/agents/{regscout,regingest,ruleminer,rulesense,regvalidate}
mkdir -p regnav_ai/backend/api/routes
mkdir -p regnav_ai/backend/services
mkdir -p regnav_ai/tests/{unit,integration}
mkdir -p regnav_ai/tests/unit/agents
mkdir -p regnav_ai/scripts
mkdir -p regnav_ai/uploads

# Create __init__.py files
touch regnav_ai/__init__.py
touch regnav_ai/backend/__init__.py
touch regnav_ai/backend/agents/__init__.py
touch regnav_ai/backend/api/__init__.py
touch regnav_ai/backend/models/__init__.py
touch regnav_ai/backend/services/__init__.py
touch regnav_ai/backend/utils/__init__.py
touch regnav_ai/backend/config/__init__.py

echo "✅ Project structure created"
```

### 1.2 Create Virtual Environment

```bash
# Create and activate virtual environment
cd regnav_ai
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

echo "✅ Virtual environment activated"
```

### 1.3 Install Dependencies

Create `requirements.txt`:

```bash
cat > requirements.txt << 'EOF'
# Web Framework
fastapi==0.109.0
uvicorn[standard]==0.27.0
python-multipart==0.0.6

# Database
sqlalchemy==2.0.25
alembic==1.13.1
psycopg2-binary==2.9.9
asyncpg==0.29.0

# AI Providers
openai==1.10.0
httpx==0.26.0

# Utilities
pydantic==2.5.3
pydantic-settings==2.1.0
python-dotenv==1.0.0

# Testing
pytest==7.4.4
pytest-asyncio==0.23.3
pytest-cov==4.1.0
pytest-mock==3.12.0

# Code Quality
black==23.12.1
isort==5.13.2
ruff==0.1.11
EOF

# Install dependencies
pip install -r requirements.txt

echo "✅ Dependencies installed"
```

---

## 🗄️ Step 2: Database Setup (10 minutes)

### 2.1 Start PostgreSQL (Docker)

```bash
# Start PostgreSQL with Docker
docker run --name regnav-postgres \
  -e POSTGRES_USER=regnav_user \
  -e POSTGRES_PASSWORD=regnav_pass \
  -e POSTGRES_DB=regnav_db \
  -p 5432:5432 \
  -d postgres:15-alpine

echo "✅ PostgreSQL started"

# Verify connection
sleep 5
docker exec regnav-postgres psql -U regnav_user -d regnav_db -c "SELECT version();"
```

### 2.2 Create Environment File

```bash
cat > .env << 'EOF'
# Application
APP_NAME=RegNav.AI
APP_ENV=development
DEBUG=True
SECRET_KEY=dev-secret-key-change-in-production-min-32-chars
API_VERSION=v1

# Database
DATABASE_URL=postgresql+asyncpg://regnav_user:regnav_pass@localhost:5432/regnav_db

# AI Provider (add your key)
OPENAI_API_KEY=your-openai-key-here
DEFAULT_AI_PROVIDER=openai

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:8000

# Agent Settings
REGSCOUT_MAX_SOURCES_PER_STATE=50
REGSCOUT_AUTO_DISCOVERY=True
REGSCOUT_CONFIDENCE_THRESHOLD=0.7

# File Upload
UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE=104857600

# Logging
LOG_LEVEL=INFO
EOF

echo "✅ Environment file created"
echo "⚠️  IMPORTANT: Add your OpenAI API key to .env"
```

---

## 🏗️ Step 3: Create Core Files (5 minutes)

### 3.1 Base Model

```bash
cat > backend/models/base.py << 'EOF'
"""Base model with common fields."""
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import MetaData

# Naming convention for constraints
convention = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s"
}

metadata = MetaData(naming_convention=convention)

class Base(DeclarativeBase):
    """Base model for all database models."""
    metadata = metadata
EOF

echo "✅ Base model created"
```

### 3.2 Database Configuration

```bash
cat > backend/config/database.py << 'EOF'
"""Database connection management."""
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from contextlib import asynccontextmanager
from typing import AsyncGenerator
import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://localhost/regnav_db")

# Create async engine
engine = create_async_engine(
    DATABASE_URL,
    echo=os.getenv("DB_ECHO", "False").lower() == "true",
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20
)

# Create session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Database session dependency for FastAPI."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

async def init_db():
    """Initialize database (create tables)."""
    from backend.models.base import Base
    from backend.models import regulatory_sources  # Import all models
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    print("✅ Database initialized")
EOF

echo "✅ Database config created"
```

### 3.3 Settings

Copy the settings.py from the AI_PROMPTS_AND_CODE_TEMPLATES.md file into `backend/config/settings.py`

---

## 🤖 Step 4: Build RegScout (Core of Day 1)

### 4.1 Create RegulatorySource Model

Copy the complete `RegulatorySource` model from `AI_PROMPTS_AND_CODE_TEMPLATES.md` into:
`backend/models/regulatory_sources.py`

### 4.2 Create AI Service

```bash
cat > backend/services/ai_service.py << 'EOF'
"""AI service for LLM interactions."""
import os
from typing import Optional, Literal
import openai
import json

class AIService:
    """Wrapper for AI provider interactions."""
    
    def __init__(self, provider: str = "openai"):
        self.provider = provider
        if provider == "openai":
            self.client = openai.AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
            self.model = os.getenv("OPENAI_MODEL", "gpt-4-turbo-preview")
    
    async def generate(
        self,
        prompt: str,
        max_tokens: int = 2000,
        temperature: float = 0.7,
        response_format: Optional[Literal["json"]] = None
    ) -> str:
        """Generate text completion."""
        try:
            kwargs = {
                "model": self.model,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": max_tokens,
                "temperature": temperature,
            }
            
            if response_format == "json":
                kwargs["response_format"] = {"type": "json_object"}
                # Ensure prompt requests JSON
                if "json" not in prompt.lower():
                    kwargs["messages"][0]["content"] = f"{prompt}\n\nReturn response as valid JSON."
            
            response = await self.client.chat.completions.create(**kwargs)
            return response.choices[0].message.content
            
        except Exception as e:
            print(f"AI generation error: {e}")
            raise
EOF

echo "✅ AI service created"
```

### 4.3 Create RegScout Service

Copy the complete `RegScoutService` class from `AI_PROMPTS_AND_CODE_TEMPLATES.md` into:
`backend/agents/regscout/service.py`

### 4.4 Create RegScout API

```bash
cat > backend/api/routes/regscout.py << 'EOF'
"""RegScout API endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from pydantic import BaseModel, Field
import uuid

from backend.config.database import get_db
from backend.agents.regscout.service import RegScoutService
from backend.services.ai_service import AIService
from backend.models.regulatory_sources import RegulatorySource

router = APIRouter(prefix="/api/v1/regscout", tags=["RegScout"])

# Request/Response Models
class DiscoverRequest(BaseModel):
    state: str = Field(..., min_length=2, max_length=2, description="State code (e.g., WI)")
    lob: str = Field(..., description="Line of business")
    document_type: str = Field(..., description="Document type")
    max_results: Optional[int] = Field(10, ge=1, le=50)

class SourceResponse(BaseModel):
    id: uuid.UUID
    state_code: str
    line_of_business: str
    document_type: str
    source_url: str
    source_name: str
    confidence_score: float
    status: str
    
    class Config:
        from_attributes = True

@router.post("/discover", response_model=List[SourceResponse])
async def discover_sources(
    request: DiscoverRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Discover regulatory sources for a state/LOB.
    
    Triggers AI-powered discovery of official regulatory documents.
    """
    ai_service = AIService()
    regscout = RegScoutService(db, ai_service)
    
    try:
        sources = await regscout.discover_sources(
            state=request.state.upper(),
            lob=request.lob,
            document_type=request.document_type,
            max_results=request.max_results
        )
        return sources
    finally:
        await regscout.close()

@router.get("/sources", response_model=List[SourceResponse])
async def list_sources(
    state: Optional[str] = Query(None, min_length=2, max_length=2),
    lob: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """List discovered sources with optional filters."""
    from sqlalchemy import select
    
    query = select(RegulatorySource)
    if state:
        query = query.where(RegulatorySource.state_code == state.upper())
    if lob:
        query = query.where(RegulatorySource.line_of_business == lob)
    
    result = await db.execute(query)
    sources = result.scalars().all()
    return sources

@router.get("/sources/{source_id}", response_model=SourceResponse)
async def get_source(
    source_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get specific source by ID."""
    from sqlalchemy import select
    
    result = await db.execute(
        select(RegulatorySource).where(RegulatorySource.id == source_id)
    )
    source = result.scalar_one_or_none()
    
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    
    return source
EOF

echo "✅ RegScout API created"
```

---

## 🚀 Step 5: Create Main App & Run (5 minutes)

### 5.1 Main Application

```bash
cat > backend/main.py << 'EOF'
"""Main FastAPI application."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from backend.api.routes import regscout
from backend.config.database import init_db

app = FastAPI(
    title="RegNav.AI",
    description="AI-Powered Regulatory Compliance Navigator",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(regscout.router)

@app.on_event("startup")
async def startup_event():
    """Initialize database on startup."""
    await init_db()
    print("🚀 RegNav.AI started successfully")

@app.get("/")
async def root():
    return {"message": "RegNav.AI API", "status": "running", "version": "1.0.0"}

@app.get("/health")
async def health():
    return {"status": "healthy"}
EOF

echo "✅ Main app created"
```

### 5.2 Run the Application

```bash
# Run the server
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Your API should now be running at: **http://localhost:8000**

Open in browser:
- API Docs: http://localhost:8000/docs
- Health Check: http://localhost:8000/health

---

## 🧪 Step 6: Test RegScout (Final Step!)

### 6.1 Create Test File

```bash
cat > ../tests/unit/agents/test_regscout.py << 'EOF'
"""Tests for RegScout service."""
import pytest
from unittest.mock import AsyncMock, MagicMock
from backend.agents.regscout.service import RegScoutService
from backend.models.regulatory_sources import RegulatorySource, DocumentType

@pytest.mark.asyncio
async def test_discover_sources():
    """Test source discovery."""
    # Mock dependencies
    db_mock = AsyncMock()
    ai_mock = AsyncMock()
    ai_mock.generate = AsyncMock(return_value='[{"title": "WI WC Manual", "url": "https://oci.wi.gov/manual.pdf", "confidence_score": 0.9}]')
    
    # Create service
    service = RegScoutService(db_mock, ai_mock)
    
    # Mock validate_source
    service.validate_source = AsyncMock(return_value={"valid": True, "status_code": 200})
    
    # Test discovery
    sources = await service.discover_sources(
        state="WI",
        lob="workers_comp",
        document_type="Manual",
        max_results=5
    )
    
    assert len(sources) > 0
    assert sources[0].state_code == "WI"
    
    await service.close()

@pytest.mark.asyncio
async def test_validate_source():
    """Test source URL validation."""
    db_mock = AsyncMock()
    ai_mock = AsyncMock()
    
    service = RegScoutService(db_mock, ai_mock)
    
    result = await service.validate_source("https://oci.wi.gov/test.pdf")
    
    assert "valid" in result
    assert "status_code" in result
    
    await service.close()
EOF

echo "✅ Tests created"
```

### 6.2 Run Tests

```bash
# Run tests
pytest ../tests/unit/agents/test_regscout.py -v

echo "✅ Tests completed"
```

### 6.3 Test API with curl

```bash
# Test discovery endpoint
curl -X POST "http://localhost:8000/api/v1/regscout/discover" \
  -H "Content-Type: application/json" \
  -d '{
    "state": "WI",
    "lob": "workers_comp",
    "document_type": "Manual",
    "max_results": 5
  }'

# List sources
curl "http://localhost:8000/api/v1/regscout/sources?state=WI"
```

---

## ✅ Day 1 Complete Checklist

- [ ] Project structure created
- [ ] Virtual environment set up
- [ ] Dependencies installed
- [ ] PostgreSQL running
- [ ] Environment variables configured
- [ ] Database models created
- [ ] RegScout service implemented
- [ ] RegScout API endpoints created
- [ ] FastAPI app running
- [ ] Tests passing
- [ ] API accessible at http://localhost:8000/docs

---

## 🎯 What You've Built

After completing Day 1, you have:

✅ **Complete project foundation** with proper structure  
✅ **Database layer** with SQLAlchemy 2.0 and async support  
✅ **RegScout agent** fully operational  
✅ **AI-powered document discovery** working  
✅ **REST API** with FastAPI  
✅ **Tests** with pytest  
✅ **Production-ready architecture** for scaling  

**You're ahead of schedule!** 🚀

---

## 🐛 Troubleshooting

### PostgreSQL Connection Issues
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Restart if needed
docker restart regnav-postgres
```

### OpenAI API Errors
```bash
# Verify API key is set
echo $OPENAI_API_KEY

# Test API key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

### Import Errors
```bash
# Ensure you're in virtual environment
which python  # Should show venv path

# Reinstall dependencies
pip install -r requirements.txt
```

---

## 📚 Next Steps

Tomorrow (Day 2), you'll build:
- **RegIngest Agent**: Document parsing and embedding generation
- **Vector storage**: pgvector integration
- **Semantic search**: Find relevant regulatory content

**Get some rest! Tomorrow is going to be exciting!** 💪


