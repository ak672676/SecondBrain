# Product Requirements Document
## Second Brain — Personal Knowledge Graph & AI Assistant

**Version:** 1.0  
**Status:** Draft  
**Last Updated:** March 2026

---

## 1. Overview

### 1.1 Product Summary
Second Brain is a personal knowledge management web app that lets users upload their documents, notes, and files, automatically discovers semantic relationships between them, visualizes them as an interactive knowledge graph, and lets users have AI-powered conversations with their entire knowledge base.

### 1.2 Problem Statement
Knowledge workers accumulate years of notes, PDFs, highlights, and documents across Notion, Obsidian, email, and local files. Finding connections between ideas, recalling past decisions, and synthesizing knowledge across documents is slow and manual. No free, open tool does this with an AI chat interface and visual relationship graph in a single web app.

### 1.3 Goals
- Let users upload and index their personal documents in minutes
- Automatically discover and visualize semantic relationships between documents
- Enable natural language Q&A over the entire knowledge base
- Keep every component 100% free for personal use
- Allow LLM provider to be swapped without changing application logic
- Secure each user's knowledge base behind simple username/password auth

### 1.4 Non-Goals
- Mobile app (web only, responsive is fine)
- Real-time collaboration between users
- Social login, OAuth, or OTP-based auth
- Public sharing of knowledge graphs
- Paid features or monetization in v1

---

## 2. Users

### 2.1 Primary User
A single person (developer, student, researcher, or knowledge worker) who:
- Has accumulated notes and documents over months or years
- Wants to find connections they never consciously noticed
- Wants to ask questions across all their knowledge at once
- Is technical enough to deploy a free-tier web app

### 2.2 User Personas

**"The Researcher" — Arjun, PhD student**
Has 300+ paper PDFs, Obsidian notes, and Notion exports. Spends hours manually cross-referencing before writing. Wants to ask "what have I read about reinforcement learning in healthcare?" and get a cited answer instantly.

**"The Builder" — Priya, indie founder**
Has 3 years of product notes, user interview transcripts, competitor research PDFs, and shower-thought text files. Wants to ask "what did users complain about onboarding?" without reading 200 files.

**"The Learner" — Rohan, self-taught dev**
Has Kindle highlights, course notes, blog bookmarks, and personal journal entries. Wants to see how his ideas connect visually and rediscover things he forgot he learned.

---

## 3. Features

### 3.1 Authentication

**Simple username/password login — no OTP, no social, no magic links.**

- User registers with: username, email, password
- Password hashed with bcrypt (12 rounds)
- Session managed via JWT stored in httpOnly cookie
- Session expiry: 7 days, auto-refresh on activity
- Each user's data is fully isolated — no cross-user data access
- No password recovery in v1 (stretch goal)
- Rate limit login attempts: 5 tries per 15 minutes per IP

**Screens:**
- `/login` — username + password form
- `/register` — username + email + password + confirm password
- Redirect to `/dashboard` on success

---

### 3.2 Document Ingestion Pipeline

Users can upload documents from the dashboard. The pipeline runs asynchronously.

**Supported file types (v1):**
| Type | Extension | Parser |
|---|---|---|
| Markdown | `.md` | Native (no lib needed) |
| Plain text | `.txt` | Native |
| PDF | `.pdf` | `pdf-parse` |
| Word document | `.docx` | `mammoth.js` |
| CSV | `.csv` | `papaparse` |

**Stretch (v2):**
- URL scraping (paste a URL → scrape + ingest)
- Notion export zip
- Obsidian vault zip

**Pipeline steps:**
```
Upload file
  → Validate file type + size (max 10MB per file)
  → Extract raw text using appropriate parser
  → Clean text (remove excess whitespace, special chars)
  → Split into chunks (500 tokens, 50 token overlap)
  → Tag each chunk with metadata:
      { user_id, doc_id, doc_name, chunk_index, file_type, created_at }
  → Send chunks to embedding service
  → Store [chunk_text + embedding + metadata] in Supabase pgvector
  → Update document status to "indexed"
```

**Chunking strategy:**
- Default: 500 tokens, 50 token overlap
- Markdown: split on `##` headings first, then token-chunk each section
- CSV: each row = one chunk, prepend column headers to every chunk

---

### 3.3 Knowledge Graph Visualization

The core visual feature of the product.

**How it works:**
- After indexing, compute average embedding per document (mean of all chunk embeddings)
- Compute cosine similarity between every pair of documents
- Threshold: only draw an edge if similarity > 0.65
- Render as D3.js force-directed graph

**Node properties:**
- Size: proportional to number of chunks (bigger doc = bigger node)
- Color: by file type (PDF = blue, markdown = purple, text = teal, docx = amber, CSV = green)
- Label: document filename (truncated to 20 chars)

**Edge properties:**
- Thickness: proportional to similarity score
- Only shown above 0.65 similarity threshold
- Hover shows exact similarity score

**Interactions:**
- Click a node → opens document detail panel (file name, chunk count, top related docs)
- Hover an edge → shows similarity score tooltip
- Drag nodes to rearrange
- Zoom and pan
- Filter by file type (checkbox group)
- Similarity threshold slider (0.5 → 0.9) — adjusting it redraws edges in real time
- Click a node then click "Chat with this doc" → opens chat pre-filtered to that document

---

### 3.4 AI Chat Interface

Users can chat with their entire knowledge base or a subset of documents.

**RAG pipeline per query:**
```
User sends message
  → Embed the query (embedding service)
  → Similarity search in Supabase pgvector
      (top 5 chunks, filtered by user_id)
  → Build prompt:
      system: You are a knowledge assistant. Answer using ONLY the provided context.
              Always cite the source document name for each claim.
              If the answer is not in the context, say so.
      context: [chunk 1 from doc X] [chunk 2 from doc Y] ...
      user: [question]
  → Send to LLM provider via LLM adapter layer
  → Stream response back to UI
  → Display answer + source document chips below
```

**Chat features:**
- Streaming responses (word by word)
- Source document chips below each answer (clickable)
- Conversation memory: last 6 messages included in prompt
- Scope selector: "All documents" or select specific docs
- Clear chat button
- Each conversation is saved per user (chat history sidebar)

---

### 3.5 Document Manager

A simple dashboard to manage uploaded documents.

**Features:**
- List of all indexed documents with: name, type, size, chunk count, upload date, status
- Status states: uploading → parsing → embedding → indexed → error
- Delete a document (removes from storage + vector DB)
- Re-index a document (re-run pipeline)
- Search documents by name
- Sort by: date, name, size, chunk count

---

## 4. LLM Adapter Layer

**This is the key architectural decision that makes the LLM swappable.**

All LLM calls go through a single adapter module. The rest of the app never calls any LLM SDK directly.

```typescript
// lib/llm/index.ts

interface LLMAdapter {
  chat(messages: Message[], options: ChatOptions): Promise<Stream>
}

// Implementations:
// lib/llm/providers/groq.ts      ← default (free)
// lib/llm/providers/anthropic.ts ← Claude
// lib/llm/providers/openai.ts    ← GPT-4o
// lib/llm/providers/ollama.ts    ← local models (stretch)

// Active provider set by env variable:
// LLM_PROVIDER=groq | anthropic | openai | ollama
// LLM_MODEL=llama-3.3-70b | claude-sonnet-4-... | gpt-4o
```

**To swap LLM:** Change two lines in `.env`. Zero application code changes.

**Default provider:** Groq (free, fast, llama-3.3-70b)

---

## 5. Tech Stack (100% Free)

### 5.1 Full Stack

| Layer | Technology | Hosting | Cost |
|---|---|---|---|
| Frontend | Next.js 14 (App Router) | Vercel | Free |
| API routes | Next.js API routes | Vercel | Free |
| Embedding service | Express.js + `@xenova/transformers` | Railway | Free tier |
| Vector database | Supabase pgvector | Supabase | Free tier |
| File storage | Supabase Storage | Supabase | Free tier |
| Auth session DB | Supabase (users table) | Supabase | Free tier |
| Default LLM | Groq API (llama-3.3-70b) | Groq cloud | Free tier |
| Graph UI | D3.js | — | Open source |
| Styling | Tailwind CSS + shadcn/ui | — | Open source |

### 5.2 Free Tier Limits

| Service | Free Limit | Expected Usage | Safe? |
|---|---|---|---|
| Supabase DB | 500MB | ~100MB for 5,000 docs | ✅ |
| Supabase Storage | 1GB | ~500MB for 1,000 files | ✅ |
| Railway | 500 hrs/month | ~50 hrs | ✅ |
| Groq API | ~14,400 req/day | ~100/day personal | ✅ |
| Vercel | 100GB bandwidth | Negligible | ✅ |

### 5.3 LLM Provider Options

| Provider | Model | Free Tier | Speed |
|---|---|---|---|
| **Groq** (default) | llama-3.3-70b | ✅ Free | Very fast |
| Anthropic | claude-sonnet-4 | ⚠️ Free credits | Fast |
| OpenAI | gpt-4o-mini | ⚠️ Free credits | Fast |
| Ollama | any local model | ✅ Free (local) | Depends on hardware |

---

## 6. Database Schema

```sql
-- Users table
create table users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  email text unique not null,
  password_hash text not null,
  created_at timestamp default now()
);

-- Documents table
create table documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  name text not null,
  file_type text not null,
  file_size integer,
  chunk_count integer default 0,
  status text default 'uploading',
  storage_path text,
  created_at timestamp default now()
);

-- Chunks table (vector store)
create extension if not exists vector;

create table chunks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  document_id uuid references documents(id) on delete cascade,
  content text not null,
  embedding vector(384),
  chunk_index integer,
  created_at timestamp default now()
);

create index on chunks
using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

-- Chat history table
create table conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  title text,
  created_at timestamp default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  role text check (role in ('user', 'assistant')),
  content text not null,
  sources jsonb,
  created_at timestamp default now()
);
```

---

## 7. Project Structure

```
second-brain/
├── apps/
│   └── web/                        ← Next.js app (deploy to Vercel)
│       ├── app/
│       │   ├── (auth)/
│       │   │   ├── login/page.tsx
│       │   │   └── register/page.tsx
│       │   ├── dashboard/
│       │   │   ├── page.tsx         ← Graph view
│       │   │   ├── docs/page.tsx    ← Document manager
│       │   │   └── chat/page.tsx    ← Chat interface
│       │   └── api/
│       │       ├── auth/
│       │       │   ├── login/route.ts
│       │       │   └── register/route.ts
│       │       ├── documents/
│       │       │   ├── upload/route.ts
│       │       │   └── [id]/route.ts
│       │       └── chat/route.ts
│       └── lib/
│           ├── llm/
│           │   ├── index.ts          ← LLM adapter interface
│           │   └── providers/
│           │       ├── groq.ts
│           │       ├── anthropic.ts
│           │       ├── openai.ts
│           │       └── ollama.ts
│           ├── embeddings/
│           │   └── client.ts         ← calls embedding service
│           ├── supabase/
│           │   └── client.ts
│           └── parsers/
│               ├── pdf.ts
│               ├── docx.ts
│               ├── markdown.ts
│               └── csv.ts
│
└── services/
    └── embeddings/                  ← Express app (deploy to Railway)
        ├── index.ts                 ← POST /embed
        └── model.ts                 ← @xenova/transformers loader
```

---

## 8. API Routes

| Method | Route | Description | Auth |
|---|---|---|---|
| POST | `/api/auth/register` | Create account | No |
| POST | `/api/auth/login` | Login, set cookie | No |
| POST | `/api/auth/logout` | Clear session cookie | Yes |
| GET | `/api/documents` | List user's documents | Yes |
| POST | `/api/documents/upload` | Upload + start pipeline | Yes |
| DELETE | `/api/documents/[id]` | Delete document | Yes |
| GET | `/api/documents/graph` | Get graph data (nodes + edges) | Yes |
| POST | `/api/chat` | Send message, stream response | Yes |
| GET | `/api/chat/history` | Get past conversations | Yes |

---

## 9. Embedding Service API

Deployed separately on Railway.

```
POST /embed
Body: { texts: string[] }
Returns: { embeddings: number[][] }

GET /health
Returns: { status: "ok", model: "all-MiniLM-L6-v2" }
```

Model: `all-MiniLM-L6-v2` — 384 dimensions, 80MB, runs in Node.js, zero cost.

---

## 10. Environment Variables

```bash
# apps/web/.env.local

# Auth
JWT_SECRET=your_secret_here
JWT_EXPIRES_IN=7d

# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_KEY=

# Embedding service
EMBEDDING_SERVICE_URL=https://your-railway-app.railway.app

# LLM — change these two lines to swap provider
LLM_PROVIDER=groq
LLM_MODEL=llama-3.3-70b-versatile

# Provider API keys (only the active one is needed)
GROQ_API_KEY=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
OLLAMA_BASE_URL=http://localhost:11434
```

---

## 11. Build Phases

### Phase 1 — Foundation (Week 1–2)
- [ ] Project scaffold (Next.js + Supabase + Railway setup)
- [ ] Supabase schema setup
- [ ] Register + login with bcrypt + JWT
- [ ] Protected routes middleware
- [ ] File upload UI + storage to Supabase

### Phase 2 — RAG Pipeline (Week 3–4)
- [ ] Railway embedding service with `@xenova/transformers`
- [ ] PDF, markdown, txt parsers
- [ ] Chunking logic with overlap
- [ ] Embed + store in pgvector
- [ ] Document manager UI with status tracking

### Phase 3 — Chat (Week 5)
- [ ] LLM adapter layer with Groq as default
- [ ] RAG query pipeline (embed → search → prompt → stream)
- [ ] Streaming chat UI with source chips
- [ ] Conversation history

### Phase 4 — Knowledge Graph (Week 6–7)
- [ ] Document-level embedding (mean of chunks)
- [ ] Cosine similarity matrix computation
- [ ] D3.js force graph with nodes + edges
- [ ] Node click → detail panel
- [ ] Similarity threshold slider
- [ ] File type color coding

### Phase 5 — Polish + Deploy (Week 8)
- [ ] Error handling throughout
- [ ] Loading states for pipeline steps
- [ ] Vercel deployment
- [ ] Railway deployment
- [ ] End-to-end testing
- [ ] README with setup guide

---

## 12. Risks & Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Railway cold start delays embedding (30s) | High | Cron ping every 25 min on Vercel |
| Vercel 10s timeout on large file upload | Medium | Move parsing to background job or chunked upload |
| Supabase 500MB limit hit | Low | Delete old chunks on doc re-index |
| Groq rate limit hit | Low | Queue requests, show loading state |
| `@xenova/transformers` memory on Railway free tier | Medium | Use 512MB plan, model loads once and stays in memory |

---

## 13. Success Metrics (Personal Project)

- Can upload 50+ documents without errors
- Graph renders within 3 seconds of opening dashboard
- Chat answers a question with correct source citation
- Login/register flow works end to end
- Deployed live URL shareable for portfolio
- LLM swap tested: works with both Groq and Anthropic by changing `.env` only
