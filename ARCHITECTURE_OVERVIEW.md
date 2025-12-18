# RegNav.AI: System Architecture Overview

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐   │
│  │ Dashboard  │  │ Validation │  │   Rules    │  │  AI Chat   │   │
│  │   View     │  │  Interface │  │ Repository │  │ (RuleSense)│   │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ REST API (FastAPI)
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       API LAYER (FastAPI)                             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Authentication  │  Rate Limiting  │  CORS  │  Validation   │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │   ORCHESTRATION LAYER     │
                    │  (Multi-Agent Workflows)  │
                    └─────────────┬─────────────┘
                                  │
        ┌─────────────┬───────────┼───────────┬─────────────┐
        │             │           │           │             │
        ▼             ▼           ▼           ▼             ▼
┌──────────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────────┐
│  REGSCOUT    │ │REGINGEST│ │RULEMINER│ │RULESENSE│ │ REGVALIDATE  │
│   Agent      │ │  Agent  │ │  Agent  │ │  Agent  │ │    Agent     │
├──────────────┤ ├─────────┤ ├─────────┤ ├─────────┤ ├──────────────┤
│ • AI Search  │ │• Parser │ │• Extract│ │• NL Query│ │• WCPOLS      │
│ • URL Valid  │ │• Embed  │ │• Codegen│ │• Explain│ │  Parser      │
│ • Metadata   │ │• Vector │ │• Version│ │• Analytics│ │• Validate   │
│              │ │  Store  │ │         │ │• Insights│ │• Score       │
└──────────────┘ └─────────┘ └─────────┘ └─────────┘ └──────────────┘
        │             │           │           │             │
        └─────────────┴───────────┴───────────┴─────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │    SHARED SERVICES        │
                    │  • AI Service (OpenAI)    │
                    │  • Cache (Redis)          │
                    │  • Task Queue (ARQ)       │
                    │  • File Storage           │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │     DATA LAYER            │
                    │  • PostgreSQL (Main DB)   │
                    │  • pgvector (Embeddings)  │
                    │  • Redis (Cache/Queue)    │
                    └───────────────────────────┘
```

---

## 🤖 5-Agent Architecture Deep Dive

### 1. **RegScout** - Document Discovery Agent 🔍
**Purpose**: Find and validate regulatory sources

```
Input:
├── State code (e.g., "WI")
├── Line of Business (e.g., "workers_comp")
└── Document type (e.g., "Manual")

Processing:
├── Generate AI-powered search queries
├── Search regulatory websites
├── Validate URLs (accessibility, domain)
├── Extract metadata (title, date, agency)
└── Score confidence (0-1)

Output:
└── List of RegulatorySource objects
    ├── URL to document
    ├── Metadata
    ├── Confidence score
    └── Discovery method
```

**Key Features**:
- AI-powered query generation
- Multi-source parallel search
- Government domain validation
- Automatic metadata extraction
- Confidence scoring

**Database Tables**:
- `regulatory_sources`: Stores discovered URLs and metadata

---

### 2. **RegIngest** - Document Ingestion Agent 📄
**Purpose**: Parse, chunk, and vectorize documents

```
Input:
├── File upload (PDF, DOCX, HTML)
└── OR URL from RegScout

Processing:
├── Parse document (extract text, tables, metadata)
├── Chunk content (1000 chars, 200 overlap)
├── Generate embeddings (OpenAI text-embedding-3-small)
├── Store vectors (pgvector)
└── Make searchable (semantic search)

Output:
└── Parsed Document object
    ├── Text content
    ├── Tables
    ├── Metadata
    └── Searchable chunks with embeddings
```

**Key Features**:
- Multi-format support (PDF, DOCX, HTML, Excel)
- Table extraction
- Semantic chunking
- Vector embeddings
- Semantic search (cosine similarity)
- Background processing (async)

**Database Tables**:
- `documents`: Document metadata and storage
- `document_chunks`: Text chunks with vector embeddings

---

### 3. **RuleMiner** - Rule Extraction Agent ⛏️
**Purpose**: Extract structured rules from documents using AI

```
Input:
└── Parsed Document (from RegIngest)

Processing:
├── Identify rule-containing sections (AI)
├── Extract structured rule data:
│   ├── Rule ID (e.g., "WI-WC-R006")
│   ├── Description
│   ├── Validation criteria
│   ├── Severity (CRITICAL, HIGH, MEDIUM, LOW)
│   ├── Corrective actions
│   └── References
├── Generate Python validation code
├── Classify into category
└── Version and store

Output:
└── List of Rule objects
    ├── Structured metadata
    ├── Executable validation code
    ├── Examples
    └── Version history
```

**Key Features**:
- AI-powered rule extraction
- Validation code generation
- Rule versioning
- Manual approval workflow
- Semantic rule search
- Multi-state rule comparison

**Database Tables**:
- `rules`: Rule definitions and metadata
- Version tracking (parent_rule_id)

---

### 4. **RuleSense** - Conversational AI Agent 💬
**Purpose**: Natural language interface for rules and insights

```
Input:
└── Natural language query
    Examples:
    ├── "What are expense constant rules for Wisconsin?"
    ├── "Show me all CRITICAL violations"
    ├── "How do I fix error R006?"
    └── "Compare WI and MI workers comp rules"

Processing:
├── Parse intent (search, explain, compare, fix, analyze)
├── Extract entities (states, LOBs, rule IDs, dates)
├── Retrieve relevant context (vector search)
├── Generate natural language response (AI)
└── Include structured data (rules, charts, recommendations)

Output:
└── QueryResponse object
    ├── Natural language answer
    ├── Structured data (rules, examples)
    ├── References
    ├── Related queries
    └── Confidence score
```

**Key Features**:
- Intent classification
- Entity extraction
- Contextual responses
- Rule explanations (plain language)
- Compliance analytics
- Trend analysis
- Recommendation engine
- Compliance scoring

**No dedicated tables** (uses all existing data)

---

### 5. **RegValidate** - File Validation Agent ✅
**Purpose**: Validate uploaded files against extracted rules

```
Input:
├── File (WCPOLS format)
├── State code
├── Line of Business
└── Optional: Insurer profile (for rule filtering)

Processing:
├── Parse file (fixed-width WCPOLS format)
├── Group records by policy
├── Load applicable rules:
│   ├── Filter by state/LOB
│   ├── Apply insurer profile filters (if provided)
│   └── Load validation code
├── Execute validations (parallel where possible)
├── Generate corrective actions (AI-powered)
├── Calculate compliance score
└── Store results

Output:
└── ValidationReport object
    ├── Overall compliance score (0-100)
    ├── Violations by severity:
    │   ├── CRITICAL
    │   ├── HIGH
    │   ├── MEDIUM
    │   └── LOW
    ├── Corrective actions for each violation
    ├── Category breakdown
    └── Trend comparison
```

**Key Features**:
- WCPOLS parser (fixed-width format)
- Rule filtering by insurer profile
- Parallel validation execution
- AI-generated corrective actions
- Compliance scoring
- Historical trending
- Export reports (PDF, JSON, CSV)

**Database Tables**:
- `validation_reports`: Validation run metadata
- `validation_results`: Individual rule results

---

## 🔄 Multi-Agent Workflows

### Workflow 1: **Full State Onboarding**
```
New State/LOB Setup (e.g., Texas Workers Comp)

Step 1: RegScout discovers sources
    └── Output: 10-20 regulatory document URLs

Step 2: RegIngest downloads and parses documents
    └── Output: Parsed documents with embeddings

Step 3: RuleMiner extracts rules
    └── Output: 100-200 structured rules

Step 4: RuleSense generates compliance guide
    └── Output: Comprehensive guide for insurers

Result: State fully onboarded and ready for validation
Time: 30-60 minutes (mostly AI processing)
```

### Workflow 2: **Validation with Insights**
```
File Validation + AI Analysis

Step 1: RegValidate validates file
    └── Output: Validation results with violations

Step 2: RuleSense analyzes results
    └── Output: Insights (trends, patterns, root causes)

Step 3: RuleSense generates recommendations
    └── Output: Prioritized action items

Result: Not just "what's wrong" but "how to fix it"
Time: 1-2 minutes
```

### Workflow 3: **Continuous Monitoring**
```
Regulatory Change Detection

Step 1: RegScout monitors sources (daily/weekly)
    └── Detect new documents or updates

Step 2: RegIngest parses new content
    └── Extract changed sections

Step 3: RuleMiner extracts new/changed rules
    └── Identify rule changes

Step 4: RuleSense notifies affected insurers
    └── "Rule R006 changed for Wisconsin"

Result: Proactive compliance monitoring
Time: Automated background process
```

### Workflow 4: **Rule Refresh**
```
Update Rules for State

Step 1: RegScout finds latest manual
    └── New version of WI WC Manual

Step 2: RegIngest parses document
    └── Extract all content

Step 3: RuleMiner extracts rules
    └── Create new rule versions

Step 4: Compare with existing rules (RuleSense)
    └── Highlight changes

Step 5: Notify users of changes
    └── "10 rules updated, 2 new rules added"

Result: Always up-to-date compliance rules
Time: 20-30 minutes
```

---

## 🗄️ Database Schema

### Core Tables

```sql
-- Regulatory sources (discovered by RegScout)
CREATE TABLE regulatory_sources (
    id UUID PRIMARY KEY,
    state_code VARCHAR(2) NOT NULL,
    line_of_business VARCHAR(32) NOT NULL,
    document_type VARCHAR(32) NOT NULL,
    source_url TEXT NOT NULL,
    source_name VARCHAR(255),
    effective_date DATE,
    expiration_date DATE,
    metadata JSONB,
    discovery_method VARCHAR(32),
    status VARCHAR(32),
    confidence_score FLOAT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    UNIQUE(state_code, line_of_business, document_type, source_url)
);
CREATE INDEX idx_sources_lookup ON regulatory_sources(state_code, line_of_business, document_type);

-- Documents (ingested by RegIngest)
CREATE TABLE documents (
    id UUID PRIMARY KEY,
    source_id UUID REFERENCES regulatory_sources(id),
    filename VARCHAR(255),
    file_path TEXT,
    file_type VARCHAR(32),
    file_size_bytes BIGINT,
    status VARCHAR(32), -- processing, completed, failed
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- Document chunks with embeddings (RegIngest)
CREATE TABLE document_chunks (
    id UUID PRIMARY KEY,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding VECTOR(1536), -- OpenAI embedding dimension
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_chunks_embedding ON document_chunks USING ivfflat (embedding vector_cosine_ops);

-- Rules (extracted by RuleMiner)
CREATE TABLE rules (
    id UUID PRIMARY KEY,
    rule_id VARCHAR(64) UNIQUE NOT NULL, -- e.g., "WI-WC-R006"
    rule_title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    state_code VARCHAR(2) NOT NULL,
    line_of_business VARCHAR(32) NOT NULL,
    validation_type VARCHAR(32) NOT NULL,
    validation_criteria JSONB NOT NULL,
    validation_code TEXT, -- Executable Python code
    category VARCHAR(64),
    severity VARCHAR(16) NOT NULL,
    corrective_action TEXT,
    references JSONB,
    examples JSONB,
    confidence_score FLOAT,
    status VARCHAR(16) DEFAULT 'draft', -- draft, approved, archived
    version INTEGER DEFAULT 1,
    parent_rule_id UUID REFERENCES rules(id), -- For versioning
    document_id UUID REFERENCES documents(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    approved_by VARCHAR(255),
    approved_at TIMESTAMPTZ
);
CREATE INDEX idx_rules_lookup ON rules(state_code, line_of_business, category);
CREATE INDEX idx_rules_status ON rules(status, severity);

-- Validation reports (RegValidate)
CREATE TABLE validation_reports (
    id UUID PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    state_code VARCHAR(2) NOT NULL,
    line_of_business VARCHAR(32) NOT NULL,
    profile_id UUID REFERENCES insurer_profiles(id),
    total_rules_evaluated INTEGER,
    rules_passed INTEGER,
    rules_failed INTEGER,
    compliance_score FLOAT,
    status VARCHAR(32),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Validation results (individual rule results)
CREATE TABLE validation_results (
    id UUID PRIMARY KEY,
    report_id UUID REFERENCES validation_reports(id) ON DELETE CASCADE,
    rule_id UUID REFERENCES rules(id),
    passed BOOLEAN NOT NULL,
    severity VARCHAR(16),
    message TEXT,
    details JSONB,
    corrective_action TEXT,
    record_type VARCHAR(8),
    record_index INTEGER
);
CREATE INDEX idx_results_report ON validation_results(report_id, passed);

-- Insurer profiles (for rule filtering)
CREATE TABLE insurer_profiles (
    id UUID PRIMARY KEY,
    profile_id VARCHAR(64) UNIQUE NOT NULL,
    profile_name VARCHAR(255) NOT NULL,
    carrier_name VARCHAR(255),
    naic_number VARCHAR(64),
    status VARCHAR(32) DEFAULT 'active',
    selected_categories JSONB, -- Rule categories to apply
    restored_rules JSONB, -- Manually re-enabled rules
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_modified TIMESTAMPTZ
);

-- Users (for authentication)
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(32) DEFAULT 'user', -- admin, user, readonly
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ
);
```

---

## 🔒 Security Architecture

### Authentication Flow
```
1. User Registration/Login
   ├── Password hashed with bcrypt
   ├── JWT token generated (HS256)
   ├── Access token (30 min expiry)
   └── Refresh token (7 day expiry)

2. API Request
   ├── Include: Authorization: Bearer <token>
   ├── Validate JWT signature
   ├── Check expiration
   └── Extract user_id and role

3. Authorization
   ├── Check user role
   ├── Verify resource access
   └── Allow/Deny
```

### Data Security
- **At Rest**: PostgreSQL encryption
- **In Transit**: HTTPS/TLS
- **API Keys**: Environment variables, never in code
- **Passwords**: bcrypt hashing (cost factor 12)
- **Tokens**: JWT with expiration
- **Rate Limiting**: 60 requests/minute per user

---

## 🚀 Deployment Architecture

### Development
```
Local Machine
├── PostgreSQL (Docker)
├── Redis (Docker)
├── FastAPI (uvicorn --reload)
└── React (npm start)
```

### Production
```
Cloud Provider (AWS/GCP/Azure)
├── Load Balancer (HTTPS)
│   └── Routes to multiple app instances
├── Application Servers (Docker/Kubernetes)
│   ├── FastAPI (Gunicorn + Uvicorn workers)
│   ├── Background workers (ARQ)
│   └── Auto-scaling (CPU > 70%)
├── Database Layer
│   ├── PostgreSQL (RDS/CloudSQL) - Primary
│   ├── Read replicas (for scaling)
│   └── Automated backups
├── Cache Layer
│   ├── Redis (ElastiCache/MemoryStore)
│   └── CDN for static assets
├── Storage
│   ├── S3/Cloud Storage (uploaded files)
│   └── Lifecycle policies (archive after 90 days)
└── Monitoring
    ├── Sentry (error tracking)
    ├── DataDog/CloudWatch (metrics)
    └── ELK Stack (logging)
```

---

## 📊 Performance Targets

### API Response Times (p95)
- Simple queries (GET): < 100ms
- Complex queries (search): < 500ms
- File validation: < 2 seconds
- Document ingestion: < 30 seconds (background)
- Rule extraction: < 60 seconds (background)

### Throughput
- Concurrent users: 100-1000
- API requests/second: 50-500
- Validations/hour: 1000+
- Document ingestion/hour: 100+

### Availability
- Uptime: 99.9% (43 minutes downtime/month)
- Database: Multi-AZ deployment
- Automated failover: < 60 seconds

---

## 🎯 What Makes This Architecture Special

### ✅ **Modular & Extensible**
- Each agent is independent
- Easy to add new states/LOBs
- Can swap AI providers
- Microservices-ready

### ✅ **AI-First Design**
- AI at every layer (discovery, extraction, analysis)
- Natural language interface
- Continuous learning from validations

### ✅ **Production-Grade**
- Async throughout (handles scale)
- Comprehensive error handling
- Security by default
- Monitoring and observability

### ✅ **User-Centric**
- Conversational interface (RuleSense)
- Actionable insights (not just errors)
- Compliance scoring
- Trend analysis

### ✅ **Future-Proof**
- Event-driven architecture
- Workflow orchestration
- Multi-agent coordination
- Can evolve to full microservices

---

## 🔮 Future Enhancements (Post-MVP)

### Phase 2 (Weeks 3-4)
- [ ] Multi-tenancy (SaaS model)
- [ ] Advanced RBAC with teams
- [ ] Webhook notifications
- [ ] Scheduled validations
- [ ] All 50 US states

### Phase 3 (Months 2-3)
- [ ] Machine learning for rule prediction
- [ ] Custom rule builder (no-code)
- [ ] Integration with policy systems
- [ ] Mobile app (iOS/Android)
- [ ] Advanced analytics dashboard

### Phase 4 (Months 4-6)
- [ ] Microservices architecture
- [ ] Real-time collaboration
- [ ] Workflow automation
- [ ] White-label solution
- [ ] API marketplace

---

**This architecture will support you from MVP to enterprise scale!** 🚀

Next: Open `START_HERE.md` to begin your 10-day journey!


