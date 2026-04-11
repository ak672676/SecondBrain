import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Model state — loads once on startup, stays in memory
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let extractor: any = null;
let modelLoaded = false;

// Load the embedding model on startup
async function loadModel() {
  console.log('Loading embedding model (all-MiniLM-L6-v2)...');
  console.log('First run will download ~80MB — subsequent starts load from cache.');

  // Dynamic import because @xenova/transformers is ESM
  const { pipeline } = await import('@xenova/transformers');
  extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  modelLoaded = true;
  console.log('Model loaded successfully.');
}

loadModel().catch((err) => {
  console.error('Failed to load model:', err);
  process.exit(1);
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', model: 'all-MiniLM-L6-v2', loaded: modelLoaded });
});

app.post('/embed', async (req, res) => {
  try {
    if (!modelLoaded || !extractor) {
      res.status(503).json({ error: 'Model still loading. Please try again in a moment.' });
      return;
    }

    const { texts } = req.body;

    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      res.status(400).json({ error: 'Request body must have a non-empty "texts" array.' });
      return;
    }

    // Generate embeddings for each text
    const embeddings: number[][] = [];

    for (const text of texts) {
      const output = await extractor(text, { pooling: 'mean', normalize: true });
      // output.data is a Float32Array of 384 numbers
      embeddings.push(Array.from(output.data as Float32Array));
    }

    res.json({ embeddings });
  } catch (err) {
    console.error('Embedding error:', err);
    res.status(500).json({ error: 'Failed to generate embeddings' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Embedding service running on port ${PORT}`);
});
