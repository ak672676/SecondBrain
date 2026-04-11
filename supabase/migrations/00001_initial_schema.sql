-- Enable pgvector extension for embedding storage
create extension if not exists vector;

-- Users table (custom auth — not using Supabase Auth)
create table users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  email text unique not null,
  password_hash text not null,
  created_at timestamptz default now()
);

-- Documents table
create table documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  name text not null,
  file_type text not null,
  file_size integer,
  chunk_count integer default 0,
  status text default 'uploading' check (status in ('uploading', 'parsing', 'embedding', 'indexed', 'error')),
  storage_path text,
  created_at timestamptz default now()
);

create index idx_documents_user_id on documents(user_id);

-- Chunks table with pgvector (384 dimensions = all-MiniLM-L6-v2 output)
create table chunks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  document_id uuid references documents(id) on delete cascade not null,
  content text not null,
  embedding vector(384),
  chunk_index integer,
  created_at timestamptz default now()
);

-- ivfflat index for fast cosine similarity search
-- Works on empty tables; becomes effective once data is inserted
create index idx_chunks_embedding on chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create index idx_chunks_user_id on chunks(user_id);
create index idx_chunks_document_id on chunks(document_id);

-- Conversations table (chat history)
create table conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  title text,
  created_at timestamptz default now()
);

create index idx_conversations_user_id on conversations(user_id);

-- Messages table
create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  sources jsonb,
  created_at timestamptz default now()
);

create index idx_messages_conversation_id on messages(conversation_id);
