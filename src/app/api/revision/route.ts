import { NextRequest, NextResponse } from 'next/server';
import { TopicGapEvidence, RevisionPlan, RevisionTask } from '@/types';
import { getAuthenticatedUser } from '@/lib/supabaseServer';
import { z } from 'zod';

const RevisionRequestSchema = z.object({
  availableMinutes: z.number().int().min(10).max(180).default(45),
  evidenceList: z.array(z.any()).default([]),
  subjectId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedUser(req);
    if (!authContext.user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }
    const userId = authContext.user.id;
    const body = await req.json();

    const parseResult = RevisionRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || 'Invalid revision plan request' },
        { status: 400 }
      );
    }

    const { availableMinutes, evidenceList, subjectId } = parseResult.data;
    const totalMinutes = availableMinutes;

    const weakEvidence = (evidenceList as TopicGapEvidence[]).filter((e) => e.classification === 'Weak');
    const mediumEvidence = (evidenceList as TopicGapEvidence[]).filter((e) => e.classification === 'Medium');
    const unassessedEvidence = (evidenceList as TopicGapEvidence[]).filter(
      (e) => e.classification === 'Unassessed'
    );
    const strongEvidence = (evidenceList as TopicGapEvidence[]).filter((e) => e.classification === 'Strong');

    const tasks: RevisionTask[] = [];

    // Empty state fallback if no evidence provided
    if (evidenceList.length === 0) {
      const plan: RevisionPlan = {
        id: `plan-${Date.now()}`,
        createdAt: new Date().toISOString(),
        availableMinutes: totalMinutes,
        tasks: [
          {
            id: `task-empty-1`,
            priority: 'high',
            topicName: 'Diagnostic Baseline',
            materialTitle: 'Study Portal',
            estimatedMinutes: totalMinutes,
            title: 'Upload Study Notes & Complete Diagnostic Baseline',
            actionItems: [
              'Go to Study Materials and upload course notes, a syllabus, or textbook excerpts.',
              'Take a short 5-question Diagnostic Quiz to uncover initial knowledge gaps.',
              'Return here to generate an evidence-grounded study roadmap tailored to your available time.',
            ],
            targetConcept: 'Diagnostic Gap Assessment',
            sourcePassage: 'Diagnostic quizzes evaluate recall and concept comprehension.',
            completed: false,
          },
        ],
      };
      return NextResponse.json({ success: true, plan });
    }

    let remainingMinutes = totalMinutes;

    // 1. High priority tasks: Weak topics (severest gaps first)
    if (weakEvidence.length > 0) {
      // Allocate ~55% of the budget to weak topics
      const minutesPerWeak = Math.max(
        Math.floor((totalMinutes * 0.55) / weakEvidence.length),
        10
      );

      for (const weak of weakEvidence) {
        if (remainingMinutes < 10) break;
        const taskMinutes = Math.min(minutesPerWeak, remainingMinutes);
        remainingMinutes -= taskMinutes;

        tasks.push({
          id: `task-weak-${weak.topicId}-${Date.now()}-${tasks.length}`,
          priority: 'high',
          topicName: weak.topicName,
          materialTitle: weak.materialTitle,
          estimatedMinutes: taskMinutes,
          title: `Critical Gap Remediation: ${weak.topicName}`,
          actionItems: [
            `Diagnosed accuracy: only ${weak.correctAnswers}/${weak.questionsAttempted} correct (${weak.accuracy}%).`,
            `Deeply review the primary mechanics and definitions in "${weak.topicName}".`,
            'Write down 3 core definitions without looking at your study notes.',
            'Retake a 3-question diagnostic quiz focused on this topic after completing this task.',
          ],
          targetConcept: weak.topicName,
          sourcePassage: weak.sourcePassage || 'Targeted source section for concept review.',
          completed: false,
        });
      }
    }

    // 2. Medium priority tasks: Developing concepts
    if (mediumEvidence.length > 0 && remainingMinutes >= 10) {
      const divisor = mediumEvidence.length + (unassessedEvidence.length ? 1 : 0);
      const minutesPerMedium = Math.max(Math.floor(remainingMinutes / divisor), 10);

      for (const med of mediumEvidence) {
        if (remainingMinutes < 10) break;
        const taskMinutes = Math.min(minutesPerMedium, remainingMinutes);
        remainingMinutes -= taskMinutes;

        tasks.push({
          id: `task-med-${med.topicId}-${Date.now()}-${tasks.length}`,
          priority: 'medium',
          topicName: med.topicName,
          materialTitle: med.materialTitle,
          estimatedMinutes: taskMinutes,
          title: `Reinforce Proficiency: ${med.topicName}`,
          actionItems: [
            `Current score: ${med.accuracy}%. Foundational principles understood; edge cases require attention.`,
            'Create active recall flashcards for formulas, exceptions, or diagrams.',
            'Explain the concept out loud using the Feynman Technique in simple terms.',
          ],
          targetConcept: med.topicName,
          sourcePassage: med.sourcePassage || 'Section source passage.',
          completed: false,
        });
      }
    }

    // 3. Unassessed syllabus topics
    if (unassessedEvidence.length > 0 && remainingMinutes >= 5) {
      const unassessed = unassessedEvidence[0];
      const taskMinutes = Math.min(remainingMinutes, 15);
      remainingMinutes -= taskMinutes;

      tasks.push({
        id: `task-unassessed-${unassessed.topicId}-${Date.now()}-${tasks.length}`,
        priority: 'medium',
        topicName: unassessed.topicName,
        materialTitle: unassessed.materialTitle,
        estimatedMinutes: taskMinutes,
        title: `Benchmark Unassessed Topic: ${unassessed.topicName}`,
        actionItems: [
          'No diagnostic assessments have been attempted yet for this topic.',
          'Review the introductory section in your course material.',
          'Take a quick 3-question quiz to establish your baseline accuracy.',
        ],
        targetConcept: unassessed.topicName,
        sourcePassage: unassessed.sourcePassage || 'Unassessed topic content.',
        completed: false,
      });
    }

    // 4. Spaced repetition for strong topic if minutes remain
    if (strongEvidence.length > 0 && remainingMinutes >= 5) {
      const strong = strongEvidence[0];
      const taskMinutes = remainingMinutes;
      remainingMinutes = 0;

      tasks.push({
        id: `task-strong-${strong.topicId}-${Date.now()}-${tasks.length}`,
        priority: 'low',
        topicName: strong.topicName,
        materialTitle: strong.materialTitle,
        estimatedMinutes: taskMinutes,
        title: `Spaced Retention Polish: ${strong.topicName}`,
        actionItems: [
          `Verified mastery (${strong.accuracy}%). Quick speed-review to prevent forgetting curve decay.`,
          'Skim key bullet points in the source notes to ensure rapid recall under time pressure.',
        ],
        targetConcept: strong.topicName,
        sourcePassage: strong.sourcePassage || 'Mastery topic review.',
        completed: false,
      });
    }

    const planId = `plan-${Date.now()}`;
    const plan: RevisionPlan = {
      id: planId,
      createdAt: new Date().toISOString(),
      availableMinutes: totalMinutes,
      tasks,
      isDemo: false,
    };

    // If Supabase is available, persist the generated plan and tasks
    if (authContext.supabase) {
      try {
        const { data: planRecord, error: planErr } = await authContext.supabase
          .from('revision_plans')
          .insert({
            user_id: userId,
            subject_id: subjectId,
            available_minutes: totalMinutes,
            is_demo: false,
          })
          .select('id')
          .single();

        if (!planErr && planRecord) {
          const taskRows = tasks.map((t) => ({
            plan_id: planRecord.id,
            user_id: userId,
            topic_name: t.topicName,
            title: t.title,
            priority: t.priority,
            estimated_minutes: t.estimatedMinutes,
            action_items: t.actionItems,
            target_concept: t.targetConcept,
            source_passage: t.sourcePassage,
            completed: false,
          }));
          await authContext.supabase.from('revision_tasks').insert(taskRows);
        }
      } catch (dbErr) {
        console.warn('Could not persist revision plan to Supabase:', dbErr);
      }
    }

    return NextResponse.json({ success: true, plan });
  } catch (err: any) {
    console.error('Revision plan API error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to generate revision plan.' },
      { status: 500 }
    );
  }
}
