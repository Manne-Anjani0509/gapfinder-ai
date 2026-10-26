import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabaseServer';
import { DEMO_SUBMISSIONS, DEMO_GAP_REPORT, DEMO_REVISION_PLAN } from '@/lib/demoData';

export async function GET(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedUser(req);
    const { searchParams } = new URL(req.url);
    const isExport = searchParams.get('export') === 'true';
    const isDemo = searchParams.get('demo') === 'true' || authContext.isLocal;

    if (!isDemo && !authContext.user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    if (isDemo) {
      const demoData = {
        studentId: 'demo-student',
        isDemo: true,
        generatedAt: new Date().toISOString(),
        summary: {
          totalAttempts: DEMO_SUBMISSIONS.length,
          overallAccuracy: DEMO_GAP_REPORT.overallAccuracy,
          weakTopicsCount: DEMO_GAP_REPORT.weakCount,
          mediumTopicsCount: DEMO_GAP_REPORT.mediumCount,
          strongTopicsCount: DEMO_GAP_REPORT.strongCount,
          revisionTasksCompleted: DEMO_REVISION_PLAN.tasks.filter((t) => t.completed).length,
          revisionTasksTotal: DEMO_REVISION_PLAN.tasks.length,
        },
        attempts: DEMO_SUBMISSIONS,
        topicMastery: DEMO_GAP_REPORT.evidenceList,
        revisionPlan: DEMO_REVISION_PLAN,
      };

      if (isExport) {
        return new NextResponse(JSON.stringify(demoData, null, 2), {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': 'attachment; filename="gapfinder_student_progress.json"',
          },
        });
      }

      return NextResponse.json({ success: true, ...demoData });
    }

    if (!authContext.user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const currentUser = authContext.user;
    const userId = currentUser.id;

    if (authContext.supabase) {

      // 1. Fetch attempts
      const { data: attempts } = await authContext.supabase
        .from('quiz_attempts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      // 2. Fetch topic mastery
      const { data: mastery } = await authContext.supabase
        .from('topic_mastery')
        .select('*')
        .eq('user_id', userId);

      // 3. Fetch revision tasks
      const { data: tasks } = await authContext.supabase
        .from('revision_tasks')
        .select('*')
        .eq('user_id', userId);

      const attemptsList = attempts || [];
      const masteryList = mastery || [];
      const tasksList = tasks || [];

      const totalScore = attemptsList.reduce((acc, curr) => acc + (curr.score || 0), 0);
      const totalQuestions = attemptsList.reduce((acc, curr) => acc + (curr.total_questions || 0), 0);
      const overallAccuracy = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0;

      const weakCount = masteryList.filter((m) => m.classification === 'Weak').length;
      const mediumCount = masteryList.filter((m) => m.classification === 'Medium').length;
      const strongCount = masteryList.filter((m) => m.classification === 'Strong').length;
      const tasksCompleted = tasksList.filter((t) => t.completed).length;

      const progressData = {
        studentId: userId,
        isDemo: false,
        generatedAt: new Date().toISOString(),
        summary: {
          totalAttempts: attemptsList.length,
          overallAccuracy,
          weakTopicsCount: weakCount,
          mediumTopicsCount: mediumCount,
          strongTopicsCount: strongCount,
          revisionTasksCompleted: tasksCompleted,
          revisionTasksTotal: tasksList.length,
        },
        attempts: attemptsList,
        topicMastery: masteryList,
        revisionTasks: tasksList,
      };

      if (isExport) {
        return new NextResponse(JSON.stringify(progressData, null, 2), {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': 'attachment; filename="gapfinder_student_progress.json"',
          },
        });
      }

      return NextResponse.json({ success: true, ...progressData });
    }

    // Default empty live state
    const emptyData = {
      studentId: userId,
      isDemo: false,
      generatedAt: new Date().toISOString(),
      summary: {
        totalAttempts: 0,
        overallAccuracy: 0,
        weakTopicsCount: 0,
        mediumTopicsCount: 0,
        strongTopicsCount: 0,
        revisionTasksCompleted: 0,
        revisionTasksTotal: 0,
      },
      attempts: [],
      topicMastery: [],
      revisionTasks: [],
    };

    return NextResponse.json({ success: true, ...emptyData });
  } catch (err: any) {
    console.error('Progress API route error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to retrieve progress tracking analytics.' },
      { status: 500 }
    );
  }
}
