import { NextResponse } from 'next/server';
import { isGeminiConfigured, GENERATION_MODEL, EMBEDDING_MODEL, EMBEDDING_DIMENSION } from '@/lib/gemini';
import { isSupabaseConfigured } from '@/lib/supabase';
import { isSupabaseServerConfigured } from '@/lib/supabaseServer';

export async function GET() {
  const gemini = isGeminiConfigured();
  const supabase = isSupabaseConfigured() || isSupabaseServerConfigured();

  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    geminiConfigured: gemini,
    supabaseConfigured: supabase,
    activeModel: gemini ? `${GENERATION_MODEL} (Google AI Studio)` : 'Local Deterministic AI Engine (Offline Ready)',
    storageMode: supabase ? 'Supabase PostgreSQL (pgvector enabled)' : 'Local Browser Storage',
    models: {
      generation: gemini ? GENERATION_MODEL : 'Deterministic Sentence Synthesizer',
      embedding: gemini ? EMBEDDING_MODEL : 'BM25 / TF-IDF Vector Space',
      embeddingDimension: EMBEDDING_DIMENSION,
    },
    features: {
      vectorRAG: gemini ? `Dense Vector Cosine Similarity (${EMBEDDING_MODEL})` : 'Deterministic BM25 / TF-IDF Vector Space',
      tutorGeneration: gemini ? `${GENERATION_MODEL} Grounded Assistant` : 'Verifiable Extract Synthesizer',
      quizGeneration: gemini ? `${GENERATION_MODEL} Structured MCQs` : 'Deterministic Concept Extractor',
      serverSideGrading: true,
      rowLevelSecurity: supabase,
    },
    endpoints: [
      '/api/status',
      '/api/materials/upload',
      '/api/materials',
      '/api/topics',
      '/api/quiz/generate',
      '/api/quiz/submit',
      '/api/gap-report',
      '/api/revision',
      '/api/revision/tasks',
      '/api/tutor',
      '/api/progress',
    ],
  });
}
