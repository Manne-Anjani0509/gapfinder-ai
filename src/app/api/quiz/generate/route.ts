import { NextRequest, NextResponse } from 'next/server';
import { QuizQuestion, TextChunk } from '@/types';
import { isGeminiConfigured, getGeminiQuizQuestions } from '@/lib/gemini';
import { getAuthenticatedUser } from '@/lib/supabaseServer';
import { storeQuizQuestions } from '@/lib/quizStore';
import { z } from 'zod';

const GenerateQuizSchema = z.object({
  chunks: z.array(z.any()).min(1, 'At least one study material chunk is required'),
  topicName: z.string().optional(),
  materialTitle: z.string().optional(),
  materialId: z.string().optional(),
  subjectId: z.string().optional(),
  count: z.number().int().min(2).max(10).default(5),
});

export async function POST(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedUser(req);
    if (!authContext.user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in to generate quizzes.' }, { status: 401 });
    }
    const body = await req.json();

    const parseResult = GenerateQuizSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || 'Invalid quiz generation payload' },
        { status: 400 }
      );
    }

    const { chunks, topicName, materialTitle, count, materialId } = parseResult.data;
    const requestedCount = count;
    const generatedQuestions: QuizQuestion[] = [];
    const attemptId = `attempt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // 1. Try Gemini if configured
    if (isGeminiConfigured()) {
      try {
        const sampleChunks = chunks.slice(0, 4);
        const combinedPassage = sampleChunks.map((c: TextChunk) => c.text).join('\n\n');
        const geminiQuestions = await getGeminiQuizQuestions(
          topicName || 'General Concepts',
          materialTitle || 'Study Material',
          combinedPassage,
          requestedCount
        );

        if (geminiQuestions && geminiQuestions.length > 0) {
          for (let i = 0; i < geminiQuestions.length; i++) {
            const gq = geminiQuestions[i];
            const qId = `quiz-q-gemini-${Date.now()}-${i}`;
            generatedQuestions.push({
              id: qId,
              topicId: chunks[0]?.id || `topic-${i}`,
              topicName: topicName || chunks[0]?.sectionHeading || 'Key Concept',
              materialId: materialId || chunks[0]?.materialId || 'material-1',
              materialTitle: materialTitle || chunks[0]?.materialTitle || 'Study Material',
              question: gq.question,
              options: gq.options as [string, string, string, string],
              correctIndex: gq.correctIndex,
              explanation: gq.explanation || 'Verified from the source text.',
              sourcePassage: gq.sourcePassage || chunks[0]?.text?.slice(0, 300) || '',
              difficulty: gq.difficulty || 'medium',
            });
          }
        }
      } catch (err) {
        console.warn('Gemini quiz generation error, switching to deterministic generator:', err);
      }
    }

    // 2. If Gemini didn't produce enough questions, use deterministic grounded question synthesizer
    if (generatedQuestions.length < requestedCount) {
      const remaining = requestedCount - generatedQuestions.length;
      const deterministicQuestions = generateDeterministicQuestions(
        chunks,
        topicName,
        materialTitle,
        remaining
      );
      generatedQuestions.push(...deterministicQuestions);
    }

    if (generatedQuestions.length === 0) {
      return NextResponse.json(
        { error: 'Unable to extract diagnostic questions from the provided passages.' },
        { status: 422 }
      );
    }

    // Store questions in server store for server-side grading and verification
    storeQuizQuestions(generatedQuestions);

    // If Supabase is available, persist questions for persistent server grading
    if (authContext.supabase) {
      try {
        const rows = generatedQuestions.map((q) => ({
          user_id: authContext.user.id,
          topic_name: q.topicName,
          question: q.question,
          options: q.options,
          correct_index: q.correctIndex,
          explanation: q.explanation,
          source_passage: q.sourcePassage,
          difficulty: q.difficulty,
        }));
        await authContext.supabase.from('quiz_questions').insert(rows);
      } catch (dbErr) {
        console.warn('Could not persist quiz questions to Supabase:', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      attemptId,
      questions: generatedQuestions,
      generatedWith: isGeminiConfigured() ? 'Gemini Generative Engine' : 'Deterministic Grounded Synthesizer',
    });
  } catch (err: any) {
    console.error('Quiz generation route error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to generate diagnostic quiz.' },
      { status: 500 }
    );
  }
}

/**
 * Deterministic grounded question synthesizer that extracts verbatim facts, definitions,
 * and contrasts from document chunks, guaranteeing 4 valid options and verifiable grounding.
 */
function generateDeterministicQuestions(
  chunks: TextChunk[],
  topicName?: string,
  materialTitle?: string,
  count: number = 5
): QuizQuestion[] {
  const questions: QuizQuestion[] = [];
  const allSentences: { text: string; chunk: TextChunk }[] = [];

  for (const chunk of chunks) {
    const rawSentences = (chunk.text || '')
      .split(/(?<=[.?!])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 35 && s.length < 240);

    for (const s of rawSentences) {
      allSentences.push({ text: s, chunk });
    }
  }

  const definitionPatterns = [
    { regex: /^(.*?)\s+(?:is defined as|refers to|is a method of|is a set of)\s+(.*)$/i, type: 'definition' },
    { regex: /^(.*?)\s+(?:functions as|acts as|serves as|plays a key role in)\s+(.*)$/i, type: 'function' },
    { regex: /^(.*?)\s+(?:occurs in|takes place in|is located in)\s+(.*)$/i, type: 'location' },
    { regex: /^(.*?)\s+(?:causes|triggers|leads to|results in)\s+(.*)$/i, type: 'causal' },
    { regex: /^(.*?)\s+(?:replaces|evicts|converts|oxidizes)\s+(.*)$/i, type: 'action' },
  ];

  let qIndex = 0;

  for (const { text, chunk } of allSentences) {
    if (questions.length >= count) break;

    for (const pattern of definitionPatterns) {
      const match = text.match(pattern.regex);
      if (match) {
        const subject = match[1].replace(/^[#\s*-]+/, '').trim();
        const predicate = match[2].replace(/[.]+$/, '').trim();

        if (subject.length > 3 && subject.length < 50 && predicate.length > 15) {
          let qText = '';
          if (pattern.type === 'definition') {
            qText = `According to the material, what is ${subject}?`;
          } else if (pattern.type === 'function') {
            qText = `What is the primary function of ${subject}?`;
          } else if (pattern.type === 'location') {
            qText = `Where does ${subject} take place or occur?`;
          } else if (pattern.type === 'causal') {
            qText = `What is triggered or caused by ${subject}?`;
          } else {
            qText = `Based on the text, what does ${subject} do?`;
          }

          const correctAnswer = predicate.charAt(0).toUpperCase() + predicate.slice(1);

          const otherPredicates = allSentences
            .filter((s) => s.text !== text)
            .map((s) => {
              const subMatch = s.text.match(pattern.regex);
              return subMatch ? subMatch[2].replace(/[.]+$/, '').trim() : null;
            })
            .filter(Boolean) as string[];

          const distractor1 =
            otherPredicates[0] ||
            `It bypasses all checks and operates independently without memory or cycle constraints.`;
          const distractor2 =
            otherPredicates[1] ||
            `It permanently deallocates secondary storage without updating the table registry.`;
          const distractor3 =
            otherPredicates[2] ||
            `It acts as an external auxiliary subsystem unrelated to ${subject}.`;

          const targetIndex = qIndex % 4;
          const options: [string, string, string, string] = ['', '', '', ''];
          const distractors = [distractor1, distractor2, distractor3];
          let distractorIdx = 0;

          for (let opt = 0; opt < 4; opt++) {
            if (opt === targetIndex) {
              options[opt] = correctAnswer;
            } else {
              options[opt] = distractors[distractorIdx++] || `Alternative mechanism not specified in text`;
            }
          }

          questions.push({
            id: `det-q-${Date.now()}-${qIndex++}`,
            topicId: chunk.id,
            topicName: topicName || chunk.sectionHeading || subject,
            materialId: chunk.materialId,
            materialTitle: materialTitle || chunk.materialTitle,
            question: qText,
            options,
            correctIndex: targetIndex,
            explanation: `As stated in the source text: "${text}"`,
            sourcePassage: text,
            difficulty: 'medium',
          });

          break;
        }
      }
    }
  }

  // Cloze sentence fallback
  if (questions.length < count) {
    for (const { text, chunk } of allSentences) {
      if (questions.length >= count) break;
      if (questions.some((q) => q.sourcePassage === text)) continue;

      const words = text.split(/\s+/);
      if (words.length > 8) {
        const keyWord = words.find((w) => w.length > 6 && /^[a-zA-Z]+$/.test(w)) || words[3];
        const blankedSentence = text.replace(new RegExp(`\\b${keyWord}\\b`, 'i'), '__________');

        const options: [string, string, string, string] = [
          keyWord,
          'De-allocation',
          'Linear extrapolation',
          'Auxiliary buffer',
        ];
        const targetIdx = questions.length % 4;
        const temp = options[0];
        options[0] = options[targetIdx];
        options[targetIdx] = temp;

        questions.push({
          id: `det-cloze-${Date.now()}-${questions.length}`,
          topicId: chunk.id,
          topicName: topicName || chunk.sectionHeading || 'Key Statement',
          materialId: chunk.materialId,
          materialTitle: materialTitle || chunk.materialTitle,
          question: `Fill in the blank: "${blankedSentence}"`,
          options,
          correctIndex: targetIdx,
          explanation: `The accurate term from the text is "${keyWord}". Full context: "${text}"`,
          sourcePassage: text,
          difficulty: 'medium',
        });
      }
    }
  }

  return questions;
}
