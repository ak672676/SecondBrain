# Second Brain — Project Instructions

## About the Developer
Amit is new to AI and RAG concepts. When building features, always explain:
- **What** we are building and why it matters
- **Why** we chose this approach over alternatives
- **AI/RAG concepts** in plain language (e.g., what embeddings are, why we chunk documents, how vector search works)
- Keep explanations brief but educational — teach while building

## What is this project?
A personal knowledge management web app: upload documents, auto-discover semantic relationships, visualize as a knowledge graph, and chat with your knowledge base using RAG.

See `second-brain-prd.md` for the full PRD.

## Tech Stack
- **Frontend + API:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Graph visualization:** D3.js force-directed graph
- **Database + Storage:** Supabase (local via Docker, pgvector for embeddings)
- **Embedding service:** Express.js + `@xenova/transformers` (all-MiniLM-L6-v2, 384 dims)
- **LLM:** Swappable via adapter layer — Groq (default), Anthropic, OpenAI, Ollama
- **Auth:** bcrypt + JWT (httpOnly cookie)

## Project Structure
```
second-brain/
├── apps/web/              ← Next.js app
│   ├── app/               ← App Router pages + API routes
│   └── lib/               ← LLM adapter, embeddings client, parsers, supabase client
├── services/embeddings/   ← Express embedding microservice
└── supabase/              ← Local Supabase config + migrations
```

## Development — Local First
Everything runs locally. No cloud deployment until explicitly ready.
- `supabase start` for local DB + storage
- `npm run dev` in `apps/web` for Next.js
- `npm run dev` in `services/embeddings` for embedding service

## Code Conventions
- TypeScript strict mode everywhere
- Use Next.js App Router conventions (server components by default, 'use client' only when needed)
- API routes in `app/api/` using Route Handlers
- All LLM calls go through `lib/llm/index.ts` adapter — never call an LLM SDK directly
- All embedding calls go through `lib/embeddings/client.ts`
- Use Supabase client from `lib/supabase/client.ts`
- Tailwind + shadcn/ui for all UI — no custom CSS unless absolutely necessary
- File parsers in `lib/parsers/` — one file per format

## Key Design Decisions
- **LLM adapter pattern:** Swap provider by changing `LLM_PROVIDER` + `LLM_MODEL` in `.env.local`
- **Chunking:** 500 tokens, 50 token overlap. Markdown splits on `##` first. CSV = one row per chunk.
- **Graph edges:** Only drawn when cosine similarity > 0.65 (user-adjustable via slider)
- **RAG:** Top 5 chunks, conversation memory = last 6 messages
- **Auth:** Simple username/password, JWT in httpOnly cookie, 7-day expiry

## Build Phases
Phase 1: Foundation (scaffold, Supabase, auth, file upload)
Phase 2: RAG Pipeline (embedding service, parsers, chunking, vector store, doc manager)
Phase 3: Chat (LLM adapter, RAG query, streaming UI, history)
Phase 4: Knowledge Graph (D3.js force graph, similarity matrix, interactions)
Phase 5: Polish + Deploy

## Testing
- Run `npm run build` to catch type errors before committing
- Test auth flows, upload pipeline, and chat manually during development
- End-to-end tests in Phase 5

## Common Commands
```bash
# Start local Supabase
supabase start

# Start Next.js dev server
cd apps/web && npm run dev

# Start embedding service
cd services/embeddings && npm run dev

# Run type check
cd apps/web && npx tsc --noEmit
```
