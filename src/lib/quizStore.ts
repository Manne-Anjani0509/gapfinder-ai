import type { QuizQuestion } from '../types/index.ts';

// In-memory server session store for active quiz attempts (used for local/offline and server-side verification)
const activeQuizQuestions = new Map<string, QuizQuestion>();
const completedAttempts = new Set<string>();

export function storeQuizQuestions(questions: QuizQuestion[]): void {
  for (const q of questions) {
    activeQuizQuestions.set(q.id, q);
  }
}

export function getQuizQuestion(questionId: string): QuizQuestion | undefined {
  return activeQuizQuestions.get(questionId);
}

export function markAttemptCompleted(attemptId: string): boolean {
  if (completedAttempts.has(attemptId)) {
    return false; // Already submitted
  }
  completedAttempts.add(attemptId);
  return true;
}

export function isAttemptCompleted(attemptId: string): boolean {
  return completedAttempts.has(attemptId);
}
