import type { StudyMaterial, QuizSubmission, TopicGapEvidence, GapReportData, TopicStatus } from '../types/index.ts';

export interface EnrichedTopicMastery {
  topicId: string;
  topicName: string;
  materialTitle: string;
  questionsAttempted: number;
  correctAnswers: number;
  accuracy: number;
  classification: TopicStatus;
  confidence: 'low' | 'medium' | 'high';
  isProvisional: boolean;
  attemptCount: number;
  lastAssessedAt: string | null;
  incorrectConcepts: string[];
  evidenceNotes: string;
  recommendedFocus: string[];
  sourcePassage: string;
}

/**
 * Computes deterministic, evidence-based topic gap analysis from recorded quiz submissions.
 * Guaranteed:
 * 1. Numeric classification is strictly computed from student answers (no fabricated grades).
 * 2. Accuracy thresholds: Weak < 50%, Medium 50-79%, Strong >= 80%, Unassessed (0 attempts).
 * 3. Confidence rating: Topics with < 3 questions are flagged provisional / low-confidence.
 * 4. Transparent evidence explanation detailing exact mistakes.
 */
export function computeDeterministicGaps(
  materials: StudyMaterial[],
  submissions: QuizSubmission[],
  isDemoMode: boolean = false
): {
  report: GapReportData;
  detailedTopics: EnrichedTopicMastery[];
} {
  // Filter submissions by demo mode to prevent data contamination
  const activeSubmissions = submissions.filter((s) => Boolean(s.isDemo) === isDemoMode);
  const activeMaterials = materials.filter((m) => Boolean(m.isDemo) === isDemoMode);

  // Initialize topic map from all ingested materials
  const topicStats: Record<
    string,
    {
      topicId: string;
      topicName: string;
      materialTitle: string;
      sourcePassage: string;
      attempted: number;
      correct: number;
      attempts: Set<string>;
      lastAssessed: string | null;
      incorrectQuestions: { text: string; explanation: string; selected: number; correct: number }[];
    }
  > = {};

  // Seed with all syllabus topics from materials
  for (const mat of activeMaterials) {
    for (const t of mat.topics || []) {
      const key = t.name.trim();
      if (!topicStats[key]) {
        topicStats[key] = {
          topicId: t.id,
          topicName: t.name,
          materialTitle: mat.title,
          sourcePassage: t.sourcePassage || (mat.chunks[0]?.text || ''),
          attempted: 0,
          correct: 0,
          attempts: new Set(),
          lastAssessed: null,
          incorrectQuestions: [],
        };
      }
    }
  }

  // Aggregate student answers across recorded submissions
  for (const sub of activeSubmissions) {
    for (const ans of sub.answers || []) {
      const topicName = ans.topicName?.trim() || 'General';
      if (!topicStats[topicName]) {
        topicStats[topicName] = {
          topicId: `dyn-${topicName}`,
          topicName,
          materialTitle: sub.quizTitle,
          sourcePassage: ans.sourcePassage || '',
          attempted: 0,
          correct: 0,
          attempts: new Set(),
          lastAssessed: null,
          incorrectQuestions: [],
        };
      }

      const stat = topicStats[topicName];
      stat.attempted += 1;
      stat.attempts.add(sub.id);

      if (!stat.lastAssessed || new Date(sub.timestamp) > new Date(stat.lastAssessed)) {
        stat.lastAssessed = sub.timestamp;
      }

      if (ans.isCorrect) {
        stat.correct += 1;
      } else {
        stat.incorrectQuestions.push({
          text: ans.questionText,
          explanation: ans.explanation,
          selected: ans.selectedOptionIndex,
          correct: ans.correctOptionIndex,
        });
      }
    }
  }

  const detailedTopics: EnrichedTopicMastery[] = [];
  let weakCount = 0;
  let mediumCount = 0;
  let strongCount = 0;
  let assessedCount = 0;
  let totalAttemptedAll = 0;
  let totalCorrectAll = 0;

  for (const [name, stats] of Object.entries(topicStats)) {
    if (stats.attempted === 0) {
      detailedTopics.push({
        topicId: stats.topicId,
        topicName: name,
        materialTitle: stats.materialTitle,
        questionsAttempted: 0,
        correctAnswers: 0,
        accuracy: 0,
        classification: 'Unassessed',
        confidence: 'low',
        isProvisional: true,
        attemptCount: 0,
        lastAssessedAt: null,
        incorrectConcepts: [],
        evidenceNotes: 'No diagnostic questions attempted yet for this syllabus section.',
        recommendedFocus: ['Take a baseline diagnostic quiz to benchmark knowledge retention in this section.'],
        sourcePassage: stats.sourcePassage,
      });
      continue;
    }

    assessedCount++;
    totalAttemptedAll += stats.attempted;
    totalCorrectAll += stats.correct;

    const accuracy = Math.round((stats.correct / stats.attempted) * 100);
    const attemptCount = stats.attempts.size;

    // Confidence / Evidence Sufficiency
    let confidence: 'low' | 'medium' | 'high' = 'low';
    let isProvisional = false;

    if (stats.attempted < 3) {
      confidence = 'low';
      isProvisional = true;
    } else if (stats.attempted < 6) {
      confidence = 'medium';
    } else {
      confidence = 'high';
    }

    let classification: TopicStatus = 'Medium';
    let notes = '';
    const focus: string[] = [];

    // Extract missed concepts
    const incorrectConcepts = Array.from(
      new Set(stats.incorrectQuestions.map((q) => q.text.replace(/^According to .*?,\s*/i, '').slice(0, 60)))
    );

    if (accuracy < 50) {
      classification = 'Weak';
      weakCount++;
      const mistakeSummary =
        incorrectConcepts.length > 0
          ? ` Most mistakes concern "${incorrectConcepts[0]}".`
          : '';
      notes = `Answered ${stats.correct} of ${stats.attempted} questions correctly (${accuracy}%).${mistakeSummary} High risk of exam confusion.`;
      focus.push('Review primary definitions and step-by-step mechanism walkthroughs.');
      focus.push('Complete active recall practice on identified mistake concepts.');
      focus.push('Retake a targeted 3-question diagnostic quiz after 20 minutes of study.');
    } else if (accuracy < 80) {
      classification = 'Medium';
      mediumCount++;
      notes = `Answered ${stats.correct} of ${stats.attempted} questions correctly (${accuracy}%). Core principles understood, but edge cases and comparative distinctions need reinforcement.`;
      focus.push('Refine edge case understanding and comparative nuances.');
      focus.push('Self-test using active recall flashcards on key formulas and definitions.');
    } else {
      classification = 'Strong';
      strongCount++;
      if (isProvisional) {
        notes = `Answered ${stats.correct} of ${stats.attempted} questions correctly (${accuracy}%). High initial score, but marked provisional until at least 3 questions are completed.`;
        focus.push('Confirm mastery by taking a follow-up assessment with varied question styles.');
      } else {
        notes = `Answered ${stats.correct} of ${stats.attempted} questions correctly (${accuracy}%). Strong mastery verified across multiple questions.`;
        focus.push('Maintain long-term retention with spaced repetition reviews.');
      }
    }

    detailedTopics.push({
      topicId: stats.topicId,
      topicName: name,
      materialTitle: stats.materialTitle,
      questionsAttempted: stats.attempted,
      correctAnswers: stats.correct,
      accuracy,
      classification,
      confidence,
      isProvisional,
      attemptCount,
      lastAssessedAt: stats.lastAssessed,
      incorrectConcepts,
      evidenceNotes: notes,
      recommendedFocus: focus,
      sourcePassage: stats.sourcePassage,
    });
  }

  // Sort by priority: Weak first (lowest accuracy), then Medium, then Strong, then Unassessed
  detailedTopics.sort((a, b) => {
    if (a.classification === 'Unassessed' && b.classification !== 'Unassessed') return 1;
    if (b.classification === 'Unassessed' && a.classification !== 'Unassessed') return -1;
    return a.accuracy - b.accuracy;
  });

  const overallAccuracy =
    totalAttemptedAll > 0 ? Math.round((totalCorrectAll / totalAttemptedAll) * 100) : 0;

  const evidenceList: TopicGapEvidence[] = detailedTopics.map((t) => ({
    topicId: t.topicId,
    topicName: t.topicName,
    materialTitle: t.materialTitle,
    questionsAttempted: t.questionsAttempted,
    correctAnswers: t.correctAnswers,
    accuracy: t.accuracy,
    classification: t.classification,
    evidenceNotes: t.evidenceNotes,
    recommendedFocus: t.recommendedFocus,
    sourcePassage: t.sourcePassage,
  }));

  const report: GapReportData = {
    totalTopics: Object.keys(topicStats).length,
    assessedCount,
    weakCount,
    mediumCount,
    strongCount,
    overallAccuracy,
    evidenceList,
    isDemo: isDemoMode,
  };

  return { report, detailedTopics };
}
