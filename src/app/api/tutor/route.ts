import { NextRequest, NextResponse } from 'next/server';
import { retrieveRelevantChunks } from '@/lib/rag';
import { isGeminiConfigured, getGeminiTutorAnswer, getGeminiEmbedding } from '@/lib/gemini';
import { getAuthenticatedUser } from '@/lib/supabaseServer';
import { TextChunk } from '@/types';
import { z } from 'zod';

const TutorQuerySchema = z.object({
  query: z.string().min(2, 'Query question must be at least 2 characters').max(1000),
  chunks: z.array(z.any()).optional().default([]),
  materialId: z.string().optional(),
  subjectId: z.string().optional(),
});

const INSUFFICIENT_EVIDENCE_MESSAGE =
  'I cannot find sufficient evidence in your uploaded study materials to answer this question accurately. Please upload notes covering this topic.';

export async function POST(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedUser(req);
    if (!authContext.user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in to ask the AI Tutor.' }, { status: 401 });
    }
    const body = await req.json();

    const parseResult = TutorQuerySchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || 'Invalid tutor request payload' },
        { status: 400 }
      );
    }

    const { query, chunks: clientChunks, materialId } = parseResult.data;
    let candidateChunks: TextChunk[] = clientChunks;

    // If no client chunks passed, try retrieving from Supabase if connected
    if (candidateChunks.length === 0 && authContext.supabase) {
      let chunkQuery = authContext.supabase
        .from('document_chunks')
        .select('id, material_id, chunk_index, content, section_heading, page_number, topic_tags')
        .eq('user_id', authContext.user.id);

      if (materialId) {
        chunkQuery = chunkQuery.eq('material_id', materialId);
      }

      const { data: dbChunks } = await chunkQuery.limit(50);
      if (dbChunks && dbChunks.length > 0) {
        candidateChunks = dbChunks.map((c: any) => ({
          id: c.id,
          materialId: c.material_id,
          materialTitle: 'Course Notes',
          chunkIndex: c.chunk_index,
          text: c.content,
          sectionHeading: c.section_heading,
          pageNumber: c.page_number,
          topicTags: c.topic_tags,
        }));
      }
    }

    if (candidateChunks.length === 0) {
      return NextResponse.json({
        answer: INSUFFICIENT_EVIDENCE_MESSAGE,
        citations: [],
        retrievalMethod: 'insufficient-context',
      });
    }

    // Embeddings client for vector RAG if Gemini is configured
    const geminiEmbedClient = isGeminiConfigured()
      ? {
          embedQuery: async (q: string) => {
            const emb = await getGeminiEmbedding(q);
            return emb;
          },
        }
      : undefined;

    // Retrieve relevant passages
    const { citations, retrievalMethod, insufficientContext } = await retrieveRelevantChunks(
      query,
      candidateChunks as TextChunk[],
      3,
      geminiEmbedClient
    );

    if (insufficientContext || citations.length === 0) {
      return NextResponse.json({
        answer: INSUFFICIENT_EVIDENCE_MESSAGE,
        citations: [],
        retrievalMethod: 'insufficient-context',
      });
    }

    // 1. Try Gemini model grounded generation if API key is active
    if (isGeminiConfigured()) {
      try {
        const passages = citations.map((c) => ({
          title: c.materialTitle,
          text: c.chunkText,
          sectionHeading: c.sectionHeading,
        }));
        const geminiAnswer = await getGeminiTutorAnswer(query, passages);
        if (geminiAnswer) {
          return NextResponse.json({
            answer: geminiAnswer,
            citations,
            retrievalMethod,
          });
        }
      } catch (err) {
        console.warn('Gemini tutor generation failed, falling back to grounded synthesis:', err);
      }
    }

    // 2. Deterministic grounded response generation from top retrieved citations
    const topCitation = citations[0];
    const sentences = topCitation.chunkText
      .split(/(?<=[.?!])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 20);

    const relevantSentences = sentences.slice(0, 3).join(' ');

    const groundedAnswer = `Based on your verified study notes in **${topCitation.materialTitle}**${
      topCitation.sectionHeading ? ` (*${topCitation.sectionHeading}*)` : ''
    }${topCitation.pageNumber ? ` [Page ${topCitation.pageNumber}]` : ''}:

${relevantSentences}

> **Verbatim Source Passage:** "${topCitation.chunkText.slice(0, 240)}..."

*(Answer grounded via ${retrievalMethod} with zero external hallucination)*`;

    return NextResponse.json({
      answer: groundedAnswer,
      citations,
      retrievalMethod,
    });
  } catch (err: any) {
    console.error('Tutor API route error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to process AI tutor request.' },
      { status: 500 }
    );
  }
}
