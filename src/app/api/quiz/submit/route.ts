import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabaseServer';
import { getQuizQuestion, markAttemptCompleted, isAttemptCompleted } from '@/lib/quizStore';
import { QuizSubmission, UserAnswerRecord } from '@/types';
import { z } from 'zod';

const SubmitQuizSchema = z.object({
  attemptId: z.string().min(1, 'Attempt ID is required'),
  quizTitle: z.string().optional(),
  materialId: z.string().optional(),
  subjectId: z.string().optional(),
  answers: z.array(
    z.object({
      questionId: z.string().min(1),
      selectedOptionIndex: z.number().int().min(-1).max(3),
      questionText: z.string().optional(),
      topicName: z.string().optional(),
      options: z.array(z.string()).optional(),
      fallbackCorrectIndex: z.number().int().min(0).max(3).optional(),
      explanation: z.string().optional(),
      sourcePassage: z.string().optional(),
    })
  ).min(1, 'At least one question response is required'),
});

export async function POST(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedUser(req);
    if (!authContext.user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in to submit quizzes.' }, { status: 401 });
    }
    const userId = authContext.user.id;
    const body = await req.json();

    const parseResult = SubmitQuizSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || 'Invalid quiz submission format' },
        { status: 400 }
      );
    }

    const { attemptId, quizTitle, materialId, subjectId, answers } = parseResult.data;

    // Prevent repeat submissions or replay attacks
    if (isAttemptCompleted(attemptId)) {
      return NextResponse.json(
        { error: 'This diagnostic attempt has already been submitted and scored.' },
        { status: 409 }
      );
    }

    let score = 0;
    const answerRecords: UserAnswerRecord[] = [];
    const topicBreakdown: Record<string, { total: number; correct: number; percentage: number }> = {};

    for (const ans of answers) {
      const storedQ = getQuizQuestion(ans.questionId);
      // Prioritize verified server-side question definition
      const correctIndex = storedQ ? storedQ.correctIndex : (ans.fallbackCorrectIndex ?? 0);
      const questionText = storedQ?.question || ans.questionText || 'Diagnostic Question';
      const topicName = storedQ?.topicName || ans.topicName || 'General';
      const explanation = storedQ?.explanation || ans.explanation || 'Verified from source material.';
      const sourcePassage = storedQ?.sourcePassage || ans.sourcePassage || '';

      const isCorrect = ans.selectedOptionIndex === correctIndex;
      if (isCorrect) score += 1;

      if (!topicBreakdown[topicName]) {
        topicBreakdown[topicName] = { total: 0, correct: 0, percentage: 0 };
      }
      topicBreakdown[topicName].total += 1;
      if (isCorrect) topicBreakdown[topicName].correct += 1;

      answerRecords.push({
        questionId: ans.questionId,
        questionText,
        selectedOptionIndex: ans.selectedOptionIndex,
        correctOptionIndex: correctIndex,
        isCorrect,
        topicName,
        explanation,
        sourcePassage,
      });
    }

    for (const tName of Object.keys(topicBreakdown)) {
      const stat = topicBreakdown[tName];
      stat.percentage = Math.round((stat.correct / stat.total) * 100);
    }

    const percentage = Math.round((score / answers.length) * 100);
    const resolvedTitle = quizTitle || `Diagnostic Assessment: ${new Date().toLocaleDateString()}`;

    const submission: QuizSubmission = {
      id: attemptId,
      quizTitle: resolvedTitle,
      materialId,
      timestamp: new Date().toISOString(),
      totalQuestions: answers.length,
      score,
      percentage,
      answers: answerRecords,
      topicBreakdown,
      isDemo: false,
    };

    // Mark attempt as completed
    markAttemptCompleted(attemptId);

    // If Supabase is connected, record attempt and update topic mastery
    if (authContext.supabase) {
      try {
        const { error: attemptErr } = await authContext.supabase.from('quiz_attempts').insert({
          id: attemptId.startsWith('attempt-') ? undefined : attemptId,
          user_id: userId,
          subject_id: subjectId,
          material_id: materialId,
          title: resolvedTitle,
          total_questions: answers.length,
          score,
          percentage,
          topic_breakdown: topicBreakdown,
          status: 'completed',
          is_demo: false,
        });

        if (attemptErr) {
          console.warn('Supabase quiz attempt insert warning:', attemptErr.message);
        }

        // Update topic mastery in Supabase
        for (const [tName, stat] of Object.entries(topicBreakdown)) {
          const { data: existing } = await authContext.supabase
            .from('topic_mastery')
            .select('*')
            .eq('user_id', userId)
            .eq('topic_name', tName)
            .maybeSingle();

          const newAttempted = (existing?.questions_attempted || 0) + stat.total;
          const newCorrect = (existing?.correct_answers || 0) + stat.correct;
          const newAccuracy = Math.round((newCorrect / newAttempted) * 100);

          let classification = 'Medium';
          if (newAccuracy < 50) classification = 'Weak';
          else if (newAccuracy >= 80) classification = 'Strong';

          let confidence = 'low';
          if (newAttempted >= 6) confidence = 'high';
          else if (newAttempted >= 3) confidence = 'medium';

          await authContext.supabase.from('topic_mastery').upsert({
            user_id: userId,
            topic_name: tName,
            questions_attempted: newAttempted,
            correct_answers: newCorrect,
            accuracy: newAccuracy,
            classification,
            confidence,
            attempt_count: (existing?.attempt_count || 0) + 1,
            last_assessed_at: new Date().toISOString(),
          }, { onConflict: 'user_id,topic_name' });
        }
      } catch (dbErr) {
        console.warn('Supabase persistence error during quiz submission:', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      submission,
      serverGraded: true,
    });
  } catch (err: any) {
    console.error('Quiz submit route error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to submit and grade diagnostic quiz.' },
      { status: 500 }
    );
  }
}
