import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeDeterministicGaps } from '../src/lib/gapAnalysis.ts';
import { DEMO_MATERIALS, DEMO_SUBMISSIONS } from '../src/lib/demoData.ts';
import type { StudyMaterial, QuizSubmission } from '../src/types/index.ts';

test('Demo data is never mixed into live student data calculations', () => {
  // Live student has 1 material and 0 quiz submissions
  const liveMaterials: StudyMaterial[] = [
    {
      id: 'live-mat-1',
      title: 'Chemistry 101',
      fileName: 'chem.txt',
      fileType: 'txt',
      wordCount: 50,
      rawContent: 'Acids and Bases',
      chunks: [],
      topics: [
        {
          id: 'live-t1',
          materialId: 'live-mat-1',
          materialTitle: 'Chemistry 101',
          name: 'Acid Base Equilibria',
          description: '',
          subtopics: [],
          keyConcepts: [],
          sourcePassage: '',
          questionCount: 0,
          assessed: false,
          accuracy: 0,
          status: 'Unassessed',
        },
      ],
      status: 'ready',
      createdAt: new Date().toISOString(),
      isDemo: false,
    },
  ];

  // Combined pool containing both demo and live items
  const combinedMaterials = [...DEMO_MATERIALS, ...liveMaterials];
  const combinedSubmissions: QuizSubmission[] = [...DEMO_SUBMISSIONS];

  // Running live calculation (isDemo = false)
  const { report: liveReport } = computeDeterministicGaps(combinedMaterials, combinedSubmissions, false);

  assert.strictEqual(liveReport.isDemo, false);
  assert.strictEqual(liveReport.totalTopics, 1, 'Live report must ONLY include live student topics');
  assert.strictEqual(liveReport.assessedCount, 0, 'Live student has 0 quiz attempts');

  // Running demo calculation (isDemo = true)
  const { report: demoReport } = computeDeterministicGaps(combinedMaterials, combinedSubmissions, true);
  assert.strictEqual(demoReport.isDemo, true);
  assert.ok(demoReport.assessedCount > 0, 'Demo report includes demo quiz submissions');
});
