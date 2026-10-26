import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabaseServer';
import { computeDeterministicGaps } from '@/lib/gapAnalysis';
import { DEMO_MATERIALS, DEMO_SUBMISSIONS } from '@/lib/demoData';

export async function GET(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedUser(req);
    const { searchParams } = new URL(req.url);
    const isDemo = searchParams.get('demo') === 'true' || authContext.isLocal;

    if (!isDemo && !authContext.user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    if (isDemo) {
      const { report, detailedTopics } = computeDeterministicGaps(DEMO_MATERIALS, DEMO_SUBMISSIONS, true);
      return NextResponse.json({
        success: true,
        report,
        detailedTopics,
        isDemo: true,
      });
    }

    if (authContext.supabase) {
      const userId = authContext.user.id;
      // Fetch authenticated student's materials
      const { data: materialsData } = await authContext.supabase
        .from('materials')
        .select('*')
        .eq('user_id', userId);

      // Fetch authenticated student's quiz attempts
      const { data: attemptsData } = await authContext.supabase
        .from('quiz_attempts')
        .select('*')
        .eq('user_id', userId);

      const materials = (materialsData || []).map((m: any) => ({
        id: m.id,
        title: m.title,
        fileName: m.file_name,
        fileType: m.file_type,
        wordCount: m.word_count,
        rawContent: m.raw_content || '',
        chunks: [],
        topics: [],
        status: m.status,
        createdAt: m.created_at,
        isDemo: false,
      }));

      const submissions = (attemptsData || []).map((a: any) => ({
        id: a.id,
        quizTitle: a.title,
        materialId: a.material_id,
        timestamp: a.created_at,
        totalQuestions: a.total_questions,
        score: a.score,
        percentage: Number(a.percentage),
        answers: [],
        topicBreakdown: a.topic_breakdown || {},
        isDemo: false,
      }));

      const { report, detailedTopics } = computeDeterministicGaps(materials, submissions, false);

      return NextResponse.json({
        success: true,
        report,
        detailedTopics,
        isDemo: false,
      });
    }

    // Default local fallback
    const { report, detailedTopics } = computeDeterministicGaps([], [], false);
    return NextResponse.json({
      success: true,
      report,
      detailedTopics,
      isDemo: false,
    });
  } catch (err: any) {
    console.error('Gap report route error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to generate knowledge gap report.' },
      { status: 500 }
    );
  }
}
