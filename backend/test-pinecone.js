// test-pinecone.js
require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');

(async () => {
  const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  const index = pc.index(process.env.PINECONE_INDEX_NAME);

  const fakeVector = Array(1024).fill(0.1);

  // Try method 1: records property
  try {
    await index.upsert({ records: [{ id: 'test-1', values: fakeVector }] });
    console.log('✅ Method 1 works (records property)');
    return;
  } catch (e) { console.log('❌ Method 1 failed:', e.message); }

  // Try method 2: plain array (standard)
  try {
    await index.upsert([{ id: 'test-2', values: fakeVector }]);
    console.log('✅ Method 2 works (plain array)');
    return;
  } catch (e) { console.log('❌ Method 2 failed:', e.message); }

  // Try method 3: namespace
  try {
    await index.namespace('').upsert([{ id: 'test-3', values: fakeVector }]);
    console.log('✅ Method 3 works (namespace)');
    return;
  } catch (e) { console.log('❌ Method 3 failed:', e.message); }

  // Try method 4: upsertRecords
  try {
    await index.upsertRecords([{ id: 'test-4', values: fakeVector }]);
    console.log('✅ Method 4 works (upsertRecords)');
  } catch (e) { console.log('❌ Method 4 failed:', e.message); }

})();