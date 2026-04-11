# How Second Brain Works — A Complete Guide

> If you're new to AI, RAG, embeddings, or vector databases — this is for you.
> No jargon without explanation. Every concept builds on the previous one.

---

## Table of Contents

1. [The Problem We're Solving](#1-the-problem-were-solving)
2. [The Big Picture](#2-the-big-picture)
3. [What Are Embeddings?](#3-what-are-embeddings)
4. [What Is a Vector Database?](#4-what-is-a-vector-database)
5. [The Upload Pipeline (Step by Step)](#5-the-upload-pipeline)
6. [What Is RAG?](#6-what-is-rag)
7. [The Chat Pipeline (Step by Step)](#7-the-chat-pipeline)
8. [The Knowledge Graph](#8-the-knowledge-graph)
9. [Glossary](#9-glossary)

---

## 1. The Problem We're Solving

Imagine you have 200 documents — PDFs, notes, research papers, meeting transcripts. You want to ask:

> "What did we decide about the pricing strategy?"

Your options without Second Brain:
- Open every document manually and Ctrl+F — takes hours
- Use Google Drive search — only finds **exact keyword matches**, misses documents that say "cost structure" or "revenue model" instead of "pricing strategy"
- Ask ChatGPT — it has never seen your documents

**Second Brain solves this.** Upload your documents once. Then ask questions in plain English. The system finds the right information even when the **words don't match** — because it understands **meaning**.

---

## 2. The Big Picture

Second Brain has two main flows:

### Flow 1: Upload (happens once per document)
```
Your File  →  Extract Text  →  Split into Chunks  →  Convert to Numbers  →  Store
```

### Flow 2: Chat (happens every time you ask a question)
```
Your Question  →  Convert to Numbers  →  Find Similar Chunks  →  Feed to AI  →  Answer
```

The magic ingredient in both flows is **embeddings** — converting text into numbers that capture meaning. Let's understand that first.

---

## 3. What Are Embeddings?

### The Simple Explanation

An embedding is a way to represent text as a list of numbers. Not random numbers — numbers that capture what the text **means**.

Think of it like GPS coordinates for meaning:
- "Paris" might be at coordinates [48.8, 2.3] on a map
- "Lyon" might be at [45.7, 4.8] — nearby because it's also in France
- "Tokyo" might be at [35.6, 139.6] — far away because it's a different country

Embeddings work the same way, but instead of 2 coordinates (latitude, longitude), we use **384 numbers** to capture meaning in a much richer "meaning space."

### A Concrete Example

When the embedding model processes text, it produces 384 numbers:

```
"Machine learning is a type of artificial intelligence"
  → [0.023, -0.156, 0.891, 0.445, -0.032, ... ] (384 numbers total)

"AI systems that learn from data"
  → [0.019, -0.148, 0.887, 0.451, -0.028, ... ] (384 numbers total)

"How to bake chocolate cake"
  → [0.512, 0.334, -0.221, 0.067, 0.891, ... ] (384 numbers total)
```

Notice:
- The first two texts have **very similar numbers** — because they mean similar things
- The third text has **very different numbers** — because baking has nothing to do with AI

### Why 384 Numbers?

We use a model called **all-MiniLM-L6-v2**. The "384" is its output size. Think of it as having 384 different "axes of meaning" — some might capture topic (tech vs cooking), some might capture sentiment (positive vs negative), some might capture complexity (simple vs technical). The model learned these axes by reading millions of text examples during training.

### Why Not Just Use Keywords?

| Keyword Search | Embedding Search (Semantic) |
|---|---|
| "pricing strategy" only matches those exact words | Finds "cost structure", "revenue model", "how much to charge" |
| "happy" won't match "joyful" | "happy" matches "joyful", "delighted", "ecstatic" |
| Misses context and synonyms | Understands meaning regardless of word choice |
| Fast but dumb | Slightly slower but dramatically smarter |

This is why embeddings are the foundation of modern AI search.

---

## 4. What Is a Vector Database?

### First, What Is a Vector?

A vector is just a list of numbers. So an embedding IS a vector:

```
[0.023, -0.156, 0.891, ...] ← this is a vector with 384 dimensions
```

### What Does a Vector Database Do?

A vector database stores millions of these number-lists and can quickly answer: **"Which stored vectors are most similar to this new vector?"**

This is called **similarity search** or **nearest neighbor search**.

### How We Do It: pgvector

Instead of using a separate vector database like Pinecone or Weaviate, we use **pgvector** — an extension that adds vector capabilities to PostgreSQL (our regular database).

```
Regular PostgreSQL table:
┌────┬─────────────────┬──────────┐
│ id │ content          │ metadata │   ← normal columns
├────┼─────────────────┼──────────┤
│ 1  │ "Supervised..."  │ {...}    │
│ 2  │ "Deep learning." │ {...}    │
└────┴─────────────────┴──────────┘

With pgvector, we add:
┌────┬─────────────────┬──────────┬──────────────────────┐
│ id │ content          │ metadata │ embedding            │ ← vector column!
├────┼─────────────────┼──────────┼──────────────────────┤
│ 1  │ "Supervised..."  │ {...}    │ [0.02, -0.15, ...]   │
│ 2  │ "Deep learning." │ {...}    │ [0.08, 0.23, ...]    │
└────┴─────────────────┴──────────┴──────────────────────┘
```

When you search, pgvector uses **cosine similarity** — a math formula that measures the angle between two vectors. Vectors pointing in the same direction = similar meaning.

```
Cosine Similarity:
  1.0 = identical meaning
  0.7 = quite similar
  0.3 = somewhat related
  0.0 = completely unrelated
```

### Why pgvector Instead of Pinecone?

| Dedicated Vector DB (Pinecone) | pgvector (our choice) |
|---|---|
| Separate service to manage and pay for | Built into PostgreSQL — free |
| Your data lives in two places | Everything in one database |
| Better for billions of vectors | Great for up to millions |
| Extra network hops | Same database, same query |

For a personal knowledge base, pgvector is the sweet spot.

---

## 5. The Upload Pipeline

Here's exactly what happens when you upload `ml-basics.md`:

### Step 1: Parse — Extract Raw Text

Different file types need different parsers:

| File Type | Parser | What It Does |
|---|---|---|
| `.md` | Built-in | Reads the markdown as-is |
| `.txt` | Built-in | Reads plain text |
| `.pdf` | pdf-parse | Extracts text from PDF structure |
| `.docx` | mammoth | Extracts text from Word XML |
| `.csv` | papaparse | Converts rows to text with headers |

After parsing `ml-basics.md`, we have one big string:
```
"# Machine Learning\n## Supervised Learning\nTraining with labeled data..."
```

### Step 2: Chunk — Split Into Pieces

**Why chunk?** Two reasons:
1. **LLMs have limited context** — you can't paste a 100-page PDF into a prompt
2. **Precision** — if you search for "supervised learning," you want the specific paragraph about it, not the entire document

**Chunking rules:**
- **Default:** 500 words per chunk, with 50-word overlap between chunks
- **Markdown:** First split on `##` headings, then apply the 500-word limit to each section
- **CSV:** Each row becomes its own chunk (with column headers prepended)

**Why overlap?** Imagine a sentence that spans the boundary between two chunks. Without overlap, it gets split in half and loses meaning. The 50-word overlap ensures the sentence appears completely in at least one chunk.

```
Document: "...end of topic A. Start of topic B..."

Without overlap:
  Chunk 1: "...end of topic A."
  Chunk 2: "Start of topic B..."
  → The transition is lost!

With 50-word overlap:
  Chunk 1: "...end of topic A. Start of topic B..."
  Chunk 2: "...of topic A. Start of topic B. More details..."
  → The transition is preserved in both chunks!
```

For `ml-basics.md`, we get 3 chunks:
```
Chunk 0: "# Machine Learning ..."     (the intro)
Chunk 1: "## Supervised Learning ..."  (supervised section)
Chunk 2: "## Deep Learning ..."        (deep learning section)
```

### Step 3: Embed — Convert Each Chunk to Numbers

Each chunk is sent to our **embedding service** (a separate Express.js server running the all-MiniLM-L6-v2 model):

```
Chunk 1: "## Supervised Learning. Training with labeled data..."
                    │
                    ▼
         ┌──────────────────┐
         │  all-MiniLM-L6-v2 │  ← Neural network model
         │  (runs locally)    │     (~80MB, runs on CPU)
         └────────┬─────────┘
                  ▼
         [0.15, -0.08, 0.77, 0.33, ... ] (384 numbers)
```

This happens for every chunk. 3 chunks = 3 embedding vectors.

### Step 4: Store — Save Chunks + Embeddings in pgvector

```sql
-- What gets stored in the chunks table:
INSERT INTO chunks (document_id, content, embedding, chunk_index)
VALUES
  ('doc-123', '# Machine Learning...', '[0.02, -0.15, ...]', 0),
  ('doc-123', '## Supervised Learning...', '[0.15, -0.08, ...]', 1),
  ('doc-123', '## Deep Learning...', '[-0.03, 0.22, ...]', 2);
```

### Step 5: Update Status

The document status progresses through:
```
uploading → parsing → embedding → indexed
```

If any step fails, status becomes `error`.

**Your document is now searchable by meaning.**

---

## 6. What Is RAG?

**RAG = Retrieval-Augmented Generation**

It's a technique that makes AI answer from YOUR data instead of making things up.

### Why Do We Need RAG?

LLMs like GPT-4 or Llama have a problem: they were trained on internet data up to a certain date. They don't know about:
- Your personal documents
- Your company's internal docs
- Anything written after their training cutoff

Without RAG:
```
You: "What did our Q3 report say about revenue?"
LLM: "I don't have access to your Q3 report." (or worse, makes something up)
```

With RAG:
```
You: "What did our Q3 report say about revenue?"
System: [Searches your docs, finds the Q3 report chunk about revenue]
LLM: "According to your Q3 report, revenue grew 15% to $2.3M..."
```

### The Three Parts of RAG

| Letter | Stands For | What It Means |
|---|---|---|
| **R** | Retrieval | Search your documents for relevant chunks |
| **A** | Augmented | Inject those chunks into the AI prompt as context |
| **G** | Generation | AI reads the context and generates a natural language answer |

The AI never "memorizes" your documents. Every time you ask a question, the system retrieves the relevant chunks fresh and passes them to the AI. The AI is just very good at reading and summarizing.

---

## 7. The Chat Pipeline

Here's exactly what happens when you type: **"What is supervised learning?"**

### Step 1: Embed the Question

Your question gets converted to 384 numbers using the same model:

```
"What is supervised learning?"
  → [0.14, -0.08, 0.77, 0.29, ...]
```

This is critical — the question and the chunks were embedded by the **same model**, so they live in the **same meaning space**. Similar concepts will have similar numbers regardless of the exact words used.

### Step 2: Vector Search (Retrieval)

pgvector compares your question's embedding against every chunk's embedding:

```
Question: [0.14, -0.08, 0.77, ...]

vs Chunk "# Machine Learning..."          → 71% similar
vs Chunk "## Supervised Learning..."       → 94% similar  ← BEST MATCH!
vs Chunk "## Deep Learning..."             → 68% similar
vs Chunk "# Web Development..."            → 12% similar
vs Chunk "## Frontend frameworks..."       → 8% similar
```

The system returns the **top 5 most similar chunks**. This is the "Retrieval" step.

Note: it found "Supervised Learning" as the best match even though the chunk doesn't contain the word "What" or use a question format. It matched on **meaning**.

### Step 3: Build the Prompt (Augmented)

The system assembles a complete prompt for the LLM:

```
┌─────────────────────────────────────────────────┐
│ SYSTEM INSTRUCTIONS:                             │
│ "You are a helpful assistant. Answer using ONLY  │
│ the provided context. Cite source documents."    │
│                                                  │
│ RETRIEVED CONTEXT:                               │
│ [1] From "ml-basics.md":                         │
│     Supervised learning trains models with       │
│     labeled data. Common algorithms include      │
│     linear regression, decision trees...         │
│                                                  │
│ [2] From "ai-concepts.txt":                      │
│     Deep learning uses neural networks with      │
│     multiple hidden layers...                    │
│                                                  │
│ CONVERSATION HISTORY (last 6 messages):          │
│ (empty if this is the first question)            │
│                                                  │
│ USER QUESTION:                                   │
│ "What is supervised learning?"                   │
└─────────────────────────────────────────────────┘
```

This is the "Augmented" step — we augment the LLM with your specific data.

### Step 4: LLM Generates Answer (Generation)

The complete prompt goes to **Groq** (which runs Llama 3.3 70B):

```
Groq receives the prompt and generates:

"According to [ml-basics.md], supervised learning is a method
 of training machine learning models using labeled data. The
 model learns to map inputs to expected outputs. Common
 algorithms include linear regression, decision trees..."
```

The LLM streams the response **token by token** (roughly word by word). Each token is sent to your browser immediately via **Server-Sent Events (SSE)** — that's why you see the answer appearing word by word in real time.

### Step 5: Display and Save

```
┌──────────────────────────────────────────────┐
│ Browser displays:                             │
│                                               │
│ You: What is supervised learning?             │
│                                               │
│ AI: According to [ml-basics.md], supervised   │
│     learning is a method of training...       │
│                                               │
│   [ml-basics.md]  [ai-concepts.txt]          │
│   ↑ source chips showing which docs were used │
└──────────────────────────────────────────────┘
```

The complete response + source documents are saved to the database so you can revisit the conversation later.

---

## 8. The Knowledge Graph

The knowledge graph is a **visual map of relationships** between your documents.

### How It Works

1. **Compute document-level embedding:** For each document, average all its chunk embeddings into one "summary" embedding

```
ml-basics.md has 3 chunks:
  Chunk 1 embedding: [0.02, -0.15, ...]
  Chunk 2 embedding: [0.15, -0.08, ...]
  Chunk 3 embedding: [-0.03, 0.22, ...]

Document embedding = average = [0.047, -0.003, ...]
```

2. **Compute pairwise similarity:** Compare every document against every other document

```
ml-basics.md    ↔ ai-concepts.txt  = 52% similar  ← connected!
ml-basics.md    ↔ web-dev.md       = 18% similar  ← not connected
ai-concepts.txt ↔ web-dev.md       = 11% similar  ← not connected
```

3. **Draw the graph:** Documents with similarity above the threshold (default 65%) get connected by an edge

```
  [ml-basics.md] ———————— [ai-concepts.txt]
       (purple)     52%        (teal)

  [web-dev.md]
    (purple)
    (floating alone — not similar enough to connect)
```

### What the Visual Elements Mean

| Element | Meaning |
|---|---|
| **Node size** | More chunks = bigger circle (larger documents are bigger) |
| **Node color** | File type: PDF=blue, Markdown=purple, Text=teal, Word=amber, CSV=green |
| **Edge (line)** | These two documents are semantically related |
| **Edge thickness** | Thicker = more similar |
| **Slider** | Adjust similarity threshold — lower shows more connections, higher shows only strong ones |

### Why It's Useful

- **Discover hidden connections:** Two documents you never thought were related might share concepts
- **Spot knowledge gaps:** Isolated nodes (no connections) might indicate topics you haven't explored deeply
- **Navigate your knowledge:** Click a node to see what it's related to, then chat about it

---

## 9. Glossary

| Term | Plain English |
|---|---|
| **Embedding** | A list of numbers that represents the meaning of text. Similar meanings → similar numbers. |
| **Vector** | Same thing as embedding — just the math term for "list of numbers." |
| **Dimension** | How many numbers in the list. We use 384 dimensions. |
| **Cosine Similarity** | A formula that measures how similar two vectors are. Ranges from 0 (unrelated) to 1 (identical). |
| **Chunk** | A small piece of a document (roughly a paragraph or section). |
| **pgvector** | A PostgreSQL extension that adds vector storage and similarity search. |
| **RAG** | Retrieval-Augmented Generation — find relevant docs first, then have AI answer from them. |
| **LLM** | Large Language Model — AI that generates text (GPT-4, Llama, Claude). |
| **Streaming (SSE)** | Server-Sent Events — a way to send data piece by piece so you see the answer forming in real time. |
| **Token** | Roughly one word or word-piece. LLMs think in tokens, not characters. |
| **Force-directed graph** | A physics simulation where connected nodes attract and unconnected nodes repel — creates a natural layout. |
| **Semantic search** | Searching by meaning, not by exact keyword match. Powered by embeddings. |
| **Context window** | The maximum amount of text an LLM can read at once. This is why we chunk documents. |

---

## The Architecture at a Glance

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
              │  Embedding  │    │  Groq API  │
              │  Service    │    │  (LLM)     │
              │  (local)    │    │  (cloud)   │
              └────────────┘    └────────────┘

Embedding Service: Converts text → 384 numbers (runs locally, free)
Groq API: Generates natural language answers (cloud, free tier)
Supabase: Stores everything — users, documents, chunks, embeddings, chat history
Next.js: Handles all the logic — upload pipeline, RAG pipeline, streaming, UI
```

---

*This document was written for the Second Brain project. For technical details, see `second-brain-prd.md` and `CLAUDE.md`.*
