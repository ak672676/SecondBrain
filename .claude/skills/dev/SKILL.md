---
name: dev
description: Start all local development services for Second Brain
disable-model-invocation: true
allowed-tools: Bash
---

Start all local dev services. Check what's running first, then start what's needed:

1. Check if Supabase is running: `supabase status`
   - If not running: `supabase start`

2. Check if embedding service is running: `curl -s http://localhost:3001/health`
   - If not running: `cd services/embeddings && npm run dev &`

3. Check if Next.js is running: `curl -s http://localhost:3000`
   - If not running: `cd apps/web && npm run dev &`

4. Print a summary of all running services with their URLs:
   - Next.js: http://localhost:3000
   - Embedding service: http://localhost:3001
   - Supabase Studio: http://localhost:54323
   - Supabase DB: postgresql://postgres:postgres@localhost:54322/postgres
