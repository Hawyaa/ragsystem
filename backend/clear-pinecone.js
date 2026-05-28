// clear-pinecone.js
require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');

(async () => {
  const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  const index = pc.index(process.env.PINECONE_INDEX_NAME);
  
  try {
    await index.deleteAll();
    console.log('✅ All vectors deleted from Pinecone!');
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
  process.exit(0);
})();
