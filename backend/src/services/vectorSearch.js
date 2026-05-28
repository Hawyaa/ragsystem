const { Pinecone } = require('@pinecone-database/pinecone');
require('dotenv').config();

let pineconeClient = null;
let pineconeIndex = null;

const initPinecone = async () => {
  try {
    pineconeClient = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    pineconeIndex = pineconeClient.index(process.env.PINECONE_INDEX_NAME);
    console.log(`✅ Pinecone connected to index: ${process.env.PINECONE_INDEX_NAME}`);
    return pineconeIndex;
  } catch (err) {
    console.error('❌ Pinecone init error:', err.message);
    throw err;
  }
};

const upsertVectors = async (vectors) => {
  if (!pineconeIndex) await initPinecone();
  if (!vectors || vectors.length === 0) throw new Error('upsertVectors called with empty array');

  console.log(`[Pinecone] Upserting ${vectors.length} vectors...`);

  try {
    const batchSize = 100;
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      const records = batch.map(v => ({ id: v.id, values: v.values, metadata: v.metadata }));
      await pineconeIndex.upsert({ records });
      console.log(`[Pinecone] ✅ Batch ${Math.floor(i / batchSize) + 1} upserted`);
    }
    return true;
  } catch (err) {
    console.error('[Pinecone] Upsert error:', err.message);
    throw err;
  }
};

const queryVectors = async (queryVector, topK = 5, filter = null) => {
  if (!pineconeIndex) await initPinecone();
  try {
    const queryParams = { vector: queryVector, topK, includeMetadata: true, includeValues: false };
    if (filter) queryParams.filter = filter;
    const result = await pineconeIndex.query(queryParams);
    return result.matches || [];
  } catch (err) {
    console.error('[Pinecone] Query error:', err.message);
    throw err;
  }
};

const deleteDocumentVectors = async (documentId) => {
  if (!pineconeIndex) await initPinecone();
  try {
    await pineconeIndex.deleteMany({ filter: { documentId: { '$eq': documentId } } });
    console.log(`[Pinecone] Deleted vectors for document: ${documentId}`);
  } catch (err) {
    console.warn(`[Pinecone] Vector delete skipped: ${err.message}`);
  }
};

const getIndexStats = async () => {
  if (!pineconeIndex) await initPinecone();
  return await pineconeIndex.describeIndexStats();
};

module.exports = { initPinecone, upsertVectors, queryVectors, deleteDocumentVectors, getIndexStats };