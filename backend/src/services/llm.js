const Groq = require('groq-sdk');
require('dotenv').config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are a highly accurate and helpful customer support assistant. Your job is to answer customer questions using ONLY the provided knowledge base context.

STRICT RULES:
1. ONLY answer based on the provided context. Do NOT use your general training knowledge.
2. If the context does not contain enough information to answer the question confidently, say exactly: "OUT_OF_SCOPE" and nothing else.
3. Be concise, clear, and professional.
4. If you find a partial answer, share what you know and clearly state what you could not find.
5. Never make up information or guess.
6. For greetings (hello, hi, how are you), respond warmly and ask how you can help — do NOT say OUT_OF_SCOPE.
7. Format your answers in clean, readable markdown when appropriate.`;

const generateRAGResponse = async (userQuestion, contextChunks, conversationHistory = []) => {
  try {
    const contextText = contextChunks.length > 0
      ? contextChunks.map((chunk, i) =>
          `[Source ${i + 1}] (Relevance: ${(chunk.score * 100).toFixed(0)}%)\n${chunk.metadata.text}`
        ).join('\n\n---\n\n')
      : 'No relevant context found in the knowledge base.';

    const userMessage = `KNOWLEDGE BASE CONTEXT:
${contextText}

---

CUSTOMER QUESTION: ${userQuestion}

Remember: Only answer using the context above. If the context doesn't answer this question, respond with exactly "OUT_OF_SCOPE".`;

    const recentHistory = conversationHistory.slice(-10);
    const messages = [
      ...recentHistory.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMessage },
    ];

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1024,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages,
      ],
    });

    const answer = response.choices[0].message.content.trim();
    const isOutOfScope = answer === 'OUT_OF_SCOPE';
    const topScore = contextChunks.length > 0 ? contextChunks[0].score : 0;

    return {
      answer: isOutOfScope ? null : answer,
      isOutOfScope,
      confidenceScore: isOutOfScope ? 0 : topScore,
      sourcesUsed: isOutOfScope ? [] : contextChunks.slice(0, 3).map(c => ({
        documentName: c.metadata.documentName || 'Unknown',
        chunkIndex: c.metadata.chunkIndex,
        score: c.score,
      })),
    };
  } catch (err) {
    console.error('[LLM] Error generating response:', err.message);
    throw new Error('Failed to generate AI response: ' + err.message);
  }
};

const isGreeting = (text) => {
  const greetingPatterns = /^(hi|hello|hey|good morning|good afternoon|good evening|how are you|what's up|sup|greetings)/i;
  return greetingPatterns.test(text.trim());
};

module.exports = { generateRAGResponse, isGreeting };