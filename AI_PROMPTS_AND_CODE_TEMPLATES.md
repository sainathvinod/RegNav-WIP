# RegNav.AI: AI Prompts & Code Templates
## Accelerate Development with Pre-Built Prompts

This document contains **copy-paste ready AI prompts** and **starter code templates** for each day of the 10-day development plan.

---

## 📋 How to Use This Document

1. **Copy the prompt** for the task you're working on
2. **Paste into Claude/GPT-4** (or your AI assistant)
3. **Review and customize** the generated code
4. **Test and integrate** into your project
5. **Iterate** as needed

---

## DAY 1: Foundation + RegScout Agent

### 1.1 Project Structure Setup

**AI Prompt**:
```
Create a comprehensive project structure for a multi-agent AI regulatory compliance platform called RegNav.AI.

Requirements:
- Backend: Python with FastAPI
- Frontend: React with TypeScript
- 5 AI agents: RegScout, RegIngest, RuleMiner, RuleSense, RegValidate
- Each agent should be a separate module
- Include folders for: models, services, utils, config, tests, docs
- Follow Python package best practices
- Include __init__.py files where needed

Generate:
1. Complete directory tree (use tree format)
2. Contents for each __init__.py
3. .gitignore file
4. README.md structure
```

**Starter Code: requirements.txt**:
```txt
# RegNav.AI Backend Dependencies
# Generated: 2024

# Web Framework
fastapi==0.109.0
uvicorn[standard]==0.27.0
python-multipart==0.0.6

# Database
sqlalchemy==2.0.25
alembic==1.13.1
psycopg2-binary==2.9.9
pgvector==0.2.4

# AI & ML
openai==1.10.0
anthropic==0.8.1
google-generativeai==0.3.2
tiktoken==0.5.2

# Document Processing
PyPDF2==3.0.1
pdfplumber==0.10.3
python-docx==1.1.0
beautifulsoup4==4.12.3
lxml==5.1.0
openpyxl==3.1.2
pytesseract==0.3.10  # Optional: OCR for scanned PDFs

# HTTP & Async
httpx==0.26.0
aiohttp==3.9.1
aiofiles==23.2.1

# Task Queue
arq==0.25.0
redis==5.0.1

# Authentication & Security
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-dotenv==1.0.0

# Data Validation
pydantic==2.5.3
pydantic-settings==2.1.0
email-validator==2.1.0

# Utilities
python-dateutil==2.8.2
pytz==2024.1
requests==2.31.0

# Testing
pytest==7.4.4
pytest-asyncio==0.23.3
pytest-cov==4.1.0
pytest-mock==3.12.0
httpx-mock==0.16.0
faker==22.1.0

# Code Quality
black==23.12.1
isort==5.13.2
ruff==0.1.11
mypy==1.8.0

# Monitoring & Logging
sentry-sdk==1.40.0
python-json-logger==2.0.7

# CLI
typer==0.9.0
rich==13.7.0
```

---

### 1.2 Database Schema - RegulatorySource Model

**AI Prompt**:
```
Create a comprehensive SQLAlchemy 2.0 model for RegulatorySource with these requirements:

Entity: RegulatorySource
Purpose: Store regulatory document sources discovered by RegScout agent

Fields:
- id: UUID primary key
- state_code: 2-character state code (e.g., "WI", "MI"), indexed
- line_of_business: String (e.g., "workers_comp", "general_liability"), indexed
- document_type: Enum ("Manual", "Statute", "Bulletin", "Form", "Rate_Table")
- source_url: Text, not null
- source_name: String(255), the official document name
- effective_date: Date, nullable
- expiration_date: Date, nullable
- metadata: JSONB for flexible storage
- discovery_method: Enum ("ai_discovered", "user_provided", "scraped", "baseline")
- status: Enum ("active", "archived", "pending_review", "invalid")
- confidence_score: Float (0.0-1.0) for AI-discovered sources
- created_at: Timestamp with timezone
- updated_at: Timestamp with timezone
- created_by: String(255), nullable

Requirements:
- Use SQLAlchemy 2.0 syntax with Mapped types
- Include proper indexes for performance
- Add unique constraint on (state_code, lob, document_type, source_url)
- Include relationships to Document model (one-to-many)
- Add comprehensive docstrings
- Include __repr__ method
- Add custom query methods

Generate complete model class with:
1. All field definitions
2. Indexes and constraints
3. Relationships
4. Methods (to_dict, validate, etc.)
5. Type hints throughout
```

**Starter Code Template**:
```python
# backend/models/regulatory_sources.py
from typing import Optional, List
from datetime import datetime, date
from sqlalchemy import (
    String, Text, Float, DateTime, Date, Enum as SQLEnum, 
    ForeignKey, Index, UniqueConstraint, func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid
import enum

from backend.models.base import Base

class DocumentType(str, enum.Enum):
    MANUAL = "Manual"
    STATUTE = "Statute"
    BULLETIN = "Bulletin"
    FORM = "Form"
    RATE_TABLE = "Rate_Table"

class DiscoveryMethod(str, enum.Enum):
    AI_DISCOVERED = "ai_discovered"
    USER_PROVIDED = "user_provided"
    SCRAPED = "scraped"
    BASELINE = "baseline"

class SourceStatus(str, enum.Enum):
    ACTIVE = "active"
    ARCHIVED = "archived"
    PENDING_REVIEW = "pending_review"
    INVALID = "invalid"

class RegulatorySource(Base):
    """
    Regulatory document source discovered by RegScout.
    
    Stores metadata about official regulatory documents including
    URLs, effective dates, and discovery information.
    """
    __tablename__ = "regulatory_sources"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4
    )
    state_code: Mapped[str] = mapped_column(
        String(2), 
        nullable=False, 
        index=True,
        comment="Two-letter state code (e.g., WI, MI)"
    )
    line_of_business: Mapped[str] = mapped_column(
        String(32), 
        nullable=False, 
        index=True,
        comment="Line of business (e.g., workers_comp)"
    )
    document_type: Mapped[DocumentType] = mapped_column(
        SQLEnum(DocumentType), 
        nullable=False,
        comment="Type of regulatory document"
    )
    source_url: Mapped[str] = mapped_column(
        Text, 
        nullable=False,
        comment="URL to the regulatory document"
    )
    source_name: Mapped[str] = mapped_column(
        String(255), 
        nullable=False,
        comment="Official name of the document"
    )
    effective_date: Mapped[Optional[date]] = mapped_column(
        Date, 
        nullable=True,
        comment="Date when regulations became effective"
    )
    expiration_date: Mapped[Optional[date]] = mapped_column(
        Date, 
        nullable=True,
        comment="Date when regulations expire (if applicable)"
    )
    metadata: Mapped[Optional[dict]] = mapped_column(
        JSONB, 
        nullable=True,
        comment="Additional metadata in JSON format"
    )
    discovery_method: Mapped[DiscoveryMethod] = mapped_column(
        SQLEnum(DiscoveryMethod), 
        nullable=False,
        default=DiscoveryMethod.AI_DISCOVERED
    )
    status: Mapped[SourceStatus] = mapped_column(
        SQLEnum(SourceStatus), 
        nullable=False, 
        default=SourceStatus.ACTIVE,
        index=True
    )
    confidence_score: Mapped[float] = mapped_column(
        Float, 
        nullable=False, 
        default=0.0,
        comment="Confidence score for AI-discovered sources (0.0-1.0)"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(),
        nullable=False
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), 
        onupdate=func.now(),
        nullable=True
    )
    created_by: Mapped[Optional[str]] = mapped_column(
        String(255), 
        nullable=True,
        comment="User who added this source"
    )

    # Relationships
    documents: Mapped[List["Document"]] = relationship(
        "Document",
        back_populates="source",
        cascade="all, delete-orphan",
        lazy="select"
    )

    # Indexes and Constraints
    __table_args__ = (
        UniqueConstraint(
            'state_code', 'line_of_business', 'document_type', 'source_url',
            name='uq_regulatory_source'
        ),
        Index(
            'ix_regulatory_sources_lookup',
            'state_code', 'line_of_business', 'document_type'
        ),
        Index(
            'ix_regulatory_sources_status_score',
            'status', 'confidence_score'
        ),
    )

    def __repr__(self) -> str:
        return (
            f"<RegulatorySource(id={self.id}, "
            f"state={self.state_code}, lob={self.line_of_business}, "
            f"type={self.document_type}, status={self.status})>"
        )

    def to_dict(self) -> dict:
        """Convert model to dictionary."""
        return {
            "id": str(self.id),
            "state_code": self.state_code,
            "line_of_business": self.line_of_business,
            "document_type": self.document_type.value,
            "source_url": self.source_url,
            "source_name": self.source_name,
            "effective_date": self.effective_date.isoformat() if self.effective_date else None,
            "expiration_date": self.expiration_date.isoformat() if self.expiration_date else None,
            "metadata": self.metadata,
            "discovery_method": self.discovery_method.value,
            "status": self.status.value,
            "confidence_score": self.confidence_score,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "created_by": self.created_by
        }

    def is_valid(self) -> bool:
        """Check if source is currently valid."""
        if self.status != SourceStatus.ACTIVE:
            return False
        if self.expiration_date and self.expiration_date < date.today():
            return False
        return True

    def validate_url(self) -> bool:
        """Validate that URL is properly formatted."""
        import re
        url_pattern = r'^https?://'
        return bool(re.match(url_pattern, self.source_url))
```

---

### 1.3 Configuration Management

**AI Prompt**:
```
Create a Pydantic settings management system for RegNav.AI with:

Environment Variables Needed:
- DATABASE_URL: PostgreSQL connection string
- REDIS_URL: Redis connection for caching/queue
- OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_API_KEY: AI provider keys
- SECRET_KEY: For JWT token generation
- APP_ENV: development/staging/production
- DEBUG: Boolean for debug mode
- CORS_ORIGINS: Comma-separated allowed origins
- SENTRY_DSN: Error tracking
- LOG_LEVEL: INFO/DEBUG/WARNING/ERROR

Requirements:
1. Use pydantic-settings for type-safe configuration
2. Support .env file loading
3. Provide sensible defaults for development
4. Validate required fields based on environment
5. Include AI provider-specific settings (model, temperature, max_tokens)
6. Support multiple AI providers with fallback logic
7. Include database connection pooling settings
8. Add logging configuration

Generate:
1. settings.py with complete Settings class
2. .env.example file
3. Validation logic for production requirements
```

**Starter Code: settings.py**:
```python
# backend/config/settings.py
from typing import Optional, List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator, PostgresDsn
import os

class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    model_config = SettingsConfigDict(
        env_file='.env',
        env_file_encoding='utf-8',
        case_sensitive=False,
        extra='ignore'
    )
    
    # Application
    APP_NAME: str = "RegNav.AI"
    APP_ENV: str = Field(default="development", pattern="^(development|staging|production)$")
    DEBUG: bool = Field(default=False)
    SECRET_KEY: str = Field(..., min_length=32)
    API_VERSION: str = "v1"
    
    # Database
    DATABASE_URL: PostgresDsn = Field(..., description="PostgreSQL connection string")
    DB_POOL_SIZE: int = Field(default=10, ge=1, le=50)
    DB_MAX_OVERFLOW: int = Field(default=20, ge=0, le=100)
    DB_ECHO: bool = Field(default=False)
    
    # Redis
    REDIS_URL: str = Field(default="redis://localhost:6379/0")
    REDIS_MAX_CONNECTIONS: int = Field(default=50)
    
    # AI Providers
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4-turbo-preview"
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"
    OPENAI_MAX_TOKENS: int = Field(default=4000, ge=100, le=128000)
    OPENAI_TEMPERATURE: float = Field(default=0.7, ge=0.0, le=2.0)
    
    ANTHROPIC_API_KEY: Optional[str] = None
    ANTHROPIC_MODEL: str = "claude-3-sonnet-20240229"
    
    GOOGLE_API_KEY: Optional[str] = None
    GOOGLE_MODEL: str = "gemini-pro"
    
    # Default AI Provider
    DEFAULT_AI_PROVIDER: str = Field(
        default="openai",
        pattern="^(openai|anthropic|google|local|mock)$"
    )
    
    # CORS
    CORS_ORIGINS: List[str] = Field(
        default=["http://localhost:3000", "http://localhost:8000"]
    )
    CORS_ALLOW_CREDENTIALS: bool = True
    
    # Security
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30, ge=5, le=1440)
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=7, ge=1, le=30)
    
    # File Upload
    UPLOAD_DIR: str = Field(default="./uploads")
    MAX_UPLOAD_SIZE: int = Field(default=100 * 1024 * 1024)  # 100MB
    ALLOWED_EXTENSIONS: List[str] = Field(
        default=["pdf", "docx", "txt", "html", "xlsx", "wcpols"]
    )
    
    # RegScout Settings
    REGSCOUT_MAX_SOURCES_PER_STATE: int = Field(default=50, ge=1, le=200)
    REGSCOUT_AUTO_DISCOVERY: bool = True
    REGSCOUT_CONFIDENCE_THRESHOLD: float = Field(default=0.7, ge=0.0, le=1.0)
    
    # RegIngest Settings
    REGINGEST_CHUNK_SIZE: int = Field(default=1000, ge=100, le=5000)
    REGINGEST_CHUNK_OVERLAP: int = Field(default=200, ge=0, le=1000)
    REGINGEST_BATCH_SIZE: int = Field(default=10, ge=1, le=100)
    
    # RuleMiner Settings
    RULEMINER_MAX_RULES_PER_DOCUMENT: int = Field(default=100, ge=1, le=500)
    RULEMINER_AUTO_APPROVE: bool = False
    
    # Monitoring
    SENTRY_DSN: Optional[str] = None
    LOG_LEVEL: str = Field(default="INFO", pattern="^(DEBUG|INFO|WARNING|ERROR|CRITICAL)$")
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = Field(default=60, ge=1, le=1000)
    
    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v
    
    @field_validator("DATABASE_URL", mode="after")
    @classmethod
    def validate_database_url(cls, v):
        if not str(v).startswith("postgresql"):
            raise ValueError("DATABASE_URL must be a PostgreSQL connection string")
        return v
    
    def is_production(self) -> bool:
        return self.APP_ENV == "production"
    
    def is_development(self) -> bool:
        return self.APP_ENV == "development"
    
    def get_cors_origins(self) -> List[str]:
        if self.is_production():
            return [origin for origin in self.CORS_ORIGINS if not origin.startswith("http://localhost")]
        return self.CORS_ORIGINS

# Global settings instance
settings = Settings()
```

**.env.example**:
```bash
# RegNav.AI Environment Configuration

# Application
APP_NAME=RegNav.AI
APP_ENV=development
DEBUG=True
SECRET_KEY=your-secret-key-min-32-characters-long-change-this-in-production
API_VERSION=v1

# Database (PostgreSQL)
DATABASE_URL=postgresql://regnav_user:password@localhost:5432/regnav_db
DB_POOL_SIZE=10
DB_MAX_OVERFLOW=20
DB_ECHO=False

# Redis
REDIS_URL=redis://localhost:6379/0
REDIS_MAX_CONNECTIONS=50

# AI Providers (add your API keys)
OPENAI_API_KEY=sk-your-openai-key-here
OPENAI_MODEL=gpt-4-turbo-preview
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_MAX_TOKENS=4000
OPENAI_TEMPERATURE=0.7

ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here
ANTHROPIC_MODEL=claude-3-sonnet-20240229

GOOGLE_API_KEY=your-google-ai-key-here
GOOGLE_MODEL=gemini-pro

DEFAULT_AI_PROVIDER=openai

# CORS (comma-separated)
CORS_ORIGINS=http://localhost:3000,http://localhost:8000
CORS_ALLOW_CREDENTIALS=True

# Security
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# File Upload
UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE=104857600
ALLOWED_EXTENSIONS=pdf,docx,txt,html,xlsx,wcpols

# Agent Configuration
REGSCOUT_MAX_SOURCES_PER_STATE=50
REGSCOUT_AUTO_DISCOVERY=True
REGSCOUT_CONFIDENCE_THRESHOLD=0.7

REGINGEST_CHUNK_SIZE=1000
REGINGEST_CHUNK_OVERLAP=200
REGINGEST_BATCH_SIZE=10

RULEMINER_MAX_RULES_PER_DOCUMENT=100
RULEMINER_AUTO_APPROVE=False

# Monitoring
SENTRY_DSN=
LOG_LEVEL=INFO

# Rate Limiting
RATE_LIMIT_PER_MINUTE=60
```

---

### 1.4 RegScout Service Implementation

**AI Prompt for Core Service**:
```
Create the core RegScout service class for AI-powered regulatory document discovery.

Requirements:
1. Class: RegScoutService with async methods
2. Dependencies: database session, AI service, HTTP client
3. Methods needed:
   - discover_sources(state, lob, document_type) -> List[RegulatorySource]
   - validate_source(url) -> dict (check if URL is accessible)
   - extract_metadata(url) -> dict (scrape page for metadata)
   - search_regulatory_website(base_url, search_term) -> List[dict]
   
4. Use OpenAI API to:
   - Generate smart search queries based on state/LOB
   - Parse search results and extract structured data
   - Validate relevance of found documents
   
5. Include:
   - Proper error handling with custom exceptions
   - Logging for debugging
   - Rate limiting for external API calls
   - Caching for repeated searches (use Redis)
   - Confidence scoring for AI-discovered sources
   - Retry logic for failed HTTP requests
   
6. Return RegulatorySource objects, not dicts

Generate complete service class with:
- Constructor with dependency injection
- All public methods with docstrings
- Private helper methods
- Error handling
- Type hints throughout
- Example usage in docstring
```

**Starter Template**:
```python
# backend/agents/regscout/service.py
from typing import List, Dict, Optional, Tuple
import asyncio
import httpx
import logging
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import json
import re

from backend.models.regulatory_sources import (
    RegulatorySource, 
    DocumentType, 
    DiscoveryMethod,
    SourceStatus
)
from backend.services.ai_service import AIService
from backend.services.cache_service import CacheService
from backend.config.settings import settings

logger = logging.getLogger(__name__)

class RegScoutException(Exception):
    """Base exception for RegScout errors."""
    pass

class RegScoutService:
    """
    RegScout Agent: AI-powered regulatory document discovery.
    
    Discovers official regulatory documents from state insurance departments,
    validates URLs, and extracts metadata.
    
    Example:
        ```python
        async with get_db_session() as db:
            regscout = RegScoutService(db, ai_service, cache_service)
            sources = await regscout.discover_sources(
                state="WI",
                lob="workers_comp",
                document_type="Manual"
            )
            print(f"Found {len(sources)} sources")
        ```
    """
    
    # Known regulatory domains (for validation)
    REGULATORY_DOMAINS = [
        "oci.wi.gov",
        "michigan.gov",
        "insurance.ca.gov",
        "tdi.texas.gov",
        ".gov",  # General government domain
    ]
    
    # Search query templates
    SEARCH_TEMPLATES = {
        "workers_comp": [
            "{state} workers compensation insurance manual",
            "{state} workers comp filing requirements",
            "{state} WCIO reporting format",
            "{state} loss cost multiplier workers compensation"
        ],
        "general_liability": [
            "{state} general liability insurance requirements",
            "{state} GL policy filing requirements"
        ]
    }
    
    def __init__(
        self,
        db: AsyncSession,
        ai_service: AIService,
        cache_service: Optional[CacheService] = None
    ):
        """
        Initialize RegScout service.
        
        Args:
            db: Database session
            ai_service: AI service for LLM calls
            cache_service: Optional cache for search results
        """
        self.db = db
        self.ai = ai_service
        self.cache = cache_service
        self.client = httpx.AsyncClient(
            timeout=30.0,
            follow_redirects=True,
            headers={"User-Agent": "RegNavAI/1.0 (Compliance Bot)"}
        )
        
    async def discover_sources(
        self,
        state: str,
        lob: str,
        document_type: str,
        max_results: int = None
    ) -> List[RegulatorySource]:
        """
        Discover regulatory sources for a specific state/LOB combination.
        
        Args:
            state: Two-letter state code (e.g., "WI")
            lob: Line of business (e.g., "workers_comp")
            document_type: Type of document (e.g., "Manual")
            max_results: Maximum number of sources to return
            
        Returns:
            List of RegulatorySource objects
            
        Raises:
            RegScoutException: If discovery fails
        """
        try:
            max_results = max_results or settings.REGSCOUT_MAX_SOURCES_PER_STATE
            
            logger.info(f"Starting discovery: state={state}, lob={lob}, type={document_type}")
            
            # Check cache first
            cache_key = f"regscout:{state}:{lob}:{document_type}"
            if self.cache:
                cached = await self.cache.get(cache_key)
                if cached:
                    logger.info("Returning cached results")
                    return cached
            
            # Generate search queries using AI
            queries = await self._generate_search_queries(state, lob, document_type)
            logger.debug(f"Generated {len(queries)} search queries")
            
            # Execute searches concurrently
            search_results = await asyncio.gather(*[
                self._search_with_ai(query, state, lob, document_type)
                for query in queries
            ], return_exceptions=True)
            
            # Flatten and deduplicate results
            all_results = []
            for result in search_results:
                if isinstance(result, Exception):
                    logger.error(f"Search failed: {result}")
                    continue
                all_results.extend(result)
            
            # Deduplicate by URL
            seen_urls = set()
            unique_results = []
            for result in all_results:
                if result["url"] not in seen_urls:
                    seen_urls.add(result["url"])
                    unique_results.append(result)
            
            logger.info(f"Found {len(unique_results)} unique sources")
            
            # Validate sources concurrently
            validation_tasks = [
                self.validate_source(result["url"])
                for result in unique_results
            ]
            validations = await asyncio.gather(*validation_tasks, return_exceptions=True)
            
            # Filter valid sources and create RegulatorySource objects
            sources = []
            for result, validation in zip(unique_results, validations):
                if isinstance(validation, Exception) or not validation.get("valid"):
                    logger.warning(f"Invalid source: {result['url']}")
                    continue
                
                # Apply confidence threshold
                if result.get("confidence_score", 0) < settings.REGSCOUT_CONFIDENCE_THRESHOLD:
                    logger.debug(f"Low confidence source: {result['url']}")
                    continue
                
                source = RegulatorySource(
                    state_code=state,
                    line_of_business=lob,
                    document_type=DocumentType(document_type),
                    source_url=result["url"],
                    source_name=result.get("title", "Unknown Document"),
                    effective_date=result.get("effective_date"),
                    metadata={
                        "description": result.get("description"),
                        "agency": result.get("agency"),
                        "validation": validation
                    },
                    discovery_method=DiscoveryMethod.AI_DISCOVERED,
                    status=SourceStatus.ACTIVE,
                    confidence_score=result.get("confidence_score", 0.8)
                )
                
                self.db.add(source)
                sources.append(source)
                
                if len(sources) >= max_results:
                    break
            
            # Commit to database
            await self.db.commit()
            
            # Refresh sources to get IDs
            for source in sources:
                await self.db.refresh(source)
            
            # Cache results
            if self.cache and sources:
                await self.cache.set(cache_key, sources, expire=timedelta(hours=24))
            
            logger.info(f"Successfully discovered {len(sources)} sources")
            return sources
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Discovery failed: {e}", exc_info=True)
            raise RegScoutException(f"Failed to discover sources: {e}") from e
    
    async def _generate_search_queries(
        self,
        state: str,
        lob: str,
        document_type: str
    ) -> List[str]:
        """
        Generate optimized search queries using AI.
        
        Args:
            state: State code
            lob: Line of business
            document_type: Document type
            
        Returns:
            List of search queries
        """
        # Start with template-based queries
        template_queries = self.SEARCH_TEMPLATES.get(lob, [])
        queries = [q.format(state=state) for q in template_queries]
        
        # Generate additional AI-powered queries
        prompt = f"""
Generate 3 specific search queries to find official regulatory documents for:
- State: {state}
- Line of Business: {lob}
- Document Type: {document_type}

Requirements:
- Focus on official government websites (.gov domains)
- Include specific terms like "filing requirements", "bureau", "manual", "rates"
- Target state insurance departments and regulatory agencies
- Be specific to {state} state

Return ONLY a JSON array of query strings:
["query1", "query2", "query3"]
"""
        
        try:
            response = await self.ai.generate(
                prompt=prompt,
                max_tokens=500,
                temperature=0.7,
                response_format="json"
            )
            
            ai_queries = json.loads(response)
            if isinstance(ai_queries, list):
                queries.extend(ai_queries)
                
        except Exception as e:
            logger.warning(f"AI query generation failed: {e}")
        
        return queries[:5]  # Limit to 5 total queries
    
    async def _search_with_ai(
        self,
        query: str,
        state: str,
        lob: str,
        document_type: str
    ) -> List[Dict]:
        """
        Execute search and parse results with AI.
        
        Args:
            query: Search query
            state: State code
            lob: Line of business
            document_type: Document type
            
        Returns:
            List of discovered sources with metadata
        """
        prompt = f"""
You are a regulatory document search assistant. Find official regulatory documents for this query:

Query: "{query}"
State: {state}
Line of Business: {lob}
Document Type: {document_type}

Search the web and return official government sources (preferably .gov domains) for regulatory documents.

Return JSON array with up to 3 results:
[
  {{
    "title": "Document title",
    "url": "https://...",
    "description": "Brief description",
    "agency": "Regulatory agency name",
    "confidence_score": 0.95,
    "reasoning": "Why this is relevant"
  }}
]

IMPORTANT:
- Only include OFFICIAL government sources
- Verify URLs are likely valid (end in .pdf, .html, or look official)
- confidence_score should reflect relevance (0.0-1.0)
- Only include documents specific to {state} state
"""
        
        try:
            response = await self.ai.generate(
                prompt=prompt,
                max_tokens=2000,
                temperature=0.5,
                response_format="json"
            )
            
            results = json.loads(response)
            if not isinstance(results, list):
                return []
            
            # Filter for government domains
            gov_results = [
                r for r in results
                if any(domain in r.get("url", "") for domain in self.REGULATORY_DOMAINS)
            ]
            
            return gov_results
            
        except Exception as e:
            logger.error(f"AI search failed for query '{query}': {e}")
            return []
    
    async def validate_source(self, url: str) -> Dict[str, any]:
        """
        Validate that URL is accessible and relevant.
        
        Args:
            url: URL to validate
            
        Returns:
            Validation result dict with 'valid', 'status_code', etc.
        """
        try:
            response = await self.client.head(url, timeout=10.0)
            
            is_valid = (
                response.status_code == 200 and
                any(domain in url for domain in self.REGULATORY_DOMAINS)
            )
            
            return {
                "valid": is_valid,
                "status_code": response.status_code,
                "content_type": response.headers.get("content-type"),
                "final_url": str(response.url),
                "is_government": any(domain in url for domain in self.REGULATORY_DOMAINS)
            }
            
        except httpx.TimeoutException:
            return {"valid": False, "error": "timeout"}
        except httpx.HTTPError as e:
            return {"valid": False, "error": str(e)}
        except Exception as e:
            logger.error(f"Validation failed for {url}: {e}")
            return {"valid": False, "error": str(e)}
    
    async def close(self):
        """Close HTTP client."""
        await self.client.aclose()
```

---

## DAY 2-5: Additional Prompts

*(Continue with similar detailed prompts for each day's tasks...)*

For brevity, I'm including key prompts for critical components:

---

### RegIngest: Document Parser (Day 2)

**AI Prompt**:
```
Create a comprehensive document parser for RegIngest agent that handles PDF, DOCX, and HTML files.

Requirements:
1. Class: DocumentParser with async methods
2. Support formats: PDF (text and tables), DOCX, HTML, plain text
3. Methods:
   - parse_pdf(file_path) -> ParsedDocument
   - parse_docx(file_path) -> ParsedDocument
   - parse_html(file_path) -> ParsedDocument
   - extract_tables(file_path) -> List[Table]
   - chunk_content(text, chunk_size=1000, overlap=200) -> List[str]

4. Handle:
   - Multi-column layouts (common in regulatory manuals)
   - Complex tables (rate tables, classification codes)
   - Headers, footers, page numbers
   - Preserve structure (sections, lists)
   
5. Return ParsedDocument dataclass with:
   - raw_text: str
   - structured_content: dict (sections, paragraphs, lists)
   - tables: List[dict]
   - metadata: dict (title, author, dates)
   - chunks: List[str] (for embeddings)

6. Include robust error handling for corrupted files
7. Add progress callbacks for large files

Generate complete implementation with type hints and docstrings.
```

---

### RuleMiner: Rule Extraction (Day 3)

**AI Prompt**:
```
Create an AI-powered rule extraction system for RuleMiner agent.

Context: Extract structured compliance rules from regulatory documents (PDFs, manuals).

Example Input Text:
"Section 3.4.2: Expense Constant
The expense constant for Wisconsin workers' compensation policies effective January 1, 2024 shall be $220.00 per policy. This amount must be reported in positions 118-127 of Record Type 04 in the WCPOLS file format."

Expected Output:
{
  "rule_id": "WI-WC-R006",
  "rule_title": "Expense Constant Value and Position",
  "description": "Wisconsin WC expense constant must be $220 in positions 118-127 of Record 04",
  "validation_type": "value_and_format",
  "validation_criteria": {
    "record_type": "04",
    "field_positions": "118-127",
    "expected_value": 220.00,
    "data_type": "decimal"
  },
  "severity": "CRITICAL",
  "corrective_action": "Update system configuration to set expense constant to $220.00",
  "references": ["Section 3.4.2 WI WC Manual"],
  "confidence_score": 0.95
}

Requirements:
1. Use OpenAI structured outputs or function calling
2. Extract: rule ID, title, description, validation logic, severity, corrective actions
3. Generate executable Python validation code
4. Handle various rule types: format, value_range, required_field, calculation, conditional
5. Include confidence scoring
6. Batch processing for efficiency

Generate:
1. RuleMiner class with extract_rules() method
2. Prompt templates for different rule types
3. Validation code generator
4. Rule repository integration
```

---

### RuleSense: Natural Language Query (Day 4)

**AI Prompt**:
```
Create a natural language query engine for RuleSense agent.

Requirements:
1. Process queries like:
   - "What are the expense constant rules for Wisconsin?"
   - "Show me all CRITICAL violations in my last validation"
   - "How do I fix error R006?"
   - "Compare workers comp rules between WI and MI"

2. Capabilities:
   - Intent classification (search, explain, compare, fix, analyze)
   - Entity extraction (states, LOBs, rule IDs, dates, severities)
   - Context retrieval from vector database
   - Natural language response generation
   - Include structured data (rules, charts, examples)

3. Implementation:
   - Use LLM for intent classification and entity extraction
   - Vector search for relevant context
   - Generate conversational responses
   - Include citations and references
   - Support follow-up questions (maintain conversation context)

4. Response Format:
   {
     "query": "original query",
     "intent": "search_rules",
     "entities": {...},
     "answer": "natural language response",
     "structured_data": [...],
     "related_queries": [...],
     "confidence": 0.95
   }

Generate:
1. QueryEngine class
2. Intent classification prompt
3. Response generation prompt
4. Example usage
```

---

## 🔧 Utility Prompts

### Generate API Endpoint

**Template**:
```
Create a FastAPI endpoint for [action]:

Route: [METHOD] /api/v1/[path]
Purpose: [description]

Request:
- Path params: [list]
- Query params: [list]
- Body: [Pydantic model with fields]

Response:
- Success (200/201): [Pydantic model]
- Errors: 400 (validation), 404 (not found), 422 (invalid), 500 (server)

Requirements:
- Async endpoint
- Database session dependency
- Input validation with Pydantic
- Proper error handling
- OpenAPI documentation with examples
- Logging for debugging
- Rate limiting decorator

Generate complete endpoint with:
1. Route function
2. Request/response models
3. OpenAPI metadata
4. Error handling
5. Example request/response in docstring
```

### Generate Tests

**Template**:
```
Create comprehensive pytest tests for [component]:

Component: [description]
File: tests/unit/[path]/test_[name].py

Test Scenarios:
1. Happy path: [description]
2. Error case: [description]
3. Edge case: [description]
4. [Add more scenarios]

Requirements:
- Use pytest fixtures for: database, mocks, sample data
- Async test functions (pytest-asyncio)
- Mock external dependencies: [list APIs, services]
- Parametrized tests for multiple inputs
- Aim for 95%+ code coverage
- Clear test names (test_should_[expected]_when_[condition])

Generate:
1. Fixtures in conftest.py
2. Test functions
3. Mocks and stubs
4. Sample data factories
```

---

## 📊 Progress Tracking

After completing each task, run:

```bash
# Check code quality
black .
isort .
ruff check .

# Run tests
pytest tests/ -v --cov=backend --cov-report=html

# Check test coverage
open htmlcov/index.html

# Verify API endpoints
pytest tests/integration/test_api.py -v
```

---

## 🎯 Next Steps

Use these prompts and templates to:
1. **Generate boilerplate quickly** with AI
2. **Customize for your needs** (don't blindly copy-paste)
3. **Test incrementally** after each component
4. **Iterate and improve** based on results

**Remember**: AI-generated code is a starting point. Review, test, and refine for production quality!

---

**Good luck with your 10-day sprint! 🚀**
