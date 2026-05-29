const { generateQueryEmbedding } = require('./embeddings');
const { queryVectors } = require('./vectorSearch');
const { generateRAGResponse, isGreeting } = require('./llm');

// Minimum similarity score to consider a result relevant (0-1)
// const MIN_RELEVANCE_SCORE = 0.72;
const MIN_RELEVANCE_SCORE = 0.72;

// Number of top chunks to retrieve
const TOP_K = 6;

/**
 * Main RAG pipeline: takes a user question and returns an AI answer.
 *
 * Flow:
 * 1. Detect greetings → respond directly
 * 2. Generate query embedding
 * 3. Search Pinecone for similar chunks
 * 4. Filter by relevance threshold
 * 5. Send to Claude with context
 * 6. Return structured response
 *
 * @param {string} question - User's question
 * @param {Array} conversationHistory - Previous turns [{role, content}]
 * @returns {{
 *   answer: string|null,
 *   isOutOfScope: boolean,
 *   confidenceScore: number,
 *   sourcesUsed: Array,
 *   retrievedChunks: number
 * }}
 */
const runRAGPipeline = async (question, conversationHistory = []) => {
  console.log(`[RAG] Processing question: "${question.slice(0, 80)}..."`);

  // Step 1: Handle greetings without vector search
  if (isGreeting(question)) {
    return {
      answer: "Hello! 👋 I'm your support assistant. How can I help you today?",
      isOutOfScope: false,
      confidenceScore: 1.0,
      sourcesUsed: [],
      retrievedChunks: 0,
    };
  }

  // Step 2: Generate embedding for the query
  console.log('[RAG] Generating query embedding...');
  const queryVector = await generateQueryEmbedding(question);

  // Step 3: Search Pinecone
  console.log(`[RAG] Querying Pinecone (topK=${TOP_K})...`);
  const rawMatches = await queryVectors(queryVector, TOP_K);

  // Step 4: Filter by relevance threshold
  const relevantChunks = rawMatches.filter(match => match.score >= MIN_RELEVANCE_SCORE);
  console.log(`[RAG] Found ${rawMatches.length} matches, ${relevantChunks.length} above threshold (${MIN_RELEVANCE_SCORE})`);

  // Step 5: Generate LLM response
  console.log('[RAG] Generating LLM response...');
  const { answer, isOutOfScope, confidenceScore, sourcesUsed } = await generateRAGResponse(
    question,
    relevantChunks,
    conversationHistory
  );

  return {
    answer,
    isOutOfScope,
    confidenceScore,
    sourcesUsed,
    retrievedChunks: relevantChunks.length,
  };
};

module.exports = { runRAGPipeline };
