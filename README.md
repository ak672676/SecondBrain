# Second Brain

A personal knowledge management app that lets you upload documents, automatically discover semantic relationships between them, visualize them as an interactive knowledge graph, and chat with your entire knowledge base using AI.

> Upload once. Ask anything. See how your ideas connect.

---

## The Problem

You have hundreds of documents — PDFs, notes, research papers, meeting transcripts — scattered everywhere. Finding connections between ideas means opening each file and Ctrl+F-ing through them manually. Traditional search only finds **exact keyword matches**, so "pricing strategy" won't surface a document that says "revenue model."

Second Brain fixes this with **semantic search**: it understands meaning, not just words. Upload your documents, and it will find relevant information even when the terminology doesn't match — because it converts text into mathematical representations of meaning (embeddings) and compares those instead.

---

## Features

### Document Upload & Processing
- Upload PDF, Markdown, TXT, DOCX, and CSV files (up to 10MB each)
- Automatic text extraction, chunking, and embedding
- Real-time status tracking: `uploading → parsing → embedding → indexed`
- Smart chunking: 500 tokens with 50-token overlap; Markdown splits on `##` headings; CSV treats each row as a chunk

### AI Chat (RAG)
- Ask questions in plain English across your entire knowledge base
- Answers cite the specific source documents used
- Streaming responses (word-by-word, in real time)
- Conversation history with sidebar navigation
- Conversation memory: last 6 messages included for context

### Knowledge Graph
- Interactive D3.js force-directed graph showing document relationships
- Nodes colored by file type (PDF=blue, Markdown=purple, TXT=teal, DOCX=amber, CSV=green)
- Node size proportional to document length
- Edge thickness proportional to similarity score
- Adjustable similarity threshold slider (0.5 – 0.9)
- Click any node to see details and related documents
- Filter by file type

### Swappable LLM
- Change your AI provider by editing two environment variables — zero code changes
- Supported: **Groq** (default, free), **Anthropic** (Claude), **OpenAI** (GPT-4o), Ollama (local)

### Auth
- Username/password registration and login
- bcrypt password hashing, JWT sessions (httpOnly cookie, 7-day expiry)
- Rate-limited login attempts
- Full data isolation between users

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend + API | Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| Graph Visualization | D3.js (force-directed) |
| Database + Storage | Supabase (PostgreSQL + pgvector + Storage) |
| Embedding Service | Express.js + `@xenova/transformers` (all-MiniLM-L6-v2, 384 dims) |
| Default LLM | Groq (Llama 3.3 70B — free tier) |
| Auth | bcrypt + JWT |

Everything runs locally during development via Docker (Supabase) and Node.js. No cloud services required.

---

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────┐
│   Browser    │────→│   Next.js App    │────→│   Supabase   │
│  (React UI)  │←────│   (API Routes)   │←────│  (PostgreSQL │
│              │     │                  │     │  + pgvector)  │
└─────────────┘     └────────┬─────────┘     └──────────────┘
                             │
                    ┌────────┴─────────┐
                    │                  │
              ┌─────▼──────┐    ┌─────▼──────┐
              │  Embedding  │    │  LLM API   │
              │  Service    │    │  (Groq /   │
              │  (Express)  │    │  Claude /  │
              │             │    │  OpenAI)   │
              └────────────┘    └────────────┘
```

- **Next.js App** — UI, API routes, upload pipeline, RAG pipeline, streaming
- **Embedding Service** — Converts text → 384-dimensional vectors (runs locally, free)
- **LLM API** — Generates natural language answers from retrieved context
- **Supabase** — Stores users, documents, chunks, embeddings, and chat history

---

## Project Structure

```
second-brain/
├── apps/web/                    # Next.js application
│   ├── app/
│   │   ├── (auth)/              # Login & registration pages
│   │   ├── dashboard/           # Main app (documents, chat, graph)
│   │   │   ├── chat/            # AI chat interface
│   │   │   └── graph/           # Knowledge graph visualization
│   │   └── api/                 # API routes
│   │       ├── auth/            # Register, login, logout
│   │       ├── documents/       # Upload, delete, graph data
│   │       └── chat/            # RAG query, history
│   └── lib/
│       ├── llm/                 # LLM adapter layer
│       │   ├── index.ts         # Provider interface
│       │   └── providers/       # Groq, Anthropic, OpenAI
│       ├── embeddings/          # Embedding service client
│       ├── parsers/             # PDF, DOCX, Markdown, CSV, TXT
│       ├── chunking/            # Text splitting logic
│       ├── rag/                 # Retrieval + prompt building
│       ├── auth/                # JWT, bcrypt, rate limiting
│       └── supabase/            # Database client
├── services/embeddings/         # Express embedding microservice
│   └── src/index.ts             # POST /embed, GET /health
└── supabase/                    # Local Supabase config
    ├── config.toml
    └── migrations/              # Database schema (pgvector, RLS)
```

---

## Getting Started

### Prerequisites

- **Node.js** 18+
- **Docker** (for local Supabase)
- **Supabase CLI** — `npm install -g supabase`
- An API key for your chosen LLM provider (Groq is free)

### 1. Clone and Install

```bash
git clone https://github.com/ak672676/SecondBrain.git
cd SecondBrain
npm install
```

### 2. Start Local Supabase

```bash
supabase start
```

This spins up PostgreSQL (with pgvector), Storage, and other Supabase services in Docker. Note the `API URL` and `service_role key` from the output.

### 3. Configure Environment

```bash
cp apps/web/.env.example apps/web/.env.local
```

Edit `apps/web/.env.local`:

```bash
# Auth
JWT_SECRET=any-secret-string-here

# Supabase (from `supabase start` output)
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_KEY=your-service-role-key

# Embedding service
EMBEDDING_SERVICE_URL=http://localhost:3001

# LLM — swap provider by changing these two lines
LLM_PROVIDER=groq
LLM_MODEL=llama-3.3-70b-versatile

# Provider API keys (only the active provider's key is needed)
GROQ_API_KEY=your-groq-key
# ANTHROPIC_API_KEY=
# OPENAI_API_KEY=
```

### 4. Start the Embedding Service

```bash
cd services/embeddings
npm install
npm run dev
```

The first run downloads the all-MiniLM-L6-v2 model (~80MB). After that, it starts instantly.

### 5. Start the Next.js App

```bash
cd apps/web
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), register an account, and start uploading documents.

---

## How It Works

For a detailed, beginner-friendly explanation of embeddings, vector search, RAG, and the knowledge graph — see [HOW-IT-WORKS.md](HOW-IT-WORKS.md).

**The short version:**

1. **Upload** — Your document is parsed, split into ~500-token chunks, and each chunk is converted into 384 numbers (an "embedding") that represent its meaning.

2. **Search** — When you ask a question, your question is also converted to an embedding. The system finds the 5 chunks whose embeddings are closest to your question's embedding — meaning the chunks most semantically related to what you asked.

3. **Answer** — Those chunks are injected into an LLM prompt as context. The LLM reads them and generates a natural language answer, citing which documents the information came from.

4. **Graph** — Each document's chunks are averaged into a single embedding. Documents whose embeddings are similar get connected by edges in a force-directed graph, revealing hidden relationships.

---

## Swapping the LLM Provider

Change two lines in `.env.local` — no code changes needed:

```bash
# Use Groq (default — free)
LLM_PROVIDER=groq
LLM_MODEL=llama-3.3-70b-versatile

# Use Anthropic Claude
LLM_PROVIDER=anthropic
LLM_MODEL=claude-sonnet-4-20250514

# Use OpenAI
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o-mini
```

This works because all LLM calls go through a single adapter layer (`lib/llm/index.ts`) that routes to the correct provider SDK based on the environment variable.

---

## API Routes

| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login (sets httpOnly cookie) |
| POST | `/api/auth/logout` | Logout (clears cookie) |
| GET | `/api/documents` | List user's documents |
| POST | `/api/documents` | Upload + process document |
| DELETE | `/api/documents/[id]` | Delete document + chunks |
| POST | `/api/documents/[id]/reindex` | Re-run processing pipeline |
| GET | `/api/documents/graph` | Get graph data (nodes + edges) |
| POST | `/api/chat` | Send message (streams response) |
| GET | `/api/chat/history` | Get conversation list |
| GET | `/api/chat/[conversationId]` | Get conversation messages |

---

## Database Schema

Four main tables in PostgreSQL with pgvector:

- **users** — Accounts with bcrypt-hashed passwords
- **documents** — Uploaded files with status tracking
- **chunks** — Document pieces with 384-dim embedding vectors (pgvector)
- **conversations** + **messages** — Chat history with source citations

See [`supabase/migrations/`](supabase/migrations/) for the full schema.

---

## License

This project is for personal use and learning. Feel free to fork and adapt.
