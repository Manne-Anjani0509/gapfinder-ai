import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GeneratedQuizQuestionSchema } from '../src/lib/gemini.ts';
import { storeQuizQuestions, getQuizQuestion, markAttemptCompleted, isAttemptCompleted } from '../src/lib/quizStore.ts';
import type { QuizQuestion } from '../src/types/index.ts';

test('GeneratedQuizQuestionSchema validates 4-option MCQs strictly', () => {
  const validQuestion = {
    question: 'What is the role of the TLB in paging?',
    options: ['Cache for page table', 'Secondary disk', 'Bus controller', 'Stack frame'],
    correctIndex: 0,
    explanation: 'The TLB caches recent virtual-to-physical address translations.',
    sourcePassage: 'TLB is a hardware cache for page table lookups.',
    difficulty: 'medium',
  };

  const parsed = GeneratedQuizQuestionSchema.safeParse(validQuestion);
  assert.strictEqual(parsed.success, true);

  const invalidQuestion = {
    question: 'Invalid test',
    options: ['Option 1', 'Option 2'], // Only 2 options
    correctIndex: 0,
    explanation: 'Explanation',
    sourcePassage: 'Passage',
  };

  const invalidParsed = GeneratedQuizQuestionSchema.safeParse(invalidQuestion);
  assert.strictEqual(invalidParsed.success, false, 'Should reject questions with fewer than 4 options');
});

test('quizStore stores questions and enforces single-submission attempts', () => {
  const testQ: QuizQuestion = {
    id: 'test-q-101',
    topicId: 't1',
    topicName: 'Virtual Memory',
    materialId: 'm1',
    materialTitle: 'OS Notes',
    question: 'What is a page fault?',
    options: ['Page not in RAM', 'Hardware failure', 'Disk full', 'Cache overflow'],
    correctIndex: 0,
    explanation: 'A page fault occurs when an accessed page is not loaded in physical memory.',
    sourcePassage: 'A page fault occurs when an accessed page is not loaded in physical memory.',
    difficulty: 'medium',
  };

  storeQuizQuestions([testQ]);
  const fetched = getQuizQuestion('test-q-101');
  assert.ok(fetched, 'Should retrieve stored question');
  assert.strictEqual(fetched.correctIndex, 0);

  const attemptId = 'attempt-test-replay-1';
  assert.strictEqual(isAttemptCompleted(attemptId), false);
  assert.strictEqual(markAttemptCompleted(attemptId), true);
  assert.strictEqual(isAttemptCompleted(attemptId), true);
  assert.strictEqual(markAttemptCompleted(attemptId), false, 'Second submission of same attempt must fail');
});
