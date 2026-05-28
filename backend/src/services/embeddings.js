require('dotenv').config();

const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY;
const VOYAGE_MODEL = 'voyage-3';

const callVoyage = async (input, input_type) => {
  const response = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({
      model: VOYAGE_MODEL,
      input,
      input_type,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Voyage API error: ${err}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
};

const generateEmbedding = async (text) => {
  try {
    const cleaned = text.replace(/\s+/g, ' ').trim().slice(0, 8000);
    return await callVoyage(cleaned, 'document');
  } catch (err) {
    console.error('[Embeddings] Error generating embedding:', err.message);
    throw new Error('Failed to generate embedding: ' + err.message);
  }
};

const generateQueryEmbedding = async (text) => {
  try {
    const cleaned = text.replace(/\s+/g, ' ').trim().slice(0, 2000);
    return await callVoyage(cleaned, 'query');
  } catch (err) {
    console.error('[Embeddings] Error generating query embedding:', err.message);
    throw new Error('Failed to generate query embedding: ' + err.message);
  }
};

const chunkText = (text, chunkSize = 1000, overlap = 200) => {
  const chunks = [];
  let start = 0;
  const normalized = text.replace(/\s+/g, ' ').trim();

  while (start < normalized.length) {
    const end = Math.min(start + chunkSize, normalized.length);
    let chunk = normalized.slice(start, end);

    if (end < normalized.length) {
      const lastPeriod = chunk.lastIndexOf('. ');
      const lastNewline = chunk.lastIndexOf('\n');
      const breakPoint = Math.max(lastPeriod, lastNewline);
      if (breakPoint > chunkSize * 0.6) {
        chunk = chunk.slice(0, breakPoint + 1);
      }
    }

    if (chunk.trim().length > 50) chunks.push(chunk.trim());

    // 🔥 FIXED: Ensure we always make forward progress
    const nextStart = start + Math.max(chunk.length - overlap, 50);
    if (nextStart <= start) break; // Safety guard against infinite loop
    start = nextStart;
  }

  return chunks;
};

module.exports = { generateEmbedding, generateQueryEmbedding, chunkText };