import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeDeterministicGaps } from '../src/lib/gapAnalysis.ts';
import type { StudyMaterial, QuizSubmission } from '../src/types/index.ts';

test('computeDeterministicGaps classifies Weak (<50%), Medium (50-79%), Strong (>=80%)', () => {
  const materials: StudyMaterial[] = [
    {
      id: 'm1',
      title: 'Operating Systems',
      fileName: 'os.txt',
      fileType: 'txt',
      wordCount: 100,
      rawContent: 'Virtual Memory and Paging',
      chunks: [],
      topics: [
        {
          id: 't-weak',
          materialId: 'm1',
          materialTitle: 'Operating Systems',
          name: 'Page Replacement Algorithms',
          description: '',
          subtopics: [],
          keyConcepts: [],
          sourcePassage: 'Page replacement algorithms determine page evictions.',
          questionCount: 0,
          assessed: false,
          accuracy: 0,
          status: 'Unassessed',
        },
        {
          id: 't-strong',
          materialId: 'm1',
          materialTitle: 'Operating Systems',
          name: 'Demand Paging',
          description: '',
          subtopics: [],
          keyConcepts: [],
          sourcePassage: 'Demand paging loads pages on reference.',
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

  const submissions: QuizSubmission[] = [
    {
      id: 'sub-1',
      quizTitle: 'OS Quiz',
      timestamp: new Date().toISOString(),
      totalQuestions: 8,
      score: 5,
      percentage: 63,
      isDemo: false,
      answers: [
        // 1 of 4 correct for Page Replacement Algorithms -> 25% -> Weak
        {
          questionId: 'q1',
          questionText: 'What is LRU?',
          selectedOptionIndex: 0,
          correctOptionIndex: 0,
          isCorrect: true,
          topicName: 'Page Replacement Algorithms',
          explanation: '',
          sourcePassage: '',
        },
        {
          questionId: 'q2',
          questionText: 'What causes Beladys anomaly?',
          selectedOptionIndex: 1,
          correctOptionIndex: 2,
          isCorrect: false,
          topicName: 'Page Replacement Algorithms',
          explanation: '',
          sourcePassage: '',
        },
        {
          questionId: 'q3',
          questionText: 'Which algorithm is optimal?',
          selectedOptionIndex: 0,
          correctOptionIndex: 3,
          isCorrect: false,
          topicName: 'Page Replacement Algorithms',
          explanation: '',
          sourcePassage: '',
        },
        {
          questionId: 'q4',
          questionText: 'What is FIFO replacement?',
          selectedOptionIndex: 2,
          correctOptionIndex: 1,
          isCorrect: false,
          topicName: 'Page Replacement Algorithms',
          explanation: '',
          sourcePassage: '',
        },
        // 4 of 4 correct for Demand Paging -> 100% -> Strong
        {
          questionId: 'q5',
          questionText: 'When is a page brought in?',
          selectedOptionIndex: 0,
          correctOptionIndex: 0,
          isCorrect: true,
          topicName: 'Demand Paging',
          explanation: '',
          sourcePassage: '',
        },
        {
          questionId: 'q6',
          questionText: 'What handles the fault?',
          selectedOptionIndex: 1,
          correctOptionIndex: 1,
          isCorrect: true,
          topicName: 'Demand Paging',
          explanation: '',
          sourcePassage: '',
        },
        {
          questionId: 'q7',
          questionText: 'What bit marks valid?',
          selectedOptionIndex: 2,
          correctOptionIndex: 2,
          isCorrect: true,
          topicName: 'Demand Paging',
          explanation: '',
          sourcePassage: '',
        },
        {
          questionId: 'q8',
          questionText: 'What is pure demand paging?',
          selectedOptionIndex: 3,
          correctOptionIndex: 3,
          isCorrect: true,
          topicName: 'Demand Paging',
          explanation: '',
          sourcePassage: '',
        },
      ],
      topicBreakdown: {},
    },
  ];

  const { report, detailedTopics } = computeDeterministicGaps(materials, submissions, false);

  assert.strictEqual(report.weakCount, 1);
  assert.strictEqual(report.strongCount, 1);

  const weakTopic = detailedTopics.find((t) => t.topicName === 'Page Replacement Algorithms');
  assert.ok(weakTopic);
  assert.strictEqual(weakTopic.classification, 'Weak');
  assert.strictEqual(weakTopic.accuracy, 25);
  assert.ok(weakTopic.evidenceNotes.includes('Answered 1 of 4 questions correctly'));
  assert.ok(weakTopic.evidenceNotes.includes('Beladys anomaly'));
});

test('computeDeterministicGaps labels topics with < 3 questions as provisional', () => {
  const materials: StudyMaterial[] = [
    {
      id: 'm2',
      title: 'Biology',
      fileName: 'bio.txt',
      fileType: 'txt',
      wordCount: 100,
      rawContent: 'ATP Synthesis',
      chunks: [],
      topics: [
        {
          id: 't-prov',
          materialId: 'm2',
          materialTitle: 'Biology',
          name: 'Chemiosmosis',
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

  const submissions: QuizSubmission[] = [
    {
      id: 'sub-prov',
      quizTitle: 'Bio Quiz',
      timestamp: new Date().toISOString(),
      totalQuestions: 1,
      score: 1,
      percentage: 100,
      isDemo: false,
      answers: [
        {
          questionId: 'qp1',
          questionText: 'What generates the gradient?',
          selectedOptionIndex: 0,
          correctOptionIndex: 0,
          isCorrect: true,
          topicName: 'Chemiosmosis',
          explanation: '',
          sourcePassage: '',
        },
      ],
      topicBreakdown: {},
    },
  ];

  const { detailedTopics } = computeDeterministicGaps(materials, submissions, false);
  const topic = detailedTopics.find((t) => t.topicName === 'Chemiosmosis');
  assert.ok(topic);
  assert.strictEqual(topic.isProvisional, true, 'Topic with only 1 question must be provisional');
  assert.strictEqual(topic.confidence, 'low');
});
