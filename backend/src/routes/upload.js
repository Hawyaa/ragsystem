require('dotenv').config();
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const mammoth = require('mammoth');
const adminAuth = require('../middleware/adminAuth');
const { query } = require('../db/postgres');
const { generateEmbedding } = require('../services/embeddings');
const { upsertVectors } = require('../services/vectorSearch');

const chunkText = (text, chunkSize = 1000, overlap = 200) => {
  const chunks = [];
  let start = 0;
  const normalized = text.replace(/\s+/g, ' ').trim();

  console.log(`[chunkText] Input length: ${normalized.length}`);

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

    const advance = Math.max(chunk.length - overlap, 50);
    start += advance;
  }

  console.log(`[chunkText] Total chunks: ${chunks.length}`);
  return chunks;
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const unique = `${uuidv4()}-${Date.now()}`;
    cb(null, unique + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.pdf', '.txt', '.docx', '.md'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${ext}. Allowed: ${allowed.join(', ')}`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 },
});

const extractTextFromPDF = (filePath) => {
  return new Promise((resolve, reject) => {
    const { PdfReader } = require('pdfreader');
    const items = [];

    new PdfReader().parseFileItems(filePath, (err, item) => {
      if (err) return reject(new Error('PDF read error: ' + err.message));
      if (!item) {
        const text = items.join(' ');
        if (text.trim().length === 0) {
          return reject(new Error('No text extracted from PDF. It may be a scanned/image PDF.'));
        }
        return resolve(text);
      }
      if (item.page) items.push('\n');
      if (item.text) items.push(item.text);
    });
  });
};

const extractText = async (filePath, fileType) => {
  switch (fileType) {
    case '.pdf':
      return await extractTextFromPDF(filePath);
    case '.docx': {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    }
    case '.txt':
    case '.md':
      return fs.readFileSync(filePath, 'utf8');
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
};

router.post('/', adminAuth, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const { originalname, filename, path: filePath } = req.file;
  const fileType = path.extname(originalname).toLowerCase();
  const documentId = uuidv4();

  console.log(`[Upload] Processing: ${originalname} (${fileType})`);

  await query(`
    INSERT INTO documents (id, filename, original_name, file_type, status)
    VALUES ($1, $2, $3, $4, 'processing')
  `, [documentId, filename, originalname, fileType]);

  res.status(202).json({
    message: 'File uploaded and processing started',
    documentId,
    filename: originalname,
    status: 'processing',
  });

  (async () => {
    try {
      console.log(`[Upload] Extracting text from ${originalname}...`);
      const rawText = await extractText(filePath, fileType);

      if (!rawText || rawText.trim().length < 10) {
        throw new Error('Extracted text is too short or empty.');
      }

      console.log(`[Upload] Text extracted: ${rawText.length} characters`);

      const chunks = chunkText(rawText, 1000, 200);

      if (chunks.length === 0) {
        throw new Error('No chunks generated. Text may be too short.');
      }

      console.log(`[Upload] Created ${chunks.length} chunks`);

      const vectors = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`[Upload] Embedding chunk ${i + 1}/${chunks.length} (${chunk.length} chars)...`);

        const embedding = await generateEmbedding(chunk);

        if (!embedding || !Array.isArray(embedding)) {
          throw new Error(`Invalid embedding returned for chunk ${i}`);
        }

        vectors.push({
          id: `${documentId}-chunk-${i}`,
          values: embedding,
          metadata: {
            documentId,
            documentName: originalname,
            chunkIndex: i,
            text: chunk,
            fileType,
            uploadedAt: new Date().toISOString(),
          },
        });

        if (i < chunks.length - 1) {
          await new Promise(r => setTimeout(r, 25000));
        }
      }

      console.log(`[Upload] Upserting ${vectors.length} vectors to Pinecone...`);
      await upsertVectors(vectors);

      await query(`
        UPDATE documents SET status = 'ready', chunk_count = $1 WHERE id = $2
      `, [chunks.length, documentId]);

      console.log(`[Upload] ✅ Done: ${originalname} (${chunks.length} chunks)`);

    } catch (err) {
      console.error(`[Upload] ❌ Failed:`, err.message);
      await query(`
        UPDATE documents SET status = 'error', metadata = $1 WHERE id = $2
      `, [JSON.stringify({ error: err.message }), documentId]);
    } finally {
      try {
        fs.unlinkSync(filePath);
        console.log(`[Upload] Cleaned up temp file`);
      } catch (_) {}
    }
  })();
});

router.get('/documents', adminAuth, async (req, res) => {
  try {
    const result = await query(`
      SELECT id, original_name, file_type, chunk_count, status, uploaded_at, metadata
      FROM documents ORDER BY uploaded_at DESC
    `);
    return res.json({ documents: result.rows });
  } catch (err) {
    console.error('[Upload] Error fetching documents:', err);
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/documents/:id', adminAuth, async (req, res) => {
  try {
    try {
      const { deleteDocumentVectors } = require('../services/vectorSearch');
      await deleteDocumentVectors(req.params.id);
    } catch (pineconeErr) {
      console.warn('[Upload] Pinecone delete skipped:', pineconeErr.message);
    }
    await query('DELETE FROM documents WHERE id = $1', [req.params.id]);
    return res.json({ success: true, message: 'Document deleted successfully' });
  } catch (err) {
    console.error('[Upload] Error deleting document:', err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;