---
name: explain
description: Explain an AI/RAG concept used in this project in simple terms
disable-model-invocation: true
---

The user wants to understand an AI or RAG concept. Explain $ARGUMENTS in simple terms:

1. **What it is** — one-sentence definition, no jargon
2. **Analogy** — relate it to something familiar (library, filing cabinet, etc.)
3. **How we use it** — point to the exact file/function in this project where it's implemented
4. **Why it matters** — what would break or be worse without it

Keep it short. Use examples from THIS project, not generic ones.

Common concepts in this project:
- Embeddings (converting text to numbers for comparison)
- Chunking (splitting documents into digestible pieces)
- Vector search / similarity search (finding related content)
- RAG (Retrieval-Augmented Generation — feeding relevant docs to an LLM)
- Cosine similarity (measuring how similar two embeddings are)
- pgvector (Postgres extension for storing/searching embeddings)
- Force-directed graph (physics simulation for laying out connected nodes)
- LLM adapter pattern (swappable AI provider)
