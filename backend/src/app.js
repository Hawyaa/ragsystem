require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDB } = require('./db/postgres');
const { initPinecone } = require('./services/vectorSearch');

// Routes
const chatRoutes = require('./routes/chat');
const uploadRoutes = require('./routes/upload');
const conversationsRoutes = require('./routes/conversations');
const escalationsRoutes = require('./routes/escalations');

const app = express();
const PORT = process.env.PORT || 4000;

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} → ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/chat', chatRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/escalations', escalationsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[App] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

// ─── Startup ──────────────────────────────────────────────────────────────────
const start = async () => {
  try {
    console.log('🚀 Starting RAG Support Backend...');

    // Initialize DB
    await initDB();

    // Initialize Pinecone
    await initPinecone();

    app.listen(PORT, () => {
      console.log(`\n✅ Server running on http://localhost:${PORT}`);
      console.log(`📡 API Base: http://localhost:${PORT}/api`);
      console.log(`🏥 Health:   http://localhost:${PORT}/api/health\n`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
};

start();