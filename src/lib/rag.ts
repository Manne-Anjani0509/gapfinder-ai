import type { TextChunk, Citation } from '../types/index.ts';

/**
 * Calculates cosine similarity between two dense vectors.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'can', 'could',
  'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'has',
  'have', 'having', 'he', 'her', 'here', 'hers', 'him', 'himself', 'his', 'how', 'i', 'if', 'in', 'into',
  'is', 'it', 'its', 'itself', 'just', 'me', 'more', 'most', 'my', 'myself', 'no', 'nor', 'not', 'now',
  'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our', 'ours', 'out', 'over', 'own', 'same', 'she',
  'should', 'so', 'some', 'such', 'than', 'that', 'the', 'their', 'theirs', 'them', 'then', 'there',
  'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we',
  'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'would', 'you', 'your'
]);

export function tokenize(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

  const tokens = [...words];
  // Add bigrams for exact technical terminology matching
  for (let i = 0; i < words.length - 1; i++) {
    tokens.push(`${words[i]}_${words[i + 1]}`);
  }
  return tokens;
}

/**
 * Deterministic BM25 / TF-IDF Retrieval Engine
 */
export function bm25Retrieve(
  query: string,
  chunks: TextChunk[],
  topK: number = 3
): { chunk: TextChunk; score: number }[] {
  if (!chunks || chunks.length === 0) return [];
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  const N = chunks.length;
  const df: Record<string, number> = {};
  const chunkTokensList = chunks.map((c) => {
    const tokens = tokenize(`${c.text} ${c.sectionHeading || ''} ${(c.topicTags || []).join(' ')}`);
    const uniqueTokens = new Set(tokens);
    for (const token of uniqueTokens) {
      df[token] = (df[token] || 0) + 1;
    }
    return tokens;
  });

  const avgDocLength =
    chunkTokensList.reduce((acc, curr) => acc + curr.length, 0) / Math.max(1, N);

  const k1 = 1.5;
  const b = 0.75;

  const scored = chunks.map((chunk, idx) => {
    const docTokens = chunkTokensList[idx];
    const docLength = docTokens.length;
    let score = 0;

    const tf: Record<string, number> = {};
    for (const t of docTokens) {
      tf[t] = (tf[t] || 0) + 1;
    }

    for (const qToken of queryTokens) {
      const termFreq = tf[qToken] || 0;
      if (termFreq > 0) {
        const docFreq = df[qToken] || 1;
        const idf = Math.log((N - docFreq + 0.5) / (docFreq + 0.5) + 1);
        const termScore =
          idf * ((termFreq * (k1 + 1)) / (termFreq + k1 * (1 - b + b * (docLength / avgDocLength))));
        score += termScore;
      }
    }

    // Boost if section heading contains query terms
    if (chunk.sectionHeading) {
      const headingTokens = tokenize(chunk.sectionHeading);
      const overlap = queryTokens.filter((t) => headingTokens.includes(t));
      if (overlap.length > 0) {
        score += overlap.length * 1.6;
      }
    }

    return { chunk, score };
  });

  return scored
    .filter((item) => item.score > 0.05)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

/**
 * Hybrid retrieval combining Dense Vector Cosine Similarity and Lexical BM25
 */
export function hybridRetrieve(
  query: string,
  chunks: TextChunk[],
  queryEmbedding: number[],
  topK: number = 3
): { chunk: TextChunk; score: number }[] {
  const bm25Results = bm25Retrieve(query, chunks, chunks.length);
  const bm25Map = new Map<string, number>();
  const maxBm25 = bm25Results.length > 0 ? Math.max(...bm25Results.map((r) => r.score), 1) : 1;

  for (const res of bm25Results) {
    bm25Map.set(res.chunk.id, res.score / maxBm25);
  }

  const scored = chunks.map((chunk) => {
    let vectorScore = 0;
    if (chunk.embedding && chunk.embedding.length > 0) {
      vectorScore = Math.max(0, cosineSimilarity(queryEmbedding, chunk.embedding));
    }
    const lexicalScore = bm25Map.get(chunk.id) || 0;

    // Reciprocal / linear hybrid weighting: 0.65 vector + 0.35 lexical
    const combinedScore = chunk.embedding
      ? vectorScore * 0.65 + lexicalScore * 0.35
      : lexicalScore;

    return { chunk, score: combinedScore };
  });

  return scored
    .filter((item) => item.score > 0.1)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

export type RetrievalMethodType =
  | 'Hybrid (pgvector Embeddings + Lexical BM25)'
  | 'Gemini Vector Embeddings (Cosine Similarity)'
  | 'Deterministic BM25 / TF-IDF Semantic Retrieval';

/**
 * Primary RAG entrypoint: Executes grounded retrieval with verifiable citations and strict context validation.
 */
export async function retrieveRelevantChunks(
  query: string,
  chunks: TextChunk[],
  topK: number = 3,
  geminiEmbeddingsClient?: {
    embedQuery: (q: string) => Promise<number[] | null>;
  }
): Promise<{
  citations: Citation[];
  retrievalMethod: RetrievalMethodType;
  insufficientContext: boolean;
}> {
  if (!chunks || chunks.length === 0) {
    return {
      citations: [],
      retrievalMethod: 'Deterministic BM25 / TF-IDF Semantic Retrieval',
      insufficientContext: true,
    };
  }

  // 1. Try Vector / Hybrid Retrieval if embedding client is provided
  if (geminiEmbeddingsClient) {
    try {
      const queryVec = await geminiEmbeddingsClient.embedQuery(query);
      if (queryVec && queryVec.length > 0) {
        const hasEmbeddings = chunks.some((c) => c.embedding && c.embedding.length > 0);
        if (hasEmbeddings) {
          const hybridResults = hybridRetrieve(query, chunks, queryVec, topK);
          const topScore = hybridResults[0]?.score || 0;
          const insufficient = topScore < 0.28;

          const citations: Citation[] = hybridResults.map((s) => ({
            documentId: s.chunk.materialId,
            materialId: s.chunk.materialId,
            materialTitle: s.chunk.materialTitle,
            chunkId: s.chunk.id,
            chunkText: s.chunk.text,
            similarityScore: Math.round(s.score * 100) / 100,
            sectionHeading: s.chunk.sectionHeading,
            pageNumber: s.chunk.pageNumber,
          }));

          return {
            citations,
            retrievalMethod: 'Hybrid (pgvector Embeddings + Lexical BM25)',
            insufficientContext: insufficient,
          };
        }
      }
    } catch (err) {
      console.warn('Vector embedding retrieval error, falling back to BM25:', err);
    }
  }

  // 2. Fallback to Deterministic Lexical BM25
  const bm25Results = bm25Retrieve(query, chunks, topK);
  const insufficient = bm25Results.length === 0 || bm25Results[0].score < 0.2;

  const citations: Citation[] = bm25Results.map((res) => ({
    documentId: res.chunk.materialId,
    materialId: res.chunk.materialId,
    materialTitle: res.chunk.materialTitle,
    chunkId: res.chunk.id,
    chunkText: res.chunk.text,
    similarityScore: Math.round(res.score * 100) / 100,
    sectionHeading: res.chunk.sectionHeading,
    pageNumber: res.chunk.pageNumber,
  }));

  return {
    citations,
    retrievalMethod: 'Deterministic BM25 / TF-IDF Semantic Retrieval',
    insufficientContext: insufficient,
  };
}
