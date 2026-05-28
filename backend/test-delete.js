// test-delete.js
require('dotenv').config();
const { query } = require('./src/db/postgres');
const { deleteDocumentVectors } = require('./src/services/vectorSearch');

(async () => {
  // Get first document ID from DB
  const result = await query('SELECT id, original_name FROM documents LIMIT 1');
  if (result.rows.length === 0) {
    console.log('No documents found in DB');
    process.exit(0);
  }

  const doc = result.rows[0];
  console.log(`Testing delete for: ${doc.original_name} (${doc.id})`);

  // Test Pinecone delete
  try {
    await deleteDocumentVectors(doc.id);
    console.log('✅ Pinecone delete worked');
  } catch (err) {
    console.log('❌ Pinecone delete failed:', err.message);
  }

  // Test DB delete
  try {
    await query('DELETE FROM documents WHERE id = $1', [doc.id]);
    console.log('✅ DB delete worked');
  } catch (err) {
    console.log('❌ DB delete failed:', err.message);
  }

  process.exit(0);
})();
